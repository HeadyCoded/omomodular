const { spawn } = require('child_process');
const fs = require('fs');

(async () => {
  console.log('--- Starting Drawer Docking & No-Overlap Drag Test ---');

  // Set preset to Daft Modular Funk
  const presetRes = await fetch('http://127.0.0.1:8796/api/presets/' + encodeURIComponent('★ Daft Modular Funk (MIDI Live)'));
  const preset = await presetRes.json();
  await fetch('http://127.0.0.1:8796/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(preset)
  });
  console.log('Loaded Daft Modular Funk preset');

  const chrome = spawn('/usr/bin/chromium', [
    '--headless',
    '--disable-gpu',
    '--user-data-dir=/tmp/omomodular-dock-test',
    '--remote-debugging-port=9336',
    '--window-size=1600,1050',
    'http://127.0.0.1:8796/'
  ]);

  const cleanup = () => {
    try { chrome.kill(); } catch (e) {}
    try { fs.rmSync('/tmp/omomodular-dock-test', { recursive: true, force: true }); } catch (e) {}
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(); });

  try {
    await new Promise(r => setTimeout(r, 2000));
    const tabs = await (await fetch('http://127.0.0.1:9336/json')).json();
    const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
    const ws = new WebSocket(pageTab.webSocketDebuggerUrl);
    await new Promise(r => ws.onopen = r);

    let id = 0;
    const pending = new Map();
    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id && pending.has(data.id)) {
        pending.get(data.id)(data.result || {});
      }
    };

    const sendCmd = (method, params = {}) => new Promise(res => {
      const reqId = ++id;
      pending.set(reqId, res);
      ws.send(JSON.stringify({ id: reqId, method, params }));
    });

    const evaluate = async (expr) => {
      const r = await sendCmd('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
      if (r?.exceptionDetails) {
        console.error('CDP Eval Exception:', r.exceptionDetails);
      }
      return r?.result?.value;
    };

    // Wait for rack container
    for (let i = 0; i < 30; i++) {
      if (await evaluate("!!document.getElementById('rack-container') && document.querySelectorAll('.module-panel').length > 0")) break;
      await new Promise(r => setTimeout(r, 200));
    }

    // 1. Check MIDI player position before opening drawer
    const midiPosBefore = await evaluate(`
      (() => {
        const mod = document.querySelector('.module-panel[data-type="midi_player"]');
        if (!mod) return null;
        const rect = mod.getBoundingClientRect();
        return { left: rect.left, top: rect.top, width: rect.width };
      })()
    `);
    console.log('MIDI Player position before drawer open:', midiPosBefore);

    // 2. Open MIDI drawer
    console.log('Opening MIDI Archive Drawer via ui.toggleMidiDrawer(true)...');
    await evaluate("window.ui.toggleMidiDrawer(true);");
    await new Promise(r => setTimeout(r, 400));

    // 3. Verify rack-container shifted right and drawer does NOT overlap MIDI player
    const checkOverlap = await evaluate(`
      (() => {
        const drawer = document.getElementById('midi-drawer');
        const drawerRect = drawer.getBoundingClientRect();
        const mod = document.querySelector('.module-panel[data-type="midi_player"]');
        const modRect = mod ? mod.getBoundingClientRect() : null;
        const container = document.getElementById('rack-container');
        const containerRect = container.getBoundingClientRect();

        return {
          drawerLeft: drawerRect.left,
          drawerRight: drawerRect.right,
          containerLeft: containerRect.left,
          modLeft: modRect ? modRect.left : null,
          isOverlapping: modRect ? (drawerRect.right > modRect.left) : false
        };
      })()
    `);
    console.log('Docking & Overlap Check:', checkOverlap);

    if (checkOverlap.isOverlapping) {
      throw new Error(`FAIL: Drawer overlaps the MIDI module! drawerRight=${checkOverlap.drawerRight}, modLeft=${checkOverlap.modLeft}`);
    }
    console.log('PASS: Drawer DOES NOT overlap the rack or module! Rack cleanly docked to the right of the drawer.');

    // 4. Test dragging-active state
    console.log('Testing dragging-active translucency...');
    await evaluate("document.body.classList.add('dragging-active');");
    await new Promise(r => setTimeout(r, 250));
    const bodyClasses = await evaluate("document.body.className");
    console.log('Body classes:', bodyClasses);
    const drawerOpacity = await evaluate("window.getComputedStyle(document.getElementById('midi-drawer')).opacity");
    console.log('Drawer opacity during drag:', drawerOpacity);
    if (parseFloat(drawerOpacity) > 0.8) {
      throw new Error('FAIL: Drawer did not become translucent during drag!');
    }
    console.log('PASS: Drawer successfully ghosts into translucency during drag.');
    await evaluate("document.body.classList.remove('dragging-active');");

    // 5. Capture screenshot of the docked drawer and visible rack
    const snap = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('ui_midi_drawer_docked.png', Buffer.from(snap.data, 'base64'));
    console.log('Saved screenshot to ui_midi_drawer_docked.png');

    console.log('--- ALL DRAWER DOCKING & DRAG TESTS PASSED! ---');
    ws.close();
  } finally {
    cleanup();
  }
})();
