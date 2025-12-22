import React from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import { misAgentApi } from '../../../services/agentsApi';
import { downloadBlob } from '../../../utils/fileHelpers';
import './MISFileCard.css';

const MISFileCard = ({ misFile, onView }) => {
  const handleDownload = async (e) => {
    e.stopPropagation();
    try {
      // Try using agentId first (for mis_agent table), fallback to id (for mis_data table)
      const fileId = misFile.agentId || misFile.id;
      const blob = await misAgentApi.downloadExcel(fileId);
      downloadBlob(blob, `MIS_Report_${misFile.brand || 'Unknown'}_${fileId}.xlsx`);
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download file');
    }
  };

  const handleView = (e) => {
    e.stopPropagation();
    if (onView) {
      // Use agentId if available (mis_agent table), otherwise use id (mis_data table)
      onView(misFile.agentId || misFile.id);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <Card className="mis-file-card h-100">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <div>
            <Card.Title className="mb-1">{misFile.brand || 'Unknown Brand'}</Card.Title>
            <small className="text-muted">MIS ID: {(misFile.agentId || misFile.id || '').substring(0, 8)}...</small>
          </div>
          <Badge bg="primary">MIS</Badge>
        </div>
        
        <Card.Text className="mb-2">
          <small className="text-muted">
            <strong>Description:</strong> {misFile.name || 'MIS Generator Agent'}
          </small>
        </Card.Text>

        <div className="mis-file-info mb-3">
          <div className="info-item">
            <strong>Created By:</strong> {misFile.createdBy || 'N/A'}
          </div>
          <div className="info-item">
            <strong>Created Date:</strong> {formatDate(misFile.createdAt)}
          </div>
        </div>

        <div className="d-grid gap-2">
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={handleView}
          >
            View Details
          </Button>
          <Button 
            variant="success" 
            size="sm"
            onClick={handleDownload}
          >
            Download File
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default MISFileCard;

