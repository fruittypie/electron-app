import React, { useEffect, useState, useRef } from 'react';
import LogEntry from './LogEntry';

export default function LogPanel({ notifyInApp, logs, onLog }) {
    const bottomRef = useRef();
    
    useEffect(() => {
        const onLogHandler  = (_, entry) => {
        if (entry.type === 'in-stock' && !notifyInApp) return;
             if (entry.type === 'in-stock' && !notifyInApp) return;
            onLog(entry);
        };

        window.electron.on('scraper-log', onLogHandler);
        return () => window.electron.off('scraper-log', onLogHandler);
    }, [notifyInApp, onLog]);

  // auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="space-y-2 max-h-full overflow-y-auto">
            {logs.map((entry, index) => (
                <LogEntry key={index} entry={entry} />
            ))}
            <div ref={bottomRef} />
        </div>
    );
}
