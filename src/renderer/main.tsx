import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
// import App from './App.simple';  // 测试版本
import { AppStateProvider } from './hooks/useAppState';
import './components/shared/styles/base.css';

// 调试日志
console.log('=== Renderer Debug Info ===');
console.log('window.electronAPI exists:', !!window.electronAPI);
console.log('React version:', React.version);

const rootElement = document.getElementById('root');
console.log('Root element exists:', !!rootElement);

if (rootElement) {
  console.log('✅ Creating React root...');
  
  const root = ReactDOM.createRoot(rootElement);
  
  console.log('✅ Rendering App...');
  
  root.render(
    <React.StrictMode>
      <AppStateProvider>
        <App />
      </AppStateProvider>
    </React.StrictMode>
  );
  
  console.log('✅ App rendered successfully');
} else {
  console.error('❌ Root element not found!');
}
