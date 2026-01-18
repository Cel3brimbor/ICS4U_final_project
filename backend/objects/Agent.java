package backend.objects;

import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;
import java.util.Properties;
import java.io.FileInputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import backend.NoteManager;
import backend.ScheduleManager;


public class Agent {

    private final HttpClient httpClient;
    private final GeminiConfig config;
    private final NoteManager noteManager;
    private final ScheduleManager scheduleManager;

    private final String apiProvider;
    private String lmStudioUrl;
    private String lmStudioModel;

    //action handlers
    private final NoteActionHandler noteActionHandler;
    private final ScheduleActionHandler scheduleActionHandler;
    public Agent(GeminiConfig config, NoteManager noteManager, ScheduleManager scheduleManager) {
        this.config = config;
        this.httpClient = HttpClient.newHttpClient();
        this.noteManager = noteManager;
        this.scheduleManager = scheduleManager;

        Properties props = new Properties();
        String provider = "gemini"; //default gemini
        String lmUrl = "http://127.0.0.1:1234";
        String lmModel = "google/gemma-3-4b";

        try (FileInputStream fis = new FileInputStream("backend/config.properties")) {
            props.load(fis);
            provider = props.getProperty("ai.provider", "gemini");
            lmUrl = props.getProperty("lmstudio.url", "http://127.0.0.1:1234");
            lmModel = props.getProperty("lmstudio.model", "google/gemma-3-4b");
        } catch (IOException e) {
            System.err.println("Could not load config properties file for API provider: " + e.getMessage());
        }

        this.apiProvider = provider;
        this.lmStudioUrl = lmUrl;
        this.lmStudioModel = lmModel;

        System.out.println("Agent initialized with API provider: " + apiProvider);
        if ("lmstudio".equals(apiProvider)) {
            System.out.println("LM Studio URL: " + lmStudioUrl + ", Model: " + lmStudioModel);
        }

        this.noteActionHandler = new NoteActionHandler(noteManager);
        this.scheduleActionHandler = new ScheduleActionHandler(scheduleManager);
    }

    /**
     * general chat/conversation with AI - returns text response only. has no editing powers.
     */
    public String chat(String message) {
        //check if API is properly configured
        if ("gemini".equals(apiProvider)) {
            if (config.getAccessToken() == null || config.getAccessToken().isEmpty()) {
                return "Gemini AI is not configured. check API key";
            }
        } else if ("lmstudio".equals(apiProvider)) {
            if (lmStudioUrl == null || lmStudioUrl.isEmpty()) {
                return "LM Studio is not configed";
            }
        } else {
            return "Unknown AI provider: " + apiProvider;
        }

        String prompt = message;

        try {
            String response = callAIAPI(prompt, 1000); //higher token limit
            return AIResponseHandler.extractContentFromResponse(response);
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
                "- For DELETE_MULTIPLE: You MUST provide an array of noteIds to delete\n" +
                "- If the note requested to be edited or deleted doesn't exist, use {\"action\":\"ITEM_NOT_FOUND\",\"itemType\":\"note\",\"itemId\":\"uuid-here\"}\n" +
                "- If information is missing or unclear, respond with {\"action\":\"NEED_INFO\",\"message\":\"what you need\"}\n\n" +
                "Respond with a JSON object. Examples:\n" +
                "- To add a note: {\"action\":\"ADD\",\"content\":\"note content here\"}\n" +
                "- To update a note: {\"action\":\"UPDATE\",\"noteId\":\"uuid-here\",\"content\":\"updated content\"}\n" +
                "- To delete a note: {\"action\":\"DELETE\",\"noteId\":\"uuid-here\"}\n" +
                "- To delete multiple notes: {\"action\":\"DELETE_MULTIPLE\",\"noteIds\":[\"uuid-1\",\"uuid-2\"]}\n" +
                "- If unclear: {\"action\":\"NEED_INFO\",\"message\":\"Please specify which note to update\"}\n\n" +
                "Choose the appropriate action based on the user's instruction.",
                notesContext,
                instruction
            );

            String aiResponse = callAIAPI(prompt, 300);
            String actionJson = AIResponseHandler.extractContentFromResponse(aiResponse);

            //execute
            return noteActionHandler.executeNoteAction(actionJson);

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
                "- For DELETE_MULTIPLE: You MUST provide an array of taskIds to delete\n" +
                "- If the task requested to be edited or deleted doesn't exist, use {\"action\":\"ITEM_NOT_FOUND\",\"itemType\":\"task\",\"itemId\":\"taskId-here\"}\n" +
                "- If information is missing, respond with {\"action\":\"NEED_INFO\",\"message\":\"what you need\"}\n\n" +
                "- Tasks cannot happen simutaneously (i.e. have overlapped durations). A new task can only start before or after another one."+
                "Respond with a JSON object. Examples:\n" +
                "- To add a task: {\"action\":\"ADD\",\"description\":\"task name\",\"startTime\":\"14:00\",\"endTime\":\"15:00\"}\n" +
                "- To add multiple tasks: {\"action\":\"ADD_MULTIPLE\",\"tasks\":[{\"description\":\"task 1\",\"startTime\":\"14:00\",\"endTime\":\"15:00\"},{\"description\":\"task 2\",\"startTime\":\"15:30\",\"endTime\":\"16:30\"}, etc in this format]}\n" +
                "- To complete a task: {\"action\":\"COMPLETE\",\"taskId\":\"task_12345\"}\n" +
                "- To delete a task: {\"action\":\"DELETE\",\"taskId\":\"task_12345\"}\n" +
                "- To delete multiple tasks: {\"action\":\"DELETE_MULTIPLE\",\"taskIds\":[\"task_12345\",\"task_67890\"]}\n" +
                "- If unclear: {\"action\":\"NEED_INFO\",\"message\":\"Please specify which task to complete\"}\n\n" +
                "Choose the appropriate action based on the user's instruction. Use 24-hour time format (HH:MM).",
                scheduleContext,
                instruction
            );

            String aiResponse = callAIAPI(prompt, 500);
            String actionJson = AIResponseHandler.extractContentFromResponse(aiResponse);

            //execute
            return scheduleActionHandler.executeScheduleAction(actionJson);

        } catch (Exception e) {
            System.err.println("Schedule editing failed: " + e.getMessage());
            return "Error editing schedule: " + e.getMessage();
        }
    }

    public String getApiProvider() {
        return apiProvider;
    }

    public String getConfigDetails() {
        if ("gemini".equals(apiProvider)) {
            return "Using Gemini API - Token configured: " + (config.getAccessToken() != null && !config.getAccessToken().isEmpty());
        } else if ("lmstudio".equals(apiProvider)) {
            return "Using LM Studio - URL: " + lmStudioUrl + ", Model: " + lmStudioModel;
        } else {
            return "Unknown provider: " + apiProvider;
        }
    }

    private String callAIAPI(String prompt, int maxTokens) throws IOException, InterruptedException {
        if ("lmstudio".equals(apiProvider)) {
            return callLMStudioAPI(prompt, maxTokens);
        } else {
            return callGeminiAPI(prompt, maxTokens);
        }
    }

    private String callGeminiAPI(String prompt, int maxTokens) throws IOException, InterruptedException {
        // String apiUrl = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s","gemini-2.5-flash-lite",
        //     config.getAccessToken()
        // );
        String apiUrl = String.format("https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent?key=%s","gemini-2.5-flash-lite",
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

    private String callLMStudioAPI(String prompt, int maxTokens) throws IOException, InterruptedException {
        String apiUrl = lmStudioUrl + "/v1/chat/completions";

        String jsonPayload = String.format(
            "{\"model\":\"%s\",\"messages\":[{\"role\":\"user\",\"content\":\"%s\"}],\"temperature\":0.7,\"max_tokens\":%d}",
            lmStudioModel,
            prompt.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n"),
            maxTokens
        );

        URL url = new URL(apiUrl);
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        conn.setConnectTimeout(10000);
        conn.setReadTimeout(60000);

        try (OutputStream os = conn.getOutputStream()) {
            os.write(jsonPayload.getBytes("UTF-8"));
        }

        int responseCode = conn.getResponseCode();

        if (responseCode != 200) {
            throw new IOException("LM Studio API returned status: " + responseCode);
        }

        try (BufferedReader br = new BufferedReader(
                new InputStreamReader(conn.getInputStream(), "UTF-8"))) {
            StringBuilder response = new StringBuilder();
            String responseLine;
            while ((responseLine = br.readLine()) != null) {
                response.append(responseLine.trim());
            }
            return response.toString();
        }
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
}
