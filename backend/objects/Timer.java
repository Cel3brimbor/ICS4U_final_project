package backend.objects;

//imports
import java.util.*;
import java.util.concurrent.atomic.AtomicInteger;

public class Timer {
    private static final int pomodoroDuration = 25 * 60;
    private static final int shortBreakDuration = 5 * 60;
    private static final int longBreakDuration = 15 * 60;
    private java.util.Timer utilTimer;
    private TimerTask currentTask;
    private AtomicInteger remainingSeconds;
    private boolean isRunning;
    private int pomodorosCompleted = 0;  
    
    public interface TimerCallback {
        void onTimerComplete(String mode);
        void onReminder(String message);
    }
    private TimerCallback callback; 
    public void startPomodoro() {
        startTimer("pomodoro", pomodoroDuration);
    }

    private void startTimer(String mode, int duration) {
        stopTimer();
        remainingSeconds.set(duration);
        isRunning = true;
        utilTimer = new java.util.Timer();
        currentTask = new TimerTask() {
            @Override
            public void run() {
                int remaining = remainingSeconds.decrementAndGet();
                if(remaining <= 0) {
                    isRunning = false;
                    if ("pomodoro".equals(mode)) {
                        pomodorosCompleted++;
                    }
                    if (callback != null) {
                        callback.onTimerComplete(mode);
                    }
                    cancel();
                }
            }
        };
        utilTimer.scheduleAtFixedRate(currentTask, 0, 1000);
    }

    public Timer(){
        this.remainingSeconds = new AtomicInteger(pomodoroDuration);
        this.isRunning = false;
        this.pomodorosCompleted = 0;
        this.callback = null;
        this.utilTimer = null;
        this.currentTask = null;
    }

    public Timer(TimerCallback callback) {
        this();
        this.callback = callback;
    }

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
        if (currentTask != null) {
            currentTask.cancel();
        }
        if (utilTimer != null) {
            utilTimer.cancel();
        }
        isRunning = false;
    }

    public void resumeTimer() {
        if (!isRunning && remainingSeconds.get() > 0) {
            utilTimer = new java.util.Timer();
            currentTask = new TimerTask() {
                @Override
                public void run() {
                    int remaining = remainingSeconds.decrementAndGet();
                    if(remaining <= 0) {
                        isRunning = false;
                        cancel();
                    }
                }
            };
            utilTimer.scheduleAtFixedRate(currentTask, 0, 1000);
            isRunning = true;
        }
    }

    public void stopTimer() {
        if (currentTask != null) {
            currentTask.cancel();
        }
        if (utilTimer != null) {
            utilTimer.cancel();
        }
        isRunning = false;
    }

    public void resetTimer() {
        stopTimer();
        remainingSeconds.set(pomodoroDuration);
    }
    public int getRemainingTime() {
        return remainingSeconds.get();
    }
    public boolean isRunning() {
        return isRunning;
    }
    public int getPomodorosCompleted() {
        return pomodorosCompleted;
    }

    public String getRemainingTimeFormatted() {
        int totalSeconds = remainingSeconds.get();
        int minutes = totalSeconds / 60;
        int seconds = totalSeconds % 60;
        return String.format("%02d:%02d", minutes, seconds);
    }

    public void sendReminder(String message) {
        if (callback != null) {
            callback.onReminder(message);
        }
    }
    public String getSuggestedNextMode() {
        if (pomodorosCompleted > 0 && pomodorosCompleted % 4 == 0) {
            return "long-break"; 
        } else if (pomodorosCompleted > 0) {
            return "short-break"; 
        }
        return "pomodoro"; 
    }
    public void resetPomodoroCounter() {
        pomodorosCompleted = 0;
    }

    public void cleanup() {
        stopTimer();
    }
}


