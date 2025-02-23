import * as Tone from "tone";

export class MatrixMixer {
  constructor() {
    // Matrix mixer for spatial distribution (4 inputs x 4 outputs)
    this.inputs = Array(4)
      .fill()
      .map(() => new Tone.Gain(1));
    this.outputs = Array(4)
      .fill()
      .map(() => new Tone.Gain(1));

    // Create crosspoint gains (4x4 matrix)
    this.matrix = Array(4)
      .fill()
      .map(() =>
        Array(4)
          .fill()
          .map(() => new Tone.Gain(0))
      );

    // Initialize crosspoint connections
    this.inputs.forEach((input, i) => {
      this.matrix[i].forEach((crosspoint, j) => {
        input.connect(crosspoint);
        crosspoint.connect(this.outputs[j]);
      });
    });

    // Set default routing
    this.setDefaultRouting();
  }

  // Connect an input source
  connectInput(index, source) {
    if (index >= 0 && index < this.inputs.length && source) {
      source.connect(this.inputs[index]);
    }
  }

  // Set a crosspoint level (0-1)
  setCrosspoint(inputIdx, outputIdx, level) {
    if (
      inputIdx >= 0 &&
      inputIdx < 4 &&
      outputIdx >= 0 &&
      outputIdx < 4 &&
      this.matrix[inputIdx] &&
      this.matrix[inputIdx][outputIdx]
    ) {
      this.matrix[inputIdx][outputIdx].gain.value = Math.max(
        0,
        Math.min(1, level)
      );
    }
  }

  // Set default routing based on Buchla conventions
  setDefaultRouting() {
    // Main diagonal routing
    for (let i = 0; i < 4; i++) {
      this.setCrosspoint(i, i, 0.7);
    }

    // Spread for each source
    this.matrix.forEach((row, i) => {
      row.forEach((_, j) => {
        if (i !== j) {
          if (i === 0) this.setCrosspoint(i, j, 0.3); // Osc1 spread
          else if (i === 1) this.setCrosspoint(i, j, 0.2); // Osc2 spread
          else this.setCrosspoint(i, j, 0.1); // Other sources spread
        }
      });
    });
  }

  // Get input nodes for connection
  getInputs() {
    return this.inputs;
  }

  // Get output nodes for connection
  getOutputs() {
    return this.outputs;
  }

  // Clean up
  dispose() {
    [...this.inputs, ...this.outputs].forEach((node) => {
      if (node && typeof node.dispose === "function") {
        node.dispose();
      }
    });

    this.matrix.forEach((row) => {
      row.forEach((crosspoint) => {
        if (crosspoint && typeof crosspoint.dispose === "function") {
          crosspoint.dispose();
        }
      });
    });
  }
}
