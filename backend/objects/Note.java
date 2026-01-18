package backend.objects;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

public class Note {

    private String id;
    private LocalDateTime creationTime;
    private String noteContent;

    public Note(String noteContent)
    {
        this.id = UUID.randomUUID().toString();
        this.noteContent = noteContent;
        this.creationTime = LocalDateTime.now();
    }

    public Note(String noteContent, LocalDateTime creationTime)
    {
        this.id = UUID.randomUUID().toString();
        this.noteContent = noteContent;
        this.creationTime = creationTime;
    }

    //constructor for loading from persistence with existing ID
    public Note(String id, String noteContent, LocalDateTime creationTime)
    {
        this.id = id;
        this.noteContent = noteContent;
        this.creationTime = creationTime;
    }

    //backward compatibility constructor
    public Note(String noteContent, java.time.LocalTime creationTime)
    {
        this.id = UUID.randomUUID().toString();
        this.noteContent = noteContent;
        this.creationTime = java.time.LocalDate.now().atTime(creationTime);
    }

    public String getId()
    {
        return id;
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
