import { useState, useEffect, useCallback, useRef } from 'react';

export function useTimer(initialTime: number, onTimeUp?: () => void) {
    const [timeRemaining, setTimeRemaining] = useState(initialTime);
    const [isRunning, setIsRunning] = useState(false);
    const intervalRef = useRef<number | null>(null);

    const start = useCallback((time?: number) => {
        if (time !== undefined) {
            setTimeRemaining(time);
        }
        setIsRunning(true);
    }, []);

    const stop = useCallback(() => {
        setIsRunning(false);
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    const reset = useCallback((time?: number) => {
        stop();
        setTimeRemaining(time ?? initialTime);
    }, [initialTime, stop]);

    useEffect(() => {
        if (isRunning && timeRemaining > 0) {
            intervalRef.current = window.setInterval(() => {
                setTimeRemaining(prev => {
                    if (prev <= 1) {
                        setIsRunning(false);
                        if (intervalRef.current) {
                            clearInterval(intervalRef.current);
                            intervalRef.current = null;
                        }
                        onTimeUp?.();
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isRunning, onTimeUp]);

    const formatTime = useCallback((seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const getTimerStatus = useCallback((): 'normal' | 'warning' | 'critical' => {
        if (timeRemaining <= 10) return 'critical';
        if (timeRemaining <= 30) return 'warning';
        return 'normal';
    }, [timeRemaining]);

    return {
        timeRemaining,
        isRunning,
        formattedTime: formatTime(timeRemaining),
        timerStatus: getTimerStatus(),
        start,
        stop,
        reset,
    };
}
