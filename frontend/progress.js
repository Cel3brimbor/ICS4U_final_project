/**
 * Logic and interactivity developed with help from Grok AI (xAI).
 * Date: January 2026
 */

document.addEventListener('DOMContentLoaded', function() {
    initializeProgressPage();
});

// Global variables
let currentRating = 0;
let sessionHistory = [];
let achievements = {};

function initializeProgressPage() {
    loadProgressData();
    setupEventListeners();
    updateProgressDisplay();
    checkAchievements();

    // Apply dark mode if enabled
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            if (settings.darkMode) {
                document.body.classList.add('dark-mode');
            }
        } catch (e) {
            console.error('Error loading dark mode setting:', e);
        }
    }
}

function setupEventListeners() {
    // Rating stars
    const stars = document.querySelectorAll('.star');
    stars.forEach(star => {
        star.addEventListener('click', function() {
            const rating = parseInt(this.dataset.rating);
            setRating(rating);
        });
    });

    // Save rating button
    document.getElementById('save-rating').addEventListener('click', saveSessionRating);

    // History tabs
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            switchHistoryTab(this.dataset.tab);
        });
    });
}

async function loadProgressData() {
    // Load current session stats
    const todayPomodoros = parseInt(localStorage.getItem('pomodorosCompleted') || '0');
    const todayFocusTime = parseInt(localStorage.getItem('totalFocusTime') || '0');
    const currentStreak = parseInt(localStorage.getItem('currentStreak') || '0');

    // Load session history from localStorage as fallback
    sessionHistory = JSON.parse(localStorage.getItem('sessionHistory') || '[]');

    // Try to load from backend API
    try {
        const response = await fetch('/api/stats/summary');
        if (response.ok) {
            const backendStats = await response.json();
            // Merge backend data with local data (prefer backend for historical data)
            if (backendStats.recentSessions && backendStats.recentSessions.length > 0) {
                sessionHistory = backendStats.recentSessions.map(session => ({
                    date: session.date,
                    pomodoros: session.pomodoros,
                    rating: session.rating,
                    notes: session.notes,
                    focusTime: session.focusTime
                }));
                // Save merged data back to localStorage
                localStorage.setItem('sessionHistory', JSON.stringify(sessionHistory));
            }
        }
    } catch (error) {
        console.log('Backend not available, using local data:', error);
    }

    // Load achievements
    achievements = JSON.parse(localStorage.getItem('achievements') || '{}');

    updateStatsDisplay(todayPomodoros, todayFocusTime, currentStreak);
}

function updateStatsDisplay(todayPomodoros, todayFocusTime, currentStreak) {
    document.getElementById('today-pomodoros').textContent = todayPomodoros;
    document.getElementById('today-focus-time').textContent = todayFocusTime;
    document.getElementById('current-streak').textContent = currentStreak;

    // Calculate weekly average
    const weeklyAverage = calculateWeeklyAverage();
    document.getElementById('weekly-average').textContent = weeklyAverage.toFixed(1);
}

function calculateWeeklyAverage() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const weekSessions = sessionHistory.filter(session => {
        const sessionDate = new Date(session.date);
        return sessionDate >= weekAgo;
    });

    if (weekSessions.length === 0) return 0;

    const totalPomodoros = weekSessions.reduce((sum, session) => sum + session.pomodoros, 0);
    return totalPomodoros / 7; // Average per day
}

function updateProgressDisplay() {
    const grid = document.getElementById('progress-grid');
    grid.innerHTML = '';

    // Show last 12 pomodoros or progress indicators
    const recentSessions = sessionHistory.slice(-12);

    for (let i = 0; i < 12; i++) {
        const item = document.createElement('div');
        item.className = 'progress-item';

        if (i < recentSessions.length) {
            const session = recentSessions[recentSessions.length - 1 - i]; // Most recent first
            if (session.rating > 0) {
                item.classList.add('rated');
                item.innerHTML = getRatingStars(session.rating);
            } else {
                item.classList.add('completed');
                item.textContent = '✓';
            }
            item.title = `${session.pomodoros} pomodoros on ${new Date(session.date).toLocaleDateString()}`;
        } else {
            item.textContent = '-';
            item.classList.add('empty');
        }

        grid.appendChild(item);
    }
}

function getRatingStars(rating) {
    const stars = '★★★★★'.substring(0, rating);
    return `<span class="rating-stars">${stars}</span>`;
}

function setRating(rating) {
    currentRating = rating;

    // Update star display
    const stars = document.querySelectorAll('.star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });

    // Update rating text
    const ratingTexts = {
        1: 'Poor',
        2: 'Below Average',
        3: 'Average',
        4: 'Good',
        5: 'Excellent'
    };

    document.getElementById('rating-text').textContent = ratingTexts[rating] || 'Click to rate';
}

async function saveSessionRating() {
    if (currentRating === 0) {
        showError('Please select a rating first');
        return;
    }

    const notes = document.getElementById('session-notes').value.trim();
    const todayPomodoros = parseInt(localStorage.getItem('pomodorosCompleted') || '0');

    const sessionData = {
        date: new Date().toISOString(),
        pomodoros: todayPomodoros,
        rating: currentRating,
        notes: notes,
        focusTime: parseInt(localStorage.getItem('totalFocusTime') || '0')
    };

    // Save to localStorage
    sessionHistory.push(sessionData);
    localStorage.setItem('sessionHistory', JSON.stringify(sessionHistory));

    // Try to save to backend API
    try {
        const response = await fetch('/api/stats/session', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(sessionData)
        });

        if (!response.ok) {
            console.warn('Failed to save to backend, but saved locally');
        }
    } catch (error) {
        console.log('Backend not available, saved locally only:', error);
    }

    // Reset form
    setRating(0);
    document.getElementById('session-notes').value = '';
    document.getElementById('rating-stars').classList.remove('active');

    // Update display
    updateProgressDisplay();
    updateHistoryStats();
    checkAchievements();

    showSuccess('Session rating saved!');
}

function switchHistoryTab(tab) {
    // Update tab buttons
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(btn => btn.classList.remove('active'));
    document.querySelector(`[data-tab="${tab}"]`).classList.add('active');

    updateHistoryStats(tab);
}

function updateHistoryStats(period = 'week') {
    const now = new Date();
    let startDate;

    switch (period) {
        case 'week':
            startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            break;
        case 'month':
            startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            break;
        case 'all':
            startDate = new Date(0); // Beginning of time
            break;
    }

    const periodSessions = sessionHistory.filter(session => {
        const sessionDate = new Date(session.date);
        return sessionDate >= startDate;
    });

    const totalPomodoros = periodSessions.reduce((sum, session) => sum + session.pomodoros, 0);
    const totalFocusTime = periodSessions.reduce((sum, session) => sum + (session.focusTime || 0), 0);
    const averageRating = periodSessions.length > 0
        ? (periodSessions.reduce((sum, session) => sum + session.rating, 0) / periodSessions.length).toFixed(1)
        : 0;

    // Find best streak in history
    const bestStreak = findBestStreak();

    document.getElementById('period-pomodoros').textContent = totalPomodoros;
    document.getElementById('period-focus-time').textContent = totalFocusTime;
    document.getElementById('average-rating').textContent = averageRating;
    document.getElementById('best-streak').textContent = bestStreak;

    updateRatingHistory(periodSessions);
}

function findBestStreak() {
    const sortedSessions = [...sessionHistory].sort((a, b) => new Date(a.date) - new Date(b.date));

    let maxStreak = 0;
    let currentStreak = 0;
    let lastDate = null;

    for (const session of sortedSessions) {
        const sessionDate = new Date(session.date).toDateString();

        if (lastDate === null || isConsecutiveDay(lastDate, sessionDate)) {
            currentStreak++;
            maxStreak = Math.max(maxStreak, currentStreak);
        } else {
            currentStreak = 1;
        }

        lastDate = sessionDate;
    }

    return maxStreak;
}

function isConsecutiveDay(date1, date2) {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    const diffTime = Math.abs(d2 - d1);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays === 1;
}

function updateRatingHistory(sessions) {
    const ratingHistory = document.getElementById('rating-history');
    ratingHistory.innerHTML = '';

    if (sessions.length === 0) {
        ratingHistory.innerHTML = '<div class="no-data">No sessions in this period</div>';
        return;
    }

    // Group by date and show recent sessions
    const recentSessions = sessions.slice(-10).reverse(); // Last 10 sessions

    recentSessions.forEach(session => {
        const sessionDiv = document.createElement('div');
        sessionDiv.className = 'rating-history-item';

        const date = new Date(session.date).toLocaleDateString();
        const stars = getRatingStars(session.rating);

        sessionDiv.innerHTML = `
            <div class="rating-date">${date}</div>
            <div class="rating-stars">${stars}</div>
            <div class="rating-pomodoros">${session.pomodoros} pomodoros</div>
            ${session.notes ? `<div class="rating-notes">${session.notes}</div>` : ''}
        `;

        ratingHistory.appendChild(sessionDiv);
    });
}

function checkAchievements() {
    const totalPomodoros = sessionHistory.reduce((sum, session) => sum + session.pomodoros, 0);
    const currentStreak = parseInt(localStorage.getItem('currentStreak') || '0');

    const achievementChecks = {
        'first-pomodoro': totalPomodoros >= 1,
        'week-warrior': calculateWeeklyTotal() >= 7,
        'streak-master': currentStreak >= 10,
        'focus-champion': totalPomodoros >= 50
    };

    // Update achievement states
    Object.keys(achievementChecks).forEach(achievementId => {
        const isUnlocked = achievementChecks[achievementId];
        achievements[achievementId] = isUnlocked;

        const achievementCard = document.querySelector(`[data-achievement="${achievementId}"]`);
        if (achievementCard) {
            if (isUnlocked) {
                achievementCard.classList.remove('locked');
                achievementCard.classList.add('unlocked');
            } else {
                achievementCard.classList.add('locked');
                achievementCard.classList.remove('unlocked');
            }
        }
    });

    // Save achievements
    localStorage.setItem('achievements', JSON.stringify(achievements));
}

function calculateWeeklyTotal() {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    return sessionHistory
        .filter(session => new Date(session.date) >= weekAgo)
        .reduce((sum, session) => sum + session.pomodoros, 0);
}

function goBack() {
    window.location.href = '/';
}

function showSuccess(message) {
    showMessage(message, 'success');
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

    // Add to page
    document.body.appendChild(messageDiv);

    // Auto-remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}