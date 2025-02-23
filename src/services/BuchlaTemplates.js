// Musical templates inspired by Buchla Cookbook patterns
export const buchlaTemplates = {
  // Basic patterns
  basic: {
    melodic: [
      {
        // Simple ascending pattern
        notes: [48, 51, 55, 58],
        durations: [1, 1, 1, 1],
        velocities: [0.8, 0.7, 0.7, 0.8],
      },
      {
        // Buchla-style alternating intervals
        notes: [48, 55, 51, 58],
        durations: [1, 1, 1, 1],
        velocities: [0.8, 0.6, 0.7, 0.6],
      },
    ],
    rhythmic: [
      {
        // Classic Buchla pulse pattern
        gates: [1, 0, 1, 1, 0, 1, 0, 1],
        accents: [1, 0, 0.7, 0.8, 0, 0.6, 0, 0.7],
      },
    ],
  },

  // Emotional mappings
  emotional: {
    bright: {
      scale: [0, 2, 4, 7, 9], // Major pentatonic
      baseOctave: 5,
      rhythmDensity: 0.7,
      gateLength: 0.8,
    },
    dark: {
      scale: [0, 3, 5, 7, 10], // Minor pentatonic
      baseOctave: 4,
      rhythmDensity: 0.5,
      gateLength: 0.6,
    },
    calm: {
      scale: [0, 2, 4, 5, 7, 9, 11], // Major scale
      baseOctave: 4,
      rhythmDensity: 0.4,
      gateLength: 0.9,
    },
    energetic: {
      scale: [0, 2, 4, 7, 9, 12], // Major pentatonic with octave
      baseOctave: 5,
      rhythmDensity: 0.8,
      gateLength: 0.5,
    },
  },

  // Complex patterns
  complex: {
    melodic: [
      {
        // Source of Uncertainty inspired pattern
        notes: [48, 55, 51, 58, 53, 60, 56, 63],
        durations: [0.5, 1, 0.5, 1, 0.5, 1, 0.5, 1],
        velocities: [0.8, 0.6, 0.7, 0.6, 0.7, 0.6, 0.7, 0.8],
      },
    ],
    rhythmic: [
      {
        // Complex gate pattern with accents
        gates: [1, 1, 0, 1, 1, 0, 1, 1, 0, 1, 0, 1, 1, 0, 1, 1],
        accents: [
          1, 0.6, 0, 0.8, 0.7, 0, 0.9, 0.6, 0, 0.8, 0, 0.7, 0.8, 0, 0.9, 0.7,
        ],
      },
    ],
  },
};

// Mapping functions for text characteristics
export const textToTemplateMapping = {
  // Map text length to pattern complexity
  getComplexityFromText: (text) => {
    return Math.min(text.length / 10, 1); // 0-1 range
  },

  // Map character types to emotional characteristics
  getEmotionalCharacteristics: (text) => {
    const uppercase = text.match(/[A-Z]/g)?.length || 0;
    const punctuation = text.match(/[!?.,]/g)?.length || 0;
    const numbers = text.match(/[0-9]/g)?.length || 0;

    return {
      intensity: uppercase / text.length,
      articulation: punctuation / text.length,
      complexity: numbers / text.length,
    };
  },

  // Get musical parameters based on text
  getMusicalParameters: (text) => {
    const chars = text.split("");
    const avgCharCode =
      chars.reduce((sum, char) => sum + char.charCodeAt(0), 0) / chars.length;

    return {
      baseNote: 48 + (avgCharCode % 12), // C4 + offset
      scaleType: avgCharCode % 2 === 0 ? "bright" : "dark",
      rhythmDensity: chars.length % 2 === 0 ? 0.7 : 0.5,
    };
  },
};

// Helper functions for template manipulation
export const templateUtils = {
  // Combine multiple templates
  combineTemplates: (templates, weights) => {
    if (!templates.length || !weights.length) return null;

    // Normalize weights
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map((w) => w / totalWeight);

    // Initialize result structure
    const result = {
      notes: [],
      durations: [],
      velocities: [],
      gates: [],
      accents: [],
    };

    // Combine melodic elements
    templates.forEach((template, i) => {
      const weight = normalizedWeights[i];
      if (template.notes) {
        template.notes.forEach((note, j) => {
          result.notes[j] = (result.notes[j] || 0) + note * weight;
        });
      }
      if (template.durations) {
        template.durations.forEach((dur, j) => {
          result.durations[j] = (result.durations[j] || 0) + dur * weight;
        });
      }
      if (template.velocities) {
        template.velocities.forEach((vel, j) => {
          result.velocities[j] = (result.velocities[j] || 0) + vel * weight;
        });
      }
      if (template.gates) {
        template.gates.forEach((gate, j) => {
          result.gates[j] = (result.gates[j] || 0) + gate * weight;
        });
      }
      if (template.accents) {
        template.accents.forEach((accent, j) => {
          result.accents[j] = (result.accents[j] || 0) + accent * weight;
        });
      }
    });

    // Round notes to nearest MIDI note
    if (result.notes.length) {
      result.notes = result.notes.map((note) => Math.round(note));
    }

    return result;
  },

  // Modify template based on text characteristics
  modifyTemplate: (template, characteristics) => {
    const { intensity, articulation, complexity } = characteristics;

    const modified = { ...template };

    // Modify velocities based on intensity
    if (modified.velocities) {
      modified.velocities = modified.velocities.map((v) =>
        Math.min(1, Math.max(0, v * (1 + (intensity - 0.5))))
      );
    }

    // Modify durations based on articulation
    if (modified.durations) {
      modified.durations = modified.durations.map(
        (d) => d * (1 + (articulation - 0.5) * 0.5)
      );
    }

    // Add complexity through note variations
    if (modified.notes && complexity > 0.5) {
      modified.notes = modified.notes.map((note) => {
        const variation =
          Math.random() > 0.7 ? (Math.random() > 0.5 ? 1 : -1) : 0;
        return note + variation;
      });
    }

    return modified;
  },

  // Convert template to Magenta-compatible format
  toMagentaFormat: (template) => {
    const sequence = {
      notes: [],
      totalTime: 4.0,
      tempos: [{ time: 0, qpm: 120 }],
      timeSignatures: [{ time: 0, numerator: 4, denominator: 4 }],
    };

    let currentTime = 0;

    // Convert notes, durations, and velocities to Magenta note format
    if (template.notes) {
      template.notes.forEach((note, i) => {
        const duration = template.durations?.[i] || 0.25;
        const velocity = Math.round((template.velocities?.[i] || 0.8) * 127);

        sequence.notes.push({
          pitch: note,
          startTime: currentTime,
          endTime: currentTime + duration,
          velocity: velocity,
          program: 0,
          isDrum: false,
        });

        currentTime += duration;
      });
    }

    // Add gate and accent information as control changes
    if (template.gates) {
      template.gates.forEach((gate, i) => {
        if (gate > 0) {
          const accent = template.accents?.[i] || 1;
          sequence.controlChanges = sequence.controlChanges || [];
          sequence.controlChanges.push({
            time: i * 0.25,
            controlNumber: 64, // Hold pedal for gates
            value: gate * 127,
            program: 0,
          });
          sequence.controlChanges.push({
            time: i * 0.25,
            controlNumber: 11, // Expression for accents
            value: accent * 127,
            program: 0,
          });
        }
      });
    }

    return sequence;
  },
};
