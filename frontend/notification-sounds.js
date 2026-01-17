// Notification sound library - uses MP3 files for ringtones

// Main function to play notification sound
function playNotificationSound(soundType, volume, playCount = 3) {
    try {
        // If custom audio is provided, play it
        if (soundType === 'custom') {
            playCustomAudio(volume, playCount);
            return;
        }

        // Map sound types to MP3 files
        let soundFile;
        switch(soundType) {
            case 'ringtone-1':
                soundFile = 'sounds/ringtone-1.mp3';
                break;
            case 'ringtone-2':
                soundFile = 'sounds/ringtone-2.mp3';
                break;
            case 'ringtone-3':
                soundFile = 'sounds/ringtone-3.mp3';
                break;
            case 'ringtone-4':
                soundFile = 'sounds/ringtone-4.mp3';
                break;
            case 'ringtone-5':
                soundFile = 'sounds/ringtone-5.mp3';
                break;
            default:
                soundFile = 'sounds/ringtone-1.mp3'; // Default to ringtone 1
        }

        // Play the MP3 file the specified number of times
        let currentPlay = 0;
        function playSound() {
            const audio = new Audio(soundFile);
            audio.volume = volume;

            audio.play().then(() => {
                currentPlay++;
                if (currentPlay < playCount) {
                    audio.onended = function() {
                        setTimeout(() => playSound(), 0.2); // Small gap between plays
                    };
                }
            }).catch(err => {
                console.error('Failed to play MP3 sound:', err.message);
                // Fallback to synthesized beep
                playSynthesizedBeep(volume, playCount);
            });
        }
        playSound();
    } catch (e) {
        console.error('MP3 sound playback failed:', e);
        playSynthesizedBeep(volume, playCount);
    }
}

// Play custom uploaded audio
function playCustomAudio(volume, playCount = 3) {
    try {
        const customAudioData = localStorage.getItem('customNotificationSound');
        if (!customAudioData) {
            console.warn('No custom audio found, using default');
            playNotificationSound('ringtone-1', volume, playCount);
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
                playNotificationSound('ringtone-1', volume, playCount);
            });
        }
        playCustom();
    } catch (e) {
        console.error('Custom audio playback failed:', e);
        playNotificationSound('ringtone-1', volume, playCount);
    }
}

// Fallback synthesized beep sound when MP3 files fail to load
function playSynthesizedBeep(volume, playCount = 3) {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const duration = 0.6; // Longer to fit two beeps
        const sampleRate = audioContext.sampleRate;
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

            data[i] = squareWave * envelope * volume * 0.15; // Lower volume for square wave
        }

        // Play the sound the specified number of times
        let currentPlay = 0;
        function playSound() {
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            const gainNode = audioContext.createGain();
            gainNode.gain.value = volume;
            source.connect(gainNode);
            gainNode.connect(audioContext.destination);
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
        console.error('Synthesized beep failed:', e);
    }
}

