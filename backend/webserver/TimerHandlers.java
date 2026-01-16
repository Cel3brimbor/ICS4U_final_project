package backend.webserver;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import backend.objects.Timer;
import java.io.*;
import java.nio.charset.StandardCharsets;

public class TimerHandlers {
    private final Timer timer;

    public TimerHandlers(Timer timer) {
        this.timer = timer;
    }

    public static class TimerHandler implements HttpHandler {
        private final Timer timer;

        public TimerHandler(Timer timer) {
            this.timer = timer;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"GET".equals(exchange.getRequestMethod())) {
                sendMethodNotAllowed(exchange);
                return;
            }

            try {
                String jsonResponse = String.format(
                    "{\"isRunning\":%b,\"remainingSeconds\":%d,\"remainingTimeFormatted\":\"%s\",\"pomodorosCompleted\":%d,\"suggestedNextMode\":\"%s\"}",
                    timer.isRunning(),
                    timer.getRemainingTime(),
                    timer.getRemainingTimeFormatted(),
                    timer.getPomodorosCompleted(),
                    timer.getSuggestedNextMode()
                );

                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, jsonResponse.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(jsonResponse.getBytes(StandardCharsets.UTF_8));
                }

            } catch (Exception e) {
                System.err.println("Error getting timer status: " + e.getMessage());
                String errorResponse = "{\"error\":\"Internal server error\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(500, errorResponse.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                }
            }
        }
    }

    public static class TimerStartHandler implements HttpHandler {
        private final Timer timer;

        public TimerStartHandler(Timer timer) {
            this.timer = timer;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equals(exchange.getRequestMethod())) {
                sendMethodNotAllowed(exchange);
                return;
            }

            try {
                String requestBody = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
                String mode = extractJsonValue(requestBody, "mode");

                if (mode == null) {
                    String errorResponse = "{\"error\":\"Missing required field: mode\"}";
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(400, errorResponse.length());
                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                    }
                    return;
                }

                switch (mode) {
                    case "pomodoro":
                        timer.startPomodoro();
                        break;
                    case "short-break":
                        timer.startShortBreak();
                        break;
                    case "long-break":
                        timer.startLongBreak();
                        break;
                    case "custom":
                        // Parse custom duration from request
                        String durationStr = extractJsonValue(requestBody, "duration");
                        if (durationStr != null) {
                            try {
                                int customDuration = Integer.parseInt(durationStr);
                                timer.startCustomTimer(customDuration);
                            } catch (NumberFormatException e) {
                                String errorResponse = "{\"error\":\"Invalid duration format\"}";
                                exchange.getResponseHeaders().set("Content-Type", "application/json");
                                exchange.sendResponseHeaders(400, errorResponse.length());
                                try (OutputStream os = exchange.getResponseBody()) {
                                    os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                                }
                                return;
                            }
                        } else {
                            String errorResponse = "{\"error\":\"Custom timer requires duration parameter\"}";
                            exchange.getResponseHeaders().set("Content-Type", "application/json");
                            exchange.sendResponseHeaders(400, errorResponse.length());
                            try (OutputStream os = exchange.getResponseBody()) {
                                os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                            }
                            return;
                        }
                        break;
                    default:
                        String errorResponse = "{\"error\":\"Invalid mode. Use: pomodoro, short-break, long-break, custom\"}";
                        exchange.getResponseHeaders().set("Content-Type", "application/json");
                        exchange.sendResponseHeaders(400, errorResponse.length());
                        try (OutputStream os = exchange.getResponseBody()) {
                            os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                        }
                        return;
                }

                String jsonResponse = "{\"status\":\"Timer started\",\"mode\":\"" + mode + "\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, jsonResponse.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(jsonResponse.getBytes(StandardCharsets.UTF_8));
                }

            } catch (Exception e) {
                System.err.println("Error starting timer: " + e.getMessage());
                String errorResponse = "{\"error\":\"Internal server error\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(500, errorResponse.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                }
            }
        }
    }

    public static class TimerPauseHandler implements HttpHandler {
        private final Timer timer;

        public TimerPauseHandler(Timer timer) {
            this.timer = timer;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equals(exchange.getRequestMethod())) {
                sendMethodNotAllowed(exchange);
                return;
            }

            try {
                timer.pauseTimer();

                String jsonResponse = "{\"status\":\"Timer paused\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, jsonResponse.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(jsonResponse.getBytes(StandardCharsets.UTF_8));
                }

            } catch (Exception e) {
                System.err.println("Error pausing timer: " + e.getMessage());
                String errorResponse = "{\"error\":\"Internal server error\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(500, errorResponse.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                }
            }
        }
    }

    public static class TimerStopHandler implements HttpHandler {
        private final Timer timer;

        public TimerStopHandler(Timer timer) {
            this.timer = timer;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equals(exchange.getRequestMethod())) {
                sendMethodNotAllowed(exchange);
                return;
            }

            try {
                timer.stopTimer();

                String jsonResponse = "{\"status\":\"Timer stopped\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, jsonResponse.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(jsonResponse.getBytes(StandardCharsets.UTF_8));
                }

            } catch (Exception e) {
                System.err.println("Error stopping timer: " + e.getMessage());
                String errorResponse = "{\"error\":\"Internal server error\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(500, errorResponse.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                }
            }
        }
    }

    public static class TimerResetHandler implements HttpHandler {
        private final Timer timer;

        public TimerResetHandler(Timer timer) {
            this.timer = timer;
        }

        @Override
        public void handle(HttpExchange exchange) throws IOException {
            if (!"POST".equals(exchange.getRequestMethod())) {
                sendMethodNotAllowed(exchange);
                return;
            }

            try {
                timer.resetTimer();

                String jsonResponse = "{\"status\":\"Timer reset\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, jsonResponse.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(jsonResponse.getBytes(StandardCharsets.UTF_8));
                }

            } catch (Exception e) {
                System.err.println("Error resetting timer: " + e.getMessage());
                String errorResponse = "{\"error\":\"Internal server error\"}";
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(500, errorResponse.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(errorResponse.getBytes(StandardCharsets.UTF_8));
                }
            }
        }
    }

    // Utility method for extracting JSON values
    private static String extractJsonValue(String json, String key) {
        // First try to match string values (with quotes)
        String stringPattern = "\"" + key + "\"\\s*:\\s*\"([^\"]+)\"";
        java.util.regex.Pattern stringP = java.util.regex.Pattern.compile(stringPattern);
        java.util.regex.Matcher stringM = stringP.matcher(json);
        if (stringM.find()) {
            return stringM.group(1);
        }

        // Then try to match numeric values (without quotes)
        String numericPattern = "\"" + key + "\"\\s*:\\s*([0-9]+(?:\\.[0-9]+)?)";
        java.util.regex.Pattern numericP = java.util.regex.Pattern.compile(numericPattern);
        java.util.regex.Matcher numericM = numericP.matcher(json);
        if (numericM.find()) {
            return numericM.group(1);
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