package backend.objects;

import java.util.regex.Pattern;
import java.util.regex.Matcher;

//handles parsing and cleaning responses from different AI APIs (Gemini, LM Studio)
public class AIResponseHandler {

    public static String extractContentFromResponse(String responseBody) {
        try {

            //lmstudio format
            if (responseBody.contains("\"choices\"")) {
                Pattern lmStudioPattern = Pattern.compile("\"content\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
                Matcher lmStudioMatcher = lmStudioPattern.matcher(responseBody);

                if (lmStudioMatcher.find()) {
                    String extracted = lmStudioMatcher.group(1);
                    return cleanExtractedContent(extracted);
                }
            }

            //gemini format
            Pattern geminiPattern = Pattern.compile("\"text\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"");
            Matcher geminiMatcher = geminiPattern.matcher(responseBody);

            if (geminiMatcher.find()) {
                String extracted = geminiMatcher.group(1);
                return cleanExtractedContent(extracted);
            }

            Pattern fallbackGeminiPattern = Pattern.compile("\"text\"\\s*:\\s*\"([\\s\\S]*?)\"(?=\\s*,|\\s*\\})");
            Matcher fallbackGeminiMatcher = fallbackGeminiPattern.matcher(responseBody);

            if (fallbackGeminiMatcher.find()) {
                String extracted = fallbackGeminiMatcher.group(1);
                return cleanExtractedContent(extracted);
            }

        } catch (Exception e) {
            System.err.println("Error parsing AI response: " + e.getMessage());
        }

        return responseBody.length() > 500 ? responseBody.substring(0, 500) + "..." : responseBody;
    }

    private static String cleanExtractedContent(String extracted) {
        return extracted.replace("\\\"", "\"").replace("\\n", "\n").replace("\\t", "\t").replace("\\r", "\r").replace("\\\\", "\\");
    }

    public static boolean isValidActionResponse(String response) {
        if (response == null || response.trim().isEmpty()) {
            return false;
        }

        String trimmed = response.trim();
        return (trimmed.startsWith("{") && trimmed.endsWith("}")) ||
               (trimmed.startsWith("[") && trimmed.endsWith("]"));
    }

    public static boolean containsAction(String response, String actionType) {
        return response != null && response.contains("\"action\":\"" + actionType + "\"");
    }
}