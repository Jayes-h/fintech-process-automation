import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Row, Col, Card, Button, Spinner, Alert } from 'react-bootstrap';
import { useBrand } from '../contexts/BrandContext';
import { misAgentApi, macrosApi } from '../services/agentsApi';
import './BrandStatsPage.css';

const BrandStatsPage = () => {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const { selectedBrand } = useBrand();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({
    misFilesCount: 0,
    macrosFilesCount: 0,
    totalAgents: 0,
    totalPortals: 0
  });

  useEffect(() => {
    loadStats();
  }, [brandId, selectedBrand]);

  const loadStats = async () => {
    try {
      setLoading(true);
      setError(null);

      const brandName = selectedBrand?.name || '';

      try {
        const misResponse = await misAgentApi.listMISAgents(brandName);
        setStats(prev => ({
          ...prev,
          misFilesCount: misResponse.data?.length || 0
        }));
      } catch (err) {
        console.warn('Could not load MIS stats:', err);
      }

      try {
        const macrosResponse = await macrosApi.getFilesByBrand(brandName);
        setStats(prev => ({
          ...prev,
          macrosFilesCount: macrosResponse.count || macrosResponse.data?.length || 0
        }));
      } catch (err) {
        console.warn('Could not load Macros stats:', err);
      }

      try {
        setStats(prev => ({
          ...prev,
          totalAgents: 0
        }));
      } catch (err) {
        console.warn('Could not load agents stats:', err);
      }

      try {
        setStats(prev => ({
          ...prev,
          totalPortals: 0
        }));
      } catch (err) {
        console.warn('Could not load portals stats:', err);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load statistics');
      console.error('Error loading stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading statistics...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="brand-stats-page py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-2">Brand Statistics</h1>
          <p className="text-muted">
            {selectedBrand ? `Statistics for ${selectedBrand.name}` : 'Brand Statistics'}
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

      <Row className="g-4 mb-4">
        <Col xs={12} sm={6} md={3}>
          <Card className="stat-card text-center">
            <Card.Body>
              <h2 className="stat-number">{stats.misFilesCount}</h2>
              <p className="stat-label text-muted mb-0">MIS Files</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="stat-card text-center">
            <Card.Body>
              <h2 className="stat-number">{stats.macrosFilesCount}</h2>
              <p className="stat-label text-muted mb-0">Macros Files</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="stat-card text-center">
            <Card.Body>
              <h2 className="stat-number">{stats.totalAgents}</h2>
              <p className="stat-label text-muted mb-0">Assigned Agents</p>
            </Card.Body>
          </Card>
        </Col>
        <Col xs={12} sm={6} md={3}>
          <Card className="stat-card text-center">
            <Card.Body>
              <h2 className="stat-number">{stats.totalPortals}</h2>
              <p className="stat-label text-muted mb-0">Seller Portals</p>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <Card>
        <Card.Header>
          <h5 className="mb-0">Analytics & Reports</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="info" className="text-center">
            <p className="mb-0">
              Charts and detailed analytics will be available here in a future update.
            </p>
            <p className="mb-0 mt-2">
              <small>This section will include:</small>
            </p>
            <ul className="text-start mt-2" style={{ display: 'inline-block' }}>
              <li>MIS files over time</li>
              <li>Macros processing trends</li>
              <li>Agent usage statistics</li>
              <li>Portal performance metrics</li>
            </ul>
          </Alert>
        </Card.Body>
      </Card>

      <Card className="mt-4">
        <Card.Header>
          <h5 className="mb-0">Filter by Date Range</h5>
        </Card.Header>
        <Card.Body>
          <Alert variant="secondary" className="text-center mb-0">
            Date range filtering will be available here in a future update.
          </Alert>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default BrandStatsPage;
