/**
 * Generates a 4-channel, 16-step sequence based on a text seed.
 * @param {string} seed - The user input seed from which to derive the sequence.
 * @returns {number[][]} A 2D array representing 4 channels of 16 steps each, with note values (0-127).
 */
function generateSequence(seed) {
  const channels = 4;
  const steps = 16;
  const sequence = [];

  // Calculate a simple seed value by summing char codes
  const charCodes = seed.split("").map((c) => c.charCodeAt(0));
  const total = charCodes.reduce((a, b) => a + b, 0);

  // Generate sequence for each channel
  for (let i = 0; i < channels; i++) {
    const channel = [];
    for (let j = 0; j < steps; j++) {
      // A basic algorithm: combine the total with channel and step indices, mod 128 to simulate MIDI note values
      const noteValue = (total + i * 100 + j * 10) % 128;
      channel.push(noteValue);
    }
    sequence.push(channel);
  }
  return sequence;
}

export { generateSequence };
