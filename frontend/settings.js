document.addEventListener('DOMContentLoaded', function() {
    initializeSettings();
    setupEventListeners();
    loadSettings();
});

// Default settings
const defaultSettings = {
    // Appearance
    darkMode: false,
    compactView: false,

    // Account
    displayName: '',
    accountEmail: '',
    profilePicture: '',

    // Notifications
    timerNotifications: true,
    breakReminders: true,
    dailyGoals: false,
    soundEffects: true,

    // Privacy
    dataCollection: false,
    localOnly: true,

    // Timer Preferences
    pomodoroDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    autoStartBreaks: true
};

let currentSettings = {};

function initializeSettings() {
    console.log('Settings page initialized');
    // Apply dark mode if it's enabled
    applyDarkMode();
}

function setupEventListeners() {
    // Dark mode toggle
    document.getElementById('dark-mode-toggle').addEventListener('change', function() {
        currentSettings.darkMode = this.checked;
        applyDarkMode();
        saveSettings();
    });

    // Compact view toggle
    document.getElementById('compact-view-toggle').addEventListener('change', function() {
        currentSettings.compactView = this.checked;
        saveSettings();
    });

    // Account settings
    document.getElementById('display-name').addEventListener('input', function() {
        currentSettings.displayName = this.value;
    });

    document.getElementById('account-email').addEventListener('input', function() {
        currentSettings.accountEmail = this.value;
    });

    // Notification toggles
    document.getElementById('timer-notifications-toggle').addEventListener('change', function() {
        currentSettings.timerNotifications = this.checked;
        saveSettings();
    });

    document.getElementById('break-reminders-toggle').addEventListener('change', function() {
        currentSettings.breakReminders = this.checked;
        saveSettings();
    });

    document.getElementById('daily-goals-toggle').addEventListener('change', function() {
        currentSettings.dailyGoals = this.checked;
        saveSettings();
    });

    document.getElementById('sound-effects-toggle').addEventListener('change', function() {
        currentSettings.soundEffects = this.checked;
        saveSettings();
    });

    // Privacy toggles
    document.getElementById('data-collection-toggle').addEventListener('change', function() {
        currentSettings.dataCollection = this.checked;
        saveSettings();
    });

    document.getElementById('local-only-toggle').addEventListener('change', function() {
        currentSettings.localOnly = this.checked;
        saveSettings();
    });

    // Timer preference selects
    document.getElementById('pomodoro-duration').addEventListener('change', function() {
        currentSettings.pomodoroDuration = parseInt(this.value);
        saveSettings();
    });

    document.getElementById('short-break-duration').addEventListener('change', function() {
        currentSettings.shortBreakDuration = parseInt(this.value);
        saveSettings();
    });

    document.getElementById('long-break-duration').addEventListener('change', function() {
        currentSettings.longBreakDuration = parseInt(this.value);
        saveSettings();
    });

    document.getElementById('auto-start-breaks-toggle').addEventListener('change', function() {
        currentSettings.autoStartBreaks = this.checked;
        saveSettings();
    });
}

function loadSettings() {
    // Load settings from localStorage or use defaults
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
        try {
            currentSettings = { ...defaultSettings, ...JSON.parse(savedSettings) };
        } catch (e) {
            console.error('Error loading settings:', e);
            currentSettings = { ...defaultSettings };
        }
    } else {
        currentSettings = { ...defaultSettings };
    }

    // Apply settings to UI
    applySettingsToUI();
    updateNotificationStatus();
}

function updateNotificationStatus() {
    // Check current notification permission status
    if ('Notification' in window) {
        const permissionStatus = Notification.permission;
        const statusElement = document.createElement('div');
        statusElement.className = 'notification-status';

        let statusText = '';
        let statusClass = '';

        switch (permissionStatus) {
            case 'granted':
                statusText = '✅ Notifications enabled';
                statusClass = 'granted';
                break;
            case 'denied':
                statusText = '❌ Notifications blocked';
                statusClass = 'denied';
                break;
            case 'default':
                statusText = '⚠️ Click "Allow" when prompted';
                statusClass = 'default';
                break;
        }

        statusElement.textContent = statusText;
        statusElement.classList.add(statusClass);

        // Find notification section and add status
        const notificationSection = document.querySelector('.settings-section:has(h2:contains("🔔"))');
        if (notificationSection) {
            const existingStatus = notificationSection.querySelector('.notification-status');
            if (existingStatus) {
                existingStatus.remove();
            }
            notificationSection.appendChild(statusElement);
        }
    }
}

function requestNotificationPermission() {
    if ('Notification' in window) {
        Notification.requestPermission().then(function(permission) {
            console.log('Notification permission:', permission);
            updateNotificationStatus();

            if (permission === 'granted') {
                showSuccess('Notifications enabled! You will now receive timer alerts.');
            } else {
                showError('Notifications denied. Timer alerts will not work.');
            }
        });
    } else {
        showError('Notifications not supported in this browser.');
    }
}

function applySettingsToUI() {
    // Appearance
    document.getElementById('dark-mode-toggle').checked = currentSettings.darkMode;
    document.getElementById('compact-view-toggle').checked = currentSettings.compactView;

    // Account
    document.getElementById('display-name').value = currentSettings.displayName || '';
    document.getElementById('account-email').value = currentSettings.accountEmail || '';

    // Notifications
    document.getElementById('timer-notifications-toggle').checked = currentSettings.timerNotifications;
    document.getElementById('break-reminders-toggle').checked = currentSettings.breakReminders;
    document.getElementById('daily-goals-toggle').checked = currentSettings.dailyGoals;
    document.getElementById('sound-effects-toggle').checked = currentSettings.soundEffects;

    // Privacy
    document.getElementById('data-collection-toggle').checked = currentSettings.dataCollection;
    document.getElementById('local-only-toggle').checked = currentSettings.localOnly;

    // Timer Preferences
    document.getElementById('pomodoro-duration').value = currentSettings.pomodoroDuration;
    document.getElementById('short-break-duration').value = currentSettings.shortBreakDuration;
    document.getElementById('long-break-duration').value = currentSettings.longBreakDuration;
    document.getElementById('auto-start-breaks-toggle').checked = currentSettings.autoStartBreaks;
}

function saveSettings() {
    try {
        localStorage.setItem('appSettings', JSON.stringify(currentSettings));
        showSuccess('Settings saved successfully!');
    } catch (e) {
        console.error('Error saving settings:', e);
        showError('Failed to save settings');
    }
}

function applyDarkMode() {
    const body = document.body;
    if (currentSettings.darkMode) {
        body.classList.add('dark-mode');
    } else {
        body.classList.remove('dark-mode');
    }
}

function exportData() {
    try {
        const exportData = {
            settings: currentSettings,
            tasks: JSON.parse(localStorage.getItem('tasks') || '[]'),
            notes: JSON.parse(localStorage.getItem('notes') || '[]'),
            sessionHistory: JSON.parse(localStorage.getItem('sessionHistory') || '[]'),
            timerStats: {
                pomodorosCompleted: localStorage.getItem('pomodorosCompleted') || '0',
                totalFocusTime: localStorage.getItem('totalFocusTime') || '0',
                currentStreak: localStorage.getItem('currentStreak') || '0'
            },
            exportDate: new Date().toISOString()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `productivity-app-data-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        showSuccess('Data exported successfully!');
    } catch (e) {
        console.error('Error exporting data:', e);
        showError('Failed to export data');
    }
}

function clearAllData() {
    if (!confirm('Are you sure you want to clear ALL your data? This action cannot be undone!')) {
        return;
    }

    if (!confirm('This will permanently delete all your tasks, notes, progress, and settings. Are you absolutely sure?')) {
        return;
    }

    try {
        // Clear all app data
        localStorage.removeItem('tasks');
        localStorage.removeItem('notes');
        localStorage.removeItem('sessionHistory');
        localStorage.removeItem('pomodorosCompleted');
        localStorage.removeItem('totalFocusTime');
        localStorage.removeItem('currentStreak');
        localStorage.removeItem('appSettings');
        localStorage.removeItem('achievements');

        // Reset current settings to defaults
        currentSettings = { ...defaultSettings };
        applySettingsToUI();
        applyDarkMode();

        showSuccess('All data cleared successfully!');
    } catch (e) {
        console.error('Error clearing data:', e);
        showError('Failed to clear data');
    }
}

function resetToDefaults() {
    if (!confirm('Reset all settings to default values?')) {
        return;
    }

    currentSettings = { ...defaultSettings };
    applySettingsToUI();
    applyDarkMode();
    saveSettings();
    showSuccess('Settings reset to defaults!');
}

function uploadProfilePicture() {
    // Create a file input element
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';

    input.onchange = function(e) {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function(e) {
                currentSettings.profilePicture = e.target.result;
                saveSettings();
                showSuccess('Profile picture updated!');
            };
            reader.readAsDataURL(file);
        }
    };

    input.click();
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