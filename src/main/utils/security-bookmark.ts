/**
 * Mac 安全书签管理器
 * 用于持久化用户授权的文件夹访问权限
 */

import { app, dialog, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import Store from 'electron-store';

interface BookmarkEntry {
  path: string;
  bookmark: string;
  createdAt: number;
}

interface BookmarkStore {
  bookmarks: Record<string, BookmarkEntry>;
}

const store = new Store<BookmarkStore>({
  name: 'security-bookmarks',
  defaults: {
    bookmarks: {},
  },
});

const activeAccesses = new Set<string>();

export class SecurityBookmarkManager {
  private static instance: SecurityBookmarkManager;

  static getInstance(): SecurityBookmarkManager {
    if (!SecurityBookmarkManager.instance) {
      SecurityBookmarkManager.instance = new SecurityBookmarkManager();
    }
    return SecurityBookmarkManager.instance;
  }

  async requestFolderAccess(folderPath: string): Promise<boolean> {
    const normalizedPath = path.normalize(folderPath);
    
    const existingBookmark = this.getBookmark(normalizedPath);
    if (existingBookmark) {
      const restored = this.restoreAccess(existingBookmark);
      if (restored) {
        return true;
      }
      this.removeBookmark(normalizedPath);
    }

    return false;
  }

  async selectFolderWithBookmark(window?: BrowserWindow): Promise<string | null> {
    const options: Electron.OpenDialogOptions = {
      properties: ['openDirectory', 'createDirectory'],
      securityScopedBookmarks: true,
      message: '请选择需要访问的文件夹',
    };

    const result = window 
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];
    
    if (result.bookmarks && result.bookmarks.length > 0) {
      const bookmark = result.bookmarks[0];
      if (typeof bookmark === 'string') {
        this.saveBookmark(selectedPath, bookmark);
      }
    }

    return selectedPath;
  }

  async selectFileWithBookmark(window?: BrowserWindow): Promise<string | null> {
    const options: Electron.OpenDialogOptions = {
      properties: ['openFile'],
      securityScopedBookmarks: true,
      filters: [
        { name: 'Excel 文件', extensions: ['xlsx', 'xls'] },
        { name: '所有文件', extensions: ['*'] },
      ],
      message: '请选择需要访问的文件',
    };

    const result = window
      ? await dialog.showOpenDialog(window, options)
      : await dialog.showOpenDialog(options);

    if (result.canceled || result.filePaths.length === 0) {
      return null;
    }

    const selectedPath = result.filePaths[0];
    
    if (result.bookmarks && result.bookmarks.length > 0) {
      const bookmark = result.bookmarks[0];
      if (typeof bookmark === 'string') {
        this.saveBookmark(selectedPath, bookmark);
      }
    }

    return selectedPath;
  }

  private saveBookmark(filePath: string, bookmark: string): void {
    const normalizedPath = path.normalize(filePath);
    const bookmarks = store.get('bookmarks') || {};
    
    bookmarks[normalizedPath] = {
      path: normalizedPath,
      bookmark: bookmark,
      createdAt: Date.now(),
    };
    
    store.set('bookmarks', bookmarks);
  }

  private getBookmark(filePath: string): string | null {
    const normalizedPath = path.normalize(filePath);
    const bookmarks = store.get('bookmarks') || {};
    const entry = bookmarks[normalizedPath];
    return entry?.bookmark || null;
  }

  private removeBookmark(filePath: string): void {
    const normalizedPath = path.normalize(filePath);
    const bookmarks = store.get('bookmarks') || {};
    delete bookmarks[normalizedPath];
    store.set('bookmarks', bookmarks);
  }

  private restoreAccess(bookmark: string): boolean {
    try {
      const accessId = app.startAccessingSecurityScopedResource(bookmark);
      if (accessId) {
        activeAccesses.add(bookmark);
        return true;
      }
    } catch (error) {
      console.warn('[SecurityBookmark] 恢复访问权限失败:', error);
    }
    return false;
  }

  stopAllAccesses(): void {
    activeAccesses.clear();
  }

  restoreAllBookmarks(): void {
    const bookmarks = store.get('bookmarks') || {};
    for (const [filePath, entry] of Object.entries(bookmarks)) {
      if (fs.existsSync(filePath)) {
        this.restoreAccess(entry.bookmark);
      } else {
        this.removeBookmark(filePath);
      }
    }
  }

  clearAllBookmarks(): void {
    this.stopAllAccesses();
    store.set('bookmarks', {});
  }
}

export const securityBookmarkManager = SecurityBookmarkManager.getInstance();
