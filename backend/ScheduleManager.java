package backend;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

public class ScheduleManager {
    private List<Task> tasks;
    private Map<LocalDate, List<Task>> tasksByDate;

    public ScheduleManager() {
        this.tasks = new ArrayList<>();
        this.tasksByDate = new HashMap<>();
    }

    public Task addTask(String description, LocalTime startTime, LocalTime endTime) {
        return addTask(description, startTime, endTime, LocalDate.now());
    }


    public Task addTask(String description, LocalTime startTime, LocalTime endTime, LocalDate date) {
        // input validation
        if (description == null || description.trim().isEmpty()) {
            throw new IllegalArgumentException("Task description cannot be empty");
        }
        if (startTime == null || endTime == null) {
            throw new IllegalArgumentException("Start time and end time cannot be null");
        }
        if (startTime.isAfter(endTime) || startTime.equals(endTime)) {
            throw new IllegalArgumentException("Start time must be before end time");
        }
        if (date == null) {
            throw new IllegalArgumentException("Date cannot be null");
        }

        Task newTask = new Task(description.trim(), startTime, endTime, date);

        List<Task> dayTasks = tasksByDate.getOrDefault(date, new ArrayList<>());
        for (Task existingTask : dayTasks) {
            if (newTask.isOverlapping(existingTask)) {
                return null; //conflict detected
            }
        }

        //add task if no conflicts
        tasks.add(newTask);
        dayTasks.add(newTask);
        tasksByDate.put(date, dayTasks);

        return newTask;
    }


    public Task addTask(String description, LocalTime startTime, LocalTime endTime, boolean allowOverlap) {
        return addTask(description, startTime, endTime, LocalDate.now(), allowOverlap);
    }

    //add task for a specific date
    public Task addTask(String description, LocalTime startTime, LocalTime endTime, LocalDate date, boolean allowOverlap) {
        if (!allowOverlap) {
            return addTask(description, startTime, endTime, date);
        }

        // input validation
        if (description == null || description.trim().isEmpty()) {
            throw new IllegalArgumentException("Task description cannot be empty");
        }
        if (startTime == null || endTime == null) {
            throw new IllegalArgumentException("Start time and end time cannot be null");
        }
        if (startTime.isAfter(endTime) || startTime.equals(endTime)) {
            throw new IllegalArgumentException("Start time must be before end time");
        }
        if (date == null) {
            throw new IllegalArgumentException("Date cannot be null");
        }

        Task newTask = new Task(description.trim(), startTime, endTime, date);

        //add task without checking
        tasks.add(newTask);
        List<Task> dayTasks = tasksByDate.getOrDefault(date, new ArrayList<>());
        dayTasks.add(newTask);
        tasksByDate.put(date, dayTasks);

        return newTask;
    }

    //get tasks for a specific date
    public List<Task> getTasksForDate(LocalDate date) {
        return tasksByDate.getOrDefault(date, new ArrayList<>())
                .stream()
                .sorted(Comparator.comparing(Task::getStartTime))
                .collect(Collectors.toList());
    }

    //get tasks for today
    public List<Task> getTodayTasks() {
        return getTasksForDate(LocalDate.now());
    }

    //get tasks by status
    public List<Task> getTasksByStatus(Task.TaskStatus status) {
        return tasks.stream()
                .filter(task -> task.getStatus() == status)
                .sorted(Comparator.comparing(Task::getDate).thenComparing(Task::getStartTime))
                .collect(Collectors.toList());
    }

    //update task status
    public boolean updateTaskStatus(String taskId, Task.TaskStatus status) {
        for (Task task : tasks) {
            if (task.getId().equals(taskId)) {
                task.setStatus(status);
                return true;
            }
        }
        return false;
    }

    //remove task
    public boolean removeTask(String taskId) {
        Task taskToRemove = null;
        for (Task task : tasks) {
            if (task.getId().equals(taskId)) {
                taskToRemove = task;
                break;
            }
        }

        if (taskToRemove != null) {
            tasks.remove(taskToRemove);
            List<Task> dayTasks = tasksByDate.get(taskToRemove.getDate());
            if (dayTasks != null) {
                dayTasks.remove(taskToRemove);
                if (dayTasks.isEmpty()) {
                    tasksByDate.remove(taskToRemove.getDate());
                }
            }
            return true;
        }
        return false;
    }

    //return all tasks
    public List<Task> getAllTasks() {
        return tasks.stream()
                .sorted(Comparator.comparing(Task::getDate).thenComparing(Task::getStartTime))
                .collect(Collectors.toList());
    }

    public boolean isTimeSlotAvailable(LocalTime startTime, LocalTime endTime, LocalDate date) {
        Task tempTask = new Task("temp", startTime, endTime, date);
        List<Task> dayTasks = tasksByDate.getOrDefault(date, new ArrayList<>());

        for (Task existingTask : dayTasks) {
            if (tempTask.isOverlapping(existingTask)) {
                return false;
            }
        }
        return true;
    }

    //get total number of tasks
    public int getTaskCount() {
        return tasks.size();
    }

    public void clearAllTasks() {
        tasks.clear();
        tasksByDate.clear();
    }
}
