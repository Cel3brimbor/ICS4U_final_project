package backend.objects;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import backend.NoteManager;
import backend.ScheduleManager;
import backend.objects.Note;
import backend.objects.Task;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

public class Agent {

    private final HttpClient httpClient;
    private final GeminiConfig config;
    private final NoteManager noteManager;
    private final ScheduleManager scheduleManager;

    public Agent(GeminiConfig config, NoteManager noteManager, ScheduleManager scheduleManager) {
        this.config = config;
        this.httpClient = HttpClient.newHttpClient();
        this.noteManager = noteManager;
        this.scheduleManager = scheduleManager;
    }

    /**
     * general chat/conversation with AI - returns text response only. has no editing powers.
     */
    public String chat(String message) {
        if (config.getAccessToken() == null || config.getAccessToken().isEmpty()) {
            return "AI is not configured.";
        }

        String prompt = message;

        try {
            String response = callGeminiAPI(prompt, 1000); //higher token limit
            return extractContentFromResponse(response);
        } catch (Exception e) {
            System.err.println("Chat failed: " + e.getMessage());
            return "Sorry, I encountered an error processing your message.";
        }
    }

    /**
     * AI note editing - can add, modify, or delete notes
     */
    public String editNotes(String instruction) {
        try {
            //get current notes
            List<Note> currentNotes = noteManager.getAllNotes();
            String notesContext = formatNotesForAI(currentNotes);

            String prompt = String.format(
                "You are an AI assistant that can edit notes. User's current notes:\n%s\n\n" +
                "User instruction: %s\n\n" +
                "IMPORTANT VALIDATION AND TOOLS:\n" +
                "- For UPDATE: You MUST have both noteId (UUID) and new content\n" +
                "- For DELETE: You MUST have the noteId (UUID) to delete\n" +
                "- If the note requested to be edited or deleted doesn't exist, use {\"action\":\"ITEM_NOT_FOUND\",\"itemType\":\"note\",\"itemId\":\"uuid-here\"}\n" +
                "- If information is missing or unclear, respond with {\"action\":\"NEED_INFO\",\"message\":\"what you need\"}\n\n" +
                "Respond with a JSON object. Examples:\n" +
                "- To add a note: {\"action\":\"ADD\",\"content\":\"note content here\"}\n" +
                "- To update a note: {\"action\":\"UPDATE\",\"noteId\":\"uuid-here\",\"content\":\"updated content\"}\n" +
                "- To delete a note: {\"action\":\"DELETE\",\"noteId\":\"uuid-here\"}\n" +
                "- If unclear: {\"action\":\"NEED_INFO\",\"message\":\"Please specify which note to update\"}\n\n" +
                "Choose the appropriate action based on the user's instruction.",
                notesContext,
                instruction
            );

            String aiResponse = callGeminiAPI(prompt, 300);
            String actionJson = extractContentFromResponse(aiResponse);

            //execute
            return executeNoteAction(actionJson);

        } catch (Exception e) {
            System.err.println("Note editing failed: " + e.getMessage());
            return "Error editing notes: " + e.getMessage();
        }
    }

    /**
     *schedule editing - agent can add, modify, or delete tasks
     */
    public String editSchedule(String instruction) {
        try {
            //get current tasks
            List<Task> currentTasks = scheduleManager.getTodayTasks();
            String scheduleContext = formatTasksForAI(currentTasks);

            String prompt = String.format(
                "You are an AI assistant that can edit schedules. Current tasks for today:\n%s\n\n" +
                "User instruction: %s\n\n" +
                "IMPORTANT VALIDATION:\n" +
                "- For ADD: You MUST have description, start time, and end time\n" +
                "- For ADD_MULTIPLE: You MUST provide an array of tasks, each with description, startTime, and endTime\n" +
                "- For UPDATE/COMPLETE/DELETE: You MUST identify which specific task\n" +
                "- If the task requested to be edited or deleted doesn't exist, use {\"action\":\"ITEM_NOT_FOUND\",\"itemType\":\"task\",\"itemId\":\"taskId-here\"}\n" +
                "- If information is missing, respond with {\"action\":\"NEED_INFO\",\"message\":\"what you need\"}\n\n" +
                "- Tasks cannot happen simutaneously (i.e. have overlapped durations). A new task can only start before or after a current one."+
                "Respond with a JSON object. Examples:\n" +
                "- To add a task: {\"action\":\"ADD\",\"description\":\"task name\",\"startTime\":\"14:00\",\"endTime\":\"15:00\"}\n" +
                "- To add multiple tasks: {\"action\":\"ADD_MULTIPLE\",\"tasks\":[{\"description\":\"task 1\",\"startTime\":\"14:00\",\"endTime\":\"15:00\"},{\"description\":\"task 2\",\"startTime\":\"15:30\",\"endTime\":\"16:30\"}, etc in this format]}\n" +
                "- To complete a task: {\"action\":\"COMPLETE\",\"taskId\":\"task_12345\"}\n" +
                "- To delete a task: {\"action\":\"DELETE\",\"taskId\":\"task_12345\"}\n" +
                "- If unclear: {\"action\":\"NEED_INFO\",\"message\":\"Please specify which task to complete\"}\n\n" +
                "Choose the appropriate action based on the user's instruction. Use 24-hour time format (HH:MM).",
                scheduleContext,
                instruction
            );

            String aiResponse = callGeminiAPI(prompt, 500);
            String actionJson = extractContentFromResponse(aiResponse);

            //execute
            return executeScheduleAction(actionJson);

        } catch (Exception e) {
            System.err.println("Schedule editing failed: " + e.getMessage());
            return "Error editing schedule: " + e.getMessage();
        }
    }

    private String callGeminiAPI(String prompt, int maxTokens) throws IOException, InterruptedException {
        String apiUrl = String.format(
            "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s",
            "gemini-2.5-flash-lite",
            config.getAccessToken()
        );

        String jsonPayload = String.format(
            "{\"contents\":[{\"parts\":[{\"text\":\"%s\"}]}],\"generationConfig\":{\"temperature\":0.7,\"maxOutputTokens\":%d}}",
            prompt.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n"),
            maxTokens
        );

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(apiUrl))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IOException("Gemini API returned status: " + response.statusCode() + " - " + response.body());
        }

        return response.body();
    }

    private String extractContentFromResponse(String responseBody) {
        try {
            Pattern pattern = Pattern.compile("\"text\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
            Matcher matcher = pattern.matcher(responseBody);
            
            if (matcher.find()) {
                String extracted = matcher.group(1);
                extracted = extracted.replace("\\\"", "\"").replace("\\n", "\n").replace("\\t", "\t").replace("\\\\", "\\");
                return extracted;
            }
            
            Pattern fallbackPattern = Pattern.compile("\"text\"\\s*:\\s*\"([\\s\\S]*?)\"(?=\\s*,|\\s*\\})");
            Matcher fallbackMatcher = fallbackPattern.matcher(responseBody);
            
            if (fallbackMatcher.find()) {
                String extracted = fallbackMatcher.group(1);
                extracted = extracted.replace("\\\"", "\"").replace("\\n", "\n").replace("\\t", "\t").replace("\\\\", "\\");
                return extracted;
            }
            
        } catch (Exception e) {
            System.err.println("Error parsing AI response: " + e.getMessage());
        }
        
        return responseBody.length() > 500 ? responseBody.substring(0, 500) + "..." : responseBody;
    }

    private String formatNotesForAI(List<Note> notes) {
        if (notes.isEmpty()) {
            return "No notes currently.";
        }

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < notes.size(); i++) {
            Note note = notes.get(i);
            sb.append(String.format("%d. ID: %s, Content: %s\n",
                i + 1,
                note.getId(),
                note.getContent()
            ));
        }
        return sb.toString();
    }

    private String formatTasksForAI(List<Task> tasks) {
        if (tasks.isEmpty()) {
            return "No tasks scheduled for today.";
        }

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < tasks.size(); i++) {
            Task task = tasks.get(i);
            sb.append(String.format("%d. ID: %s, Description: %s, Time: %s-%s, Status: %s\n",
                i + 1,
                task.getId(),
                task.getDescription(),
                task.getStartTime(),
                task.getEndTime(),
                task.getStatus()
            ));
        }
        return sb.toString();
    }

    private String executeNoteAction(String actionJson) {
        try {
            if (actionJson.contains("\"action\":\"ADD\"")) {
                Pattern contentPattern = Pattern.compile("\"content\"\\s*:\\s*\"([^\"]+)\"");
                Matcher contentMatcher = contentPattern.matcher(actionJson);
                if (contentMatcher.find()) {
                    String content = contentMatcher.group(1);
                    Note newNote = noteManager.addNote(content);
                    return "Added new note: " + content;
                }
            } else if (actionJson.contains("\"action\":\"UPDATE\"")) {
                Pattern idPattern = Pattern.compile("\"noteId\"\\s*:\\s*\"([^\"]+)\"");
                Matcher idMatcher = idPattern.matcher(actionJson);
                Pattern contentPattern = Pattern.compile("\"content\"\\s*:\\s*\"([^\"]+)\"");
                Matcher contentMatcher = contentPattern.matcher(actionJson);

                if (idMatcher.find() && contentMatcher.find()) {
                    String noteId = idMatcher.group(1);
                    String content = contentMatcher.group(1);
                    if (noteManager.updateNote(noteId, content)) {
                        return "Updated note: " + content;
                    } else {
                        return "Could not find note with ID: " + noteId;
                    }
                }
            } else if (actionJson.contains("\"action\":\"DELETE\"")) {
                Pattern idPattern = Pattern.compile("\"noteId\"\\s*:\\s*\"([^\"]+)\"");
                Matcher idMatcher = idPattern.matcher(actionJson);
                if (idMatcher.find()) {
                    String noteId = idMatcher.group(1);
                    if (noteManager.deleteNote(noteId)) {
                        return "Deleted note with ID: " + noteId;
                    } else {
                        return "Could not find note with ID: " + noteId;
                    }
                }
            } else if (actionJson.contains("\"action\":\"ITEM_NOT_FOUND\"")) {
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
            } else if (actionJson.contains("\"action\":\"NEED_INFO\"")) {
                return "I need more information to complete this action.";
            }

            return "Action completed successfully.";

        } catch (Exception e) {
            return "Error executing note action: " + e.getMessage();
        }
    }

    private String executeScheduleAction(String actionJson) {
        try {
            if (actionJson.contains("\"action\":\"ADD\"")) {
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
                        return "Added task: " + description + " (" + startTime + " - " + endTime + ")";
                    } else {
                        return "Could not add task due to scheduling conflict.";
                    }
                }
            } else if (actionJson.contains("\"action\":\"ADD_MULTIPLE\"")) {
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

                    resultMessage.append("\nSummary: ").append(successCount).append(" tasks added");
                    if (conflictCount > 0) {
                        resultMessage.append(", ").append(conflictCount).append(" conflicts");
                    }
                    return resultMessage.toString();
                }
            } else if (actionJson.contains("\"action\":\"UPDATE\"")) {
                Pattern idPattern = Pattern.compile("\"taskId\"\\s*:\\s*\"([^\"]+)\"");
                Matcher idMatcher = idPattern.matcher(actionJson);
                if (idMatcher.find()) {
                    String taskId = idMatcher.group(1);
                    if (scheduleManager.updateTaskStatus(taskId, Task.TaskStatus.COMPLETED)) {
                        return "Marked task as completed.";
                    } else {
                        return "Could not find task with ID: " + taskId;
                    }
                }
            } else if (actionJson.contains("\"action\":\"DELETE\"")) {
                Pattern idPattern = Pattern.compile("\"taskId\"\\s*:\\s*\"([^\"]+)\"");
                Matcher idMatcher = idPattern.matcher(actionJson);
                if (idMatcher.find()) {
                    String taskId = idMatcher.group(1);
                    if (scheduleManager.removeTask(taskId)) {
                        return "Deleted task with ID: " + taskId;
                    } else {
                        return "Could not find task with ID: " + taskId;
                    }
                }
            } else if (actionJson.contains("\"action\":\"COMPLETE\"")) {
                Pattern idPattern = Pattern.compile("\"taskId\"\\s*:\\s*\"([^\"]+)\"");
                Matcher idMatcher = idPattern.matcher(actionJson);
                if (idMatcher.find()) {
                    String taskId = idMatcher.group(1);
                    if (scheduleManager.updateTaskStatus(taskId, Task.TaskStatus.COMPLETED)) {
                        return "Marked task as completed.";
                    } else {
                        return "Could not find task with ID: " + taskId;
                    }
                }
            } else if (actionJson.contains("\"action\":\"ITEM_NOT_FOUND\"")) {
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
            } else if (actionJson.contains("\"action\":\"NEED_INFO\"")) {
                return "I need more information to complete this action.";
            }

            return "Action completed successfully.";

        } catch (Exception e) {
            return "Error executing schedule action: " + e.getMessage();
        }
    }
}
