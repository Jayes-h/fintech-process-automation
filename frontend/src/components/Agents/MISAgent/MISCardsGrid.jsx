import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Button, Spinner, Alert, Form } from 'react-bootstrap';
import { misAgentApi, misDataApi } from '../../../services/agentsApi';
import MISFileCard from './MISFileCard';
import './MISCardsGrid.css';

const MISCardsGrid = ({ onViewFile, onCreateNew, selectedBrand, onBrandChange }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [brandFilter, setBrandFilter] = useState(selectedBrand || '');
  const [allBrands, setAllBrands] = useState([]);

  useEffect(() => {
    loadFiles();
  }, [brandFilter]);

  useEffect(() => {
    if (selectedBrand) {
      setBrandFilter(selectedBrand);
    }
  }, [selectedBrand]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try to load from new mis_data table first, fallback to mis_agent table
      let filesData = [];
      try {
        const filters = brandFilter ? { brand: brandFilter } : {};
        const response = await misDataApi.getAll(filters);
        filesData = response.data || [];
        
        // Map mis_data structure to card format
        filesData = filesData.map(item => ({
          id: item.id,
          agentId: item.agent_id || item.id,
          brand: item.brand,
          createdBy: item.createdBy,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt,
          name: item.description || 'MIS Report',
          description: item.description
        }));
      } catch (dataErr) {
        // Fallback to mis_agent table if mis_data table doesn't exist yet
        console.warn('mis_data table not available, using mis_agent:', dataErr);
        const response = await misAgentApi.listMISAgents(brandFilter || null);
        filesData = response.data || [];
      }
      
      setFiles(filesData);
      
      // Extract unique brands
      const brands = [...new Set(filesData.map(f => f.brand).filter(Boolean))];
      setAllBrands(brands);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load files');
      console.error('Error loading files:', err);
      setFiles([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandFilterChange = (newBrand) => {
    setBrandFilter(newBrand);
    if (onBrandChange) {
      onBrandChange(newBrand);
    }
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading MIS files...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="mis-cards-grid">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>MIS Files</h2>
        <Button variant="primary" size="lg" onClick={onCreateNew}>
          + Create New MIS
        </Button>
      </div>

      {allBrands.length > 0 && (
        <div className="mb-4">
          <Form.Group>
            <Form.Label>Filter by Brand</Form.Label>
            <Form.Select
              value={brandFilter}
              onChange={(e) => handleBrandFilterChange(e.target.value)}
            >
              <option value="">All Brands</option>
              {allBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </Form.Select>
          </Form.Group>
        </div>
      )}

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {files.length === 0 ? (
        <Alert variant="info" className="text-center">
          <h5>No MIS files found</h5>
          <p>Click "Create New MIS" to generate your first MIS report.</p>
        </Alert>
      ) : (
        <Row className="g-4">
          {files.map((file) => (
            <Col key={file.agentId} xs={12} sm={6} md={4} lg={3}>
              <MISFileCard 
                misFile={file} 
                onView={onViewFile}
              />
            </Col>
          ))}
        </Row>
      )}
    </Container>
  );
};

export default MISCardsGrid;

