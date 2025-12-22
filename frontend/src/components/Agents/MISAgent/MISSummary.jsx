import React from 'react';
import { Card, Table, Badge } from 'react-bootstrap';
import './MISSummary.css';

const MISSummary = ({ misData = [], months = [] }) => {
  if (!misData || misData.length === 0) {
    return (
      <Card>
        <Card.Body className="text-center text-muted">
          <p>No MIS data available. Please generate MIS first.</p>
        </Card.Body>
      </Card>
    );
  }

  const allMonths = months.length > 0 ? months : (misData[0]?.Months ? Object.keys(misData[0].Months).filter(m => m !== 'YTD') : []);

  return (
    <Card className="mis-summary">
      <Card.Header>
        <h5 className="mb-0">Generated MIS Report</h5>
      </Card.Header>
      <Card.Body>
        <div className="table-responsive">
          <Table striped bordered hover size="sm">
            <thead>
              <tr>
                <th>Particular</th>
                {allMonths.map((month) => (
                  <th key={month} className="text-end">{month}</th>
                ))}
                <th className="text-end">YTD</th>
              </tr>
            </thead>
            <tbody>
              {misData.map((item, index) => (
                <tr key={index}>
                  <td className="fw-bold">{item.Particular}</td>
                  {allMonths.map((month) => (
                    <td key={month} className="text-end">
                      {typeof item.Months[month] === 'number'
                        ? item.Months[month].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                        : item.Months[month] || '-'}
                    </td>
                  ))}
                  <td className="text-end fw-bold">
                    {typeof item.Months['YTD'] === 'number'
                      ? item.Months['YTD'].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : item.Months['YTD'] || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card.Body>
    </Card>
  );
};

export default MISSummary;









