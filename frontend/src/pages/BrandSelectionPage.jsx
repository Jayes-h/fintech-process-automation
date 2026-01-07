import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Button, Modal, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { brandsApi } from '../services/agentsApi';
import { useBrand } from '../contexts/BrandContext';
import './BrandSelectionPage.css';

const BrandSelectionPage = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '' });
  const navigate = useNavigate();
  const { setSelectedBrand } = useBrand();

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      setLoading(true);
      const response = await brandsApi.getAllBrands();
      setBrands(response.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load brands');
      console.error('Error loading brands:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBrandClick = (brand) => {
    setSelectedBrand(brand);
    navigate(`/brand/${brand.id}`);
  };

  const handleShowModal = () => {
    setFormData({ name: '' });
    setShowModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setFormData({ name: '' });
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);

      if (!formData.name.trim()) {
        setError('Brand name is required');
        return;
      }

      const response = await brandsApi.createBrand(formData.name);
      const newBrand = response.data;
      setSuccess('Brand created successfully!');
      handleCloseModal();
      loadBrands();
      
      if (newBrand) {
        setTimeout(() => {
          handleBrandClick(newBrand);
        }, 500);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create brand');
      console.error('Error creating brand:', err);
    }
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading brands...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="brand-selection-container py-5">
      <div className="text-center mb-5">
        <h1 className="display-4 mb-3">Select a Brand</h1>
        <p className="lead text-muted">Choose a brand to start working with</p>
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

      <div className="d-flex justify-content-end mb-4">
        <Button variant="primary" onClick={handleShowModal}>
          ➕ Add New Brand
        </Button>
      </div>

      {brands.length === 0 ? (
        <Alert variant="info" className="text-center">
          No brands available. Click "Add New Brand" to create one.
        </Alert>
      ) : (
        <Row className="g-4">
          {brands.map((brand) => {
            // Get image from localStorage or brand.imageUrl
            const storedImage = localStorage.getItem(`brand_image_${brand.id}`);
            let brandImage = storedImage || brand.imageUrl || '';
            
            // If imageUrl is a relative path (starts with /uploads), prepend backend URL
            if (brandImage && brandImage.startsWith('/uploads') && !storedImage) {
              const backendUrl = process.env.REACT_APP_API_URL 
                ? process.env.REACT_APP_API_URL.replace('/api', '')
                : 'http://localhost:5000';
              brandImage = `${backendUrl}${brandImage}`;
            }
            
            return (
              <Col key={brand.id} xs={12} sm={6} md={4} lg={3}>
                <Card
                  className="brand-card h-100"
                  onClick={() => handleBrandClick(brand)}
                  style={{ cursor: 'pointer' }}
                >
                  <Card.Body>
                    <div className="brand-icon mb-3 text-center">
                      {brandImage ? (
                        <img 
                          src={brandImage} 
                          alt={brand.name}
                          className="brand-profile-image"
                          onError={(e) => {
                            // Fallback to placeholder if image fails to load
                            e.target.style.display = 'none';
                            if (e.target.nextSibling) {
                              e.target.nextSibling.style.display = 'flex';
                            }
                          }}
                        />
                      ) : null}
                      <div 
                        className="brand-profile-placeholder"
                        style={{ display: brandImage ? 'none' : 'flex' }}
                      >
                        <span>{brand.name.charAt(0).toUpperCase()}</span>
                      </div>
                    </div>
                    <Card.Title className="text-center brand-name">{brand.name}</Card.Title>
                    <Card.Text className="text-center text-muted small">
                      Created: {new Date(brand.createdAt).toLocaleDateString()}
                    </Card.Text>
                  </Card.Body>
                  <Card.Footer className="text-center bg-primary text-white">
                    <small>Click to select</small>
                  </Card.Footer>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}

      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Add New Brand</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Brand Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter brand name"
                value={formData.name}
                onChange={(e) => setFormData({ name: e.target.value })}
                required
                autoFocus
              />
            </Form.Group>
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              Create Brand
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default BrandSelectionPage;
