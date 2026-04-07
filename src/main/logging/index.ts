/**
 * 集中式日志管理系统
 *
 * 提供统一的日志收集、存储、查询和分析功能
 */

export { LogCollector } from './log-collector';
export { LogStore } from './log-store';
export { LogQuery } from './log-query';
export { LogAnalyzer } from './log-analyzer';
export { LogSystem, createLogSystem, getLogSystem } from './log-system';

export type { LogLevel, LogSource, LogEntry, LogFilter, LogStats, LogModule } from './log-types';
export { DEFAULT_LOG_MODULES, LOG_LEVEL_COLORS, LOG_LEVEL_NAMES } from './log-types';
