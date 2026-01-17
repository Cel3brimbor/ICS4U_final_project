// Global timer monitor - runs on all pages
// Monitors backend timer and shows notifications when timer completes

let lastTimerStatus = {
    isRunning: false,
    remainingSeconds: 0
};

let timerMonitorInterval = null;
let lastCompletionTime = 0; // Track when we last showed a completion notification

// Helper function to get settings from localStorage
function getSettings() {
    try {
        const savedSettings = localStorage.getItem('appSettings');
        if (savedSettings) {
            const settings = JSON.parse(savedSettings);
            return {
                timerNotifications: settings.timerNotifications !== false, // Default to true
                soundEffects: settings.soundEffects !== false, // Default to true
                notificationVolume: settings.notificationVolume !== undefined ? settings.notificationVolume : 50, // Default to 50
                notificationSound: settings.notificationSound || 'ringtone-1' // Default to ringtone-1
            };
        }
    } catch (e) {
        console.error('Error loading settings:', e);
    }
    // Default settings
    return {
        timerNotifications: true,
        soundEffects: true,
        notificationVolume: 50,
        notificationSound: 'ringtone-1'
    };
}

// Initialize timer monitoring when page loads
document.addEventListener('DOMContentLoaded', function() {
    requestNotificationPermission();
    // Initialize lastTimerStatus by fetching current status first
    initializeTimerStatus();
    startTimerMonitor();
});

// Initialize timer status on page load
async function initializeTimerStatus() {
    try {
        const response = await fetch('/api/timer');
        if (response.ok) {
            const status = await response.json();
            lastTimerStatus = {
                isRunning: status.isRunning,
                remainingSeconds: status.remainingSeconds || 0
            };
            console.log('Timer monitor initialized. Current status:', lastTimerStatus);
        }
    } catch (error) {
        console.error('Failed to initialize timer status:', error);
    }
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(function(permission) {
            console.log('Notification permission:', permission);
        });
    }
}

// Start monitoring the backend timer
function startTimerMonitor() {
    // Check timer status every second
    timerMonitorInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/timer');
            if (response.ok) {
                const status = await response.json();
                
                // Check if timer just completed
                const now = Date.now();
                const wasRunning = lastTimerStatus.isRunning;
                const isNowRunning = status.isRunning;
                const remainingTime = status.remainingSeconds || 0;
                
                // More robust detection: timer completed if it was running and now it's not
                // OR if remaining time is 0 or negative (even if isRunning is still true due to timing)
                const timerJustCompleted = wasRunning && (!isNowRunning || remainingTime <= 0) && 
                    (now - lastCompletionTime > 2000);
                
                if (timerJustCompleted) {
                    console.log('Timer completion detected!', {
                        wasRunning,
                        isNowRunning,
                        remainingTime,
                        lastStatus: lastTimerStatus,
                        currentStatus: status
                    });
                    lastCompletionTime = now;
                    handleTimerCompletion();
                }
                
                // Update last known status
                lastTimerStatus = {
                    isRunning: status.isRunning,
                    remainingSeconds: status.remainingSeconds
                };
            }
        } catch (error) {
            // Silently handle errors (network issues, etc.)
            console.error('Failed to check timer status:', error);
        }
    }, 1000); // Check every second
}

// Handle timer completion - show notification and play sound
function handleTimerCompletion() {
    console.log('handleTimerCompletion called');
    const settings = getSettings();
    console.log('Settings:', settings);
    console.log('Notification permission:', Notification.permission);
    
    // If we're on the timer page, the timer.js will handle notifications
    // Only show notification if we're on a different page
    const isOnTimerPage = window.location.pathname.includes('timer.html');
    console.log('Is on timer page:', isOnTimerPage);
    
    if (!isOnTimerPage) {
        // Play notification sound only if sound effects are enabled
        if (settings.soundEffects) {
            console.log('Playing notification sound:', settings.notificationSound);
            // Use the MP3-based notification sound system
            if (typeof window.playNotificationSound === 'function') {
                const volume = (settings.notificationVolume || 50) / 100;
                window.playNotificationSound(settings.notificationSound, volume, 1);
            }
        }
        
        // Show browser notification only if timer notifications are enabled
        if (settings.timerNotifications) {
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    console.log('Creating notification');
                    const notification = new Notification('Timer Complete!', {
                        body: 'Great work! Your timer has finished. Take a moment to stretch and relax.',
                        icon: '/favicon.ico',
                        tag: 'timer-complete',
                        requireInteraction: false,
                        silent: !settings.soundEffects // Respect sound setting
                    });
                    
                    console.log('Notification created successfully');
                    
                    // Auto-close after 5 seconds
                    setTimeout(() => {
                        notification.close();
                    }, 5000);
                    
                    // Handle notification click
                    notification.onclick = function() {
                        window.focus();
                        // Navigate to timer page if not already there
                        if (!window.location.pathname.includes('timer.html')) {
                            window.location.href = '/timer.html';
                        }
                        notification.close();
                    };
                } catch (e) {
                    console.error('Notification failed:', e);
                }
            } else if ('Notification' in window && Notification.permission === 'default') {
                console.log('Requesting notification permission');
                // Try to request permission and show notification
                Notification.requestPermission().then(function(permission) {
                    console.log('Permission result:', permission);
                    if (permission === 'granted') {
                        handleTimerCompletion(); // Retry after permission granted
                    }
                });
            } else {
                console.warn('Notifications not available or denied. Permission:', Notification.permission);
            }
        } else {
            console.log('Timer notifications disabled in settings');
        }
    } else {
        // On timer page, just play sound as backup (timer.js should handle the rest)
        // But only if sound effects are enabled
        if (settings.soundEffects) {
            // Use the MP3-based notification sound system
            if (typeof window.playNotificationSound === 'function') {
                const volume = (settings.notificationVolume || 50) / 100;
                window.playNotificationSound(settings.notificationSound, volume, 1);
            }
        }
    }
}

// Legacy notification sound function - no longer used (replaced by MP3-based system)
function playLegacyNotificationSound() {
    const settings = getSettings();
    const volume = (settings.notificationVolume || 50) / 100; // Convert 0-100 to 0-1
    
    try {
        // Use Web Audio API to create a longer ringtone
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const duration = 2.0; // 2 seconds of ringtone
        const sampleRate = audioContext.sampleRate;
        const numSamples = duration * sampleRate;
        const buffer = audioContext.createBuffer(1, numSamples, sampleRate);
        const data = buffer.getChannelData(0);
        
        // Create an iPhone-like ringtone pattern (two-tone ascending pattern)
        const frequencies = [523.25, 659.25]; // C5 and E5 notes
        let phase = 0;
        
        for (let i = 0; i < numSamples; i++) {
            const time = i / sampleRate;
            // Switch between frequencies every 0.3 seconds
            const freqIndex = Math.floor(time / 0.3) % 2;
            const frequency = frequencies[freqIndex];
            
            // Generate sine wave
            phase += (2 * Math.PI * frequency) / sampleRate;
            if (phase > 2 * Math.PI) phase -= 2 * Math.PI;
            
            // Apply envelope (fade in/out for each tone)
            const toneTime = time % 0.3;
            let envelope = 1.0;
            if (toneTime < 0.05) {
                envelope = toneTime / 0.05; // Fade in
            } else if (toneTime > 0.25) {
                envelope = (0.3 - toneTime) / 0.05; // Fade out
            }
            
            data[i] = Math.sin(phase) * envelope * volume * 0.3;
        }
        
        // Play the ringtone 3 times (total ~6 seconds)
        let playCount = 0;
        function playRingtone() {
            const source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(0);
            playCount++;
            
            if (playCount < 3) {
                source.onended = function() {
                    setTimeout(() => playRingtone(), 0.1);
                };
            }
        }
        playRingtone();
        
    } catch (e) {
        // Fallback to simple beep if Web Audio API fails
        console.log('Web Audio API not available, using fallback:', e);
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8F');
            audio.volume = volume;
            audio.play().catch(() => {});
        } catch (e2) {
            console.log('Fallback sound also failed:', e2);
        }
    }
}
