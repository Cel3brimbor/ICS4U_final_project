package backend.webserver;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import java.io.*;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

public class StatsHandlers {
    // Simple in-memory storage for session ratings (could be persisted to file later)
    private static final Map<String, List<SessionRating>> sessionRatings = new ConcurrentHashMap<>();

    public static class SessionRating {
        public String date;
        public int pomodoros;
        public int rating;
        public String notes;
        public int focusTime;

        public SessionRating(String date, int pomodoros, int rating, String notes, int focusTime) {
            this.date = date;
            this.pomodoros = pomodoros;
            this.rating = rating;
            this.notes = notes;
            this.focusTime = focusTime;
        }
    }

    public static class SaveSessionRatingHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equals(exchange.getRequestMethod())) {
                sendMethodNotAllowed(exchange);
                return;
            }

            try {
                String requestBody = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);

                // Parse JSON manually (simple implementation)
                String date = extractJsonValue(requestBody, "date");
                int pomodoros = Integer.parseInt(extractJsonValue(requestBody, "pomodoros") != null ?
                    extractJsonValue(requestBody, "pomodoros") : "0");
                int rating = Integer.parseInt(extractJsonValue(requestBody, "rating") != null ?
                    extractJsonValue(requestBody, "rating") : "0");
                String notes = extractJsonValue(requestBody, "notes");
                int focusTime = Integer.parseInt(extractJsonValue(requestBody, "focusTime") != null ?
                    extractJsonValue(requestBody, "focusTime") : "0");

                if (date == null) {
                    String errorResponse = "{\"error\":\"Missing required field: date\"}";
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(400, errorResponse.length());
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                    }
                    return;
                }

                // For now, store by user (could be by user ID in a real app)
                String userId = "default_user";
                sessionRatings.computeIfAbsent(userId, k -> new ArrayList<>())
                    .add(new SessionRating(date, pomodoros, rating, notes != null ? notes : "", focusTime));

                String jsonResponse = "{\"status\":\"Session rating saved\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, jsonResponse.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(jsonResponse.getBytes(StandardCharsets.UTF_8));
                }

            } catch (Exception e) {
                System.err.println("Error saving session rating: " + e.getMessage());
                String errorResponse = "{\"error\":\"Internal server error\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(500, errorResponse.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                }
            }
        }
    }

    public static class GetSessionStatsHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"GET".equals(exchange.getRequestMethod())) {
                sendMethodNotAllowed(exchange);
                return;
            }

            try {
                String userId = "default_user";
                List<SessionRating> ratings = sessionRatings.getOrDefault(userId, new ArrayList<>());

                // Calculate stats
                int totalPomodoros = ratings.stream().mapToInt(r -> r.pomodoros).sum();
                int totalFocusTime = ratings.stream().mapToInt(r -> r.focusTime).sum();
                double averageRating = ratings.isEmpty() ? 0 :
                    ratings.stream().mapToInt(r -> r.rating).average().orElse(0);

                // Recent sessions (last 10)
                List<SessionRating> recentSessions = ratings.stream()
                    .sorted((a, b) -> b.date.compareTo(a.date))
                    .limit(10)
                    .toList();

                StringBuilder jsonResponse = new StringBuilder();
                jsonResponse.append("{");
                jsonResponse.append("\"totalPomodoros\":").append(totalPomodoros).append(",");
                jsonResponse.append("\"totalFocusTime\":").append(totalFocusTime).append(",");
                jsonResponse.append("\"averageRating\":").append(String.format("%.1f", averageRating)).append(",");
                jsonResponse.append("\"sessionCount\":").append(ratings.size()).append(",");
                jsonResponse.append("\"recentSessions\":[");

                for (int i = 0; i < recentSessions.size(); i++) {
                    SessionRating rating = recentSessions.get(i);
                    if (i > 0) jsonResponse.append(",");
                    jsonResponse.append("{");
                    jsonResponse.append("\"date\":\"").append(rating.date).append("\",");
                    jsonResponse.append("\"pomodoros\":").append(rating.pomodoros).append(",");
                    jsonResponse.append("\"rating\":").append(rating.rating).append(",");
                    jsonResponse.append("\"notes\":\"").append(escapeJsonString(rating.notes)).append("\",");
                    jsonResponse.append("\"focusTime\":").append(rating.focusTime);
                    jsonResponse.append("}");
                }

                jsonResponse.append("]");
                jsonResponse.append("}");

                exchange.getResponseHeaders().set("Content-Type", "application/json");
                byte[] responseBytes = jsonResponse.toString().getBytes(StandardCharsets.UTF_8);
                exchange.sendResponseHeaders(200, responseBytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(responseBytes);
                }

            } catch (Exception e) {
                System.err.println("Error getting session stats: " + e.getMessage());
                String errorResponse = "{\"error\":\"Internal server error\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(500, errorResponse.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                }
            }
        }
    }

    private static String extractJsonValue(String json, String key) {
        String pattern = "\"" + key + "\"\\s*:\\s*";
        int keyIndex = json.indexOf("\"" + key + "\":");
        if (keyIndex == -1) return null;

        int valueStart = json.indexOf(":", keyIndex) + 1;
        if (valueStart == 0) return null;

        // Skip whitespace
        while (valueStart < json.length() && Character.isWhitespace(json.charAt(valueStart))) {
            valueStart++;
        }

        if (valueStart >= json.length()) return null;

        char firstChar = json.charAt(valueStart);

        if (firstChar == '"') {
            // String value
            int endQuote = json.indexOf('"', valueStart + 1);
            if (endQuote == -1) return null;
            return json.substring(valueStart + 1, endQuote);
        } else {
            // Number or other value - find next comma or closing brace
            int endIndex = valueStart;
            while (endIndex < json.length() && json.charAt(endIndex) != ',' && json.charAt(endIndex) != '}') {
                endIndex++;
            }
            return json.substring(valueStart, endIndex).trim();
        }
    }

    private static String escapeJsonString(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }

    private static void sendMethodNotAllowed(HttpExchange exchange) throws IOException {
        String response = "{\"error\":\"Method not allowed\"}";
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(405, response.length());
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes(StandardCharsets.UTF_8));
        }
    }
}