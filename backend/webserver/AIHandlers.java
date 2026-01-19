package backend.webserver;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import backend.objects.Agent;
import java.io.*;
import java.nio.charset.StandardCharsets;

public class AIHandlers {
    private final Agent aiAgent;

    public AIHandlers(Agent aiAgent) {
        this.aiAgent = aiAgent;
    }

    public static class AIChatHandler implements HttpHandler {
        private final Agent aiAgent;

        public AIChatHandler(Agent aiAgent) {
            this.aiAgent = aiAgent;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equals(exchange.getRequestMethod())) {
                sendMethodNotAllowed(exchange);
                return;
            }

            try {
                String requestBody = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                String message = extractJsonValue(requestBody, "message");

                if (message == null) {
                    String errorResponse = "{\"error\":\"Missing required field: message\"}";
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(400, errorResponse.length());
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                    }
                    return;
                }

                String response = aiAgent.chat(message);
                String jsonResponse = "{\"response\":\"" + escapeForJson(response) + "\"}";

                exchange.getResponseHeaders().set("Content-Type", "application/json");
                //exchange.sendResponseHeaders(200, jsonResponse.length());
                exchange.sendResponseHeaders(200, 0); //to prevent too many byes to stream error
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(jsonResponse.getBytes(StandardCharsets.UTF_8));
                }

            } catch (Exception e) {
                System.err.println("Error in AI chat: " + e.getMessage());
                String errorResponse = "{\"error\":\"Internal server error\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(500, 0);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                }
            }
        }
    }

    public static class AIEditNotesHandler implements HttpHandler {
        private final Agent aiAgent;

        public AIEditNotesHandler(Agent aiAgent) {
            this.aiAgent = aiAgent;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equals(exchange.getRequestMethod())) {
                sendMethodNotAllowed(exchange);
                return;
            }

            try {
                String requestBody = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                String instruction = extractJsonValue(requestBody, "instruction");

                if (instruction == null) {
                    String errorResponse = "{\"error\":\"Missing required field: instruction\"}";
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(400, errorResponse.length());
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                    }
                    return;
                }

                String result = aiAgent.editNotes(instruction);
                String jsonResponse = "{\"result\":\"" + escapeForJson(result) + "\"}";

                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, 0);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(jsonResponse.getBytes(StandardCharsets.UTF_8));
                }

            } catch (Exception e) {
                System.err.println("Error in AI edit notes: " + e.getMessage());
                String errorResponse = "{\"error\":\"Internal server error\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(500, 0);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                }
            }
        }
    }

    public static class AIEditScheduleHandler implements HttpHandler {
        private final Agent aiAgent;

        public AIEditScheduleHandler(Agent aiAgent) {
            this.aiAgent = aiAgent;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equals(exchange.getRequestMethod())) {
                sendMethodNotAllowed(exchange);
                return;
            }

            try {
                String requestBody = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                String instruction = extractJsonValue(requestBody, "instruction");

                if (instruction == null) {
                    String errorResponse = "{\"error\":\"Missing required field: instruction\"}";
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(400, errorResponse.length());
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                    }
                    return;
                }

                String result = aiAgent.editSchedule(instruction);
                String jsonResponse = "{\"result\":\"" + escapeForJson(result) + "\"}";

                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, 0);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(jsonResponse.getBytes(StandardCharsets.UTF_8));
                }

            } catch (Exception e) {
                System.err.println("Error in AI edit schedule: " + e.getMessage());
                String errorResponse = "{\"error\":\"Internal server error\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(500, 0);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                }
            }
        }
    }

    private static String escapeForJson(String s) {
        if (s == null) return "";
        s = s.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "\\r").replace("\t", "\\t");
        //to handle long AI responses without breaking json
        StringBuilder sb = new StringBuilder(s.length() * 2);
        for (int i = 0; i < s.length(); i++) {
            char c = s.charAt(i);
            if (c >= 0 && c <= 0x1F) {
                sb.append(String.format("\\u%04x", (int) c));
            } else {
                sb.append(c);
            }
        }
        return sb.toString();
    }

    private static String extractJsonValue(String json, String key) {
        String pattern = "\"" + key + "\"\\s*:\\s*\"([^\"]+)\"";
        java.util.regex.Pattern p = java.util.regex.Pattern.compile(pattern);
        java.util.regex.Matcher m = p.matcher(json);
        if (m.find()) {
            return m.group(1);
        }
        return null;
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