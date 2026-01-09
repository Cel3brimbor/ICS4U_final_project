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
import java.util.ArrayList;
import java.util.List;

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
        // TODO: Add timer endpoint here when implement Timer.java

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
            String jsonResponse = tasksToJsonArray(tasks);

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

                //parse and validate JSON using FrontendDataHandler
                FrontendDataHandler.TaskCreateRequest request = FrontendDataHandler.parseTaskCreateRequest(requestBody);
                if (request == null) {
                    sendBadRequest(exchange, FrontendDataHandler.ERR_INVALID_JSON);
                    return;
                }

                //validate the request
                List<String> validationErrors = FrontendDataHandler.validateTaskCreateRequest(request);
                if (!validationErrors.isEmpty()) {
                    sendBadRequest(exchange, FrontendDataHandler.createValidationErrorResponse(validationErrors));
                    return;
                }

                //create task from validated request
                Task newTask = FrontendDataHandler.createTaskFromRequest(request);

                //add task to schedule
                Task addedTask = scheduleManager.addTask(
                    newTask.getDescription(),
                    newTask.getStartTime(),
                    newTask.getEndTime()
                );

                if (addedTask != null) {
                    //save to persistence
                    TaskPersistence.saveTasks(scheduleManager);

                    String jsonResponse = FrontendDataHandler.taskToJson(addedTask);
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

        //helper method to read request body
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

        //parse JSON directly into Task object
        private Task parseTaskFromJson(String json) {
            try {
                // Simple JSON parsing - extract field values directly into Task constructor
                String description = extractJsonString(json, "description");
                String startTimeStr = extractJsonString(json, "startTime");
                String endTimeStr = extractJsonString(json, "endTime");

                if (description == null || startTimeStr == null || endTimeStr == null) {
                    return null;
                }

                LocalTime startTime = LocalTime.parse(startTimeStr);
                LocalTime endTime = LocalTime.parse(endTimeStr);

                return new Task(description, startTime, endTime);
            } catch (Exception e) {
                System.err.println("Error parsing task JSON: " + e.getMessage());
                return null;
            }
        }

        //validate Task object
        private List<String> validateTask(Task task) {
            List<String> errors = new ArrayList<>();

            if (task.getDescription() == null || task.getDescription().trim().isEmpty()) {
                errors.add("Task description cannot be empty");
            }
            if (task.getStartTime() == null) {
                errors.add("Start time cannot be null");
            }
            if (task.getEndTime() == null) {
                errors.add("End time cannot be null");
            }
            if (task.getStartTime() != null && task.getEndTime() != null) {
                if (task.getStartTime().isAfter(task.getEndTime()) || task.getStartTime().equals(task.getEndTime())) {
                    errors.add("Start time must be before end time");
                }
            }

            return errors;
        }

        //create validation error response
        private String createValidationErrorResponse(List<String> errors) {
            StringBuilder sb = new StringBuilder();
            sb.append("{\"error\":\"Validation failed\",\"details\":[");
            for (int i = 0; i < errors.size(); i++) {
                sb.append("\"").append(errors.get(i)).append("\"");
                if (i < errors.size() - 1) sb.append(",");
            }
            sb.append("]}");
            return sb.toString();
        }

        //convert Task to JSON
        private String taskToJson(Task task) {
            return String.format(
                "{\"id\":\"%s\",\"description\":\"%s\",\"startTime\":\"%s\",\"endTime\":\"%s\",\"date\":\"%s\",\"status\":\"%s\",\"priority\":\"%s\"}",
                task.getId(),
                escapeJsonString(task.getDescription()),
                task.getStartTime(),
                task.getEndTime(),
                task.getDate(),
                task.getStatus(),
                task.getPriority()
            );
        }

        //convert list of tasks to JSON array
        private String tasksToJsonArray(List<Task> tasks) {
            StringBuilder sb = new StringBuilder();
            sb.append("[");
            for (int i = 0; i < tasks.size(); i++) {
                sb.append(taskToJson(tasks.get(i)));
                if (i < tasks.size() - 1) {
                    sb.append(",");
                }
            }
            sb.append("]");
            return sb.toString();
        }

        //extract string value from JSON field
        private String extractJsonString(String json, String fieldName) {
            String pattern = "\"" + fieldName + "\":\\s*\"([^\"]*)\"";
            java.util.regex.Pattern p = java.util.regex.Pattern.compile(pattern);
            java.util.regex.Matcher m = p.matcher(json);
            if (m.find()) {
                return m.group(1);
            }
            return null;
        }

        //escape special characters for JSON
        private String escapeJsonString(String str) {
            if (str == null) return "";
            return str.replace("\\", "\\\\")
                      .replace("\"", "\\\"")
                      .replace("\n", "\\n")
                      .replace("\r", "\\r")
                      .replace("\t", "\\t");
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
                // Use TaskHandler's own taskToJson method (need to add it)
                String jsonResponse = taskToJson(task);
                exchange.getResponseHeaders().set("Content-Type", "application/json");
                exchange.sendResponseHeaders(200, jsonResponse.length());

                try (OutputStream os = exchange.getResponseBody()) {
                    os.write(jsonResponse.getBytes(StandardCharsets.UTF_8));
                }
            } else {
                sendNotFound(exchange, "{\"error\":\"Task not found\"}");
            }
        }

        private void handleUpdateTask(HttpExchange exchange, String taskId) throws IOException {
            try {
                String requestBody = readRequestBody(exchange);

                // Extract status from JSON directly
                String statusStr = extractJsonString(requestBody, "status");
                if (statusStr == null) {
                    sendBadRequest(exchange, "{\"error\":\"Status field required\"}");
                    return;
                }

                Task.TaskStatus status = Task.TaskStatus.valueOf(statusStr.toUpperCase());
                boolean updated = scheduleManager.updateTaskStatus(taskId, status);

                if (updated) {
                    TaskPersistence.saveTasks(scheduleManager);
                    sendSuccess(exchange, "{\"message\":\"Task updated successfully\"}");
                } else {
                    sendNotFound(exchange, "{\"error\":\"Task not found\"}");
                }

            } catch (Exception e) {
                sendBadRequest(exchange, "{\"error\":\"Error processing request: " + e.getMessage() + "\"}");
            }
        }

        private void handleDeleteTask(HttpExchange exchange, String taskId) throws IOException {
            boolean removed = scheduleManager.removeTask(taskId);

            if (removed) {
                TaskPersistence.saveTasks(scheduleManager);
                sendSuccess(exchange, "{\"message\":\"Task deleted successfully\"}");
            } else {
                sendNotFound(exchange, "{\"error\":\"Task not found\"}");
            }
        }

        //helper methods for TaskHandler

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

        private String extractJsonString(String json, String fieldName) {
            String pattern = "\"" + fieldName + "\":\\s*\"([^\"]*)\"";
            java.util.regex.Pattern p = java.util.regex.Pattern.compile(pattern);
            java.util.regex.Matcher m = p.matcher(json);
            if (m.find()) {
                return m.group(1);
            }
            return null;
        }

        private String taskToJson(Task task) {
            return String.format(
                "{\"id\":\"%s\",\"description\":\"%s\",\"startTime\":\"%s\",\"endTime\":\"%s\",\"date\":\"%s\",\"status\":\"%s\",\"priority\":\"%s\"}",
                task.getId(),
                escapeJsonString(task.getDescription()),
                task.getStartTime(),
                task.getEndTime(),
                task.getDate(),
                task.getStatus(),
                task.getPriority()
            );
        }

        private String escapeJsonString(String str) {
            if (str == null) return "";
            return str.replace("\\", "\\\\")
                      .replace("\"", "\\\"")
                      .replace("\n", "\\n")
                      .replace("\r", "\\r")
                      .replace("\t", "\\t");
        }
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
