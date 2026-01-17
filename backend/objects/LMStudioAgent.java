package backend.objects;

import java.io.IOException;
import java.net.HttpURLConnection;
import java.net.URL;
import java.util.Properties;
import java.io.FileInputStream;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;

public class LMStudioAgent {

    private final String lmStudioUrl;
    private final String modelName;

    public LMStudioAgent() {

        String url = "http://127.0.0.1:1234";
        String model = "google/gemma-3-4b";

        Properties props = new Properties();
        try (FileInputStream fis = new FileInputStream("backend/config.properties")) {
            props.load(fis);
            url = props.getProperty("lmstudio.url", "http://localhost:1234");
            model = props.getProperty("lmstudio.model", "local-model");
        } catch (IOException e) {
            System.err.println("Could not load config properties file: " + e.getMessage());
        }

        this.lmStudioUrl = url;
        this.modelName = model;
    }

    /**
     *prints raw model response for debugging and prompt engineering
     */
    public String chat(String message) {
        if (lmStudioUrl == null || lmStudioUrl.isEmpty()) {
            return "LM Studio URL is not configured.";
        }

        try {
            System.out.println("\n=== LM STUDIO DEBUG ===");
            System.out.println("Sending prompt: " + message);
            System.out.println("Using model: " + modelName);
            System.out.println("LM Studio URL: " + lmStudioUrl);

            String rawResponse = callLMStudioAPI(message);
            System.out.println("\nRaw API Response:");
            System.out.println(rawResponse);
            System.out.println("=== END DEBUG ===\n");

            String extractedContent = extractContentFromResponse(rawResponse);
            return formatForWebDisplay(extractedContent);

        } catch (Exception e) {
            System.err.println("LM Studio chat failed: " + e.getMessage());
            e.printStackTrace();
            return "<div class='error-message'>An error processing message with LM Studio.</div>";
        }
    }

    private String callLMStudioAPI(String prompt) throws IOException, InterruptedException {
        String apiUrl = lmStudioUrl + "/v1/chat/completions";

        String jsonPayload = String.format(
            "{\"model\":\"%s\",\"messages\":[{\"role\":\"user\",\"content\":\"%s\"}],\"temperature\":0.7,\"max_tokens\":1000}",
            modelName,
            prompt.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n")
        );

        System.out.println("API URL: " + apiUrl);
        System.out.println("Request payload: " + jsonPayload);

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
        System.out.println("Response status: " + responseCode);

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

    public String extractContentFromResponse(String responseBody) {
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

    /**
     *prints raw response without extraction
     */
    public void testPrompt(String prompt) {
        try {
            System.out.println("\n=== PROMPT ENGINEERING TEST ===");
            System.out.println("Testing prompt: " + prompt);
            String rawResponse = callLMStudioAPI(prompt);
            System.out.println("\nFULL RAW RESPONSE:");
            System.out.println(rawResponse);
            System.out.println("=== END TEST ===\n");
        } catch (Exception e) {
            System.err.println("Test failed: " + e.getMessage());
            e.printStackTrace();
        }
    }

    public String getConfig() {
        return String.format("LM Studio Config - URL: %s, Model: %s", lmStudioUrl, modelName);
    }

    public String formatForWebDisplay(String content) {
        if (content == null || content.trim().isEmpty()) {
            return "<div class='ai-response'>No response generated.</div>";
        }

        content = content.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&#x27;");

        content = content.replace("\n", "<br>");

        content = content.replace("  ", "&nbsp;&nbsp;");

        return "<div class='ai-response'>" + content + "</div>";
    }
}