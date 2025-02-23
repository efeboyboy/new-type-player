# Rack Construction Transcript – Suzanne Chiani's Buchla Cookbook Patch

This document presents the full script excerpts from the video that focus exclusively on rack construction within VCV Rack. It details the process of building a fixed rack—from sound generation and signal routing to modulation and sequencing—as described by Suzanne Chiani.

---

## 1. Fixed Rack Setup and Overview

> "Using the free software VCV Rack was a natural choice for an educative project. As of now, there is no official Buchla module in VCV Rack, though some come close. Most of the time, we will patch together a few basic building blocks to make our own Buchla system. Now, let's have a look at what is to come: first, we will build and patch a fixed rack inspired by Mrs. Cheney's system; then we will go through each of the techniques she described in the cookbook—the rhythmic relief, the vertical sequencer, the string patch, and the keyboard rotation."

---

## 2. Sound Generation (Sun Path)

### 2.1 Oscillator Section & Wave Shaping

> "The sun path—usually, Buchla is synonymous with complex oscillators, wave folding, frequency modulation, and super fast low pass gates—will be kept simple in Mrs. Chiani's system, which is aiming for tunnel music. The main sound sources come from the dual oscillator section. As you see, it is a simple oscillator with a CV-controlled wave shaper that turns a sine wave into a ramp or a square wave. We will use a module like Blick from Volt, which has a built-in wave shaper. We should adjust the wave shape modulation to taste and ensure proper frequency input to respect the original patch."

### 2.2 Noise Section

> "We also need a noise section as a source of uncertainty. Although we will explore this later, a simple white noise generator will suffice. All of this is routed into the matrix mixer so that every sound source can be mixed and sent to any destination; we will use the mixer from Bug Audio."

### 2.3 Additional Oscillator Path with Frequency Shifter

> "As a bonus sound source, we will send two oscillators through a free frequency shifter. We will use the frequency shifter from Squinky Labs. I would be awfully bad at explaining what it does in a technical sense, but the illustration does it much better. The result will be a rich sound when the oscillators are tuned together and an extreme effect when they are detuned. It is crucial to ensure proper tuning of the oscillators before introducing the frequency shifter."

---

## 3. Signal Routing and Mixing

### 3.1 Matrix Mixer and Filtering

> "For filtering, Mrs. Jenny uses a dual band pass filter, which we will replace with a module like 2 Volt Instability that I love for its wide range of sound. This filter is key in creating the famous sound. She also uses a 10-channel cam filter—a bank of fixed filters at different frequencies—which is used here as a tone shaper for a single input and output; we will use the Bug Audio PEQ6. Everything then routes into the four low pass gates. Thankfully, we have a clone from Nisty, and we will also add one channel that goes directly from the destination mixer. Now, we are free to send any blend of sound sources to any destination and mix them as desired."

### 3.2 Spatial Processing

> "It is now time for quadriphony with the spatial director—a mixing console with four inputs, four outputs, and CV-controlled reverb. The four sound sources can be set and animated in a quadriphonic space in VCV Rack. We are lucky to have the Nisty quad panner; each instance can be chained together to create a mixer. Note that in a quad system, in stereo you can mix the front and rear together or use only the front outputs, with the second dimension acting as a volume control."

---

## 4. Control Voltage (CV) Path and Modulation

### 4.1 Low Pass Gates & Envelope Generators

> "Now, for the CV path, we will go from the top to the bottom of the schematics as we dig deeper into the mystery of Buchla. The four low pass gates are controlled by four envelope generators. In the Buchla world, an envelope generator is typically a rise-and-fall function that can be triggered, sustained by the gate input, and even looped to become an LFO. This specific module allows control over the overall length. We have a similar module in the Nisty collection where the four envelopes control the four low pass gates."

> "Mrs. Jenny explained that she bridges all the durations and combines them using another module to offset the envelope length. We can set a similar patch and control every envelope with one knob (with different strengths for each channel), and we can also create a feedback loop by using one envelope in place of the knob."

### 4.2 Source of Uncertainty

> "Another key element of any Buchla system is the source of uncertainty. Once again, Nisty provides a module that produces random voltages—random gates, random step voltage, random smooth voltage—which will become a very useful tool in the forthcoming patches."

---

## 5. Sequencing and Control Integration

### 5.1 Polyphonic Control and Sample & Hold

> "The oscillators are controlled in different ways, including by a chromatic keyboard with a twist. Buchla was able to simulate polyphony using an interesting sample-and-hold module, which includes a polyphonic input and a switch for the number of voices. From my understanding of the cookbook, this mysterious section is essentially a shift register—a chain of sample-and-hold modules that sample the incoming value at the first trigger and pass it along at subsequent triggers. This system allows switching between two and three voices. We will use ML modules to build a similar system. I will link the input to my keyboard and add three outputs to each oscillator. We now have a CV and gate input sent to a single-voice shift register (sample-and-hold), then two or three voices, all switched to a single set of outputs. This allows us to freely choose between three flavors of polyphony."

### 5.2 Multi-Arbitrary Function Generator (AFG 248)

> "The 248: these four sequences are not directly sent to the oscillators; they pass through the strangest module in the whole system. I would need an entire series of tutorials just to explain what it is, assuming I understand it myself. This module is known as the multi-arbitrary function generator (or morph or AFG). Few people know exactly what that means, and those who do refer to it simply as the 248, knowing every Buchla module by its model number. By the end of this video, you will see that this module blurs the line between a sequencer, an LFO, an envelope generator, and a sequential switch. Its use of faders and switches makes it a great performance tool in VCV Rack. Although some modules come close, none check all the boxes—neither in VCV Rack nor in hardware/software. We are literally left with our own devices, and we will have to build a 248 module from scratch. For this video, I will only cover the features needed for the Buchla Cookbook patch. Essentially, the 248 is a 16-step sequencer with two CV channels and two trigger channels, but with two completely independent play heads—resulting in 4 CV channels and 4 trigger channels. Each of the 16 steps carries its own digital information (which can vary per playhead), including clock input, manual CV address, and a strobe input that samples the address CV. Moreover, any step of any channel can be switched to external mode, where the fader becomes a selector for one of four CV inputs, turning this sequencer into a sophisticated 4-to-1 sequential switch."

### 5.3 Integration into the Performance Patch

> "Returning to the Performance Patch: the key concept is to take the four channels of the sequencer and send them into the external input of the 248 to recompose the four sequences at will. The two play heads control the two main oscillators. When the 248 is free running, the length of each step is set by the second fader—providing a range per step and a general time multiplier for each play head."

> "The 16-stage sequencer—although we build it from scratch for simplicity—is a two-voice polyphonic sequencer that is addressable via the Bug Audio Addr and its expander. We split the polyphonic cable so that each play head, which is independently addressable, can control the oscillators."

> "Let's add a quantizer for more harmonious results. The two play heads address not one, but two sets of faders, allowing us to duplicate the sequencer to create a second channel (addressed by the same polyphonic cable) that controls the wave shape of the oscillators. On the 248, both channels offer extra features per step; however, we only need the additional features of the first set of faders to perform the cookbook, with polyphonic modules affecting both play heads."

> "The quantizer is handled with a slur limiter for the slope feature. This time-sensitive feature is emulated by adding an offset to the polyphonic cable in the 248. Although the second set of faders can control time, we will rarely use this feature."

> "The wrench and offset switch can be emulated using an octave module. In external mode (External CV), the fader becomes a selector for one of four external CV inputs—a feature we use frequently, necessitating a button to toggle alternate batching."

> "We also need an addressable sequential switch with two voices of polyphony (one per play head). Using a Bug Audio module, the fader value addresses the sequencer switch. By patching the poly-CV output of the sequencer to the input of the switch—and routing the switch output back into the circuit—we create a button that toggles between the knob value and one of the four external CV values controlled by the same number."

> "To summarize, we follow the basic performance patch: set the four rows of the sequencer to the four external CV inputs. This provides an easy method to switch between sequences, allowing a different sequence on each step of the 248. Remember, with two play heads controlling two voices, one play head can be offset to yield a different sequence per voice."

> "This covers the basic part of the rack construction. We still have four trigger channels and two sequences of octave switching to address, with sequences that can vary depending on the play head."

> "Finally, we add the new MindMeld Shapemaster module to control everything. Similar to the Bogodio Addr Shapemaster, this module can function as an addressable sequencer (even in the free version by setting the input to unipolar CV) but cannot handle two play heads on the same sequence. Therefore, we still rely on the Bug Audio module for the first channel, using a staircase shape to address specific steps on the Bug Audio sequencer and keep it in sync with the other channels. These channels can be edited live to control the octave for each step."

> "The same applies to the two pulses sequence (channels 5 to 8), controlled by the second play head and patched on the second voice of our polyphonic circuits. Here, two independent play heads—with their own pulse and octave switch sequences—share the same voltage bank. This bank can be replaced by external CV, where one bank controls pitch and the other controls wave shape. Each voice has its own octave switch, and by offsetting the play heads, we can manipulate the melody, octave, and tone independently."

> "Lastly, to use the 248 as a classic sequencer, we address the steps with a ramp synced to the tempo (using a ZCC phase divider synced to the main clock divided by 4, suitable for 16 steps as 8th notes). We can use an 'assemble and hold' module to sample the ramp for greater accuracy."

> "With these steps, we can choose the melody for every step and achieve repeatable results. The centric play head will ensure polyphony, as does the active sequence. Additionally, a random sequencer can be created by sending a signal into the external address CV input. By patching the source of uncertainty as a random source and using a sample-and-hold module (to ensure changes occur on the beat via the strobe input in the 248), we open up further experimental possibilities."

> "This concludes the basic performance patch—a playground for experimenting with various techniques. There is already much fun to be had. Thank you for watching up to here; I look forward to having you back in the next episode. Meanwhile, you can find many useful resources in the description, including the VCV patch, the link to the cookbook, interesting lectures by Suzanne Gianni, and the modular grid link to her former and current setup. See you in the next episode."

---

# End of Rack Construction Transcript
