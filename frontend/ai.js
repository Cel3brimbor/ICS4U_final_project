let currentMode = 'chat';
let accessToken = null;

document.addEventListener('DOMContentLoaded', function() {
    initializeAI();
    setupAIEventListeners();
    loadAccessToken();
});

function initializeAI() {
    console.log('AI Assistant initialized');
    setMode('chat');
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
            messages.innerHTML = '<div class="message ai-message">Hello! I\'m your AI assistant. In chat mode, I can answer questions, provide advice, and help with general productivity topics. What would you like to talk about?</div>';
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
    if (!accessToken) {
        hideTypingIndicator();
        addMessage('Please authenticate with Google to use AI features.', 'ai');
        return;
    }

    fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            message: message,
            accessToken: accessToken
        })
    })
    .then(response => response.json())
    .then(data => {
        hideTypingIndicator();
        if (data.error) {
            addMessage('Error: ' + data.error, 'ai');
        } else {
            addMessage(data.response, 'ai');
        }
    })
    .catch(error => {
        hideTypingIndicator();
        console.error('Error:', error);
        addMessage('Sorry, I encountered an error. Please try again.', 'ai');
    });
}

function editNotes() {
    const input = document.getElementById('note-instruction');
    const instruction = input.value.trim();

    if (!instruction) return;

    if (!accessToken) {
        showAgentResult('Please authenticate with Google to use AI features.', 'error');
        return;
    }

    showAgentResult('Processing your instruction...', 'info');

    fetch('/api/ai/edit-notes', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            instruction: instruction,
            accessToken: accessToken
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

function editSchedule() {
    const input = document.getElementById('schedule-instruction');
    const instruction = input.value.trim();

    if (!instruction) return;

    if (!accessToken) {
        showAgentResult('Please authenticate with Google to use AI features.', 'error');
        return;
    }

    showAgentResult('Processing your instruction...', 'info');

    fetch('/api/ai/edit-schedule', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            instruction: instruction,
            accessToken: accessToken
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
    messageDiv.textContent = message;
    messages.appendChild(messageDiv);

    messages.scrollTop = messages.scrollHeight;
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
    resultDiv.textContent = message;

    results.innerHTML = '';
    results.appendChild(resultDiv);

    if (type === 'success') {
        setTimeout(() => {
            resultDiv.style.opacity = '0';
            setTimeout(() => resultDiv.remove(), 300);
        }, 5000);
    }
}

function navigateTo(page) {
    window.location.href = page === 'home' ? 'index.html' : page === 'ai' ? 'ai.html' : page === 'tasks' ? 'tasks.html' : page === 'notes' ? 'note.html' : page === 'timer' ? 'timer.html' : 'index.html';
}