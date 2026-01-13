document.addEventListener('DOMContentLoaded', function() {
    initializeNotes();
    setupEventListeners();
    loadNotes();
});

function initializeNotes() {
    console.log('Notes page initialized');
}

function setupEventListeners() {
    //add note button
    const addNoteBtn = document.getElementById('add-note-btn');
    if (addNoteBtn) {
        addNoteBtn.addEventListener('click', addNote);
    }

    //enter key in note textarea
    const noteInput = document.getElementById('note-input');
    if (noteInput) {
        noteInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                addNote();
            }
        });
    }
}

async function loadNotes() {
    try {
        const response = await fetch('/api/notes');
        if (!response.ok) {
            throw new Error('Failed to load notes');
        }

        const notes = await response.json();
        displayNotes(notes);

    } catch (error) {
        console.error('Error loading notes:', error);
        showError('Failed to load notes. Please refresh the page.');
    }
}

async function addNote() {
    const noteInput = document.getElementById('note-input');

    const content = noteInput.value.trim();

    //validation
    if (!content) {
        showError('Please enter some content for the note');
        noteInput.focus();
        return;
    }

    try {
        const response = await fetch('/api/notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: content
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add note');
        }

        const newNote = await response.json();

        //clear form
        noteInput.value = '';

        //reload notes
        loadNotes();

        //show success message
        showSuccess('Note added successfully!');

    } catch (error) {
        console.error('Error adding note:', error);
        showError('Failed to add note. Please try again.');
    }
}

function displayNotes(notes) {
    const notesList = document.getElementById('notes-list');

    if (!notesList) return;

    //clear existing notes
    notesList.innerHTML = '';

    if (notes.length === 0) {
        notesList.innerHTML = '<div class="no-notes">No notes yet. Add your first note above!</div>';
        return;
    }

    //sort notes by creation time (newest first)
    notes.sort((a, b) => new Date(b.creationTime.replace(' ', 'T')) - new Date(a.creationTime.replace(' ', 'T')));

    //display notes
    notes.forEach(note => {
        const noteElement = createNoteElement(note);
        notesList.appendChild(noteElement);
    });
}

function createNoteElement(note) {
    const noteDiv = document.createElement('div');
    noteDiv.className = 'note-item';
    noteDiv.setAttribute('data-note-id', note.content + '|' + note.creationTime);

    const formattedTime = formatTime(note.creationTime);

    noteDiv.innerHTML = `
        <div class="note-content">
            <div class="note-text">${escapeHtml(note.content)}</div>
            <div class="note-meta">
                <span class="note-time">Created: ${formattedTime}</span>
            </div>
        </div>
        <div class="note-actions">
            <button class="note-action-btn edit-btn" onclick="editNote('${note.content + '|' + note.creationTime}')">
                ✏️ Edit
            </button>
            <button class="note-action-btn delete-btn" onclick="deleteNote('${note.content + '|' + note.creationTime}')">
                🗑️ Delete
            </button>
        </div>
    `;

    return noteDiv;
}

async function editNote(noteId) {
    //find the note element
    const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
    if (!noteElement) return;

    const noteText = noteElement.querySelector('.note-text');
    const originalContent = noteText.textContent;

    // Replace text with textarea for editing
    const textarea = document.createElement('textarea');
    textarea.className = 'note-edit-input';
    textarea.value = originalContent;
    textarea.rows = Math.max(2, Math.ceil(originalContent.length / 50));

    noteText.innerHTML = '';
    noteText.appendChild(textarea);
    textarea.focus();

    // Replace edit button with save/cancel buttons
    const actionsDiv = noteElement.querySelector('.note-actions');
    const originalButtons = actionsDiv.innerHTML;

    actionsDiv.innerHTML = `
        <button class="note-action-btn save-btn" onclick="saveNote('${noteId}', this)">
            Save
        </button>
        <button class="note-action-btn cancel-btn" onclick="cancelEdit('${noteId}', '${escapeHtml(originalContent)}')">
            Cancel
        </button>
    `;
}

async function saveNote(noteId, saveBtn) {
    const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
    const textarea = noteElement.querySelector('.note-edit-input');
    const newContent = textarea.value.trim();

    if (!newContent) {
        showError('Note content cannot be empty');
        return;
    }

    try {
        const response = await fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                content: newContent
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update note');
        }

        //reload notes
        loadNotes();
        showSuccess('Note updated successfully!');

    } catch (error) {
        console.error('Error updating note:', error);
        showError('Failed to update note. Please try again.');
    }
}

function cancelEdit(noteId, originalContent) {
    const noteElement = document.querySelector(`[data-note-id="${noteId}"]`);
    const noteText = noteElement.querySelector('.note-text');

    //restore original content
    noteText.innerHTML = originalContent;

    // Restore original buttons
    const actionsDiv = noteElement.querySelector('.note-actions');
    actionsDiv.innerHTML = `
        <button class="note-action-btn edit-btn" onclick="editNote('${noteId}')">
            ✏️ Edit
        </button>
        <button class="note-action-btn delete-btn" onclick="deleteNote('${noteId}')">
            🗑️ Delete
        </button>
    `;
}

async function deleteNote(noteId) {
    if (!confirm('Are you sure you want to delete this note?')) {
        return;
    }

    try {
        const response = await fetch(`/api/notes/${encodeURIComponent(noteId)}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('Failed to delete note');
        }

        //reload notes
        loadNotes();
        showSuccess('Note deleted successfully!');

    } catch (error) {
        console.error('Error deleting note:', error);
        showError('Failed to delete note. Please try again.');
    }
}

function formatTime(dateTimeString) {
    try {
        const date = new Date(dateTimeString.replace(' ', 'T'));
        if (isNaN(date.getTime())) {
            return dateTimeString; // fallback if parsing fails
        }

        const options = {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        };

        return date.toLocaleDateString('en-US', options);
    } catch (e) {
        return dateTimeString; // fallback to original format
    }
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

function navigateTo(page) {
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => btn.classList.remove('active'));

    event.target.classList.add('active');

    switch(page) {
        case 'home':
            window.location.href = '/index.html';
            break;
        case 'notes':
            break;
        case 'timer':
            window.location.href = '/timer.html';
            break;
        default:
            alert(`${page.charAt(0).toUpperCase() + pageName.slice(1)} page coming soon!`);
    }
}