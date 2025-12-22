import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Button, Spinner, Alert, Card } from 'react-bootstrap';
import { agentsApi } from '../services/agentsApi';

const AgentDashboard = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();
  const [agent, setAgent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAgent();
  }, [agentId]);

  const loadAgent = async () => {
    try {
      setLoading(true);
      const response = await agentsApi.getAgentById(agentId);
      setAgent(response.data);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load agent');
    } finally {
      setLoading(false);
    }
  };

  const handleSubAgentClick = (subAgentId) => {
    // Navigate to MIS Agent if it's a MIS agent
    if (agent.agentName.toLowerCase().includes('mis')) {
      navigate(`/mis-agent/${subAgentId || agentId}`);
    } else if (agent.agentName.toLowerCase() === 'macros') {
      navigate(`/macros-agent/${subAgentId || agentId}`);
    } else {
      // For other agents, navigate to their specific dashboard
      navigate(`/agent/${subAgentId}`);
    }
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading agent...</p>
      </Container>
    );
  }

  if (error) {
    return (
      <Container>
        <Alert variant="danger">{error}</Alert>
        <Button variant="primary" onClick={() => navigate('/')} className="mt-3">
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  if (!agent) {
    return (
      <Container>
        <Alert variant="warning">Agent not found</Alert>
        <Button variant="primary" onClick={() => navigate('/')} className="mt-3">
          Back to Dashboard
        </Button>
      </Container>
    );
  }

  // If this is a MIS agent, redirect to MIS Generator Page
  if (agent.agentName.toLowerCase().includes('mis')) {
    navigate(`/mis-agent/${agentId}`, { replace: true });
    return null;
  }

  // If this is a macros agent, redirect to Macros Generator Page
  if (agent.agentName.toLowerCase() === 'macros') {
    navigate(`/macros-agent/${agentId}`, { replace: true });
    return null;
  }

  return (
    <Container className="py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-2">{agent.agentName}</h1>
          <p className="text-muted">{agent.agentDescription || 'No description'}</p>
        </div>
        <Button variant="outline-primary" onClick={() => navigate('/')}>
          Back to Dashboard
        </Button>
      </div>

      {agent.subAgentsId && agent.subAgentsId.length > 0 ? (
        <Card>
          <Card.Header>
            <h5 className="mb-0">Sub-Agents</h5>
          </Card.Header>
          <Card.Body>
            <div className="d-grid gap-2">
              {agent.subAgentsId.map((subAgentId, index) => (
                <Button
                  key={index}
                  variant="outline-primary"
                  onClick={() => handleSubAgentClick(subAgentId)}
                >
                  Sub-Agent {index + 1} - {subAgentId}
                </Button>
              ))}
            </div>
          </Card.Body>
        </Card>
      ) : (
        <Alert variant="info">
          No sub-agents available for this agent.
        </Alert>
      )}
    </Container>
  );
};

export default AgentDashboard;






