import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Button, Card, Alert, Spinner, Row, Col, Form, Modal } from 'react-bootstrap';
import { macrosApi, brandsApi, sellerPortalsApi, skuApi } from '../services/agentsApi';
import { validateFileType, validateFileSize, downloadBlob } from '../utils/fileHelpers';
import './MacrosGeneratorPage.css';

const MacrosGeneratorPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [sellerPortals, setSellerPortals] = useState([]);
  const [selectedSellerPortal, setSelectedSellerPortal] = useState('');
  const [filesBySellerPortal, setFilesBySellerPortal] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  const [rawFile, setRawFile] = useState(null);
  const [brandId, setBrandId] = useState('');
  const [sellerPortalId, setSellerPortalId] = useState('');
  
  // Month names array
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Generate years (current year ± 5 years)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 11 }, (_, i) => currentYear - 5 + i);
  
  // Calculate default month (previous month) and year (current year)
  const getDefaultMonth = () => {
    const now = new Date();
    const previousMonthIndex = now.getMonth() === 0 ? 11 : now.getMonth() - 1; // If January (0), go to December (11)
    return months[previousMonthIndex];
  };
  
  const getDefaultYear = () => {
    return currentYear.toString();
  };
  
  const [month, setMonth] = useState(getDefaultMonth());
  const [year, setYear] = useState(getDefaultYear());
  const [brands, setBrands] = useState([]);
  const [showSKUErrorModal, setShowSKUErrorModal] = useState(false);
  const [missingSKUs, setMissingSKUs] = useState([]);
  const [showNoSKUModal, setShowNoSKUModal] = useState(false);
  const [showAddMissingSKUModal, setShowAddMissingSKUModal] = useState(false);
  const [missingSKUData, setMissingSKUData] = useState({}); // { skuId: tallyNewSku }
  const [addingSKUs, setAddingSKUs] = useState(false);

  useEffect(() => {
    loadSellerPortals();
    loadBrands();
  }, []);

  useEffect(() => {
    if (selectedSellerPortal) {
      loadFilesBySellerPortal(selectedSellerPortal);
    }
  }, [selectedSellerPortal]);

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

  const loadBrands = async () => {
    try {
      const response = await brandsApi.getAllBrands();
      if (response.success) {
        setBrands(response.data || []);
      }
    } catch (err) {
      console.error('Error loading brands:', err);
    }
  };

  const loadFilesBySellerPortal = async (sellerPortal) => {
    try {
      const response = await macrosApi.getFilesByBrand(sellerPortal);
      if (response.success) {
        setFilesBySellerPortal(response.data || []);
      }
    } catch (err) {
      console.error('Error loading files:', err);
    }
  };

  const handleSellerPortalSelect = (sellerPortal) => {
    setSelectedSellerPortal(sellerPortal);
    setShowCreateForm(false);
  };

  const handleCreateNew = () => {
    setShowCreateForm(true);
    setError(null);
    setSuccess(null);
    setRawFile(null);
    setBrandId('');
    // Set seller portal ID if one was selected
    if (selectedSellerPortal) {
      const portal = sellerPortals.find(p => p.name === selectedSellerPortal);
      if (portal) {
        setSellerPortalId(portal.id);
      }
    } else {
      setSellerPortalId('');
    }
    // Reset to default values (previous month and current year)
    setMonth(getDefaultMonth());
    setYear(getDefaultYear());
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setError(null);
    setSuccess(null);
  };

  const handleDownloadProcess1 = async (fileId, sellerPortalName, date) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      console.log('Downloading Process1 file with ID:', fileId);
      const blob = await macrosApi.downloadProcess1(fileId);
      
      if (!blob || blob.size === 0) {
        throw new Error('Received empty file');
      }
      
      // console.log('Blob received, size:', blob.size);
      downloadBlob(blob, `Process1_${sellerPortalName}_${date}.xlsx`);
      setSuccess('Process1 file downloaded successfully!');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to download Process1 file';
      setError(errorMessage);
      console.error('Download error:', err);
      console.error('Error response:', err.response);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPivot = async (fileId, sellerPortalName, date) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      
      console.log('Downloading Pivot file with ID:', fileId);
      const blob = await macrosApi.downloadPivot(fileId);
      
      if (!blob || blob.size === 0) {
        throw new Error('Received empty file');
      }
      
      console.log('Blob received, size:', blob.size);
      downloadBlob(blob, `Pivot_${sellerPortalName}_${date}.xlsx`);
      setSuccess('Pivot file downloaded successfully!');
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message || 'Failed to download Pivot file';
      setError(errorMessage);
      console.error('Download error:', err);
      console.error('Error response:', err.response);
    } finally {
      setLoading(false);
    }
  };

  const handleRawFileChange = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!validateFileType(file)) {
      setError('Raw file must be an Excel file (.xlsx, .xls)');
      return;
    }

    if (!validateFileSize(file, 50)) {
      setError('Raw file size exceeds 50MB limit');
      return;
    }

    setRawFile(file);
    setError(null);
  };


  const handleGenerate = async () => {
    // Step 1: Form Validation
    if (!rawFile) {
      setError('Raw file is required');
      return;
    }

    if (!brandId) {
      setError('Brand is required');
      return;
    }

    if (!sellerPortalId) {
      setError('Seller portal is required');
      return;
    }

    if (!month || !year) {
      setError('Month and Year are required');
      return;
    }
    
    // Combine month and year into "month-year" format
    const date = `${month}-${year}`;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Step 2: Check if SKUs exist in database for the selected brand and seller portal
      try {
        const skuCheckResponse = await skuApi.getAllSKUs(brandId, sellerPortalId);
        
        // If response is empty or no SKUs found, show error modal
        if (!skuCheckResponse.success || !skuCheckResponse.data || skuCheckResponse.data.length === 0) {
          setShowNoSKUModal(true);
          setError('No SKUs found for the selected brand and seller portal. Please add SKUs first.');
          setLoading(false);
          return;
        }
      } catch (skuError) {
        // If SKU check fails, show error modal as well
        console.error('Error checking SKUs:', skuError);
        setShowNoSKUModal(true);
        setError('Failed to check SKUs. Please verify your selection and try again.');
        setLoading(false);
        return;
      }

      // Step 3: If SKUs exist, proceed with macros generation
      const response = await macrosApi.generateMacros(rawFile, brandId, sellerPortalId, date);
      
      if (response.success) {
        setSuccess(`Macros generated successfully! Processed ${response.data.process1RecordCount} Process1 records and ${response.data.pivotRecordCount} Pivot records.`);
        // Reset form
        setRawFile(null);
        setMonth('');
        setYear('');
        setShowCreateForm(false);
        // Reload files for the seller portal
        if (selectedSellerPortal) {
          loadFilesBySellerPortal(selectedSellerPortal);
        }
        // Reload seller portals in case new portal was added
        loadSellerPortals();
      }
    } catch (err) {
      // Check if error is about no SKUs available (fallback check)
      if (err.response?.data?.message && err.response.data.message.includes('No SKUs found')) {
        setShowNoSKUModal(true);
        setError('No SKUs found for the selected brand and seller portal. Please add SKUs first.');
      } 
      // Check if error is about missing SKUs during processing
      else if (err.response?.data?.missingSKUs && err.response.data.missingSKUs.length > 0) {
        const missingSKUList = err.response.data.missingSKUs;
        setMissingSKUs(missingSKUList);
        // Initialize missingSKUData with empty values for each missing SKU
        const initialData = {};
        missingSKUList.forEach(sku => {
          initialData[sku] = '';
        });
        setMissingSKUData(initialData);
        setShowAddMissingSKUModal(true);
        setError(`Missing SKUs detected: ${missingSKUList.join(', ')}. Please add them to continue.`);
      } 
      // Check if error message contains missing SKUs (fallback)
      else if (err.response?.data?.error && err.response.data.error.includes('missing from the database')) {
        // Try to extract SKU IDs from error message
        const errorMsg = err.response.data.error;
        const skuMatch = errorMsg.match(/:\s*([^,]+(?:,\s*[^,]+)*)/);
        if (skuMatch) {
          const missingSKUList = skuMatch[1].split(',').map(s => s.trim()).filter(s => s);
          setMissingSKUs(missingSKUList);
          const initialData = {};
          missingSKUList.forEach(sku => {
            initialData[sku] = '';
          });
          setMissingSKUData(initialData);
          setShowAddMissingSKUModal(true);
          setError(`Missing SKUs detected: ${missingSKUList.join(', ')}. Please add them to continue.`);
        } else {
          setError(err.response?.data?.message || err.message || 'Failed to generate macros');
        }
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to generate macros');
      }
      console.error('Generate error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMissingSKUs = () => {
    // Navigate to dashboard brands page or open SKU creation
    setShowSKUErrorModal(false);
    setShowCreateForm(false);
    // You can navigate to brands page or show a message
    setSuccess('Please add the missing SKUs from the Dashboard → Brands → See SKUs');
  };

  const handleMissingSKUInputChange = (skuId, value) => {
    setMissingSKUData(prev => ({
      ...prev,
      [skuId]: value
    }));
  };

  const handleAddMissingSKUsToDB = async (shouldRetry = false) => {
    // Validate all SKUs have names
    const missingNames = missingSKUs.filter(sku => !missingSKUData[sku] || missingSKUData[sku].trim() === '');
    if (missingNames.length > 0) {
      setError(`Please provide Tally New SKU names for: ${missingNames.join(', ')}`);
      return;
    }

    if (!brandId || !sellerPortalId) {
      setError('Brand and Seller Portal are required');
      return;
    }

    try {
      setAddingSKUs(true);
      setError(null);

      // Create SKUs one by one
      const createdSKUs = [];
      const errors = [];

      for (const skuId of missingSKUs) {
        try {
          const response = await skuApi.createSKU(
            brandId,
            sellerPortalId,
            skuId, // salesPortalSku
            missingSKUData[skuId].trim() // tallyNewSku
          );
          if (response.success) {
            createdSKUs.push(skuId);
          } else {
            errors.push({ sku: skuId, error: response.message || 'Failed to create' });
          }
        } catch (err) {
          errors.push({ sku: skuId, error: err.response?.data?.message || err.message || 'Failed to create' });
        }
      }

      if (errors.length > 0) {
        setError(`Failed to add some SKUs: ${errors.map(e => `${e.sku} (${e.error})`).join(', ')}`);
      }

      if (createdSKUs.length > 0) {
        setSuccess(`Successfully added ${createdSKUs.length} SKU(s).${shouldRetry ? ' Retrying macros generation...' : ' You can now retry generating macros.'}`);
        
        // Reset missing SKU data
        setMissingSKUData({});
        setMissingSKUs([]);
        
        if (shouldRetry) {
          // Close modal and retry generation
          setShowAddMissingSKUModal(false);
          // Small delay to ensure SKUs are saved
          setTimeout(async () => {
            await handleGenerate();
          }, 500);
        } else {
          setShowAddMissingSKUModal(false);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add SKUs');
      console.error('Add SKUs error:', err);
    } finally {
      setAddingSKUs(false);
    }
  };

  return (
    <Container fluid className="macros-generator-page py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-2">Macros Agent</h1>
          <p className="text-muted">Process Excel files (Raw File and SKU File) to generate processed data with formulas, pivot tables, and reports</p>
        </div>
        <Button variant="outline-primary" onClick={() => navigate('/')}>
          Back to Dashboard
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

      {/* Seller Portal Selection */}
      <Card className="mb-4">
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Seller Portals</h5>
          <Button 
            variant="success" 
            onClick={() => {
              setSellerPortalId('');
              handleCreateNew();
            }}
          >
            ➕ Create New Macros
          </Button>
        </Card.Header>
        <Card.Body>
          <Row className="g-3">
            {sellerPortals.length > 0 ? (
              sellerPortals.map((portal) => (
                <Col key={portal.id} xs={12} sm={6} md={4}>
                  <Button
                    variant={selectedSellerPortal === portal.name ? 'primary' : 'outline-primary'}
                    className="w-100"
                    onClick={() => handleSellerPortalSelect(portal.name)}
                  >
                    {portal.name}
                  </Button>
                </Col>
              ))
            ) : (
              <Col xs={12}>
                <Alert variant="info" className="mb-0">
                  No seller portals available. Please add seller portals from the Dashboard.
                </Alert>
              </Col>
            )}
          </Row>
        </Card.Body>
      </Card>

      {/* Files List for Selected Seller Portal */}
      {selectedSellerPortal && (
        <Card className="mb-4">
          <Card.Header>
            <h5 className="mb-0">Previously Created Files - {selectedSellerPortal}</h5>
          </Card.Header>
          <Card.Body>
            {filesBySellerPortal.length === 0 ? (
              <Alert variant="info">
                No files created yet for {selectedSellerPortal}. Click "Create New" to get started.
              </Alert>
            ) : (
              <div className="files-list">
                {filesBySellerPortal.map((file, index) => (
                  <Card key={file.id || index} className="mb-2">
                    <Card.Body>
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <strong>Brand :</strong> {file.brandName} | <strong>Date:</strong> {file.date}
                          <br />
                          <small className="text-muted">
                            Process1 Records: {file.process1RecordCount || 0} | 
                            Pivot Records: {file.pivotRecordCount || 0}
                            <br />
                            Created: {new Date(file.createdAt).toLocaleString()}
                          </small>
                        </div>
                        <div className="d-flex gap-2">
                          <Button
                            variant="outline-primary"
                            size="sm"
                            onClick={() => handleDownloadProcess1(file.id, file.brandName, file.date)}
                            disabled={loading}
                          >
                            📥 Process1
                          </Button>
                          <Button
                            variant="outline-success"
                            size="sm"
                            onClick={() => handleDownloadPivot(file.id, file.brandName, file.date)}
                            disabled={loading}
                          >
                            📥 Pivot
                          </Button>
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                ))}
              </div>
            )}
          </Card.Body>
        </Card>
      )}

      {/* Create New Macros Modal */}
      <Modal show={showCreateForm} onHide={handleCancelCreate} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Macros File</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Brand Name</Form.Label>
                  <Form.Select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    required
                  >
                    <option value="">Select Brand</option>
                    {brands.map((brand) => (
                      <option key={brand.id} value={brand.id}>
                        {brand.name}
                      </option>
                    ))}
                  </Form.Select>
                  {brands.length === 0 && (
                    <Form.Text className="text-muted">
                      No brands available. Please add brands from the Dashboard.
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Seller Portal</Form.Label>
                  <Form.Select
                    value={sellerPortalId}
                    onChange={(e) => setSellerPortalId(e.target.value)}
                    required
                    disabled={!!sellerPortalId}
                  >
                    <option value="">Select Seller Portal</option>
                    {sellerPortals.map((portal) => (
                      <option key={portal.id} value={portal.id}>
                        {portal.name}
                      </option>
                    ))}
                  </Form.Select>
                  {sellerPortals.length === 0 && (
                    <Form.Text className="text-muted">
                      No seller portals available. Please add seller portals from the Dashboard.
                    </Form.Text>
                  )}
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Month</Form.Label>
                  <Form.Select
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    required
                  >
                    <option value="">Select Month</option>
                    {months.map((monthName, index) => (
                      <option key={index} value={monthName}>
                        {monthName}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
              <Col md={6}>
                <Form.Group className="mb-3">
                  <Form.Label>Year</Form.Label>
                  <Form.Select
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    required
                  >
                    <option value="">Select Year</option>
                    {years.map((yearValue) => (
                      <option key={yearValue} value={yearValue}>
                        {yearValue}
                      </option>
                    ))}
                  </Form.Select>
                </Form.Group>
              </Col>
            </Row>

            <Row>
              <Col md={12}>
                <Form.Group className="mb-3">
                  <Form.Label>Raw File (Excel)</Form.Label>
                  <Form.Control
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleRawFileChange}
                    required
                  />
                  {rawFile && (
                    <Form.Text className="text-muted">
                      Selected: {rawFile.name}
                    </Form.Text>
                  )}
                  <Form.Text className="text-muted d-block mt-1">
                    SKUs will be automatically fetched from the database based on the selected Brand and Seller Portal.
                  </Form.Text>
                </Form.Group>
              </Col>
            </Row>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={handleCancelCreate}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerate}
            disabled={loading || !rawFile || !brandId || !sellerPortalId || !month || !year}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                Generating...
              </>
            ) : (
              'Generate'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* No SKUs Available Modal - Should appear above ALL modals */}
      <Modal 
        show={showNoSKUModal} 
        onHide={() => setShowNoSKUModal(false)} 
        size="lg"
        className="no-sku-error-modal"
        backdrop="static"
        dialogClassName="no-sku-error-modal-dialog"
      >
        <Modal.Header closeButton style={{ backgroundColor: '#fff3cd', borderBottom: '2px solid #ffc107' }}>
          <Modal.Title>
            <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>⚠️</span>
            No SKUs Available
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning" className="mb-4">
            <Alert.Heading>No SKUs Found</Alert.Heading>
            <p className="mb-0">
              No SKUs are available for the selected <strong>Brand</strong> and <strong>Sales Portal</strong> combination.
              <br />
              You must add SKUs before generating macros files.
            </p>
          </Alert>
          
          <div className="mb-4 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
            <h6 className="mb-3"><strong>Selected Details:</strong></h6>
            <div className="row">
              <div className="col-md-6">
                <p className="mb-2">
                  <strong>Brand:</strong> 
                  <span className="ms-2 badge bg-primary">
                    {brands.find(b => b.id === brandId)?.name || 'Not selected'}
                  </span>
                </p>
              </div>
              <div className="col-md-6">
                <p className="mb-2">
                  <strong>Sales Portal:</strong> 
                  <span className="ms-2 badge bg-info text-dark">
                    {sellerPortals.find(p => p.id === sellerPortalId)?.name || 'Not selected'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <Alert variant="info">
            <Alert.Heading>📋 How to Upload SKUs:</Alert.Heading>
            <ol className="mt-3 mb-0" style={{ paddingLeft: '20px' }}>
              <li className="mb-2">
                Go to <strong>Dashboard</strong> → <strong>Brands</strong>
              </li>
              <li className="mb-2">
                Click on the brand: <strong className="text-primary">{brands.find(b => b.id === brandId)?.name || 'Selected Brand'}</strong>
              </li>
              <li className="mb-2">
                Click <strong>"Create SKU"</strong> or <strong>"See SKUs"</strong> button
              </li>
              <li className="mb-2">
                Select the sales portal: <strong className="text-info">{sellerPortals.find(p => p.id === sellerPortalId)?.name || 'Selected Portal'}</strong>
              </li>
              <li className="mb-2">
                <strong>Upload SKU:</strong> Upload an Excel file with columns:
                <ul style={{ marginTop: '5px', marginBottom: '5px' }}>
                  <li><code>"sales portal sku"</code></li>
                  <li><code>"tally new sku"</code></li>
                </ul>
                Or add SKUs manually using the form.
              </li>
              <li className="mb-0">
                Return here and try generating macros again
              </li>
            </ol>
            <div className="mt-3 p-2" style={{ backgroundColor: '#e7f3ff', borderRadius: '3px' }}>
              <strong>💡 Quick Tip:</strong> You can bulk upload SKUs using an Excel file from <strong>Dashboard → Brands → Create SKU → Upload Excel File</strong>
            </div>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowNoSKUModal(false)}>
            Close
          </Button>
          <Button 
            variant="primary" 
            onClick={() => {
              setShowNoSKUModal(false);
              navigate('/');
            }}
          >
            Go to Dashboard
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Missing SKU Error Modal - For SKUs missing during processing */}
      <Modal 
        show={showSKUErrorModal} 
        onHide={() => setShowSKUErrorModal(false)} 
        size="lg"
        className="missing-sku-error-modal"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>⚠️ Missing SKUs Detected</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="danger">
            The following SKUs were not found in the database. Please add them before generating macros.
          </Alert>
          <div className="mb-3">
            <strong>Missing SKUs:</strong>
            <ul className="mt-2">
              {missingSKUs.map((sku, index) => (
                <li key={index}>{sku}</li>
              ))}
            </ul>
          </div>
          <Alert variant="info">
            <strong>How to add SKUs:</strong>
            <ol className="mt-2 mb-0">
              <li>Go to Dashboard → Brands</li>
              <li>Click on the brand: <strong>{brands.find(b => b.id === brandId)?.name || 'Selected Brand'}</strong></li>
              <li>Click "See SKUs" or "Create SKU"</li>
              <li>Add the missing SKUs with their Tally New SKU mappings</li>
              <li>Return here and try generating again</li>
            </ol>
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowSKUErrorModal(false)}>
            Close
          </Button>
          <Button variant="primary" onClick={handleAddMissingSKUs}>
            Go to Dashboard
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Add Missing SKUs Modal - Allows adding missing SKUs directly */}
      <Modal 
        show={showAddMissingSKUModal} 
        onHide={() => {
          setShowAddMissingSKUModal(false);
          setMissingSKUData({});
        }} 
        size="lg"
        className="add-missing-sku-modal"
        backdrop="static"
        style={{ zIndex: 1080 }}
      >
        <Modal.Header closeButton style={{ backgroundColor: '#f8d7da', borderBottom: '2px solid #dc3545' }}>
          <Modal.Title>
            <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>➕</span>
            Add Missing SKUs
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning" className="mb-4">
            <Alert.Heading>Missing SKUs Detected</Alert.Heading>
            <p className="mb-0">
              The following SKUs were not found in the database. Please provide their <strong>Tally New SKU</strong> names to add them.
            </p>
          </Alert>

          <div className="mb-4 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
            <h6 className="mb-3"><strong>Selected Details:</strong></h6>
            <div className="row">
              <div className="col-md-6">
                <p className="mb-2">
                  <strong>Brand:</strong> 
                  <span className="ms-2 badge bg-primary">
                    {brands.find(b => b.id === brandId)?.name || 'Not selected'}
                  </span>
                </p>
              </div>
              <div className="col-md-6">
                <p className="mb-2">
                  <strong>Sales Portal:</strong> 
                  <span className="ms-2 badge bg-info text-dark">
                    {sellerPortals.find(p => p.id === sellerPortalId)?.name || 'Not selected'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          <div className="mb-3">
            <h6 className="mb-3"><strong>Enter Tally New SKU Names:</strong></h6>
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {missingSKUs.map((skuId, index) => (
                <Form.Group key={index} className="mb-3">
                  <Form.Label>
                    <strong>Sales Portal SKU:</strong> <code>{skuId}</code>
                  </Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Enter Tally New SKU name"
                    value={missingSKUData[skuId] || ''}
                    onChange={(e) => handleMissingSKUInputChange(skuId, e.target.value)}
                    required
                  />
                  <Form.Text className="text-muted">
                    This will be stored as the Tally New SKU for <code>{skuId}</code>
                  </Form.Text>
                </Form.Group>
              ))}
            </div>
          </div>

          <Alert variant="info" className="mb-0">
            <strong>💡 Note:</strong> After adding these SKUs, you can retry generating the macros file.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowAddMissingSKUModal(false);
              setMissingSKUData({});
            }}
            disabled={addingSKUs}
          >
            Cancel
          </Button>
          <Button 
            variant="success" 
            onClick={() => handleAddMissingSKUsToDB(false)}
            disabled={addingSKUs}
          >
            {addingSKUs ? (
              <>
                <Spinner size="sm" className="me-2" />
                Adding SKUs...
              </>
            ) : (
              'Add SKUs to Database'
            )}
          </Button>
          {Object.keys(missingSKUData).length > 0 && 
           Object.values(missingSKUData).every(v => v && v.trim() !== '') && (
            <Button 
              variant="primary" 
              onClick={() => handleAddMissingSKUsToDB(true)}
              disabled={addingSKUs || loading}
            >
              {addingSKUs || loading ? (
                <>
                  <Spinner size="sm" className="me-2" />
                  {addingSKUs ? 'Adding...' : 'Retrying...'}
                </>
              ) : (
                'Add & Retry Generation'
              )}
            </Button>
          )}
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MacrosGeneratorPage;


