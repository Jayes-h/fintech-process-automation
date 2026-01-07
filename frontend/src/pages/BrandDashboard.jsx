import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Alert, Tabs, Tab, Modal, Form } from 'react-bootstrap';
import { useBrand } from '../contexts/BrandContext';
import { brandsApi, agentsApi, sellerPortalsApi } from '../services/agentsApi';
import './BrandDashboard.css';

const BrandDashboard = () => {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const { selectedBrand, setSelectedBrand } = useBrand();
  const [brand, setBrand] = useState(null);
  const [agents, setAgents] = useState([]);
  const [portals, setPortals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoFormData, setInfoFormData] = useState({
    description: '',
    contactInfo: '',
    settings: ''
  });

  useEffect(() => {
    loadBrandData();
  }, [brandId]);

  useEffect(() => {
    if (brandId && brand && brand.id === brandId) {
      setSelectedBrand(brand);
    }
  }, [brandId, brand, setSelectedBrand]);

  const loadBrandData = async () => {
    try {
      setLoading(true);
      setError(null);

      const brandResponse = await brandsApi.getBrandById(brandId);
      const brandData = brandResponse.data || brandResponse;
      setBrand(brandData);
      setSelectedBrand(brandData);

      if (brandData.description || brandData.contactInfo || brandData.settings) {
        setInfoFormData({
          description: brandData.description || '',
          contactInfo: typeof brandData.contactInfo === 'string' 
            ? brandData.contactInfo 
            : JSON.stringify(brandData.contactInfo || {}, null, 2),
          settings: typeof brandData.settings === 'string'
            ? brandData.settings
            : JSON.stringify(brandData.settings || {}, null, 2)
        });
      }

      try {
        const agentsResponse = await brandsApi.getBrandAgents(brandId);
        setAgents(agentsResponse.data || []);
      } catch (err) {
        console.warn('Could not load brand agents:', err);
        setAgents([]);
      }

      try {
        const portalsResponse = await brandsApi.getBrandPortals(brandId);
        setPortals(portalsResponse.data || []);
      } catch (err) {
        console.warn('Could not load brand portals:', err);
        setPortals([]);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load brand data');
      console.error('Error loading brand data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchBrand = () => {
    navigate('/');
  };

  const handleAgentClick = (agentId) => {
    const agent = agents.find(a => a.agentId === agentId || a.id === agentId);
    if (agent) {
      const agentName = agent.agentName?.toLowerCase() || '';
      if (agentName.includes('mis')) {
        navigate(`/brand/${brandId}/mis-agent/${agentId}`);
      } else if (agentName.includes('macros')) {
        navigate(`/brand/${brandId}/macros-agent/${agentId}`);
      } else {
        navigate(`/brand/${brandId}/agent/${agentId}`);
      }
    }
  };

  const handleAssignAgents = () => {
    navigate(`/brand/${brandId}/inventory`);
  };

  const handleManagePortals = () => {
    navigate(`/brand/${brandId}/portals`);
  };

  const handleSaveInfo = async () => {
    try {
      setError(null);
      let contactInfoParsed = infoFormData.contactInfo;
      let settingsParsed = infoFormData.settings;

      try {
        contactInfoParsed = JSON.parse(infoFormData.contactInfo);
      } catch (e) {
        // Keep as string if not valid JSON
      }

      try {
        settingsParsed = JSON.parse(infoFormData.settings);
      } catch (e) {
        // Keep as string if not valid JSON
      }

      await brandsApi.updateBrandInfo(brandId, {
        description: infoFormData.description,
        contactInfo: contactInfoParsed,
        settings: settingsParsed
      });

      setShowInfoModal(false);
      loadBrandData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save brand information');
    }
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading brand dashboard...</p>
      </Container>
    );
  }

  if (error && !brand) {
    return (
      <Container>
        <Alert variant="danger">{error}</Alert>
        <Button variant="primary" onClick={handleSwitchBrand} className="mt-3">
          Back to Brand Selection
        </Button>
      </Container>
    );
  }

  if (!brand) {
    return (
      <Container>
        <Alert variant="warning">Brand not found</Alert>
        <Button variant="primary" onClick={handleSwitchBrand} className="mt-3">
          Back to Brand Selection
        </Button>
      </Container>
    );
  }

  return (
    <Container fluid className="brand-dashboard py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-2">{brand.name}</h1>
          <p className="text-muted">Brand Dashboard</p>
        </div>
        <Button variant="outline-secondary" onClick={handleSwitchBrand}>
          Switch Brand
        </Button>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)} className="mb-4">
          {error}
        </Alert>
      )}

      <Tabs defaultActiveKey="overview" className="mb-4">
        <Tab eventKey="overview" title="Overview">
          <Row className="g-4">
            <Col xs={12} lg={6}>
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Agents</h5>
                  <Button variant="primary" size="sm" onClick={handleAssignAgents}>
                    Assign Agents
                  </Button>
                </Card.Header>
                <Card.Body>
                  {agents.length === 0 ? (
                    <Alert variant="info">
                      No agents assigned. Click "Assign Agents" to add agents to this brand.
                    </Alert>
                  ) : (
                    <div className="agent-list">
                      {agents.map((agent) => (
                        <Card
                          key={agent.agentId || agent.id}
                          className="mb-2 agent-card"
                          onClick={() => handleAgentClick(agent.agentId || agent.id)}
                          style={{ cursor: 'pointer' }}
                        >
                          <Card.Body className="py-2">
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <strong>{agent.agentName || agent.name}</strong>
                                {agent.agentDescription && (
                                  <p className="mb-0 text-muted small">{agent.agentDescription}</p>
                                )}
                              </div>
                              <span>→</span>
                            </div>
                          </Card.Body>
                        </Card>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12} lg={6}>
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Seller Portals</h5>
                  <Button variant="primary" size="sm" onClick={handleManagePortals}>
                    Manage Portals
                  </Button>
                </Card.Header>
                <Card.Body>
                  {portals.length === 0 ? (
                    <Alert variant="info">
                      No portals assigned. Click "Manage Portals" to add seller portals.
                    </Alert>
                  ) : (
                    <div className="portal-list">
                      {portals.map((portal) => (
                        <div key={portal.id || portal.sellerPortalId} className="mb-2 p-2 border rounded">
                          <strong>{portal.name || portal.sellerPortalName}</strong>
                          {portal.createdAt && (
                            <p className="mb-0 text-muted small">
                              Added: {new Date(portal.createdAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </Card.Body>
              </Card>
            </Col>

            <Col xs={12}>
              <Card>
                <Card.Header className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">Brand Information</h5>
                  <Button variant="outline-primary" size="sm" onClick={() => setShowInfoModal(true)}>
                    Edit Information
                  </Button>
                </Card.Header>
                <Card.Body>
                  <Row>
                    <Col md={6}>
                      <h6>Description</h6>
                      <p className="text-muted">
                        {infoFormData.description || 'No description added'}
                      </p>
                    </Col>
                    <Col md={6}>
                      <h6>Contact Information</h6>
                      <pre className="text-muted small" style={{ whiteSpace: 'pre-wrap' }}>
                        {infoFormData.contactInfo || 'No contact information added'}
                      </pre>
                    </Col>
                  </Row>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Tab>
      </Tabs>

      <Modal show={showInfoModal} onHide={() => setShowInfoModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Edit Brand Information</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Description</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                placeholder="Enter brand description"
                value={infoFormData.description}
                onChange={(e) => setInfoFormData({ ...infoFormData, description: e.target.value })}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Contact Information (JSON format)</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder='{"email": "", "phone": "", "address": ""}'
                value={infoFormData.contactInfo}
                onChange={(e) => setInfoFormData({ ...infoFormData, contactInfo: e.target.value })}
              />
              <Form.Text className="text-muted">
                Enter contact information in JSON format
              </Form.Text>
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Settings (JSON format)</Form.Label>
              <Form.Control
                as="textarea"
                rows={4}
                placeholder='{"key": "value"}'
                value={infoFormData.settings}
                onChange={(e) => setInfoFormData({ ...infoFormData, settings: e.target.value })}
              />
              <Form.Text className="text-muted">
                Enter settings in JSON format
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowInfoModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSaveInfo}>
            Save Changes
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default BrandDashboard;
