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
            "    \"content\": \"%s\",\n" +
            "    \"creationTime\": \"%s\"\n" +
            "  }",
            escapeJsonString(note.getContent()),
            note.getCreationTime().format(DATETIME_FORMATTER)
        );
    }

    //parses notes from JSON string
    private static List<Note> parseNotesFromJson(String jsonContent) {
        List<Note> notes = new ArrayList<>();
        try {
            // Simple JSON parsing - remove array brackets and split by objects
            String content = jsonContent.trim();
            if (content.startsWith("[") && content.endsWith("]")) {
                content = content.substring(1, content.length() - 1).trim();
            }

            if (content.isEmpty()) {
                return notes;
            }

            // Split by "}," followed by optional whitespace and newline, then "{"
            String[] objects = content.split("\\}\\s*,\\s*\\{");
            for (int i = 0; i < objects.length; i++) {
                String obj = objects[i].trim();
                // Add braces back
                if (!obj.startsWith("{")) {
                    obj = "{" + obj;
                }
                if (!obj.endsWith("}")) {
                    obj = obj + "}";
                }
                if (!obj.trim().isEmpty()) {
                    Note note = parseNoteFromJson(obj);
                    if (note != null) {
                        notes.add(note);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error parsing JSON: " + e.getMessage());
        }
        return notes;
    }

    //parses a single note from JSON object string
    private static Note parseNoteFromJson(String jsonObject) {
        try {
            String content = extractJsonString(jsonObject, "content");
            String timeStr = extractJsonString(jsonObject, "creationTime");

            java.time.LocalDateTime creationTime = java.time.LocalDateTime.parse(timeStr, DATETIME_FORMATTER);

            return new Note(content, creationTime);

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

    //extracts string value from JSON field
    private static String extractJsonString(String json, String fieldName) {
        String pattern = "\"" + fieldName + "\":\\s*\"([^\"]*)\"";
        java.util.regex.Pattern p = java.util.regex.Pattern.compile(pattern);
        java.util.regex.Matcher m = p.matcher(json);
        if (m.find()) {
            String value = m.group(1);
            return value.replace("\\\"", "\"")
                       .replace("\\n", "\n")
                       .replace("\\r", "\r")
                       .replace("\\t", "\t")
                       .replace("\\\\", "\\");
        }
        return "";
    }

    //clears the notes file (useful for testing or reset)
    public static void clearSavedNotes() {
        File file = new File(NOTES_FILE);
        if (file.exists()) {
            file.delete();
        }
    }
}