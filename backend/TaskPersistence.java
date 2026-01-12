package backend;

import java.io.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

import backend.objects.Task;

import java.util.ArrayList;

public class TaskPersistence {
    private static final String TASKS_FILE = "tasks.json";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    //saves all tasks to a JSON file
    public static void saveTasks(ScheduleManager scheduleManager) {
        try (PrintWriter writer = new PrintWriter(new FileWriter(TASKS_FILE))) {
            List<Task> allTasks = scheduleManager.getAllTasks();
            writer.println("[");
            for (int i = 0; i < allTasks.size(); i++) {
                Task task = allTasks.get(i);
                writer.println(taskToJson(task));
                if (i < allTasks.size() - 1) {
                    writer.println(",");
                }
            }
            writer.println("]");
        } catch (IOException e) {
            System.err.println("Error saving tasks: " + e.getMessage());
        }
    }

    //loads tasks from JSON file into the schedule manager
    public static void loadTasks(ScheduleManager scheduleManager) {
        File file = new File(TASKS_FILE);
        if (!file.exists()) {
            return; //no saved tasks yet
        }

        try {
            String jsonContent = readFileToString(file);
            List<Task> tasks = parseTasksFromJson(jsonContent);
            for (Task task : tasks) {
                //add task directly to avoid conflict checking during load
                scheduleManager.addTask(
                    task.getDescription(),
                    task.getStartTime(),
                    task.getEndTime(),
                    task.getDate(),
                    true //allow overlaps during loading
                );
            }
        } catch (IOException e) {
            System.err.println("Error loading tasks: " + e.getMessage());
        }
    }

    //converts a task to JSON string
    private static String taskToJson(Task task) {
        return String.format(
            "  {\n" +
            "    \"id\": \"%s\",\n" +
            "    \"description\": \"%s\",\n" +
            "    \"startTime\": \"%s\",\n" +
            "    \"endTime\": \"%s\",\n" +
            "    \"date\": \"%s\",\n" +
            "    \"status\": \"%s\",\n" +
            "    \"priority\": \"%s\"\n" +
            "  }",
            escapeJsonString(task.getId()),
            escapeJsonString(task.getDescription()),
            task.getStartTime().format(TIME_FORMATTER),
            task.getEndTime().format(TIME_FORMATTER),
            task.getDate().format(DATE_FORMATTER),
            task.getStatus(),
            escapeJsonString(task.getPriority())
        );
    }

    //parses tasks from JSON string
    private static List<Task> parseTasksFromJson(String jsonContent) {
        List<Task> tasks = new ArrayList<>();
        try {
            String content = jsonContent.trim();
            if (content.startsWith("[") && content.endsWith("]")) {
                content = content.substring(1, content.length() - 1).trim();
            }

            if (content.isEmpty()) {
                return tasks;
            }

            String[] objects = content.split("\\}\\s*,\\s*\\{");
            for (int i = 0; i < objects.length; i++) {
                String obj = objects[i].trim();
                if (!obj.startsWith("{")) {
                    obj = "{" + obj;
                }
                if (!obj.endsWith("}")) {
                    obj = obj + "}";
                }
                if (!obj.trim().isEmpty()) {
                    Task task = parseTaskFromJson(obj);
                    if (task != null) {
                        tasks.add(task);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Error parsing JSON: " + e.getMessage());
        }
        return tasks;
    }

    //parses a single task from JSON object string
    private static Task parseTaskFromJson(String jsonObject) {
        try {
            String id = extractJsonString(jsonObject, "id");
            String description = extractJsonString(jsonObject, "description");
            String startTimeStr = extractJsonString(jsonObject, "startTime");
            String endTimeStr = extractJsonString(jsonObject, "endTime");
            String dateStr = extractJsonString(jsonObject, "date");
            String statusStr = extractJsonString(jsonObject, "status");
            String priority = extractJsonString(jsonObject, "priority");

            LocalTime startTime = LocalTime.parse(startTimeStr, TIME_FORMATTER);
            LocalTime endTime = LocalTime.parse(endTimeStr, TIME_FORMATTER);
            LocalDate date = LocalDate.parse(dateStr, DATE_FORMATTER);
            Task.TaskStatus status = Task.TaskStatus.valueOf(statusStr);

            return new Task(id, description, startTime, endTime, date, status, priority);

        } catch (Exception e) {
            System.err.println("Error parsing task from JSON: " + jsonObject + " - " + e.getMessage());
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

    //clears the tasks file (useful for testing or reset)
    public static void clearSavedTasks() {
        File file = new File(TASKS_FILE);
        if (file.exists()) {
            file.delete();
        }
    }

    //migrates data from old tasks.txt format to new JSON format
    public static void migrateFromTxtToJson() {
        File oldFile = new File("tasks.txt");
        File newFile = new File(TASKS_FILE);

        if (!oldFile.exists()) {
            System.out.println("No old tasks.txt file found to migrate.");
            return;
        }

        if (newFile.exists()) {
            System.out.println("JSON file already exists. Migration cancelled to avoid overwriting.");
            return;
        }

        try (BufferedReader reader = new BufferedReader(new FileReader(oldFile));
             PrintWriter writer = new PrintWriter(new FileWriter(newFile))) {

            List<Task> tasks = new ArrayList<>();
            String line;
            while ((line = reader.readLine()) != null) {
                if (!line.trim().isEmpty()) {
                    Task task = parseTaskFromOldFormat(line);
                    if (task != null) {
                        tasks.add(task);
                    }
                }
            }

            // Write as JSON
            writer.println("[");
            for (int i = 0; i < tasks.size(); i++) {
                writer.println(taskToJson(tasks.get(i)));
                if (i < tasks.size() - 1) {
                    writer.println(",");
                }
            }
            writer.println("]");

            System.out.println("Successfully migrated " + tasks.size() + " tasks from tasks.txt to tasks.json");

        } catch (IOException e) {
            System.err.println("Error during migration: " + e.getMessage());
        }
    }

    //parses task from old pipe-delimited format
    private static Task parseTaskFromOldFormat(String line) {
        try {
            String[] parts = line.split("\\|", -1);
            if (parts.length != 7) {
                System.err.println("Invalid task line format: " + line);
                return null;
            }

            String id = parts[0];
            String description = parts[1].replace("\\|", "|").replace("\\n", "\n").replace("\\r", "\r").replace("\\\\", "\\");
            LocalTime startTime = LocalTime.parse(parts[2], TIME_FORMATTER);
            LocalTime endTime = LocalTime.parse(parts[3], TIME_FORMATTER);
            LocalDate date = LocalDate.parse(parts[4], DATE_FORMATTER);
            Task.TaskStatus status = Task.TaskStatus.valueOf(parts[5]);
            String priority = parts[6];

            return new Task(id, description, startTime, endTime, date, status, priority);

        } catch (Exception e) {
            System.err.println("Error parsing old format task line: " + line + " - " + e.getMessage());
            return null;
        }
    }
}
