import audioEngine from "./services/AudioEngine";

async function testAudioEngine() {
  console.log("Starting Audio Engine Test...");

  // Initialize the audio engine
  await audioEngine.initialize();
  console.log("Audio Engine initialized");

  // Test the signal path
  const signalPathTestResult = await audioEngine.testSignalPath();
  console.log(
    "Signal Path Test Result:",
    signalPathTestResult ? "PASSED" : "FAILED"
  );

  // Test setting various parameters
  console.log("Testing parameter controls...");

  // Oscillator parameters
  audioEngine.setOscillatorParams(1, {
    frequency: 220,
    waveType: "sine",
    waveShape: 0.3,
  });
  audioEngine.setOscillatorParams(2, {
    frequency: 330,
    waveType: "triangle",
    waveShape: 0.5,
  });
  audioEngine.setOscillatorParams(3, {
    frequency: 440,
    waveType: "sawtooth",
    waveShape: 0.7,
  });

  // Envelope parameters
  audioEngine.setEnvelope(0, { rise: 0.01, fall: 0.2, level: 0.8 });
  audioEngine.setEnvelope(1, { rise: 0.05, fall: 0.5, level: 0.7 });

  // Matrix mixer settings
  for (let i = 0; i < 4; i++) {
    for (let j = 0; j < 4; j++) {
      // Set crosspoints with varied values
      const level = i === j ? 0.8 : (i + j) % 2 === 0 ? 0.2 : 0;
      audioEngine.setMixerPoint(i, j, level);
    }
  }

  // Let clock run for 5 seconds
  console.log("Running clock for 5 seconds...");
  setTimeout(() => {
    // Stop the clock and clean up
    audioEngine.stopClock();
    audioEngine.stopPlayback();
    console.log("Test complete. Audio Engine stopped.");
  }, 5000);
}

// Run the test
testAudioEngine().catch((error) => {
  console.error("Audio Engine Test failed:", error);
});

export default testAudioEngine;
