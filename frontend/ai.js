let currentMode = 'chat';
let accessToken = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeAI();
    setupAIEventListeners();
    loadAccessToken();
});

function initializeAI() {

    // Check for schedule context from schedule page
    const scheduleContext = localStorage.getItem('aiScheduleContext');
    if (scheduleContext) {
        try {
            const context = JSON.parse(scheduleContext);
            setMode('agent');
            populateScheduleContext(context);
            localStorage.removeItem('aiScheduleContext'); // Clean up
        } catch (e) {
            console.error('Error loading schedule context:', e);
            setMode('chat');
        }
    } else {
        setMode('chat');
    }

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

function populateScheduleContext(context) {
    const instructionInput = document.getElementById('schedule-instruction');
    if (instructionInput) {
        let contextMessage = `I'm looking at your schedule for ${formatDate(context.date)}. `;

        if (context.priorityEvent) {
            contextMessage += `You have a priority event: "${context.priorityEvent.title}" from ${context.priorityEvent.startTime} to ${context.priorityEvent.endTime}. `;
        }

        if (context.tasks && context.tasks.length > 0) {
            contextMessage += `You have ${context.tasks.length} tasks scheduled: `;
            context.tasks.forEach(task => {
                contextMessage += `"${task.description}" (${task.startTime}-${task.endTime}, ${task.status}), `;
            });
        } else {
            contextMessage += "You don't have any tasks scheduled yet. ";
        }

        contextMessage += "How would you like me to help you manage this schedule?";

        // Add context message to chat
        addMessageToChat(contextMessage, 'ai');
    }
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

function setupAIEventListeners() {
    const aiInput = document.getElementById('ai-input');
    if (aiInput) {
        aiInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    const noteInstruction = document.getElementById('note-instruction');
    if (noteInstruction) {
        noteInstruction.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                editNotes();
            }
        });
    }

    const scheduleInstruction = document.getElementById('schedule-instruction');
    if (scheduleInstruction) {
        scheduleInstruction.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                editSchedule();
            }
        });
    }
}

function setMode(mode) {
    currentMode = mode;

    const chatBtn = document.getElementById('chat-mode-btn');
    const agentBtn = document.getElementById('agent-mode-btn');
    const chatInterface = document.getElementById('chat-interface');
    const agentInterface = document.getElementById('agent-interface');

    if (mode === 'chat') {
        chatBtn.classList.add('active');
        agentBtn.classList.remove('active');
        chatInterface.classList.remove('hidden');
        agentInterface.classList.add('hidden');

        document.getElementById('chat-title').textContent = '💬 Chat Mode';
        document.getElementById('chat-description').textContent = 'Ask me anything - I\'m here to help!';

        const messages = document.getElementById('chat-messages');
        if (messages.children.length === 1) {
            messages.innerHTML = '<div class="message ai-message">' + renderMarkdown('Hello! I\'m your AI assistant. In chat mode, I can answer questions, provide advice, and help with general productivity topics. What would you like to talk about?') + '</div>';
        }

    } else if (mode === 'agent') {
        agentBtn.classList.add('active');
        chatBtn.classList.remove('active');
        agentInterface.classList.remove('hidden');
        chatInterface.classList.add('hidden');
    }
}

function loadAccessToken() {
    accessToken = 'placeholder_token';
}

function sendMessage() {
    const input = document.getElementById('ai-input');
    const message = input.value.trim();

    if (!message) return;

    addMessage(message, 'user');

    input.value = '';

    showTypingIndicator();

    if (currentMode === 'chat') {
        chatWithAI(message);
    }
}

function chatWithAI(message) {

    fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: message
        })
    })
    .then(response => response.json())
    .then(data => {
        hideTypingIndicator();
        if (data.error) {
            addMessage('**Error:** ' + data.error, 'ai');
        } else {
            addMessage(data.response, 'ai');
        }
    })
    .catch(error => {
        hideTypingIndicator();
        console.error('Error:', error);
        addMessage('*Sorry, I encountered an error. Please try again.*', 'ai');
    });
}

function editNotes() {
    const input = document.getElementById('note-instruction');
    const instruction = input.value.trim();

    if (!instruction) return;


    showAgentResult('Processing your instruction...', 'info');

    fetch('/api/ai/edit-notes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            instruction: instruction
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showAgentResult('**Error:** ' + data.error, 'error');
        } else {
            showAgentResult(data.result, 'success');
            input.value = '';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAgentResult('*Sorry, I encountered an error. Please try again.*', 'error');
    });
}

function editSchedule() {
    const input = document.getElementById('schedule-instruction');
    const instruction = input.value.trim();

    if (!instruction) return;


    showAgentResult('Processing your instruction...', 'info');

    fetch('/api/ai/edit-schedule', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            instruction: instruction
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.error) {
            showAgentResult('Error: ' + data.error, 'error');
        } else {
            showAgentResult(data.result, 'success');
            input.value = '';
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showAgentResult('Sorry, I encountered an error. Please try again.', 'error');
    });
}

function addMessage(message, sender) {
    const messages = document.getElementById('chat-messages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    messageDiv.innerHTML = renderMarkdown(message);
    messages.appendChild(messageDiv);

    messages.scrollTop = messages.scrollHeight;
}

// function renderMarkdown(text) {
//     //convert **bold** to <strong>bold</strong>
//     text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
//     //convert *italic* to <em>italic</em>
//     text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
//     return text;
// }

function renderMarkdown(text) {
    //line breaks (\n to <br>)
    text = text.replace(/\n/g, '<br>');
    
    //**bold** to <strong>bold</strong>
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    //* italic * to <em>italic</em>
    text = text.replace(/\*\s+(.*?)\s+\*/g, '<em>$1</em>');
    
    //*italic* (without spaces) to <em>italic</em> 
    text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    //markdown lists (* or -) to proper html lists with indentation
    //handle lines that start with * or -
    text = text.replace(/^(\s*)[\*\-]\s+(.+)$/gm, function(match, indent, content) {
        var indentLevel = indent.length / 2; //2 spaces per indent level
        var paddingLeft = indentLevel * 20; //20px per indent level
        return '<div style="margin-left: ' + paddingLeft + 'px; margin-bottom: 4px;">• ' + content + '</div>';
    });
    
    //numbered lists (1. 2. 3...)
    text = text.replace(/^(\s*)\d+\.\s+(.+)$/gm, function(match, indent, content) {
        var indentLevel = indent.length / 2;
        var paddingLeft = indentLevel * 20;
        return '<div style="margin-left: ' + paddingLeft + 'px; margin-bottom: 4px;">' + match.trim() + '</div>';
    });
    
    return text;
}

function showTypingIndicator() {
    const messages = document.getElementById('chat-messages');
    const indicator = document.createElement('div');
    indicator.className = 'message ai-message typing';
    indicator.innerHTML = '<span></span><span></span><span></span>';
    indicator.id = 'typing-indicator';
    messages.appendChild(indicator);
    messages.scrollTop = messages.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

function showAgentResult(message, type) {
    const results = document.getElementById('agent-results');
    const resultDiv = document.createElement('div');
    resultDiv.className = `agent-result ${type}`;
    resultDiv.innerHTML = renderMarkdown(message);

    results.innerHTML = '';
    results.appendChild(resultDiv);

    if (type === 'success') {
        setTimeout(() => {
            resultDiv.style.opacity = '0';
            setTimeout(() => resultDiv.remove(), 300);
        }, 5000);
    }
}

// function navigateTo(page) {
//     window.location.href = page === 'home' ? 'index.html' : page === 'ai' ? 'ai.html' : page === 'tasks' ? 'tasks.html' : page === 'notes' ? 'note.html' : page === 'timer' ? 'timer.html' : 'index.html';
// }

function goBack() {
    window.location.href = '/index.html';
}