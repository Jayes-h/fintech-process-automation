import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Spinner, Alert, Table, Modal, Form, Tabs, Tab } from 'react-bootstrap';
import { useBrand } from '../contexts/BrandContext';
import { brandsApi, sellerPortalsApi, skuApi } from '../services/agentsApi';
import './BrandPortalsPage.css';

const BrandPortalsPage = () => {
  const { brandId } = useParams();
  const navigate = useNavigate();
  const { selectedBrand } = useBrand();
  const [brandPortals, setBrandPortals] = useState([]);
  const [allPortals, setAllPortals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [skuCounts, setSkuCounts] = useState({});
  const [newPortalName, setNewPortalName] = useState('');
  const [creatingPortal, setCreatingPortal] = useState(false);
  const [activeTab, setActiveTab] = useState('create');

  useEffect(() => {
    loadData();
  }, [brandId]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const portalsResponse = await sellerPortalsApi.getAllSellerPortals();
      setAllPortals(portalsResponse.data || portalsResponse || []);

      try {
        const brandPortalsResponse = await brandsApi.getBrandPortals(brandId);
        setBrandPortals(brandPortalsResponse.data || []);
      } catch (err) {
        console.warn('Could not load brand portals:', err);
        setBrandPortals([]);
      }

      await loadSkuCounts();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load portals');
      console.error('Error loading portals:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadSkuCounts = async () => {
    const counts = {};
    for (const portal of brandPortals) {
      try {
        const portalId = portal.sellerPortalId || portal.id;
        const response = await skuApi.getAllSKUs(brandId, portalId);
        counts[portalId] = response.data?.length || 0;
      } catch (err) {
        counts[portal.id || portal.sellerPortalId] = 0;
      }
    }
    setSkuCounts(counts);
  };

  useEffect(() => {
    if (brandPortals.length > 0) {
      loadSkuCounts();
    }
  }, [brandPortals.length]);

  const handleCreateAndAssignPortal = async (e) => {
    e.preventDefault();
    if (!newPortalName.trim()) {
      setError('Portal name is required');
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      setCreatingPortal(true);

      // Create the seller portal
      const createResponse = await sellerPortalsApi.createSellerPortal(newPortalName.trim());
      const newPortal = createResponse.data;

      if (!newPortal || !newPortal.id) {
        throw new Error('Failed to create portal');
      }

      // Automatically assign it to the brand
      await brandsApi.assignPortalToBrand(brandId, newPortal.id);
      
      setSuccess(`Portal "${newPortalName}" created and assigned successfully!`);
      setNewPortalName('');
      setShowAddModal(false);
      setActiveTab('create');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create and assign portal');
      console.error('Error creating portal:', err);
    } finally {
      setCreatingPortal(false);
    }
  };

  const handleAddPortal = async (portalId) => {
    try {
      setError(null);
      setSuccess(null);
      await brandsApi.assignPortalToBrand(brandId, portalId);
      setSuccess('Portal assigned successfully!');
      setShowAddModal(false);
      setActiveTab('create');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to assign portal');
      console.error('Error assigning portal:', err);
    }
  };

  const handleRemovePortal = async (portalId) => {
    if (!window.confirm('Are you sure you want to remove this portal from the brand?')) {
      return;
    }

    try {
      setError(null);
      setSuccess(null);
      await brandsApi.removePortalFromBrand(brandId, portalId);
      setSuccess('Portal removed successfully!');
      loadData();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to remove portal');
      console.error('Error removing portal:', err);
    }
  };

  const getUnassignedPortals = () => {
    const assignedIds = brandPortals.map(p => p.sellerPortalId || p.id);
    return allPortals.filter(p => !assignedIds.includes(p.id));
  };

  if (loading) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading portals...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="brand-portals-page py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-2">Seller Portals</h1>
          <p className="text-muted">
            {selectedBrand ? `Manage seller portals for ${selectedBrand.name}` : 'Manage seller portals'}
          </p>
        </div>
        <div>
          <Button variant="primary" className="me-2" onClick={() => setShowAddModal(true)}>
            Add Portal
          </Button>
          <Button variant="outline-secondary" onClick={() => navigate(`/brand/${brandId}`)}>
            Back to Dashboard
          </Button>
        </div>
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

      <Card>
        <Card.Header>
          <h5 className="mb-0">Assigned Portals</h5>
        </Card.Header>
        <Card.Body>
          {brandPortals.length === 0 ? (
            <Alert variant="info" className="text-center">
              No portals assigned. Click "Add Portal" to assign seller portals to this brand.
            </Alert>
          ) : (
            <Table striped bordered hover responsive>
              <thead>
                <tr>
                  <th>Portal Name</th>
                  <th>SKUs Count</th>
                  <th>Date Added</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {brandPortals.map((portal) => {
                  const portalId = portal.sellerPortalId || portal.id;
                  const portalName = portal.name || portal.sellerPortalName;
                  return (
                    <tr key={portalId}>
                      <td><strong>{portalName}</strong></td>
                      <td>{skuCounts[portalId] || 0}</td>
                      <td>
                        {portal.createdAt 
                          ? new Date(portal.createdAt).toLocaleDateString()
                          : 'N/A'}
                      </td>
                      <td>
                        <Button
                          variant="outline-danger"
                          size="sm"
                          onClick={() => handleRemovePortal(portalId)}
                        >
                          Remove
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      <Modal show={showAddModal} onHide={() => {
        setShowAddModal(false);
        setNewPortalName('');
        setError(null);
        setActiveTab('create');
      }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Add Seller Portal</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs activeKey={activeTab} onSelect={(k) => {
            setActiveTab(k);
            setError(null);
          }} className="mb-3">
            <Tab eventKey="create" title="Create New Portal">
              <Form onSubmit={handleCreateAndAssignPortal}>
                <Form.Group className="mb-3">
                  <Form.Label>Portal Name</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter seller portal name (e.g., Amazon, Flipkart, Myntra)"
                    value={newPortalName}
                    onChange={(e) => setNewPortalName(e.target.value)}
                    required
                    autoFocus
                    disabled={creatingPortal}
                  />
                  <Form.Text className="text-muted">
                    This portal will be created and automatically assigned to {selectedBrand?.name || 'this brand'}.
                  </Form.Text>
                </Form.Group>
                {error && <Alert variant="danger" className="mt-3">{error}</Alert>}
                <div className="d-flex justify-content-end gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => {
                      setShowAddModal(false);
                      setNewPortalName('');
                      setError(null);
                    }}
                    disabled={creatingPortal}
                  >
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={creatingPortal || !newPortalName.trim()}>
                    {creatingPortal ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Creating...
                      </>
                    ) : (
                      'Create & Assign'
                    )}
                  </Button>
                </div>
              </Form>
            </Tab>
            <Tab eventKey="assign" title="Assign Existing Portal">
              {getUnassignedPortals().length === 0 ? (
                <Alert variant="info">
                  All available portals are already assigned to this brand.
                </Alert>
              ) : (
                <>
                  <p className="text-muted mb-3">
                    Select an existing portal to assign to {selectedBrand?.name || 'this brand'}:
                  </p>
                  <div className="list-group">
                    {getUnassignedPortals().map((portal) => (
                      <button
                        key={portal.id}
                        type="button"
                        className="list-group-item list-group-item-action"
                        onClick={() => handleAddPortal(portal.id)}
                      >
                        <strong>{portal.name}</strong>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => {
            setShowAddModal(false);
            setNewPortalName('');
            setError(null);
            setActiveTab('create');
          }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default BrandPortalsPage;
