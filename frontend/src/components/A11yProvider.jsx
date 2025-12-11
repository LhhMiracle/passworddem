import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

const A11yContext = createContext(null);

/**
 * 无障碍访问提供者
 * 提供屏幕阅读器友好的公告和焦点管理
 */
export function A11yProvider({ children }) {
  const [announcement, setAnnouncement] = useState('');
  const [politeness, setPoliteness] = useState('polite');
  const announcementRef = useRef(null);

  // 发送公告到屏幕阅读器
  const announce = useCallback((message, level = 'polite') => {
    setPoliteness(level);
    // 清除后重新设置，确保相同消息也能被读出
    setAnnouncement('');
    requestAnimationFrame(() => {
      setAnnouncement(message);
    });
  }, []);

  // 公告成功消息
  const announceSuccess = useCallback((message) => {
    announce(`成功: ${message}`, 'polite');
  }, [announce]);

  // 公告错误消息
  const announceError = useCallback((message) => {
    announce(`错误: ${message}`, 'assertive');
  }, [announce]);

  // 公告加载状态
  const announceLoading = useCallback((isLoading, action = '操作') => {
    if (isLoading) {
      announce(`正在${action}，请稍候...`, 'polite');
    }
  }, [announce]);

  // 焦点管理 - 移动焦点到指定元素
  const focusElement = useCallback((selector) => {
    requestAnimationFrame(() => {
      const element = typeof selector === 'string'
        ? document.querySelector(selector)
        : selector;
      if (element) {
        element.focus();
      }
    });
  }, []);

  // 焦点管理 - 移动焦点到主内容区
  const focusMainContent = useCallback(() => {
    focusElement('#main-content, [role="main"], main');
  }, [focusElement]);

  // 跳过链接处理
  const handleSkipLink = useCallback((e) => {
    e.preventDefault();
    const target = document.querySelector(e.target.hash);
    if (target) {
      target.setAttribute('tabindex', '-1');
      target.focus();
      target.removeAttribute('tabindex');
    }
  }, []);

  const value = {
    announce,
    announceSuccess,
    announceError,
    announceLoading,
    focusElement,
    focusMainContent,
    handleSkipLink
  };

  return (
    <A11yContext.Provider value={value}>
      {children}
      {/* 屏幕阅读器公告区域 */}
      <div
        ref={announcementRef}
        role="status"
        aria-live={politeness}
        aria-atomic="true"
        className="sr-only"
        style={{
          position: 'absolute',
          width: '1px',
          height: '1px',
          padding: '0',
          margin: '-1px',
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: '0'
        }}
      >
        {announcement}
      </div>
    </A11yContext.Provider>
  );
}

/**
 * 使用无障碍访问功能的 Hook
 */
export function useA11y() {
  const context = useContext(A11yContext);
  if (!context) {
    // 返回空操作函数，避免组件崩溃
    return {
      announce: () => {},
      announceSuccess: () => {},
      announceError: () => {},
      announceLoading: () => {},
      focusElement: () => {},
      focusMainContent: () => {},
      handleSkipLink: () => {}
    };
  }
  return context;
}

/**
 * 键盘导航 Hook
 * 用于列表和网格的键盘导航
 */
export function useKeyboardNavigation(items, options = {}) {
  const {
    onSelect,
    orientation = 'vertical',
    wrap = true
  } = options;

  const [focusIndex, setFocusIndex] = useState(0);

  const handleKeyDown = useCallback((e) => {
    const isVertical = orientation === 'vertical';
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';

    switch (e.key) {
      case prevKey:
        e.preventDefault();
        setFocusIndex(prev => {
          const newIndex = prev - 1;
          if (newIndex < 0) {
            return wrap ? items.length - 1 : 0;
          }
          return newIndex;
        });
        break;
      case nextKey:
        e.preventDefault();
        setFocusIndex(prev => {
          const newIndex = prev + 1;
          if (newIndex >= items.length) {
            return wrap ? 0 : items.length - 1;
          }
          return newIndex;
        });
        break;
      case 'Home':
        e.preventDefault();
        setFocusIndex(0);
        break;
      case 'End':
        e.preventDefault();
        setFocusIndex(items.length - 1);
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (onSelect && items[focusIndex]) {
          onSelect(items[focusIndex], focusIndex);
        }
        break;
      default:
        break;
    }
  }, [items, orientation, wrap, onSelect, focusIndex]);

  return {
    focusIndex,
    setFocusIndex,
    handleKeyDown,
    getItemProps: (index) => ({
      tabIndex: index === focusIndex ? 0 : -1,
      'aria-selected': index === focusIndex,
      onFocus: () => setFocusIndex(index)
    })
  };
}

/**
 * 减少动画 Hook
 * 尊重用户的减少动画偏好
 */
export function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return prefersReducedMotion;
}

export default A11yProvider;
