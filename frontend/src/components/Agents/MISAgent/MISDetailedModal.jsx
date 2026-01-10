import React, { useState } from 'react';
import { Modal, Tabs, Tab, Table } from 'react-bootstrap';
import './MISDetailedModal.css';

const MISDetailedModal = ({ show, onHide, trialBalance, tbWorking, misData, months = [] }) => {
  const [activeTab, setActiveTab] = useState('tbWorking');

  const allMonths = months.length > 0 ? months : (tbWorking?.[0] ? Object.keys(tbWorking[0]).filter(m => m !== 'Particulars' && m !== 'Total') : []);

  return (
    <Modal show={show} onHide={onHide} size="xl" centered>
      <Modal.Header closeButton>
        <Modal.Title>Detailed Views</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tabs activeKey={activeTab} onSelect={(k) => setActiveTab(k)} className="mb-3">
          <Tab eventKey="tbWorking" title="TB Working">
            {tbWorking && tbWorking.length > 0 ? (
              <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <Table striped bordered hover size="sm">
                  <thead className="sticky-top bg-white">
                    <tr>
                      <th>Particulars</th>
                      {allMonths.map((month) => (
                        <th key={month} className="text-end">{month}</th>
                      ))}
                      <th className="text-end">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tbWorking.map((row, index) => (
                      <tr key={index}>
                        <td>{row.Particulars}</td>
                        {allMonths.map((month) => (
                          <td key={month} className="text-end">
                            {typeof row[month] === 'number'
                              ? row[month].toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : row[month] || '-'}
                          </td>
                        ))}
                        <td className="text-end fw-bold">
                          {typeof row.Total === 'number'
                            ? row.Total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : row.Total || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ) : (
              <p className="text-muted">No TB Working data available</p>
            )}
          </Tab>

          <Tab eventKey="trialBalance" title="Trial Balance">
            {trialBalance && trialBalance.length > 0 ? (
              <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <Table striped bordered hover size="sm">
                  <thead className="sticky-top bg-white">
                    <tr>
                      {Object.keys(trialBalance[0] || {}).map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trialBalance.slice(0, 100).map((row, index) => (
                      <tr key={index}>
                        {Object.values(row).map((value, i) => (
                          <td key={i}>{value || '-'}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
                {trialBalance.length > 100 && (
                  <p className="text-muted mt-2">Showing first 100 rows of {trialBalance.length} total rows</p>
                )}
              </div>
            ) : (
              <p className="text-muted">No Trial Balance data available</p>
            )}
          </Tab>

          <Tab eventKey="mis" title="MIS">
            {misData && misData.length > 0 ? (
              <div className="table-responsive" style={{ maxHeight: '500px', overflowY: 'auto' }}>
                <Table striped bordered hover size="sm">
                  <thead className="sticky-top bg-white">
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
            ) : (
              <p className="text-muted">No MIS data available. Please generate MIS first.</p>
            )}
          </Tab>
        </Tabs>
      </Modal.Body>
      <Modal.Footer>
        <button className="btn btn-secondary" onClick={onHide}>
          Close
        </button>
      </Modal.Footer>
    </Modal>
  );
};

export default MISDetailedModal;























