package backend.objects;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class Note {

    private LocalDateTime creationTime;
    private String noteContent;

    public Note(String noteContent, LocalDateTime creationTime)
    {
        this.noteContent = noteContent;
        this.creationTime = creationTime;
    }

    //backward compatibility constructor
    public Note(String noteContent, java.time.LocalTime creationTime)
    {
        this.noteContent = noteContent;
        this.creationTime = java.time.LocalDate.now().atTime(creationTime);
    }

    public String getContent()
    {
        return noteContent;
    }

    public LocalDateTime getCreationTime()
    {
        return creationTime;
    }

    public String getFormattedCreationTime()
    {
        return creationTime.format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"));
    }

    public void setContent(String content)
    {
        this.noteContent = content;
    }
}
