export interface AppMetadata {
  name: string;
  appId: string;
  version: string;
  description: string;
  author: string;
  license: string;
}

export interface GithubConfig {
  owner: string;
  repo: string;
}

export interface AppConfig {
  metadata: AppMetadata;
  github: GithubConfig;
  update: {
    checkIntervalHours: number;
    autoDownload: boolean;
  };
  performance: {
    enabled: boolean;
    sampleIntervalMs: number;
  };
}

function getPackageVersion(): string {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_VERSION) {
    return import.meta.env.VITE_APP_VERSION;
  }
  if (typeof process !== 'undefined' && process.env?.npm_package_version) {
    return process.env.npm_package_version;
  }
  return '1.0.7';
}

function getPackageMetadata(): Partial<AppMetadata> {
  return {
    name: 'imageautoinserter',
    description: '**图片自动插入工具** - 根据商品编码自动将图片嵌入 Excel 表格',
    author: '',
    license: 'ISC',
  };
}

export const APP_CONFIG: AppConfig = {
  metadata: {
    get name() {
      if (typeof process !== 'undefined' && process.env?.APP_NAME) {
        return process.env.APP_NAME;
      }
      return getPackageMetadata().name || 'ImageAutoInserter';
    },
    get appId() {
      if (typeof process !== 'undefined' && process.env?.APP_ID) {
        return process.env.APP_ID;
      }
      return 'com.imageautoinserter.app';
    },
    get version() {
      return getPackageVersion();
    },
    get description() {
      if (typeof process !== 'undefined' && process.env?.APP_DESCRIPTION) {
        return process.env.APP_DESCRIPTION;
      }
      return getPackageMetadata().description || '图片自动插入工具';
    },
    get author() {
      if (typeof process !== 'undefined' && process.env?.APP_AUTHOR) {
        return process.env.APP_AUTHOR;
      }
      return getPackageMetadata().author || '';
    },
    get license() {
      if (typeof process !== 'undefined' && process.env?.APP_LICENSE) {
        return process.env.APP_LICENSE;
      }
      return getPackageMetadata().license || 'ISC';
    },
  },

  github: {
    get owner() {
      if (typeof process !== 'undefined' && process.env?.GITHUB_OWNER) {
        return process.env.GITHUB_OWNER;
      }
      return 'ColinYYCC';
    },
    get repo() {
      if (typeof process !== 'undefined' && process.env?.GITHUB_REPO) {
        return process.env.GITHUB_REPO;
      }
      return 'ImageAutoInserter';
    },
  },

  update: {
    get checkIntervalHours() {
      if (typeof process !== 'undefined' && process.env?.UPDATE_CHECK_INTERVAL_HOURS) {
        return parseInt(process.env.UPDATE_CHECK_INTERVAL_HOURS, 10);
      }
      return 24;
    },
    get autoDownload() {
      if (typeof process !== 'undefined' && process.env?.UPDATE_AUTO_DOWNLOAD) {
        return process.env.UPDATE_AUTO_DOWNLOAD === 'true';
      }
      return false;
    },
  },

  performance: {
    get enabled() {
      if (typeof process !== 'undefined' && process.env?.PERFORMANCE_ENABLED) {
        return process.env.PERFORMANCE_ENABLED !== 'false';
      }
      return true;
    },
    get sampleIntervalMs() {
      if (typeof process !== 'undefined' && process.env?.PERFORMANCE_SAMPLE_INTERVAL_MS) {
        return parseInt(process.env.PERFORMANCE_SAMPLE_INTERVAL_MS, 10);
      }
      return 60000;
    },
  },
};

export function getAppVersion(): string {
  return APP_CONFIG.metadata.version;
}

export function getGithubConfig(): GithubConfig {
  return {
    owner: APP_CONFIG.github.owner,
    repo: APP_CONFIG.github.repo,
  };
}

export function getAppMetadata(): AppMetadata {
  return {
    name: APP_CONFIG.metadata.name,
    appId: APP_CONFIG.metadata.appId,
    version: APP_CONFIG.metadata.version,
    description: APP_CONFIG.metadata.description,
    author: APP_CONFIG.metadata.author,
    license: APP_CONFIG.metadata.license,
  };
}

export type { AppConfig as AppConfigType };
