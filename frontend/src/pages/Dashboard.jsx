import React, { useState } from 'react';
import { Container, Tabs, Tab } from 'react-bootstrap';
import AgentList from '../components/Dashboard/AgentList';
import BrandsList from '../components/Dashboard/BrandsList';
import SellerPortalsList from '../components/Dashboard/SellerPortalsList';

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState('agents');

  return (
    <Container fluid className="py-4">
      <Tabs
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-4"
        fill
      >
        <Tab eventKey="agents" title="🤖 Agents">
          <AgentList />
        </Tab>
        <Tab eventKey="brands" title="🏷️ Brands">
          <BrandsList />
        </Tab>
        <Tab eventKey="seller-portals" title="🛒 Seller Portals">
          <SellerPortalsList />
        </Tab>
      </Tabs>
    </Container>
  );
};

export default Dashboard;









