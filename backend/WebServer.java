package backend;

import com.sun.net.httpserver.HttpServer;

import backend.objects.Agent;
import backend.objects.GeminiConfig;
import backend.objects.Timer;
import backend.webserver.StaticFileHandler;
import backend.webserver.TaskHandlers;
import backend.webserver.NoteHandlers;
import backend.webserver.AIHandlers;
import backend.webserver.TimerHandlers;
import backend.webserver.StatsHandlers;

import com.sun.net.httpserver.HttpExchange;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;

public class WebServer {
    private static final int PORT = 8080;
    private static final String FRONTEND_PATH = "frontend/";
    private ScheduleManager scheduleManager;
    private NoteManager noteManager;
    private Agent aiAgent;
    private Timer timer;

    public WebServer(ScheduleManager scheduleManager, NoteManager noteManager) {
        this.scheduleManager = scheduleManager;
        this.noteManager = noteManager;
        this.aiAgent = new Agent(new GeminiConfig(), noteManager, scheduleManager);
        this.timer = new Timer();
    }

    public void start() throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

        //handle all static files with one handler
        server.createContext("/", new StaticFileHandler());

        //API endpoints
        server.createContext("/api/tasks", new TaskHandlers.TasksHandler(scheduleManager));
        server.createContext("/api/tasks/", new TaskHandlers.TaskHandler(scheduleManager)); //for specific task operations
        server.createContext("/api/notes", new NoteHandlers.NotesHandler(noteManager));
        server.createContext("/api/notes/", new NoteHandlers.NoteHandler(noteManager)); //for specific note operations
        server.createContext("/api/ai/chat", new AIHandlers.AIChatHandler(aiAgent));
        server.createContext("/api/ai/edit-notes", new AIHandlers.AIEditNotesHandler(aiAgent));
        server.createContext("/api/ai/edit-schedule", new AIHandlers.AIEditScheduleHandler(aiAgent));
        server.createContext("/api/timer", new TimerHandlers.TimerHandler(timer));
        server.createContext("/api/timer/start", new TimerHandlers.TimerStartHandler(timer));
        server.createContext("/api/timer/pause", new TimerHandlers.TimerPauseHandler(timer));
        server.createContext("/api/timer/stop", new TimerHandlers.TimerStopHandler(timer));
        server.createContext("/api/timer/reset", new TimerHandlers.TimerResetHandler(timer));

        // Stats endpoints
        server.createContext("/api/stats/session", new StatsHandlers.SaveSessionRatingHandler());
        server.createContext("/api/stats/summary", new StatsHandlers.GetSessionStatsHandler());

        server.setExecutor(null);
        server.start();

        System.out.println("Server started on http://localhost:" + PORT);
        System.out.println("Open your browser and navigate to http://localhost:" + PORT);
    }

    // Utility methods for JSON value extraction
    private String extractJsonValue(String json, String key) {
        String pattern = "\"" + key + "\"\\s*:\\s*\"([^\"]+)\"";
        java.util.regex.Pattern p = java.util.regex.Pattern.compile(pattern);
        java.util.regex.Matcher m = p.matcher(json);
        if (m.find()) {
            return m.group(1);
        }
        return null;
    }

    //http response helper methods
    private void sendSuccess(HttpExchange exchange, String message) throws IOException {
        String response = "{\"message\":\"" + message + "\"}";
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(200, response.length());
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes(StandardCharsets.UTF_8));
        }
    }

    private void sendBadRequest(HttpExchange exchange, String message) throws IOException {
        String response = "{\"error\":\"" + message + "\"}";
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(400, response.length());
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes(StandardCharsets.UTF_8));
        }
    }

    private void sendConflict(HttpExchange exchange, String message) throws IOException {
        String response = "{\"error\":\"" + message + "\"}";
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(409, response.length());
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes(StandardCharsets.UTF_8));
        }
    }

    private void sendNotFound(HttpExchange exchange, String message) throws IOException {
        String response = "{\"error\":\"" + message + "\"}";
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(404, response.length());
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes(StandardCharsets.UTF_8));
        }
    }

    private void sendMethodNotAllowed(HttpExchange exchange) throws IOException {
        String response = "{\"error\":\"Method not allowed\"}";
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(405, response.length());
        try (OutputStream os = exchange.getResponseBody()) {
            os.write(response.getBytes(StandardCharsets.UTF_8));
        }
    }
}