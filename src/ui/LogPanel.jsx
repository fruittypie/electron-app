import React, { useEffect, useState, useRef } from 'react';
import LogEntry from './LogEntry';

export default function LogPanel({ notifyInApp }) {
    const [logs, setLogs] = useState([]);
    const bottomRef = useRef();
    
    useEffect(() => {
        const onLog = (_, entry) => {
        if (entry.type === 'in-stock' && !notifyInApp) return;
            setLogs(prevLogs => {
                const isDuplicate = prevLogs.some(
                    log => log.timestamp === entry.timestamp && log.text === entry.text
                );
            if(isDuplicate) {
                return prevLogs;
            }
            return [...prevLogs,entry];
            });
        };
        window.electron.on('scraper-log', onLog);
        return () => window.electron.off('scraper-log', onLog);
    }, [notifyInApp]);

  // auto-scroll
    useEffect(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [logs]);

    return (
        <div className="flex-1 overflow-auto p-4 bg-gray-100 dark:bg-gray-800">
            {logs.map((entry, i) => <LogEntry key={i} entry={entry} />)}
            <div ref={bottomRef} />
        </div>
  );
}
