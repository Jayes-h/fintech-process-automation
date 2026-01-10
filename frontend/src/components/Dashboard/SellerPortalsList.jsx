import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Button, Modal, Form, Badge } from 'react-bootstrap';
import { sellerPortalsApi } from '../../services/agentsApi';
import './AgentList.css';

const SellerPortalsList = () => {
  const [sellerPortals, setSellerPortals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingPortal, setEditingPortal] = useState(null);
  const [formData, setFormData] = useState({ name: '' });

  useEffect(() => {
    loadSellerPortals();
  }, []);

  const loadSellerPortals = async () => {
    try {
      setLoading(true);
      const response = await sellerPortalsApi.getAllSellerPortals();
      setSellerPortals(response.data || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load seller portals');
      console.error('Error loading seller portals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleShowModal = (portal = null) => {
    setEditingPortal(portal);
    setFormData({ name: portal ? portal.name : '' });
    setShowModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingPortal(null);
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
        setError('Seller portal name is required');
        return;
      }

      if (editingPortal) {
        await sellerPortalsApi.updateSellerPortal(editingPortal.id, formData.name);
        setSuccess('Seller portal updated successfully!');
      } else {
        await sellerPortalsApi.createSellerPortal(formData.name);
        setSuccess('Seller portal created successfully!');
      }

      handleCloseModal();
      loadSellerPortals();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save seller portal');
      console.error('Error saving seller portal:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this seller portal?')) {
      return;
    }

    try {
      await sellerPortalsApi.deleteSellerPortal(id);
      setSuccess('Seller portal deleted successfully!');
      loadSellerPortals();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete seller portal');
      console.error('Error deleting seller portal:', err);
    }
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading seller portals...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="agent-list-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Seller Portals</h1>
          <p className="page-subtitle">Manage your seller portals</p>
        </div>
        <Button variant="primary" onClick={() => handleShowModal()}>
          ➕ Add New Seller Portal
        </Button>
      </div>

      {error && (
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert variant="success" dismissible onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      )}

      {sellerPortals.length === 0 ? (
        <Alert variant="info" className="text-center">
          No seller portals available. Click "Add New Seller Portal" to create one.
        </Alert>
      ) : (
        <Row className="g-4">
          {sellerPortals.map((portal) => (
            <Col key={portal.id} xs={12} sm={6} md={4} lg={3}>
              <Card className="agent-card h-100">
                <Card.Body>
                  <div className="agent-icon mb-3">
                    <span>🛒</span>
                  </div>
                  <Card.Title className="agent-name">{portal.name}</Card.Title>
                  <Badge bg="secondary" className="mt-2">
                    Created: {new Date(portal.createdAt).toLocaleDateString()}
                  </Badge>
                </Card.Body>
                <Card.Footer className="d-flex gap-2">
                  <Button
                    variant="outline-primary"
                    size="sm"
                    onClick={() => handleShowModal(portal)}
                    className="flex-fill"
                  >
                    ✏️ Edit
                  </Button>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleDelete(portal.id)}
                    className="flex-fill"
                  >
                    🗑️ Delete
                  </Button>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{editingPortal ? 'Edit Seller Portal' : 'Add New Seller Portal'}</Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
              <Form.Label>Seller Portal Name</Form.Label>
              <Form.Control
                type="text"
                placeholder="Enter seller portal name (e.g., Amazon, Flipkart, Blinkit)"
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
              {editingPortal ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default SellerPortalsList;










