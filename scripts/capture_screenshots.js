const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1,
  });

  const page = await context.newPage();

  console.log('Navigating to omomodular...');
  await page.goto('http://127.0.0.1:8797/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);

  // 1. Capture Fullscreen TV Rack Mode at 1920x1080
  console.log('Activating TV Rack Mode...');
  const tvBtn = await page.$('#tv-rack-btn');
  if (tvBtn) {
    await tvBtn.click();
    await page.waitForTimeout(1000);
  }

  console.log('Saving ui_tv_rack_live.png...');
  await page.screenshot({ path: 'ui_tv_rack_live.png', fullPage: false });
  console.log('ui_tv_rack_live.png captured.');

  // 2. Open MIDI drawer and activate ★ 1-TRACK RIFFS filter
  console.log('Opening MIDI drawer...');
  const midiBtn = await page.$('#midi-drawer-btn');
  if (midiBtn) {
    await midiBtn.click();
    await page.waitForTimeout(600);
  }

  console.log('Clicking 1-TRACK RIFFS filter pill...');
  const singlePill = await page.$('.midi-filter-pill.single-pill');
  if (singlePill) {
    await singlePill.click();
    await page.waitForTimeout(800);
  }

  console.log('Saving ui_midi_single_riffs.png...');
  await page.screenshot({ path: 'ui_midi_single_riffs.png', fullPage: false });
  console.log('ui_midi_single_riffs.png captured.');

  await browser.close();
  console.log('Done!');
})();
