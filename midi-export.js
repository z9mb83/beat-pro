/**
 * MIDI Export Module (Fixed)
 * Generates a Standard MIDI File (Type 0)
 * Ensures all events are sorted chronologically for DAW compatibility
 */

const MIDIExport = (() => {

  const HEADER_CHUNK_TYPE = [0x4d, 0x54, 0x68, 0x64];
  const TRACK_CHUNK_TYPE  = [0x4d, 0x54, 0x72, 0x6b];
  const TICKS_PER_BEAT    = 128;

  const RHYTHM_NOTE_MAP = {
    'Kick': 36, '808 Kick': 36, 'Snare': 38, 'Snare Brush': 40,
    'Hi-Hat': 42, 'Open Hi-Hat': 46, 'Clap': 39, 'Ride Cymbal': 51,
    'Darbuka': 35, 'Tabla': 36, 'Castanets': 58,
  };

  const MELODIC_PROGRAM_MAP = {
    'Piano': 0, 'Keys': 4, 'Sitar': 104, 'Oud': 105, 'Flute': 73,
    'Ney': 72, 'Tanpura': 104, 'Electric Guitar': 27, 'Acoustic Guitar': 24,
    'Bass': 33, 'Double Bass': 32, 'Strings': 48, 'Cello': 42,
    'Synth Lead': 80, 'Pad': 89, 'Acid Lead': 84, 'Psy-Bass': 38,
  };

  function toVLQ(num) {
    let out = [];
    if (num === 0) return [0];
    while (num > 0) {
      out.push(num & 0x7f);
      num >>= 7;
    }
    out.reverse();
    for (let i = 0; i < out.length - 1; i++) out[i] |= 0x80;
    return out;
  }

  function numberToBytes(num, size) {
    let bytes = [];
    for (let i = size - 1; i >= 0; i--) bytes.push((num >> (i * 8)) & 0xff);
    return bytes;
  }

  function generateMIDI(instruments, bpm) {
    let allEvents = [];

    // Set Tempo (Absolute tick 0)
    const micro = Math.floor(60000000 / bpm);
    allEvents.push({ tick: 0, status: 0xff, data: [0x51, 0x03, ...numberToBytes(micro, 3)] });

    const ticksPerStep = TICKS_PER_BEAT / 4;

    instruments.forEach((inst, instIdx) => {
      const isPerc = !!RHYTHM_NOTE_MAP[inst.name] || inst.name.toLowerCase().includes('kick') || inst.name.toLowerCase().includes('snare') || inst.name.toLowerCase().includes('hat');
      const note = RHYTHM_NOTE_MAP[inst.name] || 60;
      const chan = isPerc ? 9 : (instIdx % 8);

      // Program Change (Melodic only)
      if (!isPerc) {
        const prog = MELODIC_PROGRAM_MAP[inst.name] || 0;
        allEvents.push({ tick: 0, status: (0xc0 | chan), data: [prog] });
      }

      inst.steps.forEach((on, stepIdx) => {
        if (on) {
          const startTick = stepIdx * ticksPerStep;
          const endTick = startTick + (ticksPerStep - 2);
          // Note On
          allEvents.push({ tick: startTick, status: (0x90 | chan), data: [note, 100] });
          // Note Off
          allEvents.push({ tick: endTick, status: (0x80 | chan), data: [note, 0] });
        }
      });
    });

    // Sort events by absolute tick
    allEvents.sort((a, b) => a.tick - b.tick);

    // End of track (at the very end)
    const lastTick = allEvents.length ? allEvents[allEvents.length - 1].tick + 1 : 0;
    allEvents.push({ tick: lastTick, status: 0xff, data: [0x2f, 0x00] });

    // Build track payload with deltas
    let trackData = [];
    let currentTick = 0;

    allEvents.forEach(ev => {
      const delta = ev.tick - currentTick;
      trackData.push(...toVLQ(delta));
      if (ev.status === 0xff) {
        trackData.push(0xff, ...ev.data);
      } else {
        trackData.push(ev.status, ...ev.data);
      }
      currentTick = ev.tick;
    });

    let header = [...HEADER_CHUNK_TYPE, ...numberToBytes(6, 4), ...numberToBytes(0, 2), ...numberToBytes(1, 2), ...numberToBytes(TICKS_PER_BEAT, 2)];
    let trackChunk = [...TRACK_CHUNK_TYPE, ...numberToBytes(trackData.length, 4), ...trackData];

    return new Uint8Array([...header, ...trackChunk]);
  }

  return {
    downloadMIDI: (instruments, bpm, projectName) => {
      try {
        const bytes = generateMIDI(instruments, bpm);
        const blob = new Blob([bytes], { type: 'audio/midi' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = (projectName || 'beat-pro-midi').replace(/\s+/g, '_') + '.mid';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (e) {
        console.error('MIDI Export Error:', e);
      }
    }
  };
})();
