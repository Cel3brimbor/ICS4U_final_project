// Schedule & Timeline Management
let currentPriorityEvent = null;
let selectedDate = new Date().toISOString().split('T')[0];

// Initialize the schedule page
document.addEventListener('DOMContentLoaded', function() {
    initializeSchedulePage();
    loadPriorityEvent();
    loadScheduleTimeline();
});

function initializeSchedulePage() {
    // Set default date to today
    document.getElementById('timeline-date').value = selectedDate;

    // Set default datetime values (current time for start, +1 hour for end)
    setDefaultDatetimeValues();

    // Event listeners
    document.getElementById('set-priority-event').addEventListener('click', setPriorityEvent);
    document.getElementById('clear-priority-event').addEventListener('click', clearPriorityEvent);
    document.getElementById('refresh-timeline').addEventListener('click', refreshTimeline);
    document.getElementById('timeline-date').addEventListener('change', handleDateChange);
    document.getElementById('schedule-add-task-btn').addEventListener('click', addTaskFromSchedule);

    // Load settings for dark mode
    loadSettings();
}

function setDefaultDatetimeValues() {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000); // Add 1 hour

    // Format for datetime-local input (YYYY-MM-DDTHH:mm)
    const formatDatetime = (date) => {
        return date.toISOString().slice(0, 16);
    };

    document.getElementById('schedule-start-datetime').value = formatDatetime(now);
    document.getElementById('schedule-end-datetime').value = formatDatetime(oneHourLater);
}

function loadSettings() {
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
        try {
            const settings = JSON.parse(savedSettings);
            if (settings.darkMode) {
                document.body.classList.add('dark-mode');
            }
        } catch (e) {
            console.error('Error loading settings:', e);
        }
    }
}

// Priority Event Management
function setPriorityEvent() {
    const title = document.getElementById('priority-title').value.trim();
    const startTime = document.getElementById('priority-start').value;
    const endTime = document.getElementById('priority-end').value;

    if (!title || !startTime || !endTime) {
        showMessage('Please fill in all fields for the priority event', 'error');
        return;
    }

    if (startTime >= endTime) {
        showMessage('End time must be after start time', 'error');
        return;
    }

    currentPriorityEvent = {
        id: 'priority-event',
        title: title,
        startTime: startTime,
        endTime: endTime,
        date: selectedDate,
        type: 'priority'
    };

    savePriorityEvent();
    displayPriorityEvent();
    loadScheduleTimeline(); // Refresh timeline to show priority event
    showMessage('Priority event set successfully!', 'success');
}

function clearPriorityEvent() {
    currentPriorityEvent = null;
    localStorage.removeItem('priorityEvent');
    document.getElementById('current-priority-display').style.display = 'none';
    document.getElementById('priority-title').value = '';
    document.getElementById('priority-start').value = '';
    document.getElementById('priority-end').value = '';
    loadScheduleTimeline();
    showMessage('Priority event cleared', 'info');
}

function savePriorityEvent() {
    localStorage.setItem('priorityEvent', JSON.stringify(currentPriorityEvent));
}

function loadPriorityEvent() {
    const saved = localStorage.getItem('priorityEvent');
    if (saved) {
        currentPriorityEvent = JSON.parse(saved);
        displayPriorityEvent();
    }
}

function displayPriorityEvent() {
    if (!currentPriorityEvent) return;

    const displayDiv = document.getElementById('current-priority-display');
    const eventCard = document.getElementById('priority-event-card');

    displayDiv.style.display = 'block';
    eventCard.innerHTML = `
        <div class="priority-event-content">
            <div class="priority-event-title">${escapeHtml(currentPriorityEvent.title)}</div>
            <div class="priority-event-time">${currentPriorityEvent.startTime} - ${currentPriorityEvent.endTime}</div>
            <div class="priority-event-date">Date: ${formatDate(currentPriorityEvent.date)}</div>
        </div>
    `;

    // Fill form with current values
    document.getElementById('priority-title').value = currentPriorityEvent.title;
    document.getElementById('priority-start').value = currentPriorityEvent.startTime;
    document.getElementById('priority-end').value = currentPriorityEvent.endTime;
}

// Timeline Management
async function loadScheduleTimeline() {
    try {
        const response = await fetch('/api/tasks');
        const tasks = await response.json();

        // Filter tasks for selected date
        const dateTasks = tasks.filter(task => {
            const taskDate = new Date(task.date).toISOString().split('T')[0];
            return taskDate === selectedDate;
        });

        updateScheduleTimeline(dateTasks);
        updateScheduleStats(dateTasks);
    } catch (error) {
        console.error('Error loading schedule timeline:', error);
        showMessage('Failed to load schedule', 'error');
    }
}

function updateScheduleTimeline(tasks) {
    const timeline = document.getElementById('schedule-timeline');
    if (!timeline) return;

    timeline.innerHTML = '';

    // Add priority event first if it exists
    if (currentPriorityEvent && currentPriorityEvent.date === selectedDate) {
        const priorityBlock = createPriorityEventBlock(currentPriorityEvent);
        timeline.appendChild(priorityBlock);
    }

    if (tasks.length === 0 && !currentPriorityEvent) {
        timeline.innerHTML = '<div class="no-schedule">No tasks scheduled for this date</div>';
        return;
    }

    // Sort tasks by start time
    tasks.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Create timeline blocks for tasks
    tasks.forEach(task => {
        const block = createTaskBlock(task);
        timeline.appendChild(block);
    });
}

function createPriorityEventBlock(event) {
    const block = document.createElement('div');
    block.className = 'timeline-block priority-event';

    const startHour = parseInt(event.startTime.split(':')[0]);
    const startMinute = parseInt(event.startTime.split(':')[1]);
    const endHour = parseInt(event.endTime.split(':')[0]);
    const endMinute = parseInt(event.endTime.split(':')[1]);

    const startPosition = (startHour * 60 + startMinute) / (24 * 60) * 100;
    const duration = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / (24 * 60) * 100;

    block.style.left = startPosition + '%';
    block.style.width = Math.max(duration, 2) + '%'; // Minimum width for visibility

    block.innerHTML = `
        <div class="timeline-content">
            <div class="timeline-title">⭐ ${escapeHtml(event.title)}</div>
            <div class="timeline-time">${event.startTime} - ${event.endTime}</div>
        </div>
    `;

    return block;
}

function createTaskBlock(task) {
    const block = document.createElement('div');
    block.className = `timeline-block timeline-${task.status.toLowerCase()}`;

    const startHour = parseInt(task.startTime.split(':')[0]);
    const startMinute = parseInt(task.startTime.split(':')[1]);
    const endHour = parseInt(task.endTime.split(':')[0]);
    const endMinute = parseInt(task.endTime.split(':')[1]);

    // Check if this is a multi-day task (end time is before start time)
    const isMultiDay = (endHour * 60 + endMinute) < (startHour * 60 + startMinute);

    const startPosition = (startHour * 60 + startMinute) / (24 * 60) * 100;

    let duration;
    let endTimeDisplay = task.endTime;

    if (isMultiDay) {
        // Multi-day task: show from start time to end of day (23:59)
        duration = (24 * 60 - (startHour * 60 + startMinute)) / (24 * 60) * 100;
        endTimeDisplay = "23:59 (next day)";
        block.classList.add('multi-day-task');
    } else {
        // Single-day task
        duration = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / (24 * 60) * 100;
    }

    block.style.left = startPosition + '%';
    block.style.width = Math.max(duration, 1) + '%';

    block.innerHTML = `
        <div class="timeline-content">
            <div class="timeline-title">${escapeHtml(task.description)}${isMultiDay ? ' 🌙' : ''}</div>
            <div class="timeline-time">${task.startTime} - ${endTimeDisplay}</div>
            <div class="timeline-priority">${task.priority}</div>
        </div>
    `;

    // Add click handler to edit task
    block.addEventListener('click', () => editTask(task.id));

    return block;
}

function updateScheduleStats(tasks) {
    const totalTasks = tasks.length;
    let totalScheduledMinutes = 0;
    let completedTasks = 0;

    tasks.forEach(task => {
        const startMinutes = timeToMinutes(task.startTime);
        const endMinutes = timeToMinutes(task.endTime);
        totalScheduledMinutes += (endMinutes - startMinutes);

        if (task.status === 'COMPLETED') {
            completedTasks++;
        }
    });

    const scheduledHours = (totalScheduledMinutes / 60).toFixed(1);
    const freeHours = (24 - scheduledHours).toFixed(1);
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    document.getElementById('total-tasks').textContent = totalTasks;
    document.getElementById('scheduled-hours').textContent = scheduledHours;
    document.getElementById('free-hours').textContent = freeHours;
    document.getElementById('completion-rate').textContent = completionRate + '%';
}

// Utility Functions
function timeToMinutes(timeString) {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 60 + minutes;
}

function handleDateChange(event) {
    selectedDate = event.target.value;
    loadScheduleTimeline();
}

function refreshTimeline() {
    loadScheduleTimeline();
    showMessage('Timeline refreshed', 'info');
}

function scrollToTaskForm() {
    // Scroll to the task creation form
    document.querySelector('.task-input-section').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('schedule-task-input').focus();
}

function addTaskToTimeline() {
    // Navigate back to main page and scroll to task planner
    window.location.href = 'index.html#task-planner';
}

// Add task directly from schedule page
async function addTaskFromSchedule() {
    const taskInput = document.getElementById('schedule-task-input');
    const startDatetime = document.getElementById('schedule-start-datetime');
    const endDatetime = document.getElementById('schedule-end-datetime');

    const taskText = taskInput.value.trim();
    const startValue = startDatetime.value;
    const endValue = endDatetime.value;

    if (!taskText || !startValue || !endValue) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    // Parse datetime values
    const startDateTime = new Date(startValue);
    const endDateTime = new Date(endValue);

    if (startDateTime >= endDateTime) {
        showMessage('End date/time must be after start date/time', 'error');
        return;
    }

    // Extract date and time components for backend compatibility
    const date = startDateTime.toISOString().split('T')[0]; // YYYY-MM-DD format
    const startTime = startDateTime.toTimeString().slice(0, 5); // HH:mm format
    const endTime = endDateTime.toTimeString().slice(0, 5); // HH:mm format

    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: taskText,
                startTime: startTime,
                endTime: endTime,
                date: date,
                priority: 'MEDIUM'
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add task');
        }

        // Clear form and reset to defaults
        taskInput.value = '';
        setDefaultDatetimeValues();

        // Refresh timeline - check if task appears on current selected date
        // For multi-day tasks, we'll show them on the start date
        loadScheduleTimeline();

        showMessage('Task added successfully!', 'success');

    } catch (error) {
        console.error('Error adding task:', error);
        showMessage('Failed to add task', 'error');
    }
}

function editTask(taskId) {
    // Navigate back to main page and scroll to task planner
    window.location.href = `index.html#task-planner`;
    // Could add logic to highlight specific task for editing
}

async function editTimelineWithAI() {
    try {
        const tasks = await fetchTasksForDate(selectedDate);
        const scheduleData = {
            date: selectedDate,
            tasks: tasks,
            priorityEvent: currentPriorityEvent
        };

        // Navigate to AI assistant with schedule context
        localStorage.setItem('aiScheduleContext', JSON.stringify(scheduleData));
        window.location.href = 'ai.html?mode=agent';
    } catch (error) {
        console.error('Error preparing AI schedule edit:', error);
        showMessage('Failed to open AI schedule assistant', 'error');
    }
}

async function fetchTasksForDate(date) {
    try {
        const response = await fetch('/api/tasks');
        const tasks = await response.json();
        return tasks.filter(task => {
            const taskDate = new Date(task.date).toISOString().split('T')[0];
            return taskDate === date;
        });
    } catch (error) {
        console.error('Error fetching tasks:', error);
        return [];
    }
}

function exportSchedule() {
    const scheduleData = {
        date: selectedDate,
        priorityEvent: currentPriorityEvent,
        exportedAt: new Date().toISOString()
    };

    // Add tasks data
    fetchTasksForDate(selectedDate).then(tasks => {
        scheduleData.tasks = tasks;

        const dataStr = JSON.stringify(scheduleData, null, 2);
        const dataBlob = new Blob([dataStr], {type: 'application/json'});

        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `schedule-${selectedDate}.json`;
        link.click();

        showMessage('Schedule exported successfully!', 'success');
    });
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showMessage(message, type = 'info') {
    // Create message notification
    const notification = document.createElement('div');
    notification.className = `message-notification ${type}`;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto remove after 3 seconds
    setTimeout(() => {
        if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
        }
    }, 3000);
}

function goBack() {
    window.location.href = 'index.html';
}
