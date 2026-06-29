import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store/app-store';
import { projectManager } from '@tapdev/core';

export function useElectronMenuActions() {
  const navigate = useNavigate();
  const { openProject, currentProject, saveFile, activeTabId, startDebug, startBuild } = useAppStore();

  useEffect(() => {
    if (!window.electronAPI?.onMenuAction) return;

    window.electronAPI.onMenuAction(async (action, data) => {
      switch (action) {
        case 'menu:new-project':
          // For simplicity, we just navigate to dashboard and let user create there
          // or we could show a modal. 
          navigate('/');
          break;
        case 'menu:open-project':
          if (typeof data === 'string') {
            await openProject(data);
            navigate('/editor');
          } else {
            // If data is not provided, the main process already showed a dialog
            // and should have passed the path. But if we want to trigger it from here:
            const path = await window.electronAPI!.openDirectory();
            if (path) {
              await openProject(path);
              navigate('/editor');
            }
          }
          break;
        case 'menu:save':
          if (activeTabId) {
            saveFile(activeTabId);
          }
          break;
        case 'menu:start-debug':
          if (currentProject) {
            startDebug();
            navigate('/debug');
          }
          break;
        case 'menu:start-build':
          if (currentProject) {
            startBuild();
            navigate('/build');
          }
          break;
        case 'menu:about':
          alert('TapDev Studio v0.2.0\n跨平台 TapTap 小游戏开发工具');
          break;
      }
    });
  }, [navigate, openProject, currentProject, saveFile, activeTabId, startDebug, startBuild]);
}

export function ElectronHandler() {
  useElectronMenuActions();
  return null;
}
