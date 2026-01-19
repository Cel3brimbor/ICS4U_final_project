package backend;

import java.io.*;
import java.time.format.DateTimeFormatter;
import java.util.List;

import backend.objects.Note;

import java.util.ArrayList;

public class NotePersistence {
    private static final String NOTES_FILE = "notes.json";
    private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");

    //saves all notes to a JSON file
    public static void saveNotes(NoteManager noteManager) {
        try (PrintWriter writer = new PrintWriter(new FileWriter(NOTES_FILE))) {
            List<Note> allNotes = noteManager.getAllNotes();
            writer.println("[");
            for (int i = 0; i < allNotes.size(); i++) {
                Note note = allNotes.get(i);
                writer.println(noteToJson(note));
                if (i < allNotes.size() - 1) {
                    writer.println(",");
                }
            }
            writer.println("]");
        } catch (IOException e) {
            System.err.println("Error saving notes: " + e.getMessage());
        }
    }

    //loads notes from JSON file into the note manager
    public static void loadNotes(NoteManager noteManager) {
        File file = new File(NOTES_FILE);
        if (!file.exists()) {
            return; //no saved notes yet
        }

        try {
            String jsonContent = readFileToString(file);
            List<Note> notes = parseNotesFromJson(jsonContent);
            for (Note note : notes) {
                noteManager.addExistingNote(note);
            }
        } catch (IOException e) {
            System.err.println("Error loading notes: " + e.getMessage());
        }
    }

    //converts a note to JSON string
    private static String noteToJson(Note note) {
        return String.format(
            "  {\n" +
            "    \"id\": \"%s\",\n" +
            "    \"content\": \"%s\",\n" +
            "    \"creationTime\": \"%s\"\n" +
            "  }",
            note.getId(),
            escapeJsonString(note.getContent()),
            note.getCreationTime().format(DATETIME_FORMATTER)
        );
    }

    //parses notes from JSON string
    private static List<Note> parseNotesFromJson(String jsonContent) {
        List<Note> notes = new ArrayList<>();
        try {
            String content = jsonContent.trim();
            if (content.startsWith("[") && content.endsWith("]")) {
                content = content.substring(1, content.length() - 1).trim();
            }
            if (content.isEmpty()) return notes;

            java.util.List<String> objects = extractJsonObjects(content);
            for (String obj : objects) {
                if (obj == null || obj.trim().isEmpty()) continue;
                Note note = parseNoteFromJson(obj);
                if (note != null) notes.add(note);
            }
        } catch (Exception e) {
            System.err.println("Error parsing JSON: " + e.getMessage());
        }
        return notes;
    }

    private static java.util.List<String> extractJsonObjects(String content) {
        java.util.List<String> out = new ArrayList<>();
        int len = content.length();
        boolean inString = false;
        char stringChar = '"';
        boolean afterBackslash = false;
        int depth = 0;
        int start = -1;
        int i = 0;
        while (i < len) {
            char c = content.charAt(i);
            if (inString) {
                if (afterBackslash) { afterBackslash = false; i++; continue; }
                if (c == '\\') { afterBackslash = true; i++; continue; }
                if (c == stringChar) { inString = false; i++; continue; }
                i++;
                continue;
            }
            if (c == '"' || c == '\'') { inString = true; stringChar = c; i++; continue; }
            if (c == '{') {
                if (depth == 0) start = i;
                depth++;
                i++;
                continue;
            }
            if (c == '}') {
                depth--;
                if (depth == 0 && start >= 0) {
                    out.add(content.substring(start, i + 1));
                    start = -1;
                }
                i++;
                continue;
            }
            i++;
        }
        return out;
    }

    //parses a single note from JSON object string
    private static Note parseNoteFromJson(String jsonObject) {
        try {
            String id = JsonUtils.extractJsonStringValue(jsonObject, "id");
            String content = JsonUtils.extractJsonStringValue(jsonObject, "content");
            String timeStr = JsonUtils.extractJsonStringValue(jsonObject, "creationTime");
            if (timeStr == null) return null;

            java.time.LocalDateTime creationTime = java.time.LocalDateTime.parse(timeStr, DATETIME_FORMATTER);
            String safeContent = (content != null) ? content : "";

            if (id != null && !id.isEmpty()) {
                return new Note(id, safeContent, creationTime);
            } else {
                return new Note(safeContent, creationTime);
            }

        } catch (Exception e) {
            System.err.println("Error parsing note from JSON: " + jsonObject + " - " + e.getMessage());
            return null;
        }
    }

    //helper methods for JSON processing

    //reads entire file to string
    private static String readFileToString(File file) throws IOException {
        StringBuilder content = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
            String line;
            while ((line = reader.readLine()) != null) {
                content.append(line).append("\n");
            }
        }
        return content.toString();
    }

    //escapes special characters for JSON strings
    private static String escapeJsonString(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }

    //clears the notes file (useful for testing or reset)
    public static void clearSavedNotes() {
        File file = new File(NOTES_FILE);
        if (file.exists()) {
            file.delete();
        }
    }
}