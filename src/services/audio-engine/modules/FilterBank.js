import * as Tone from "tone";

export class FilterBank {
  constructor(modelNumber = 291) {
    this.modelNumber = modelNumber;

    // Create input stage
    this.input = new Tone.Gain(1);
    this.output = new Tone.Gain(1);

    // Create filter bank (2 filters for 291, 6 filters for 295)
    this.filters = Array(modelNumber === 291 ? 2 : 6)
      .fill()
      .map(() => ({
        filter: new Tone.Filter({
          type: "bandpass",
          frequency: 1000,
          Q: 2,
        }),
        gain: new Tone.Gain(1),
        envelope: new Tone.Gain(0),
      }));

    // Initialize connections
    this.initializeConnections();

    // Set default frequencies based on model
    this.setDefaultFrequencies();
  }

  initializeConnections() {
    this.filters.forEach(({ filter, gain, envelope }) => {
      // Audio path
      this.input.connect(filter);
      filter.connect(gain);
      gain.connect(this.output);

      // Envelope control path
      envelope.connect(filter.frequency);
      envelope.connect(gain.gain);
    });
  }

  setDefaultFrequencies() {
    if (this.modelNumber === 291) {
      // Dual bandpass frequencies
      this.filters[0].filter.frequency.value = 100;
      this.filters[1].filter.frequency.value = 1000;
    } else {
      // 295 model frequencies (logarithmically spaced)
      const baseFreq = 100;
      this.filters.forEach((filterObj, i) => {
        filterObj.filter.frequency.value = baseFreq * Math.pow(2, i);
      });
    }
  }

  connectEnvelope(index, envelopeNode) {
    if (index >= 0 && index < this.filters.length) {
      try {
        const filterObj = this.filters[index];

        // Scale envelope for frequency modulation
        const freqScaler = new Tone.Multiply(1000);
        envelopeNode.connect(freqScaler);
        freqScaler.connect(filterObj.filter.frequency);

        // Direct connection for amplitude modulation
        envelopeNode.connect(filterObj.gain.gain);
      } catch (error) {
        console.warn(`Error connecting envelope to filter ${index}:`, error);
      }
    }
  }

  setFilterParams(index, params) {
    if (index >= 0 && index < this.filters.length) {
      const filterObj = this.filters[index];

      try {
        if (params.frequency !== undefined) {
          filterObj.filter.frequency.value = Math.max(
            20,
            Math.min(20000, params.frequency)
          );
        }

        if (params.Q !== undefined) {
          filterObj.filter.Q.value = Math.max(0.1, Math.min(100, params.Q));
        }

        if (params.gain !== undefined) {
          filterObj.gain.gain.value = Math.max(0, Math.min(4, params.gain));
        }
      } catch (error) {
        console.warn(
          `Error setting filter parameters for filter ${index}:`,
          error
        );
      }
    }
  }

  dispose() {
    this.input.dispose();
    this.output.dispose();

    this.filters.forEach(({ filter, gain, envelope }) => {
      filter.dispose();
      gain.dispose();
      envelope.dispose();
    });
  }
}
