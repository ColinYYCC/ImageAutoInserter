import React, { useState, useEffect, useCallback, useRef } from 'react';
import styles from './LogViewer.module.css';

interface LogEntry {
  timestamp: string;
  level: string;
  module: string;
  message: string;
}

interface LogStats {
  totalEntries: number;
  levelCounts: Record<string, number>;
  logFileSize: number;
}

type LevelFilter = 'ALL' | 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const LEVEL_OPTIONS: LevelFilter[] = ['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR'];

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
};

const formatTimestamp = (ts: string): string => {
  const timePart = ts.split('T')[1];
  if (!timePart) return ts;
  return timePart.split('+')[0].split('.')[0];
};

const LogViewer: React.FC = () => {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('ALL');
  const [searchText, setSearchText] = useState('');
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>();

  const fetchEntries = useCallback(async () => {
    try {
      const filter: { level?: string; search?: string; limit?: number } = { limit: 500 };
      if (levelFilter !== 'ALL') filter.level = levelFilter;
      if (searchText.trim()) filter.search = searchText.trim();

      const result = await window.electronAPI.getLogEntries(filter);
      setEntries(result || []);
    } catch {
      // 静默处理
    }
  }, [levelFilter, searchText]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await window.electronAPI.getLogStats();
      setStats(result);
    } catch {
      // 静默处理
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchEntries(), fetchStats()]).finally(() => setLoading(false));
  }, [fetchEntries, fetchStats]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => {
      fetchEntries();
      fetchStats();
    }, 3000);
    return () => clearInterval(interval);
  }, [autoRefresh, fetchEntries, fetchStats]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [entries]);

  const handleSearchChange = useCallback((value: string) => {
    setSearchText(value);
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    searchTimerRef.current = setTimeout(() => {
      // 延迟触发搜索
    }, 300);
  }, []);

  const handleClear = useCallback(async () => {
    try {
      await window.electronAPI.clearLogFile();
      setEntries([]);
      fetchStats();
    } catch {
      // 静默处理
    }
  }, [fetchStats]);

  const handleExport = useCallback(async () => {
    try {
      await window.electronAPI.exportLogs();
    } catch {
      // 静默处理
    }
  }, []);

  const getLevelClass = (level: string): string => {
    switch (level) {
      case 'DEBUG': return styles.levelDebug;
      case 'INFO': return styles.levelInfo;
      case 'WARN': return styles.levelWarn;
      case 'ERROR': return styles.levelError;
      default: return '';
    }
  };

  const getEntryClass = (level: string): string => {
    switch (level) {
      case 'ERROR': return styles.logEntryError;
      case 'WARN': return styles.logEntryWarn;
      default: return '';
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>日志查看器</span>
        <div className={styles.toolbar}>
          <select
            className={styles.filterSelect}
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value as LevelFilter)}
          >
            {LEVEL_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt === 'ALL' ? '全部级别' : opt}</option>
            ))}
          </select>
          <input
            className={styles.searchInput}
            type="text"
            placeholder="搜索日志..."
            value={searchText}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
          <button
            className={styles.actionButton}
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? '暂停刷新' : '自动刷新'}
          </button>
          <button className={styles.actionButton} onClick={handleExport}>
            导出
          </button>
          <button className={styles.dangerButton} onClick={handleClear}>
            清空
          </button>
        </div>
      </div>

      {stats && (
        <div className={styles.stats}>
          <span className={styles.statItem}>
            <span className={`${styles.statDot} ${styles.statDotDebug}`} />
            DEBUG: {stats.levelCounts.DEBUG || 0}
          </span>
          <span className={styles.statItem}>
            <span className={`${styles.statDot} ${styles.statDotInfo}`} />
            INFO: {stats.levelCounts.INFO || 0}
          </span>
          <span className={styles.statItem}>
            <span className={`${styles.statDot} ${styles.statDotWarn}`} />
            WARN: {stats.levelCounts.WARN || 0}
          </span>
          <span className={styles.statItem}>
            <span className={`${styles.statDot} ${styles.statDotError}`} />
            ERROR: {stats.levelCounts.ERROR || 0}
          </span>
          <span className={styles.statItem}>
            文件: {formatFileSize(stats.logFileSize)}
          </span>
        </div>
      )}

      {loading ? (
        <div className={styles.loadingState}>加载中...</div>
      ) : entries.length === 0 ? (
        <div className={styles.emptyState}>暂无日志记录</div>
      ) : (
        <div className={styles.logList} ref={listRef}>
          {entries.map((entry, idx) => (
            <div key={idx} className={`${styles.logEntry} ${getEntryClass(entry.level)}`}>
              <span className={styles.logTimestamp}>{formatTimestamp(entry.timestamp)}</span>
              <span className={`${styles.logLevel} ${getLevelClass(entry.level)}`}>{entry.level}</span>
              <span className={styles.logModule}>{entry.module}</span>
              <span className={styles.logMessage}>{entry.message}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default LogViewer;
