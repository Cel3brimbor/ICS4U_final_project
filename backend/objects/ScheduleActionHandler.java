package backend.objects;

import java.util.regex.Pattern;
import java.util.regex.Matcher;
import backend.ScheduleManager;
import java.time.LocalDate;
import java.time.LocalTime;

public class ScheduleActionHandler {

    private final ScheduleManager scheduleManager;

    public ScheduleActionHandler(ScheduleManager scheduleManager) {
        this.scheduleManager = scheduleManager;
    }

    public String executeScheduleAction(String actionJson) {
        try {
            if (AIResponseHandler.containsAction(actionJson, "ADD")) {
                Pattern descPattern = Pattern.compile("\"description\"\\s*:\\s*\"([^\"]+)\"");
                Pattern startPattern = Pattern.compile("\"startTime\"\\s*:\\s*\"([^\"]+)\"");
                Pattern endPattern = Pattern.compile("\"endTime\"\\s*:\\s*\"([^\"]+)\"");

                Matcher descMatcher = descPattern.matcher(actionJson);
                Matcher startMatcher = startPattern.matcher(actionJson);
                Matcher endMatcher = endPattern.matcher(actionJson);

                if (descMatcher.find() && startMatcher.find() && endMatcher.find()) {
                    String description = descMatcher.group(1);
                    LocalTime startTime = LocalTime.parse(startMatcher.group(1));
                    LocalTime endTime = LocalTime.parse(endMatcher.group(1));

                    Task newTask = scheduleManager.addTask(description, startTime, endTime, LocalDate.now(), true);
                    if (newTask != null) {
                        backend.TaskPersistence.saveTasks(scheduleManager);
                        return "Added task: " + description + " (" + startTime + " - " + endTime + ")";
                    } else {
                        return "Could not add task due to scheduling conflict.";
                    }
                }
            } else if (AIResponseHandler.containsAction(actionJson, "ADD_MULTIPLE")) {
                Pattern tasksPattern = Pattern.compile("\"tasks\"\\s*:\\s*\\[([^\\]]+)\\]");
                Matcher tasksMatcher = tasksPattern.matcher(actionJson);

                if (tasksMatcher.find()) {
                    String tasksJson = tasksMatcher.group(1);
                    String[] taskStrings = tasksJson.split("\\},\\s*\\{");

                    StringBuilder resultMessage = new StringBuilder("Added multiple tasks:\n");
                    int successCount = 0;
                    int conflictCount = 0;

                    for (String taskStr : taskStrings) {
                        taskStr = taskStr.replaceAll("^\\s*\\{|\\}\\s*$", "");

                        Pattern descPattern = Pattern.compile("\"description\"\\s*:\\s*\"([^\"]+)\"");
                        Pattern startPattern = Pattern.compile("\"startTime\"\\s*:\\s*\"([^\"]+)\"");
                        Pattern endPattern = Pattern.compile("\"endTime\"\\s*:\\s*\"([^\"]+)\"");

                        Matcher descMatcher = descPattern.matcher(taskStr);
                        Matcher startMatcher = startPattern.matcher(taskStr);
                        Matcher endMatcher = endPattern.matcher(taskStr);

                        if (descMatcher.find() && startMatcher.find() && endMatcher.find()) {
                            String description = descMatcher.group(1);
                            LocalTime startTime = LocalTime.parse(startMatcher.group(1));
                            LocalTime endTime = LocalTime.parse(endMatcher.group(1));

                            Task newTask = scheduleManager.addTask(description, startTime, endTime, LocalDate.now(), true);
                            if (newTask != null) {
                                resultMessage.append("- ").append(description).append(" (").append(startTime).append(" - ").append(endTime).append(")\n");
                                successCount++;
                            } else {
                                resultMessage.append("- ").append(description).append(" (CONFLICT - not added)\n");
                                conflictCount++;
                            }
                        }
                    }

                    backend.TaskPersistence.saveTasks(scheduleManager);
                    resultMessage.append("\nSummary: ").append(successCount).append(" tasks added");
                    if (conflictCount > 0) {
                        resultMessage.append(", ").append(conflictCount).append(" conflicts");
                    }
                    return resultMessage.toString();
                }
            } else if (AIResponseHandler.containsAction(actionJson, "UPDATE")) {
                Pattern idPattern = Pattern.compile("\"taskId\"\\s*:\\s*\"([^\"]+)\"");
                Matcher idMatcher = idPattern.matcher(actionJson);
                if (idMatcher.find()) {
                    String taskId = idMatcher.group(1);
                    if (scheduleManager.updateTaskStatus(taskId, Task.TaskStatus.COMPLETED)) {
                        backend.TaskPersistence.saveTasks(scheduleManager);
                        return "Marked task as completed.";
                    } else {
                        return "Could not find task with ID: " + taskId;
                    }
                }
            } else if (AIResponseHandler.containsAction(actionJson, "DELETE")) {
                Pattern idPattern = Pattern.compile("\"taskId\"\\s*:\\s*\"([^\"]+)\"");
                Matcher idMatcher = idPattern.matcher(actionJson);
                if (idMatcher.find()) {
                    String taskId = idMatcher.group(1);
                    if (scheduleManager.removeTask(taskId)) {
                        backend.TaskPersistence.saveTasks(scheduleManager);
                        return "Deleted task with ID: " + taskId;
                    } else {
                        return "Could not find task with ID: " + taskId;
                    }
                }
            } else if (AIResponseHandler.containsAction(actionJson, "DELETE_MULTIPLE")) {
                Pattern taskIdsPattern = Pattern.compile("\"taskIds\"\\s*:\\s*\\[([^\\]]+)\\]");
                Matcher taskIdsMatcher = taskIdsPattern.matcher(actionJson);

                if (taskIdsMatcher.find()) {
                    String taskIdsJson = taskIdsMatcher.group(1);
                    String[] taskIdStrings = taskIdsJson.split("\\s*,\\s*");

                    StringBuilder resultMessage = new StringBuilder("Deleted multiple tasks:\n");
                    int successCount = 0;
                    int notFoundCount = 0;

                    for (String taskIdStr : taskIdStrings) {
                        taskIdStr = taskIdStr.replaceAll("^\\s*\"|\"\\s*$", "");

                        if (scheduleManager.removeTask(taskIdStr)) {
                            resultMessage.append("- Deleted task: ").append(taskIdStr).append("\n");
                            successCount++;
                        } else {
                            resultMessage.append("- Task not found: ").append(taskIdStr).append("\n");
                            notFoundCount++;
                        }
                    }

                    backend.TaskPersistence.saveTasks(scheduleManager);
                    resultMessage.append("\nSummary: ").append(successCount).append(" tasks deleted");
                    if (notFoundCount > 0) {
                        resultMessage.append(", ").append(notFoundCount).append(" not found");
                    }
                    return resultMessage.toString();
                }
            } else if (AIResponseHandler.containsAction(actionJson, "COMPLETE")) {
                Pattern idPattern = Pattern.compile("\"taskId\"\\s*:\\s*\"([^\"]+)\"");
                Matcher idMatcher = idPattern.matcher(actionJson);
                if (idMatcher.find()) {
                    String taskId = idMatcher.group(1);
                    if (scheduleManager.updateTaskStatus(taskId, Task.TaskStatus.COMPLETED)) {
                        backend.TaskPersistence.saveTasks(scheduleManager);
                        return "Marked task as completed.";
                    } else {
                        return "Could not find task with ID: " + taskId;
                    }
                }
            } else if (AIResponseHandler.containsAction(actionJson, "ITEM_NOT_FOUND")) {
                Pattern typePattern = Pattern.compile("\"itemType\"\\s*:\\s*\"([^\"]+)\"");
                Pattern idPattern = Pattern.compile("\"itemId\"\\s*:\\s*\"([^\"]+)\"");
                Matcher typeMatcher = typePattern.matcher(actionJson);
                Matcher idMatcher = idPattern.matcher(actionJson);

                if (typeMatcher.find() && idMatcher.find()) {
                    String itemType = typeMatcher.group(1);
                    String itemId = idMatcher.group(1);
                    return "The " + itemType + " with ID " + itemId + " does not exist in the system.";
                }
                return "The requested item does not exist.";
            } else if (AIResponseHandler.containsAction(actionJson, "NEED_INFO")) {
                return "I need more information to complete this action.";
            }

            //this return should not occur if AI successfully does everyting above
            return "Action not completed. Please try again or use a different prompt.";

        } catch (Exception e) {
            return "Error executing schedule action: " + e.getMessage();
        }
    }
}