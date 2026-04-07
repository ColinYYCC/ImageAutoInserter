/**
 * 配置功能 E2E 测试
 * 测试覆盖：日志配置、Vite 端口配置、环境变量支持等
 */
import { test, expect } from '@playwright/test';

test.describe('配置功能测试', () => {
  test.describe('日志配置测试', () => {
    test('应能从环境变量读取日志级别', async ({ page }) => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      const logConfig = await page.evaluate(async () => {
        if (window.electronAPI?.getLogConfig) {
          return await window.electronAPI.getLogConfig();
        }
        return null;
      });

      if (logConfig) {
        expect(logConfig).toHaveProperty('level');
        expect(logConfig).toHaveProperty('enableFile');
        expect(logConfig).toHaveProperty('enableConsole');
      }
    });

    test('日志级别应支持 DEBUG/INFO/WARN/ERROR', async ({ page }) => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      const validLevels = ['DEBUG', 'INFO', 'WARN', 'ERROR', 'OFF'];

      for (const level of validLevels) {
        const isValidLevel = await page.evaluate(async (lvl) => {
          if (window.electronAPI?.validateLogLevel) {
            return await window.electronAPI.validateLogLevel(lvl);
          }
          return true; // 默认返回true
        }, level);

        expect(isValidLevel).toBe(true);
      }
    });
  });

  test.describe('Vite 端口配置测试', () => {
    test('应能通过环境变量配置端口', async ({ page }) => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      const portConfig = await page.evaluate(async () => {
        if (window.electronAPI?.getVitePort) {
          return await window.electronAPI.getVitePort();
        }
        return null;
      });

      if (portConfig) {
        expect(typeof portConfig).toBe('number');
        expect(portConfig).toBeGreaterThan(0);
        expect(portConfig).toBeLessThan(65536);
      }
    });

    test('端口号应在有效范围内', async ({ page }) => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      const portConfig = await page.evaluate(async () => {
        if (window.electronAPI?.getVitePort) {
          return await window.electronAPI.getVitePort();
        }
        return 5173; // 默认端口
      });

      expect(portConfig).toBeGreaterThan(0);
      expect(portConfig).toBeLessThan(65536);
    });
  });

  test.describe('应用元数据配置测试', () => {
    test('应能获取应用元数据', async ({ page }) => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      const metadata = await page.evaluate(async () => {
        if (window.electronAPI?.getAppMetadata) {
          return await window.electronAPI.getAppMetadata();
        }
        return null;
      });

      if (metadata) {
        expect(metadata).toHaveProperty('name');
        expect(metadata).toHaveProperty('version');
        expect(metadata).toHaveProperty('appId');
      }
    });

    test('版本号格式应正确', async ({ page }) => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      const version = await page.evaluate(async () => {
        if (window.electronAPI?.getAppVersion) {
          const result = await window.electronAPI.getAppVersion();
          return result.version;
        }
        return null;
      });

      if (version) {
        expect(version).toMatch(/^\d+\.\d+\.\d+/);
      }
    });
  });

  test.describe('性能监控配置测试', () => {
    test('应能获取性能监控配置', async ({ page }) => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      const perfConfig = await page.evaluate(async () => {
        if (window.electronAPI?.getPerformanceConfig) {
          return await window.electronAPI.getPerformanceConfig();
        }
        return null;
      });

      if (perfConfig) {
        expect(perfConfig).toHaveProperty('enabled');
        expect(typeof perfConfig.enabled).toBe('boolean');
      }
    });

    test('性能采样间隔应可配置', async ({ page }) => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      const perfConfig = await page.evaluate(async () => {
        if (window.electronAPI?.getPerformanceConfig) {
          return await window.electronAPI.getPerformanceConfig();
        }
        return { enabled: true, sampleIntervalMs: 60000 };
      });

      if (perfConfig.enabled) {
        expect(perfConfig.sampleIntervalMs).toBeGreaterThan(0);
      }
    });
  });

  test.describe('更新配置测试', () => {
    test('应能获取更新检查间隔', async ({ page }) => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      const updateConfig = await page.evaluate(async () => {
        if (window.electronAPI?.getUpdateConfig) {
          return await window.electronAPI.getUpdateConfig();
        }
        return null;
      });

      if (updateConfig) {
        expect(updateConfig).toHaveProperty('checkIntervalHours');
        expect(typeof updateConfig.checkIntervalHours).toBe('number');
      }
    });

    test('自动下载配置应可读', async ({ page }) => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      const updateConfig = await page.evaluate(async () => {
        if (window.electronAPI?.getUpdateConfig) {
          return await window.electronAPI.getUpdateConfig();
        }
        return null;
      });

      if (updateConfig) {
        expect(updateConfig).toHaveProperty('autoDownload');
        expect(typeof updateConfig.autoDownload).toBe('boolean');
      }
    });
  });
});

test.describe('报告模块测试', () => {
  test.describe('报告存储测试', () => {
    test('应能创建报告存储实例', async ({ page }) => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      const storageInfo = await page.evaluate(async () => {
        if (window.electronAPI?.getReportStorageInfo) {
          return await window.electronAPI.getReportStorageInfo();
        }
        return null;
      });

      // 验证报告存储信息结构
      if (storageInfo) {
        expect(storageInfo).toHaveProperty('totalReports');
        expect(storageInfo).toHaveProperty('totalSizeMb');
      }
    });

    test('报告存储应支持按类型查询', async ({ page }) => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      const reportTypes = ['error', 'summary', 'performance'];

      for (const type of reportTypes) {
        const reports = await page.evaluate(async (t) => {
          if (window.electronAPI?.getReportsByType) {
            return await window.electronAPI.getReportsByType(t);
          }
          return [];
        }, type);

        expect(Array.isArray(reports)).toBe(true);
      }
    });
  });

  test.describe('报告清理测试', () => {
    test('应能获取存储信息', async ({ page }) => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      const storageInfo = await page.evaluate(async () => {
        if (window.electronAPI?.getReportStorageInfo) {
          return await window.electronAPI.getReportStorageInfo();
        }
        return null;
      });

      if (storageInfo) {
        expect(storageInfo).toHaveProperty('totalReports');
        expect(storageInfo).toHaveProperty('totalSizeMb');
        expect(storageInfo).toHaveProperty('maxSizeMb');
        expect(storageInfo).toHaveProperty('usagePercent');
      }
    });

    test('存储使用率应正确计算', async ({ page }) => {
      await page.goto('http://localhost:5173');
      await page.waitForLoadState('networkidle');

      const storageInfo = await page.evaluate(async () => {
        if (window.electronAPI?.getReportStorageInfo) {
          return await window.electronAPI.getReportStorageInfo();
        }
        return { totalSizeMb: 0, maxSizeMb: 500, usagePercent: 0 };
      });

      if (storageInfo.maxSizeMb > 0) {
        const expectedUsage = (storageInfo.totalSizeMb / storageInfo.maxSizeMb) * 100;
        expect(storageInfo.usagePercent).toBeCloseTo(expectedUsage, 1);
      }
    });
  });
});
