import { logWarn, logError } from './logger';

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  retryableErrors: string[];
}

export interface RetryResult<T> {
  success: boolean;
  result?: T;
  error?: Error;
  attempts: number;
  totalTimeMs: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
  retryableErrors: [
    'ECONNRESET',
    'ETIMEDOUT',
    'ECONNREFUSED',
    'ENOTFOUND',
    'EAI_AGAIN',
    'EPIPE',
    'EBUSY',
  ],
};

export function isRetryableError(error: Error): boolean {
  // Node.js 系统错误的错误码类型
  interface NodeError extends Error {
    code?: string;
  }
  const nodeError = error as NodeError;
  const errorCode = nodeError.code;
  const errorMessage = error.message.toLowerCase();

  if (errorCode && DEFAULT_RETRY_CONFIG.retryableErrors.includes(errorCode)) {
    return true;
  }

  const retryablePatterns = [
    'temporary failure',
    'try again',
    'connection reset',
    'timeout',
    'network error',
    'econnrefused',
    'eai_again',
  ];

  for (const pattern of retryablePatterns) {
    if (errorMessage.includes(pattern)) {
      return true;
    }
  }

  return false;
}

export function calculateDelay(attempt: number, config: RetryConfig): number {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelayMs);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config: Partial<RetryConfig> = {}
): Promise<RetryResult<T>> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const startTime = Date.now();
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= fullConfig.maxAttempts; attempt++) {
    try {
      const result = await fn();
      return {
        success: true,
        result,
        attempts: attempt,
        totalTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryableError(lastError)) {
        return {
          success: false,
          error: lastError,
          attempts: attempt,
          totalTimeMs: Date.now() - startTime,
        };
      }

      if (attempt < fullConfig.maxAttempts) {
        const delay = calculateDelay(attempt, fullConfig);
        await sleep(delay);
      }
    }
  }

  return {
    success: false,
    error: lastError,
    attempts: fullConfig.maxAttempts,
    totalTimeMs: Date.now() - startTime,
  };
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export class ErrorRecoveryManager {
  private static instance: ErrorRecoveryManager;
  private recoveryStrategies: Map<string, () => Promise<boolean>> = new Map();

  static getInstance(): ErrorRecoveryManager {
    if (!ErrorRecoveryManager.instance) {
      ErrorRecoveryManager.instance = new ErrorRecoveryManager();
    }
    return ErrorRecoveryManager.instance;
  }

  registerStrategy(errorType: string, strategy: () => Promise<boolean>): void {
    this.recoveryStrategies.set(errorType, strategy);
  }

  async recover(errorType: string): Promise<boolean> {
    const strategy = this.recoveryStrategies.get(errorType);
    if (!strategy) {
      logWarn(`[ErrorRecovery] No recovery strategy for error type: ${errorType}`);
      return false;
    }

    try {
      return await strategy();
    } catch (e) {
      logError(`[ErrorRecovery] Recovery strategy failed: ${String(e)}`);
      return false;
    }
  }

  clearStrategies(): void {
    this.recoveryStrategies.clear();
  }
}

export interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailureTime: number;
  lastSuccessTime: number;
}

export class CircuitBreaker {
  private state: CircuitBreakerState = {
    isOpen: false,
    failureCount: 0,
    lastFailureTime: 0,
    lastSuccessTime: 0,
  };

  constructor(
    private threshold: number = 5,
    private timeoutMs: number = 60000
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state.isOpen) {
      const now = Date.now();
      if (now - this.state.lastFailureTime < this.timeoutMs) {
        throw new Error('Circuit breaker is OPEN');
      }
      this.state.isOpen = false;
      this.state.failureCount = 0;
    }

    try {
      const result = await fn();
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure();
      throw error;
    }
  }

  private recordSuccess(): void {
    this.state.failureCount = 0;
    this.state.lastSuccessTime = Date.now();
  }

  private recordFailure(): void {
    this.state.failureCount++;
    this.state.lastFailureTime = Date.now();

    if (this.state.failureCount >= this.threshold) {
      this.state.isOpen = true;
    }
  }

  getState(): CircuitBreakerState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      isOpen: false,
      failureCount: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
    };
  }
}

export default {
  withRetry,
  isRetryableError,
  calculateDelay,
  sleep,
  ErrorRecoveryManager,
  CircuitBreaker,
  DEFAULT_RETRY_CONFIG,
};
