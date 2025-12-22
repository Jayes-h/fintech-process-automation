import React, { useState, useEffect } from 'react';
import { Card, Table, Button, Form, InputGroup, Spinner, Alert } from 'react-bootstrap';
import { misAgentApi } from '../../../services/agentsApi';
import { downloadBlob } from '../../../utils/fileHelpers';
import './MISFileList.css';

const MISFileList = ({ onViewFile, selectedBrand, onBrandChange }) => {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
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
      const response = await misAgentApi.listMISAgents(brandFilter || null);
      setFiles(response.data || []);
      
      // Extract unique brands
      const brands = [...new Set(response.data?.map(f => f.brand).filter(Boolean) || [])];
      setAllBrands(brands);
    } catch (err) {
      setError(err.message || 'Failed to load files');
      console.error('Error loading files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (fileAgentId) => {
    try {
      const blob = await misAgentApi.downloadExcel(fileAgentId);
      downloadBlob(blob, `MIS_Report_${fileAgentId}.xlsx`);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download file');
    }
  };

  const handleView = (file) => {
    if (onViewFile) {
      onViewFile(file.agentId);
    }
  };

  if (loading && files.length === 0) {
    return (
      <Card>
        <Card.Body className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3">Loading files...</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mis-file-list">
      <Card.Header className="d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Previously Generated MIS Files</h5>
        <Button variant="outline-primary" size="sm" onClick={loadFiles}>
          Refresh
        </Button>
      </Card.Header>
      <Card.Body>
        <div className="mb-3">
          <Form.Group>
            <Form.Label>Filter by Brand</Form.Label>
            <InputGroup>
              <Form.Select
                value={brandFilter}
                onChange={(e) => {
                  setBrandFilter(e.target.value);
                  if (onBrandChange) onBrandChange(e.target.value);
                }}
              >
                <option value="">All Brands</option>
                {allBrands.map((brand) => (
                  <option key={brand} value={brand}>
                    {brand}
                  </option>
                ))}
              </Form.Select>
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setBrandFilter('');
                  if (onBrandChange) onBrandChange('');
                }}
              >
                Clear
              </Button>
            </InputGroup>
          </Form.Group>
        </div>

        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {files.length === 0 ? (
          <Alert variant="info">No MIS files found. Upload a Trial Balance to get started.</Alert>
        ) : (
          <div className="table-responsive">
            <Table striped bordered hover>
              <thead>
                <tr>
                  <th>Brand Name</th>
                  <th>Created By</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {files.map((file) => (
                  <tr key={file.agentId}>
                    <td>{file.brand || 'N/A'}</td>
                    <td>{file.createdBy || 'N/A'}</td>
                    <td>{new Date(file.createdAt).toLocaleDateString()}</td>
                    <td>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => handleView(file)}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline-success"
                        size="sm"
                        onClick={() => handleDownload(file.agentId)}
                      >
                        Download
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </Card.Body>
    </Card>
  );
};

export default MISFileList;

