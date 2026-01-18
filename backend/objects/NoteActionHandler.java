package backend.objects;

import java.util.regex.Pattern;
import java.util.regex.Matcher;
import backend.NoteManager;

public class NoteActionHandler {

    private final NoteManager noteManager;

    public NoteActionHandler(NoteManager noteManager) {
        this.noteManager = noteManager;
    }

    public String executeNoteAction(String actionJson) {
        try {
            if (AIResponseHandler.containsAction(actionJson, "ADD")) {
                Pattern contentPattern = Pattern.compile("\"content\"\\s*:\\s*\"([^\"]+)\"");
                Matcher contentMatcher = contentPattern.matcher(actionJson);
                if (contentMatcher.find()) {
                    String content = contentMatcher.group(1);
                    Note newNote = noteManager.addNote(content);
                    backend.NotePersistence.saveNotes(noteManager);
                    return "Added new note: " + content;
                }
            } else if (AIResponseHandler.containsAction(actionJson, "UPDATE")) {
                Pattern idPattern = Pattern.compile("\"noteId\"\\s*:\\s*\"([^\"]+)\"");
                Matcher idMatcher = idPattern.matcher(actionJson);
                Pattern contentPattern = Pattern.compile("\"content\"\\s*:\\s*\"([^\"]+)\"");
                Matcher contentMatcher = contentPattern.matcher(actionJson);

                if (idMatcher.find() && contentMatcher.find()) {
                    String noteId = idMatcher.group(1);
                    String content = contentMatcher.group(1);
                    if (noteManager.updateNote(noteId, content)) {
                        backend.NotePersistence.saveNotes(noteManager);
                        return "Updated note: " + content;
                    } else {
                        return "Could not find note with ID: " + noteId;
                    }
                }
            } else if (AIResponseHandler.containsAction(actionJson, "DELETE")) {
                Pattern idPattern = Pattern.compile("\"noteId\"\\s*:\\s*\"([^\"]+)\"");
                Matcher idMatcher = idPattern.matcher(actionJson);
                if (idMatcher.find()) {
                    String noteId = idMatcher.group(1);
                    if (noteManager.deleteNote(noteId)) {
                        backend.NotePersistence.saveNotes(noteManager);
                        return "Deleted note with ID: " + noteId;
                    } else {
                        return "Could not find note with ID: " + noteId;
                    }
                }
            } else if (AIResponseHandler.containsAction(actionJson, "DELETE_MULTIPLE")) {
                Pattern noteIdsPattern = Pattern.compile("\"noteIds\"\\s*:\\s*\\[([^\\]]+)\\]");
                Matcher noteIdsMatcher = noteIdsPattern.matcher(actionJson);

                if (noteIdsMatcher.find()) {
                    String noteIdsJson = noteIdsMatcher.group(1);
                    String[] noteIdStrings = noteIdsJson.split("\\s*,\\s*");

                    StringBuilder resultMessage = new StringBuilder("Deleted multiple notes:\n");
                    int successCount = 0;
                    int notFoundCount = 0;

                    for (String noteIdStr : noteIdStrings) {
                        noteIdStr = noteIdStr.replaceAll("^\\s*\"|\"\\s*$", "");

                        if (noteManager.deleteNote(noteIdStr)) {
                            resultMessage.append("- Deleted note: ").append(noteIdStr).append("\n");
                            successCount++;
                        } else {
                            resultMessage.append("- Note not found: ").append(noteIdStr).append("\n");
                            notFoundCount++;
                        }
                    }

                    backend.NotePersistence.saveNotes(noteManager);
                    resultMessage.append("\nSummary: ").append(successCount).append(" notes deleted");
                    if (notFoundCount > 0) {
                        resultMessage.append(", ").append(notFoundCount).append(" not found");
                    }
                    return resultMessage.toString();
                }
            } else if (AIResponseHandler.containsAction(actionJson, "ITEM_NOT_FOUND")) {
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
            } else if (AIResponseHandler.containsAction(actionJson, "NEED_INFO")) {
                return "I need more information to complete this action.";
            }

            return "Action completed successfully.";

        } catch (Exception e) {
            return "Error executing note action: " + e.getMessage();
        }
    }
}