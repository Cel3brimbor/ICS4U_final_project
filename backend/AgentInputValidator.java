package backend;

public class AgentInputValidator {
   
    public AgentInputValidator()
    {
    }
    public static boolean hasEnoughContextForTask(String instruction, int taskCount) {
        String lower = instruction.toLowerCase().trim();

        if (lower.contains("add") || lower.contains("schedule") || lower.contains("create")) {
            if (!lower.contains(" at ") && !lower.contains(" from ") && !lower.matches(".*\\d+:\\d+.*")) {
                return false;
            }
            if (lower.split("\\s+").length < 4) {
                return false;
            }
        }

        if ((lower.contains("complete") || lower.contains("delete") || lower.contains("update") ||
             lower.contains("mark") || lower.contains("finish")) && taskCount > 0) {
            boolean hasSpecificIdentifier = lower.contains("task") || lower.matches(".*\\d+.*") || lower.contains("meeting") || lower.contains("study") || lower.contains("work") || lower.contains("project");
            if (!hasSpecificIdentifier && taskCount > 1) {
                return false;
            }
        }

        return true;
    }

    public static boolean hasEnoughContextForNote(String instruction, int noteCount) {
        String lower = instruction.toLowerCase().trim();

        if (lower.contains("add") || lower.contains("create") || lower.contains("make")) {
            if (lower.split("\\s+").length < 5) {
                return false; 
            }
            boolean hasSubstance = lower.contains("about") || lower.contains("remember") || lower.contains("don't forget") || lower.contains("note that") || lower.contains("important") || lower.length() > 20;
            if (!hasSubstance) {
                return false;
            }
        }

        if (lower.contains("update") || lower.contains("change") || lower.contains("modify")) {
            if (!lower.contains(" to ") && !lower.contains(" with ")) {
                return false;
            }
        }

        if ((lower.contains("delete") || lower.contains("remove")) && noteCount > 0) {
            boolean hasSpecificIdentifier = lower.contains("note") || lower.contains("about") || lower.contains("that") || lower.length() > 15; 
            if (!hasSpecificIdentifier && noteCount > 1) {
                return false; 
            }
        }

        return true;
    }
}
