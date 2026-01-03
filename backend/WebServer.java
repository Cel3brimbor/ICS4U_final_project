package backend;

import com.sun.net.httpserver.HttpServer;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpExchange;
import java.io.*;
import java.net.InetSocketAddress;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

public class WebServer {
    private static final int PORT = 8080;
    private static final String FRONTEND_PATH = "frontend/";
    private ScheduleManager scheduleManager;

    public WebServer(ScheduleManager scheduleManager) {
        this.scheduleManager = scheduleManager;
    }

    public void start() throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

        //handle all static files with one handler
        server.createContext("/", new StaticFileHandler());

        //API endpoints
        server.createContext("/api/tasks", new TasksHandler());
        server.createContext("/api/tasks/", new TaskHandler()); //for specific task operations

        server.setExecutor(null);
        server.start();

        System.out.println("Server started on http://localhost:" + PORT);
        System.out.println("Open your browser and navigate to http://localhost:" + PORT);
    }

    //handle static files (HTML, CSS, JS)
    class StaticFileHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String requestPath = exchange.getRequestURI().getPath();
            if (requestPath.equals("/")) {
                requestPath = "/index.html";
            }

            //build path relative to frontend directory
            Path filePath = Paths.get(FRONTEND_PATH, requestPath.substring(1));
            File file = filePath.toFile();

            //System.out.println("File path: " + filePath);

            if (file.exists() && file.isFile()) {
                //set appropriate content type
                String contentType = getContentType(requestPath);
                exchange.getResponseHeaders().set("Content-Type", contentType);

                //read and send file
                byte[] fileBytes = Files.readAllBytes(filePath);
                exchange.sendResponseHeaders(200, fileBytes.length);
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(fileBytes);
                }
            } else {
                String response = "File not found: " + requestPath;
                exchange.sendResponseHeaders(404, response.length());
                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(response.getBytes());
                }
            }
        }

        private String getContentType(String path) {
            if (path.endsWith(".html")) return "text/html";
            if (path.endsWith(".css")) return "text/css";
            if (path.endsWith(".js")) return "application/javascript";
            return "text/plain";
        }
    }

    //handle /api/tasks (GET all tasks, POST new task)
    class TasksHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod();

            if ("GET".equals(method)) {
                handleGetTasks(exchange);
            } else if ("POST".equals(method)) {
                handlePostTask(exchange);
            } else {
                sendMethodNotAllowed(exchange);
            }
        }

        private void handleGetTasks(HttpExchange exchange) throws IOException {
            List<Task> tasks = scheduleManager.getTodayTasks();
            String jsonResponse = tasksToJson(tasks);

            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(200, jsonResponse.length());

            try (OutputStream os = exchange.getResponseBody()) {
                os.write(jsonResponse.getBytes(StandardCharsets.UTF_8));
            }
        }

        private void handlePostTask(HttpExchange exchange) throws IOException {
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

                //parse JSON
                Task newTask = parseTaskFromJson(requestBody);
                if (newTask == null) {
                    sendBadRequest(exchange, "Invalid task data");
                    return;
                }

                //add task to schedule
                Task addedTask = scheduleManager.addTask(
                    newTask.getDescription(),
                    newTask.getStartTime(),
                    newTask.getEndTime()
                );

                if (addedTask != null) {
                    //save to persistence
                    TaskPersistence.saveTasks(scheduleManager);

                    String jsonResponse = taskToJson(addedTask);
                    exchange.getResponseHeaders().set("Content-Type", "application/json");
                    exchange.sendResponseHeaders(201, jsonResponse.length());

                    try (OutputStream os = exchange.getResponseBody()) {
                        os.write(jsonResponse.getBytes(StandardCharsets.UTF_8));
                    }
                } else {
                    sendConflict(exchange, "Task conflicts with existing schedule");
                }

            } catch (Exception e) {
                sendBadRequest(exchange, "Error processing request: " + e.getMessage());
            }
        }
    }

    //handle /api/tasks/{id} (GET, PUT, DELETE specific task)
    class TaskHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            String method = exchange.getRequestMethod();
            String path = exchange.getRequestURI().getPath();

            // Extract task ID from path
            String taskId = path.substring("/api/tasks/".length());
            if (taskId.isEmpty()) {
                sendBadRequest(exchange, "Task ID required");
                return;
            }

            if ("GET".equals(method)) {
                handleGetTask(exchange, taskId);
            } else if ("PUT".equals(method)) {
                handleUpdateTask(exchange, taskId);
            } else if ("DELETE".equals(method)) {
                handleDeleteTask(exchange, taskId);
            } else {
                sendMethodNotAllowed(exchange);
            }
        }

        private void handleGetTask(HttpExchange exchange, String taskId) throws IOException {
            //find task by ID
            List<Task> todayTasks = scheduleManager.getTodayTasks();
            Task task = null;
            for (Task t : todayTasks) {
                if (t.getId().equals(taskId)) {
                    task = t;
                    break;
                }
            }

            if (task != null) {
                String jsonResponse = taskToJson(task);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, jsonResponse.length());

                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(jsonResponse.getBytes(StandardCharsets.UTF_8));
                }
            } else {
                sendNotFound(exchange, "Task not found");
            }
        }

        private void handleUpdateTask(HttpExchange exchange, String taskId) throws IOException {
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

                //parse JSON to get status update
                String newStatus = parseStatusFromJson(requestBody);
                if (newStatus == null) {
                    sendBadRequest(exchange, "Invalid status data");
                    return;
                }

                Task.TaskStatus status = Task.TaskStatus.valueOf(newStatus.toUpperCase());
                boolean updated = scheduleManager.updateTaskStatus(taskId, status);

                if (updated) {
                    TaskPersistence.saveTasks(scheduleManager);
                    sendSuccess(exchange, "Task updated successfully");
                } else {
                    sendNotFound(exchange, "Task not found");
                }

            } catch (Exception e) {
                sendBadRequest(exchange, "Error processing request: " + e.getMessage());
            }
        }

        private void handleDeleteTask(HttpExchange exchange, String taskId) throws IOException {
            boolean removed = scheduleManager.removeTask(taskId);

            if (removed) {
                TaskPersistence.saveTasks(scheduleManager);
                sendSuccess(exchange, "Task deleted successfully");
            } else {
                sendNotFound(exchange, "Task not found");
            }
        }
    }

    //utility methods for JSON handling
    private String tasksToJson(List<Task> tasks) {
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        for (int i = 0; i < tasks.size(); i++) {
            sb.append(taskToJson(tasks.get(i)));
            if (i < tasks.size() - 1) sb.append(",");
        }
        sb.append("]");
        return sb.toString();
    }

    private String taskToJson(Task task) {
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");
        return String.format(
            "{\"id\":\"%s\",\"description\":\"%s\",\"startTime\":\"%s\",\"endTime\":\"%s\",\"status\":\"%s\",\"duration\":%d}",
            task.getId(),
            escapeJsonString(task.getDescription()),
            task.getStartTime().format(timeFormatter),
            task.getEndTime().format(timeFormatter),
            task.getStatus().toString(),
            task.getDurationMinutes()
        );
    }

    private Task parseTaskFromJson(String json) {
        try {
            //simple JSON parsing (remove braces and split by commas)
            json = json.trim();
            if (!json.startsWith("{") || !json.endsWith("}")) return null;
            json = json.substring(1, json.length() - 1);

            String description = null;
            String startTimeStr = null;
            String endTimeStr = null;

            String[] pairs = json.split(",");
            for (String pair : pairs) {
                String[] keyValue = pair.split(":", 2);
                if (keyValue.length != 2) continue;

                String key = keyValue[0].trim().replaceAll("\"", "");
                String value = keyValue[1].trim().replaceAll("\"", "");

                switch (key) {
                    case "description":
                        description = value;
                        break;
                    case "startTime":
                        startTimeStr = value;
                        break;
                    case "endTime":
                        endTimeStr = value;
                        break;
                }
            }

            if (description == null || startTimeStr == null || endTimeStr == null) {
                return null;
            }

            LocalTime startTime = LocalTime.parse(startTimeStr);
            LocalTime endTime = LocalTime.parse(endTimeStr);

            return new Task(description, startTime, endTime);

        } catch (Exception e) {
            return null;
        }
    }

    private String parseStatusFromJson(String json) {
        try {
            json = json.trim();
            if (!json.startsWith("{") || !json.endsWith("}")) return null;
            json = json.substring(1, json.length() - 1);

            String[] pairs = json.split(",");
            for (String pair : pairs) {
                String[] keyValue = pair.split(":", 2);
                if (keyValue.length != 2) continue;

                String key = keyValue[0].trim().replaceAll("\"", "");
                String value = keyValue[1].trim().replaceAll("\"", "");

                if ("status".equals(key)) {
                    return value;
                }
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }

    private String escapeJsonString(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
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
