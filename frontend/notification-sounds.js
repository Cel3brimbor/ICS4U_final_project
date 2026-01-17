// Notification sound library - generates friendly phone ringtones using Web Audio API

// Main function to play notification sound
function playNotificationSound(soundType, volume, playCount = 3) {
    // If custom audio is provided, play it
    if (soundType === 'custom') {
        playCustomAudio(volume, playCount);
        return;
    }
    
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const sampleRate = audioContext.sampleRate;
        
        let buffer;
        
        switch(soundType) {
            case 'beep-beep':
                buffer = createBeepBeepSound(audioContext, sampleRate);
                break;
            case 'gentle-chime':
                buffer = createGentleChimeSound(audioContext, sampleRate);
                break;
            case 'upward-bell':
                buffer = createUpwardBellSound(audioContext, sampleRate);
                break;
            case 'soft-notification':
                buffer = createSoftNotificationSound(audioContext, sampleRate);
                break;
            case 'friendly-tone':
                buffer = createFriendlyToneSound(audioContext, sampleRate);
                break;
            default:
                buffer = createBeepBeepSound(audioContext, sampleRate);
        }
        
        // Play the sound the specified number of times
        let currentPlay = 0;
        function playSound() {
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
            currentPlay++;
            
            if (currentPlay < playCount) {
                source.onended = function() {
                    setTimeout(() => playSound(), 0.2); // Small gap between plays
                };
            }
        }
        playSound();
    } catch (e) {
        console.error('Sound playback failed:', e);
        // Fallback to simple beep
        createBeepBeepFallback(volume);
    }
}

// Play custom uploaded audio
function playCustomAudio(volume, playCount = 3) {
    try {
        const customAudioData = localStorage.getItem('customNotificationSound');
        if (!customAudioData) {
            console.warn('No custom audio found, using default');
            playNotificationSound('beep-beep', volume, playCount);
            return;
        }
        
        const audio = new Audio(customAudioData);
        audio.volume = volume;
        
        let currentPlay = 0;
        function playCustom() {
            audio.currentTime = 0; // Reset to start
            audio.play().then(() => {
                currentPlay++;
                if (currentPlay < playCount) {
                    audio.onended = function() {
                        setTimeout(() => playCustom(), 0.2);
                    };
                }
            }).catch(err => {
                console.error('Failed to play custom audio:', err);
                // Fallback to default
                playNotificationSound('beep-beep', volume, playCount);
            });
        }
        playCustom();
    } catch (e) {
        console.error('Custom audio playback failed:', e);
        playNotificationSound('beep-beep', volume, playCount);
    }
}

// Beep Beep - Two quick friendly beeps using SQUARE WAVE (electronic sound)
function createBeepBeepSound(audioContext, sampleRate) {
    const duration = 0.6; // Longer to fit two beeps
    const numSamples = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    const beepFrequency = 800; // Hz - higher pitched beep
    let phase = 0;

    for (let i = 0; i < numSamples; i++) {
        const time = i / sampleRate;

        // Create two separate beeps with a gap
        let envelope = 0;
        if (time < 0.15) { // First beep (0-0.15s)
            envelope = Math.exp(-(time) * 15); // Quick attack and decay
        } else if (time > 0.3 && time < 0.45) { // Second beep (0.3-0.45s)
            envelope = Math.exp(-(time - 0.3) * 15); // Quick attack and decay
        }

        phase += (2 * Math.PI * beepFrequency) / sampleRate;
        if (phase > 2 * Math.PI) phase -= 2 * Math.PI;

        // SQUARE WAVE: +1 or -1 based on phase
        const squareWave = Math.sin(phase) > 0 ? 1 : -1;

        data[i] = squareWave * envelope * 0.15; // Lower volume for square wave
    }

    return buffer;
}

// Gentle Chime - TRIANGLE WAVE + WHITE NOISE (wind chime-like)
function createGentleChimeSound(audioContext, sampleRate) {
    const duration = 2.0;
    const numSamples = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    // Triangle wave frequencies for chime effect
    const chimeFreqs = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    let phase1 = 0, phase2 = 0, phase3 = 0, phase4 = 0;

    for (let i = 0; i < numSamples; i++) {
        const time = i / sampleRate;

        // Determine which chime note to play
        const noteDuration = 0.4; // Each note lasts 0.4 seconds
        const noteIndex = Math.floor(time / noteDuration);
        const currentNote = chimeFreqs[Math.min(noteIndex, chimeFreqs.length - 1)];
        const noteTime = time % noteDuration;

        // Triangle wave function
        const triangleWave = (phase) => {
            const normalizedPhase = phase / (2 * Math.PI);
            return 2 * Math.abs(2 * (normalizedPhase - Math.floor(normalizedPhase + 0.5))) - 1;
        };

        // Chime envelope: quick attack, slow decay
        let envelope = 0;
        const attackTime = 0.05;
        if (noteTime < attackTime) {
            envelope = noteTime / attackTime; // Linear attack
        } else {
            envelope = Math.exp(-(noteTime - attackTime) * 2); // Exponential decay
        }

        // Update phases
        phase1 += (2 * Math.PI * currentNote) / sampleRate;
        phase2 += (2 * Math.PI * currentNote * 2) / sampleRate;
        phase3 += (2 * Math.PI * currentNote * 3) / sampleRate;
        phase4 += (2 * Math.PI * currentNote * 4) / sampleRate;

        if (phase1 > 2 * Math.PI) phase1 -= 2 * Math.PI;
        if (phase2 > 2 * Math.PI) phase2 -= 2 * Math.PI;
        if (phase3 > 2 * Math.PI) phase3 -= 2 * Math.PI;
        if (phase4 > 2 * Math.PI) phase4 -= 2 * Math.PI;

        // Mix triangle waves with harmonics
        const fundamental = triangleWave(phase1) * 0.6;
        const octave = triangleWave(phase2) * 0.3;
        const fifth = triangleWave(phase3) * 0.15;
        const ninth = triangleWave(phase4) * 0.075;

        // Add subtle white noise for realism
        const noise = (Math.random() - 0.5) * 0.1;

        data[i] = (fundamental + octave + fifth + ninth + noise) * envelope * 0.25;
    }

    return buffer;
}

// Upward Bell - SAWTOOTH WAVE (rich, brassy sound)
function createUpwardBellSound(audioContext, sampleRate) {
    const duration = 2.4;
    const numSamples = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    const bellNotes = [261.63, 329.63, 392.00, 523.25, 659.25]; // C4, E4, G4, C5, E5 - ascending scale
    let phase1 = 0, phase2 = 0, phase3 = 0, phase4 = 0;

    for (let i = 0; i < numSamples; i++) {
        const time = i / sampleRate;

        // Determine which note to play based on time
        const noteDuration = 0.4; // Each note lasts 0.4 seconds
        const noteIndex = Math.floor(time / noteDuration);
        const currentNote = bellNotes[Math.min(noteIndex, bellNotes.length - 1)];
        const noteTime = time % noteDuration;

        // Sawtooth wave function (rich, brassy sound)
        const sawtoothWave = (phase) => {
            const normalizedPhase = phase / (2 * Math.PI);
            return 2 * (normalizedPhase - Math.floor(normalizedPhase)) - 1;
        };

        // Bell-like envelope with sawtooth characteristics
        let envelope = 0;
        const attackTime = 0.03;
        if (noteTime < attackTime) {
            envelope = noteTime / attackTime; // Sharp attack
        } else {
            // Sawtooth decay - faster than sine waves for brassy sound
            const decay1 = Math.exp(-(noteTime - attackTime) * 3);
            const decay2 = Math.exp(-(noteTime - attackTime) * 2.5);
            const decay3 = Math.exp(-(noteTime - attackTime) * 2);
            const decay4 = Math.exp(-(noteTime - attackTime) * 1.5);
            envelope = (decay1 * 0.4 + decay2 * 0.3 + decay3 * 0.2 + decay4 * 0.1);
        }

        // Update phases for harmonics
        phase1 += (2 * Math.PI * currentNote) / sampleRate;
        phase2 += (2 * Math.PI * currentNote * 2.001) / sampleRate; // Slightly detuned for richness
        phase3 += (2 * Math.PI * currentNote * 3.002) / sampleRate; // More detuned
        phase4 += (2 * Math.PI * currentNote * 4.003) / sampleRate; // Even more detuned

        if (phase1 > 2 * Math.PI) phase1 -= 2 * Math.PI;
        if (phase2 > 2 * Math.PI) phase2 -= 2 * Math.PI;
        if (phase3 > 2 * Math.PI) phase3 -= 2 * Math.PI;
        if (phase4 > 2 * Math.PI) phase4 -= 2 * Math.PI;

        // Mix sawtooth waves with different amplitudes and slight detuning
        const fundamental = sawtoothWave(phase1) * 0.5;
        const octave = sawtoothWave(phase2) * 0.25;
        const fifth = sawtoothWave(phase3) * 0.15;
        const ninth = sawtoothWave(phase4) * 0.1;

        data[i] = (fundamental + octave + fifth + ninth) * envelope * 0.2;
    }

    return buffer;
}

// Soft Notification - PULSE WAVES with varying widths (retro computer sound)
function createSoftNotificationSound(audioContext, sampleRate) {
    const duration = 1.8;
    const numSamples = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    const baseFreq = 440; // A4
    const highFreq = 554.37; // C#5
    let phase1 = 0, phase2 = 0;

    for (let i = 0; i < numSamples; i++) {
        const time = i / sampleRate;

        // Create a retro computer-like pattern with varying pulse widths
        let envelope1 = 0, envelope2 = 0;

        // First tone (0-0.6s) - wide pulse
        if (time < 0.6) {
            const toneTime = time;
            if (toneTime < 0.08) {
                envelope1 = toneTime / 0.08; // Quick attack
            } else if (toneTime > 0.52) {
                envelope1 = (0.6 - toneTime) / 0.08; // Quick release
            } else {
                envelope1 = 1.0; // Sustain
            }
        }

        // Second tone (0.6-1.2s) - narrow pulse
        if (time > 0.6 && time < 1.2) {
            const toneTime = time - 0.6;
            if (toneTime < 0.05) {
                envelope2 = toneTime / 0.05; // Very quick attack
            } else if (toneTime > 0.55) {
                envelope2 = (0.6 - toneTime) / 0.05; // Quick release
            } else {
                envelope2 = 1.0; // Sustain
            }
        }

        // Third tone (1.2-1.8s) - medium pulse
        if (time > 1.2) {
            const toneTime = time - 1.2;
            if (toneTime < 0.06) {
                envelope1 = toneTime / 0.06; // Medium attack
            } else if (toneTime > 0.54) {
                envelope1 = (0.6 - toneTime) / 0.06; // Medium release
            } else {
                envelope1 = 1.0; // Sustain
            }
        }

        // Update phases
        phase1 += (2 * Math.PI * baseFreq) / sampleRate;
        phase2 += (2 * Math.PI * highFreq) / sampleRate;

        if (phase1 > 2 * Math.PI) phase1 -= 2 * Math.PI;
        if (phase2 > 2 * Math.PI) phase2 -= 2 * Math.PI;

        // Pulse wave function with varying width based on time
        const pulseWave = (phase, width) => {
            const normalizedPhase = phase / (2 * Math.PI);
            return normalizedPhase < width ? 1 : -1;
        };

        // Vary pulse width over time for retro effect
        const pulseWidth1 = 0.3 + 0.2 * Math.sin(time * 2); // Width varies from 0.1 to 0.5
        const pulseWidth2 = 0.2 + 0.15 * Math.sin(time * 3); // Width varies from 0.05 to 0.35

        const pulse1 = pulseWave(phase1, pulseWidth1) * envelope1 * 0.25;
        const pulse2 = pulseWave(phase2, pulseWidth2) * envelope2 * 0.2;

        data[i] = (pulse1 + pulse2) * 0.35;
    }

    return buffer;
}

// Friendly Tone - FM SYNTHESIS (rich, modulated sound)
function createFriendlyToneSound(audioContext, sampleRate) {
    const duration = 2.5;
    const numSamples = duration * sampleRate;
    const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
    const data = buffer.getChannelData(0);

    // FM synthesis parameters
    const carrierFreq = 440; // A4 - base frequency
    const modulatorFreq = 220; // A3 - half the carrier for rich modulation
    const modulationIndex = 3; // How much modulation (higher = richer sound)

    let carrierPhase = 0;
    let modulatorPhase = 0;

    for (let i = 0; i < numSamples; i++) {
        const time = i / sampleRate;

        // Create a pleasant FM-synthesized pattern
        let envelope = 0;

        // Pattern: sustained tone with varying intensity
        const segment = Math.floor(time / 0.5);
        const segmentTime = time % 0.5;

        // Smooth envelope that varies intensity
        if (segmentTime < 0.1) {
            envelope = segmentTime / 0.1; // Fade in
        } else if (segmentTime > 0.4) {
            envelope = (0.5 - segmentTime) / 0.1; // Fade out
        } else {
            // Vary intensity based on segment for rhythmic feel
            const intensity = [0.8, 1.0, 0.6, 0.9, 0.7][segment % 5] || 0.8;
            envelope = intensity;
        }

        // Update modulator phase
        modulatorPhase += (2 * Math.PI * modulatorFreq) / sampleRate;
        if (modulatorPhase > 2 * Math.PI) modulatorPhase -= 2 * Math.PI;

        // FM synthesis: carrier frequency is modulated by the modulator
        const modulation = Math.sin(modulatorPhase) * modulationIndex;
        const instantaneousFreq = carrierFreq * (1 + modulation * 0.01); // Subtle frequency modulation

        // Update carrier phase with modulated frequency
        carrierPhase += (2 * Math.PI * instantaneousFreq) / sampleRate;
        if (carrierPhase > 2 * Math.PI) carrierPhase -= 2 * Math.PI;

        // Generate FM tone with some harmonics
        const fmTone = Math.sin(carrierPhase);

        // Add subtle overtones for richness
        const overtone1 = Math.sin(carrierPhase * 2) * 0.3;
        const overtone2 = Math.sin(carrierPhase * 3) * 0.15;

        // Add gentle vibrato
        const vibrato = Math.sin(time * 2) * 0.02;
        const vibratoPhase = carrierPhase + vibrato;

        // Combine FM synthesis with overtones
        data[i] = (Math.sin(vibratoPhase) * 0.5 + overtone1 * 0.25 + overtone2 * 0.125) * envelope * 0.35;
    }

    return buffer;
}

// Fallback beep-beep sound (square wave)
function createBeepBeepFallback(volume) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const duration = 0.4;
        const sampleRate = audioContext.sampleRate;
        const numSamples = duration * sampleRate;
        const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);

        const frequency = 800;
        let phase = 0;

        for (let i = 0; i < numSamples; i++) {
            const time = i / sampleRate;
            const envelope = Math.exp(-time * 8);
            phase += (2 * Math.PI * frequency) / sampleRate;
            if (phase > 2 * Math.PI) phase -= 2 * Math.PI;

            // Square wave for fallback
            const squareWave = Math.sin(phase) > 0 ? 1 : -1;
            data[i] = squareWave * envelope * volume * 0.15;
        }

        let playCount = 0;
        function playBeep() {
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
            playCount++;

            if (playCount < 2) {
                source.onended = function() {
                    setTimeout(() => playBeep(), 0.1);
                };
            }
        }
        playBeep();
    } catch (e) {
        console.log('Fallback sound failed:', e);
    }
}

