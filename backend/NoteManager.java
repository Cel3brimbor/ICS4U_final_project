package backend;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Comparator;

import backend.objects.Note;

public class NoteManager {
    private List<Note> notes;

    public NoteManager() {
        this.notes = new ArrayList<>();
    }

    public Note addNote(String content) {
        String sanitized = JsonUtils.sanitizeUnicodePunctuation(content != null ? content : "");
        if (sanitized.trim().isEmpty()) {
            throw new IllegalArgumentException("Note content cannot be empty");
        }

        Note newNote = new Note(sanitized.trim(), LocalDateTime.now());
        notes.add(newNote);
        return newNote;
    }

    public void addExistingNote(Note note) {
        if (note == null) {
            throw new IllegalArgumentException("Note cannot be null");
        }
        notes.add(note);
    }

    public boolean deleteNote(String noteId) {
        return notes.removeIf(note -> noteId.equals(note.getId()));
    }

    public boolean updateNote(String noteId, String newContent) {
        String sanitized = JsonUtils.sanitizeUnicodePunctuation(newContent != null ? newContent : "");
        for (Note note : notes) {
            if (noteId.equals(note.getId())) {
                note.setContent(sanitized);
                return true;
            }
        }
        return false;
    }

    public List<Note> getAllNotes() {
        return new ArrayList<>(notes); 
    }

    public Note getNoteById(String noteId) {
        for (Note note : notes) {
            if (noteId.equals(note.getId())) {
                return note;
            }
        }
        return null;
    }

    public int getNoteCount() {
        return notes.size();
    }

    public void clearAllNotes() {
        notes.clear();
    }

    public String getAllNotesAsString() {
        if (notes.isEmpty()) {
            return "No notes found.";
        }

        StringBuilder sb = new StringBuilder();
        sb.append("=== All Notes ===\n");
        sb.append("Total notes: ").append(notes.size()).append("\n\n");

        //sort notes by creation time, newest first
        notes.stream()
            .sorted(Comparator.comparing(Note::getCreationTime).reversed())
            .forEach(note -> {
                sb.append("Created: ").append(note.getFormattedCreationTime()).append("\n");
                sb.append("Content: ").append(note.getContent()).append("\n");
                sb.append("---\n");
            });

        return sb.toString();
    }
}