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
}
