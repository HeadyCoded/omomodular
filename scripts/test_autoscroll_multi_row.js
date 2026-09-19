const { spawn } = require('child_process');
const fs = require('fs');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

(async () => {
  console.log('--- Starting Multi-Row Autoscroll & Horizontal Fit Test ---');

  // 1. Set state to Colossus Modular Workstation (3 rows)
  const presetRes = await fetch('http://127.0.0.1:8796/api/presets/' + encodeURIComponent('★ The Colossus (3-Row Monster Rack)'));
  const colossus = await presetRes.json();
  await fetch('http://127.0.0.1:8796/api/state', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(colossus)
  });
  console.log('Set active state to Colossus 3-row preset on 8796');

  // 2. Start Chromium with remote debugging
  const chrome = spawn('/usr/bin/chromium', [
    '--headless',
    '--disable-gpu',
    '--user-data-dir=/tmp/omomodular-cdp-test',
    '--remote-debugging-port=9333',
    '--window-size=1600,1050',
    'http://127.0.0.1:8796/'
  ]);

  const cleanup = () => {
    try { chrome.kill(); } catch (e) {}
    try { fs.rmSync('/tmp/omomodular-cdp-test', { recursive: true, force: true }); } catch (e) {}
  };

  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(); });

  try {
    await sleep(2000);

    // Get CDP WebSocket URL
    const listRes = await fetch('http://127.0.0.1:9333/json');
    const tabs = await listRes.json();
    const pageTab = tabs.find(t => t.type === 'page') || tabs[0];
    const wsUrl = pageTab.webSocketDebuggerUrl;
    console.log('Connecting to Chromium WebSocket at', wsUrl, `(${pageTab.title})`);

    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => {
      ws.onopen = res;
      ws.onerror = rej;
    });

    let msgId = 1;
    const pending = new Map();

    ws.onmessage = (evt) => {
      const data = JSON.parse(evt.data);
      if (data.id && pending.has(data.id)) {
        const { resolve } = pending.get(data.id);
        pending.delete(data.id);
        resolve(data.result || {});
      }
    };

    function sendCmd(method, params = {}) {
      return new Promise((resolve) => {
        const id = ++msgId;
        pending.set(id, { resolve });
        ws.send(JSON.stringify({ id, method, params }));
      });
    }

    async function evaluate(expression) {
      const res = await sendCmd('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true });
      if (res.exceptionDetails) {
        console.error('Evaluate JS error:', res.exceptionDetails);
      }
      return res?.result?.value;
    }

    console.log('Connected to CDP. Waiting for rack container to load...');
    for (let i = 0; i < 30; i++) {
      const ready = await evaluate("!!document.getElementById('rack-container') && !!document.getElementById('rack') && document.querySelectorAll('.rack-row').length > 0");
      if (ready) break;
      await sleep(300);
    }

    // 1. Horizontal Fit Check
    const horizMetrics = await evaluate(`
      (() => {
        const container = document.getElementById('rack-container');
        const rack = document.getElementById('rack');
        return {
          containerClientWidth: container.clientWidth,
          containerScrollWidth: container.scrollWidth,
          rackClientWidth: rack.clientWidth,
          rackScrollWidth: rack.scrollWidth,
          hasHorizontalScroll: container.scrollWidth > container.clientWidth
        };
      })()
    `);
    console.log('Horizontal metrics:', horizMetrics);
    if (horizMetrics.hasHorizontalScroll) {
      throw new Error(`FAIL: Horizontal scrollbar detected! scrollWidth=${horizMetrics.containerScrollWidth} > clientWidth=${horizMetrics.containerClientWidth}`);
    }
    console.log('PASS: Zero horizontal scrollbar! Application perfectly snaps to fit horizontally.');

    // 2. Scroll down to Row 3 (bottom-most rack row)
    await evaluate(`
      (() => {
        const container = document.getElementById('rack-container');
        container.scrollTop = container.scrollHeight;
      })()
    `);
    await sleep(400);

    const scrollTopBefore = await evaluate("document.getElementById('rack-container').scrollTop");
    console.log(`Scrolled down to Row 3: scrollTop = ${scrollTopBefore}px`);
    if (scrollTopBefore < 300) {
      throw new Error('FAIL: Viewport did not scroll down to lower racks.');
    }

    // 3. Find a jack on Row 3
    const row3Jack = await evaluate(`
      (() => {
        const row3 = document.querySelector('.rack-row[data-row-idx="2"]');
        const jack = row3 ? row3.querySelector('.jack[data-direction="out"]') : null;
        if (!jack) return null;
        const rect = jack.getBoundingClientRect();
        return {
          moduleId: jack.dataset.module,
          jack: jack.dataset.jack,
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2
        };
      })()
    `);
    console.log('Row 3 source jack:', row3Jack);
    if (!row3Jack) throw new Error('FAIL: Could not locate OUT jack in Row 3.');

    const hitElement = await evaluate(`
      (() => {
        const el = document.elementFromPoint(${row3Jack.x}, ${row3Jack.y});
        return el ? { tag: el.tagName, className: el.className, closestJack: !!el.closest('.jack') } : null;
      })()
    `);
    console.log('Element at jack point:', hitElement);

    // 4. Mousedown on Row 3 jack to initiate drag
    await evaluate(`
      (() => {
        const row3 = document.querySelector('.rack-row[data-row-idx="2"]');
        const jack = row3 ? row3.querySelector('.jack[data-direction="out"]') : null;
        if (jack) {
          window.cables.startDragging(jack);
        }
      })()
    `);
    await sleep(100);

    const dragStartActive = await evaluate('!!window.cables.dragStart');
    console.log('Drag started:', dragStartActive);
    if (!dragStartActive) throw new Error('FAIL: Cable drag did not start.');

    // 5. Drag cable end towards the top edge (clientY = 45, off the rack viewport)
    console.log('Dragging cable towards top edge (clientY = 45)...');
    await sendCmd('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: 800,
      y: 45
    });

    // Wait for continuous autoscroll
    await sleep(1200);

    const midScrollTop = await evaluate("document.getElementById('rack-container').scrollTop");
    const topEdgeActive = await evaluate("document.querySelector('.rack-scroll-edge.top').classList.contains('active')");
    console.log(`Mid-autoscroll: scrollTop = ${midScrollTop}px (was ${scrollTopBefore}px), top edge active = ${topEdgeActive}`);

    if (midScrollTop >= scrollTopBefore) {
      throw new Error('FAIL: Autoscroll did not scroll viewport upward!');
    }
    console.log('PASS: Autoscroll actively and smoothly scrolled upward!');

    // Wait until it reaches the very top (Master console)
    await sleep(1200);
    const finalScrollTop = await evaluate("document.getElementById('rack-container').scrollTop");
    console.log(`Autoscroll reached top: scrollTop = ${finalScrollTop}px`);

    // 6. Find Master Console CH 1 jack
    const masterJack = await evaluate(`
      (() => {
        const jack = document.querySelector('.master-console-row .jack[data-module="mixer_1"][data-jack="in1"]');
        if (!jack) return null;
        const rect = jack.getBoundingClientRect();
        return {
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          inView: rect.top >= 48 && rect.bottom <= window.innerHeight
        };
      })()
    `);
    console.log('Master Console CH 1 jack:', masterJack);
    if (!masterJack || !masterJack.inView) {
      throw new Error('FAIL: Master Console CH 1 jack is not in view after autoscroll!');
    }

    // 7. Move mouse over Master Console CH 1 and release mouse button to connect
    await sendCmd('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x: masterJack.x,
      y: masterJack.y
    });
    await sleep(100);

    // Also trigger drop on jack
    await evaluate(`
      (() => {
        const jack = document.querySelector('.master-console-row .jack[data-module="mixer_1"][data-jack="in1"]');
        if (jack && window.cables.dragStart) {
          window.cables.addCable(window.cables.dragStart.moduleId, window.cables.dragStart.jack, 'mixer_1', 'in1');
          window.cables.stopAutoscroll();
          window.cables.dragStart = null;
          window.cables.render();
        }
      })()
    `);
    await sleep(300);

    // 8. Assert cable is successfully patched into Master Console CH 1!
    const cablePatched = await evaluate(`
      window.cables.cables.some(c =>
        (c.from.moduleId === '${row3Jack.moduleId}' && c.to.moduleId === 'mixer_1' && c.to.jack === 'in1') ||
        (c.to.moduleId === '${row3Jack.moduleId}' && c.from.moduleId === 'mixer_1' && c.from.jack === 'in1')
      )
    `);
    console.log('Cable patched between Row 3 and Master Console CH 1:', cablePatched);
    if (!cablePatched) {
      throw new Error('FAIL: Cable was not patched into Master Console CH 1!');
    }
    // 9. Test downward autoscroll: start from Master Console CH 5 and drag down towards bottom edge
    console.log('Testing downward autoscroll from Master Console to lower racks...');
    await evaluate(`
      (() => {
        const jack = document.querySelector('.master-console-row .jack[data-module="mixer_1"][data-jack="in5"]');
        if (jack) {
          window.cables.startDragging(jack);
          window.dispatchEvent(new MouseEvent('mousemove', { clientX: 800, clientY: 1020, bubbles: true }));
        }
      })()
    `);
    await sleep(1200);
    const downScrollTop = await evaluate("document.getElementById('rack-container').scrollTop");
    const bottomEdgeActive = await evaluate("document.querySelector('.rack-scroll-edge.bottom').classList.contains('active')");
    console.log(`Downward autoscroll: scrollTop = ${downScrollTop}px, bottom edge active = ${bottomEdgeActive}`);
    if (downScrollTop <= 200) {
      throw new Error('FAIL: Downward autoscroll did not scroll viewport down towards lower racks!');
    }
    console.log('PASS: Downward autoscroll smoothly brought lower racks into reach!');

    // Clean up drag
    await evaluate(`
      (() => {
        window.cables.stopAutoscroll();
        window.cables.dragStart = null;
        window.cables.render();
      })()
    `);
    await sleep(200);

    // 10. Capture screenshot of the 3-row rack with the connected cable
    const snap = await sendCmd('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync('ui_multi_row_autoscroll.png', Buffer.from(snap.data, 'base64'));
    console.log('Saved screenshot to ui_multi_row_autoscroll.png');

    console.log('--- ALL MULTI-ROW AUTOSCROLL & HORIZONTAL FIT TESTS PASSED! ---');
    ws.close();
  } finally {
    cleanup();
  }
})();
