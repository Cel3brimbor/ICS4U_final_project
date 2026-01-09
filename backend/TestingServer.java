package backend;

import java.util.*;

import backend.objects.Task;

import java.time.LocalTime;
import java.time.LocalDate;
import java.io.IOException;

public class TestingServer {

    public static void main(String[] args) {
        System.out.println("=== AI Productivity Planner - Backend Server ===\n");

        //initialize schedule manager
        ScheduleManager scheduleManager = new ScheduleManager();

        //load existing tasks from file
        System.out.println("Loading existing tasks...");
        TaskPersistence.loadTasks(scheduleManager);
        System.out.println("Loaded " + scheduleManager.getTaskCount() + " tasks");

        //add some sample tasks if none exist
        // if (scheduleManager.getTaskCount() == 0) {
        //     addSampleTasks(scheduleManager);
        // }

        //start web server
        try {
            WebServer server = new WebServer(scheduleManager);
            server.start();

            System.out.println("\nServer is running...");

            Thread.currentThread().join();

        } catch (IOException e) {
            System.err.println("Failed to start server: " + e.getMessage());
            e.printStackTrace();
        } catch (InterruptedException e) {
            System.out.println("\nServer shutting down...");
        }
    }

    private static void addSampleTasks(ScheduleManager scheduleManager) {
        System.out.println("Adding sample tasks...");

        try {
            //add some sample tasks
            scheduleManager.addTask("Welcome Meeting", java.time.LocalTime.of(9, 0), java.time.LocalTime.of(9, 30));
            scheduleManager.addTask("Development Work", java.time.LocalTime.of(10, 0), java.time.LocalTime.of(12, 0));
            scheduleManager.addTask("Lunch Break", java.time.LocalTime.of(12, 0), java.time.LocalTime.of(13, 0));
            scheduleManager.addTask("Code Review", java.time.LocalTime.of(14, 0), java.time.LocalTime.of(15, 30));

            TaskPersistence.saveTasks(scheduleManager);
            System.out.println("Sample tasks added successfully");

        } catch (Exception e) {
            System.err.println("Error adding sample tasks: " + e.getMessage());
        }
    }

    private static void demonstrateTaskAdding(ScheduleManager scheduleManager) {
        System.out.println("--- Adding Tasks to Schedule ---");

        try {
            Task task1 = scheduleManager.addTask("Team Standup Meeting", LocalTime.of(9, 0), LocalTime.of(9, 30));
            if (task1 != null) {
                System.out.println("✓ Added: " + task1.getDescription());
            }

            Task task2 = scheduleManager.addTask("Work on backend API", LocalTime.of(10, 0), LocalTime.of(12, 0));
            if (task2 != null) {
                System.out.println("✓ Added: " + task2.getDescription());
            }

            Task task3 = scheduleManager.addTask("Lunch Break", LocalTime.of(12, 0), LocalTime.of(13, 0));
            if (task3 != null) {
                System.out.println("✓ Added: " + task3.getDescription());
            } else {
                System.out.println("✗ Could not add Lunch Break - time conflict with existing task");
                //try a different time
                task3 = scheduleManager.addTask("Lunch Break", LocalTime.of(12, 30), LocalTime.of(13, 30));
                if (task3 != null) {
                    System.out.println("✓ Added: " + task3.getDescription() + " (adjusted time)");
                }
            }

            //try to add overlapping task (should fail)
            Task task4 = scheduleManager.addTask("Client Call", LocalTime.of(11, 0), LocalTime.of(11, 30));
            if (task4 != null) {
                System.out.println("✓ Added: " + task4.getDescription());
            } else {
                System.out.println("✗ Could not add Client Call - overlaps with 'Work on backend API'");
                //add with overlap allowed
                task4 = scheduleManager.addTask("Client Call", LocalTime.of(11, 0), LocalTime.of(11, 30), true);
                if (task4 != null) {
                    System.out.println("✓ Added: " + task4.getDescription() + " (overlap allowed)");
                }
            }

            Task task5 = scheduleManager.addTask("Code Review", LocalTime.of(14, 0), LocalTime.of(15, 30));
            if (task5 != null) {
                System.out.println("✓ Added: " + task5.getDescription());
            }

        } catch (IllegalArgumentException e) {
            System.out.println("Error adding task: " + e.getMessage());
        }

        System.out.println();
    }

    private static void demonstrateScheduleManagement(ScheduleManager scheduleManager) {
        System.out.println("--- Schedule Management ---");

        //display today's tasks
        System.out.println("Today's Tasks:");
        List<Task> todayTasks = scheduleManager.getTodayTasks();
        for (Task task : todayTasks) {
            System.out.printf("  %s - %s (%d min)\n",
                task.getStartTime(), task.getDescription(), task.getDurationMinutes());
        }

        //display tasks by status
        System.out.println("\nPending Tasks:");
        List<Task> pendingTasks = scheduleManager.getTasksByStatus(Task.TaskStatus.PENDING);
        for (Task task : pendingTasks) {
            System.out.printf("  %s: %s\n", task.getStartTime(), task.getDescription());
        }

        //update task status
        if (!todayTasks.isEmpty()) {
            Task firstTask = todayTasks.get(0);
            System.out.println("\nMarking first task as completed...");
            boolean updated = scheduleManager.updateTaskStatus(firstTask.getId(), Task.TaskStatus.COMPLETED);
            if (updated) {
                System.out.println("✓ Task status updated");
            }
        }

        //check time slot availability
        System.out.println("\nChecking time slot availability:");
        boolean available = scheduleManager.isTimeSlotAvailable(LocalTime.of(16, 0), LocalTime.of(17, 0), LocalDate.now());
        System.out.println("  4:00 PM - 5:00 PM available: " + (available ? "Yes" : "No"));

        available = scheduleManager.isTimeSlotAvailable(LocalTime.of(11, 0), LocalTime.of(11, 30), LocalDate.now());
        System.out.println("  11:00 AM - 11:30 AM available: " + (available ? "Yes" : "No"));

        //display schedule summary
        System.out.println("\nSchedule Summary:");
        System.out.println("  Total tasks: " + scheduleManager.getTaskCount());
        System.out.println("  Pending tasks: " + scheduleManager.getTasksByStatus(Task.TaskStatus.PENDING).size());
        System.out.println("  Completed tasks: " + scheduleManager.getTasksByStatus(Task.TaskStatus.COMPLETED).size());

        System.out.println();
    }

    //interactive method for adding tasks via console input
    public static void interactiveTaskAdding(ScheduleManager scheduleManager) {
        Scanner scanner = new Scanner(System.in);

        System.out.println("=== Interactive Task Scheduler ===");
        System.out.println("Enter tasks in format: description,startHour:startMinute-endHour:endMinute");
        System.out.println("Example: Team meeting,09:00-10:00");
        System.out.println("Type 'quit' to exit");

        while (true) {
            System.out.print("\nEnter task: ");
            String input = scanner.nextLine().trim();

            if (input.equalsIgnoreCase("quit")) {
                break;
            }

            try {
                //parse input format: description,startHour:startMinute-endHour:endMinute
                String[] parts = input.split(",");
                if (parts.length != 2) {
                    System.out.println("Invalid format. Use: description,startHour:startMinute-endHour:endMinute");
                    continue;
                }

                String description = parts[0].trim();
                String[] timeParts = parts[1].split("-");
                if (timeParts.length != 2) {
                    System.out.println("Invalid time format. Use: startHour:startMinute-endHour:endMinute");
                    continue;
                }

                LocalTime startTime = parseTime(timeParts[0]);
                LocalTime endTime = parseTime(timeParts[1]);

                Task newTask = scheduleManager.addTask(description, startTime, endTime);
                if (newTask != null) {
                    System.out.println("✓ Task added successfully: " + newTask);
                } else {
                    System.out.println("✗ Could not add task - time conflict detected");
                    System.out.print("Add anyway (allowing overlap)? (y/n): ");
                    String response = scanner.nextLine().trim();
                    if (response.equalsIgnoreCase("y")) {
                        newTask = scheduleManager.addTask(description, startTime, endTime, true);
                        if (newTask != null) {
                            System.out.println("✓ Task added with overlap: " + newTask);
                        }
                    }
                }

            } catch (Exception e) {
                System.out.println("Error: " + e.getMessage());
            }
        }

        scanner.close();
    }

    private static LocalTime parseTime(String timeStr) {
        String[] timeParts = timeStr.split(":");
        if (timeParts.length != 2) {
            throw new IllegalArgumentException("Time must be in format HH:MM");
        }
        int hour = Integer.parseInt(timeParts[0]);
        int minute = Integer.parseInt(timeParts[1]);
        return LocalTime.of(hour, minute);
    } 
}
