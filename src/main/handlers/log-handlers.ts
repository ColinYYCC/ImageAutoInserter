/**
 * 日志 IPC 处理器
 *
 * 处理前端请求的日志查询、统计等操作
 */

import { ipcMain } from 'electron';
import { getLogSystem } from '../logging';
import { LogLevel, LogFilter, LogStats, LogEntry } from '../logging/log-types';
import { logInfo } from '../utils/logging';

export function registerLogHandlers(): void {
  logInfo('[LogHandlers] 注册日志 IPC 处理器...');

  ipcMain.handle('log:query', async (_, filter: LogFilter): Promise<{ logs: LogEntry[]; total: number }> => {
    try {
      const logSystem = getLogSystem();
      const logs = await logSystem.queryLogs(filter);
      return { logs, total: logs.length };
    } catch (error) {
      console.error('[LogHandlers] 查询日志失败:', error);
      return { logs: [], total: 0 };
    }
  });

  ipcMain.handle('log:getRecent', async (_, count: number = 100): Promise<LogEntry[]> => {
    try {
      const logSystem = getLogSystem();
      return await logSystem.getRecentLogs(count);
    } catch (error) {
      console.error('[LogHandlers] 获取最近日志失败:', error);
      return [];
    }
  });

  ipcMain.handle('log:search', async (_, keyword: string): Promise<LogEntry[]> => {
    try {
      const logSystem = getLogSystem();
      return await logSystem.searchLogs(keyword);
    } catch (error) {
      console.error('[LogHandlers] 搜索日志失败:', error);
      return [];
    }
  });

  ipcMain.handle('log:getStats', async (): Promise<LogStats | null> => {
    try {
      const logSystem = getLogSystem();
      return await logSystem.getStats();
    } catch (error) {
      console.error('[LogHandlers] 获取日志统计失败:', error);
      return null;
    }
  });

  ipcMain.handle('log:getModules', async (): Promise<{ modules: string[] }> => {
    try {
      const logSystem = getLogSystem();
      const stats = await logSystem.getStats();
      const modules = Object.keys(stats.byModule);
      return { modules };
    } catch (error) {
      console.error('[LogHandlers] 获取模块列表失败:', error);
      return { modules: [] };
    }
  });

  ipcMain.handle('log:analyze', async (_, startTime?: number, endTime?: number) => {
    try {
      const logSystem = getLogSystem();
      return await logSystem.analyzeLogs(startTime, endTime);
    } catch (error) {
      console.error('[LogHandlers] 分析日志失败:', error);
      return null;
    }
  });

  ipcMain.handle('log:getErrorTrends', async (_, startTime: number, endTime: number) => {
    try {
      const logSystem = getLogSystem();
      return await logSystem.getErrorTrends(startTime, endTime);
    } catch (error) {
      console.error('[LogHandlers] 获取错误趋势失败:', error);
      return [];
    }
  });

  ipcMain.handle('log:detectAnomalies', async (_, startTime?: number, endTime?: number) => {
    try {
      const logSystem = getLogSystem();
      return await logSystem.detectAnomalies(startTime, endTime);
    } catch (error) {
      console.error('[LogHandlers] 检测异常失败:', error);
      return [];
    }
  });

  ipcMain.handle('log:getFiles', async () => {
    try {
      const logSystem = getLogSystem();
      return await logSystem.getLogFiles();
    } catch (error) {
      console.error('[LogHandlers] 获取日志文件列表失败:', error);
      return [];
    }
  });

  ipcMain.handle('log:deleteOld', async (_, daysToKeep: number): Promise<number> => {
    try {
      const logSystem = getLogSystem();
      return await logSystem.deleteOldLogs(daysToKeep);
    } catch (error) {
      console.error('[LogHandlers] 删除旧日志失败:', error);
      return 0;
    }
  });

  ipcMain.handle('log:setLevel', async (_, level: LogLevel): Promise<void> => {
    try {
      const logSystem = getLogSystem();
      logSystem.setMinLevel(level);
    } catch (error) {
      console.error('[LogHandlers] 设置日志级别失败:', error);
    }
  });

  ipcMain.handle('log:getLevel', async (): Promise<LogLevel> => {
    try {
      const logSystem = getLogSystem();
      return logSystem.getMinLevel();
    } catch (error) {
      console.error('[LogHandlers] 获取日志级别失败:', error);
      return LogLevel.INFO;
    }
  });

  ipcMain.handle('log:flush', async (): Promise<void> => {
    try {
      const logSystem = getLogSystem();
      await logSystem.flush();
    } catch (error) {
      console.error('[LogHandlers] 刷新日志失败:', error);
    }
  });

  ipcMain.handle('log:getConfig', async () => {
    try {
      return {
        minLevel: getLogSystem().getMinLevel(),
      };
    } catch (error) {
      console.error('[LogHandlers] 获取日志配置失败:', error);
      return { minLevel: LogLevel.INFO };
    }
  });

  logInfo('[LogHandlers] 日志 IPC 处理器注册完成');
}
