import React, { useState, useEffect, useCallback } from 'react';
import { getLogCollector, getLogStats, getFilteredLogs, clearLogs, LogLevel, type LogEntry } from '../utils/renderer-logger';

interface DebugPanelProps {
  defaultExpanded?: boolean;
}

const LEVEL_COLORS: Record<number, string> = {
  [LogLevel.DEBUG]: '#6c757d',
  [LogLevel.INFO]: '#17a2b8',
  [LogLevel.WARN]: '#ffc107',
  [LogLevel.ERROR]: '#dc3545',
};

export const DebugPanel: React.FC<DebugPanelProps> = ({ defaultExpanded = false }) => {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<ReturnType<typeof getLogStats> | null>(null);
  const [filterLevel, setFilterLevel] = useState<LogLevel | null>(null);
  const [filterModule, setFilterModule] = useState<string | null>(null);

  const refreshLogs = useCallback(() => {
    const entries = getFilteredLogs({
      level: filterLevel ?? undefined,
      module: filterModule ?? undefined,
    });
    setLogs(entries);
    setStats(getLogStats());
  }, [filterLevel, filterModule]);

  useEffect(() => {
    refreshLogs();
    const unsubscribe = getLogCollector().subscribe(() => {
      refreshLogs();
    });
    return unsubscribe;
  }, [refreshLogs]);

  const handleClear = useCallback(() => {
    clearLogs();
    refreshLogs();
  }, [refreshLogs]);

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        style={{
          position: 'fixed',
          bottom: '10px',
          right: '10px',
          zIndex: 9999,
          padding: '8px 16px',
          background: '#343a40',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer',
          fontSize: '12px',
        }}
      >
        Logs
      </button>
    );
  }

  const modules = stats ? Object.keys(stats.byModule) : [];

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '10px',
        right: '10px',
        zIndex: 9999,
        width: '600px',
        maxHeight: '80vh',
        background: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '8px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        fontSize: '12px',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          background: '#343a40',
          color: 'white',
          borderRadius: '8px 8px 0 0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>Render Logs</span>
        <button
          onClick={() => setExpanded(false)}
          style={{
            background: 'transparent',
            border: 'none',
            color: 'white',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          ×
        </button>
      </div>

      <div style={{ padding: '12px 16px', borderBottom: '1px solid #dee2e6' }}>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <select
            value={filterLevel ?? ''}
            onChange={(e) => setFilterLevel(e.target.value ? Number(e.target.value) : null)}
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #dee2e6' }}
          >
            <option value="">All Levels</option>
            <option value={LogLevel.DEBUG}>DEBUG</option>
            <option value={LogLevel.INFO}>INFO</option>
            <option value={LogLevel.WARN}>WARN</option>
            <option value={LogLevel.ERROR}>ERROR</option>
          </select>

          <select
            value={filterModule ?? ''}
            onChange={(e) => setFilterModule(e.target.value || null)}
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #dee2e6' }}
          >
            <option value="">All Modules</option>
            {modules.map((mod) => (
              <option key={mod} value={mod}>{mod}</option>
            ))}
          </select>

          <button
            onClick={handleClear}
            style={{
              padding: '4px 12px',
              background: '#dc3545',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Clear
          </button>

          <button
            onClick={refreshLogs}
            style={{
              padding: '4px 12px',
              background: '#17a2b8',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
            }}
          >
            Refresh
          </button>
        </div>

        {stats && (
          <div style={{ display: 'flex', gap: '16px', fontSize: '11px' }}>
            <span style={{ color: '#6c757d' }}>DEBUG: {stats.byLevel[LogLevel.DEBUG]}</span>
            <span style={{ color: '#17a2b8' }}>INFO: {stats.byLevel[LogLevel.INFO]}</span>
            <span style={{ color: '#ffc107' }}>WARN: {stats.byLevel[LogLevel.WARN]}</span>
            <span style={{ color: '#dc3545' }}>ERROR: {stats.byLevel[LogLevel.ERROR]}</span>
            <span style={{ fontWeight: 'bold' }}>Total: {stats.total}</span>
          </div>
        )}
      </div>

      <div
        style={{
          flex: 1,
          overflow: 'auto',
          padding: '8px 16px',
          background: '#f8f9fa',
          fontFamily: 'Monaco, Menlo, monospace',
          fontSize: '11px',
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: '#6c757d', textAlign: 'center', padding: '20px' }}>
            No logs
          </div>
        ) : (
          logs.map((log, index) => (
            <div
              key={index}
              style={{
                padding: '4px 0',
                borderBottom: '1px solid #e9ecef',
                color: LEVEL_COLORS[log.level],
              }}
            >
              <span style={{ color: '#adb5bd' }}>{log.timestamp.split('T')[1]?.split('+')[0]}</span>
              {' '}
              <span style={{ fontWeight: 'bold' }}>[{log.levelName}]</span>
              {' '}
              <span style={{ color: '#495057' }}>[{log.module}]</span>
              {' '}
              <span>{log.message}</span>
              {log.data !== undefined && log.data !== null && (
                <span style={{ color: '#6c757d' }}>
                  {' '}{JSON.stringify(log.data)}
                </span>
              )}
            </div>
          ))
        )}
      </div>

      <div
        style={{
          padding: '8px 16px',
          background: '#e9ecef',
          borderRadius: '0 0 8px 8px',
          fontSize: '10px',
          color: '#6c757d',
        }}
      >
        Press F12 for full Console logs | Use window.__RENDERER_LOGGER__ for programmatic access
      </div>
    </div>
  );
};
