/**
 * 简化版异步验证器
 * 专注于解决大文件卡顿问题，最小化改动
 */
import { FileInfo, ValidationResult, ProcessingOptions } from './types';

export type ValidationFunction = (
  fileInfo: FileInfo,
  options?: ProcessingOptions
) => Promise<ValidationResult>;

export interface AsyncValidatorConfig {
  delay?: number;
  timeout?: number;
  onStart?: () => void;
  onComplete?: (result: ValidationResult) => void;
  onError?: (error: Error) => void;
}

/**
 * 简化版异步验证器
 * 特点：
 * 1. 零依赖，易于理解和维护
 * 2. 自动处理超时和取消
 * 3. 支持进度回调
 * 4. 与现有代码完全兼容
 */
export class SimpleAsyncValidator {
  private abortController: AbortController | null = null;
  private timeoutId: NodeJS.Timeout | null = null;

  /**
   * 执行异步验证
   * @param fileInfo 文件信息
   * @param validateFn 验证函数
   * @param config 配置选项
   * @returns 验证结果
   */
  async validate(
    fileInfo: FileInfo,
    validateFn: ValidationFunction,
    config: AsyncValidatorConfig = {}
  ): Promise<ValidationResult> {
    const { delay = 0, timeout = 30000, onStart, onComplete, onError } = config;

    // 取消之前的验证
    this.cancel();

    // 创建新的 AbortController
    this.abortController = new AbortController();

    return new Promise((resolve) => {
      // 延迟执行，让 UI 先渲染
      const executeValidation = async () => {
        onStart?.();

        try {
          // 设置超时
          this.timeoutId = setTimeout(() => {
            this.cancel();
            const timeoutResult: ValidationResult = {
              valid: false,
              error: `验证超时（${timeout}ms）`,
              resolution: '文件可能过大，请尝试选择更小的文件'
            };
            onComplete?.(timeoutResult);
            resolve(timeoutResult);
          }, timeout);

          // 执行验证
          const result = await validateFn(fileInfo, {
            abortSignal: this.abortController?.signal
          });

          // 清除超时
          if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
          }

          onComplete?.(result);
          resolve(result);
        } catch (error) {
          // 清除超时
          if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
          }

          const errorResult: ValidationResult = {
            valid: false,
            error: error instanceof Error ? error.message : '验证失败',
            resolution: '请检查文件是否损坏或格式是否正确'
          };

          onError?.(error instanceof Error ? error : new Error(String(error)));
          onComplete?.(errorResult);
          resolve(errorResult);
        }
      };

      // 延迟执行
      if (delay > 0) {
        setTimeout(executeValidation, delay);
      } else {
        // 使用 setImmediate 让出主线程
        setImmediate(executeValidation);
      }
    });
  }

  /**
   * 取消当前验证
   */
  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }

    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }

  /**
   * 检查是否正在验证
   */
  isValidating(): boolean {
    return this.abortController !== null && !this.abortController.signal.aborted;
  }
}

// 导出单例实例
export const simpleAsyncValidator = new SimpleAsyncValidator();
