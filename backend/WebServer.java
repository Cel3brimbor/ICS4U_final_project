package backend;

import com.sun.net.httpserver.HttpServer;

import backend.objects.Agent;
import backend.objects.GeminiConfig;
import backend.objects.Timer;
import backend.webserver.StaticFileHandler;
import backend.webserver.TaskHandlers;
import backend.webserver.NoteHandlers;
import backend.webserver.AIHandlers;
import backend.webserver.TimerHandlers;
import backend.webserver.StatsHandlers;

import java.io.*;
import java.net.InetSocketAddress;

public class WebServer {
    private static final int PORT = 8000;
    private ScheduleManager scheduleManager;
    private NoteManager noteManager;
    private Agent aiAgent;
    private Timer timer;

    public WebServer(ScheduleManager scheduleManager, NoteManager noteManager) {
        this.scheduleManager = scheduleManager;
        this.noteManager = noteManager;
        this.aiAgent = new Agent(new GeminiConfig(), noteManager, scheduleManager);
        this.timer = new Timer();
    }

    public void start() throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(PORT), 0);

        //handle all static files with one handler
        server.createContext("/", new StaticFileHandler());

        //API endpoints
        server.createContext("/api/tasks", new TaskHandlers.TasksHandler(scheduleManager));
        server.createContext("/api/tasks/", new TaskHandlers.TaskHandler(scheduleManager)); //for specific task operations
        server.createContext("/api/notes", new NoteHandlers.NotesHandler(noteManager));
        server.createContext("/api/notes/", new NoteHandlers.NoteHandler(noteManager)); //for specific note operations
        server.createContext("/api/ai/chat", new AIHandlers.AIChatHandler(aiAgent));
        server.createContext("/api/ai/edit-notes", new AIHandlers.AIEditNotesHandler(aiAgent));
        server.createContext("/api/ai/edit-schedule", new AIHandlers.AIEditScheduleHandler(aiAgent));
        server.createContext("/api/timer", new TimerHandlers.TimerHandler(timer));
        server.createContext("/api/timer/start", new TimerHandlers.TimerStartHandler(timer));
        server.createContext("/api/timer/pause", new TimerHandlers.TimerPauseHandler(timer));
        server.createContext("/api/timer/stop", new TimerHandlers.TimerStopHandler(timer));
        server.createContext("/api/timer/reset", new TimerHandlers.TimerResetHandler(timer));

        // Stats endpoints
        server.createContext("/api/stats/session", new StatsHandlers.SaveSessionRatingHandler());
        server.createContext("/api/stats/summary", new StatsHandlers.GetSessionStatsHandler());

        server.setExecutor(null);
        server.start();

        System.out.println("\n\nServer started on http://localhost:" + PORT);
    }
}