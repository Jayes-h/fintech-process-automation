import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { BrandProvider } from './contexts/BrandContext';
import Layout from './components/Layout/Header';
import BrandSelectionPage from './pages/BrandSelectionPage';
import BrandDashboard from './pages/BrandDashboard';
import InventoryPage from './pages/InventoryPage';
import BrandPortalsPage from './pages/BrandPortalsPage';
import BrandStatsPage from './pages/BrandStatsPage';
import AgentDashboard from './pages/AgentDashboard';
import MISGeneratorPage from './pages/MISGeneratorPage';
import MacrosGeneratorPage from './pages/MacrosGeneratorPage';
import Dashboard from './pages/Dashboard';

function App() {
  return (
    <Router>
      <BrandProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<BrandSelectionPage />} />
            <Route path="/brand/:brandId" element={<BrandDashboard />} />
            <Route path="/brand/:brandId/inventory" element={<InventoryPage />} />
            <Route path="/brand/:brandId/portals" element={<BrandPortalsPage />} />
            <Route path="/brand/:brandId/stats" element={<BrandStatsPage />} />
            <Route path="/brand/:brandId/agent/:agentId" element={<AgentDashboard />} />
            <Route path="/brand/:brandId/mis-agent/:agentId" element={<MISGeneratorPage />} />
            <Route path="/brand/:brandId/macros-agent/:agentId" element={<MacrosGeneratorPage />} />
            {/* Legacy routes for backward compatibility */}
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/agent/:agentId" element={<AgentDashboard />} />
            <Route path="/mis-agent/:agentId" element={<MISGeneratorPage />} />
            <Route path="/macros-agent/:agentId" element={<MacrosGeneratorPage />} />
          </Routes>
        </Layout>
      </BrandProvider>
    </Router>
  );
}

export default App;
