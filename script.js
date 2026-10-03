const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

// Settings & Toggles
let isCameraActive = false;
let isVideoBgActive = false;
let isThemeBgActive = false;
let mediaStream = null;
let isClubMode = false;
const videoElement = document.getElementById('webcam-bg');
const themeElement = document.getElementById('theme-bg');

// Pexels API Key for free high-quality video loops
const PEXELS_API_KEY = '563492ad6f91700001000001889c3799637c4146a89c922a106e232b';

// Suppress expected polyphony warnings so they don't spam the console
const originalWarn = console.warn;
console.warn = function(...args) {
  if (typeof args[0] === 'string' && args[0].includes('Max polyphony exceeded')) return;
  originalWarn.apply(console, args);
};

let width, height, cx, cy;
let radius;

function resize() {
  width = canvas.width = window.innerWidth;
  height = canvas.height = window.innerHeight;
  cx = width / 2;
  cy = height / 2;
  // Make the circle a bit smaller so it fits cleanly
  radius = Math.min(width, height) * 0.35;
}
window.addEventListener('resize', resize);
resize();

// Map standard 88 piano keys (MIDI 21 to 108) onto the circle
const minNote = 21;
const totalKeys = 88;

const activeNotes = new Map();
const particles = [];

// Clean Particle Physics
class Particle {
  constructor(x, y, angle, color, velocity) {
    this.x = x;
    this.y = y;
    this.angle = angle;
    this.color = color;
    this.velocity = velocity;
    this.life = 1.0;
    this.decay = 0.01 + Math.random() * 0.02;
    this.size = 1 + Math.random() * 1.5;
    this.vx = Math.cos(this.angle) * this.velocity;
    this.vy = Math.sin(this.angle) * this.velocity;
  }
  
  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.94; // Smooth friction
    this.vy *= 0.94;
    this.life -= this.decay;
  }
  
  draw(ctx) {
    if (this.life <= 0) return;
    ctx.globalAlpha = this.life;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
  }
}

// Professional Tone.js Setup
let synth = null;
let currentMidi = null;
let isPlaying = false;
let animationId;

async function initAudio() {
  if (synth) return;
  try {
    await Tone.start();
    
    // A richer, electric-piano style FM synth for a deeper, more professional sound
    synth = new Tone.PolySynth(Tone.FMSynth, {
      maxPolyphony: 256,
      harmonicity: 2.5,
      modulationIndex: 5,
      oscillator: {
        type: "sine"
      },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.2,
        release: 0.5
      },
      modulation: {
        type: "square"
      },
      modulationEnvelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.1,
        release: 0.5
      }
    });

    // High-end FX Chain with added Stereo Delay and massive Reverb
    const filter = new Tone.Filter(4500, "lowpass").toDestination();
    const delay = new Tone.PingPongDelay("8n", 0.3).connect(filter);
    delay.wet.value = 0.25; // Adds a nice bouncing echo
    
    const chorus = new Tone.Chorus(4, 2.5, 0.5).connect(delay);
    const reverb = new Tone.Reverb({ decay: 4.5, preDelay: 0.1, wet: 0.45 }).connect(chorus);
    
    // Master Limiter to prevent harsh distortion
    const limiter = new Tone.Limiter(-2).connect(reverb);
    
    synth.connect(limiter);
    synth.volume.value = -4; 
    
    console.log("Pro Audio Engine Ready");
  } catch (e) {
    console.error("Audio Init Error:", e);
  }
}

// Clean, muted color palette
function getNoteColor(noteInfo) {
  const hue = (noteInfo.midi % 12) * 30;
  return `hsl(${hue}, 70%, 65%)`;
}

document.getElementById('test-audio-btn').addEventListener('click', async () => {
  await initAudio();
  if (synth) {
    const now = Tone.now();
    synth.triggerAttackRelease(["C4", "E4", "G4", "C5"], "1n", now);
    document.getElementById('status').innerText = "Playing a test chord…";
    setTimeout(() => {
      const el = document.getElementById('status');
      if (el.innerText.startsWith('Playing a test')) el.innerText = currentMidi ? "Ready." : "No file loaded.";
    }, 2000);
  }
});

// Play MIDI file safely
async function playMidi(midi) {
  await initAudio();
  Tone.Transport.stop();
  Tone.Transport.cancel();
  activeNotes.clear();
  particles.length = 0;
  
  const now = Tone.now() + 0.5;
  
  // Play all tracks but filter out overly short notes that cause clutter
  midi.tracks.forEach((track) => {
    track.notes.forEach(note => {
      // Ignore extremely quiet or short noise notes that glitch the engine
      if (note.duration < 0.08 || note.velocity < 0.15) return;
      
      Tone.Transport.schedule((time) => {
        const vel = Math.min(Math.max(note.velocity, 0.4), 1.0);
        
        // Play normal melodic note
        synth.triggerAttackRelease(note.name, note.duration, time, vel);
        
        const color = getNoteColor(note);
        activeNotes.set(note.midi, { 
          color: color, 
          velocity: vel,
          startTime: performance.now(),
          duration: note.duration * 1000
        });
        
        spawnParticles(note.midi, color, vel);
      }, note.time);
    });
  });
  
  Tone.Transport.start(now);
  isPlaying = true;
  document.body.classList.add('playing');
  document.getElementById('status').innerText = 'Playing ' + currentName;
}

function stopMidi() {
  Tone.Transport.stop();
  Tone.Transport.cancel();
  if (synth) synth.releaseAll();
  activeNotes.clear();
  particles.length = 0;
  isPlaying = false;
  document.body.classList.remove('playing');
  document.getElementById('status').innerText = 'Stopped.';
}

function spawnParticles(midiNote, color, velocity) {
  // Safe indexing
  let index = midiNote - minNote;
  if (index < 0) index = 0;
  if (index >= totalKeys) index = totalKeys - 1;
  
  const angle = (index / totalKeys) * Math.PI * 2 - Math.PI / 2;
  const x = cx + Math.cos(angle) * radius;
  const y = cy + Math.sin(angle) * radius;
  
  const numParticles = Math.floor(velocity * 8) + 2; // Fewer, cleaner particles
  
  for(let i=0; i<numParticles; i++) {
    const spread = (Math.random() - 0.5) * 0.8;
    particles.push(new Particle(x, y, angle + spread + Math.PI, color, velocity * (2 + Math.random() * 4)));
  }
}

// UI Setup
document.getElementById('midi-upload').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  
  const statusEl = document.getElementById('status');
  statusEl.innerText = 'Reading file…';
  document.getElementById('controls').style.display = 'none';

  // Clear any existing Theme background when a new file is uploaded
  if (isThemeBgActive) {
    themeElement.src = '';
    themeElement.classList.remove('active');
    isThemeBgActive = false;
  }
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      if (typeof Midi === 'undefined') throw new Error('MIDI library failed to load.');
      currentMidi = new Midi(e.target.result);
      currentName = file.name;
      isDemo = false;
      statusEl.innerText = `Loaded ${file.name}`;
      document.getElementById('controls').style.display = 'flex';
    } catch (err) {
      console.warn(err);
      statusEl.innerText = 'Could not read that file. Is it a .mid file?';
    }
  };
  reader.readAsArrayBuffer(file);
});

// Built-in demo so the page can be tried without a file:
// the opening bars of Bach's Prelude in C major (BWV 846).
let currentName = '';
let isDemo = false;
const DEMO_BARS = [
  [60, 64, 67, 72, 76], [60, 62, 69, 74, 77], [59, 62, 67, 74, 77], [60, 64, 67, 72, 76],
  [60, 64, 69, 76, 81], [60, 62, 66, 69, 74], [59, 62, 67, 74, 79], [59, 60, 64, 67, 72],
  [57, 60, 64, 67, 72], [50, 57, 62, 66, 72], [55, 59, 62, 67, 71], [48, 60, 64, 67, 72]
];
function buildDemo() {
  const midi = new Midi();
  const track = midi.addTrack();
  const step = 0.2;
  DEMO_BARS.forEach((bar, b) => {
    for (let half = 0; half < 2; half++) {
      [0, 1, 2, 3, 4, 2, 3, 4].forEach((n, i) => {
        const held = i < 2;
        track.addNote({
          midi: bar[n],
          time: (b * 16 + half * 8 + i) * step,
          duration: held ? step * (8 - i) : step * 1.5,
          velocity: held ? 0.75 : 0.6
        });
      });
    }
  });
  track.addNote({ midi: 48, time: DEMO_BARS.length * 16 * step, duration: 2.5, velocity: 0.7 });
  return midi;
}
document.getElementById('demo-btn').addEventListener('click', () => {
  if (typeof Midi === 'undefined') {
    document.getElementById('status').innerText = 'The MIDI library did not load. Check your connection and reload.';
    return;
  }
  currentMidi = buildDemo();
  currentName = 'Prelude in C (demo)';
  isDemo = true;
  document.getElementById('controls').style.display = 'flex';
  playMidi(currentMidi);
});

document.getElementById('play-btn').addEventListener('click', async () => { 
  if (currentMidi) {
    // Auto-fetch Theme loop based on file name if no background is set
    if (!isDemo && !isVideoBgActive && !isCameraActive && !isThemeBgActive) {
      const fileName = currentName;
      const themeName = fileName.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ").trim();
      
      console.log(`Searching theme background for: ${themeName}`);
      
      try {
        const response = await fetch(`https://api.pexels.com/videos/search?query=${encodeURIComponent(themeName + " abstract")}&per_page=1`, {
          headers: { Authorization: PEXELS_API_KEY }
        });
        const data = await response.json();
        
        if (data.videos && data.videos.length > 0) {
          const videoUrl = data.videos[0].video_files.find(f => f.quality === 'hd' || f.quality === 'sd').link;
          themeElement.src = videoUrl;
          themeElement.classList.add('active');
          isThemeBgActive = true;
        } else {
          // Fallback to generic abstract loop if specific theme not found
          const fallbackResponse = await fetch(`https://api.pexels.com/videos/search?query=abstract loop&per_page=1`, {
            headers: { Authorization: PEXELS_API_KEY }
          });
          const fallbackData = await fallbackResponse.json();
          if (fallbackData.videos && fallbackData.videos.length > 0) {
            themeElement.src = fallbackData.videos[0].video_files[0].link;
            themeElement.classList.add('active');
            isThemeBgActive = true;
          }
        }
      } catch (err) {
        console.error("Theme fetch error:", err);
      }
    }
    playMidi(currentMidi); 
  }
});

document.getElementById('pause-btn').addEventListener('click', () => {
  Tone.Transport.pause();
  if (synth) synth.releaseAll();
  isPlaying = false;
  document.getElementById('status').innerText = 'Paused.';
  document.body.classList.remove('playing');
});
document.getElementById('stop-btn').addEventListener('click', stopMidi);

// Video Upload Logic
document.getElementById('bg-video-upload').addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const url = URL.createObjectURL(file);
  
  if (isCameraActive) {
    if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
    document.getElementById('camera-btn').classList.remove('active');
    isCameraActive = false;
  }
  
  if (isThemeBgActive) {
    themeElement.src = '';
    themeElement.classList.remove('active');
    isThemeBgActive = false;
  }

  videoElement.srcObject = null;
  videoElement.src = url;
  videoElement.loop = true;
  videoElement.muted = true;
  videoElement.play();
  
  videoElement.classList.add('active');
  videoElement.style.transform = 'scaleX(1)'; // Don't mirror uploaded videos
  
  document.getElementById('video-upload-btn').classList.add('active');
  isVideoBgActive = true;
});

// Camera Toggle
document.getElementById('camera-btn').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  if (isCameraActive) {
    if (mediaStream) mediaStream.getTracks().forEach(track => track.stop());
    videoElement.srcObject = null;
    videoElement.classList.remove('active');
    btn.classList.remove('active');
    isCameraActive = false;
  } else {
    try {
      if (isVideoBgActive) {
         videoElement.src = '';
         document.getElementById('video-upload-btn').classList.remove('active');
         isVideoBgActive = false;
      }
      if (isThemeBgActive) {
         themeElement.src = '';
         themeElement.classList.remove('active');
         isThemeBgActive = false;
      }
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoElement.srcObject = mediaStream;
      videoElement.classList.add('active');
      videoElement.style.transform = 'scaleX(-1)'; // Mirror camera
      btn.classList.add('active');
      isCameraActive = true;
    } catch (err) {
      console.error("Webcam error:", err);
      document.getElementById('status').innerText = "Could not open the camera. Check the browser permission.";
    }
  }
});

// Club Mode Toggle
document.getElementById('club-btn').addEventListener('click', (e) => {
  const btn = e.currentTarget;
  isClubMode = !isClubMode;
  if (isClubMode) {
    document.body.classList.add('club-mode');
    btn.classList.add('active');
  } else {
    document.body.classList.remove('club-mode');
    btn.classList.remove('active');
  }
});

// Visual Effect Select
document.getElementById('effect-select').addEventListener('change', (e) => {
  const effect = e.target.value;
  document.body.classList.remove('effect-carnival', 'effect-trippy', 'effect-matrix');
  if (effect !== 'none') {
    document.body.classList.add(`effect-${effect}`);
  }
});

// Master Animation Loop
function animate() {
  animationId = requestAnimationFrame(animate);
  
  // Clean background clearing without motion blur artifacting
  ctx.globalCompositeOperation = 'source-over';
  // If camera, video, or theme is active, clear with a mostly transparent black so the video shows through
  if (isCameraActive || isVideoBgActive || isThemeBgActive) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(9, 9, 11, 0.3)'; // Even more transparent (0.3 instead of 0.4)
    ctx.fillRect(0, 0, width, height);
  } else {
    // Solid dark background if no camera/video
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);
  }
  
  ctx.globalCompositeOperation = 'lighter';
  
  // Draw base circle and tunnel illusion
  ctx.globalCompositeOperation = 'source-over';
  
  // Tunnel illusion
  const numTunnelRings = 15;
  for (let i = 0; i < numTunnelRings; i++) {
    const ringProgress = i / numTunnelRings;
    const ringRadius = radius * (1 - ringProgress);
    // Rings closer to center are darker/more transparent
    const ringOpacity = 0.05 * (1 - ringProgress);
    
    ctx.beginPath();
    ctx.strokeStyle = `rgba(255, 255, 255, ${ringOpacity})`;
    ctx.lineWidth = 1;
    ctx.arc(cx, cy, ringRadius, 0, Math.PI * 2);
    ctx.stroke();
  }
  
  // Base outermost circle
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  ctx.lineWidth = 1.5;
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalCompositeOperation = 'lighter';
  const now = performance.now();
  
  // Draw nodes and clean inward lines
  for (let i = 0; i < totalKeys; i++) {
    const angle = (i / totalKeys) * Math.PI * 2 - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    
    let keyActive = false;
    let noteColor = 'rgba(255, 255, 255, 0.1)';
    let energy = 0;
    
    const actualMidiNote = i + minNote;
    if (activeNotes.has(actualMidiNote)) {
      const currentNoteData = activeNotes.get(actualMidiNote);
      const elapsed = now - currentNoteData.startTime;
      if (elapsed < currentNoteData.duration + 500) { 
        keyActive = true;
        noteColor = currentNoteData.color;
        energy = Math.max(0, 1 - (elapsed / (currentNoteData.duration + 500)));
      } else {
        activeNotes.delete(actualMidiNote);
      }
    }
    
    // Draw Node
    ctx.beginPath();
    const dotSize = keyActive ? 2 + (energy * 3) : 1;
    ctx.arc(x, y, dotSize, 0, Math.PI * 2);
    ctx.fillStyle = keyActive ? noteColor : 'rgba(255, 255, 255, 0.1)';
    ctx.fill();
    
    // Clean, direct line to center instead of messy curves
    if (keyActive) {
      ctx.beginPath();
      const grad = ctx.createLinearGradient(x, y, cx, cy);
      grad.addColorStop(0, noteColor);
      grad.addColorStop(1, 'rgba(0,0,0,0)');
      
      ctx.strokeStyle = grad;
      ctx.lineWidth = 1;
      ctx.globalAlpha = energy * 0.8;
      
      ctx.moveTo(x, y);
      ctx.lineTo(cx, cy);
      ctx.stroke();
      ctx.globalAlpha = 1.0;
    }
  }
  
  // Draw Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    let p = particles[i];
    p.update();
    p.draw(ctx);
    if (p.life <= 0) particles.splice(i, 1);
  }
}

animate();
