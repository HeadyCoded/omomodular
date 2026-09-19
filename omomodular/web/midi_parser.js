/**
 * Standard MIDI File (SMF) Parser for OmoModular.
 * Parses Format 0 and Format 1 MIDI files into structured note events with real-time seconds.
 */

function parseMidiFile(arrayBuffer, filename = '') {
  let bytes;
  if (arrayBuffer instanceof Uint8Array) {
    bytes = arrayBuffer;
  } else if (arrayBuffer && arrayBuffer.buffer instanceof ArrayBuffer) {
    bytes = new Uint8Array(arrayBuffer.buffer, arrayBuffer.byteOffset || 0, arrayBuffer.byteLength || arrayBuffer.length);
  } else {
    bytes = new Uint8Array(arrayBuffer);
  }
  let pos = 0;

  function readStr(len) {
    let s = '';
    for (let i = 0; i < len; i++) {
      if (pos < bytes.length) s += String.fromCharCode(bytes[pos++]);
    }
    return s;
  }

  function readUint32() {
    if (pos + 4 > bytes.length) return 0;
    const v = (bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
    pos += 4;
    return v >>> 0;
  }

  function readUint16() {
    if (pos + 2 > bytes.length) return 0;
    const v = (bytes[pos] << 8) | bytes[pos + 1];
    pos += 2;
    return v;
  }

  function readVarLen() {
    let val = 0;
    while (pos < bytes.length) {
      const b = bytes[pos++];
      val = (val << 7) | (b & 0x7f);
      if (!(b & 0x80)) break;
    }
    return val;
  }

  const magic = readStr(4);
  if (magic !== 'MThd') {
    throw new Error('Not a valid Standard MIDI File (missing MThd header)');
  }

  const headerLen = readUint32();
  const format = readUint16();
  const numTracks = readUint16();
  const division = readUint16();
  if (headerLen > 6) {
    pos += headerLen - 6;
  }

  let defaultTempo = 500000; // 120 BPM in microseconds per quarter note
  const rawTracks = [];
  let globalSongTitle = '';

  for (let t = 0; t < numTracks; t++) {
    if (pos >= bytes.length) break;
    const trackMagic = readStr(4);
    if (trackMagic !== 'MTrk') break;
    const trackLen = readUint32();
    const trackEnd = pos + trackLen;

    let trackName = '';
    let instrumentName = '';
    let runningStatus = 0;
    let currentTick = 0;
    const rawEvents = [];

    while (pos < trackEnd && pos < bytes.length) {
      const delta = readVarLen();
      currentTick += delta;

      let status = bytes[pos];
      if (status >= 0x80) {
        pos++;
        runningStatus = status;
      } else {
        status = runningStatus;
      }

      if (status === 0xff) {
        // Meta event
        const metaType = bytes[pos++];
        const metaLen = readVarLen();
        const metaData = bytes.slice(pos, pos + metaLen);
        pos += metaLen;

        if (metaType === 0x03) {
          let s = '';
          for (let i = 0; i < metaData.length; i++) s += String.fromCharCode(metaData[i]);
          const clean = s.trim();
          if (clean) {
            if (!trackName) trackName = clean;
            if (!globalSongTitle && t === 0) globalSongTitle = clean;
          }
        } else if (metaType === 0x04) {
          let s = '';
          for (let i = 0; i < metaData.length; i++) s += String.fromCharCode(metaData[i]);
          instrumentName = s.trim();
        } else if (metaType === 0x51 && metaLen === 3) {
          defaultTempo = (metaData[0] << 16) | (metaData[1] << 8) | metaData[2];
        }
      } else if (status === 0xf0 || status === 0xf7) {
        // SysEx event
        const len = readVarLen();
        pos += len;
      } else {
        const type = status & 0xf0;
        const channel = status & 0x0f;
        let p1 = bytes[pos++];
        let p2 = 0;
        if (type !== 0xc0 && type !== 0xd0) {
          p2 = bytes[pos++];
        }

        if (type === 0x90 && p2 > 0) {
          rawEvents.push({ tick: currentTick, type: 'noteOn', note: p1, velocity: p2, channel });
        } else if (type === 0x80 || (type === 0x90 && p2 === 0)) {
          rawEvents.push({ tick: currentTick, type: 'noteOff', note: p1, velocity: 0, channel });
        }
      }
    }

    // Match note-on with corresponding note-off
    const activeNotes = new Map();
    const notes = [];
    for (const ev of rawEvents) {
      const key = `${ev.channel}_${ev.note}`;
      if (ev.type === 'noteOn') {
        // If there was an unclosed note with the same key, close it first
        const prev = activeNotes.get(key);
        if (prev) {
          notes.push({
            note: prev.note,
            velocity: prev.velocity,
            startTick: prev.tick,
            endTick: ev.tick,
            durationTicks: Math.max(1, ev.tick - prev.tick),
            channel: prev.channel,
          });
        }
        activeNotes.set(key, ev);
      } else if (ev.type === 'noteOff') {
        const prev = activeNotes.get(key);
        if (prev) {
          notes.push({
            note: prev.note,
            velocity: prev.velocity,
            startTick: prev.tick,
            endTick: ev.tick,
            durationTicks: Math.max(1, ev.tick - prev.tick),
            channel: prev.channel,
          });
          activeNotes.delete(key);
        }
      }
    }

    // Close any hanging notes
    for (const prev of activeNotes.values()) {
      notes.push({
        note: prev.note,
        velocity: prev.velocity,
        startTick: prev.tick,
        endTick: prev.tick + division,
        durationTicks: division,
        channel: prev.channel,
      });
    }

    if (notes.length > 0) {
      let displayName = trackName;
      if (!displayName && instrumentName) displayName = instrumentName;
      if (!displayName) displayName = `Track ${t + 1}`;

      rawTracks.push({
        id: t,
        name: displayName,
        channel: notes[0].channel,
        notes: notes.sort((a, b) => a.startTick - b.startTick),
        muted: false,
        solo: false,
      });
    }
  }

  // Calculate real-time seconds based on ticks and tempo
  const ppq = division > 0 ? division : 480;
  const secondsPerTick = defaultTempo / 1000000 / ppq;
  const detectedBpm = Math.round(60000000 / defaultTempo);

  let maxDuration = 0;
  for (const trk of rawTracks) {
    for (const n of trk.notes) {
      n.start = n.startTick * secondsPerTick;
      n.duration = Math.max(0.04, n.durationTicks * secondsPerTick);
      if (n.start + n.duration > maxDuration) {
        maxDuration = n.start + n.duration;
      }
    }
  }

  let title = filename ? filename.replace(/\.(midi|mid)$/i, '') : globalSongTitle || 'Untitled MIDI';

  return {
    title,
    bpm: detectedBpm || 120,
    duration: maxDuration,
    tracks: rawTracks,
  };
}

if (typeof window !== 'undefined') {
  window.parseMidiFile = parseMidiFile;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseMidiFile };
}
