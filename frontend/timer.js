document.addEventListener('DOMContentLoaded', function() {
    initializeTimerPage();
    requestNotificationPermission();
    setupPageVisibilityHandling();
});

let timerInterval;
let isRunning = false;
let isPaused = false;
let currentTime = 25 * 60;
let currentMode = 'pomodoro';
let pomodorosCompleted = 0;
let totalFocusTime = 0;
let currentStreak = 0;

// Initialize the timer page
function initializeTimerPage() {
    loadTimerStats();
    updateTimerDisplay();
    setupEventListeners();
    updateProgressGrid();
    fetchTimerStatus();
}

function setupEventListeners() {
    document.getElementById('timer-start').addEventListener('click', startTimer);
    document.getElementById('timer-pause').addEventListener('click', pauseTimer);
    document.getElementById('timer-stop').addEventListener('click', stopTimer);
    document.getElementById('timer-reset').addEventListener('click', resetTimer);

    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            switchMode(this.dataset.mode, parseInt(this.dataset.duration));
        });
    });

    // Custom timer input
    document.getElementById('set-custom-timer').addEventListener('click', setCustomTimer);
}

// Fetch timer status from backend
async function fetchTimerStatus() {
    try {
        const response = await fetch('/api/timer');
        if (response.ok) {
            const status = await response.json();
            isRunning = status.isRunning;
            isPaused = status.isPaused || false;  // Default to false if not provided
            currentTime = status.remainingSeconds;
            // Don't overwrite currentMode - the backend doesn't provide it
            // currentMode = status.mode;  // Remove this line

            updateTimerDisplay();
            updateUI();
            updateModeButtons();

            if (isRunning && !isPaused) {
                startLocalTimer();
            }
        }
    } catch (error) {
        console.error('Failed to fetch timer status:', error);
    }
}

// Start timer
async function startTimer() {
    try {
        const requestData = { mode: currentMode };

        // Include duration for custom timers
        if (currentMode === 'custom') {
            requestData.duration = currentTime;
        }

        const response = await fetch('/api/timer/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to start timer');
        }

        const result = await response.json();

        if (result.status === 'Timer started') {
            isRunning = true;
            isPaused = false;
            fetchTimerStatus();  // Update status from backend
            updateUI();
            updateStatus('Timer started');
            startLocalTimer();  // Start the local countdown display
        }
    } catch (error) {
        console.error('Failed to start timer:', error);
        showError('Failed to start timer: ' + error.message);
    }
}

// Pause timer
async function pauseTimer() {
    try {
        const response = await fetch('/api/timer/pause', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to pause timer');
        }

        const result = await response.json();

        if (result.status === 'Timer paused') {
            isPaused = true;
            clearInterval(timerInterval);
            updateUI();
            updateStatus('Timer paused');
        }
    } catch (error) {
        console.error('Failed to pause timer:', error);
        showError('Failed to pause timer: ' + error.message);
    }
}

// Stop timer
async function stopTimer() {
    try {
        const response = await fetch('/api/timer/stop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to stop timer');
        }

        const result = await response.json();

        if (result.status === 'Timer stopped') {
            isRunning = false;
            isPaused = false;
            clearInterval(timerInterval);
            fetchTimerStatus();  // Update status from backend
            updateUI();
            updateStatus('Timer stopped');
        }
    } catch (error) {
        console.error('Failed to stop timer:', error);
        showError('Failed to stop timer: ' + error.message);
    }
}

// Reset timer
async function resetTimer() {
    try {
        const response = await fetch('/api/timer/reset', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to reset timer');
        }

        const result = await response.json();

        if (result.status === 'Timer reset') {
            currentTime = getDefaultTimeForMode(currentMode);
            isRunning = false;
            isPaused = false;
            clearInterval(timerInterval);
            fetchTimerStatus();  // Update status from backend
            updateUI();
            updateStatus('Timer reset');
        }
    } catch (error) {
        console.error('Failed to reset timer:', error);
        showError('Failed to reset timer: ' + error.message);
    }
}

// Switch timer mode
function switchMode(mode, duration) {
    if (isRunning) {
        if (!confirm('Switching modes will reset the current timer. Continue?')) {
            return;
        }
        resetTimer();
    }

    currentMode = mode;
    currentTime = duration;
    updateModeButtons();
    updateTimerDisplay();
    updateStatus(`${mode.replace('-', ' ').toUpperCase()} mode selected`);

    // Show/hide custom timer input
    const customInput = document.getElementById('custom-timer-input');
    if (mode === 'custom') {
        customInput.style.display = 'flex';
    } else {
        customInput.style.display = 'none';
    }
}

function setCustomTimer() {
    const minutes = parseInt(document.getElementById('custom-minutes').value) || 0;
    const seconds = parseInt(document.getElementById('custom-seconds').value) || 0;

    if (minutes === 0 && seconds === 0) {
        showError('Please set a valid duration');
        return;
    }

    const totalSeconds = (minutes * 60) + seconds;
    switchMode('custom', totalSeconds);
}

// Start local countdown (for visual feedback)
function startLocalTimer() {
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
        currentTime--;
        updateTimerDisplay();

        if (currentTime <= 0) {
            timerComplete();
        }
    }, 1000);
}

// Handle timer completion
function timerComplete() {
    clearInterval(timerInterval);
    isRunning = false;

    //play notification sound if available
    playNotification();

    // Show notification
    showNotification(`${currentMode.replace('-', ' ').toUpperCase()} Complete!`,
                    'Great work! Take a moment to stretch and relax.');

    // Track completion
    if (currentMode === 'pomodoro') {
        pomodorosCompleted++;
        totalFocusTime += getDefaultTimeForMode(currentMode) / 60;  // Convert seconds to minutes
        currentStreak++;
        saveTimerStats();
        updateProgressGrid();

        // Auto-suggest next mode
        if (pomodorosCompleted % 4 === 0) {
            setTimeout(() => {
                if (confirm('4 pomodoros completed! Would you like to take a long break?')) {
                    switchMode('long-break', 900);
                    startTimer();
                }
            }, 1000);
        } else {
            setTimeout(() => {
                if (confirm('Pomodoro complete! Ready for a short break?')) {
                    switchMode('short-break', 300);
                    startTimer();
                }
            }, 1000);
        }
    } else if (currentMode === 'custom') {
        // Track custom timer as focus time (like a pomodoro)
        const customDurationMinutes = getDefaultTimeForMode(currentMode) / 60;
        totalFocusTime += customDurationMinutes;
        currentStreak++;
        saveTimerStats();
        updateProgressGrid();

        // After custom timer, suggest a break or another session
        setTimeout(() => {
            if (confirm('Custom timer complete! Would you like to take a short break?')) {
                switchMode('short-break', 300);
                startTimer();
            }
        }, 1000);
    } else {
        // Break modes - don't track as focus time
        // After break, suggest starting pomodoro or custom timer
        setTimeout(() => {
            if (confirm('Break time over! Ready to start another session?')) {
                switchMode('pomodoro', 1500);
                startTimer();
            }
        }, 1000);
    }

    updateUI();
}

// Update UI elements
function updateUI() {
    const startBtn = document.getElementById('timer-start');
    const pauseBtn = document.getElementById('timer-pause');

    startBtn.disabled = isRunning && !isPaused;
    pauseBtn.disabled = !isRunning || isPaused;

    if (isRunning && !isPaused) {
        startBtn.textContent = 'Running...';
        document.querySelector('.timer-circle').classList.add('running');
    } else {
        startBtn.textContent = isPaused ? 'Resume' : 'Start';
        document.querySelector('.timer-circle').classList.remove('running');
    }
}

// Update timer display
function updateTimerDisplay() {
    const minutes = Math.floor(Math.abs(currentTime) / 60);
    const seconds = Math.abs(currentTime) % 60;

    document.getElementById('timer-minutes').textContent = minutes.toString().padStart(2, '0');
    document.getElementById('timer-seconds').textContent = seconds.toString().padStart(2, '0');
}

// Update mode buttons
function updateModeButtons() {
    document.querySelectorAll('.mode-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-mode="${currentMode}"]`).classList.add('active');
}

// Update status message
function updateStatus(message) {
    document.getElementById('timer-status').textContent = message;
}

// Load/save statistics
function loadTimerStats() {
    pomodorosCompleted = parseInt(localStorage.getItem('pomodorosCompleted') || '0');
    totalFocusTime = parseInt(localStorage.getItem('totalFocusTime') || '0');
    currentStreak = parseInt(localStorage.getItem('currentStreak') || '0');
    updateStatsDisplay();
}

function saveTimerStats() {
    localStorage.setItem('pomodorosCompleted', pomodorosCompleted);
    localStorage.setItem('totalFocusTime', totalFocusTime);
    localStorage.setItem('currentStreak', currentStreak);
    updateStatsDisplay();
}

function updateStatsDisplay() {
    document.getElementById('pomodoros-completed').textContent = pomodorosCompleted;
    document.getElementById('total-focus-time').textContent = totalFocusTime;
    document.getElementById('current-streak').textContent = currentStreak;
}

// Update progress grid
function updateProgressGrid() {
    const grid = document.getElementById('progress-grid');
    grid.innerHTML = '';

    // Show last 12 pomodoros
    for (let i = 0; i < 12; i++) {
        const item = document.createElement('div');
        item.className = 'progress-item';

        if (i < pomodorosCompleted % 12) {
            item.classList.add('completed');
            item.textContent = '✓';
        } else if (i === pomodorosCompleted % 12 && isRunning && currentMode === 'pomodoro') {
            item.classList.add('current');
            item.textContent = '●';
        } else {
            item.textContent = i + 1;
        }

        grid.appendChild(item);
    }
}

// Notification functions
function showNotification(title, message) {
    // Browser notification (works even when page is not active)
    if ('Notification' in window && Notification.permission === 'granted') {
        try {
            const notification = new Notification(title, {
                body: message,
                icon: '/favicon.ico',
                tag: 'timer-notification', // Prevents duplicate notifications
                requireInteraction: false, // Auto-dismiss after a few seconds
                silent: false // Allow sound
            });

            // Auto-close notification after 5 seconds
            setTimeout(() => {
                notification.close();
            }, 5000);

            // Handle notification click
            notification.onclick = function() {
                window.focus();
                notification.close();
            };
        } catch (e) {
            console.log('Notification failed:', e);
        }
    } else if ('Notification' in window && Notification.permission === 'default') {
        // Try to request permission and show notification
        Notification.requestPermission().then(function(permission) {
            if (permission === 'granted') {
                showNotification(title, message);
            }
        });
    }

    // In-app notification (only if page is visible)
    if (!document.hidden) {
        showMessage(message, 'success');
    }
}

function playNotification() {
    // Try to play a notification sound
    try {
        const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8FIHnB7tyfSwkTWLjl66RcFg5Fm9/yvGUgBzCLzPK6ZTAFHXPA7dmhUQhQXrTp66hVFApGn+DyvmQdBzeL0fK8Zy8F');
        audio.volume = 0.3;
        audio.play().catch(() => {}); // Ignore errors if sound fails
    } catch (e) {
        // Sound not available
    }
}

function showError(message) {
    showMessage(message, 'error');
}

function showMessage(message, type) {
    // Remove existing messages
    const existingMessages = document.querySelectorAll('.message-notification');
    existingMessages.forEach(msg => msg.remove());

    // Create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-notification ${type}`;
    messageDiv.textContent = message;
    messageDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 1rem 1.5rem;
        border-radius: 8px;
        font-weight: 500;
        z-index: 1000;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        animation: slideIn 0.3s ease-out;
    `;

    if (type === 'success') {
        messageDiv.style.background = '#d4edda';
        messageDiv.style.color = '#155724';
        messageDiv.style.border = '1px solid #c3e6cb';
    } else {
        messageDiv.style.background = '#f8d7da';
        messageDiv.style.color = '#721c24';
        messageDiv.style.border = '1px solid #f5c6cb';
    }

    document.body.appendChild(messageDiv);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

// Utility function to get default time for mode
function getDefaultTimeForMode(mode) {
    switch (mode) {
        case 'pomodoro': return 25 * 60;
        case 'short-break': return 5 * 60;
        case 'long-break': return 15 * 60;
        case 'custom': return currentTime; // Return the actual custom duration
        default: return 25 * 60;
    }
}

// Go back to dashboard
function goBack() {
    window.location.href = '/index.html';
}

// Request notification permission for background notifications
function requestNotificationPermission() {
    if ('Notification' in window) {
        // Check if we already have permission
        if (Notification.permission === 'default') {
            // Request permission
            Notification.requestPermission().then(function(permission) {
                console.log('Notification permission:', permission);
            });
        } else if (Notification.permission === 'denied') {
            console.log('Notifications denied by user');
        }
    }
}

// Handle page visibility changes for better background timer reliability
function setupPageVisibilityHandling() {
    let hiddenStartTime = null;

    document.addEventListener('visibilitychange', function() {
        if (document.hidden) {
            // Page became hidden
            hiddenStartTime = Date.now();
            console.log('Page hidden - timer may be less reliable');

            // Show warning notification if timer is running
            if (isRunning && Notification.permission === 'granted') {
                new Notification('Timer Warning', {
                    body: 'Timer may be less accurate while page is hidden. Check back soon!',
                    icon: '/favicon.ico'
                });
            }
        } else {
            // Page became visible again
            if (hiddenStartTime && isRunning) {
                const hiddenDuration = Date.now() - hiddenStartTime;
                console.log(`Page was hidden for ${Math.round(hiddenDuration / 1000)} seconds`);

                // Show welcome back notification
                if (Notification.permission === 'granted') {
                    new Notification('Welcome Back!', {
                        body: 'Your timer is still running. Page visibility may have affected accuracy.',
                        icon: '/favicon.ico'
                    });
                }

                // Attempt to recalibrate the timer
                recalibrateTimer(hiddenDuration);
            }
            hiddenStartTime = null;
        }
    });

    // Also handle page focus/blur events
    window.addEventListener('blur', function() {
        console.log('Window lost focus');
    });

    window.addEventListener('focus', function() {
        console.log('Window regained focus');
        if (isRunning && Notification.permission === 'granted') {
            // Show a subtle notification that the timer is still running
            new Notification('Timer Active', {
                body: 'Your productivity timer is still running.',
                icon: '/favicon.ico',
                silent: true // Don't play sound for focus notifications
            });
        }
    });
}

// Attempt to recalibrate timer after page visibility change
function recalibrateTimer(hiddenDuration) {
    if (!isRunning) return;

    // This is a best-effort attempt to adjust for time spent in background
    // Note: This is not perfectly accurate due to browser timer throttling
    const hiddenSeconds = Math.floor(hiddenDuration / 1000);

    if (hiddenSeconds > 0 && currentTime > hiddenSeconds) {
        // Try to account for missed time
        console.log(`Adjusting timer by ${hiddenSeconds} seconds due to page being hidden`);
        currentTime = Math.max(0, currentTime - hiddenSeconds);

        if (currentTime <= 0) {
            // Timer should have completed while hidden
            timerComplete();
        } else {
            updateTimerDisplay();
        }
    }
}