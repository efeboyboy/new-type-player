import * as Tone from "tone";

// Arrays to store active Tone.Sequence instances and synths
let activeSequences = [];
let channelSynths = [];

/**
 * Starts playback of the generated sequence using Tone.js.
 * @param {number[][]} sequence - A 2D array representing 4 channels of 16 steps (MIDI note values).
 */
function startPlayback(sequence) {
  if (!sequence || sequence.length === 0) return;

  // Stop any existing playback before starting new one
  stopPlayback();

  const channels = sequence.length;

  for (let i = 0; i < channels; i++) {
    // Create a synth for each channel and route it to the destination
    const synth = new Tone.Synth().toDestination();
    channelSynths.push(synth);

    // Create a Tone.Sequence for each channel; step interval is an 8th note
    const seq = new Tone.Sequence(
      (time, note) => {
        // Trigger notes: convert MIDI note to frequency
        synth.triggerAttackRelease(Tone.Frequency(note, "midi"), "8n", time);
      },
      sequence[i],
      "8n"
    );

    seq.loop = true;
    activeSequences.push(seq);
    seq.start(0);
  }

  // Start the Tone.Transport if it's not already running
  if (Tone.Transport.state !== "started") {
    Tone.Transport.start();
  }
}

/**
 * Stops playback by stopping the Tone.Transport and disposing all synths and sequences.
 */
function stopPlayback() {
  Tone.Transport.stop();
  activeSequences.forEach((seq) => seq.dispose());
  activeSequences = [];
  channelSynths.forEach((synth) => synth.dispose());
  channelSynths = [];
}

export default {
  startPlayback,
  stopPlayback,
};
