/**
 * 日志查看器组件
 *
 * 提供可视化的日志展示界面，支持多维度筛选和搜索
 */

import React, { useState, useEffect, useCallback } from 'react';
import styled from 'styled-components';
import { createLogger } from '../../shared/logger';

const logger = createLogger('LogViewer');

const LOG_LEVEL_COLORS: Record<string, string> = {
  '0': '#95A5A6',
  '1': '#3498DB',
  '2': '#F39C12',
  '3': '#E74C3C',
};

interface LogEntry {
  id: string;
  timestamp: number;
  datetime: string;
  level: number;
  levelStr: string;
  module: string;
  source: string;
  message: string;
  data?: unknown;
}

interface LogStats {
  total: number;
  byLevel: Record<number, number>;
  byModule: Record<string, number>;
  bySource: Record<string, number>;
  timeRange: { start: number; end: number };
  errorRate: number;
}

const LogViewerContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1e1e1e;
  color: #d4d4d4;
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
`;

const Toolbar = styled.div`
  display: flex;
  gap: 8px;
  padding: 8px 12px;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
  flex-wrap: wrap;
  align-items: center;
`;

const SearchInput = styled.input`
  flex: 1;
  min-width: 200px;
  padding: 4px 8px;
  background: #3c3c3c;
  border: 1px solid #3e3e42;
  color: #d4d4d4;
  border-radius: 3px;

  &:focus {
    outline: none;
    border-color: #007acc;
  }
`;

const Select = styled.select`
  padding: 4px 8px;
  background: #3c3c3c;
  border: 1px solid #3e3e42;
  color: #d4d4d4;
  border-radius: 3px;
  cursor: pointer;

  &:focus {
    outline: none;
    border-color: #007acc;
  }
`;

const Button = styled.button`
  padding: 4px 12px;
  background: #0e639c;
  border: none;
  color: white;
  border-radius: 3px;
  cursor: pointer;

  &:hover {
    background: #1177bb;
  }

  &:disabled {
    background: #3c3c3c;
    cursor: not-allowed;
  }
`;

const StatsBar = styled.div`
  display: flex;
  gap: 16px;
  padding: 6px 12px;
  background: #252526;
  border-bottom: 1px solid #3e3e42;
  font-size: 11px;
`;

const StatItem = styled.span<{ $color?: string }>`
  color: ${props => props.$color || '#d4d4d4'};
`;

const LogList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 4px 0;

  &::-webkit-scrollbar {
    width: 10px;
  }

  &::-webkit-scrollbar-track {
    background: #1e1e1e;
  }

  &::-webkit-scrollbar-thumb {
    background: #424242;
    border-radius: 5px;
  }
`;

const LogEntryRow = styled.div<{ $level: number }>`
  display: flex;
  padding: 2px 12px;
  border-left: 3px solid ${props => LOG_LEVEL_COLORS[String(props.$level)] || '#d4d4d4'};
  background: ${props => props.$level === 3 ? 'rgba(231, 76, 60, 0.1)' : 'transparent'};

  &:hover {
    background: #2a2d2e;
  }
`;

const Timestamp = styled.span`
  color: #858585;
  margin-right: 12px;
  min-width: 180px;
`;

const LevelBadge = styled.span<{ $level: number }>`
  color: ${props => LOG_LEVEL_COLORS[String(props.$level)]};
  font-weight: bold;
  margin-right: 12px;
  min-width: 50px;
`;

const Module = styled.span`
  color: #4ec9b0;
  margin-right: 12px;
  min-width: 100px;
`;

const Message = styled.span`
  flex: 1;
  word-break: break-word;
  white-space: pre-wrap;
`;

const EmptyState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  color: #858585;
`;

const LoadingIndicator = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 20px;
  color: #858585;
`;

interface LogViewerProps {
  maxHeight?: string;
  defaultLevel?: number;
  defaultModule?: string;
  onEntryClick?: (entry: LogEntry) => void;
}

export const LogViewer: React.FC<LogViewerProps> = ({
  maxHeight = '100%',
  defaultLevel,
  defaultModule,
  onEntryClick,
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [stats, setStats] = useState<LogStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [levelFilter, setLevelFilter] = useState<number | 'ALL'>(defaultLevel ?? 'ALL');
  const [moduleFilter, setModuleFilter] = useState<string>(defaultModule ?? 'ALL');
  const [modules, setModules] = useState<string[]>([]);

  const loadLogs = useCallback(async () => {
    setLoading(true);
    try {
      if (window.electronAPI?.getLogs) {
        const result = await window.electronAPI.getLogs({
          level: levelFilter === 'ALL' ? undefined : levelFilter,
          modules: moduleFilter === 'ALL' ? undefined : [moduleFilter],
          searchText: searchText || undefined,
          limit: 500,
        }) as { logs: LogEntry[]; total: number; stats?: LogStats };
        setLogs(result.logs || []);
        setStats(result.stats || null);
      }
    } catch (error) {
      logger.error('Failed to load logs', { error: String(error) });
    } finally {
      setLoading(false);
    }
  }, [levelFilter, moduleFilter, searchText]);

  const loadModules = useCallback(async () => {
    try {
      if (window.electronAPI?.getLogModules) {
        const result = await window.electronAPI.getLogModules() as { modules: string[] };
        setModules(result.modules || []);
      }
    } catch (error) {
      logger.error('Failed to load modules', { error: String(error) });
    }
  }, []);

  useEffect(() => {
    loadLogs();
    loadModules();
    const interval = setInterval(loadLogs, 5000);
    return () => clearInterval(interval);
  }, [loadLogs, loadModules]);

  const filteredLogs = searchText
    ? logs.filter(log =>
        log.message.toLowerCase().includes(searchText.toLowerCase()) ||
        log.module.toLowerCase().includes(searchText.toLowerCase())
      )
    : logs;

  const handleRefresh = () => {
    loadLogs();
  };

  return (
    <LogViewerContainer style={{ maxHeight }}>
      <Toolbar>
        <SearchInput
          type="text"
          placeholder="搜索日志内容..."
          value={searchText}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSearchText(e.target.value)}
        />
        <Select
          value={levelFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setLevelFilter(e.target.value as number | 'ALL')}
        >
          <option value="ALL">所有级别</option>
          <option value={0}>DEBUG</option>
          <option value={1}>INFO</option>
          <option value={2}>WARN</option>
          <option value={3}>ERROR</option>
        </Select>
        <Select
          value={moduleFilter}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setModuleFilter(e.target.value)}
        >
          <option value="ALL">所有模块</option>
          {modules.map(mod => (
            <option key={mod} value={mod}>{mod}</option>
          ))}
        </Select>
        <Button onClick={handleRefresh}>刷新</Button>
      </Toolbar>

      {stats && (
        <StatsBar>
          <StatItem>总日志: {stats.total}</StatItem>
          <StatItem $color={LOG_LEVEL_COLORS['3']}>
            ERROR: {stats.byLevel[3] || 0}
          </StatItem>
          <StatItem $color={LOG_LEVEL_COLORS['2']}>
            WARN: {stats.byLevel[2] || 0}
          </StatItem>
          <StatItem $color={LOG_LEVEL_COLORS['1']}>
            INFO: {stats.byLevel[1] || 0}
          </StatItem>
          <StatItem $color={LOG_LEVEL_COLORS['0']}>
            DEBUG: {stats.byLevel[0] || 0}
          </StatItem>
        </StatsBar>
      )}

      <LogList>
        {loading && logs.length === 0 ? (
          <LoadingIndicator>加载中...</LoadingIndicator>
        ) : filteredLogs.length === 0 ? (
          <EmptyState>暂无日志</EmptyState>
        ) : (
          filteredLogs.map(entry => (
            <LogEntryRow
              key={entry.id}
              $level={entry.level}
              onClick={() => onEntryClick?.(entry)}
            >
              <Timestamp>{entry.datetime}</Timestamp>
              <LevelBadge $level={entry.level}>{entry.levelStr}</LevelBadge>
              <Module>{entry.module}</Module>
              <Message>{entry.message}</Message>
            </LogEntryRow>
          ))
        )}
      </LogList>
    </LogViewerContainer>
  );
};

export default LogViewer;
