package backend.objects;

import java.util.regex.Pattern;
import java.util.regex.Matcher;

//handles parsing and cleaning responses from different AI APIs (Gemini, LM Studio)
public class AIResponseHandler {

    public static String extractContentFromResponse(String responseBody) {
        try {

            if (responseBody.contains("\"choices\"")) {
                String extracted = extractContentFromChoicesMessage(responseBody);
                if (extracted != null) {
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

    private static String extractContentFromChoicesMessage(String responseBody) {
        int choicesIdx = responseBody.indexOf("\"choices\"");
        if (choicesIdx < 0) return null;
        int contentIdx = responseBody.indexOf("\"content\"", choicesIdx);
        if (contentIdx < 0) return null;
        int colonIdx = responseBody.indexOf(":", contentIdx);
        if (colonIdx < 0) return null;
        int openQuote = responseBody.indexOf("\"", colonIdx);
        if (openQuote < 0) return null;

        int i = openQuote + 1;
        StringBuilder sb = new StringBuilder(4096);
        while (i < responseBody.length()) {
            char c = responseBody.charAt(i);
            if (c == '"' && (i == 0 || responseBody.charAt(i - 1) != '\\')) {
                break;
            }
            sb.append(c);
            i++;
        }
        return sb.length() > 0 ? sb.toString() : null;
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