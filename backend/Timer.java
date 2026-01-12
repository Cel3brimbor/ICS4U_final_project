package backend;

import java.time.*;
import java.util.*;

public class Timer {
    private Timer javaTimer;                   
    private TimerTask currentTask;              
    private AtomicInteger remainingSeconds;     
    private boolean isRunning;                  
    private static final int POMODORO_DURATION = 25 * 60; 
    startPomodoro() {
        stopTimer();
        remainingSeconds.set(POMODORO_DURATION);
        isRunning = true;
        currentTask = new TimerTask() {
            @Override
            public void run() {
                remainingSeconds.decrementAndGet();
                if (remainingSeconds.get() <= 0) {
                    stopTimer();
                }
            }
        };
        javaTimer.schedule(currentTask, 0, 1000);
    }

    startShortBreak() {
        //start short break timer
    }

    startLongBreak() {
        //start long break timer
    }
    pauseTimer() {
        //pause timer
    }
    resumeTimer() {
        //resume timer
    }
    stopTimer() {
        //stop timer
    }
    resetTimer() {
        //reset timer
    }
    getRemainingTime() {
        //get remaining time
    }
    getPomodorosCompleted() {
        //get pomodoros completed
    }
}
