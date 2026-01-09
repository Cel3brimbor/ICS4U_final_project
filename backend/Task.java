package backend;

import java.time.LocalTime;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.UUID;

public class Task {
    private String id;
    private String description;
    private LocalTime startTime;
    private LocalTime endTime;
    private LocalDate date;
    private TaskStatus status;
    private String priority;

    public enum TaskStatus {
        PENDING,
        IN_PROGRESS,
        COMPLETED,
        CANCELLED
    }

    public Task(String description, LocalTime startTime, LocalTime endTime) {
        this(description, startTime, endTime, LocalDate.now());
    }

    public Task(String description, LocalTime startTime, LocalTime endTime, LocalDate date) {
        this.id = UUID.randomUUID().toString();
        this.description = description;
        this.startTime = startTime;
        this.endTime = endTime;
        this.date = date;
        this.status = TaskStatus.PENDING;
        this.priority = "MEDIUM";
    }

    //constructor for loading from persistence
    public Task(String id, String description, LocalTime startTime, LocalTime endTime, LocalDate date, TaskStatus status, String priority) {
        this.id = id;
        this.description = description;
        this.startTime = startTime;
        this.endTime = endTime;
        this.date = date;
        this.status = status;
        this.priority = priority;
    }

    //getters
    public String getId() { return id; }
    public String getDescription() { return description; }
    public LocalTime getStartTime() { return startTime; }
    public LocalTime getEndTime() { return endTime; }
    public LocalDate getDate() { return date; }
    public TaskStatus getStatus() { return status; }
    public String getPriority() { return priority; }

    //setters
    public void setDescription(String description) { this.description = description; }
    public void setStartTime(LocalTime startTime) { this.startTime = startTime; }
    public void setEndTime(LocalTime endTime) { this.endTime = endTime; }
    public void setDate(LocalDate date) { this.date = date; }
    public void setStatus(TaskStatus status) { this.status = status; }
    public void setPriority(String priority) { this.priority = priority; }

    // Utility methods
    public boolean isOverlapping(Task other) {
        if (!this.date.equals(other.date)) return false;

        return (this.startTime.isBefore(other.endTime) && this.endTime.isAfter(other.startTime));
    }

    public int getDurationMinutes() {
        return endTime.toSecondOfDay() / 60 - startTime.toSecondOfDay() / 60;
    }

    @Override
    public String toString() {
        DateTimeFormatter timeFormatter = DateTimeFormatter.ofPattern("HH:mm");
        return String.format("Task[id=%s, description='%s', time=%s-%s, status=%s, priority=%s]",
                id, description, startTime.format(timeFormatter), endTime.format(timeFormatter),
                status, priority);
    }

    public String toJson() {
        return String.format("{\"id\":\"%s\",\"description\":\"%s\",\"startTime\":\"%s\",\"endTime\":\"%s\",\"date\":\"%s\",\"status\":\"%s\",\"priority\":\"%s\"}",
                id, description, startTime, endTime, date, status, priority);
    }
}
