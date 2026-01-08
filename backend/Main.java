package backend;

import java.io.IOException;

public class Main {

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
}
