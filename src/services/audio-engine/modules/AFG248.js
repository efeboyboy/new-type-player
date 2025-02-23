import * as Tone from "tone";

export class AFG248 {
  constructor() {
    this.steps = 16;
    this.playHeads = 2;
    this.channels = 4; // 2 CV + 2 trigger per playhead

    this.sequence = null;
    this.currentStep = new Array(this.playHeads).fill(0);

    // Create CV and trigger outputs
    this.cvOutputs = Array(this.playHeads * 2)
      .fill()
      .map(() => new Tone.Signal(0));
    this.triggerOutputs = Array(this.playHeads * 2)
      .fill()
      .map(() => new Tone.Signal(0));

    // External CV inputs
    this.externalInputs = Array(4)
      .fill()
      .map(() => new Tone.Signal(0));

    // Create step timing controls
    this.stepTiming = Array(16)
      .fill()
      .map(() => ({
        duration: 0.25, // Default to quarter note
        mode: "internal", // 'internal' or 'external'
        externalCV: 0,
      }));

    // Create voltage banks
    this.voltageBank = Array(4)
      .fill()
      .map(() => Array(16).fill(0));
  }

  setSequence(sequence) {
    this.sequence = sequence;

    // Map sequence to voltage banks
    if (sequence && sequence.notes) {
      sequence.notes.forEach((note, i) => {
        // Map pitch to voltage bank 0
        this.voltageBank[0][i] = note.pitch ? (note.pitch - 60) / 12 : 0; // Convert MIDI to V/oct

        // Map velocity to voltage bank 1
        this.voltageBank[1][i] = note.velocity / 127;

        // Map duration to voltage bank 2
        this.voltageBank[2][i] = note.duration || 0.25;

        // Map channel/routing to voltage bank 3
        this.voltageBank[3][i] = note.channel || 0;
      });
    }
  }

  setStepTiming(step, duration, mode = "internal") {
    if (step >= 0 && step < 16) {
      this.stepTiming[step] = {
        duration: Math.max(0.01, duration),
        mode,
        externalCV: 0,
      };
    }
  }

  setExternalCV(input, value) {
    if (input >= 0 && input < 4) {
      this.externalInputs[input].value = value;
    }
  }

  start(sequence) {
    if (sequence) this.setSequence(sequence);

    // Schedule playback for both playheads
    this.playHeads.forEach((_, i) => {
      this.schedulePlayhead(i);
    });

    // Start transport if needed
    if (Tone.Transport.state !== "started") {
      Tone.Transport.start();
    }
  }

  schedulePlayhead(headIndex) {
    const scheduleId = Tone.Transport.scheduleRepeat((time) => {
      this.advancePlayhead(headIndex, time);
    }, "8n"); // Default to 8th notes

    // Store schedule ID for cleanup
    this.scheduleIds = this.scheduleIds || [];
    this.scheduleIds[headIndex] = scheduleId;
  }

  advancePlayhead(headIndex, time) {
    const step = this.currentStep[headIndex];
    const timing = this.stepTiming[step];

    // Get voltages for this step
    const voltages = this.voltageBank.map((bank) => bank[step]);

    // Update CV outputs
    this.cvOutputs[headIndex * 2].setValueAtTime(voltages[0], time);
    this.cvOutputs[headIndex * 2 + 1].setValueAtTime(voltages[1], time);

    // Trigger pulses
    this.triggerOutputs[headIndex * 2].setValueAtTime(1, time);
    this.triggerOutputs[headIndex * 2].setValueAtTime(0, time + 0.01);

    // Handle external CV mode
    if (timing.mode === "external") {
      timing.externalCV =
        this.externalInputs[Math.floor(voltages[3] * 4)].value;
    }

    // Advance step
    this.currentStep[headIndex] = (step + 1) % this.steps;
  }

  stop() {
    // Clear all scheduled events
    if (this.scheduleIds) {
      this.scheduleIds.forEach((id) => {
        Tone.Transport.clear(id);
      });
    }
    this.scheduleIds = [];

    // Reset steps
    this.currentStep.fill(0);

    // Reset outputs
    [...this.cvOutputs, ...this.triggerOutputs].forEach((output) => {
      output.value = 0;
    });
  }

  dispose() {
    this.stop();

    // Dispose all Tone.js nodes
    [...this.cvOutputs, ...this.triggerOutputs, ...this.externalInputs].forEach(
      (node) => node.dispose()
    );
  }
}
