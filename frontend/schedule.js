let currentPriorityEvent = null;
// Get today's date in local timezone as YYYY-MM-DD
const today = new Date();
let selectedDate = today.getFullYear() + '-' +
    String(today.getMonth() + 1).padStart(2, '0') + '-' +
    String(today.getDate()).padStart(2, '0');
let currentView = 'timeline'; 
let calendarStartDate = new Date(); 

document.addEventListener('DOMContentLoaded', function() {
    initializeSchedulePage();
    loadPriorityEvent();
    // Load timeline after a short delay to ensure everything is initialized
    setTimeout(() => {
        loadScheduleTimeline();
    }, 100);
});

// Refresh timeline when page becomes visible (user returns to tab)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        if (currentView === 'timeline') {
            loadScheduleTimeline();
        } else {
            loadCalendarView();
        }
    }
});

// Also refresh when window regains focus
window.addEventListener('focus', function() {
    if (currentView === 'timeline') {
        loadScheduleTimeline();
    } else {
        loadCalendarView();
    }
});

function initializeSchedulePage() {
    document.getElementById('timeline-date').value = selectedDate;

    setDefaultDatetimeValues();

    // Set default date for priority event
    document.getElementById('priority-date').value = selectedDate;

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

    const todayLocal = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0');
    const dateInput = document.getElementById('schedule-task-date');
    if (dateInput) {
        dateInput.value = todayLocal;
    }

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
    const date = document.getElementById('priority-date').value;
    const startTime = document.getElementById('priority-start').value;
    const endTime = document.getElementById('priority-end').value;

    if (!title || !date || !startTime || !endTime) {
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
        date: date,
        type: 'priority'
    };

    savePriorityEvent();
    displayPriorityEvent();

    // Refresh the current view
    if (currentView === 'timeline') {
        loadScheduleTimeline();
    } else {
        loadCalendarView();
    }

    showMessage('Priority event set successfully!', 'success');
}

function savePriorityEvent() {
    localStorage.setItem('priorityEvent', JSON.stringify(currentPriorityEvent));
}

function clearPriorityEvent() {
    currentPriorityEvent = null;
    localStorage.removeItem('priorityEvent');
    document.getElementById('current-priority-display').style.display = 'none';
    document.getElementById('priority-title').value = '';
    document.getElementById('priority-date').value = '';
    document.getElementById('priority-start').value = '';
    document.getElementById('priority-end').value = '';
    document.getElementById('priority-start').value = '';
    document.getElementById('priority-end').value = '';

    // Refresh the current view
    if (currentView === 'timeline') {
        loadScheduleTimeline();
    } else {
        loadCalendarView();
    }

    showMessage('Priority event cleared', 'info');
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
    document.getElementById('priority-date').value = currentPriorityEvent.date;
    document.getElementById('priority-start').value = currentPriorityEvent.startTime;
    document.getElementById('priority-end').value = currentPriorityEvent.endTime;
}

async function loadScheduleTimeline() {
    try {
        // First try to load from API
        const response = await fetch('/api/tasks');
        if (response.ok) {
            const apiTasks = await response.json();

            // Filter tasks for the selected date
            const dateTasks = apiTasks.filter(task => {
                const taskDate = new Date(task.date).toISOString().split('T')[0];
                return taskDate === selectedDate;
            });

            updateScheduleTimeline(dateTasks);
            updateScheduleStats(dateTasks);

            // Also merge with localStorage tasks for the same date
            try {
                const savedTasks = localStorage.getItem('savedTasks');
                if (savedTasks) {
                    const localTasks = JSON.parse(savedTasks);
                    const localDateTasks = localTasks.filter(task => {
                        let taskDate = task.date;
                        if (task.date && task.date.includes('T')) {
                            taskDate = task.date.split('T')[0];
                        }
                        return taskDate === selectedDate;
                    });

                    // Merge local tasks that aren't already in API tasks
                    const mergedTasks = [...dateTasks];
                    localDateTasks.forEach(localTask => {
                        const exists = mergedTasks.some(apiTask => apiTask.id === localTask.id);
                        if (!exists) {
                            mergedTasks.push(localTask);
                        }
                    });

                    if (mergedTasks.length > dateTasks.length) {
                        updateScheduleTimeline(mergedTasks);
                        updateScheduleStats(mergedTasks);
                    }
                }
            } catch (localError) {
            }
        } else {
            loadTimelineFromLocalStorage();
        }
    } catch (error) {
        console.error('Error loading timeline from API, trying localStorage:', error);
        loadTimelineFromLocalStorage();
    }
}

function loadTimelineFromLocalStorage() {
    try {
        // Try to get tasks from localStorage
        const savedTasks = localStorage.getItem('savedTasks');
        let localTasks = [];
        if (savedTasks) {
            localTasks = JSON.parse(savedTasks);
        }

        // Filter tasks for the selected date
        const dateTasks = localTasks.filter(task => {
            // Handle both date formats: YYYY-MM-DD and full ISO string
            let taskDate = task.date;
            if (task.date && task.date.includes('T')) {
                taskDate = task.date.split('T')[0];
            }
            return taskDate === selectedDate;
        });

        updateScheduleTimeline(dateTasks);
        updateScheduleStats(dateTasks);

        if (dateTasks.length === 0) {
            // Don't show message here, let the timeline display handle it
        }
    } catch (error) {
        console.error('Error loading from localStorage:', error);
        updateScheduleTimeline([]);
        updateScheduleStats([]);
        showMessage('Error loading tasks from storage.', 'error');
    }
}

function updateScheduleTimeline(tasks) {
    const timeline = document.getElementById('schedule-timeline');
    if (!timeline) {
        return;
    }

    timeline.innerHTML = '';

    // Get timeline dimensions for positioning
    const timelineRect = timeline.getBoundingClientRect();
    const style = getComputedStyle(timeline);
    const paddingLeft = parseFloat(style.paddingLeft) || 20;
    const paddingRight = parseFloat(style.paddingRight) || 20;
    const timelineWidth = timelineRect.width - paddingLeft - paddingRight;
    const hourWidth = timelineWidth / 24;

    // Time markers removed - tasks can be clicked to see details

    // Create content area for tasks
    const contentArea = document.createElement('div');
    contentArea.className = 'timeline-content-area';
    contentArea.style.position = 'relative';
    contentArea.style.height = '400px';
    contentArea.style.marginTop = '50px';
    contentArea.style.marginBottom = '20px';
    timeline.appendChild(contentArea);

    if (tasks.length === 0 && !currentPriorityEvent) {
        const noSchedule = document.createElement('div');
        noSchedule.className = 'no-schedule';
        noSchedule.innerHTML = `
            <div>No tasks scheduled for this date</div>
            <div style="font-size: 0.9rem; margin-top: 10px; color: #999;">
                Add tasks from the homepage with the selected date.
            </div>
        `;
        noSchedule.style.position = 'absolute';
        noSchedule.style.top = '50%';
        noSchedule.style.left = '50%';
        noSchedule.style.transform = 'translate(-50%, -50%)';
        noSchedule.style.color = '#6c757d';
        noSchedule.style.fontSize = '1.1rem';
        noSchedule.style.textAlign = 'center';
        contentArea.appendChild(noSchedule);
        return;
    }

    // Add priority event first if exists
    if (currentPriorityEvent && currentPriorityEvent.date === selectedDate) {
        const priorityBlock = createPriorityEventBlock(currentPriorityEvent, hourWidth, 0);
        contentArea.appendChild(priorityBlock);
    }

    // Sort tasks by start time
    tasks.sort((a, b) => a.startTime.localeCompare(b.startTime));

    // Position tasks with stacking
    const positionedTasks = positionTasksWithStacking(tasks, hourWidth, 0);

    // Create task blocks
    positionedTasks.forEach(taskData => {
        const block = createTaskBlock(taskData.task, hourWidth, 0, taskData.top);
        contentArea.appendChild(block);
    });

    // Add date display
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

    // Make the priority event clickable to show details
    block.addEventListener('click', () => showPriorityEventDetails(event));

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

            // Check for priority event on this date
            const priorityEvent = getPriorityEventForDate(dateStr);

            // Add priority event first if it exists
            if (priorityEvent) {
                const priorityElement = document.createElement('div');
                priorityElement.className = 'calendar-priority-event';
                priorityElement.innerHTML = `
                    <div class="calendar-priority-icon">⭐</div>
                    <div class="calendar-priority-text">${priorityEvent.title.length > 12 ? priorityEvent.title.substring(0, 12) + '...' : priorityEvent.title}</div>
                `;
                priorityElement.title = `${priorityEvent.title} (${priorityEvent.startTime} - ${priorityEvent.endTime})`;
                priorityElement.addEventListener('click', () => showPriorityEventDetails(priorityEvent));
                cell.appendChild(priorityElement);
            }

            // Add tasks for this day (limit to 2 if priority event exists, otherwise 3)
            const dayTasks = monthTasks[dateStr] || [];
            const maxTasks = priorityEvent ? 2 : 3;
            dayTasks.slice(0, maxTasks).forEach(task => {
                const taskElement = document.createElement('div');
                taskElement.className = `calendar-task ${task.status.toLowerCase()}`;
                taskElement.textContent = task.description.length > 15 ? task.description.substring(0, 15) + '...' : task.description;
                taskElement.title = `${task.description} (${task.startTime} - ${task.endTime})`;
                taskElement.addEventListener('click', () => showTaskDetails(task));
                cell.appendChild(taskElement);
            });

            // Add indicator if there are more tasks
            if (dayTasks.length > maxTasks) {
                const moreIndicator = document.createElement('div');
                moreIndicator.className = 'calendar-more-tasks';
                moreIndicator.textContent = `+${dayTasks.length - maxTasks} more`;
                moreIndicator.title = `${dayTasks.length - maxTasks} additional tasks`;
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
    const dateInput = document.getElementById('schedule-task-date');
    const prioritySelect = document.getElementById('schedule-task-priority');
    const selectedDate = dateInput.value;

    const taskText = taskInput.value.trim();
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    const priority = prioritySelect.value;

    if (!taskText || !startTime || !endTime || !selectedDate) {
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

        if (!response.ok) {
            console.error('Task creation failed:', response.status, responseText);
            showMessage(`Failed to add task: ${responseText || 'Unknown error'}`, 'error');
            return;
        }

        try {
            const newTask = JSON.parse(responseText);
            // Save to localStorage as backup
            saveTaskToLocalStorage(newTask);
        } catch (parseError) {
            console.error('Error parsing response:', parseError);
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
        console.error('Error adding task:', error);
        if (!taskText || !selectedDate) {
            showMessage('Could not add task. Please check your connection.', 'error');
            return;
        }
        // If API fails, save to localStorage anyway
        const localTask = {
            id: Date.now().toString(),
            description: taskText,
            startTime: startTime,
            endTime: endTime,
            date: selectedDate,
            priority: priority,
            status: 'PENDING'
        };
        saveTaskToLocalStorage(localTask);

        // Clear form and reset to defaults
        taskInput.value = '';
        setDefaultDatetimeValues();

        // Refresh display based on current view
        if (currentView === 'timeline') {
            loadScheduleTimeline();
        } else {
            loadCalendarView();
        }

        showMessage('Task added locally (server not available)', 'info');
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
    // Parse the YYYY-MM-DD string manually to avoid timezone issues
    const [year, month, day] = dateString.split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-based in Date constructor
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

// Priority Event Details Modal
function showPriorityEventDetails(event) {
    // Create modal overlay
    const modal = document.createElement('div');
    modal.className = 'task-modal-overlay';
    modal.innerHTML = `
        <div class="task-modal">
            <div class="task-modal-header">
                <h3>Priority Event Details</h3>
                <button class="modal-close-btn" onclick="closePriorityEventModal()">×</button>
            </div>
            <div class="task-modal-content">
                <div class="task-detail-row">
                    <strong>Title:</strong>
                    <span>${escapeHtml(event.title)}</span>
                </div>
                <div class="task-detail-row">
                    <strong>Time:</strong>
                    <span>${event.startTime} - ${event.endTime}</span>
                </div>
                <div class="task-detail-row">
                    <strong>Date:</strong>
                    <span>${formatDate(event.date)}</span>
                </div>
                <div class="task-detail-row">
                    <strong>Type:</strong>
                    <span class="status-badge status-priority">PRIORITY EVENT</span>
                </div>
                <div class="task-detail-row">
                    <strong>Duration:</strong>
                    <span>${calculateDuration(event.startTime, event.endTime)}</span>
                </div>
            </div>
            <div class="task-modal-actions">
                <button class="modal-btn edit-btn" onclick="editPriorityEvent()">Edit Event</button>
                <button class="modal-btn close-btn" onclick="closePriorityEventModal()">Close</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Prevent background scrolling
    document.body.style.overflow = 'hidden';

    // Close modal when clicking outside
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            closePriorityEventModal();
        }
    });

    // Close modal on escape key
    document.addEventListener('keydown', handlePriorityEventEscapeKey);
}

function closePriorityEventModal() {
    const modal = document.querySelector('.task-modal-overlay');
    if (modal) {
        modal.remove();
        document.body.style.overflow = '';
        document.removeEventListener('keydown', handlePriorityEventEscapeKey);
    }
}

function editPriorityEvent() {
    // Scroll to the priority event form
    document.querySelector('.timer-container h2').scrollIntoView({ behavior: 'smooth' });
    document.getElementById('priority-title').focus();
    closePriorityEventModal();
}

function handlePriorityEventEscapeKey(e) {
    if (e.key === 'Escape') {
        closePriorityEventModal();
    }
}

function saveTaskToLocalStorage(task) {
    try {
        const savedTasks = localStorage.getItem('savedTasks');
        const tasks = savedTasks ? JSON.parse(savedTasks) : [];
        tasks.push(task);
        localStorage.setItem('savedTasks', JSON.stringify(tasks));
    } catch (error) {
        console.error('Error saving to localStorage:', error);
    }
}

function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        closeTaskModal();
    }
}

function getPriorityEventForDate(dateStr) {
    const saved = localStorage.getItem('priorityEvent');
    if (saved) {
        try {
            const priorityEvent = JSON.parse(saved);
            return priorityEvent.date === dateStr ? priorityEvent : null;
        } catch (error) {
            console.error('Error parsing priority event:', error);
            return null;
        }
    }
    return null;
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
