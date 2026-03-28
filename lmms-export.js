/**
 * LMMS Export Module
 * Generates a .mmp (LMMS project) XML file from beat patterns
 * LMMS Beat+Bassline format
 */

const LMMSExport = (() => {

  // Maps instrument names to LMMS plugin/sample info
  const INSTRUMENT_PLUGIN_MAP = {
    'Kick':             { plugin: 'tripleoscillator', preset: 'kick' },
    '808 Kick':         { plugin: 'tripleoscillator', preset: '808kick' },
    'Snare':            { plugin: 'tripleoscillator', preset: 'snare' },
    'Snare Brush':      { plugin: 'tripleoscillator', preset: 'snare' },
    'Hi-Hat':           { plugin: 'tripleoscillator', preset: 'hihat' },
    'Open Hi-Hat':      { plugin: 'tripleoscillator', preset: 'openhat' },
    'Clap':             { plugin: 'tripleoscillator', preset: 'clap' },
    'Ride Cymbal':      { plugin: 'tripleoscillator', preset: 'ride' },
    'Bass':             { plugin: 'tripleoscillator', preset: 'bass' },
    'Synth Lead':       { plugin: 'tripleoscillator', preset: 'lead' },
    'Pad':              { plugin: 'tripleoscillator', preset: 'pad' },
    'Piano':            { plugin: 'tripleoscillator', preset: 'piano' },
    'Electric Guitar':  { plugin: 'tripleoscillator', preset: 'guitar' },
    'Acoustic Guitar':  { plugin: 'tripleoscillator', preset: 'guitar' },
    'Keys':             { plugin: 'tripleoscillator', preset: 'piano' },
    'Trumpet':          { plugin: 'tripleoscillator', preset: 'lead' },
    'Strings':          { plugin: 'tripleoscillator', preset: 'pad' },
    'Flute':            { plugin: 'tripleoscillator', preset: 'lead' },
    'Cello':            { plugin: 'tripleoscillator', preset: 'bass' },
    'Oboe':             { plugin: 'tripleoscillator', preset: 'lead' },
    'Fiddle':           { plugin: 'tripleoscillator', preset: 'lead' },
    'Double Bass':      { plugin: 'tripleoscillator', preset: 'bass' },
  };

  // Oscillator colors per track index (LMMS color IDs)
  const TRACK_COLORS = [
    '#e74c3c','#e67e22','#f1c40f','#2ecc71',
    '#1abc9c','#3498db','#9b59b6','#e91e63'
  ];

  // Convert step pattern array (booleans) to LMMS beat steps XML
  function stepsToXML(steps) {
    return steps.map((active, i) => {
      const vol  = active ? 100 : 0;
      const pan  = 0;
      const pitch = 0;
      return `        <step num="${i}" vol="${vol}" pan="${pan}" pitch="${pitch}" />`;
    }).join('\n');
  }

  // Build one <track> element for a beat+bassline instrument
  function buildTrack(instrumentName, steps, colorIndex) {
    const color = TRACK_COLORS[colorIndex % TRACK_COLORS.length];
    const safeSteps = steps.length === 16 ? steps : [...steps, ...Array(16).fill(false)].slice(0, 16);

    // TripleOscillator plugin values (basic defaults)
    const pluginXML = `
      <plugin name="tripleoscillator">
        <tripleoscillator>
          <osc num="0" vol="33" pan="0" coarse="0" finel="0" finer="0" stphase="0" wavetype="0" lphase="0" lfreq="5" lamt="0.001" />
          <osc num="1" vol="33" pan="0" coarse="0" finel="0" finer="0" stphase="0" wavetype="0" lphase="0" lfreq="5" lamt="0.001" />
          <osc num="2" vol="33" pan="0" coarse="0" finel="0" finer="0" stphase="0" wavetype="0" lphase="0" lfreq="5" lamt="0.001" />
        </tripleoscillator>
      </plugin>`;

    return `
  <track type="0" name="${escapeXML(instrumentName)}" muted="0" solo="0" color="${color}">
    <instrumenttrack vol="100" pan="0" pitch="0" pitchrange="100" usemasterpit="1" firstkey="0" lastkey="287" fixednotes="-1">
      <instrument name="tripleoscillator">
        <tripleoscillator>
          <osc num="0" vol="33" pan="0" coarse="0" finel="0" finer="0" stphase="0" wavetype="0" lphase="0" lfreq="5" lamt="0.001" />
          <osc num="1" vol="33" pan="0" coarse="0" finel="0" finer="0" stphase="0" wavetype="0" lphase="0" lfreq="5" lamt="0.001" />
          <osc num="2" vol="33" pan="0" coarse="0" finel="0" finer="0" stphase="0" wavetype="0" lphase="0" lfreq="5" lamt="0.001" />
        </tripleoscillator>
      </instrument>
      <pattern name="beat">
${stepsToXML(safeSteps)}
      </pattern>
    </instrumenttrack>
  </track>`;
  }

  function escapeXML(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Generate LMMS Beat+Bassline .mmp XML
   * @param {Array} instruments - [{name, steps: bool[16]}]
   * @param {number} bpm
   * @param {string} projectName
   * @returns {string} XML string
   */
  function generateMMP(instruments, bpm, projectName = 'Beat Pro Export') {
    const tracksXML = instruments
      .map((inst, i) => buildTrack(inst.name, inst.steps, i))
      .join('\n');

    return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE mmp>
<mmp version="1.0" creator="Beat Pro Web App" creatorversion="0.1">
  <head bpm="${bpm}" mastervol="100" masterpitch="0" timesig_numerator="4" timesig_denominator="4" />
  <song>
    <track type="2" name="${escapeXML(projectName)}" muted="0" solo="0">
      <bbtrack>
        <bbtco pos="0" len="131072" muted="0" />
      </bbtrack>
      <bb name="${escapeXML(projectName)}">
${tracksXML}
      </bb>
    </track>
  </song>
</mmp>`;
  }

  /**
   * Trigger browser download of the .mmp file
   */
  function downloadMMP(instruments, bpm, projectName) {
    const xml = generateMMP(instruments, bpm, projectName);
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = (projectName || 'beat-pro-export').replace(/\s+/g, '_') + '.mmp';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return { generateMMP, downloadMMP };
})();
