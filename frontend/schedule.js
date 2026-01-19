let currentPriorityEvent = null;
let selectedDate = new Date().toISOString().split('T')[0];
let currentView = 'timeline'; 
let calendarStartDate = new Date(); 

document.addEventListener('DOMContentLoaded', function() {
    initializeSchedulePage();
    loadPriorityEvent();
    loadScheduleTimeline();
});

function initializeSchedulePage() {
    document.getElementById('timeline-date').value = selectedDate;

    setDefaultDatetimeValues();

    document.getElementById('set-priority-event').addEventListener('click', setPriorityEvent);
    document.getElementById('clear-priority-event').addEventListener('click', clearPriorityEvent);
    document.getElementById('refresh-timeline').addEventListener('click', refreshTimeline);
    document.getElementById('timeline-date').addEventListener('change', handleDateChange);
    document.getElementById('view-mode').addEventListener('change', handleViewModeChange);
    document.getElementById('schedule-add-task-btn').addEventListener('click', addTaskFromSchedule);

    document.getElementById('prev-week').addEventListener('click', () => navigateCalendar(-1));
    document.getElementById('next-week').addEventListener('click', () => navigateCalendar(1));

    loadSettings();
}

function setDefaultDatetimeValues() {
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);

    const formatTime = (date) => {
        return date.toTimeString().slice(0, 5); // HH:mm format
    };

    document.getElementById('schedule-start-time').value = formatTime(now);
    document.getElementById('schedule-end-time').value = formatTime(oneHourLater);
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
    loadScheduleTimeline();
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

    document.getElementById('priority-title').value = currentPriorityEvent.title;
    document.getElementById('priority-start').value = currentPriorityEvent.startTime;
    document.getElementById('priority-end').value = currentPriorityEvent.endTime;
}

async function loadScheduleTimeline() {
    try {
        const response = await fetch('/api/tasks');
        const tasks = await response.json();

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

    const timelineRect = timeline.getBoundingClientRect();
    const style = getComputedStyle(timeline);
    const paddingLeft = parseFloat(style.paddingLeft) || 20;
    const paddingRight = parseFloat(style.paddingRight) || 20;
    const timelineContentWidth = timelineRect.width - paddingLeft - paddingRight;
    const hourWidth = timelineContentWidth / 24;

    // Create time markers container at top
    const topMarkers = document.createElement('div');
    topMarkers.className = 'timeline-markers-top';
    for (let hour = 0; hour <= 24; hour++) {
        const marker = document.createElement('div');
        marker.className = 'time-marker-hour';
        marker.style.left = ((hour / 24) * 100) + '%';
        marker.textContent = hour === 24 ? '24:00' : `${hour.toString().padStart(2, '0')}:00`;
        topMarkers.appendChild(marker);
    }
    timeline.appendChild(topMarkers);

    // Create tasks container
    const tasksContainer = document.createElement('div');
    tasksContainer.className = 'timeline-tasks-container';
    timeline.appendChild(tasksContainer);

    if (tasks.length === 0 && !currentPriorityEvent) {
        const noSchedule = document.createElement('div');
        noSchedule.className = 'no-schedule';
        noSchedule.textContent = 'No tasks scheduled for this date';
        noSchedule.style.color = '#6c757d';
        noSchedule.style.fontSize = '1.1rem';
        tasksContainer.appendChild(noSchedule);
        return;
    }

    // Add priority event first if exists
    if (currentPriorityEvent && currentPriorityEvent.date === selectedDate) {
        const priorityBlock = createPriorityEventBlock(currentPriorityEvent, hourWidth, paddingLeft);
        tasksContainer.appendChild(priorityBlock);
    }

    // Sort tasks by start time
    tasks.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Position tasks with stacking
    const positionedTasks = positionTasksWithStacking(tasks, hourWidth, paddingLeft);

    // Create task blocks
    positionedTasks.forEach(taskData => {
        const block = createTaskBlock(taskData.task, hourWidth, paddingLeft, taskData.top);
        tasksContainer.appendChild(block);
    });

    // Create time markers container at bottom
    const bottomMarkers = document.createElement('div');
    bottomMarkers.className = 'timeline-markers-bottom';
    for (let hour = 0; hour <= 24; hour++) {
        const marker = document.createElement('div');
        marker.className = 'time-marker-hour';
        marker.style.left = ((hour / 24) * 100) + '%';
        marker.textContent = hour === 24 ? '24:00' : `${hour.toString().padStart(2, '0')}:00`;
        bottomMarkers.appendChild(marker);
    }
    timeline.appendChild(bottomMarkers);

    // Add date display at the bottom
    const dateMarker = document.createElement('div');
    dateMarker.className = 'timeline-date-marker';
    dateMarker.textContent = formatDate(selectedDate);
    timeline.appendChild(dateMarker);
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
    const durationMinutes = endMinutes - startMinutes;

    const leftPosition = paddingLeft + (startMinutes / (24 * 60)) * (24 * hourWidth);
    const width = Math.max((durationMinutes / (24 * 60)) * (24 * hourWidth), 60); 

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

function positionTasksWithStacking(tasks, hourWidth, paddingLeft) {
    const positionedTasks = [];
    const rows = []; 

    tasks.forEach(task => {
        const startHour = parseInt(task.startTime.split(':')[0]);
        const startMinute = parseInt(task.startTime.split(':')[1]);
        const endHour = parseInt(task.endTime.split(':')[0]);
        const endMinute = parseInt(task.endTime.split(':')[1]);

        const isMultiDay = (endHour * 60 + endMinute) < (startHour * 60 + startMinute);
        const startMinutes = startHour * 60 + startMinute;
        let endMinutes = isMultiDay ? 24 * 60 : endHour * 60 + endMinute;

        const leftPosition = paddingLeft + (startMinutes / (24 * 60)) * (24 * hourWidth);
        const width = Math.max((endMinutes - startMinutes) / (24 * 60) * (24 * hourWidth), 60);

        let rowIndex = 0;
        let foundRow = false;

        while (!foundRow) {
            if (!rows[rowIndex]) {
                rows[rowIndex] = [];
            }

            // Check if this task overlaps with any task in this row
            const overlaps = rows[rowIndex].some(existingTask => {
                return !(leftPosition + width <= existingTask.left ||
                        leftPosition >= existingTask.left + existingTask.width);
            });

            if (!overlaps) {
                // Task fits in this row
                rows[rowIndex].push({ left: leftPosition, width: width });
                foundRow = true;
            } else {
                // Try next row
                rowIndex++;
            }
        }

        positionedTasks.push({
            task: task,
            top: 10 + (rowIndex * 75) // 10px base + 75px per row
        });
    });

    return positionedTasks;
}

function createTaskBlock(task, hourWidth, paddingLeft, top = 10) {
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

    const durationMinutes = endMinutes - startMinutes;

    // Calculate position and width using pixel values, adjusting for padding
    // Width is proportional to actual duration, with minimum 60px for visibility
    const leftPosition = paddingLeft + (startMinutes / (24 * 60)) * (24 * hourWidth);
    const width = Math.max((durationMinutes / (24 * 60)) * (24 * hourWidth), 60);

    block.style.position = 'absolute';
    block.style.left = leftPosition + 'px';
    block.style.width = width + 'px';
    block.style.top = top + 'px';

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

function navigateCalendar(months) {
    calendarStartDate.setMonth(calendarStartDate.getMonth() + months);
    loadCalendarView();
}

async function loadCalendarView() {
    try {
        // Calculate the month start (1st of the month) and month boundaries
        const monthStart = new Date(calendarStartDate.getFullYear(), calendarStartDate.getMonth(), 1);
        const monthEnd = new Date(calendarStartDate.getFullYear(), calendarStartDate.getMonth() + 1, 0);

        // Calculate the calendar grid start (Sunday of the week containing month start)
        const calendarStart = new Date(monthStart);
        calendarStart.setDate(calendarStart.getDate() - calendarStart.getDay());

        // Calculate the calendar grid end (Saturday of the week containing month end)
        const calendarEnd = new Date(monthEnd);
        calendarEnd.setDate(calendarEnd.getDate() + (6 - calendarEnd.getDay()));

        // Update calendar title
        const titleElement = document.getElementById('calendar-title');
        const monthName = monthStart.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        titleElement.textContent = monthName;

        // Fetch tasks for the entire month
        const monthTasks = {};
        const currentDate = new Date(calendarStart);
        while (currentDate <= calendarEnd) {
            const dateStr = currentDate.toISOString().split('T')[0];

            try {
                const tasks = await fetchTasksForDate(dateStr);
                monthTasks[dateStr] = tasks;
            } catch (error) {
                console.error(`Error fetching tasks for ${dateStr}:`, error);
                monthTasks[dateStr] = [];
            }

            currentDate.setDate(currentDate.getDate() + 1);
        }

        // Render calendar
        renderCalendar(calendarStart, calendarEnd, monthTasks);

    } catch (error) {
        console.error('Error loading calendar view:', error);
        showMessage('Failed to load calendar', 'error');
    }
}

function renderCalendar(calendarStart, calendarEnd, monthTasks) {
    const calendarBody = document.getElementById('calendar-body');
    calendarBody.innerHTML = '';

    const today = new Date().toISOString().split('T')[0];
    const currentMonth = calendarStartDate.getMonth();
    const currentYear = calendarStartDate.getFullYear();

    // Calculate total days to display (6 weeks × 7 days = 42 days)
    const totalDays = Math.ceil((calendarEnd - calendarStart) / (1000 * 60 * 60 * 24)) + 1;

    // Create 6 rows (weeks)
    for (let week = 0; week < 6; week++) {
        const row = document.createElement('tr');

        // Create 7 cells per row (days)
        for (let day = 0; day < 7; day++) {
            const dayIndex = week * 7 + day;
            const currentDate = new Date(calendarStart);
            currentDate.setDate(currentDate.getDate() + dayIndex);
            const dateStr = currentDate.toISOString().split('T')[0];
            const dayNumber = currentDate.getDate();
            const isCurrentMonth = currentDate.getMonth() === currentMonth && currentDate.getFullYear() === currentYear;

            const cell = document.createElement('td');
            cell.className = `calendar-day ${dateStr === today ? 'today' : ''} ${!isCurrentMonth ? 'other-month' : ''}`;

            cell.innerHTML = `<div class="calendar-day-number">${dayNumber}</div>`;

            // Add tasks for this day
            const dayTasks = monthTasks[dateStr] || [];
            dayTasks.slice(0, 3).forEach(task => { // Limit to 3 tasks per day for space
                const taskElement = document.createElement('div');
                taskElement.className = `calendar-task ${task.status.toLowerCase()}`;
                taskElement.textContent = task.description.length > 15 ? task.description.substring(0, 15) + '...' : task.description;
                taskElement.title = `${task.description} (${task.startTime} - ${task.endTime})`;
                taskElement.addEventListener('click', () => editTask(task.id));
                cell.appendChild(taskElement);
            });

            // Add indicator if there are more tasks
            if (dayTasks.length > 3) {
                const moreIndicator = document.createElement('div');
                moreIndicator.className = 'calendar-more-tasks';
                moreIndicator.textContent = `+${dayTasks.length - 3} more`;
                moreIndicator.title = `${dayTasks.length - 3} additional tasks`;
                cell.appendChild(moreIndicator);
            }

            row.appendChild(cell);
        }

        calendarBody.appendChild(row);
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
    const startTimeInput = document.getElementById('schedule-start-time');
    const endTimeInput = document.getElementById('schedule-end-time');
    const prioritySelect = document.getElementById('schedule-task-priority');
    const selectedDate = document.getElementById('timeline-date').value;

    const taskText = taskInput.value.trim();
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const priority = prioritySelect.value;

    if (!taskText || !startTime || !endTime) {
        showMessage('Please fill in all fields', 'error');
        return;
    }

    if (startTime >= endTime) {
        showMessage('End time must be after start time', 'error');
        return;
    }

    const requestData = {
        description: taskText,
        startTime: startTime,
        endTime: endTime,
        date: selectedDate,
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
