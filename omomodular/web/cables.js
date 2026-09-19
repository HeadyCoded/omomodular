/**
 * OmoModular Cable Physics & SVG Patching System
 * Handles realistic drooping bezier cables, color-cycling, and live interactive dragging.
 */

class CableManager {
  constructor(svgElement, rackElement, dspEngine) {
    this.svg = svgElement;
    this.rack = rackElement;
    this.dsp = dspEngine;
    this.cables = []; // { id, from: {moduleId, jack}, to: {moduleId, jack}, color }
    this.isGhost = false;

    this.palette = [
      'var(--omo-cyan)',
      'var(--omo-magenta)',
      'var(--omo-orange)',
      'var(--omo-accent)',
      'var(--omo-green)',
      'var(--omo-yellow)',
    ];
    this.colorIndex = 0;

    // Dragging state
    this.dragStart = null; // { moduleId, jack, x, y, isOut }
    this.dragCurrent = null; // { x, y }

    this.setupEvents();
  }

  nextColor() {
    const col = this.palette[this.colorIndex % this.palette.length];
    this.colorIndex++;
    return col;
  }

  setupEvents() {
    window.addEventListener('resize', () => this.render());
    this.rack.addEventListener('scroll', () => this.render());

    // Live cable dragging
    window.addEventListener('mousemove', (e) => {
      if (!this.dragStart) return;
      const rect = this.svg.getBoundingClientRect();
      this.dragCurrent = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
      this.render();
    });

    window.addEventListener('mouseup', (e) => {
      if (!this.dragStart) return;
      // Check if dropped on a valid target jack
      const target = document.elementFromPoint(e.clientX, e.clientY);
      const jackEl = target ? target.closest('.jack') : null;

      if (jackEl && jackEl.dataset.direction === 'in') {
        const toModId = jackEl.dataset.module;
        const toJack = jackEl.dataset.jack;

        if (this.dragStart.moduleId !== toModId) {
          this.addCable(
            this.dragStart.moduleId,
            this.dragStart.jack,
            toModId,
            toJack,
            this.nextColor()
          );
        }
      }

      this.dragStart = null;
      this.dragCurrent = null;
      this.render();
    });
  }

  startDragging(jackElement) {
    const isOut = jackElement.dataset.direction === 'out';
    if (!isOut) return;

    this.dsp.ensureContext();
    const pos = this.getJackCenter(jackElement);
    this.dragStart = {
      moduleId: jackElement.dataset.module,
      jack: jackElement.dataset.jack,
      x: pos.x,
      y: pos.y,
      isOut: true,
    };
    this.dragCurrent = { x: pos.x, y: pos.y };
    this.render();
  }

  getJackCenter(el) {
    const svgRect = this.svg.getBoundingClientRect();
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - svgRect.left,
      y: rect.top + rect.height / 2 - svgRect.top,
    };
  }

  findJackElement(moduleId, jack, direction = null) {
    const selector = direction
      ? `.jack[data-module="${moduleId}"][data-jack="${jack}"][data-direction="${direction}"]`
      : `.jack[data-module="${moduleId}"][data-jack="${jack}"]`;
    return this.rack.querySelector(selector);
  }

  addCable(fromModId, fromJack, toModId, toJack, color = null) {
    // Check for duplicate connection
    const exists = this.cables.some(
      c => c.from.moduleId === fromModId && c.from.jack === fromJack &&
           c.to.moduleId === toModId && c.to.jack === toJack
    );
    if (exists) return;

    const cableColor = color || this.nextColor();
    const connected = this.dsp.connectJacks(fromModId, fromJack, toModId, toJack);
    if (connected) {
      const cable = {
        id: `cable_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        from: { moduleId: fromModId, jack: fromJack },
        to: { moduleId: toModId, jack: toJack },
        color: cableColor,
      };
      this.cables.push(cable);
      this.dsp.activeCables = this.cables;
      this.updateJackLedStatus();
      this.render();
      if (window.onPatchModified) window.onPatchModified();
    }
  }

  removeCable(cableId) {
    const idx = this.cables.findIndex(c => c.id === cableId);
    if (idx === -1) return;
    const c = this.cables[idx];
    this.dsp.disconnectJack(c.from.moduleId, c.from.jack, c.to.moduleId, c.to.jack);
    this.cables.splice(idx, 1);
    this.dsp.activeCables = this.cables;
    this.updateJackLedStatus();
    this.render();
    if (window.onPatchModified) window.onPatchModified();
  }

  updateJackLedStatus() {
    this.rack.querySelectorAll('.jack').forEach(el => {
      const modId = el.dataset.module;
      const jack = el.dataset.jack;
      const hasCable = this.cables.some(
        c => (c.from.moduleId === modId && c.from.jack === jack) ||
             (c.to.moduleId === modId && c.to.jack === jack)
      );
      if (hasCable) {
        el.classList.add('connected');
      } else {
        el.classList.remove('connected');
      }
    });
  }

  toggleGhost(forceState = null) {
    this.isGhost = forceState !== null ? forceState : !this.isGhost;
    if (this.isGhost) {
      this.svg.classList.add('ghost');
    } else {
      this.svg.classList.remove('ghost');
    }
    return this.isGhost;
  }

  calculateBezier(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Physics sag: adapt for intra-row and inter-row patching
    const baseSag = 45 + Math.min(240, dist * 0.28);
    const cp1x = x1;
    const cp1y = y1 + baseSag;
    const cp2x = x2;
    // If dropping down to a lower row, create realistic hanging gravity loop
    const cp2y = dy > 100 ? y2 - baseSag * 0.35 : y2 + baseSag;

    return `M ${x1} ${y1} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${x2} ${y2}`;
  }

  render() {
    // Sizing SVG to cover full scrollable rack dimensions
    const scrollW = Math.max(this.rack.scrollWidth || 0, this.rack.clientWidth || 0, window.innerWidth);
    const scrollH = Math.max(this.rack.scrollHeight || 0, this.rack.clientHeight || 0, window.innerHeight);
    this.svg.style.width = `${scrollW}px`;
    this.svg.style.height = `${scrollH}px`;
    this.svg.setAttribute('width', scrollW);
    this.svg.setAttribute('height', scrollH);

    this.svg.innerHTML = '';
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    defs.innerHTML = `
      <filter id="cable-shadow" x="-30%" y="-30%" width="160%" height="180%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="4"/>
        <feOffset dx="0" dy="6" result="offsetblur"/>
        <feFlood flood-color="rgba(0, 0, 0, 0.65)"/>
        <feComposite in2="offsetblur" operator="in"/>
        <feMerge>
          <feMergeNode/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
    `;
    this.svg.appendChild(defs);

    // Render active saved cables
    for (const cable of this.cables) {
      const fromEl = this.findJackElement(cable.from.moduleId, cable.from.jack, 'out');
      const toEl = this.findJackElement(cable.to.moduleId, cable.to.jack, 'in');

      if (!fromEl || !toEl) continue;

      const p1 = this.getJackCenter(fromEl);
      const p2 = this.getJackCenter(toEl);
      const d = this.calculateBezier(p1.x, p1.y, p2.x, p2.y);

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.classList.add('cable-group');
      group.dataset.cableId = cable.id;

      // Click to disconnect
      group.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeCable(cable.id);
      });

      // Shadow layer
      const shadowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      shadowPath.setAttribute('d', d);
      shadowPath.setAttribute('fill', 'none');
      shadowPath.setAttribute('stroke', 'rgba(0, 0, 0, 0.45)');
      shadowPath.setAttribute('stroke-width', '7');
      shadowPath.setAttribute('stroke-linecap', 'round');
      group.appendChild(shadowPath);

      // Core colored cable
      const corePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      corePath.setAttribute('d', d);
      corePath.setAttribute('fill', 'none');
      corePath.setAttribute('stroke', cable.color);
      corePath.setAttribute('stroke-width', '4.5');
      corePath.setAttribute('stroke-linecap', 'round');
      corePath.classList.add('cable-core');
      group.appendChild(corePath);

      // Inner highlight line for cylindrical 3D look
      const hiPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      hiPath.setAttribute('d', d);
      hiPath.setAttribute('fill', 'none');
      hiPath.setAttribute('stroke', 'rgba(255, 255, 255, 0.25)');
      hiPath.setAttribute('stroke-width', '1.2');
      hiPath.setAttribute('stroke-linecap', 'round');
      group.appendChild(hiPath);

      // Plugs at both ends
      this.renderPlug(group, p1.x, p1.y, cable.color);
      this.renderPlug(group, p2.x, p2.y, cable.color);

      this.svg.appendChild(group);
    }

    // Render interactive drag preview cable
    if (this.dragStart && this.dragCurrent) {
      const d = this.calculateBezier(
        this.dragStart.x,
        this.dragStart.y,
        this.dragCurrent.x,
        this.dragCurrent.y
      );

      const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      group.classList.add('cable-drag-preview');

      const corePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      corePath.setAttribute('d', d);
      corePath.setAttribute('fill', 'none');
      corePath.setAttribute('stroke', 'var(--omo-accent)');
      corePath.setAttribute('stroke-width', '4.5');
      corePath.setAttribute('stroke-linecap', 'round');
      corePath.setAttribute('stroke-dasharray', '8, 4');
      group.appendChild(corePath);

      this.renderPlug(group, this.dragStart.x, this.dragStart.y, 'var(--omo-accent)');
      this.renderPlug(group, this.dragCurrent.x, this.dragCurrent.y, 'var(--omo-accent)');

      this.svg.appendChild(group);
    }
  }

  renderPlug(parentGroup, x, y, color) {
    const plugGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    // Outer metal knurled collar
    const outer = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    outer.setAttribute('cx', x);
    outer.setAttribute('cy', y);
    outer.setAttribute('r', '7');
    outer.setAttribute('fill', '#2d313f');
    outer.setAttribute('stroke', '#4e546c');
    outer.setAttribute('stroke-width', '1.5');
    plugGroup.appendChild(outer);

    // Colored strain relief core
    const inner = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    inner.setAttribute('cx', x);
    inner.setAttribute('cy', y);
    inner.setAttribute('r', '4');
    inner.setAttribute('fill', color);
    plugGroup.appendChild(inner);

    parentGroup.appendChild(plugGroup);
  }
}

window.CableManager = CableManager;
