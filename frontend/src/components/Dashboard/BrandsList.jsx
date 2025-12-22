import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Button, Modal, Form, Badge, Table } from 'react-bootstrap';
import { brandsApi, skuApi, sellerPortalsApi } from '../../services/agentsApi';
import { validateFileType, validateFileSize } from '../../utils/fileHelpers';
import './AgentList.css';

const BrandsList = () => {
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingBrand, setEditingBrand] = useState(null);
  const [formData, setFormData] = useState({ name: '' });
  const [showSKUModal, setShowSKUModal] = useState(false);
  const [showSKUListModal, setShowSKUListModal] = useState(false);
  const [selectedBrandForSKU, setSelectedBrandForSKU] = useState(null);
  const [skus, setSkus] = useState([]);
  const [loadingSKUs, setLoadingSKUs] = useState(false);
  const [sellerPortals, setSellerPortals] = useState([]);
  const [skuFormData, setSkuFormData] = useState({
    salesPortalId: '',
    salesPortalSku: '',
    tallyNewSku: ''
  });
  const [editingSKU, setEditingSKU] = useState(null);
  const [skuFile, setSkuFile] = useState(null);
  const [uploadingSKUs, setUploadingSKUs] = useState(false);
  const [selectedSalesPortalFilter, setSelectedSalesPortalFilter] = useState('');

  useEffect(() => {
    loadBrands();
    loadSellerPortals();
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

  const handleShowModal = (brand = null) => {
    setEditingBrand(brand);
    setFormData({ name: brand ? brand.name : '' });
    setShowModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingBrand(null);
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

      if (editingBrand) {
        await brandsApi.updateBrand(editingBrand.id, formData.name);
        setSuccess('Brand updated successfully!');
      } else {
        await brandsApi.createBrand(formData.name);
        setSuccess('Brand created successfully!');
      }

      handleCloseModal();
      loadBrands();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save brand');
      console.error('Error saving brand:', err);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this brand?')) {
      return;
    }

    try {
      await brandsApi.deleteBrand(id);
      setSuccess('Brand deleted successfully!');
      loadBrands();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete brand');
      console.error('Error deleting brand:', err);
    }
  };

  const loadSellerPortals = async () => {
    try {
      const response = await sellerPortalsApi.getAllSellerPortals();
      if (response.success) {
        setSellerPortals(response.data || []);
      }
    } catch (err) {
      console.error('Error loading seller portals:', err);
    }
  };

  const handleShowSKUModal = (brand) => {
    setSelectedBrandForSKU(brand);
    setSkuFormData({
      salesPortalId: '',
      salesPortalSku: '',
      tallyNewSku: ''
    });
    setEditingSKU(null);
    setSkuFile(null);
    setShowSKUModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleCloseSKUModal = () => {
    setShowSKUModal(false);
    setSelectedBrandForSKU(null);
    setEditingSKU(null);
    setSkuFile(null);
    setSkuFormData({
      salesPortalId: '',
      salesPortalSku: '',
      tallyNewSku: ''
    });
    setError(null);
    setSuccess(null);
  };

  const handleSKUFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!validateFileType(file)) {
      setError('SKU file must be an Excel file (.xlsx, .xls)');
      return;
    }

    if (!validateFileSize(file, 10)) {
      setError('SKU file size exceeds 10MB limit');
      return;
    }

    setSkuFile(file);
    setError(null);
  };

  const handleShowSKUList = async (brand) => {
    setSelectedBrandForSKU(brand);
    setShowSKUListModal(true);
    await loadSKUs(brand.id);
  };

  const handleCloseSKUListModal = () => {
    setShowSKUListModal(false);
    setSelectedBrandForSKU(null);
    setSkus([]);
    setSelectedSalesPortalFilter('');
  };
  
  // Filter SKUs based on selected seller portal
  const filteredSKUs = selectedSalesPortalFilter
    ? skus.filter(sku => sku.salesPortalId === selectedSalesPortalFilter)
    : skus;

  const loadSKUs = async (brandId) => {
    try {
      setLoadingSKUs(true);
      const response = await skuApi.getSKUsByBrand(brandId);
      if (response.success) {
        setSkus(response.data || []);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load SKUs');
      console.error('Error loading SKUs:', err);
    } finally {
      setLoadingSKUs(false);
    }
  };

  const handleSKUSubmit = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);
      setUploadingSKUs(false);

      if (editingSKU) {
        // For editing, use manual form
        if (!skuFormData.salesPortalSku.trim()) {
          setError('Sales portal SKU is required');
          return;
        }

        if (!skuFormData.tallyNewSku.trim()) {
          setError('Tally new SKU is required');
          return;
        }

        await skuApi.updateSKU(
          editingSKU.id,
          selectedBrandForSKU.id,
          skuFormData.salesPortalId,
          skuFormData.salesPortalSku,
          skuFormData.tallyNewSku
        );
        setSuccess('SKU updated successfully!');
        handleCloseSKUModal();
        if (showSKUListModal) {
          await loadSKUs(selectedBrandForSKU.id);
        }
      } else {
        // For creating new, require file upload
        if (!skuFormData.salesPortalId) {
          setError('Sales portal is required');
          return;
        }

        if (!skuFile) {
          setError('Excel file is required');
          return;
        }

        setUploadingSKUs(true);
        const response = await skuApi.uploadSKUFile(
          selectedBrandForSKU.id,
          skuFormData.salesPortalId,
          skuFile
        );

        if (response.success) {
          setSuccess(
            `Successfully processed ${response.data.created} SKUs! ` +
            `(${response.data.new} new, ${response.data.updated} updated)`
          );
          if (response.data.errors > 0) {
            setError(`Warning: ${response.data.errors} SKUs had errors. Check details in console.`);
            console.log('SKU Upload Errors:', response.data.errorDetails);
          }
          handleCloseSKUModal();
          if (showSKUListModal) {
            await loadSKUs(selectedBrandForSKU.id);
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save SKU');
      console.error('Error saving SKU:', err);
    } finally {
      setUploadingSKUs(false);
    }
  };

  const handleEditSKU = (sku) => {
    setEditingSKU(sku);
    setSkuFormData({
      salesPortalId: sku.salesPortalId,
      salesPortalSku: sku.salesPortalSku,
      tallyNewSku: sku.tallyNewSku
    });
    setShowSKUListModal(false);
    setShowSKUModal(true);
  };

  const handleDeleteSKU = async (id) => {
    if (!window.confirm('Are you sure you want to delete this SKU?')) {
      return;
    }

    try {
      await skuApi.deleteSKU(id);
      setSuccess('SKU deleted successfully!');
      await loadSKUs(selectedBrandForSKU.id);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete SKU');
      console.error('Error deleting SKU:', err);
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
    <Container fluid className="agent-list-container">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="page-title">Brands</h1>
          <p className="page-subtitle">Manage your brands</p>
        </div>
        <Button variant="primary" onClick={() => handleShowModal()}>
          ➕ Add New Brand
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

      {brands.length === 0 ? (
        <Alert variant="info" className="text-center">
          No brands available. Click "Add New Brand" to create one.
        </Alert>
      ) : (
        <Row className="g-4">
          {brands.map((brand) => (
            <Col key={brand.id} xs={12} sm={6} md={4} lg={3}>
              <Card className="agent-card h-100">
                <Card.Body>
                  <div className="agent-icon mb-3">
                    <span>🏷️</span>
                  </div>
                  <Card.Title className="agent-name">{brand.name}</Card.Title>
                  <Badge bg="secondary" className="mt-2">
                    Created: {new Date(brand.createdAt).toLocaleDateString()}
                  </Badge>
                </Card.Body>
                <Card.Footer className="d-flex flex-column gap-2">
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleShowModal(brand)}
                      className="flex-fill"
                    >
                      ✏️ Edit
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(brand.id)}
                      className="flex-fill"
                    >
                      🗑️ Delete
                    </Button>
                  </div>
                  <div className="d-flex gap-2">
                    <Button
                      variant="outline-info"
                      size="sm"
                      onClick={() => handleShowSKUList(brand)}
                      className="flex-fill"
                    >
                      👁️ See SKUs
                    </Button>
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => handleShowSKUModal(brand)}
                      className="flex-fill"
                    >
                      ➕ Create SKU
                    </Button>
                  </div>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      {/* Add/Edit Modal */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{editingBrand ? 'Edit Brand' : 'Add New Brand'}</Modal.Title>
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
              {editingBrand ? 'Update' : 'Create'}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>

      {/* SKU List Modal */}
      <Modal show={showSKUListModal} onHide={handleCloseSKUListModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>SKUs for {selectedBrandForSKU?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingSKUs ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : skus.length === 0 ? (
            <Alert variant="info">No SKUs found for this brand.</Alert>
          ) : (
            <>
              {/* Sales Portal Filter */}
              <div className="mb-3">
                <Form.Group>
                  <Form.Label>
                    <strong>Filter by Sales Portal:</strong>
                  </Form.Label>
                  <Form.Select
                    value={selectedSalesPortalFilter}
                    onChange={(e) => setSelectedSalesPortalFilter(e.target.value)}
                  >
                    <option value="">All Sales Portals</option>
                    {sellerPortals.map((portal) => (
                      <option key={portal.id} value={portal.id}>
                        {portal.name}
                      </option>
                    ))}
                  </Form.Select>
                  {selectedSalesPortalFilter && (
                    <Form.Text className="text-muted">
                      Showing {filteredSKUs.length} of {skus.length} SKU(s)
                    </Form.Text>
                  )}
                </Form.Group>
              </div>

              {filteredSKUs.length === 0 ? (
                <Alert variant="warning">
                  No SKUs found for the selected sales portal.
                </Alert>
              ) : (
                <div className="table-responsive">
                  <Table striped bordered hover responsive>
                    <thead>
                      <tr>
                        <th>Sales Portal</th>
                        <th>Sales Portal SKU</th>
                        <th>Tally New SKU</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSKUs.map((sku) => (
                        <tr key={sku.id}>
                          <td>{sku.salesPortal?.name || 'N/A'}</td>
                          <td>{sku.salesPortalSku}</td>
                          <td>{sku.tallyNewSku}</td>
                          <td>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              onClick={() => handleEditSKU(sku)}
                              className="me-2"
                            >
                              ✏️ Edit
                            </Button>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              onClick={() => handleDeleteSKU(sku.id)}
                            >
                              🗑️ Delete
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseSKUListModal}>
            Close
          </Button>
          {selectedBrandForSKU && (
            <Button variant="success" onClick={() => {
              handleCloseSKUListModal();
              handleShowSKUModal(selectedBrandForSKU);
            }}>
              ➕ Add New SKU
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* Create/Edit SKU Modal */}
      <Modal show={showSKUModal} onHide={handleCloseSKUModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            {editingSKU ? 'Edit SKU' : 'Upload SKU Excel File'} - {selectedBrandForSKU?.name}
          </Modal.Title>
        </Modal.Header>
        <Form onSubmit={handleSKUSubmit}>
          <Modal.Body>
            {error && <Alert variant="danger">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}
            
            {editingSKU ? (
              // Edit mode - show manual form
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Sales Portal</Form.Label>
                  <Form.Select
                    value={skuFormData.salesPortalId}
                    onChange={(e) => setSkuFormData({ ...skuFormData, salesPortalId: e.target.value })}
                    required
                    disabled
                  >
                    <option value={skuFormData.salesPortalId}>
                      {sellerPortals.find(p => p.id === skuFormData.salesPortalId)?.name || 'N/A'}
                    </option>
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Sales Portal SKU</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter sales portal SKU"
                    value={skuFormData.salesPortalSku}
                    onChange={(e) => setSkuFormData({ ...skuFormData, salesPortalSku: e.target.value })}
                    required
                    autoFocus
                  />
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>Tally New SKU</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter tally new SKU"
                    value={skuFormData.tallyNewSku}
                    onChange={(e) => setSkuFormData({ ...skuFormData, tallyNewSku: e.target.value })}
                    required
                  />
                </Form.Group>
              </>
            ) : (
              // Create mode - show file upload
              <>
                <Form.Group className="mb-3">
                  <Form.Label>Sales Portal</Form.Label>
                  <Form.Select
                    value={skuFormData.salesPortalId}
                    onChange={(e) => setSkuFormData({ ...skuFormData, salesPortalId: e.target.value })}
                    required
                  >
                    <option value="">Select Sales Portal</option>
                    {sellerPortals.map((portal) => (
                      <option key={portal.id} value={portal.id}>
                        {portal.name}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
                <Form.Group className="mb-3">
                  <Form.Label>SKU Excel File</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleSKUFileChange}
                    required
                  />
                  <Form.Text className="text-muted">
                    Excel file must have columns: <strong>"sales portal sku"</strong> and <strong>"tally new sku"</strong>
                  </Form.Text>
                  {skuFile && (
                    <Form.Text className="text-success d-block mt-1">
                      Selected: {skuFile.name}
                    </Form.Text>
                  )}
                </Form.Group>
                <Alert variant="info">
                  <strong>File Format:</strong>
                  <ul className="mb-0 mt-2">
                    <li>First row should contain headers: "sales portal sku" and "tally new sku"</li>
                    <li>Each subsequent row should contain the SKU mappings</li>
                    <li>Existing SKUs will be updated, new ones will be created</li>
                  </ul>
                </Alert>
              </>
            )}
          </Modal.Body>
          <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseSKUModal} disabled={uploadingSKUs}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={uploadingSKUs}>
              {uploadingSKUs ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  Uploading...
                </>
              ) : editingSKU ? (
                'Update'
              ) : (
                'Upload & Create SKUs'
              )}
            </Button>
          </Modal.Footer>
        </Form>
      </Modal>
    </Container>
  );
};

export default BrandsList;

