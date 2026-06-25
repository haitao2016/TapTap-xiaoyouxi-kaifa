import { Routes, Route } from 'react-router-dom';
import { AppLayout } from './layouts/AppLayout';
import { DashboardPage } from './pages/DashboardPage';
import { EditorPage } from './pages/EditorPage';
import { DebugPage } from './pages/DebugPage';
import { MonitorPage } from './pages/MonitorPage';
import { BuildPage } from './pages/BuildPage';
import { DocsPage } from './pages/DocsPage';
import { PluginsPage } from './pages/PluginsPage';
import { SettingsPage } from './pages/SettingsPage';
import { AIAssistantPage } from './pages/AIAssistantPage';
import { GitPage } from './pages/GitPage';
import { CollabPage } from './pages/CollabPage';
import { TapTapPage } from './pages/TapTapPage';
import { MarketPage } from './pages/MarketPage';

export function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="editor" element={<EditorPage />} />
        <Route path="debug" element={<DebugPage />} />
        <Route path="monitor" element={<MonitorPage />} />
        <Route path="build" element={<BuildPage />} />
        <Route path="docs" element={<DocsPage />} />
        <Route path="plugins" element={<PluginsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="ai" element={<AIAssistantPage />} />
        <Route path="git" element={<GitPage />} />
        <Route path="collab" element={<CollabPage />} />
        <Route path="taptap" element={<TapTapPage />} />
        <Route path="market" element={<MarketPage />} />
      </Route>
    </Routes>
  );
}
