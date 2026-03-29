/**
 * MIDI Export Module (Fixed)
 * Generates a Standard MIDI File (Type 0)
 * Ensures all events are sorted chronologically for DAW compatibility
 */

const MIDIExport = (() => {

  const HEADER_CHUNK_TYPE = [0x4d, 0x54, 0x68, 0x64];
  const TRACK_CHUNK_TYPE  = [0x4d, 0x54, 0x72, 0x6b];
  const TICKS_PER_BEAT    = 128;

  // MIDI Drum Map (Channel 10 / Index 9)
  const RHYTHM_NOTE_MAP = {
    'Kick': 36, '808 Kick': 36, 'Bass Drum': 35,
    'Snare': 38, '808 Snare': 38, 'Acoustic Snare': 38, 'Snare Brush': 40,
    'Hi-Hat': 42, 'Closed Hi-Hat': 42, 'Open Hi-Hat': 46,
    'Clap': 39, 'Hand Clap': 39,
    'Ride Cymbal': 51, 'Crash Cymbal': 49,
    'Darbuka': 35, 'Tabla': 36, 'Castanets': 58,
    'Congas': 62, 'Bongos': 60, 'Cowbell': 56, 'Tambourine': 54,
  };

  // General MIDI Program Map (Melodic instruments)
  const MELODIC_PROGRAM_MAP = {
    'Piano': 0, 'Grand Piano': 0, 'Electric Piano': 4, 'Keys': 4,
    'Sitar': 104, 'Oud': 105, 'Tanpura': 104,
    'Flute': 73, 'Ney': 72, 'Recorder': 74,
    'Saxophone': 65, 'Trumpet': 56, 'Trombone': 57,
    'Electric Guitar': 27, 'Acoustic Guitar': 24, 'Nylon Guitar': 24,
    'Bass': 33, 'Electric Bass': 33, 'Synth Bass': 38, 'Psy-Bass': 38, 'Double Bass': 32,
    'Strings': 48, 'Violin': 40, 'Cello': 42, 'Harp': 46,
    'Synth Lead': 80, 'Acid Lead': 84, 'Synth Pad': 89, 'Pad': 89,
    'Vibraphone': 11, 'Marimba': 12, 'Celesta': 8,
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

    // Meta: Set Tempo
    const micro = Math.floor(60000000 / bpm);
    allEvents.push({ tick: 0, status: 0xff, data: [0x51, 0x03, ...numberToBytes(micro, 3)] });

    // Meta: Time Signature (4/4)
    allEvents.push({ tick: 0, status: 0xff, data: [0x58, 0x04, 0x04, 0x02, 0x18, 0x08] });

    const ticksPerStep = TICKS_PER_BEAT / 4;

    instruments.forEach((inst, instIdx) => {
      const name = inst.name;
      const lower = name.toLowerCase();
      const isPerc = !!RHYTHM_NOTE_MAP[name] || lower.includes('kick') || lower.includes('snare') || lower.includes('drum') || lower.includes('hat') || lower.includes('perc') || lower.includes('tabla') || lower.includes('clap') || lower.includes('conga') || lower.includes('bongo');

      const note = RHYTHM_NOTE_MAP[name] || 60;
      const chan = isPerc ? 9 : (instIdx % 8);

      // Program Change (Melodic only)
      if (!isPerc) {
        const prog = MELODIC_PROGRAM_MAP[name] || 0;
        allEvents.push({ tick: 0, status: (0xc0 | chan), data: [prog] });
      }

      inst.steps.forEach((on, stepIdx) => {
        if (on) {
          const startTick = stepIdx * ticksPerStep;
          const endTick = startTick + (ticksPerStep - 2);
          // Note On (Velocity 100)
          allEvents.push({ tick: startTick, status: (0x90 | chan), data: [note, 100] });
          // Note Off
          allEvents.push({ tick: endTick, status: (0x80 | chan), data: [note, 0] });
        }
      });
    });

    // Sort events by absolute tick
    allEvents.sort((a, b) => {
      if (a.tick !== b.tick) return a.tick - b.tick;
      // same tick: prioritize meta (0xff) > program change (0xcx) > note on (0x9x) > note off (0x8x)
      return b.status - a.status;
    });

    // End of track meta event
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

    // MThd chunk
    let header = [
      ...HEADER_CHUNK_TYPE,
      ...numberToBytes(6, 4), // length
      ...numberToBytes(0, 2), // format (Type 0)
      ...numberToBytes(1, 2), // tracks (1)
      ...numberToBytes(TICKS_PER_BEAT, 2)
    ];

    // MTrk chunk
    let trackChunk = [
      ...TRACK_CHUNK_TYPE,
      ...numberToBytes(trackData.length, 4),
      ...trackData
    ];

    return new Uint8Array([...header, ...trackChunk]);
  }

  return {
    downloadMIDI: (instruments, bpm, projectName) => {
      try {
        const bytes = generateMIDI(instruments, bpm);
        const blob = new Blob([bytes], { type: 'application/x-midi' });
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
