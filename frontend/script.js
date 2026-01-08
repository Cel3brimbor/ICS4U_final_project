document.addEventListener('DOMContentLoaded', function() {
    initializeApp();

    loadTasks();

    setupEventListeners();
});

function initializeApp() {
    console.log('AI Productivity Planner initialized');

    //update greeting with current time
    updateGreeting();
    setInterval(updateGreeting, 60000); //update every minute

    //initialize navigation
    initializeNavigation();
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

    } catch (error) {
        console.error('Error loading tasks:', error);
        showError('Failed to load tasks. Please refresh the page.');
    }
}

async function addTask() {
    const taskInput = document.getElementById('task-input');
    const startTimeInput = document.getElementById('start-time');
    const endTimeInput = document.getElementById('end-time');

    const description = taskInput.value.trim();
    const startTime = startTimeInput.value;
    const endTime = endTimeInput.value;

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
                endTime: endTime
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
        showError('Failed to add task. Please try again.');
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
            <button class="task-action-btn complete-btn" onclick="updateTaskStatus('${task.id}', '${task.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED'}')">
                ${task.status === 'COMPLETED' ? '↺ Mark as Incomplete' : '✓ Complete'}
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

    //create timeline blocks
    tasks.forEach(task => {
        const block = document.createElement('div');
        block.className = `timeline-block timeline-${task.status.toLowerCase()}`;

        //calculate position (simplified - assuming 24-hour timeline)
        const startHour = parseInt(task.startTime.split(':')[0]);
        const startMinute = parseInt(task.startTime.split(':')[1]);
        const endHour = parseInt(task.endTime.split(':')[0]);
        const endMinute = parseInt(task.endTime.split(':')[1]);

        const startPosition = (startHour * 60 + startMinute) / (24 * 60) * 100;
        const duration = ((endHour * 60 + endMinute) - (startHour * 60 + startMinute)) / (24 * 60) * 100;

        block.style.left = startPosition + '%';
        block.style.width = duration + '%';

        block.innerHTML = `
            <div class="timeline-content">
                <div class="timeline-title">${escapeHtml(task.description)}</div>
                <div class="timeline-time">${task.startTime} - ${task.endTime}</div>
            </div>
        `;

        timeline.appendChild(block);
    });
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
        const status = item.className.match(/task-(\w+)/)[1];

        switch (filter) {
            case 'all':
                item.style.display = 'flex';
                break;
            case 'pending':
                item.style.display = status === 'pending' ? 'flex' : 'none';
                break;
            case 'completed':
                item.style.display = status === 'completed' ? 'flex' : 'none';
                break;
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

// Navigation functions
function initializeNavigation() {
    // Navigation is handled by onclick attributes in HTML
    // This function can be used for additional initialization if needed
}

function navigateTo(page) {
    // Remove active class from all nav buttons
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => btn.classList.remove('active'));

    // Add active class to clicked button
    event.target.classList.add('active');

    // Handle navigation based on page
    switch(page) {
        case 'home':
            // Already on home page
            break;
        case 'progress':
            showPage('progress');
            break;
        case 'add-task':
            // Scroll to task input section
            document.querySelector('.task-input-section').scrollIntoView({ behavior: 'smooth' });
            break;
        case 'timer':
            showPage('timer');
            break;
        case 'schedule':
            // Scroll to schedule overview
            document.querySelector('.schedule-overview').scrollIntoView({ behavior: 'smooth' });
            break;
        case 'tasks':
            // Scroll to task list
            document.querySelector('.task-planner').scrollIntoView({ behavior: 'smooth' });
            break;
        case 'chatbot':
            // Scroll to AI assistant
            document.querySelector('.ai-assistant').scrollIntoView({ behavior: 'smooth' });
            break;
        case 'notes':
            showPage('notes');
            break;
        case 'settings':
            showPage('settings');
            break;
        default:
            console.log(`Navigation to ${page} not implemented yet`);
    }
}

function showPage(pageName) {
    // For now, just show an alert - in a real app, this would navigate to different pages
    alert(`${pageName.charAt(0).toUpperCase() + pageName.slice(1)} page coming soon!`);
}
