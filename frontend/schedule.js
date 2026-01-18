// Schedule & Timeline Management
let currentPriorityEvent = null;
let selectedDate = new Date().toISOString().split('T')[0];
let currentView = 'timeline'; // 'timeline' or 'calendar'
let calendarStartDate = new Date(); // Start of the week for calendar view

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
    document.getElementById('view-mode').addEventListener('change', handleViewModeChange);
    document.getElementById('schedule-add-task-btn').addEventListener('click', addTaskFromSchedule);

    // Calendar navigation
    document.getElementById('prev-week').addEventListener('click', () => navigateCalendar(-7));
    document.getElementById('next-week').addEventListener('click', () => navigateCalendar(7));

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

    // Get the actual width of the timeline container after CSS is applied
    const timelineRect = timeline.getBoundingClientRect();
    // Subtract padding from timelineWidth to get the usable content width for positioning
    const style = getComputedStyle(timeline);
    const paddingLeft = parseFloat(style.paddingLeft);
    const paddingRight = parseFloat(style.paddingRight);
    const timelineContentWidth = timelineRect.width - paddingLeft - paddingRight;
    const hourWidth = timelineContentWidth / 24;

    // Add time markers above the timeline
    for (let hour = 0; hour <= 24; hour++) {
        const marker = document.createElement('div');
        marker.className = 'time-marker';
        // Position markers relative to the content area, adjusting for padding
        marker.style.left = (paddingLeft + hour * hourWidth) + 'px';
        marker.textContent = hour === 24 ? '24:00' : `${hour.toString().padStart(2, '0')}:00`;
        timeline.appendChild(marker);
    }

    // Add priority event first if it exists
    if (currentPriorityEvent && currentPriorityEvent.date === selectedDate) {
        const priorityBlock = createPriorityEventBlock(currentPriorityEvent, hourWidth, paddingLeft);
        timeline.appendChild(priorityBlock);
    }

    if (tasks.length === 0 && !currentPriorityEvent) {
        const noSchedule = document.createElement('div');
        noSchedule.className = 'no-schedule';
        noSchedule.textContent = 'No tasks scheduled for this date';
        noSchedule.style.position = 'absolute';
        noSchedule.style.top = '50%';
        noSchedule.style.left = '50%';
        noSchedule.style.transform = 'translate(-50%, -50%)';
        noSchedule.style.color = '#6c757d';
        noSchedule.style.fontSize = '1.1rem';
        timeline.appendChild(noSchedule);
        return;
    }

    // Sort tasks by start time
    tasks.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Create timeline blocks for tasks
    tasks.forEach(task => {
        const block = createTaskBlock(task, hourWidth, paddingLeft);
        timeline.appendChild(block);
    });
}

function createPriorityEventBlock(event, hourWidth, paddingLeft) {
    const block = document.createElement('div');
    block.className = 'timeline-block priority-event';

    const startHour = parseInt(event.startTime.split(':')[0]);
    const startMinute = parseInt(event.startTime.split(':')[1]);
    const endHour = parseInt(event.endTime.split(':')[0]);
    const endMinute = parseInt(event.endTime.split(':')[1]);

    const startMinutes = startHour * 60 + startMinute;
    const endMinutes = endHour * 60 + endMinute;
    const durationMinutes = Math.max(endMinutes - startMinutes, 30); // Minimum 30 minutes for visibility

    // Calculate position and width using pixel values, adjusting for padding
    const leftPosition = paddingLeft + (startMinutes / (24 * 60)) * (24 * hourWidth);
    const width = Math.max((durationMinutes / (24 * 60)) * (24 * hourWidth), 80); // Minimum 80px width

    block.style.left = leftPosition + 'px';
    block.style.width = width + 'px';

    block.innerHTML = `
        <div class="timeline-content">
            <div class="timeline-title">⭐ ${escapeHtml(event.title)}</div>
            <div class="timeline-priority">PRIORITY</div>
        </div>
    `;

    return block;
}

function createTaskBlock(task, hourWidth, paddingLeft) {
    const block = document.createElement('div');
    block.className = `timeline-block timeline-${task.status.toLowerCase()}`;

    const startHour = parseInt(task.startTime.split(':')[0]);
    const startMinute = parseInt(task.startTime.split(':')[1]);
    const endHour = parseInt(task.endTime.split(':')[0]);
    const endMinute = parseInt(task.endTime.split(':')[1]);

    const isMultiDay = (endHour * 60 + endMinute) < (startHour * 60 + startMinute);

    if (isMultiDay) {
        block.classList.add('multi-day-task');
    }

    const startMinutes = startHour * 60 + startMinute;
    let endMinutes;

    if (isMultiDay) {
        endMinutes = 24 * 60; // End of day for multi-day tasks
    } else {
        endMinutes = endHour * 60 + endMinute;
    }

    const durationMinutes = Math.max(endMinutes - startMinutes, 15); // Minimum 15 minutes for visibility

    // Calculate position and width using pixel values, adjusting for padding
    const leftPosition = paddingLeft + (startMinutes / (24 * 60)) * (24 * hourWidth);
    const width = Math.max((durationMinutes / (24 * 60)) * (24 * hourWidth), 60); // Minimum 60px width

    block.style.position = 'absolute';
    block.style.left = leftPosition + 'px';
    block.style.width = width + 'px';

    block.innerHTML = `
        <div class="timeline-content">
            <div class="timeline-title">${escapeHtml(task.description)}${isMultiDay ? ' 🌙' : ''}</div>
            <div class="timeline-priority">${task.priority}</div>
        </div>
    `;

    block.addEventListener('click', () => showTaskDetails(task));

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
    if (currentView === 'timeline') {
        loadScheduleTimeline();
    } else {
        loadCalendarView();
    }
}

function handleViewModeChange(event) {
    currentView = event.target.value;

    const timelineView = document.getElementById('timeline-view');
    const calendarView = document.getElementById('calendar-view');
    const dateControl = document.querySelector('label[for="timeline-date"]').parentElement;

    if (currentView === 'timeline') {
        timelineView.style.display = 'block';
        calendarView.style.display = 'none';
        dateControl.style.display = 'block';
        loadScheduleTimeline();
    } else {
        timelineView.style.display = 'none';
        calendarView.style.display = 'block';
        dateControl.style.display = 'none';
        loadCalendarView();
    }
}

function navigateCalendar(days) {
    calendarStartDate.setDate(calendarStartDate.getDate() + days);
    loadCalendarView();
}

async function loadCalendarView() {
    try {
        // Calculate the week start (Sunday) and end (Saturday)
        const weekStart = new Date(calendarStartDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Go to Sunday

        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6); // Go to Saturday

        // Update calendar title
        const titleElement = document.getElementById('calendar-title');
        const weekStartStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const weekEndStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        titleElement.textContent = `${weekStartStr} - ${weekEndStr}`;

        // Fetch tasks for the entire week
        const weekTasks = {};
        for (let i = 0; i < 7; i++) {
            const currentDate = new Date(weekStart);
            currentDate.setDate(currentDate.getDate() + i);
            const dateStr = currentDate.toISOString().split('T')[0];

            try {
                const tasks = await fetchTasksForDate(dateStr);
                weekTasks[dateStr] = tasks;
            } catch (error) {
                console.error(`Error fetching tasks for ${dateStr}:`, error);
                weekTasks[dateStr] = [];
            }
        }

        // Render calendar
        renderCalendar(weekStart, weekTasks);

    } catch (error) {
        console.error('Error loading calendar view:', error);
        showMessage('Failed to load calendar', 'error');
    }
}

function renderCalendar(weekStart, weekTasks) {
    const calendarDays = document.getElementById('calendar-days');
    calendarDays.innerHTML = '';

    const today = new Date().toISOString().split('T')[0];

    for (let i = 0; i < 7; i++) {
        const currentDate = new Date(weekStart);
        currentDate.setDate(currentDate.getDate() + i);
        const dateStr = currentDate.toISOString().split('T')[0];
        const dayNumber = currentDate.getDate();

        const dayElement = document.createElement('div');
        dayElement.className = `calendar-day ${dateStr === today ? 'today' : ''}`;

        dayElement.innerHTML = `<div class="calendar-day-number">${dayNumber}</div>`;

        // Add tasks for this day
        const dayTasks = weekTasks[dateStr] || [];
        dayTasks.forEach(task => {
            const taskElement = document.createElement('div');
            taskElement.className = `calendar-task ${task.status.toLowerCase()}`;
            taskElement.textContent = task.description;
            taskElement.title = `${task.description} (${task.startTime} - ${task.endTime})`;
            taskElement.addEventListener('click', () => editTask(task.id));
            dayElement.appendChild(taskElement);
        });

        calendarDays.appendChild(dayElement);
    }
}

function refreshTimeline() {
    if (currentView === 'timeline') {
        loadScheduleTimeline();
        showMessage('Timeline refreshed', 'info');
    } else {
        loadCalendarView();
        showMessage('Calendar refreshed', 'info');
    }
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
    const prioritySelect = document.getElementById('task-priority');

    const taskText = taskInput.value.trim();
    const startValue = startDatetime.value;
    const endValue = endDatetime.value;
    const priority = prioritySelect.value;

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

    const requestData = {
        description: taskText,
        startTime: startTime,
        endTime: endTime,
        date: date,
        priority: priority
    };

    // console.log('Sending task creation request:', requestData);

    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestData)
        });

        const responseText = await response.text();
        // console.log('Response status:', response.status);
        // console.log('Response text:', responseText);

        if (!response.ok) {
            // console.error('Task creation failed:', response.status, errorText);
            showMessage(`Failed to add task: ${responseText || 'Unknown error'}`, 'error');
            return;
        }

        // Clear form and reset to defaults
        taskInput.value = '';
        setDefaultDatetimeValues();

        // Refresh display based on current view
        if (currentView === 'timeline') {
            loadScheduleTimeline();
        } else {
            loadCalendarView();
        }

        showMessage('Task added successfully!', 'success');

    } catch (error) {
        // console.error('Error adding task:', error);
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

// Task Details Modal
function showTaskDetails(task) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'task-modal-overlay';
    modal.innerHTML = `
        <div class="task-modal">
            <div class="task-modal-header">
                <h3>Task Details</h3>
                <button class="modal-close-btn" onclick="closeTaskModal()">×</button>
            </div>
            <div class="task-modal-content">
                <div class="task-detail-row">
                    <strong>Description:</strong>
                    <span>${escapeHtml(task.description)}</span>
                </div>
                <div class="task-detail-row">
                    <strong>Time:</strong>
                    <span>${task.startTime} - ${task.endTime}</span>
                </div>
                <div class="task-detail-row">
                    <strong>Date:</strong>
                    <span>${formatDate(task.date)}</span>
                </div>
                <div class="task-detail-row">
                    <strong>Status:</strong>
                    <span class="status-badge status-${task.status.toLowerCase()}">${task.status.replace('_', ' ')}</span>
                </div>
                <div class="task-detail-row">
                    <strong>Priority:</strong>
                    <span>${task.priority}</span>
                </div>
                <div class="task-detail-row">
                    <strong>Duration:</strong>
                    <span>${calculateDuration(task.startTime, task.endTime)}</span>
                </div>
            </div>
            <div class="task-modal-actions">
                <button class="modal-btn edit-btn" onclick="editTask('${task.id}')">Edit Task</button>
                <button class="modal-btn close-btn" onclick="closeTaskModal()">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Prevent background scrolling
    document.body.style.overflow = 'hidden';

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closeTaskModal();
        }
    });

    // Close modal on escape key
    document.addEventListener('keydown', handleEscapeKey);
}

function closeTaskModal() {
    const modal = document.querySelector('.task-modal-overlay');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handleEscapeKey);
    }
}

function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeTaskModal();
    }
}

function calculateDuration(startTime, endTime) {
    const start = new Date(`2000-01-01T${startTime}`);
    const end = new Date(`2000-01-01T${endTime}`);

    if (end < start) {
        // Multi-day task
        const nextDay = new Date(end);
        nextDay.setDate(nextDay.getDate() + 1);
        const durationMs = nextDay - start;
        const hours = Math.floor(durationMs / (1000 * 60 * 60));
        const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
        return `${hours}h ${minutes}m (multi-day)`;
    }

    const durationMs = end - start;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
        return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
}

function goBack() {
    window.location.href = 'index.html';
}
