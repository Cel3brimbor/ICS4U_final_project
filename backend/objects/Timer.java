package backend.objects;

import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

public class Timer {
    // Timer durations in seconds
    private static final int pomodoroDuration = 25 * 60;    // 25 minutes
    private static final int shortBreakDuration = 5 * 60;   // 5 minutes
    private static final int longBreakDuration = 15 * 60;    // 15 minutes

    // Instance variables
    private Timer javaTimer;
    private TimerTask currentTask;
    private AtomicInteger remainingSeconds;
    private boolean isRunning;
    private int pomodorosCompleted = 0;  // Track completed pomodoros

    // Callback interface for notifications/reminders
    public interface TimerCallback {
        void onTimerComplete(String mode);
        void onReminder(String message);
    }

    private TimerCallback callback; 
    public void startPomodoro() {
        startTimer("pomodoro", pomodoroDuration);
    }

    // Internal method to start any timer with callback support
    private void startTimer(String mode, int duration) {
        stopTimer();
        remainingSeconds.set(duration);
        isRunning = true;

        currentTask = new TimerTask() {
            @Override
            public void run() {
                int remaining = remainingSeconds.decrementAndGet();
                if(remaining <= 0) {
                    isRunning = false;
                    // Track completed pomodoros
                    if ("pomodoro".equals(mode)) {
                        pomodorosCompleted++;
                    }
                    // Notify callback of completion
                    if (callback != null) {
                        callback.onTimerComplete(mode);
                    }
                    cancel(); // Stop this task
                }
            }
        };
        javaTimer.scheduleAtFixedRate(currentTask, 0, 1000);
    }

    public Timer(){
        this.javaTimer = new Timer();
        this.remainingSeconds = new AtomicInteger(pomodoroDuration);
        this.isRunning = false;
        this.pomodorosCompleted = 0;
        this.callback = null;
    }

    // Constructor with callback for notifications
    public Timer(TimerCallback callback) {
        this();
        this.callback = callback;
    }

    // Set callback after construction
    public void setCallback(TimerCallback callback) {
        this.callback = callback;
    }

    public void startShortBreak() {
        startTimer("short-break", shortBreakDuration);
    }

    public void startLongBreak() {
        startTimer("long-break", longBreakDuration);
    }
    public void pauseTimer() {
        javaTimer.cancel();
        isRunning = false;
    }
    public void resumeTimer() {
        javaTimer.schedule(currentTask, 0, 1000);
        isRunning = true;
    }
    public void stopTimer() {
        javaTimer.cancel();
        isRunning = false;
    }
    public void resetTimer() {
        javaTimer.cancel();
        isRunning = false;
        remainingSeconds.set(pomodoroDuration);
    }
    public int getRemainingTime() {
        return remainingSeconds.get();
    }
    public int getPomodorosCompleted() {
        return pomodorosCompleted;
    }

    // Get remaining time formatted as MM:SS
    public String getRemainingTimeFormatted() {
        int totalSeconds = remainingSeconds.get();
        int minutes = totalSeconds / 60;
        int seconds = totalSeconds % 60;
        return String.format("%02d:%02d", minutes, seconds);
    }

    // Send reminder notifications
    public void sendReminder(String message) {
        if (callback != null) {
            callback.onReminder(message);
        }
    }

    // Get suggestions for next timer mode based on completion history
    public String getSuggestedNextMode() {
        if (pomodorosCompleted > 0 && pomodorosCompleted % 4 == 0) {
            return "long-break"; // After every 4 pomodoros
        } else if (pomodorosCompleted > 0) {
            return "short-break"; // After regular pomodoros
        }
        return "pomodoro"; // Default suggestion
    }

    // Reset pomodoro counter (for new day/session)
    public void resetPomodoroCounter() {
        pomodorosCompleted = 0;
    }

    // Clean up resources
    public void cleanup() {
        stopTimer();
        if (javaTimer != null) {
            javaTimer.cancel();
        }
    }
}


