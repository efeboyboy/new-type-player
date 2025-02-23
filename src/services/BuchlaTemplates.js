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
  // Combine multiple templates with weights
  combineTemplates: (templates, weights) => {
    if (templates.length === 0) return null;
    if (templates.length === 1) return templates[0];

    // Normalize weights
    const totalWeight = weights.reduce((sum, w) => sum + w, 0);
    const normalizedWeights = weights.map((w) => w / totalWeight);

    // Initialize combined template
    const combined = {
      notes: [],
      durations: [],
      velocities: [],
      gates: [],
      accents: [],
    };

    // Combine each property
    templates.forEach((template, i) => {
      const weight = normalizedWeights[i];

      if (template.notes) {
        combined.notes.push(...template.notes);
        combined.durations.push(
          ...(template.durations || Array(template.notes.length).fill(1))
        );
        combined.velocities.push(
          ...(template.velocities || Array(template.notes.length).fill(0.8))
        );
      }

      if (template.gates) {
        combined.gates.push(...template.gates);
        combined.accents.push(
          ...(template.accents || Array(template.gates.length).fill(0.8))
        );
      }
    });

    return combined;
  },

  // Modify template based on emotional characteristics
  modifyTemplate: (template, emotionalChars) => {
    if (!template) return template;

    const modified = { ...template };

    // Adjust velocities based on intensity
    if (modified.velocities && emotionalChars.intensity !== undefined) {
      modified.velocities = modified.velocities.map((v) =>
        Math.min(1, Math.max(0.2, v * (1 + emotionalChars.intensity)))
      );
    }

    // Adjust durations based on articulation
    if (modified.durations && emotionalChars.articulation !== undefined) {
      modified.durations = modified.durations.map(
        (d) => d * (1 - emotionalChars.articulation * 0.5)
      );
    }

    // Add complexity through note variations
    if (modified.notes && emotionalChars.complexity !== undefined) {
      modified.notes = modified.notes.map((note) => {
        const variation = (Math.random() - 0.5) * emotionalChars.complexity * 4;
        return Math.round(note + variation);
      });
    }

    // Adjust gates and accents if present
    if (modified.gates && emotionalChars.intensity !== undefined) {
      modified.gates = modified.gates.map((g) =>
        Math.min(1, Math.max(0.2, g * (1 + emotionalChars.intensity * 0.5)))
      );
    }

    if (modified.accents && emotionalChars.articulation !== undefined) {
      modified.accents = modified.accents.map((a) =>
        Math.min(1, Math.max(0.2, a * (1 + emotionalChars.articulation)))
      );
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
      quantizationInfo: {
        stepsPerQuarter: 4,
        qpm: 120,
      },
    };

    let currentTime = 0;

    // Convert notes, durations, and velocities to Magenta note format
    if (template.notes) {
      template.notes.forEach((note, i) => {
        // Ensure duration is quantized to the nearest 16th note
        const rawDuration = template.durations?.[i] || 0.25;
        const quantizedDuration = Math.round(rawDuration * 4) / 4;
        const velocity = Math.round((template.velocities?.[i] || 0.8) * 127);

        sequence.notes.push({
          pitch: note,
          startTime: Math.round(currentTime * 4) / 4, // Quantize start time
          endTime: Math.round((currentTime + quantizedDuration) * 4) / 4,
          velocity: velocity,
          program: 0,
          isDrum: false,
          quantizedStartStep: Math.round(currentTime * 4),
          quantizedEndStep: Math.round((currentTime + quantizedDuration) * 4),
          quantizedVelocity: velocity,
        });

        currentTime += quantizedDuration;
      });
    }

    // Add gate and accent information as control changes
    if (template.gates) {
      template.gates.forEach((gate, i) => {
        if (gate > 0) {
          const accent = template.accents?.[i] || 1;
          sequence.controlChanges = sequence.controlChanges || [];
          sequence.controlChanges.push({
            time: Math.round(i * 0.25 * 4) / 4, // Quantize control change times
            controlNumber: 64, // Hold pedal for gates
            value: Math.round(gate * 127),
            quantizedStep: i * 1, // Each gate is one 16th note
          });
          sequence.controlChanges.push({
            time: Math.round(i * 0.25 * 4) / 4,
            controlNumber: 11, // Expression for accents
            value: Math.round(accent * 127),
            quantizedStep: i * 1,
          });
        }
      });
    }

    // Ensure total time is quantized to the nearest bar
    sequence.totalTime = Math.ceil(currentTime / 4) * 4;
    return sequence;
  },
};
