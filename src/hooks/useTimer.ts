import { useState, useEffect, useCallback, useRef } from 'react';

export function useTimer(initialTime: number) {
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
        if (isRunning) {
            intervalRef.current = window.setInterval(() => {
                setTimeRemaining(prev => prev - 1);
            }, 1000);
        }

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
        };
    }, [isRunning]);

    const isOvertime = timeRemaining < 0;
    const overtimeSeconds = isOvertime ? Math.abs(timeRemaining) : 0;

    const formatTime = useCallback((seconds: number): string => {
        if (seconds < 0) {
            // Overtime display: +0:05, +0:30, +1:15
            const abs = Math.abs(seconds);
            const mins = Math.floor(abs / 60);
            const secs = abs % 60;
            return `+${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        }
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }, []);

    const getTimerStatus = useCallback((): 'normal' | 'warning' | 'critical' | 'overtime' => {
        if (timeRemaining < 0) return 'overtime';
        if (timeRemaining <= 10) return 'critical';
        if (timeRemaining <= 30) return 'warning';
        return 'normal';
    }, [timeRemaining]);

    return {
        timeRemaining,
        isRunning,
        isOvertime,
        overtimeSeconds,
        formattedTime: formatTime(timeRemaining),
        timerStatus: getTimerStatus(),
        start,
        stop,
        reset,
    };
}
