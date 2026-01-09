package backend;

import java.io.IOException;
import java.util.List;
import java.util.Scanner;
import backend.FrontendDataHandler.TaskResponse;
import backend.objects.Task;

public class Main {

    public static Scanner input = new Scanner(System.in);
    public static TaskResponse taskResponse = null;
    public static void main(String[] args) {
        System.out.println("=== AI Productivity Planner - Backend Server ===\n");

        //initialize schedule manager
        ScheduleManager scheduleManager = new ScheduleManager();

        TaskPersistence.migrateFromTxtToJson();

        //load existing tasks from file
        System.out.println("Loading existing tasks...");
        TaskPersistence.loadTasks(scheduleManager);
        System.out.println("Loaded " + scheduleManager.getTaskCount() + " tasks");

        //fetch and display start time and end time of all tasks present if any
        List<Task> allTasks = scheduleManager.getAllTasks();
        if (!allTasks.isEmpty()) {
            System.out.println("\n=== Task Schedule ===");
            for (Task task : allTasks) {
                System.out.println("Task: " + task.getDescription());
                System.out.println("Date: " + task.getDate());
                System.out.println("Start Time: " + task.getStartTime());
                System.out.println("End Time: " + task.getEndTime());
                System.out.println("---");
            }
        }

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
}
