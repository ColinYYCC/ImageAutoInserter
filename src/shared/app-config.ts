import * as path from 'path';
import * as fs from 'fs';

let cachedVersion: string = '1.0.0';

function getPackageVersion(): string {
  if (cachedVersion !== '1.0.0') {
    return cachedVersion;
  }

  try {
    const packageJsonPath = path.join(__dirname, '../../package.json');
    if (fs.existsSync(packageJsonPath)) {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      if (packageJson.version) {
        cachedVersion = packageJson.version;
        return cachedVersion;
      }
    }
  } catch {
  }

  return cachedVersion;
}

export interface AppConfig {
  name: string;
  appId: string;
  version: string;
  github: {
    owner: string;
    repo: string;
  };
}

export const APP_CONFIG: AppConfig = {
  name: 'ImageAutoInserter',
  appId: 'com.imageautoinserter.app',

  get version() {
    return getPackageVersion();
  },

  github: {
    get owner() {
      return process.env.GITHUB_OWNER || 'ColinYYCC';
    },
    get repo() {
      return process.env.GITHUB_REPO || 'ImageAutoInserter';
    },
  },
};

export function getAppVersion(): string {
  return APP_CONFIG.version;
}

export function getGithubConfig(): { owner: string; repo: string } {
  return {
    owner: APP_CONFIG.github.owner,
    repo: APP_CONFIG.github.repo,
  };
}

export type { AppConfig as AppConfigType };
