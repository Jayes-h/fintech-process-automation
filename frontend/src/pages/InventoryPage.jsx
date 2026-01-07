import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Alert, Form, Badge } from 'react-bootstrap';
import { useBrand } from '../contexts/BrandContext';
import { agentsApi, brandsApi } from '../services/agentsApi';
import './InventoryPage.css';

const InventoryPage = () => {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const { selectedBrand } = useBrand();
  const [allAgents, setAllAgents] = useState([]);
  const [brandAgents, setBrandAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadData();
  }, [brandId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const agentsResponse = await agentsApi.getAllAgents();
      setAllAgents(agentsResponse.data || []);

      try {
        const brandAgentsResponse = await brandsApi.getBrandAgents(brandId);
        setBrandAgents(brandAgentsResponse.data || []);
      } catch (err) {
        console.warn('Could not load brand agents:', err);
        setBrandAgents([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load agents');
      console.error('Error loading agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const isAgentAssigned = (agentId) => {
    return brandAgents.some(ba => (ba.agentId || ba.id) === agentId);
  };

  const handleAssignAgent = async (agentId) => {
    try {
      setError(null);
      setSuccess(null);
      await brandsApi.assignAgentToBrand(brandId, agentId);
      setSuccess('Agent assigned successfully!');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign agent');
      console.error('Error assigning agent:', err);
    }
  };

  const handleRemoveAgent = async (agentId) => {
    if (!window.confirm('Are you sure you want to remove this agent from the brand?')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await brandsApi.removeAgentFromBrand(brandId, agentId);
      setSuccess('Agent removed successfully!');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to remove agent');
      console.error('Error removing agent:', err);
    }
  };

  const getFilteredAgents = () => {
    if (filter === 'assigned') {
      return allAgents.filter(agent => isAgentAssigned(agent.agentId || agent.id));
    } else if (filter === 'unassigned') {
      return allAgents.filter(agent => !isAgentAssigned(agent.agentId || agent.id));
    }
    return allAgents;
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading inventory...</p>
      </Container>
    );
  }

  const filteredAgents = getFilteredAgents();

  return (
    <Container fluid className="inventory-page py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-2">Agent Inventory</h1>
          <p className="text-muted">
            {selectedBrand ? `Manage agents for ${selectedBrand.name}` : 'Manage agents'}
          </p>
        </div>
        <Button variant="outline-secondary" onClick={() => navigate(`/brand/${brandId}`)}>
          Back to Dashboard
        </Button>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4">
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)} className="mb-4">
          {success}
        </Alert>
      )}

      <Card className="mb-4">
        <Card.Body>
          <Form.Group>
            <Form.Label><strong>Filter Agents:</strong></Form.Label>
            <div className="btn-group" role="group">
              <Button
                variant={filter === 'all' ? 'primary' : 'outline-primary'}
                onClick={() => setFilter('all')}
              >
                All Agents ({allAgents.length})
              </Button>
              <Button
                variant={filter === 'assigned' ? 'primary' : 'outline-primary'}
                onClick={() => setFilter('assigned')}
              >
                Assigned to Brand ({brandAgents.length})
              </Button>
              <Button
                variant={filter === 'unassigned' ? 'primary' : 'outline-primary'}
                onClick={() => setFilter('unassigned')}
              >
                Unassigned ({allAgents.length - brandAgents.length})
              </Button>
            </div>
          </Form.Group>
        </Card.Body>
      </Card>

      {filteredAgents.length === 0 ? (
        <Alert variant="info" className="text-center">
          {filter === 'assigned' 
            ? 'No agents assigned to this brand yet.'
            : filter === 'unassigned'
            ? 'All agents are assigned to this brand.'
            : 'No agents available.'}
        </Alert>
      ) : (
        <Row className="g-4">
          {filteredAgents.map((agent) => {
            // Always prioritize agentId (required for foreign key constraint)
            // If agentId doesn't exist, use id as fallback
            const agentId = agent.agentId || agent.id;
            const assigned = isAgentAssigned(agentId);
            
            return (
              <Col key={agentId} xs={12} sm={6} md={4} lg={3}>
                <Card className="agent-inventory-card h-100">
                  <Card.Body>
                    <div className="agent-icon mb-3 text-center">
                      <span style={{ fontSize: '2.5rem' }}>🤖</span>
                    </div>
                    <Card.Title className="text-center agent-name">
                      {agent.agentName || agent.name}
                    </Card.Title>
                    <Card.Text className="text-center text-muted small">
                      {agent.agentDescription || agent.description || 'No description'}
                    </Card.Text>
                    {assigned && (
                      <div className="text-center mb-2">
                        <Badge bg="success">Assigned</Badge>
                      </div>
                    )}
                  </Card.Body>
                  <Card.Footer className="text-center">
                    {assigned ? (
                      <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={() => handleRemoveAgent(agentId)}
                        className="w-100"
                      >
                        Remove from Brand
                      </Button>
                    ) : (
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleAssignAgent(agentId)}
                        className="w-100"
                      >
                        Assign to Brand
                      </Button>
                    )}
                  </Card.Footer>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </Container>
  );
};

export default InventoryPage;
