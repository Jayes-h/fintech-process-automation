import React from 'react';
import { Card, Button } from 'react-bootstrap';
import './MISCard.css';

const MISCard = ({ onUpload, onView }) => {
  return (
    <Card className="mis-card">
      <Card.Body>
        <div className="mis-icon mb-3">
          <span>📊</span>
        </div>
        <Card.Title>MIS Generator Agent</Card.Title>
        <Card.Text>
          Upload your Trial Balance Excel file and generate custom MIS reports with formula-based calculations.
        </Card.Text>
        <div className="d-grid gap-2">
          <Button variant="primary" onClick={onUpload}>
            Upload Trial Balance
          </Button>
          <Button variant="outline-primary" onClick={onView}>
            View Dashboard
          </Button>
        </div>
      </Card.Body>
    </Card>
  );
};

export default MISCard;









