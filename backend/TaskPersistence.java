package backend;

import java.io.*;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

public class TaskPersistence {
    private static final String TASKS_FILE = "tasks.txt";
    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd");
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    //saves all tasks to a file
    public static void saveTasks(ScheduleManager scheduleManager) {
        try (PrintWriter writer = new PrintWriter(new FileWriter(TASKS_FILE))) {
            List<Task> allTasks = scheduleManager.getAllTasks();

            for (Task task : allTasks) {
                //format: id|description|startTime|endTime|date|status|priority
                String line = String.format("%s|%s|%s|%s|%s|%s|%s",
                        task.getId(),
                        escapeSpecialChars(task.getDescription()),
                        task.getStartTime().format(TIME_FORMATTER),
                        task.getEndTime().format(TIME_FORMATTER),
                        task.getDate().format(DATE_FORMATTER),
                        task.getStatus(),
                        task.getPriority());
                writer.println(line);
            }
        } catch (IOException e) {
            System.err.println("Error saving tasks: " + e.getMessage());
        }
    }

    //loads tasks from file into the schedule manager
    public static void loadTasks(ScheduleManager scheduleManager) {
        File file = new File(TASKS_FILE);
        if (!file.exists()) {
            return; //no saved tasks yet
        }

        try (BufferedReader reader = new BufferedReader(new FileReader(file))) {
            String line;
            while ((line = reader.readLine()) != null) {
                Task task = parseTaskFromLine(line);
                if (task != null) {
                    //add task directly to avoid conflict checking during load
                    scheduleManager.addTask(
                        task.getDescription(),
                        task.getStartTime(),
                        task.getEndTime(),
                        task.getDate(),
                        true //allow overlaps during loading
                    );
                }
            }
        } catch (IOException e) {
            System.err.println("Error loading tasks: " + e.getMessage());
        }
    }

    //parses a task from a formatted line
    private static Task parseTaskFromLine(String line) {
        try {
            String[] parts = line.split("\\|", -1); // -1 to include empty strings
            if (parts.length != 7) {
                System.err.println("Invalid task line format: " + line);
                return null;
            }

            String id = parts[0];
            String description = unescapeSpecialChars(parts[1]);
            LocalTime startTime = LocalTime.parse(parts[2], TIME_FORMATTER);
            LocalTime endTime = LocalTime.parse(parts[3], TIME_FORMATTER);
            LocalDate date = LocalDate.parse(parts[4], DATE_FORMATTER);
            Task.TaskStatus status = Task.TaskStatus.valueOf(parts[5]);
            String priority = parts[6];

            Task task = new Task(id, description, startTime, endTime, date, status, priority);
            return task;

        } catch (Exception e) {
            System.err.println("Error parsing task line: " + line + " - " + e.getMessage());
            return null;
        }
    }

    //escapes special characters in strings for file storage
    private static String escapeSpecialChars(String str) {
        if (str == null) return "";
        return str.replace("\\", "\\\\")
                  .replace("|", "\\|")
                  .replace("\n", "\\n")
                  .replace("\r", "\\r");
    }

    //unescapes special characters from stored strings
    private static String unescapeSpecialChars(String str) {
        if (str == null) return "";
        return str.replace("\\|", "|")
                  .replace("\\n", "\n")
                  .replace("\\r", "\r")
                  .replace("\\\\", "\\");
    }

    //clears the tasks file (useful for testing or reset)
    public static void clearSavedTasks() {
        File file = new File(TASKS_FILE);
        if (file.exists()) {
            file.delete();
        }
    }
}
