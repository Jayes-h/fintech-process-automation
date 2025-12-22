import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Button, Card, Alert, Spinner, Tabs, Tab } from 'react-bootstrap';
import { misAgentApi } from '../services/agentsApi';
import { validateFileType, validateFileSize, downloadBlob } from '../utils/fileHelpers';
import { MISFormatEditor, MISSummary, MISDetailedModal, MISCardsGrid } from '../components/Agents/MISAgent';
import './MISGeneratorPage.css';

const MISGeneratorPage = () => {
  const { agentId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [trialBalance, setTrialBalance] = useState(null);
  const [tbWorking, setTbWorking] = useState(null);
  const [misData, setMisData] = useState(null);
  const [particulars, setParticulars] = useState([]);
  const [months, setMonths] = useState([]);
  const [format, setFormat] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [brand, setBrand] = useState('');
  const [createdBy, setCreatedBy] = useState('');
  const [currentFileAgentId, setCurrentFileAgentId] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState('');

  const handleCreateNew = () => {
    // Reset all form data
    setTrialBalance(null);
    setTbWorking(null);
    setMisData(null);
    setParticulars([]);
    setMonths([]);
    setFormat([]);
    setBrand('');
    setCreatedBy('');
    setCurrentFileAgentId(null);
    setError(null);
    setSuccess(null);
    setShowCreateForm(true);
  };

  const handleCancelCreate = () => {
    setShowCreateForm(false);
    setError(null);
    setSuccess(null);
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate required fields
    if (!brand.trim()) {
      setError('Brand name is required');
      return;
    }

    if (!createdBy.trim()) {
      setError('Created By is required');
      return;
    }

    // Validate file
    if (!validateFileType(file)) {
      setError('Invalid file type. Please upload an Excel file (.xlsx, .xls, or .csv)');
      return;
    }

    if (!validateFileSize(file, 10)) {
      setError('File size exceeds 10MB limit');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      const response = await misAgentApi.uploadTrialBalance(agentId, file, brand, createdBy);
      
      if (response.success) {
        setTrialBalance(response.data.trialBalance);
        setTbWorking(response.data.tbWorking);
        setMonths(response.data.months || []);
        setParticulars(response.data.particulars || []);
        // DO NOT set currentFileAgentId here - data is not saved yet
        // Data will be saved only when user clicks "Save & Generate MIS"
        setSuccess('Trial Balance uploaded and processed successfully! Configure your MIS format and click "Save & Generate MIS" to save.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to upload file');
      console.error('Upload error:', err);
    } finally {
      setLoading(false);
      event.target.value = ''; // Reset file input
    }
  };

  const handleViewFile = async (fileAgentId) => {
    try {
      setLoading(true);
      setError(null);
      const response = await misAgentApi.getMISAgent(fileAgentId);
      const data = response.data;
      
      setCurrentFileAgentId(fileAgentId);
      setTrialBalance(data.trialBalance);
      setTbWorking(data.tbWorking);
      setMisData(data.mis);
      setFormat(data.format || []);
      setBrand(data.brand || '');
      setCreatedBy(data.createdBy || '');
      setShowCreateForm(true); // Show form to view/edit
      
      if (data.tbWorking) {
        const extractedMonths = Object.keys(data.tbWorking[0] || {}).filter(
          key => key !== 'Particulars' && key !== 'Total'
        );
        setMonths(extractedMonths);
      }
      
      // Load particulars
      try {
        const particularsResponse = await misAgentApi.getParticulars(fileAgentId);
        if (particularsResponse.data && particularsResponse.data.particulars) {
          setParticulars(particularsResponse.data.particulars);
        }
      } catch (partErr) {
        console.warn('Could not load particulars:', partErr);
      }
      
      setSuccess('File loaded successfully!');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFormat = async (formatItems) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Validate required fields
      if (!brand || !brand.trim()) {
        setError('Brand name is required');
        setLoading(false);
        return;
      }

      if (!createdBy || !createdBy.trim()) {
        setError('Created By is required');
        setLoading(false);
        return;
      }

      if (!tbWorking || tbWorking.length === 0) {
        setError('Trial Balance data is required. Please upload a file first.');
        setLoading(false);
        return;
      }

      // Save & Generate MIS - This is the final action that saves everything to database
      const response = await misAgentApi.saveAndGenerateMIS(
        agentId,
        brand,
        createdBy,
        trialBalance,
        tbWorking,
        formatItems,
        months
      );
      
      if (response.success) {
        setCurrentFileAgentId(response.data.agentId);
        setFormat(formatItems);
        setMisData(response.data.mis);
        setMonths(response.data.months || months);
        setSuccess('MIS saved and generated successfully! You can now view and download it.');
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save and generate MIS');
      console.error('Save & Generate MIS error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadExcel = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const fileAgentId = currentFileAgentId || agentId;
      const blob = await misAgentApi.downloadExcel(fileAgentId);
      downloadBlob(blob, `MIS_Report_${fileAgentId}.xlsx`);
      setSuccess('Excel file downloaded successfully!');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to download Excel file');
      console.error('Download error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Show loading only when initially loading
  if (loading && !showCreateForm && !tbWorking) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading...</p>
      </Container>
    );
  }

  // Show cards grid if not creating/editing
  if (!showCreateForm) {
    return (
      <Container fluid className="mis-generator-page py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="mb-2">MIS Generator Agent</h1>
            <p className="text-muted">Manage and create MIS reports</p>
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

        <MISCardsGrid 
          onViewFile={handleViewFile}
          onCreateNew={handleCreateNew}
          selectedBrand={selectedBrand}
          onBrandChange={setSelectedBrand}
        />
      </Container>
    );
  }

  // Show create/edit form
  return (
    <Container fluid className="mis-generator-page py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-2">{currentFileAgentId ? 'Edit MIS' : 'Create New MIS'}</h1>
          <p className="text-muted">Upload Trial Balance and generate custom MIS reports</p>
        </div>
        <div>
          <Button variant="outline-secondary" className="me-2" onClick={handleCancelCreate}>
            Back to MIS Files
          </Button>
          <Button variant="outline-primary" onClick={() => navigate('/')}>
            Back to Dashboard
          </Button>
        </div>
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

      <Tabs defaultActiveKey="upload" className="mb-4">
        <Tab eventKey="upload" title="Upload & Process">
          <Card>
            <Card.Body>
              <h5 className="mb-3">Upload Trial Balance File</h5>
              
              <div className="row mb-3">
                <div className="col-md-6">
                  <label className="form-label">Brand Name *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="Enter brand name"
                    required
                    disabled={!!currentFileAgentId}
                  />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Created By *</label>
                  <input
                    type="text"
                    className="form-control"
                    value={createdBy}
                    onChange={(e) => setCreatedBy(e.target.value)}
                    placeholder="Enter your name"
                    required
                    disabled={!!currentFileAgentId}
                  />
                </div>
              </div>

              <div className="mb-3">
                <label className="form-label">Trial Balance File *</label>
                <input
                  type="file"
                  className="form-control"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileUpload}
                  disabled={loading || !!currentFileAgentId}
                />
                <small className="text-muted">
                  Supported formats: Excel (.xlsx, .xls) or CSV files (Max 10MB)
                </small>
              </div>

              {tbWorking && tbWorking.length > 0 && (
                <Alert variant="success">
                  <strong>✓ File Processed Successfully!</strong>
                  <ul className="mb-0 mt-2">
                    <li>Total Rows: {tbWorking.length}</li>
                    <li>Months Detected: {months.join(', ')}</li>
                    <li>Particulars: {particulars.length}</li>
                  </ul>
                </Alert>
              )}
            </Card.Body>
          </Card>
        </Tab>

        <Tab eventKey="format" title="Configure MIS Format" disabled={!tbWorking || tbWorking.length === 0}>
          {tbWorking && tbWorking.length > 0 ? (
            <MISFormatEditor
              particulars={particulars}
              onSave={handleSaveFormat}
              existingFormat={format}
              brand={brand}
              agentId={currentFileAgentId || agentId}
              tbWorking={tbWorking}
            />
          ) : (
            <Alert variant="warning">
              Please upload and process a Trial Balance file first.
            </Alert>
          )}
        </Tab>

        <Tab eventKey="results" title="View Results" disabled={!misData || misData.length === 0}>
          {misData && misData.length > 0 ? (
            <>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h5>MIS Results</h5>
                <div>
                  <Button variant="outline-primary" className="me-2" onClick={() => setShowModal(true)}>
                    View Detailed Data
                  </Button>
                  <Button variant="success" onClick={handleDownloadExcel} disabled={loading}>
                    {loading ? (
                      <>
                        <Spinner animation="border" size="sm" className="me-2" />
                        Downloading...
                      </>
                    ) : (
                      'Download Excel'
                    )}
                  </Button>
                </div>
              </div>
              <MISSummary misData={misData} months={months} />
            </>
          ) : (
            <Alert variant="info">
              No MIS data available. Please configure and generate MIS format first.
            </Alert>
          )}
        </Tab>
      </Tabs>

      <MISDetailedModal
        show={showModal}
        onHide={() => setShowModal(false)}
        trialBalance={trialBalance}
        tbWorking={tbWorking}
        misData={misData}
        months={months}
      />
    </Container>
  );
};

export default MISGeneratorPage;
