import { logInfo, logDebug } from './logger';
import { APP_CONFIG } from '../shared/app-config';

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
}

export interface PerformanceReport {
  appStartTime: number;
  memoryUsage: NodeJS.MemoryUsage;
  pythonProcessStart?: number;
  lastGC?: number;
  metrics: PerformanceMetric[];
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: Map<string, PerformanceMetric[]> = new Map();
  private startTime: number;
  private pythonProcessStartTime: number | null = null;
  private memorySnapshots: NodeJS.MemoryUsage[] = [];
  private isEnabled: boolean;
  private sampleTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.isEnabled = APP_CONFIG.performance.enabled;
    this.startTime = Date.now();
    this.recordMetric('app', 'start_time', 0, 'ms');
    logInfo(`[Performance] Monitor initialized at ${this.startTime}, enabled: ${this.isEnabled}`);

    if (this.isEnabled) {
      this.startPeriodicSampling();
    }
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  static resetInstance(): void {
    if (PerformanceMonitor.instance?.sampleTimer) {
      clearInterval(PerformanceMonitor.instance.sampleTimer);
    }
    PerformanceMonitor.instance = undefined as any;
  }

  private startPeriodicSampling(): void {
    const intervalMs = APP_CONFIG.performance.sampleIntervalMs;

    this.sampleTimer = setInterval(() => {
      this.recordMemory('system', 'periodic_sample');
    }, intervalMs);
  }

  recordMetric(module: string, name: string, value: number, unit: string = ''): void {
    if (!this.isEnabled) return;

    const key = `${module}:${name}`;
    const metric: PerformanceMetric = {
      name,
      value,
      unit,
      timestamp: Date.now(),
    };

    if (!this.metrics.has(key)) {
      this.metrics.set(key, []);
    }

    this.metrics.get(key)!.push(metric);

    if (this.metrics.get(key)!.length > 100) {
      this.metrics.get(key)!.shift();
    }

    logDebug(`[Performance] ${module}:${name} = ${value}${unit}`);
  }

  startTimer(module: string, name: string): () => void {
    if (!this.isEnabled) return () => {};
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.recordMetric(module, name, duration, 'ms');
    };
  }

  recordMemory(module: string, operation: string): void {
    if (!this.isEnabled || !process.memoryUsage) return;

    const mem = process.memoryUsage();
    this.memorySnapshots.push(mem);

    this.recordMetric(module, `${operation}_rss`, mem.rss / 1024 / 1024, 'MB');
    this.recordMetric(module, `${operation}_heapTotal`, mem.heapTotal / 1024 / 1024, 'MB');
    this.recordMetric(module, `${operation}_heapUsed`, mem.heapUsed / 1024 / 1024, 'MB');
    this.recordMetric(module, `${operation}_external`, mem.external / 1024 / 1024, 'MB');

    logDebug(`[Performance] ${module}:${operation} memory - RSS: ${(mem.rss / 1024 / 1024).toFixed(2)}MB, Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(2)}MB`);
  }

  startPythonProcess(): void {
    this.pythonProcessStartTime = Date.now();
    this.recordMetric('python', 'process_start', this.pythonProcessStartTime, 'timestamp');
    logInfo(`[Performance] Python process started at ${this.pythonProcessStartTime}`);
  }

  endPythonProcess(): number | null {
    if (!this.pythonProcessStartTime) return null;
    const duration = Date.now() - this.pythonProcessStartTime;
    this.recordMetric('python', 'process_duration', duration, 'ms');
    this.pythonProcessStartTime = null;
    logInfo(`[Performance] Python process completed in ${duration}ms`);
    return duration;
  }

  getMetric(module: string, name: string): PerformanceMetric[] {
    return this.metrics.get(`${module}:${name}`) || [];
  }

  getAllMetrics(): Map<string, PerformanceMetric[]> {
    return new Map(this.metrics);
  }

  getAverageMetric(module: string, name: string): number {
    const metrics = this.getMetric(module, name);
    if (metrics.length === 0) return 0;
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  getReport(): PerformanceReport {
    return {
      appStartTime: Date.now() - this.startTime,
      memoryUsage: process.memoryUsage(),
      pythonProcessStart: this.pythonProcessStartTime || undefined,
      metrics: Array.from(this.metrics.values()).flat(),
    };
  }

  clearMetrics(): void {
    this.metrics.clear();
    logDebug('[Performance] Metrics cleared');
  }

  getMemoryTrend(): { rss: number[]; heapUsed: number[] } {
    return {
      rss: this.memorySnapshots.map(m => m.rss / 1024 / 1024),
      heapUsed: this.memorySnapshots.map(m => m.heapUsed / 1024 / 1024),
    };
  }

  logStartupSummary(): void {
    const report = this.getReport();
    const mem = report.memoryUsage;

    logInfo(`[Performance] ========== Startup Summary ==========`);
    logInfo(`[Performance] App startup time: ${report.appStartTime}ms`);
    logInfo(`[Performance] Memory usage: RSS=${(mem.rss / 1024 / 1024).toFixed(2)}MB, Heap=${(mem.heapUsed / 1024 / 1024).toFixed(2)}MB/${(mem.heapTotal / 1024 / 1024).toFixed(2)}MB`);
    logInfo(`[Performance] =====================================`);
  }
}

export const performanceMonitor = PerformanceMonitor.getInstance();
export default performanceMonitor;
