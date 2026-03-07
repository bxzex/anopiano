# 2050 Piano 🎹

A futuristic, highly-visual web application that allows you to upload and play any MIDI file with a mathematical, glowing, cyberpunk-inspired circle interface.

![2050 Piano Visualization Concept](https://github.com/bxzex/2050piano)

## Features

- **MIDI Playback:** Upload any `.mid` or `.midi` file and the app will parse and play it in real-time.
- **Cinematic Audio Engine:** Powered by Tone.js, featuring a lush, multi-oscillator synthesizer with high-end FX chains (Reverb, Chorus, Filter, Limiter) for a massive, spacey soundstage. Handles up to 256 voices of polyphony to support complex, dense MIDI files.
- **Futuristic Visualization:** 
  - All 128 MIDI notes map seamlessly around a clean, mathematical ring.
  - Active notes fire glowing laser gradients to the core.
  - Advanced particle physics with gravity and drag simulate energy bursts.
- **Webcam Background (AR):** Toggle your camera to create an augmented reality vibe, placing the 2050 Piano floating directly in your room.
- **Minimalist Professional UI:** A sleek, glass-morphic UI that cleanly fades out while playing so you can focus entirely on the music and visuals.

## How to Run

1. Clone the repository:
   ```bash
   git clone https://github.com/bxzex/2050piano.git
   ```
2. Navigate to the directory:
   ```bash
   cd 2050piano
   ```
3. Start a local server (e.g., using Python):
   ```bash
   python3 -m http.server 8080
   ```
4. Open your browser and navigate to: `http://localhost:8080`

## Technologies Used

- **HTML5 Canvas:** For high-performance graphics, glowing effects (additive blending), and particle rendering.
- **Vanilla JavaScript:** Zero framework dependencies for a lightweight core.
- **Tone.js:** For robust audio synthesis, scheduling, and effect routing.
- **@tonejs/midi:** For parsing uploaded MIDI files into playable JSON objects.

## Developed By

**Brian Ochoa (BXZEX)**

- [GitHub](https://github.com/bxzex)
- [LinkedIn](https://linkedin.com/in/bxzex/)
- [Instagram](https://instagram.com/bxzex)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
