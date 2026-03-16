import { useState, useEffect, useCallback } from 'react';

export type ThemeId = 
  | 'brutalist-raw' 
  | 'art-deco' 
  | 'neo-brutalism' 
  | 'organic-nature' 
  | 'cyberpunk-neon'
  | 'warm-greige-desktop';

export interface ThemeInfo {
  id: ThemeId;
  name: string;
  description: string;
  previewColor: string;
  previewGradient: string;
}

export const THEMES: ThemeInfo[] = [
  {
    id: 'brutalist-raw',
    name: '粗野主义',
    description: '原始工业，未经修饰',
    previewColor: '#FF4500',
    previewGradient: 'linear-gradient(135deg, #FF4500, #1a1a1a)',
  },
  {
    id: 'art-deco',
    name: '装饰艺术',
    description: '1920年代奢华几何',
    previewColor: '#D4AF37',
    previewGradient: 'linear-gradient(135deg, #D4AF37, #1A1A2E)',
  },
  {
    id: 'neo-brutalism',
    name: '新粗野主义',
    description: '大胆色块，活泼有趣',
    previewColor: '#FFE135',
    previewGradient: 'linear-gradient(135deg, #FFE135, #FF6B9D)',
  },
  {
    id: 'organic-nature',
    name: '有机自然',
    description: '柔和曲线，自然纹理',
    previewColor: '#7D9D7A',
    previewGradient: 'linear-gradient(135deg, #7D9D7A, #C4A484)',
  },
  {
    id: 'cyberpunk-neon',
    name: '赛博朋克',
    description: '霓虹灯效，未来科技',
    previewColor: '#00FFF0',
    previewGradient: 'linear-gradient(135deg, #00FFF0, #FF00FF)',
  },
  {
    id: 'warm-greige-desktop',
    name: '暖灰桌面',
    description: '温暖优雅，桌面优化',
    previewColor: '#8B7355',
    previewGradient: 'linear-gradient(135deg, #8B7355, #A69076)',
  },
];

const STORAGE_KEY = 'imageautoinserter-theme';

/**
 * 主题切换 Hook
 * 管理应用主题状态，支持本地存储持久化
 */
export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeId>(() => {
    if (typeof window === 'undefined') return 'warm-greige-desktop';
    
    const stored = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
    if (stored && THEMES.some(t => t.id === stored)) {
      return stored;
    }
    return 'warm-greige-desktop';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', currentTheme);
    localStorage.setItem(STORAGE_KEY, currentTheme);
  }, [currentTheme]);

  const setTheme = useCallback((themeId: ThemeId) => {
    setCurrentTheme(themeId);
  }, []);

  const cycleTheme = useCallback(() => {
    const currentIndex = THEMES.findIndex(t => t.id === currentTheme);
    const nextIndex = (currentIndex + 1) % THEMES.length;
    setCurrentTheme(THEMES[nextIndex].id);
  }, [currentTheme]);

  const getThemeInfo = useCallback((themeId: ThemeId): ThemeInfo | undefined => {
    return THEMES.find(t => t.id === themeId);
  }, []);

  return {
    currentTheme,
    setTheme,
    cycleTheme,
    getThemeInfo,
    themes: THEMES,
  };
}
