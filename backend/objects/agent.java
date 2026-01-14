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
    public String chat(String message, String accessToken) {
        String prompt = "You are a helpful AI assistant. Respond to the following message: " + message;

        try {
            String response = callGeminiAPI(prompt, accessToken, 500); //higher token limit
            return extractContentFromResponse(response);
        } catch (Exception e) {
            System.err.println("Chat failed: " + e.getMessage());
            return "Sorry, I encountered an error processing your message.";
        }
    }

    /**
     * AI note editing - can add, modify, or delete notes
     */
    public String editNotes(String instruction, String accessToken) {
        try {
            //get current notes
            List<Note> currentNotes = noteManager.getAllNotes();
            String notesContext = formatNotesForAI(currentNotes);

            String prompt = String.format(
                "You are an AI assistant that can edit notes made by the user. User's current notes:\n%s\n\n" +
                "User instruction: %s\n\n" +
                "Respond with a JSON object containing 'action' (ADD, UPDATE, DELETE) and 'result' describing what you did. " +
                "For ADD: include 'content' field. For UPDATE/DELETE: include 'noteId' field. " +
                "If you need more information, set action to 'NEED_INFO' and explain what you need.",
                notesContext,
                instruction
            );

            String aiResponse = callGeminiAPI(prompt, accessToken, 300);
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
    public String editSchedule(String instruction, String accessToken) {
        try {
            //get current tasks
            List<Task> currentTasks = scheduleManager.getTodayTasks();
            String scheduleContext = formatTasksForAI(currentTasks);

            String prompt = String.format(
                "You are an AI assistant that can edit schedules. Current tasks for today:\n%s\n\n" +
                "User instruction: %s\n\n" +
                "Respond with a JSON object containing 'action' (ADD, UPDATE, DELETE, COMPLETE) and 'result' describing what you did. " +
                "For ADD: include 'description', 'startTime' (HH:MM), 'endTime' (HH:MM) fields. " +
                "For UPDATE/COMPLETE/DELETE: include 'taskId' field. " +
                "Times should be in 24-hour format. If you need more information, set action to 'NEED_INFO' and explain what you need.",
                scheduleContext,
                instruction
            );

            String aiResponse = callGeminiAPI(prompt, accessToken, 300);
            String actionJson = extractContentFromResponse(aiResponse);

            //execute
            return executeScheduleAction(actionJson);

        } catch (Exception e) {
            System.err.println("Schedule editing failed: " + e.getMessage());
            return "Error editing schedule: " + e.getMessage();
        }
    }

    private String callGeminiAPI(String prompt, String accessToken, int maxTokens) throws IOException, InterruptedException {
        String apiUrl = String.format(
            "https://%s-aiplatform.googleapis.com/v1/projects/%s/locations/%s/endpoints/openapi/chat/completions",
            config.getLocation(),
            config.getProjectId(),
            config.getLocation()
        );

        String escapedPrompt = prompt.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n");
        String jsonPayload = String.format(
            "{\"model\":\"%s\",\"messages\":[{\"role\":\"user\",\"content\":\"%s\"}],\"temperature\":0.7,\"max_tokens\":%d}",
            config.getModel(),
            escapedPrompt,
            maxTokens
        );

        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(apiUrl))
            .header("Content-Type", "application/json")
            .header("Authorization", "Bearer " + accessToken)
            .POST(HttpRequest.BodyPublishers.ofString(jsonPayload))
            .build();

        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

        if (response.statusCode() != 200) {
            throw new IOException("Gemini API returned status: " + response.statusCode() + " - " + response.body());
        }

        return response.body();
    }

    private String extractContentFromResponse(String responseBody) {
        //extract content from Gemini API response
        Pattern pattern = Pattern.compile("\"content\"\\s*:\\s*\"([^\"]+)\"");
        Matcher matcher = pattern.matcher(responseBody);

        if (matcher.find()) {
            return matcher.group(1).replace("\\\"", "\"").replace("\\n", "\n");
        }

        //fallback pattern
        Pattern fallbackPattern = Pattern.compile("\"content\"\\s*:\\s*\"([\\s\\S]*?)\"");
        Matcher fallbackMatcher = fallbackPattern.matcher(responseBody);

        if (fallbackMatcher.find()) {
            return fallbackMatcher.group(1).replace("\\\"", "\"").replace("\\n", "\n");
        }

        return responseBody; //return raw if parsing fails
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
                getNoteId(note),
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
            } else if (actionJson.contains("\"action\":\"NEED_INFO\"")) {
                return "I need more information to complete this action.";
            }

            return "Action completed successfully.";

        } catch (Exception e) {
            return "Error executing schedule action: " + e.getMessage();
        }
    }

    private String getNoteId(Note note) {
        return note.getContent() + "|" + note.getCreationTime().toString();
    }
}
