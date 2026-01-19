package backend;

import java.util.regex.Pattern;
import java.util.regex.Matcher;

public final class JsonUtils {

    public static String extractJsonStringValue(String json, String fieldName) {
        String regex = "\"" + Pattern.quote(fieldName) + "\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"";
        Pattern p = Pattern.compile(regex);
        Matcher m = p.matcher(json);
        if (m.find()) {
            return unescapeJsonString(m.group(1));
        }
        return null;
    }

    public static String unescapeJsonString(String s) {
        if (s == null) return "";
        return s.replace("\\\\", "\u0001").replace("\\\"", "\"").replace("\\n", "\n").replace("\\r", "\r").replace("\\t", "\t").replace("\u0001", "\\");
    }

    //replaces unicode punctuation (en-dash, em-dash, smart quotes, etc.) with ASCII equivalent to avoid parsing/display issues (those annoying yellow box thingies LLMs return).
    public static String sanitizeUnicodePunctuation(String s) {
        if (s == null) return "";
        return s
            .replace("\u2013", "-")
            .replace("\u2014", "-") 
            .replace("\u2012", "-") 
            .replace("\u2015", "-") 
            .replace("\u2212", "-")
            .replace("\u2018", "'") 
            .replace("\u2019", "'") 
            .replace("\u201C", "\"") 
            .replace("\u201D", "\"") 
            .replace("\u00A0", " "); 
    }
}
