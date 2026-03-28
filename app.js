/**
 * Beat Pro — Main Application Logic
 * Lyrics analysis → Instrument recommendation → Beat generation → Audio playback
 */

// ============================================================
// 1. LYRICS ANALYZER
// ============================================================
const LyricsAnalyzer = (() => {
  const MOOD_WORDS = {
    energy:   ['run','fire','fast','jump','rush','power','alive','loud','rise','fight','wild','free','go','burst','race','fly','hype','lit','bang','spark','electric','charge','explode','force','sprint','adrenaline','hustle','grind', 'shakti', 'josh', 'tez', 'correr', 'fuego', 'rapido', 'fuerza', 'energia', 'vite'],
    dark:     ['dark','shadow','night','pain','cry','lost','empty','alone','fear','cold','rain','storm','black','silent','void','hollow','broken','numb','grief','tear','shatter','ghost','forgotten','fade','absence','sorrow','ache','dread', 'andhera', 'raat', 'dard', 'akelapan', 'oscuridad', 'noche', 'dolor', 'solo', 'ombre', 'nuit'],
    romantic: ['love','heart','kiss','hold','touch','you','together','forever','dream','soft','warm','soul','dear','adore','embrace','close','feel','tender','beauty','glow','shine','sweet','honey','darling','beloved', 'pyaar', 'dil', 'ishq', 'mohabbat', 'sanam', 'amor', 'corazon', 'beso', 'amour', 'coeur'],
    aggro:    ['hate','kill','destroy','crush','war','battle','enemy','smash','rage','anger','fist','blood','brutal','savage','beast','wreck','violate','dominate','conquer', 'nafrat', 'jung', 'khoon', 'gussa', 'odio', 'guerra', 'sangre', 'haine', 'guerre', 'sang'],
    chill:    ['relax','chill','slow','breathe','flow','calm','peace','smooth','ease','float','gentle','drift','mellow','still','quiet','sunset','horizon','serene','tranquil','rest', 'shanti', 'sukoon', 'dheere', 'paz', 'tranquilo', 'calma', 'paix', 'tranquille'],
    happy:    ['happy','joy','smile','laugh','celebrate','good','great','amazing','wonderful','sunshine','bright','best','cheer','party','fun','dance','glee','bliss','elated','woo','yay','fantastic', 'khushi', 'muskurana', 'jashn', 'achha', 'feliz', 'alegria', 'fiesta', 'heureux', 'joie', 'fête'],
  };

  function analyze(text) {
    const words = text.toLowerCase().match(/\b\w+\b/g) || [];
    const total = Math.max(words.length, 1);
    const scores = {};

    for (const [mood, kws] of Object.entries(MOOD_WORDS)) {
      const hits = words.filter(w => kws.includes(w)).length;
      scores[mood] = Math.min(1, (hits / total) * 30 + (hits > 0 ? 0.12 : 0));
    }

    // Normalise so max == 1
    const maxScore = Math.max(...Object.values(scores), 0.01);
    for (const k in scores) scores[k] /= maxScore;

    // Dominant mood tags (threshold > 0.3)
    const tags = Object.entries(scores)
      .filter(([, v]) => v > 0.25)
      .sort((a, b) => b[1] - a[1])
      .map(([k]) => k);

    return { scores, tags: tags.length ? tags : ['chill'] };
  }

  return { analyze };
})();

// ============================================================
// 2. INSTRUMENT RECOMMENDER
// ============================================================
const InstrumentRecommender = (() => {
  const GENRE_INSTRUMENTS = {
    'Hip-Hop':   [
      { name:'808 Kick',      icon:'🥁', desc:'Deep sub-bass kick defining the Hip-Hop groove' },
      { name:'Snare',         icon:'🪘', desc:'Crisp snare on beats 2 & 4' },
      { name:'Hi-Hat',        icon:'🎵', desc:'Rapid hi-hats for rhythmic drive' },
      { name:'Bass',          icon:'🎸', desc:'Heavy 808 bass carrying the harmonic foundation' },
      { name:'Piano',         icon:'🎹', desc:'Sampled piano chops & melodies' },
    ],
    'Pop':       [
      { name:'Kick',          icon:'🥁', desc:'Punchy kick on the one beat' },
      { name:'Snare',         icon:'🪘', desc:'Bright snare or clap' },
      { name:'Hi-Hat',        icon:'🎵', desc:'Steady eighth-note hi-hats' },
      { name:'Synth Lead',    icon:'🎹', desc:'Catchy synth hook' },
      { name:'Bass',          icon:'🎸', desc:'Melodic pop bass line' },
    ],
    'Rock':      [
      { name:'Kick',          icon:'🥁', desc:'Powerful kick anchoring the beat' },
      { name:'Snare',         icon:'🪘', desc:'Heavy backbeat snare' },
      { name:'Hi-Hat',        icon:'🎵', desc:'Driving hi-hat pattern' },
      { name:'Electric Guitar',icon:'🎸',desc:'Riff-based electric guitar' },
      { name:'Bass',          icon:'🎸', desc:'Locked-in bass following the kick' },
    ],
    'Jazz':      [
      { name:'Ride Cymbal',   icon:'🎵', desc:'Swing ride pattern on the cymbal' },
      { name:'Snare Brush',   icon:'🪘', desc:'Brushed snare for soft texture' },
      { name:'Double Bass',   icon:'🎸', desc:'Walking bass line' },
      { name:'Piano',         icon:'🎹', desc:'Jazz chord comping' },
      { name:'Trumpet',       icon:'🎺', desc:'Lead trumpet melody' },
    ],
    'EDM':       [
      { name:'Kick',          icon:'🥁', desc:'Four-on-the-floor kick' },
      { name:'Clap',          icon:'🪘', desc:'Punchy clap on 2 & 4' },
      { name:'Hi-Hat',        icon:'🎵', desc:'Offbeat open hi-hat' },
      { name:'Synth Lead',    icon:'🎹', desc:'Soaring synth pluck' },
      { name:'Pad',           icon:'🎹', desc:'Lush atmospheric pad' },
      { name:'Bass',          icon:'🎸', desc:'Side-chain pumping bass' },
    ],
    'R&B':       [
      { name:'Kick',          icon:'🥁', desc:'Soulful kick with ghost notes' },
      { name:'Snare',         icon:'🪘', desc:'Warm snare or layered clap' },
      { name:'Hi-Hat',        icon:'🎵', desc:'Shuffled hi-hat groove' },
      { name:'Keys',          icon:'🎹', desc:'Rhodes or Wurlitzer keys' },
      { name:'Bass',          icon:'🎸', desc:'Smooth melodic bass line' },
    ],
    'Country':   [
      { name:'Kick',          icon:'🥁', desc:'Straight kick pattern' },
      { name:'Snare',         icon:'🪘', desc:'Bright snare on 2 & 4' },
      { name:'Acoustic Guitar',icon:'🎸',desc:'Strummed acoustic guitar' },
      { name:'Fiddle',        icon:'🎻', desc:'Lead fiddle melodies' },
      { name:'Bass',          icon:'🎸', desc:'Country walking bass' },
    ],
    'Classical': [
      { name:'Strings',       icon:'🎻', desc:'Rich string ensemble' },
      { name:'Piano',         icon:'🎹', desc:'Expressive piano melody' },
      { name:'Flute',         icon:'🪈', desc:'Delicate flute passages' },
      { name:'Cello',         icon:'🎻', desc:'Deep cello foundation' },
      { name:'Oboe',          icon:'🎵', desc:'Lyrical oboe countermelody' },
    ],
    'Indian Classical': [
      { name:'Sitar',         icon:'🪕', desc:'Traditional resonant string instrument' },
      { name:'Tabla',         icon:'🥁', desc:'Percussive hand drums providing complex rhythm' },
      { name:'Tanpura',       icon:'🎵', desc:'Continuous harmonic drone' },
      { name:'Flute',         icon:'🪈', desc:'Bansuri flute for melodic grace' },
    ],
    'Goa Trance': [
      { name:'Kick',          icon:'🥁', desc:'Hard-hitting psy-trance kick' },
      { name:'Acid Lead',     icon:'⌨️', desc:'Resonant 303-style synth lead' },
      { name:'Hi-Hat',        icon:'🎵', desc:'Rapid rhythmic hi-hats' },
      { name:'Psy-Bass',      icon:'🎸', desc:'Rolling 16th note bassline' },
      { name:'Pad',           icon:'🎹', desc:'Atmospheric space pads' },
    ],
    'Sitar Fusion': [
      { name:'Sitar',         icon:'🪕', desc:'Fused sitar melodies' },
      { name:'808 Kick',      icon:'🥁', desc:'Modern sub-bass kick' },
      { name:'Tabla',         icon:'🥁', desc:'Hand drums with electronic effects' },
      { name:'Synth Lead',    icon:'🎹', desc:'Modern synth hook' },
      { name:'Pad',           icon:'🎹', desc:'Lush fusion atmosphere' },
    ],
    'Middle Eastern': [
      { name:'Oud',           icon:'🪕', desc:'Deep resonant lute' },
      { name:'Darbuka',       icon:'🥁', desc:'Traditional goblet drum' },
      { name:'Ney',           icon:'🪈', desc:'Breathy end-blown flute' },
      { name:'Strings',       icon:'🎻', desc:'Dramatic orchestral strings' },
      { name:'Bass',          icon:'🎸', desc:'Supporting low-end' },
    ],
    'Flamenco-Trap': [
      { name:'Acoustic Guitar',icon:'🎸',desc:'Strummed flamenco guitar' },
      { name:'808 Kick',      icon:'🥁', desc:'Hard trap kick' },
      { name:'Clap',          icon:'🪘', desc:'Snappy percussion claps' },
      { name:'Castanets',     icon:'🎵', desc:'Traditional rhythmic clacks' },
      { name:'Bass',          icon:'🎸', desc:'Heavy sub-bass' },
    ],
  };

  // Mood boosts: which moods up-rank which instruments
  const MOOD_BOOSTS = {
    energy:   ['Kick','808 Kick','Hi-Hat','Electric Guitar','Synth Lead','Clap'],
    dark:     ['Bass','808 Kick','Pad','Strings','Cello'],
    romantic: ['Piano','Keys','Strings','Flute','Acoustic Guitar'],
    aggro:    ['Kick','808 Kick','Snare','Electric Guitar','Bass'],
    chill:    ['Pad','Keys','Piano','Acoustic Guitar','Strings'],
    happy:    ['Clap','Synth Lead','Piano','Hi-Hat','Fiddle'],
  };

  function recommend(genre, moodScores) {
    const base = GENRE_INSTRUMENTS[genre] || GENRE_INSTRUMENTS['Pop'];

    return base.map(inst => {
      let boost = 0;
      for (const [mood, score] of Object.entries(moodScores)) {
        if (MOOD_BOOSTS[mood]?.includes(inst.name)) boost += score * 0.35;
      }
      const score = Math.min(1, 0.55 + boost + Math.random() * 0.1);
      return { ...inst, score };
    }).sort((a, b) => b.score - a.score);
  }

  return { recommend };
})();

// ============================================================
// 3. BEAT PATTERN GENERATOR
// ============================================================
const BeatPatternGenerator = (() => {
  // Pre-defined genre patterns per instrument type
  const PATTERNS = {
    // 4/4 standard
    'Kick':          [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0],
    '808 Kick':      [1,0,0,0, 0,0,1,0, 1,0,0,1, 0,0,0,0],
    'Snare':         [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    'Snare Brush':   [0,0,0,0, 1,0,0,1, 0,0,0,0, 1,0,0,1],
    'Hi-Hat':        [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
    'Open Hi-Hat':   [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    'Clap':          [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
    'Ride Cymbal':   [1,0,1,1, 0,1,1,0, 1,0,1,1, 0,1,1,0],
    'Bass':          [1,0,0,1, 0,0,1,0, 1,0,0,1, 0,1,0,0],
    'Synth Lead':    [1,0,0,0, 0,0,1,0, 0,0,1,0, 0,0,0,1],
    'Pad':           [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
    'Piano':         [1,0,1,0, 0,1,0,0, 1,0,1,0, 0,0,1,0],
    'Keys':          [1,0,0,1, 0,0,1,0, 1,0,0,0, 1,0,0,0],
    'Electric Guitar':[1,0,0,1, 0,1,0,0, 1,0,0,1, 0,1,0,0],
    'Acoustic Guitar':[1,0,1,0, 1,0,1,0, 1,0,1,0, 0,1,0,1],
    'Fiddle':        [0,0,1,0, 1,0,0,1, 0,1,0,0, 1,0,1,0],
    'Double Bass':   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,1,0],
    'Trumpet':       [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,0],
    'Strings':       [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    'Flute':         [0,0,1,0, 0,1,0,0, 1,0,0,0, 0,0,1,0],
    'Cello':         [1,0,0,0, 0,0,1,0, 0,0,0,0, 1,0,0,0],
    'Oboe':          [0,0,0,1, 0,0,1,0, 0,1,0,0, 0,1,0,0],
    'Sitar':         [1,0,1,0, 1,0,0,1, 0,1,0,0, 1,0,1,0],
    'Tabla':         [1,0,0,1, 0,1,0,0, 1,0,1,0, 0,1,0,1],
    'Oud':           [1,0,0,1, 0,0,1,0, 0,1,0,0, 1,0,0,1],
    'Darbuka':       [1,0,1,0, 1,0,0,1, 1,0,1,0, 0,1,0,0],
    'Castanets':     [0,0,1,0, 0,0,1,0, 1,0,0,1, 0,0,1,0],
    'Acid Lead':     [1,0,0,1, 0,1,0,1, 1,0,1,1, 0,1,0,1],
    'Psy-Bass':      [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
    'Tanpura':       [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
    'Ney':           [0,0,1,0, 1,0,0,0, 1,0,1,0, 0,0,1,0],
  };

  const BPM_MAP = {
    'Hip-Hop':80,'Pop':120,'Rock':130,'Jazz':110,'EDM':128,'R&B':85,'Country':105,'Classical':96,
    'Indian Classical':75, 'Goa Trance':145, 'Sitar Fusion':95, 'Middle Eastern':110, 'Flamenco-Trap':140
  };

  // Mood adjustments to patterns
  function moodAdjust(pattern, moodScores) {
    // High energy → add extra hi-hat hits
    // All adjustments are done on a copy
    const p = [...pattern];
    if ((moodScores.energy || 0) > 0.5) {
      // sprinkle some extra on bits
      [1,3,5,7,9,11,13,15].forEach(i => {
        if (!p[i] && Math.random() < 0.4) p[i] = 1;
      });
    }
    if ((moodScores.chill || 0) > 0.5) {
      // remove some hits to thin the pattern
      p.forEach((v, i) => { if (v && i % 2 !== 0 && Math.random() < 0.5) p[i] = 0; });
    }
    return p.map(v => !!v);
  }

  function generate(instruments, genre, moodScores) {
    const bpm = BPM_MAP[genre] || 120;
    const patterns = instruments.map(inst => {
      const base = PATTERNS[inst.name] || Array(16).fill(0).map((_, i) => i % 4 === 0 ? 1 : 0);
      const steps = moodAdjust(base, moodScores);
      return { name: inst.name, icon: inst.icon, steps };
    });
    return { patterns, bpm };
  }

  return { generate };
})();

// ============================================================
// 4. AUDIO ENGINE (Web Audio API)
// ============================================================
const AudioEngine = (() => {
  let ctx = null;
  let playing = false;
  let currentStep = 0;
  let schedulerTimer = null;
  let nextNoteTime = 0;
  const LOOKAHEAD = 0.1;   // seconds
  const SCHEDULE_INTERVAL = 50; // ms

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    return ctx;
  }

  // ---- Synthesizers ----
  function playKick(time, ac) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.frequency.setValueAtTime(150, time);
    o.frequency.exponentialRampToValueAtTime(0.01, time + 0.35);
    g.gain.setValueAtTime(0.8, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.35);
    o.start(time); o.stop(time + 0.35);
  }

  function playSnare(time, ac) {
    // noise
    const bufSize = ac.sampleRate * 0.2;
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ac.createBufferSource();
    noise.buffer = buf;
    const noiseGain = ac.createGain();
    noise.connect(noiseGain); noiseGain.connect(ac.destination);
    noiseGain.gain.setValueAtTime(0.5, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    noise.start(time); noise.stop(time + 0.2);
    // tone
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.frequency.setValueAtTime(200, time);
    g.gain.setValueAtTime(0.4, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.1);
    o.start(time); o.stop(time + 0.1);
  }

  function playHiHat(time, ac, open = false) {
    const bufSize = ac.sampleRate * (open ? 0.3 : 0.05);
    const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ac.createBufferSource();
    noise.buffer = buf;
    const filter = ac.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 8000;
    const g = ac.createGain();
    noise.connect(filter); filter.connect(g); g.connect(ac.destination);
    g.gain.setValueAtTime(0.4, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + (open ? 0.3 : 0.05));
    noise.start(time); noise.stop(time + (open ? 0.3 : 0.05));
  }

  function playClap(time, ac) {
    for (let i = 0; i < 3; i++) {
      const t = time + i * 0.008;
      const bufSize = ac.sampleRate * 0.05;
      const buf = ac.createBuffer(1, bufSize, ac.sampleRate);
      const data = buf.getChannelData(0);
      for (let j = 0; j < bufSize; j++) data[j] = Math.random() * 2 - 1;
      const src = ac.createBufferSource();
      src.buffer = buf;
      const f = ac.createBiquadFilter();
      f.type = 'bandpass'; f.frequency.value = 1200; f.Q.value = 0.5;
      const g = ac.createGain();
      src.connect(f); f.connect(g); g.connect(ac.destination);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.01, t + 0.05);
      src.start(t); src.stop(t + 0.05);
    }
  }

  function playBass(time, ac, freq = 60) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'triangle';
    o.connect(g); g.connect(ac.destination);
    o.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0.5, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.25);
    o.start(time); o.stop(time + 0.25);
  }

  function playSynth(time, ac, freq = 440) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sawtooth';
    const f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900;
    o.connect(f); f.connect(g); g.connect(ac.destination);
    o.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0.15, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.15);
    o.start(time); o.stop(time + 0.15);
  }

  function playPad(time, ac) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = 'sine';
    o.connect(g); g.connect(ac.destination);
    o.frequency.setValueAtTime(220, time);
    g.gain.setValueAtTime(0.08, time);
    g.gain.linearRampToValueAtTime(0.06, time + 0.3);
    g.gain.exponentialRampToValueAtTime(0.001, time + 0.5);
    o.start(time); o.stop(time + 0.5);
  }

  function playGeneric(time, ac, freq = 330) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.connect(g); g.connect(ac.destination);
    o.frequency.setValueAtTime(freq, time);
    g.gain.setValueAtTime(0.2, time);
    g.gain.exponentialRampToValueAtTime(0.01, time + 0.2);
    o.start(time); o.stop(time + 0.2);
  }

  // Route instrument name → synth
  function triggerInstrument(name, time, ac) {
    const n = name.toLowerCase();
    if (n.includes('kick'))            playKick(time, ac);
    else if (n.includes('snare')|| n.includes('brush')) playSnare(time, ac);
    else if (n.includes('open hi-hat')) playHiHat(time, ac, true);
    else if (n.includes('hi-hat'))     playHiHat(time, ac, false);
    else if (n.includes('clap') || n.includes('darbuka')) playClap(time, ac);
    else if (n.includes('ride') || n.includes('castanets')) playHiHat(time, ac, true);
    else if (n.includes('bass') || n.includes('cello') || n.includes('double') || n.includes('tabla')) playBass(time, ac, n.includes('808') ? 50 : 80);
    else if (n.includes('synth') || n.includes('lead') || n.includes('trumpet') || n.includes('flute') || n.includes('oboe') || n.includes('fiddle') || n.includes('sitar') || n.includes('oud') || n.includes('ney')) playSynth(time, ac, n.includes('sitar') ? 550 : 440);
    else if (n.includes('pad') || n.includes('strings') || n.includes('tanpura')) playPad(time, ac);
    else if (n.includes('piano') || n.includes('keys') || n.includes('guitar') || n.includes('acoustic')) playGeneric(time, ac, 262);
    else playGeneric(time, ac, 330);
  }

  let _patterns = [];
  let _bpm = 120;
  let _onStep = null;

  function start(patterns, bpm, onStep) {
    const ac = getCtx();
    if (ac.state === 'suspended') ac.resume();
    _patterns = patterns;
    _bpm = bpm;
    _onStep = onStep;
    playing = true;
    currentStep = 0;
    nextNoteTime = ac.currentTime;
    schedule();
  }

  function schedule() {
    if (!playing) return;
    const ac = getCtx();
    while (nextNoteTime < ac.currentTime + LOOKAHEAD) {
      // fire step
      const step = currentStep;
      _patterns.forEach(pat => {
        if (pat.steps[step]) triggerInstrument(pat.name, nextNoteTime, ac);
      });
      if (_onStep) _onStep(step);
      // advance
      const secondsPerBeat = 60 / _bpm;
      const secondsPerStep = secondsPerBeat / 4;
      nextNoteTime += secondsPerStep;
      currentStep = (currentStep + 1) % 16;
    }
    schedulerTimer = setTimeout(schedule, SCHEDULE_INTERVAL);
  }

  function stop() {
    playing = false;
    if (schedulerTimer) clearTimeout(schedulerTimer);
    schedulerTimer = null;
    currentStep = 0;
  }

  function isPlaying() { return playing; }

  return { start, stop, isPlaying };
})();

// ============================================================
// 5. UI CONTROLLER
// ============================================================
const UIController = (() => {
  let currentPatterns = [];
  let currentBpm = 120;
  let currentGenre = '';
  let currentInstruments = [];
  let currentMoodResult = null;

  // DOM refs
  const lyricsEl    = () => document.getElementById('lyrics-input');
  const moodPromptEl = () => document.getElementById('mood-input');
  const genreEl     = () => document.getElementById('genre-select');
  const analyzeBtn  = () => document.getElementById('analyze-btn');
  const resultsEl   = () => document.getElementById('results-section');
  const moodTagsEl  = () => document.getElementById('mood-tags');
  const instGridEl  = () => document.getElementById('instruments-grid');
  const seqWrapEl   = () => document.getElementById('sequencer-wrap');
  const bpmSlider   = () => document.getElementById('bpm-slider');
  const bpmVal      = () => document.getElementById('bpm-value');
  const playBtn     = () => document.getElementById('play-btn');
  const exportBtn   = () => document.getElementById('export-btn');
  const exportMidiBtn = () => document.getElementById('export-midi-btn');

  function showToast(msg) {
    const t = document.getElementById('toast');
    t.innerHTML = `<span class="tick">✓</span> ${msg}`;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
  }

  function renderMoodTags(tags) {
    moodTagsEl().innerHTML = tags.map(t =>
      `<span class="mood-tag ${t}">${t}</span>`
    ).join('');
  }

  function renderInstruments(instruments) {
    instGridEl().innerHTML = instruments.map((inst, i) => `
      <div class="inst-card" id="inst-card-${i}" title="${inst.desc}">
        <div class="inst-icon">${inst.icon}</div>
        <div class="inst-name">${inst.name}</div>
        <div class="inst-desc">${inst.desc}</div>
        <div class="inst-bar-wrap">
          <div class="inst-bar" id="inst-bar-${i}" style="width:0%"></div>
        </div>
        <div class="inst-score">${Math.round(inst.score * 100)}% match</div>
      </div>
    `).join('');

    // Animate bars
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        instruments.forEach((inst, i) => {
          const bar = document.getElementById(`inst-bar-${i}`);
          if (bar) bar.style.width = (inst.score * 100) + '%';
        });
      });
    });
  }

  function renderSequencer(patterns) {
    seqWrapEl().innerHTML = patterns.map((pat, pi) => `
      <div class="seq-row" id="seq-row-${pi}">
        <div class="seq-label">${pat.icon || ''} ${pat.name}</div>
        <div class="seq-steps beat-group" id="seq-steps-${pi}">
          ${pat.steps.map((on, si) => `
            <div class="step${on ? ' on' : ''}"
                 id="step-${pi}-${si}"
                 data-pat="${pi}" data-step="${si}"
                 role="button" aria-label="${pat.name} step ${si+1} ${on?'on':'off'}">
            </div>
          `).join('')}
        </div>
      </div>
    `).join('');

    // Attach click listeners
    document.querySelectorAll('.step').forEach(el => {
      el.addEventListener('click', () => {
        const pi = +el.dataset.pat;
        const si = +el.dataset.step;
        currentPatterns[pi].steps[si] = !currentPatterns[pi].steps[si];
        el.classList.toggle('on', currentPatterns[pi].steps[si]);
        el.setAttribute('aria-label', `${currentPatterns[pi].name} step ${si+1} ${currentPatterns[pi].steps[si]?'on':'off'}`);
      });
    });
  }

  let lastHighlightedStep = -1;
  function onStep(step) {
    // Clear previous highlight
    if (lastHighlightedStep >= 0) {
      document.querySelectorAll(`.step[data-step="${lastHighlightedStep}"]`).forEach(el => {
        el.classList.remove('current-beat');
      });
    }
    // Highlight current column
    document.querySelectorAll(`.step[data-step="${step}"]`).forEach(el => {
      el.classList.add('current-beat');
      if (el.classList.contains('on')) el.classList.add('playing');
      setTimeout(() => el.classList.remove('playing'), 80);
    });
    lastHighlightedStep = step;
  }

  function doAnalyze() {
    const lyrics = lyricsEl().value.trim();
    const moodInput = moodPromptEl().value.trim();
    const genre  = genreEl().value;

    if (!lyrics && !moodInput) { showToast('Please enter lyrics or a mood description'); return; }

    const combinedText = lyrics + ' ' + moodInput;
    const btn = analyzeBtn();
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Analyzing…';

    // Simulate slight async for animation
    setTimeout(() => {
      const moodResult = LyricsAnalyzer.analyze(combinedText);
      currentMoodResult = moodResult;
      currentGenre = genre;

      const instruments = InstrumentRecommender.recommend(genre, moodResult.scores);
      currentInstruments = instruments;

      const { patterns, bpm } = BeatPatternGenerator.generate(instruments, genre, moodResult.scores);
      currentPatterns = patterns;
      currentBpm = bpm;

      // Render
      renderMoodTags(moodResult.tags);
      renderInstruments(instruments);
      renderSequencer(patterns);

      // BPM
      bpmSlider().value = bpm;
      bpmVal().textContent = bpm;

      // Show results
      resultsEl().classList.remove('hidden');
      resultsEl().scrollIntoView({ behavior: 'smooth', block: 'start' });

      playBtn().disabled   = false;
      exportBtn().disabled = false;

      btn.disabled = false;
      btn.textContent = '✦ Analyze Lyrics';

      showToast('Beat generated from your lyrics!');
    }, 600);
  }

  function doPlay() {
    const btn = playBtn();
    if (AudioEngine.isPlaying()) {
      AudioEngine.stop();
      btn.innerHTML = '▶ Play Beat';
      btn.classList.remove('playing');
      // clear highlights
      document.querySelectorAll('.current-beat').forEach(el => el.classList.remove('current-beat'));
      lastHighlightedStep = -1;
    } else {
      AudioEngine.start(currentPatterns, currentBpm, onStep);
      btn.innerHTML = '■ Stop';
      btn.classList.add('playing');
    }
  }

  function doBpmChange() {
    const bpm = +bpmSlider().value;
    currentBpm = bpm;
    bpmVal().textContent = bpm;
    if (AudioEngine.isPlaying()) {
      // restart with new bpm
      AudioEngine.stop();
      setTimeout(() => {
        AudioEngine.start(currentPatterns, currentBpm, onStep);
      }, 50);
    }
  }

  function doExport() {
    const genre  = currentGenre || genreEl().value;
    const projName = `BeatPro_${genre}_${Date.now()}`;
    const exportData = currentPatterns.map(p => ({ name: p.name, steps: p.steps }));
    LMMSExport.downloadMMP(exportData, currentBpm, projName);
    showToast(`Exported "${projName}.mmp" — open it in LMMS!`);
  }

  function doExportMidi() {
    const genre  = currentGenre || genreEl().value;
    const projName = `BeatPro_${genre}_${Date.now()}`;
    const exportData = currentPatterns.map(p => ({ name: p.name, steps: p.steps }));
    MIDIExport.downloadMIDI(exportData, currentBpm, projName);
    showToast(`Exported "${projName}.mid" — use in any DAW!`);
  }

  function init() {
    document.getElementById('analyze-btn').addEventListener('click', doAnalyze);
    document.getElementById('play-btn').addEventListener('click', doPlay);
    document.getElementById('bpm-slider').addEventListener('input', doBpmChange);
    document.getElementById('export-btn').addEventListener('click', doExport);
    document.getElementById('export-midi-btn').addEventListener('click', doExportMidi);

    // Allow Enter in textarea only as newline (not submit)
    lyricsEl().addEventListener('keydown', e => {
      if (e.key === 'Enter' && e.ctrlKey) doAnalyze();
    });
  }

  return { init };
})();

// ── Bootstrap ──
document.addEventListener('DOMContentLoaded', UIController.init);
