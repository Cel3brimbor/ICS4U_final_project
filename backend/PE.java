package backend;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.List;
import java.util.Scanner;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.Properties;
import java.io.FileInputStream;
import java.nio.file.Files;
import java.nio.file.Paths;
import backend.objects.Note;
import backend.objects.Task;
import java.time.LocalTime;
import java.time.LocalDate;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;

public class PE {

    private static String lmStudioUrl;
    private static String modelName;
    private static ScheduleManager scheduleManager;
    private static NoteManager noteManager;
    private static AgentInputValidator inputValidator;
    private static String noteFormatSpec;
    private static String scheduleFormatSpec;

    public static void main(String[] args) {
        System.out.println("Prompt Engineering");

        scheduleManager = new ScheduleManager();
        noteManager = new NoteManager();
        inputValidator = new AgentInputValidator();

        TaskPersistence.loadTasks(scheduleManager);
        NotePersistence.loadNotes(noteManager);

        loadLMStudioConfig();

        if (lmStudioUrl == null || lmStudioUrl.isEmpty()) {
            System.out.println("LM Studio URL not configured. check config.properties");
            return;
        }

        loadFormatSpecifications();

        System.out.println("AI Agent initialized with LM Studio");
        System.out.println();

        Scanner scanner = new Scanner(System.in);

        while (true) {
            System.out.println("Options:");
            System.out.println("1. Chat (processed response)");
            System.out.println("2. Test prompt (raw response only)");
            System.out.println("3. Model compliance test");
            System.out.println("4. Planner test");
            System.out.println("5. Notes test");
            System.out.println("6. Exit");
            System.out.print("Enter choice (1-4): ");

            String choice = scanner.nextLine().trim();

            switch (choice) {
                case "1":
                    testChatMode(scanner);
                    break;
                case "2":
                    testPromptMode(scanner);
                    break;
                case "3":
                    customPromptTest(scanner);
                    break;
                case "4":
                    plannerTest(scanner);
                    break;
                case "5":
                    notesTest(scanner);
                    break;
                case "6":
                    System.out.println("Exiting...");
                    scanner.close();
                    return;
                default:
                    System.out.println("Invalid choice. Please try again.\n");
            }
        }
    }

    private static void testChatMode(Scanner scanner) {
        System.out.println("\n=== Chat Mode ===");
        System.out.println("Processes the response and returns clean text.");
        System.out.print("Enter message: ");
        String message = scanner.nextLine();

        try {
            String response = callLMStudioAPI(message);
            String processedResponse = extractContentFromResponse(response);
        System.out.println("\nProcessed Response:");
            System.out.println(processedResponse);
        } catch (Exception e) {
            System.out.println("Error: " + e.getMessage());
        }
        System.out.println();
    }

    private static void testPromptMode(Scanner scanner) {
        System.out.println("\n=== Test Prompt Mode ===");
        System.out.println("Prints the raw API response for debugging.");
        System.out.print("Enter test prompt: ");
        String prompt = scanner.nextLine();

        try {
            System.out.println("\n=== LM STUDIO DEBUG ===");
            System.out.println("Sending prompt: " + prompt);
            System.out.println("Using model: " + modelName);
            System.out.println("LM Studio URL: " + lmStudioUrl);

            String rawResponse = callLMStudioAPI(prompt);
            System.out.println("\nRaw API Response:");
            System.out.println(rawResponse);
            System.out.println("=== END DEBUG ===\n");
        } catch (Exception e) {
            System.err.println("Test failed: " + e.getMessage());
        }
    }

    private static void customPromptTest(Scanner scanner) {
        System.out.println("\n=== AI Model Compliance Test ===");

        String[] testPrompts = {
            "Say 'Hello World' and nothing else.",
            "Count from 1 to 5, with each number on a new line.",
            "What is the capital of France? Answer in one word.",
            "Explain what prompt engineering is in 2-3 sentences.",
            "Write a haiku about artificial intelligence.",
            "List three benefits of using local AI models."
        };

        for (int i = 0; i < testPrompts.length; i++) {
            System.out.println((i + 1) + ". " + testPrompts[i]);
        }

        System.out.print("Choose a prompt number (1-" + testPrompts.length + ") or enter 'c' for custom: ");
        String input = scanner.nextLine().trim();

        String selectedPrompt;
        if (input.equalsIgnoreCase("c")) {
            System.out.print("Enter your custom prompt: ");
            selectedPrompt = scanner.nextLine();
        } else {
            try {
                int promptIndex = Integer.parseInt(input) - 1;
                if (promptIndex >= 0 && promptIndex < testPrompts.length) {
                    selectedPrompt = testPrompts[promptIndex];
                } else {
                    System.out.println("Invalid number. Using default test prompt.");
                    selectedPrompt = testPrompts[0];
                }
            } catch (NumberFormatException e) {
                System.out.println("Invalid input. Using default test prompt.");
                selectedPrompt = testPrompts[0];
            }
        }

        System.out.println("\nTesting prompt: " + selectedPrompt);
        try {
            String response = callLMStudioAPI(selectedPrompt);
            String aiResponse = extractContentFromResponse(response);
            System.out.println("\nAI Response:");
            System.out.println(aiResponse);
        } catch (Exception e) {
            System.out.println("Error: " + e.getMessage());
        }
    }

    private static void plannerTest(Scanner scanner) {
        System.out.println("\n=== Planner Test ===");
        System.out.println("Test AI agent commands for managing tasks and schedule.");
        System.out.println("Examples:");
        System.out.println("- 'Add a task: Study math for 2 hours at 3 PM'");
        System.out.println("- 'Schedule a meeting with team at 10 AM for 1 hour'");
        System.out.println("- 'Mark the math study task as completed'");
        System.out.print("Enter planner instruction: ");
        String instruction = scanner.nextLine();

        //pree-validation for insufficient context
        // if (!inputValidator.hasEnoughContextForTask(instruction, scheduleManager.getTodayTasks().size())) {
        //     System.out.println("Please provide more specific information. For example:");
        //     System.out.println("- What task do you want to add/modify/delete?");
        //     System.out.println("- What time should the task start/end?");
        //     System.out.println("- Which specific task are you referring to?");
        //     return;
        // }

        try {
            List<Task> currentTasks = scheduleManager.getTodayTasks();
            String scheduleContext = formatTasksForAI(currentTasks);

            String prompt = String.format(
                "You are an AI assistant that can edit schedules. Current tasks for today:\n%s\n\n" +
                "User instruction: %s\n\n" +
                "IMPORTANT VALIDATION:\n" +
                "- For ADD: You MUST have description, start time, and end time\n" +
                "- For UPDATE/COMPLETE/DELETE: You MUST identify which specific task\n" +
                "- If information is missing, respond with {\"action\":\"NEED_INFO\",\"message\":\"what you need\"}\n\n" +
                "Respond with a JSON object. Examples:\n" +
                "- To add a task: {\"action\":\"ADD\",\"description\":\"task name\",\"startTime\":\"14:00\",\"endTime\":\"15:00\"}\n" +
                "- To complete a task: {\"action\":\"COMPLETE\",\"taskId\":\"task_12345\"}\n" +
                "- If unclear: {\"action\":\"NEED_INFO\",\"message\":\"Please specify which task to complete\"}\n\n" +
                "Choose the appropriate action based on the user's instruction. Use 24-hour time format (HH:MM).",
                scheduleContext,
                instruction
            );

            String aiResponse = callLMStudioAPI(prompt);
            String rawResponse = extractContentFromResponse(aiResponse);

            System.out.println("\nAI Response:");
            System.out.println(rawResponse);

            if (rawResponse.trim().startsWith("{") && rawResponse.trim().endsWith("}")) {
                String result = executeScheduleAction(rawResponse);
                System.out.println("\nAction Result:");
                System.out.println(result);
            }
        } catch (Exception e) {
            System.out.println("Error: " + e.getMessage());
        }
        System.out.println();
    }

    private static void notesTest(Scanner scanner) {
        System.out.println("\n=== Notes Test ===");
        System.out.println("Test AI agent commands for managing notes.");
        System.out.println("Examples:");
        System.out.println("- 'Add a note about the project deadline being next Friday'");
        System.out.println("- 'Create a note: Remember to call mom tomorrow'");
        System.out.println("- 'Delete the note about lunch with Sarah'");
        System.out.println("- 'Update my meeting note to include the new time'");
        System.out.print("Enter notes instruction: ");
        String instruction = scanner.nextLine();

        // if (!inputValidator.hasEnoughContextForNote(instruction, noteManager.getAllNotes().size())) {
        //     System.out.println("Please provide more specific information. For example:");
        //     System.out.println("- What note content do you want to add?");
        //     System.out.println("- Which specific note do you want to update/delete?");
        //     System.out.println("- What should the updated content be?");
        //     return;
        // }

        try {
            List<Note> currentNotes = noteManager.getAllNotes();
            String notesContext = formatNotesForAI(currentNotes);

            String prompt = String.format(
                "You are an AI assistant that can edit notes. User's current notes:\n%s\n\n" +
                "User instruction: %s\n\n" +
                "IMPORTANT VALIDATION:\n" +
                "- For ADD: You MUST have meaningful content (not just a few words)\n" +
                "- For UPDATE: You MUST have both noteId and new content\n" +
                "- For DELETE: You MUST identify which specific note to delete\n" +
                "- If information is missing or unclear, respond with {\"action\":\"NEED_INFO\",\"message\":\"what you need\"}\n\n" +
                "Respond with a JSON object. Examples:\n" +
                "- To add a note: {\"action\":\"ADD\",\"content\":\"note content here\"}\n" +
                "- To update a note: {\"action\":\"UPDATE\",\"noteId\":\"note_identifier\",\"content\":\"updated content\"}\n" +
                "- To delete a note: {\"action\":\"DELETE\",\"noteId\":\"note_identifier\"}\n" +
                "- If unclear: {\"action\":\"NEED_INFO\",\"message\":\"Please specify which note to update\"}\n\n" +
                "Choose the appropriate action based on the user's instruction. Notes should be meaningful and detailed.",
                notesContext,
                instruction
            );

            String aiResponse = callLMStudioAPI(prompt);
            String rawResponse = extractContentFromResponse(aiResponse);

            System.out.println("\nAI Response:");
            System.out.println(rawResponse);

            if (rawResponse.trim().startsWith("{") && rawResponse.trim().endsWith("}")) {
                String result = executeNoteAction(rawResponse);
                System.out.println("\nAction Result:");
                System.out.println(result);
            }
        } catch (Exception e) {
            System.out.println("Error: " + e.getMessage());
        }
        System.out.println();
    }

    private static void loadLMStudioConfig() {
        Properties props = new Properties();
        try (FileInputStream fis = new FileInputStream("backend/config.properties")) {
            props.load(fis);
            lmStudioUrl = props.getProperty("lmstudio.url", "http://localhost:1234");
            modelName = props.getProperty("lmstudio.model", "local-model");
        } catch (IOException e) {
            System.err.println("Could not load config properties file: " + e.getMessage());
        }
    }

    private static void loadFormatSpecifications() {
        try {
            noteFormatSpec = new String(Files.readAllBytes(Paths.get("backend/note_agent_format.json")));
            scheduleFormatSpec = new String(Files.readAllBytes(Paths.get("backend/schedule_agent_format.json")));
        } catch (IOException e) {
            System.err.println("Could not load format specification files: " + e.getMessage());
            noteFormatSpec = "Format specifications not available";
            scheduleFormatSpec = "Format specifications not available";
        }
    }

    private static String callLMStudioAPI(String prompt) throws IOException, InterruptedException {
        String apiUrl = lmStudioUrl + "/v1/chat/completions";

        String jsonPayload = String.format(
            "{\"model\":\"%s\",\"messages\":[{\"role\":\"user\",\"content\":\"%s\"}],\"temperature\":0.7,\"max_tokens\":1000}",
            modelName,
            prompt.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")
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

    private static String extractContentFromResponse(String responseBody) {
        try {
            int contentIndex = responseBody.indexOf("\"content\":");
            if (contentIndex == -1) {
                contentIndex = responseBody.indexOf("\"content\" :");
            }

            if (contentIndex != -1) {
                int colonIndex = responseBody.indexOf(":", contentIndex);
                int startQuoteIndex = responseBody.indexOf("\"", colonIndex);

                if (startQuoteIndex != -1) {
                    int startIndex = startQuoteIndex + 1;

                    int currentIndex = startIndex;
                    StringBuilder content = new StringBuilder();

                    while (currentIndex < responseBody.length()) {
                        char currentChar = responseBody.charAt(currentIndex);

                        if (currentChar == '"' && (currentIndex == 0 || responseBody.charAt(currentIndex - 1) != '\\')) {
                            break;
                        } else {
                            content.append(currentChar);
                            currentIndex++;
                        }
                    }

                    if (content.length() > 0) {
                        String extractedContent = content.toString();
                        extractedContent = extractedContent.replace("\\\"", "\"").replace("\\n", "\n").replace("\\t", "\t").replace("\\\\", "\\").replace("\\r", "\r");
                        return extractedContent;
                    }
                }
            }

            int choicesIndex = responseBody.indexOf("\"choices\"");
            if (choicesIndex != -1) {
                contentIndex = responseBody.indexOf("\"content\":", choicesIndex);
                if (contentIndex != -1) {
                    int colonIndex = responseBody.indexOf(":", contentIndex);
                    int startQuoteIndex = responseBody.indexOf("\"", colonIndex);

                    if (startQuoteIndex != -1) {
                        int startIndex = startQuoteIndex + 1;

                        int currentIndex = startIndex;
                        StringBuilder content = new StringBuilder();

                        while (currentIndex < responseBody.length()) {
                            char currentChar = responseBody.charAt(currentIndex);

                            if (currentChar == '"' && (currentIndex == 0 || responseBody.charAt(currentIndex - 1) != '\\')) {
                                break;
                            } else {
                                content.append(currentChar);
                                currentIndex++;
                            }
                        }

                        if (content.length() > 0) {
                            String extractedContent = content.toString();
                            extractedContent = extractedContent.replace("\\\"", "\"").replace("\\n", "\n").replace("\\t", "\t").replace("\\\\", "\\").replace("\\r", "\r");
                            return extractedContent;
                        }
                    }
                }
            }

        } catch (Exception e) {
            System.err.println("Error parsing LM Studio response: " + e.getMessage());
            System.err.println("Raw response: " + responseBody);
        }

        System.err.println("Failed to extract content from response");
        return responseBody.length() > 500 ? responseBody.substring(0, 500) + "..." : responseBody;
    }

    private static String formatNotesForAI(List<Note> notes) {
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

    private static String formatTasksForAI(List<Task> tasks) {
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

    private static String executeNoteAction(String actionJson) {
        try {
            if (actionJson.contains("\"action\":\"ADD\"")) {
                Pattern contentPattern = Pattern.compile("\"content\"\\s*:\\s*\"([^\"]+)\"");
                Matcher contentMatcher = contentPattern.matcher(actionJson);
                if (contentMatcher.find()) {
                    String content = contentMatcher.group(1);
                    noteManager.addNote(content);
                    NotePersistence.saveNotes(noteManager);
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
                        NotePersistence.saveNotes(noteManager);
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
                        NotePersistence.saveNotes(noteManager);
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

    private static String executeScheduleAction(String actionJson) {
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
                        TaskPersistence.saveTasks(scheduleManager);
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
                        TaskPersistence.saveTasks(scheduleManager);
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
                        TaskPersistence.saveTasks(scheduleManager);
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
                        TaskPersistence.saveTasks(scheduleManager);
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

    private static String getNoteId(Note note) {
        return note.getContent() + "|" + note.getCreationTime().toString();
    }
}