package backend;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.util.*;

public class FrontendDataHandler {

    private static final int MAX_DESCRIPTION_LENGTH = 200;
    private static final int MIN_TASK_DURATION_MINUTES = 15;
    private static final int MAX_TASK_DURATION_MINUTES = 480;

    //validation error messages
    public static final String ERR_INVALID_JSON = "Invalid JSON format";
    private static final String ERR_MISSING_DESCRIPTION = "Task description is required";
    private static final String ERR_INVALID_DESCRIPTION = "Task description must be 1-200 characters";
    private static final String ERR_MISSING_START_TIME = "Start time is required";
    private static final String ERR_MISSING_END_TIME = "End time is required";
    private static final String ERR_INVALID_TIME_FORMAT = "Time must be in HH:MM format";
    private static final String ERR_END_BEFORE_START = "End time must be after start time";
    private static final String ERR_TASK_TOO_SHORT = "Task must be at least 15 minutes long";
    private static final String ERR_TASK_TOO_LONG = "Task cannot be longer than 8 hours";
    private static final String ERR_INVALID_STATUS = "Invalid task status";

    public static class TaskCreateRequest {
        private String description;
        private String startTime;
        private String endTime;

        public TaskCreateRequest() {}

        public String getDescription() 
        { 
            return description; 
        }
        public String getStartTime() 
        {
            return startTime; 
        }
        public String getEndTime() 
        {
            return endTime; 
        }

        public void setDescription(String description) 
        {
            this.description = description; 
        }
        public void setStartTime(String startTime) 
        {
            this.startTime = startTime; 
        }
        public void setEndTime(String endTime) 
        {
            this.endTime = endTime; 
        }

        @Override
        public String toString() 
        {
            return String.format("TaskCreateRequest{description='%s', startTime='%s', endTime='%s'}",
                    description, startTime, endTime);
        }
    }

    public static class TaskUpdateRequest {
        private String status;

        public TaskUpdateRequest() {}

        public String getStatus() 
        {
            return status; 
        }

        public void setStatus(String status) 
        {
            this.status = status; 
        }

        @Override
        public String toString() {
            return String.format("TaskUpdateRequest{status='%s'}", status);
        }
    }

    public static class TaskResponse {
        private String id;
        private String description;
        private String startTime;
        private String endTime;
        private String status;
        private int duration;

        public TaskResponse() {}

        public TaskResponse(Task task) {
            DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");
            this.id = task.getId();
            this.description = task.getDescription();
            this.startTime = task.getStartTime().format(timeFormatter);
            this.endTime = task.getEndTime().format(timeFormatter);
            this.status = task.getStatus().toString();
            this.duration = task.getDurationMinutes();
        }

        //getters
        public String getId() 
        {
            return id; 
        }
        public String getDescription() 
        {
            return description; 
        }
        public String getStartTime() 
        {
            return startTime;
        }
        public String getEndTime() 
        {
            return endTime; 
        }
        public String getStatus() 
        {
            return status; 
        }
        public int getDuration() 
        {
            return duration; 
        }

        // setters
        public void setId(String id) 
        {
            this.id = id;
        }
        public void setDescription(String description) 
        { 
            this.description = description; 
        }
        public void setStartTime(String startTime)
        {
            this.startTime = startTime; 
        }
        public void setEndTime(String endTime) 
        {
            this.endTime = endTime; 
        }
        public void setStatus(String status) 
        {
            this.status = status; 
        }
        public void setDuration(int duration) 
        {
            this.duration = duration; 
        }

        @Override
        public String toString() 
        {
            return String.format("TaskResponse{id='%s', description='%s', startTime='%s', endTime='%s', status='%s', duration=%d}",
                    id, description, startTime, endTime, status, duration);
        }
    }

    /**
     * Parses JSON string from frontend task creation request
     * @param json JSON string from frontend
     * @return TaskCreateRequest object or null if invalid
     */
    public static TaskCreateRequest parseTaskCreateRequest(String json) {
        try {
            json = json.trim();
            if (!json.startsWith("{") || !json.endsWith("}")) {
                return null;
            }
            json = json.substring(1, json.length() - 1);

            TaskCreateRequest request = new TaskCreateRequest();
            String[] pairs = json.split(",");

            for (String pair : pairs) 
            {
                String[] keyValue = pair.split(":", 2);
                if (keyValue.length != 2) continue;

                String key = keyValue[0].trim().replaceAll("\"", "");
                String value = keyValue[1].trim().replaceAll("\"", "");

                switch (key) {
                    case "description":
                        request.setDescription(value);
                        break;
                    case "startTime":
                        request.setStartTime(value);
                        break;
                    case "endTime":
                        request.setEndTime(value);
                        break;
                }
            }

            return request;

        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Parses JSON string from frontend task update request
     * @param json JSON string from frontend
     * @return TaskUpdateRequest object or null if invalid
     */
    public static TaskUpdateRequest parseTaskUpdateRequest(String json) {
        try {
            json = json.trim();
            if (!json.startsWith("{") || !json.endsWith("}")) {
                return null;
            }
            json = json.substring(1, json.length() - 1);

            TaskUpdateRequest request = new TaskUpdateRequest();
            String[] pairs = json.split(",");

            for (String pair : pairs) {
                String[] keyValue = pair.split(":", 2);
                if (keyValue.length != 2) continue;

                String key = keyValue[0].trim().replaceAll("\"", "");
                String value = keyValue[1].trim().replaceAll("\"", "");

                if ("status".equals(key)) {
                    request.setStatus(value);
                }
            }

            return request;

        } catch (Exception e) {
            return null;
        }
    }

    public static List<String> validateTaskCreateRequest(TaskCreateRequest request) {
        List<String> errors = new ArrayList<>();

        //validate
        if (request.getDescription() == null || request.getDescription().trim().isEmpty()) {
            errors.add(ERR_MISSING_DESCRIPTION);
        } else if (request.getDescription().length() > MAX_DESCRIPTION_LENGTH) {
            errors.add(ERR_INVALID_DESCRIPTION);
        }

        //validate start time
        if (request.getStartTime() == null || request.getStartTime().trim().isEmpty()) {
            errors.add(ERR_MISSING_START_TIME);
        } else if (!isValidTimeFormat(request.getStartTime())) {
            errors.add(ERR_INVALID_TIME_FORMAT + " for start time");
        }

        //validate end time
        if (request.getEndTime() == null || request.getEndTime().trim().isEmpty()) {
            errors.add(ERR_MISSING_END_TIME);
        } else if (!isValidTimeFormat(request.getEndTime())) {
            errors.add(ERR_INVALID_TIME_FORMAT + " for end time");
        }

        if (request.getStartTime() != null && request.getEndTime() != null &&
            isValidTimeFormat(request.getStartTime()) && isValidTimeFormat(request.getEndTime())) {

            try {
                LocalTime start = LocalTime.parse(request.getStartTime());
                LocalTime end = LocalTime.parse(request.getEndTime());

                if (!end.isAfter(start)) {
                    errors.add(ERR_END_BEFORE_START);
                }

                int duration = end.toSecondOfDay() / 60 - start.toSecondOfDay() / 60;
                if (duration < MIN_TASK_DURATION_MINUTES) {
                    errors.add(ERR_TASK_TOO_SHORT);
                } else if (duration > MAX_TASK_DURATION_MINUTES) {
                    errors.add(ERR_TASK_TOO_LONG);
                }

            } catch (DateTimeParseException e) {
                errors.add("Error parsing time values");
            }
        }

        return errors;
    }

    public static List<String> validateTaskUpdateRequest(TaskUpdateRequest request) {
        List<String> errors = new ArrayList<>();

        if (request.getStatus() == null || request.getStatus().trim().isEmpty()) {
            errors.add("Status is required");
        } else {
            try {
                Task.TaskStatus.valueOf(request.getStatus().toUpperCase());
            } catch (IllegalArgumentException e) {
                errors.add(ERR_INVALID_STATUS + ": " + request.getStatus());
            }
        }

        return errors;
    }

    public static Task createTaskFromRequest(TaskCreateRequest request) 
    {
        LocalTime startTime = LocalTime.parse(request.getStartTime());
        LocalTime endTime = LocalTime.parse(request.getEndTime());
        return new Task(request.getDescription(), startTime, endTime);
    }

    public static Task.TaskStatus getTaskStatusFromRequest(TaskUpdateRequest request) 
    {
        return Task.TaskStatus.valueOf(request.getStatus().toUpperCase());
    }

    public static TaskResponse createTaskResponse(Task task) 
    {
        return new TaskResponse(task);
    }

    /**
     * Converts list of Task objects to JSON string for frontend
     * @param tasks List of tasks
     * @return JSON string
     */
    public static String tasksToJson(List<Task> tasks) 
    {
        StringBuilder sb = new StringBuilder();
        sb.append("[");
        for (int i = 0; i < tasks.size(); i++) {
            sb.append(taskToJson(tasks.get(i)));
            if (i < tasks.size() - 1) sb.append(",");
        }
        sb.append("]");
        return sb.toString();
    }

    /**
     * Converts Task object to JSON string for frontend
     * @param task Task object
     * @return JSON string
     */
    public static String taskToJson(Task task) 
    {
        TaskResponse response = createTaskResponse(task);
        return String.format(
            "{\"id\":\"%s\",\"description\":\"%s\",\"startTime\":\"%s\",\"endTime\":\"%s\",\"status\":\"%s\",\"duration\":%d}",
            response.getId(),
            escapeJsonString(response.getDescription()),
            response.getStartTime(),
            response.getEndTime(),
            response.getStatus(),
            response.getDuration()
        );
    }

    //validates if a time string is in valid HH:MM format
    private static boolean isValidTimeFormat(String timeStr) 
    {
        try 
        {
            LocalTime.parse(timeStr);
            return true;
        } catch (DateTimeParseException e) {
            return false;
        }
    }

    //escapes special characters
    private static String escapeJsonString(String str) 
    {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("\"", "\\\"")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r")
                  .replace("\t", "\\t");
    }

    //error message creation
    public static String createValidationErrorResponse(List<String> errors) 
    {
        StringBuilder sb = new StringBuilder();
        sb.append("{\"error\":\"");
        for (int i = 0; i < errors.size(); i++) {
            sb.append(escapeJsonString(errors.get(i)));
            if (i < errors.size() - 1) sb.append(". ");
        }
        sb.append("\"}");
        return sb.toString();
    }

    public static String createSuccessResponse(String message) 
    {
        return String.format("{\"message\":\"%s\"}", escapeJsonString(message));
    }
}