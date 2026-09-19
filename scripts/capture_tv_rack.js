const { spawn } = require('child_process');
const fs = require('fs');

(async () => {
  const chrome = spawn('/usr/bin/chromium', [
    '--headless',
    '--disable-gpu',
    '--user-data-dir=/tmp/omomodular-tv-capture',
    '--remote-debugging-port=9335',
    '--window-size=1920,1080',
    'http://127.0.0.1:8796/'
  ]);

  const cleanup = () => {
    try { chrome.kill(); } catch (e) {}
    try { fs.rmSync('/tmp/omomodular-tv-capture', { recursive: true, force: true }); } catch (e) {}
  };

  try {
    await new Promise(r => setTimeout(r, 2000));
    const tabs = await (await fetch('http://127.0.0.1:9335/json')).json();
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
      return r?.result?.value;
    };

    // Wait for rack
    for (let i = 0; i < 20; i++) {
      if (await evaluate("!!document.getElementById('rack-container')")) break;
      await new Promise(r => setTimeout(r, 200));
    }

    // Toggle TV Rack mode
    await evaluate("document.body.classList.add('tv-rack-mode'); window.cables.render();");
    await new Promise(r => setTimeout(r, 500));

    // Capture screenshot
    const snap = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('ui_tv_rack_live.png', Buffer.from(snap.data, 'base64'));
    console.log('Saved ui_tv_rack_live.png successfully');

    ws.close();
  } finally {
    cleanup();
  }
})();
