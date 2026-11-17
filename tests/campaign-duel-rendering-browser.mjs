import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const requireFromHarness = createRequire(process.env.PUPPETEER_HARNESS_PACKAGE || '/data/data/com.termux/files/home/browser-harness/package.json');
const puppeteer = requireFromHarness('puppeteer-core');
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repo = process.env.TC_REPO || path.resolve(scriptDir, '..');
const output = process.env.TC_OUTPUT || path.join(path.dirname(repo), 'qa', `campaign-duel-${Date.now()}`);
const testProgression = process.env.TEST_PROGRESSION !== '0';
const browserPath = process.env.CHROMIUM_PATH || '/data/data/com.termux/files/usr/bin/chromium-browser';
const source = await fs.readFile(path.join(repo, 'play/index.html'));
const originalText = source.toString('utf8');
const instrumentedText = originalText.replace('function draw(){', 'function draw(){window.__tcDrawCount=(window.__tcDrawCount||0)+1;');
if (instrumentedText === originalText) throw new Error('Could not install draw-call instrumentation');
const instrumentedSource = Buffer.from(instrumentedText);
await fs.mkdir(path.dirname(output), { recursive: true });
await fs.mkdir(output, { recursive: false });
const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(instrumentedSource);
  } else {
    res.writeHead(404); res.end('not found');
  }
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await puppeteer.launch({
  executablePath: browserPath,
  headless: true,
  pipe: true,
  userDataDir: path.join(output, 'profile'),
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking', '--disable-component-update', '--disable-domain-reliability', '--no-proxy-server'],
  timeout: 60000
});
const results = {
  url, browser: await browser.version(), userAgent: await browser.userAgent(), sourceBytes: source.length, repo,
  baselineSha256: createHash('sha256').update(source).digest('hex'),
  servedInstrumentation: "Inserted a window.__tcDrawCount increment at the start of draw() in the HTTP response only; baseline file was not edited.",
  servedSha256: createHash('sha256').update(instrumentedSource).digest('hex'), cases: []
};

async function runCase(name, progressIndex) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  const errors = { count: 0, examples: [] };
  page.on('pageerror', e => { errors.count++; if (errors.examples.length < 5) errors.examples.push({ kind: 'pageerror', message: e.message, stack: e.stack }); });
  page.on('console', m => { if (m.type() === 'error') { errors.count++; if (errors.examples.length < 5) errors.examples.push({ kind: 'console', message: m.text() }); } });
  const stars = Array.from({ length: progressIndex }, () => 1);
  await page.evaluateOnNewDocument(save => {
    if (!localStorage.getItem('thumb-circuit-sample')) localStorage.setItem('thumb-circuit-sample', JSON.stringify(save));
  }, {
    tour: { st: stars, loss: [] }, tourIn: 1,
    fx37: 1, fx42: 1, fx43: 1, fx50: 1, fx52: 1,
    todv: 2, sensv: 1, chsv: 2, bcvv: 1, dkav: 1
  });
  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.waitForFunction(() => window.__tc && typeof window.__tc.tourSel === 'function', { timeout: 30000 });
  await page.waitForFunction(() => document.getElementById('bTour') && !document.getElementById('bTour').disabled, { timeout: 30000 });
  await page.click('#bTour');
  await page.$$eval('#tourList .tc', (buttons, i) => {
    if (!buttons[i]) throw new Error(`Campaign event ${i} is not present`);
    buttons[i].click();
  }, progressIndex);
  const selected = await page.$eval('#tourList .tc.sel', e => e.textContent.trim());
  await page.click('#tourGo');
  await page.waitForFunction(() => window.__tc && window.__tc.st() === 'run', { timeout: 60000 });
  await page.waitForFunction(() => window.__tc.get().count <= 0, { timeout: 30000 });
  const capture = () => ({
    at: window.__tc.tour().at,
    selected: window.__tc.tour().cur,
    tour: window.__tc.tour().cur,
    state: window.__tc.st(),
    count: window.__tc.get().count,
    countdown: {
      display: getComputedStyle(document.getElementById('lights')).display,
      className: document.getElementById('lights').className,
      text: document.getElementById('lights').lastChild.textContent
    },
    track: window.__tc.opt.trk,
    tod: window.__tc.opt.tod,
    loop: window.__tc.loop(),
    player: ((c, g) => ({ p: c.p, x: c.x, y: c.y, vx: c.vx, vy: c.vy, speed: c.sv, throttleInput: c.uS, accelerationState: c.dl, braking: c.brk, idx: c.idx, lap: c.lap, finished: g.fin }))(window.__tc.car, window.__tc.get()),
    rivals: window.__tc.rivs().map(r => ({ name: r.pers.name, block: r.pers.block, p: r.p, x: r.x, y: r.y, v: r.v, targetSpeed: r.pers.v, throttle: r.vt, braking: r.brk, idx: r.idx, fin: r.fin, spin: r.spin, d: r.d })),
    govFrozen: window.__tc.gov.frz,
    drawCount: window.__tcDrawCount || 0,
    trackLength: window.__tc.T.L,
    gov: { on: window.__tc.gov.on, note: window.__tc.gov.note }
  });
  const before = await page.evaluate(capture);
  await page.screenshot({ path: path.join(output, `${name}-countdown.png`), fullPage: true }).catch(() => {});
  let observedFrameAdvance = true;
  try {
    await page.waitForFunction(base => {
      const car = window.__tc.car, rivals = window.__tc.rivs();
      return window.__tcDrawCount >= base.drawCount + 50 && car.p - base.player.p >= 100 &&
        rivals.length === base.rivals.length && rivals.every((r, i) => r.p - base.rivals[i].p >= 100);
    }, { polling: 'raf', timeout: 3000 }, before);
  } catch (error) {
    if (error.name !== 'TimeoutError') throw error;
    observedFrameAdvance = false;
  }
  const after = await page.evaluate(capture);
  let progression = null;
  if (testProgression && progressIndex === 7) {
    const targetP = await page.evaluate(() => 2 * window.__tc.T.L - 36);
    await page.evaluate(p => window.__tc.warp(p), targetP);
    await page.waitForFunction(() => window.__tc.tour().at === 8, { timeout: 30000 });
    const afterRace = await page.evaluate(() => ({
      state: window.__tc.st(), campaignAt: window.__tc.tour().at,
      campaignStars: window.__tc.tour().S.st[7],
      storedAt: JSON.parse(localStorage.getItem('thumb-circuit-sample')).tour.st.findIndex(v => !v),
      resultTitle: document.getElementById('rh').textContent,
      resultSummary: document.getElementById('rs').textContent
    }));
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__tc && typeof window.__tc.tour === 'function', { timeout: 30000 });
    const afterReload = await page.evaluate(() => ({
      campaignAt: window.__tc.tour().at,
      storedStars: JSON.parse(localStorage.getItem('thumb-circuit-sample')).tour.st[7]
    }));
    progression = { targetP, afterRace, afterReload };
    await page.screenshot({ path: path.join(output, `${name}-result.png`), fullPage: true }).catch(() => {});
  }
  const result = { name, progressIndex, selected, before, after, errors, observedFrameAdvance, progression };
  await page.screenshot({ path: path.join(output, `${name}.png`), fullPage: true }).catch(() => {});
  results.cases.push(result);
  await context.close();
}

try {
  await runCase('meadow-first-duel-index-3', 3);
  await runCase('orchard-first-race-index-4', 4);
  await runCase('orchard-first-duel-index-7', 7);
  await runCase('beach-first-race-index-8', 8);
  await runCase('beach-first-duel-index-11', 11);
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(results, null, 2) + '\n');
{
  const failures = results.cases.filter(c => c.errors.count || !c.observedFrameAdvance || c.after.drawCount - c.before.drawCount < 50 || c.after.player.p - c.before.player.p < 100 || c.after.rivals.some((r, i) => r.p - c.before.rivals[i].p < 100));
  const orchardRace = results.cases.find(c => c.progressIndex === 4);
  const orchardDuel = results.cases.find(c => c.progressIndex === 7);
  if (!orchardRace || !orchardDuel || orchardRace.before.track !== 2 || orchardDuel.before.track !== 2 || orchardRace.before.tod !== orchardDuel.before.tod || orchardRace.before.rivals.length !== 3 || orchardDuel.before.rivals.length !== 1) failures.push({ name: 'same-track-race-vs-duel-identity' });
  const beachDuel = results.cases.find(c => c.progressIndex === 11);
  if (!beachDuel || beachDuel.before.track !== 3 || beachDuel.before.tod !== 1 || beachDuel.before.rivals.length !== 1) failures.push({ name: 'target-scenario-identity' });
  const progression = results.cases.find(c => c.progression)?.progression;
  if (testProgression && (!progression || progression.afterRace.campaignAt !== 8 || progression.afterRace.campaignStars < 1 || progression.afterReload.campaignAt !== 8)) failures.push({ name: 'campaign-progression-after-duel' });
  if (failures.length) {
    console.error('FAILED expected-fixed acceptance:', failures.map(c => c.name));
    process.exitCode = 1;
  }
}
console.log(JSON.stringify({ browser: results.browser, cases: results.cases.map(c => ({
  name: c.name, track: c.before.track, tod: c.before.tod,
  playerDistance: c.after.player.p - c.before.player.p,
  rivalDistances: c.after.rivals.map((r, i) => r.p - c.before.rivals[i].p),
  drawCalls: c.after.drawCount - c.before.drawCount,
  observedFrameAdvance: c.observedFrameAdvance,
  errorCount: c.errors.count, firstError: c.errors.examples[0] && c.errors.examples[0].message,
  progression: c.progression
})) }, null, 2));
