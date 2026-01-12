document.addEventListener('DOMContentLoaded', function() {
    initializeTimerPage();
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
}

// Fetch timer status from backend
async function fetchTimerStatus() {
    try {
        const response = await fetch('/api/timer');
        if (response.ok) {
            const status = await response.json();
            isRunning = status.isRunning;
            isPaused = status.isPaused;
            currentTime = status.remainingSeconds;
            currentMode = status.mode;

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
        const response = await fetch('/api/timer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'start', mode: currentMode })
        });

        if (!response.ok) {
            throw new Error('Failed to start timer');
        }

        const result = await response.json();

        if (result.success) {
            isRunning = true;
            isPaused = false;
            currentTime = result.remainingSeconds;
            updateTimerDisplay();
            updateUI();
            startLocalTimer();
            updateStatus('Timer started');
        }
    } catch (error) {
        console.error('Failed to start timer:', error);
        showError('Failed to start timer');
    }
}

// Pause timer
async function pauseTimer() {
    try {
        // TODO: Replace with your Java backend call
        // const response = await fetch('/api/timer', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ action: 'pause' })
        // });

        const response = { ok: true };
        if (response.ok) {
            isPaused = true;
            clearInterval(timerInterval);
            updateUI();
            updateStatus('Timer paused');
        }
    } catch (error) {
        console.error('Failed to pause timer:', error);
        showError('Failed to pause timer');
    }
}

// Stop timer
async function stopTimer() {
    try {
        const response = await fetch('/api/timer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: 'stop' })
        });

        if (response.ok) {
            const result = await response.json();
            isRunning = result.isRunning;
            currentTime = result.remainingSeconds;
            pomodorosCompleted = result.pomodorosCompleted || 0;
            clearInterval(timerInterval);
            updateTimerDisplay();
            updateUI();
            updateStatsDisplay();
            updateStatus(result.message || 'Timer stopped');
        } else {
            throw new Error('Failed to stop timer');
        }
    } catch (error) {
        console.error('Failed to stop timer:', error);
        showError('Failed to stop timer');
    }
}

// Reset timer
async function resetTimer() {
    try {
        // TODO: Replace with your Java backend call
        // const response = await fetch('/api/timer', {
        //     method: 'POST',
        //     headers: { 'Content-Type': 'application/json' },
        //     body: JSON.stringify({ action: 'reset' })
        // });

        const response = { ok: true, json: () => Promise.resolve({ remainingSeconds: getDefaultTimeForMode(currentMode) }) };
        const result = await response.json();

        currentTime = result.remainingSeconds;
        isRunning = false;
        isPaused = false;
        clearInterval(timerInterval);
        updateTimerDisplay();
        updateUI();
        updateStatus('Timer reset');
    } catch (error) {
        console.error('Failed to reset timer:', error);
        showError('Failed to reset timer');
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
        totalFocusTime += 25;
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
    } else {
        // After break, suggest starting pomodoro
        setTimeout(() => {
            if (confirm('Break time over! Ready to start another pomodoro?')) {
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
    // Browser notification
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification(title, { body: message, icon: '/favicon.ico' });
    }

    // In-app notification
    showMessage(message, 'success');
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
        default: return 25 * 60;
    }
}

// Go back to dashboard
function goBack() {
    window.location.href = '/index.html';
}

// Request notification permission on page load
if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
}