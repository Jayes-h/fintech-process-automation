import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout/Header';
import Dashboard from './pages/Dashboard';
import AgentDashboard from './pages/AgentDashboard';
import MISGeneratorPage from './pages/MISGeneratorPage';
import MacrosGeneratorPage from './pages/MacrosGeneratorPage';

function App() {
  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/agent/:agentId" element={<AgentDashboard />} />
          <Route path="/mis-agent/:agentId" element={<MISGeneratorPage />} />
          <Route path="/macros-agent/:agentId" element={<MacrosGeneratorPage />} />
        </Routes>
      </Layout>
    </Router>
  );
}

export default App;






