# Modular Web Synth Architecture

This document outlines the architectural principles and implementation plan for transforming our web synth application into a true modular system with flexible routing capabilities.

## Core Design Principles

1. **True Modular Architecture**: Every component has clearly defined inputs and outputs
2. **Flexible Routing**: Any module's output can be connected to any compatible module's input
3. **Centralized Control**: Unified playback system with consistent state management
4. **Standardized Interfaces**: Consistent API across all audio modules
5. **Independent Module Testing**: Each module can be tested in isolation
6. **Always-On Audio Processing**: Modules remain running but are controlled through gain nodes

## Audio Control Protocol

### Always-On Architecture

The synth uses an "always-on" approach to handle Web Audio API limitations:

1. **Always-Running Oscillators**:

   - All oscillator nodes are created and started immediately upon initialization
   - They remain running throughout the application lifecycle
   - This avoids the `InvalidStateError` that occurs when trying to restart stopped oscillators

2. **Gain-Based Control**:

   - Module activation is controlled via gain nodes rather than starting/stopping sound generators
   - When a module is "deactivated", its output gain is set to zero (muting it)
   - When "activated", the gain is restored to its configured value
   - This provides seamless toggling without errors

3. **Two-Tier Volume Control**:
   - **Module Level**: Each module has its own volume/gain control for relative levels
   - **Master Level**: A global master gain node controls the overall output volume
   - The transport play/pause button controls the master gain (on/off)

### Implementation Details

- **AudioEngine**: Maintains the master gain node and audio context
- **Module Architecture**:
  - All modules follow a pattern of creating their audio components during initialization
  - Modules expose gain controls instead of start/stop methods
  - Sound-generating nodes like oscillators are created once and never stopped

### Benefits

- **Technical Robustness**: Avoids common Web Audio API pitfalls and race conditions
- **Consistency**: Matches how real modular synthesizers operate (always powered, controlled by attenuation)
- **Efficiency**: Reduces overhead of repeatedly creating/disposing audio nodes
- **Low Latency**: Allows for instant response when activating/deactivating modules

## Implementation Roadmap

### Step 1: Centralize Playback Control

**Goal:**  
Establish a single centralized play/stop control that manages the entire audio output through master gain control.

**Implementation Plan:**

**Global Master Gain Control:**

- The master gain node in AudioEngine controls the overall output of the entire synthesizer
- When stopped, the master gain is set to 0 (silent)
- When playing, the master gain is set to the user-configured value

**Centralized Control in App.vue:**

- The main Play/Stop button in the application header is the sole controller of playback
- This button toggles the master gain between 0 and the user-defined level
- All modules remain running at all times but are only audible when the master gain allows

**Module Activation Controls:**

- Individual modules have their own activation controls, implemented as gain nodes
- These controls allow for per-module muting independent of the master playback state
- Module UI controls remain active even when the master output is muted

**Update Initialization Logic:**

- Audio initialization creates all necessary audio nodes but sets master gain to 0
- All oscillators and sound generators start immediately upon creation
- Audio processing runs constantly, with activation controlled entirely via gain nodes

### Step 2: Refactor Clock.vue for Modular Routing

**Goal:**  
Redesign `Clock.vue` to support flexible, modular routing and ensure it can trigger any connected module based on a unified clock signal.

**Implementation Plan:**

**Define Inputs and Outputs for the Clock:**

- **Inputs**: Centralized start/stop commands from `Header.vue`
- **Outputs**: Emit clock ticks to subscribers (sequencers, envelope generators)

**Emit Events with Precise Timing:**

- Emit a tick event with each beat using Web Audio API's AudioContext for accurate timing
- Include tempo and subdivisions in the payload for flexibility

**Modular Trigger System:**

- Allow components like envelope generators or sequencers to register as listeners for clock ticks
- Use event listeners or a reactive data store (Vuex) to handle modular routing

### Step 3: Build the Audio Engine Router

**Goal:**  
Create a modular routing system where every module can dynamically connect inputs and outputs (like a true modular synth).

**Implementation Plan:**

**Create a Routing Manager:**

- Service or store managing all connections between modules
- Handles patching outputs to inputs dynamically
- Maintains a connection state that can be saved/loaded

**Standardize Module Interfaces:**

- Every audio module (OSC, Noise, Matrix Mixer, LPG) should expose a standard API:
  ```typescript
  interface ModuleInterface {
    inputs: Record<string, AudioNode>;
    outputs: Record<string, AudioNode>;
    parameters: Record<string, AudioParam>;
    connect(
      outputName: string,
      targetModule: ModuleInterface,
      inputName: string
    ): void;
    disconnect(
      outputName: string,
      targetModule?: ModuleInterface,
      inputName?: string
    ): void;
    setParameter(name: string, value: number, timeOffset?: number): void;
  }
  ```

**Module Factory System:**

- Create a factory function for each module type
- Allow dynamic instantiation of modules based on configuration

**Visual Feedback (Optional for Future):**

- Implement a UI for visual routing, similar to modular synth software (e.g., VCV Rack)
- Allow drag-and-drop connections between modules

### Step 4: Testing & Debugging Workflow

**Goal:**  
Establish a systematic approach to testing and debugging the modular system.

**Implementation Plan:**

**Unit Tests for Modules:**

- Test each module in isolation to ensure its inputs, outputs, and parameters work correctly

**Connection Tests:**

- Verify that modules can be connected and disconnected correctly
- Test signal flow through multiple connected modules

**Integration Testing:**

- Clock Testing: Ensure the clock starts and stops correctly from the centralized control
- Basic Routing: Test simple signal flows (e.g., OSC → Mixer → LPG → Output)
- Envelope Testing: Verify envelopes trigger correctly on each clock tick or manual input
- Stress Test: Run multiple modules simultaneously to ensure timing accuracy and signal integrity

**Debugging Tools:**

- Implement signal monitoring at module inputs/outputs
- Add visualization of audio signals at critical points
- Create a connection inspector to view the current routing state

## Technical Implementation Details

### Module Base Class

Each module should inherit from a base class that implements the core modular functionality:

```typescript
abstract class ModuleBase implements ModuleInterface {
  protected context: AudioContext;
  public inputs: Record<string, AudioNode> = {};
  public outputs: Record<string, AudioNode> = {};
  public parameters: Record<string, AudioParam> = {};

  constructor(context: AudioContext) {
    this.context = context;
  }

  connect(
    outputName: string,
    targetModule: ModuleInterface,
    inputName: string
  ): void {
    const output = this.outputs[outputName];
    const input = targetModule.inputs[inputName];

    if (!output || !input) {
      console.error(`Cannot connect: ${outputName} -> ${inputName}`);
      return;
    }

    output.connect(input);
  }

  disconnect(
    outputName: string,
    targetModule?: ModuleInterface,
    inputName?: string
  ): void {
    const output = this.outputs[outputName];

    if (!output) {
      console.error(`Cannot disconnect: ${outputName} doesn't exist`);
      return;
    }

    if (targetModule && inputName) {
      const input = targetModule.inputs[inputName];
      if (input) {
        output.disconnect(input);
      }
    } else {
      output.disconnect();
    }
  }

  setParameter(name: string, value: number, timeOffset: number = 0): void {
    const param = this.parameters[name];

    if (!param) {
      console.error(`Parameter ${name} doesn't exist`);
      return;
    }

    if (timeOffset > 0) {
      param.setValueAtTime(value, this.context.currentTime + timeOffset);
    } else {
      param.value = value;
    }
  }

  abstract initialize(): void;
}
```

### Connection Management

The routing system will maintain a graph of all connections:

```typescript
interface Connection {
  sourceModule: string; // Module ID
  sourceOutput: string;
  targetModule: string; // Module ID
  targetInput: string;
}

class RoutingManager {
  private modules: Map<string, ModuleInterface> = new Map();
  private connections: Connection[] = [];

  registerModule(id: string, module: ModuleInterface): void {
    this.modules.set(id, module);
  }

  unregisterModule(id: string): void {
    // Disconnect all connections for this module
    this.connections = this.connections.filter((conn) => {
      if (conn.sourceModule === id || conn.targetModule === id) {
        this.disconnect(conn);
        return false;
      }
      return true;
    });

    this.modules.delete(id);
  }

  connect(connection: Connection): void {
    const source = this.modules.get(connection.sourceModule);
    const target = this.modules.get(connection.targetModule);

    if (!source || !target) {
      console.error("Source or target module not found");
      return;
    }

    source.connect(connection.sourceOutput, target, connection.targetInput);

    this.connections.push(connection);
  }

  disconnect(connection: Connection): void {
    const source = this.modules.get(connection.sourceModule);
    const target = this.modules.get(connection.targetModule);

    if (!source || !target) {
      console.error("Source or target module not found");
      return;
    }

    source.disconnect(connection.sourceOutput, target, connection.targetInput);
  }

  getConnections(): Connection[] {
    return [...this.connections];
  }

  // Save/load patch functionality
  exportPatch(): string {
    const patch = {
      modules: Array.from(this.modules.keys()),
      connections: this.connections,
    };

    return JSON.stringify(patch);
  }

  // Additional methods for patch management
}
```

## Future Enhancements

1. **Patch Memory**:

   - Save and recall routing configurations
   - Export/import patches as JSON

2. **Advanced Routing**:

   - Multi-channel audio support
   - Feedback paths (with safety limits)
   - Signal splitting and merging

3. **Module Extensions**:

   - Effects modules (reverb, delay, etc.)
   - Advanced sequencers
   - CV processor modules

4. **Performance Optimizations**:
   - Audio worklet nodes for custom DSP
   - Lazy initialization of unused modules
   - Runtime connection validation
