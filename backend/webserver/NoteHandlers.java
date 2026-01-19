package backend.webserver;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import backend.NoteManager;
import backend.NotePersistence;
import backend.JsonUtils;
import backend.objects.Note;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.List;

public class NoteHandlers {
    private final NoteManager noteManager;

    public NoteHandlers(NoteManager noteManager) {
        this.noteManager = noteManager;
    }

    //handle /api/notes (GET all notes, POST new note)
    public static class NotesHandler implements HttpHandler {
        private final NoteManager noteManager;

        public NotesHandler(NoteManager noteManager) {
            this.noteManager = noteManager;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod();

            if ("GET".equals(method)) {
                handleGetNotes(exchange);
            } else if ("POST".equals(method)) {
                handlePostNote(exchange);
            } else {
                sendMethodNotAllowed(exchange);
            }
        }

        private void handleGetNotes(HttpExchange exchange) throws IOException {
            List<Note> notes = noteManager.getAllNotes();
            String jsonResponse = notesToJsonArray(notes);

            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, jsonResponse.length());

            try (OutputStream os = exchange.getResponseBody()) {
                os.write(jsonResponse.getBytes(StandardCharsets.UTF_8));
            }
        }

        private void handlePostNote(HttpExchange exchange) throws IOException {
            try {
                //read request body
                InputStreamReader isr = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
                BufferedReader br = new BufferedReader(isr);
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    sb.append(line);
                }
                String requestBody = sb.toString();

                String content = JsonUtils.extractJsonStringValue(requestBody, "content");
                if (content == null || content.trim().isEmpty()) {
                    sendBadRequest(exchange, "Note content is required");
                    return;
                }

                //add note
                Note newNote = noteManager.addNote(content);
                NotePersistence.saveNotes(noteManager);

                //return the created note
                String jsonResponse = noteToJson(newNote);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(201, jsonResponse.length());

                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(jsonResponse.getBytes(StandardCharsets.UTF_8));
                }
            } catch (Exception e) {
                sendBadRequest(exchange, "Error processing request: " + e.getMessage());
            }
        }

        private String notesToJsonArray(List<Note> notes) {
            StringBuilder sb = new StringBuilder();
            sb.append("[");
            for (int i = 0; i < notes.size(); i++) {
                sb.append(noteToJson(notes.get(i)));
                if (i < notes.size() - 1) {
                    sb.append(",");
                }
            }
            sb.append("]");
            return sb.toString();
        }

        private String noteToJson(Note note) {
            return String.format(
                "{\"id\":\"%s\",\"content\":\"%s\",\"creationTime\":\"%s\"}",
                note.getId(),
                escapeJsonString(note.getContent()),
                note.getCreationTime()
            );
        }

        private String escapeJsonString(String str) {
            if (str == null) return "";
            return str.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
        }
    }

    //handle /api/notes/{id} (PUT, DELETE specific note)
    public static class NoteHandler implements HttpHandler {
        private final NoteManager noteManager;

        public NoteHandler(NoteManager noteManager) {
            this.noteManager = noteManager;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod();
            String path = exchange.getRequestURI().getPath();

            String noteId = path.substring("/api/notes/".length());
            if (noteId.isEmpty()) {
                sendBadRequest(exchange, "Note ID required");
                return;
            }

            if ("PUT".equals(method)) {
                handleUpdateNote(exchange, noteId);
            } else if ("DELETE".equals(method)) {
                handleDeleteNote(exchange, noteId);
            } else {
                sendMethodNotAllowed(exchange);
            }
        }

        private void handleUpdateNote(HttpExchange exchange, String noteId) throws IOException {
            try {
                String requestBody = readRequestBody(exchange);

                String newContent = JsonUtils.extractJsonStringValue(requestBody, "content");
                if (newContent == null || newContent.trim().isEmpty()) {
                    sendBadRequest(exchange, "Note content is required");
                    return;
                }

                boolean updated = noteManager.updateNote(noteId, newContent);
                if (updated) {
                    NotePersistence.saveNotes(noteManager);
                    sendSuccess(exchange, "Note updated successfully");
                } else {
                    sendNotFound(exchange, "Note not found");
                }
            } catch (Exception e) {
                sendBadRequest(exchange, "Error updating note: " + e.getMessage());
            }
        }

        private void handleDeleteNote(HttpExchange exchange, String noteId) throws IOException {
            boolean deleted = noteManager.deleteNote(noteId);
            if (deleted) {
                NotePersistence.saveNotes(noteManager);
                sendSuccess(exchange, "Note deleted successfully");
            } else {
                sendNotFound(exchange, "Note not found");
            }
        }

        private String readRequestBody(HttpExchange exchange) throws IOException {
            InputStreamReader isr = new InputStreamReader(exchange.getRequestBody(), StandardCharsets.UTF_8);
            BufferedReader br = new BufferedReader(isr);
            StringBuilder sb = new StringBuilder();
            String line;
            while ((line = br.readLine()) != null) {
                sb.append(line);
            }
            return sb.toString();
        }
    }

    // Utility methods for HTTP responses
    private static void sendMethodNotAllowed(HttpExchange exchange) throws IOException {
        String response = "{\"error\":\"Method not allowed\"}";
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(405, response.length());
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes(StandardCharsets.UTF_8));
        }
    }

    private static void sendBadRequest(HttpExchange exchange, String message) throws IOException {
        String response = "{\"error\":\"" + message + "\"}";
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(400, response.length());
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes(StandardCharsets.UTF_8));
        }
    }

    private static void sendNotFound(HttpExchange exchange, String message) throws IOException {
        String response = "{\"error\":\"" + message + "\"}";
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(404, response.length());
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes(StandardCharsets.UTF_8));
        }
    }

    private static void sendSuccess(HttpExchange exchange, String message) throws IOException {
        String response = "{\"message\":\"" + message + "\"}";
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, response.length());
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes(StandardCharsets.UTF_8));
        }
    }
}