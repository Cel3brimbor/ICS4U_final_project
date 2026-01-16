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
                soundEffects: settings.soundEffects !== false // Default to true
            };
        }
    } catch (e) {
        console.error('Error loading settings:', e);
    }
    // Default settings
    return {
        timerNotifications: true,
        soundEffects: true
    };
}

// Initialize timer monitoring when page loads
document.addEventListener('DOMContentLoaded', function() {
    requestNotificationPermission();
    startTimerMonitor();
});

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
                // Timer completed if it was running before and now it's not, and remaining time is 0
                // Also check that we haven't shown a notification in the last 2 seconds (prevent duplicates)
                const now = Date.now();
                if (lastTimerStatus.isRunning && !status.isRunning && status.remainingSeconds === 0 && 
                    (now - lastCompletionTime > 2000)) {
                    // Timer just completed!
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
    const settings = getSettings();
    
    // If we're on the timer page, the timer.js will handle notifications
    // Only show notification if we're on a different page
    const isOnTimerPage = window.location.pathname.includes('timer.html');
    
    if (!isOnTimerPage) {
        // Play notification sound only if sound effects are enabled
        if (settings.soundEffects) {
            playNotificationSound();
        }
        
        // Show browser notification only if timer notifications are enabled
        if (settings.timerNotifications) {
            if ('Notification' in window && Notification.permission === 'granted') {
                try {
                    const notification = new Notification('Timer Complete!', {
                        body: 'Great work! Your timer has finished. Take a moment to stretch and relax.',
                        icon: '/favicon.ico',
                        tag: 'timer-complete',
                        requireInteraction: false,
                        silent: !settings.soundEffects // Respect sound setting
                    });
                    
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
                    console.log('Notification failed:', e);
                }
            } else if ('Notification' in window && Notification.permission === 'default') {
                // Try to request permission and show notification
                Notification.requestPermission().then(function(permission) {
                    if (permission === 'granted') {
                        handleTimerCompletion(); // Retry after permission granted
                    }
                });
            }
        }
    } else {
        // On timer page, just play sound as backup (timer.js should handle the rest)
        // But only if sound effects are enabled
        if (settings.soundEffects) {
            playNotificationSound();
        }
    }
}

// Play notification sound (same as timer.js)
function playNotificationSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8F');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore errors if sound fails
    } catch (e) {
        // Sound not available
    }
}

