import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { performance } from 'node:perf_hooks';

const requireFromHarness = createRequire(process.env.PUPPETEER_HARNESS_PACKAGE || '/data/data/com.termux/files/home/browser-harness/package.json');
const puppeteer = requireFromHarness('puppeteer-core');
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repo = process.env.TC_REPO || path.resolve(scriptDir, '..');
const output = process.env.TC_OUTPUT || path.join(path.dirname(repo), 'qa', `campaign-duel-natural-${Date.now()}`);
const browserPath = process.env.CHROMIUM_PATH || '/data/data/com.termux/files/usr/bin/chromium-browser';
const profile = process.env.TC_PROFILE || path.join(output, 'profile');
const port = Number(process.env.TC_PORT || 18761);
const source = await fs.readFile(path.join(repo, 'play/index.html'));
const originalText = source.toString('utf8');
const instrumentedText = originalText.replace('function draw(){', 'function draw(){window.__tcDrawCount=(window.__tcDrawCount||0)+1;');
if (instrumentedText === originalText) throw new Error('Could not install draw-call instrumentation');
const instrumentedSource = Buffer.from(instrumentedText);
await fs.mkdir(output, { recursive: false });

const server = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    res.end(instrumentedSource);
  } else { res.writeHead(404); res.end('not found'); }
});
await new Promise((resolve, reject) => {
  server.once('error', reject);
  server.listen(port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
});
const url = `http://127.0.0.1:${server.address().port}/`;
const browser = await puppeteer.launch({
  executablePath: browserPath, headless: true, pipe: true,
  userDataDir: profile,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-background-networking', '--disable-component-update', '--disable-domain-reliability', '--no-proxy-server'],
  timeout: 60000
});

const results = {
  repo, url, profile, browser: await browser.version(), userAgent: await browser.userAgent(),
  sourceSha256: createHash('sha256').update(source).digest('hex'),
  servedSha256: createHash('sha256').update(instrumentedSource).digest('hex'),
  instrumentation: 'Only the HTTP-served response was instrumented to count draw() calls; repository source was not rewritten.',
  inputMethod: 'Puppeteer keyboard events sent through the game document keyboard handlers; this is automated simulated input, not a human GUI test.',
  scenario: process.env.TC_REPLAY_TARGET === '1'
    ? 'Replay event 7 (Orchard first duel) through ordinary campaign UI using only progress previously earned by natural gameplay; no save-state seeding or diagnostic state mutation.'
    : 'Fresh browser profile and ordinary campaign UI. Complete events 0 through 6 through normal races, then complete event 7 (Orchard first duel); no save-state seeding or diagnostic state mutation.',
  errors: [], samples: [], campaignRaces: [], checks: []
};
let context;
let page;
const persistentProfile = !!process.env.TC_PROFILE;
let selected = '';
const check = (name, ok, detail = {}) => { results.checks.push({ name, passed: !!ok, ...detail }); if (!ok) throw new Error(`CHECK FAILED: ${name}`); };

try {
  if (persistentProfile) page = await browser.newPage();
  else {
    context = await browser.createBrowserContext();
    page = await context.newPage();
  }
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  page.on('pageerror', e => results.errors.push({ kind: 'pageerror', message: e.message, stack: e.stack }));
  page.on('console', m => { if (m.type() === 'error') results.errors.push({ kind: 'console', message: m.text() }); });
  page.on('requestfailed', r => results.errors.push({ kind: 'requestfailed', url: r.url(), error: r.failure()?.errorText }));

  await page.goto(url, { waitUntil: 'load', timeout: 60000 });
  await page.bringToFront();
  await page.waitForFunction(() => window.__tc && typeof window.__tc.tour === 'function', { timeout: 30000 });
  await page.waitForFunction(() => document.getElementById('bTour') && !document.getElementById('bTour').disabled, { timeout: 30000 });
  const snapshot = () => ({
    state: window.__tc.st(), count: window.__tc.get().count,
    visibility: document.visibilityState, focused: document.hasFocus(),
    lights: { display: getComputedStyle(document.getElementById('lights')).display, text: document.getElementById('lights').lastChild.textContent },
    track: window.__tc.opt.trk, assist: window.__tc.opt.assist,
    player: { p: window.__tc.car.p, x: window.__tc.car.x, y: window.__tc.car.y, th: window.__tc.car.th, vx: window.__tc.car.vx, vy: window.__tc.car.vy, speed: window.__tc.car.sv, steering: window.__tc.car.uS, lap: window.__tc.car.lap, idx: window.__tc.car.idx },
    rivals: window.__tc.rivs().map(r => ({ name: r.pers.name, p: r.p, x: r.x, y: r.y, speed: r.v, throttle: r.vt, lap: r.lap, finish: r.fin })),
    finished: window.__tc.get().fin, draws: window.__tcDrawCount || 0,
    campaignAt: window.__tc.tour().at,
    memorySave: JSON.parse(JSON.stringify(window.__tc.save()))
  });
  const maxDurationMs = Number(process.env.TC_RACE_TIMEOUT_MS || 300000);
  let campaignMapOpen = false;
  const runOneRace = async (eventIndex, attempt) => {
    let goal;
    if (attempt > 1) {
      goal = `retry of campaign event ${eventIndex} after the previous result`;
      await page.click('#rAgain');
    } else {
      if (!campaignMapOpen) {
        await page.click('#bTour');
        await page.waitForFunction(() => !document.querySelector('section[data-c="tour"]').hidden, { timeout: 10000 });
        campaignMapOpen = true;
      } else {
        // Reload only after the prior result has been captured. This is an ordinary browser action and
        // makes each next campaign event depend on the save the game actually wrote.
        await page.reload({ waitUntil: 'load', timeout: 60000 });
        await page.bringToFront();
        await page.waitForFunction(i => window.__tc && window.__tc.tour().at === i, { timeout: 30000 }, eventIndex);
        await page.click('#bTour');
        await page.waitForFunction(() => !document.querySelector('section[data-c="tour"]').hidden, { timeout: 10000 });
      }

      const buttons = await page.$$('#tourList .tc');
      if (!buttons[eventIndex]) throw new Error(`Campaign event ${eventIndex} is absent`);
      await buttons[eventIndex].click();
      goal = await page.$eval('#tourGoal', el => el.textContent);
      if (eventIndex === 7) {
        selected = await page.$eval('#tourList .tc.sel', el => el.textContent.trim());
        check('natural campaign progression unlocked the third-track first duel', /Orchard duel on Orchard Ring/.test(goal), { at: await page.evaluate(() => window.__tc.tour().at), selected, goal });
      }
      await page.click('#tourGo');
    }
    await page.bringToFront();
    await page.waitForFunction(i => window.__tc?.st() === 'run' && window.__tc.tour().cur === i, { timeout: 60000 }, eventIndex);
    const initialized = await page.evaluate(() => ({ event: window.__tc.tour().cur, track: window.__tc.opt.trk, rivals: window.__tc.rivs().length }));
    if (eventIndex === 7) check('normal Start race action initialized target duel', initialized.event === 7 && initialized.track === 2 && initialized.rivals === 1, initialized);
    await page.waitForFunction(() => window.__tc.get().count <= 0, { timeout: 30000 });
    const green = await page.evaluate(snapshot);
    if (eventIndex === 7) {
      results.countdownComplete = green;
      await page.screenshot({ path: path.join(output, 'after-countdown.png'), fullPage: true });
      check('target duel countdown completed into active race', green.state === 'run' && green.count <= 0 && green.draws > 0 && green.rivals.length === 1, { state: green.state, count: green.count, draws: green.draws, rivals: green.rivals.length });
    }

    await page.keyboard.down('Space');
    await page.keyboard.up('Space');
    const rocketMessage = await page.evaluate(() => document.getElementById('msg').textContent);
    if (eventIndex === 7) {
      const controlBefore = await page.evaluate(() => ({ th: window.__tc.car.th, p: window.__tc.car.p, uS: window.__tc.car.uS }));
      await page.keyboard.down('ArrowLeft');
      await page.waitForFunction(() => Math.abs(window.__tc.car.uS) > 0.12, { timeout: 5000, polling: 'raf' });
      const controlDuring = await page.evaluate(() => ({ th: window.__tc.car.th, p: window.__tc.car.p, uS: window.__tc.car.uS, keyState: window.__tc.touch.id }));
      await page.keyboard.up('ArrowLeft');
      check('actual keyboard handler changes target player steering input', Math.abs(controlDuring.uS) > 0.12 && controlDuring.keyState < 0, { controlBefore, controlDuring });
      results.playerControl = { controlBefore, controlDuring, generatedBy: 'Puppeteer ArrowLeft keydown/keyup through game keyboard listeners' };
      results.rocketStartMessage = rocketMessage;
    }

    const started = await page.evaluate(snapshot);
    const startedAt = performance.now();
    const samples = [];
    let lastSample = 0;
    let terminal = null;
    while (performance.now() - startedAt < maxDurationMs) {
      const state = await page.evaluate(snapshot);
      if (!lastSample || performance.now() - lastSample >= 900 || state.state === 'done') {
        samples.push({ elapsedMs: performance.now() - startedAt, state: state.state, p: state.player.p, x: state.player.x, y: state.player.y, speed: state.player.speed, lap: state.player.lap, rivalP: state.rivals[0]?.p, rivalX: state.rivals[0]?.x, rivalY: state.rivals[0]?.y, rivalSpeed: state.rivals[0]?.speed, draws: state.draws });
        lastSample = performance.now();
      }
      if (state.state === 'done') { terminal = state; break; }
      await new Promise(resolve => setTimeout(resolve, 200));
    }
    if (!terminal) {
      const lastState = await page.evaluate(snapshot);
      const partial = { eventIndex, attempt, goal, initialized, rocketMessage, started, lastState, elapsedMs: performance.now() - startedAt, samples };
      if (!results.incompleteRaces) results.incompleteRaces = [];
      results.incompleteRaces.push(partial);
      await page.screenshot({ path: path.join(output, `timeout-event-${eventIndex}-attempt-${attempt}.png`), fullPage: true }).catch(() => {});
      await fs.writeFile(path.join(output, `timeout-event-${eventIndex}-attempt-${attempt}.json`), JSON.stringify(partial, null, 2) + '\n');
      throw new Error(`Campaign event ${eventIndex} attempt ${attempt} timed out after ${maxDurationMs} ms; latest race state is in incompleteRaces`);
    }
    await page.waitForFunction(i => window.__tc.st() === 'done' && !document.querySelector('section[data-c="results"]').hidden && window.__tc.tour().res?.sn?.i === i, { timeout: 45000, polling: 'raf' }, eventIndex);
    if (eventIndex === 7) {
      await page.waitForFunction(() => {
        const results = document.querySelector('section[data-c="results"]');
        return results && !results.hidden && !document.querySelector('.stage-curtains');
      }, { timeout: 15000, polling: 'raf' });
      check('target result card is visible after its normal curtain transition', await page.$eval('#rh', el => el.textContent.trim().length > 0));
    }
    terminal = await page.evaluate(snapshot);
    const report = await page.evaluate(() => ({
      title: document.getElementById('rh').textContent,
      summary: document.getElementById('rs').textContent,
      resultText: document.getElementById('tourBox').innerText,
      campaign: window.__tc.tour(),
      save: JSON.parse(JSON.stringify(window.__tc.save())),
      stored: JSON.parse(localStorage.getItem('thumb-circuit-sample'))
    }));
    const continuity = samples.slice(1).every((s, i) => s.p > samples[i].p && s.draws > samples[i].draws && s.rivalP > samples[i].rivalP);
    const race = { eventIndex, attempt, goal, initialized, rocketMessage, started, terminal, elapsedMs: performance.now() - startedAt, samples, continuity, result: report };
    results.campaignRaces.push(race);
    await fs.writeFile(path.join(output, `event-${eventIndex}-attempt-${attempt}.json`), JSON.stringify(race, null, 2) + '\n');
    await fs.writeFile(path.join(output, 'campaign-progress.json'), JSON.stringify({ campaign: report.campaign, stored: report.stored, completedEvents: results.campaignRaces.map(r => r.eventIndex) }, null, 2) + '\n');
    if (eventIndex === 7) {
      results.targetResult = race;
      await page.screenshot({ path: path.join(output, `natural-result-event-${eventIndex}-attempt-${attempt}.png`), fullPage: true });
      check('target race completed normally after two laps', terminal.player.lap >= 2 && report.title.length > 0 && terminal.finished, { lap: terminal.player.lap, title: report.title, finished: terminal.finished });
      check('player, rival, and rendering advanced in every sampled target-race interval', continuity && samples.length >= 10, { sampleCount: samples.length, continuity });
      if (report.title === 'You won!') {
        check('target duel win, stars, and reward were saved', report.campaign.at === 8 && report.campaign.S.st[7] >= 2 && report.stored?.tour?.st?.[7] >= 2 && report.save.own?.trike && report.save.tu?.trike && report.stored?.own?.trike && report.stored?.tu?.trike, { title: report.title, campaignAt: report.campaign.at, stars: report.campaign.S.st[7], owned: report.save.own, tourOwned: report.save.tu, storedStars: report.stored?.tour?.st?.[7] });
      } else {
        results.targetLosses = (results.targetLosses || 0) + 1;
        results.lastTargetLoss = { attempt, title: report.title, campaignAt: report.campaign.at, losses: report.campaign.S.loss };
      }
    }
    return race;
  };

  const initial = await page.evaluate(() => ({ stored: localStorage.getItem('thumb-circuit-sample'), campaign: window.__tc.tour() }));
  results.initialState = initial;
  const resume = process.env.TC_RESUME === '1';
  if (resume) check('resumed from progress already earned and stored by earlier natural gameplay', initial.campaign.at > 0 && initial.stored && JSON.parse(initial.stored).tour?.st?.[initial.campaign.at - 1] > 0, { initial });
  else check('campaign began from a fresh profile without seeded progress', !initial.campaign.at && !initial.campaign.stars && (!initial.stored || !(JSON.parse(initial.stored).tour?.st || []).some(Boolean)), { initial });

  if (process.env.TC_REPLAY_TARGET === '1') {
    await runOneRace(7, 1);
  } else {
    for (let eventIndex = initial.campaign.at; eventIndex <= 7; eventIndex++) {
      let eventRace;
      for (let attempt = 1; attempt <= 3; attempt++) {
        eventRace = await runOneRace(eventIndex, attempt);
        if (eventRace.result.campaign.at >= eventIndex + 1) break;
        if (attempt === 3) throw new Error(`Campaign event ${eventIndex} did not earn a star after ${attempt} natural attempts`);
      }
      check(`natural completion advanced campaign through event ${eventIndex}`, eventRace.result.campaign.at === eventIndex + 1, { eventIndex, campaignAt: eventRace.result.campaign.at, stars: eventRace.result.campaign.S.st[eventIndex] });
    }
  }

  await page.reload({ waitUntil: 'load', timeout: 60000 });
  await page.bringToFront();
  await page.waitForFunction(() => window.__tc && typeof window.__tc.tour === 'function', { timeout: 30000 });
  results.afterReload = await page.evaluate(() => ({
    campaignAt: window.__tc.tour().at,
    stars: window.__tc.tour().S.st[7],
    owned: window.__tc.save().own,
    tourOwned: window.__tc.save().tu,
    coins: window.__tc.save().coins,
    races: window.__tc.save().races,
    wins: window.__tc.save().wins,
    stored: JSON.parse(localStorage.getItem('thumb-circuit-sample'))
  }));
  check('campaign progress and duel reward survive reload', results.afterReload.campaignAt === 8 && results.afterReload.stars >= 2 && results.afterReload.owned?.trike && results.afterReload.tourOwned?.trike && results.afterReload.stored?.tour?.st?.[7] >= 2 && results.afterReload.stored?.own?.trike && results.afterReload.stored?.tu?.trike, results.afterReload);
  check('no browser console errors, uncaught exceptions, or failed requests', results.errors.length === 0, { errors: results.errors.slice(0, 10) });
} catch (error) {
  results.failure = { message: error.message, stack: error.stack };
  process.exitCode = 1;
} finally {
  if (page) await page.screenshot({ path: path.join(output, 'final-state.png'), fullPage: true }).catch(() => {});
  if (context) await context.close().catch(() => {});
  await browser.close();
  await new Promise(resolve => server.close(resolve));
  results.finishedAt = new Date().toISOString();
  await fs.writeFile(path.join(output, 'report.json'), JSON.stringify(results, null, 2) + '\n');
  console.log(JSON.stringify({
    output, browser: results.browser, status: process.exitCode ? 'FAIL' : 'PASS',
    selected, checks: results.checks, errorCount: results.errors.length,
    raceElapsedMs: results.race?.elapsedMs, resultTitle: results.resultScreen?.title,
    afterReload: results.afterReload, failure: results.failure
  }, null, 2));
}
