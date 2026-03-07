const canvas = document.getElementById('visualizer');
const ctx = canvas.getContext('2d');

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

// Map ALL MIDI notes (0 to 127) onto the circle safely
const minNote = 0;
const totalKeys = 128;

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
    
    // A much cleaner, more stable synth setup that won't drop notes easily
    synth = new Tone.PolySynth(Tone.Synth, {
      maxPolyphony: 256, // Huge polyphony to handle complex MIDIs safely
      oscillator: {
        type: "triangle" // Smoother, less harsh sound
      },
      envelope: {
        attack: 0.01,
        decay: 0.2,
        sustain: 0.1,
        release: 0.8
      }
    });

    // High-end FX Chain that won't clip
    const filter = new Tone.Filter(4000, "lowpass").toDestination();
    const chorus = new Tone.Chorus(4, 2.5, 0.5).connect(filter);
    const reverb = new Tone.Reverb({ decay: 3, preDelay: 0.05, wet: 0.3 }).connect(chorus);
    
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
    document.getElementById('status').innerText = "Audio test playing...";
    setTimeout(() => {
      document.getElementById('status').innerText = currentMidi ? "Ready." : "Waiting for file...";
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
      if (note.duration < 0.05 || note.velocity < 0.1) return;
      
      Tone.Transport.schedule((time) => {
        const vel = Math.min(Math.max(note.velocity, 0.4), 1.0);
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
  document.getElementById('status').innerText = 'Playing...';
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
  let index = midiNote;
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
  statusEl.innerText = 'Parsing...';
  document.getElementById('controls').style.display = 'none';
  
  const reader = new FileReader();
  reader.onload = async function(e) {
    try {
      if (typeof Midi === 'undefined') throw new Error('MIDI library failed to load.');
      currentMidi = new Midi(e.target.result);
      statusEl.innerText = `Loaded: ${file.name}`;
      document.getElementById('controls').style.display = 'block';
    } catch (err) {
      console.error(err);
      statusEl.innerText = 'Error parsing: ' + err.message;
    }
  };
  reader.readAsArrayBuffer(file);
});

document.getElementById('play-btn').addEventListener('click', () => { if (currentMidi) playMidi(currentMidi); });
document.getElementById('pause-btn').addEventListener('click', () => {
  Tone.Transport.pause();
  if (synth) synth.releaseAll();
  isPlaying = false;
  document.getElementById('status').innerText = 'Paused.';
  document.body.classList.remove('playing');
});
document.getElementById('stop-btn').addEventListener('click', stopMidi);

// Settings & Toggles
let isCameraActive = false;
let mediaStream = null;
let isClubMode = false;
const videoElement = document.getElementById('webcam-bg');

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
      mediaStream = await navigator.mediaDevices.getUserMedia({ video: true });
      videoElement.srcObject = mediaStream;
      videoElement.classList.add('active');
      btn.classList.add('active');
      isCameraActive = true;
    } catch (err) {
      console.error("Webcam error:", err);
      alert("Could not access camera.");
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

// Master Animation Loop
function animate() {
  animationId = requestAnimationFrame(animate);
  
  // Clean background clearing without motion blur artifacting
  ctx.globalCompositeOperation = 'source-over';
  // If camera is active, clear with a mostly transparent black so the video shows through
  if (isCameraActive) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = 'rgba(9, 9, 11, 0.4)';
    ctx.fillRect(0, 0, width, height);
  } else {
    // Solid dark background if no camera
    ctx.fillStyle = '#09090b';
    ctx.fillRect(0, 0, width, height);
  }
  
  ctx.globalCompositeOperation = 'lighter';
  
  // Draw base circle
  ctx.globalCompositeOperation = 'source-over';
  ctx.beginPath();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.lineWidth = 1;
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
    
    if (activeNotes.has(i)) {
      const currentNoteData = activeNotes.get(i);
      const elapsed = now - currentNoteData.startTime;
      if (elapsed < currentNoteData.duration + 500) { 
        keyActive = true;
        noteColor = currentNoteData.color;
        energy = Math.max(0, 1 - (elapsed / (currentNoteData.duration + 500)));
      } else {
        activeNotes.delete(i);
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
