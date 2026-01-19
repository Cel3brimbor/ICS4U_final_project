document.addEventListener('DOMContentLoaded', function() {
    initializeApp();

    loadTasks();

    setupEventListeners();
});

function initializeApp() {
    console.log('StudyFlow Productivity Planner initialized');

    //update greeting with current time
    updateGreeting();
    setInterval(updateGreeting, 60000); //update every minute

    //initialize navigation
    initializeNavigation();

    // Date input initialization commented out for AI agent demo compatibility
    // Set default date to today
    // const today = new Date().toISOString().split('T')[0];
    // const dateInput = document.getElementById('task-date');
    // if (dateInput) {
    //     dateInput.value = today;
    // }

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

function updateGreeting() {
    const now = new Date();
    const hour = now.getHours();
    let greeting = 'Good ';

    if (hour < 12) {
        greeting += 'morning';
    } else if (hour < 17) {
        greeting += 'afternoon';
    } else {
        greeting += 'evening';
    }

    //update the AI message if it exists
    const aiMessage = document.querySelector('.ai-message');
    if (aiMessage) {
        aiMessage.textContent = `${greeting}! I'm your AI productivity assistant. I can help you plan your day, prioritize tasks, and optimize your schedule. What would you like to accomplish today?`;
    }
}

function setupEventListeners() {
    //add task button
    const addTaskBtn = document.getElementById('add-task-btn');
    if (addTaskBtn) {
        addTaskBtn.addEventListener('click', addTask);
    }

    //enter key in task input
    const taskInput = document.getElementById('task-input');
    if (taskInput) {
        taskInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                addTask();
            }
        });
    }

    //filter buttons
    const filterButtons = document.querySelectorAll('.filter-btn');
    filterButtons.forEach(button => {
        button.addEventListener('click', function() {
            //remove active class from all buttons
            filterButtons.forEach(btn => btn.classList.remove('active'));
            //add active class to clicked button
            this.classList.add('active');

            const filter = this.getAttribute('data-filter');
            filterTasks(filter);
        });
    });

}

async function loadTasks() {
    try {
        const response = await fetch('/api/tasks');
        if (!response.ok) {
            throw new Error('Failed to load tasks');
        }

        const tasks = await response.json();
        displayTasks(tasks);

        filterTasks('all');

    } catch (error) {
        console.error('Error loading tasks:', error);
        showError('Failed to load tasks. Please refresh the page.');
    }
}

async function addTask() {
    const taskInput = document.getElementById('task-input');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');
    // const dateInput = document.getElementById('task-date'); // Temporarily commented out
    const priorityInput = document.getElementById('task-priority');

    const description = taskInput.value.trim();
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;
    // const selectedDate = dateInput.value; // Temporarily commented out
    const selectedDate = new Date().toISOString().split('T')[0]; // Use today's date
    const priority = priorityInput.value;

    //validation
    if (!description) {
        showError('Please enter a task description');
        taskInput.focus();
        return;
    }

    if (!startTime || !endTime) {
        showError('Please select both start and end times');
        return;
    }

    // Date validation commented out - using today's date by default
    // if (!selectedDate) {
    //     showError('Please select a date for the task');
    //     return;
    // }

    if (startTime >= endTime) {
        showError('End time must be after start time');
        return;
    }

    try {
        const response = await fetch('/api/tasks', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: description,
                startTime: startTime,
                endTime: endTime,
                date: selectedDate,
                priority: priority
            })
        });

        if (response.status === 409) {
            //conflict - task overlaps
            const result = await response.json();
            showError(result.error + '. Would you like to add it anyway?');

            //could add a confirmation dialog here
            return;
        }

        if (!response.ok) {
            throw new Error('Failed to add task');
        }

        const newTask = await response.json();

        // Save to localStorage as backup
        saveTaskToLocalStorage(newTask);

        //clear form
        taskInput.value = '';
        startTimeInput.value = '';
        endTimeInput.value = '';

        //reload tasks
        loadTasks();

        //show success message
        showSuccess('Task added successfully!');

    } catch (error) {
        console.error('Error adding task:', error);
        // If API fails, save to localStorage anyway
        const localTask = {
            id: Date.now().toString(),
            description: description,
            startTime: startTime,
            endTime: endTime,
            date: selectedDate,
            priority: priority,
            status: 'PENDING'
        };
        saveTaskToLocalStorage(localTask);
        loadTasks(); // Refresh the display
        showSuccess('Task added locally (server not available)');

        //clear form
        taskInput.value = '';
        startTimeInput.value = '';
        endTimeInput.value = '';
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

function displayTasks(tasks) {
    const taskList = document.getElementById('task-list');
    const scheduleTimeline = document.getElementById('schedule-timeline');

    if (!taskList) return;

    //clear existing tasks
    taskList.innerHTML = '';

    if (tasks.length === 0) {
        taskList.innerHTML = '<div class="no-tasks">No tasks scheduled for today. Add your first task above!</div>';
        if (scheduleTimeline) scheduleTimeline.innerHTML = '<div class="no-schedule">No tasks scheduled</div>';
        return;
    }

    //sort tasks by start time
    tasks.sort((a, b) => a.startTime.localeCompare(b.startTime));

    //display tasks
    tasks.forEach(task => {
        const taskElement = createTaskElement(task);
        taskList.appendChild(taskElement);
    });

    //update schedule timeline
    updateScheduleTimeline(tasks);
}

function createTaskElement(task) {
    const taskDiv = document.createElement('div');
    taskDiv.className = `task-item task-${task.status.toLowerCase()}`;
    taskDiv.setAttribute('data-task-id', task.id);
    taskDiv.setAttribute('data-task-status', task.status.toLowerCase());

    taskDiv.innerHTML = `
        <div class="task-content">
            <div class="task-header">
                <h3 class="task-title">${escapeHtml(task.description)}</h3>
                <span class="task-time">${task.startTime} - ${task.endTime}</span>
            </div>
            <div class="task-meta">
                <span class="task-duration">${task.duration} min</span>
                <span class="task-status status-${task.status.toLowerCase()}">${task.status}</span>
            </div>
        </div>
        <div class="task-actions">
            <button class="task-action-btn edit-btn" onclick="openEditTaskModal('${task.id}', '${escapeHtml(task.description)}', '${task.priority}')">
                ✏️ Edit
            </button>
            <button class="task-action-btn complete-btn" onclick="updateTaskStatus('${task.id}', '${task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'}')">
                ${task.status === 'COMPLETED' ? 'Mark as Incomplete' : '✓ Complete'}
            </button>
            <button class="task-action-btn delete-btn" onclick="deleteTask('${task.id}')">
                ✕ Delete
            </button>
        </div>
    `;

    return taskDiv;
}

function updateScheduleTimeline(tasks) {
    const timeline = document.getElementById('schedule-timeline');
    if (!timeline) return;

    timeline.innerHTML = '';

    // Time markers are removed from schedule overview as requested

    // Create task list instead of timeline blocks
    if (tasks.length === 0) {
        const noTasks = document.createElement('div');
        noTasks.className = 'no-tasks';
        noTasks.textContent = 'No tasks in progress';
        timeline.appendChild(noTasks);
        return;
    }

    //filter for tasks that are in progress or pending
    const activeTasks = tasks.filter(task => task.status === 'IN_PROGRESS' || task.status === 'PENDING');

    if (activeTasks.length === 0) {
        const noActiveTasks = document.createElement('div');
        noActiveTasks.className = 'no-active-tasks';
        noActiveTasks.textContent = 'No tasks currently in progress';
        timeline.appendChild(noActiveTasks);
        return;
    }

    //sort by priority (HIGH > MEDIUM > LOW) then by start time
    activeTasks.sort((a, b) => {
        const priorityOrder = { 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.startTime.localeCompare(b.startTime);
    });

    //create task list items
    activeTasks.forEach(task => {
        const taskItem = document.createElement('div');
        taskItem.className = `schedule-task-item task-${task.status.toLowerCase()}`;

        taskItem.innerHTML = `
            <div class="schedule-task-content">
                <div class="schedule-task-name">${escapeHtml(task.description)}</div>
                <div class="schedule-task-details">
                    <span class="schedule-task-time">${task.startTime} - ${task.endTime}</span>
                    <span class="schedule-task-priority priority-${task.priority.toLowerCase()}">${task.priority}</span>
                </div>
            </div>
        `;

        timeline.appendChild(taskItem);
    });
}

//task editing modal functions
let currentEditingTaskId = null;

function openEditTaskModal(taskId, currentDescription, currentPriority) {
    currentEditingTaskId = taskId;
    document.getElementById('edit-task-description').value = unescapeHtml(currentDescription);
    document.getElementById('edit-task-priority').value = currentPriority;
    document.getElementById('edit-task-modal').style.display = 'block';
}

function closeEditTaskModal() {
    document.getElementById('edit-task-modal').style.display = 'none';
    currentEditingTaskId = null;
    document.getElementById('edit-task-description').value = '';
    document.getElementById('edit-task-priority').value = 'MEDIUM';
}

async function saveTaskEdit() {
    const description = document.getElementById('edit-task-description').value.trim();
    const priority = document.getElementById('edit-task-priority').value;

    if (!description) {
        showError('Please enter a task description');
        return;
    }

    try {
        const response = await fetch(`/api/tasks/${currentEditingTaskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                description: description,
                priority: priority
            })
        });

        if (response.ok) {
            closeEditTaskModal();
            await loadTasks();
            showSuccess('Task updated successfully!');
        } else {
            const errorData = await response.json();
            showError(errorData.error || 'Failed to update task');
        }
    } catch (error) {
        console.error('Error updating task:', error);
        showError('Failed to update task');
    }
}

//close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('edit-task-modal');
    if (event.target === modal) {
        closeEditTaskModal();
    }
}

async function updateTaskStatus(taskId, status) {
    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                status: status
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update task');
        }

        //reload tasks
        loadTasks();
        showSuccess('Task updated successfully!');

    } catch (error) {
        console.error('Error updating task:', error);
        showError('Failed to update task. Please try again.');
    }
}

async function deleteTask(taskId) {
    if (!confirm('Are you sure you want to delete this task?')) {
        return;
    }

    try {
        const response = await fetch(`/api/tasks/${taskId}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete task');
        }

        //reload tasks
        loadTasks();
        showSuccess('Task deleted successfully!');

    } catch (error) {
        console.error('Error deleting task:', error);
        showError('Failed to delete task. Please try again.');
    }
}

function filterTasks(filter) {
    const taskItems = document.querySelectorAll('.task-item');

    taskItems.forEach(item => {
        const status = item.getAttribute('data-task-status');
        if (!status) return;

        const normalizedStatus = status.toLowerCase();
        const normalizedFilter = filter.toLowerCase();

        switch (normalizedFilter) {
            case 'all':
                item.style.display = 'flex';
                break;
            case 'pending':
                item.style.display = (normalizedStatus === 'pending') ? 'flex' : 'none';
                break;
            case 'completed':
                item.style.display = (normalizedStatus === 'completed') ? 'flex' : 'none';
                break;
            default:
                item.style.display = 'flex';
        }
    });
}

function showSuccess(message) {
    showMessage(message, 'success');
}

function showError(message) {
    showMessage(message, 'error');
}

function showMessage(message, type) {
    //remove existing messages
    const existingMessages = document.querySelectorAll('.message-notification');
    existingMessages.forEach(msg => msg.remove());

    //create new message
    const messageDiv = document.createElement('div');
    messageDiv.className = `message-notification ${type}`;
    messageDiv.textContent = message;

    //add to page
    document.body.appendChild(messageDiv);

    //auto-remove after 3 seconds
    setTimeout(() => {
        if (messageDiv.parentNode) {
            messageDiv.remove();
        }
    }, 3000);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function unescapeHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent;
}

// Navigation functions
function initializeNavigation() {
}

function navigateTo(page) {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => btn.classList.remove('active'));

    event.target.classList.add('active');

    switch(page) {
        case 'home':
            break;
        case 'progress':
            window.location.href = '/progress.html';
            break;
        case 'add-task':
            document.querySelector('.task-input-section').scrollIntoView({ behavior: 'smooth' });
            break;
        case 'timer':
            window.location.href = '/timer.html';
            break;
        case 'schedule':
            window.location.href = '/schedule.html';
            break;
        case 'notes':
            window.location.href = '/note.html';
            break;
        case 'ai':
            window.location.href = '/ai.html';
            break;
        case 'chatbot':
            document.querySelector('.ai-assistant').scrollIntoView({ behavior: 'smooth' });
            break;
        case 'settings':
            window.location.href = '/settings.html';
            break;
        default:
            console.log(`Navigation to ${page} not implemented yet`);
    }
}

function showPage(pageName) {
    alert(`${pageName.charAt(0).toUpperCase() + pageName.slice(1)} page coming soon!`);
}
