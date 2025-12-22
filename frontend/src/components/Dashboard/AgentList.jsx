import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { agentsApi } from '../../services/agentsApi';
import './AgentList.css';

const AgentList = () => {
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadAgents();
  }, []);

  const loadAgents = async () => {
    try {
      setLoading(true);
      const response = await agentsApi.getAllAgents();
      setAgents(response.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load agents');
      console.error('Error loading agents:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAgentClick = (agentId) => {
    navigate(`/agent/${agentId}`);
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading agents...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert variant="danger">{error}</Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="agent-list-container">
      <div className="page-header mb-4">
        <h1 className="page-title">Agents Dashboard</h1>
        <p className="page-subtitle">Select an agent to get started</p>
      </div>

      {agents.length === 0 ? (
        <Alert variant="info" className="text-center">
          No agents available. Please create an agent first.
        </Alert>
      ) : (
        <Row className="g-4">
          {agents.map((agent) => (
            <Col key={agent.agentId} xs={12} sm={6} md={4} lg={3}>
              <Card
                className="agent-card h-100"
                onClick={() => handleAgentClick(agent.agentId)}
              >
                <Card.Body>
                  <div className="agent-icon mb-3">
                    <span>🤖</span>
                  </div>
                  <Card.Title className="agent-name">{agent.agentName}</Card.Title>
                  <Card.Text className="agent-description">
                    {agent.agentDescription || 'No description available'}
                  </Card.Text>
                </Card.Body>
                <Card.Footer className="text-muted">
                  <small>Click to open</small>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default AgentList;









