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

  console.log('Navigating to http://127.0.0.1:8796/ ...');
  await page.goto('http://127.0.0.1:8796/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1000);

  // Open MIDI drawer
  console.log('Opening MIDI drawer...');
  const midiBtn = await page.$('#midi-drawer-btn');
  if (midiBtn) {
    await midiBtn.click();
    await page.waitForTimeout(500);
  }

  // Type "mario" into the search input
  console.log('Searching for "mario"...');
  const searchInput = await page.$('#midi-search-input');
  if (searchInput) {
    await searchInput.fill('mario');
    await searchInput.press('Enter');
    await page.waitForTimeout(1200);
  }

  console.log('Saving ui_midi_search_mario.png...');
  await page.screenshot({ path: 'ui_midi_search_mario.png', fullPage: false });
  console.log('ui_midi_search_mario.png captured.');

  // Type "daft punk" into the search input
  console.log('Searching for "daft punk"...');
  if (searchInput) {
    await searchInput.fill('daft punk');
    await searchInput.press('Enter');
    await page.waitForTimeout(1200);
  }

  console.log('Saving ui_midi_search_daft.png...');
  await page.screenshot({ path: 'ui_midi_search_daft.png', fullPage: false });
  console.log('ui_midi_search_daft.png captured.');

  await browser.close();
  console.log('Done!');
})();
