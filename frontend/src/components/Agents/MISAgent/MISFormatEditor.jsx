import React, { useState, useEffect, useRef } from 'react';
import { Form, Button, Table, Alert, InputGroup, Dropdown } from 'react-bootstrap';
import { misAgentApi, misDataApi } from '../../../services/agentsApi';
import './MISFormatEditor.css';

const MISFormatEditor = ({ particulars = [], onSave, existingFormat = [], brand = '', agentId = '', tbWorking = [] }) => {
  const [formatItems, setFormatItems] = useState(existingFormat.length > 0 ? existingFormat : [{ name: '', formula: '' }]);
  const [errors, setErrors] = useState({});
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState({});
  const [activeInput, setActiveInput] = useState(null);
  const [previousFormats, setPreviousFormats] = useState([]);
  const [loadingFormats, setLoadingFormats] = useState(false);
  const [allFormats, setAllFormats] = useState([]);
  const [selectedFormatId, setSelectedFormatId] = useState('');
  const inputRefs = useRef({});

  useEffect(() => {
    if (existingFormat.length > 0) {
      setFormatItems(existingFormat);
    }
  }, [existingFormat]);

  useEffect(() => {
    loadAllFormats();
  }, []);

  const loadAllFormats = async () => {
    try {
      setLoadingFormats(true);
      const response = await misAgentApi.getAllFormats();
      setAllFormats(response.data || []);
    } catch (err) {
      console.error('Error loading all formats:', err);
    } finally {
      setLoadingFormats(false);
    }
  };

  const handleFormatSelect = (formatId) => {
    if (!formatId) {
      setSelectedFormatId('');
      return;
    }
    
    const selectedFormat = allFormats.find(f => f.agentId === formatId);
    if (selectedFormat && selectedFormat.format && Array.isArray(selectedFormat.format) && selectedFormat.format.length > 0) {
      // Populate form with exact format structure (all rows, formulas, labels)
      setFormatItems(JSON.parse(JSON.stringify(selectedFormat.format))); // Deep clone
      setSelectedFormatId(formatId);
    }
  };


  const getAllSuggestions = () => {
    const misColumnNames = formatItems
      .filter(item => item.name && item.name.trim())
      .map(item => item.name.trim());
    
    // Filter particulars by brand - only show suggestions from uploaded TB for current brand
    let brandFilteredParticulars = particulars;
    
    if (brand && tbWorking && Array.isArray(tbWorking) && tbWorking.length > 0) {
      // Extract particulars from tbWorking for the current brand
      const tbParticulars = tbWorking
        .map(row => row.Particulars)
        .filter(Boolean)
        .filter((value, index, self) => self.indexOf(value) === index); // Unique
      
      // Use TB particulars if available, otherwise use passed particulars
      brandFilteredParticulars = tbParticulars.length > 0 ? tbParticulars : particulars;
    } else if (!brand || !tbWorking || tbWorking.length === 0) {
      // If no brand or no TB uploaded, return empty array for particulars
      brandFilteredParticulars = [];
    }
    
    return [...brandFilteredParticulars, ...misColumnNames];
  };

  const handleFormulaChange = (index, value) => {
    handleChange(index, 'formula', value);
    
    // Show suggestions when user types
    const cursorPos = inputRefs.current[`formula-${index}`]?.selectionStart || 0;
    const textBeforeCursor = value.substring(0, cursorPos);
    const lastWord = textBeforeCursor.split(/[\s+\-*/()]/).pop();
    
    if (lastWord && lastWord.length > 0) {
      const allSuggestions = getAllSuggestions();
      const filtered = allSuggestions.filter(s => 
        s.toLowerCase().includes(lastWord.toLowerCase()) && 
        s.toLowerCase() !== lastWord.toLowerCase()
      );
      setSuggestions(filtered);
      setActiveInput(index);
      setShowSuggestions({ ...showSuggestions, [index]: true });
    } else {
      setShowSuggestions({ ...showSuggestions, [index]: false });
    }
  };

  const insertSuggestion = (index, suggestion) => {
    const item = formatItems[index];
    const cursorPos = inputRefs.current[`formula-${index}`]?.selectionStart || item.formula.length;
    const textBeforeCursor = item.formula.substring(0, cursorPos);
    const textAfterCursor = item.formula.substring(cursorPos);
    const lastWord = textBeforeCursor.split(/[\s+\-*/()]/).pop();
    const newFormula = textBeforeCursor.replace(new RegExp(lastWord + '$'), suggestion) + textAfterCursor;
    
    handleChange(index, 'formula', newFormula);
    setShowSuggestions({ ...showSuggestions, [index]: false });
    
    // Focus back on input
    setTimeout(() => {
      const input = inputRefs.current[`formula-${index}`];
      if (input) {
        const newPos = textBeforeCursor.replace(new RegExp(lastWord + '$'), suggestion).length;
        input.focus();
        input.setSelectionRange(newPos, newPos);
      }
    }, 0);
  };

  const handleAddRow = () => {
    setFormatItems([...formatItems, { name: '', formula: '' }]);
  };

  const handleRemoveRow = (index) => {
    if (formatItems.length > 1) {
      const newItems = formatItems.filter((_, i) => i !== index);
      setFormatItems(newItems);
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const handleChange = (index, field, value) => {
    const newItems = [...formatItems];
    newItems[index][field] = value;
    setFormatItems(newItems);

    // Clear error for this field
    if (errors[index]) {
      const newErrors = { ...errors };
      delete newErrors[index];
      setErrors(newErrors);
    }
  };

  const validate = () => {
    const newErrors = {};
    let isValid = true;

    formatItems.forEach((item, index) => {
      if (!item.name || item.name.trim() === '') {
        newErrors[index] = 'MIS Column Name is required';
        isValid = false;
      }
      if (!item.formula || item.formula.trim() === '') {
        newErrors[index] = newErrors[index] || '';
        if (newErrors[index]) {
          newErrors[index] += ' | ';
        }
        newErrors[index] += 'Formula is required';
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  };

  const handleSave = () => {
    if (validate()) {
      onSave(formatItems);
    }
  };

  const formatDisplayName = (formatItem) => {
    const brandName = formatItem.brand || formatItem.formatBrand || 'Unknown Brand';
    const date = new Date(formatItem.createdAt).toLocaleDateString();
    const createdBy = formatItem.createdBy ? ` by ${formatItem.createdBy}` : '';
    return `${brandName}${createdBy} - ${date}`;
  };

  return (
    <div className="mis-format-editor">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>MIS Format Configuration</h5>
        <div className="d-flex align-items-center gap-2">
          <Form.Select
            value={selectedFormatId}
            onChange={(e) => handleFormatSelect(e.target.value)}
            disabled={loadingFormats}
            style={{ minWidth: '250px' }}
          >
            <option value="">Select a format to load...</option>
            {allFormats.map((formatItem) => (
              <option key={formatItem.agentId} value={formatItem.agentId}>
                {formatDisplayName(formatItem)}
              </option>
            ))}
          </Form.Select>
          <Button variant="outline-success" size="sm" onClick={handleAddRow}>
            + Add Row
          </Button>
        </div>
      </div>

      {(() => {
        const suggestions = getAllSuggestions();
        const brandParticulars = suggestions.filter(s => !formatItems.some(item => item.name === s));
        
        if (brand && tbWorking && tbWorking.length > 0 && brandParticulars.length > 0) {
          return (
            <Alert variant="info" className="mb-3">
              <strong>Available Particulars for {brand}:</strong> {brandParticulars.slice(0, 10).join(', ')}
              {brandParticulars.length > 10 && ` and ${brandParticulars.length - 10} more...`}
            </Alert>
          );
        } else if (!brand || !tbWorking || tbWorking.length === 0) {
          return (
            <Alert variant="warning" className="mb-3">
              Upload Trial Balance for suggestions. Particulars will be available after upload.
            </Alert>
          );
        }
        return null;
      })()}

      <div className="table-responsive">
        <Table striped bordered hover>
          <thead>
            <tr>
              <th style={{ width: '30%' }}>MIS Column Name</th>
              <th style={{ width: '60%' }}>Formula</th>
              <th style={{ width: '10%' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {formatItems.map((item, index) => (
              <tr key={index}>
                <td>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Total Amazon Sales"
                    value={item.name}
                    onChange={(e) => handleChange(index, 'name', e.target.value)}
                    isInvalid={!!errors[index]}
                  />
                </td>
                <td style={{ position: 'relative', zIndex: showSuggestions[index] && activeInput === index ? 10001 : 1 }}>
                  <div style={{ position: 'relative' }}>
                    <InputGroup>
                      <Form.Control
                        ref={(el) => (inputRefs.current[`formula-${index}`] = el)}
                        type="text"
                        placeholder="e.g., sales amazon-hr + sales amazon-ka"
                        value={item.formula}
                        onChange={(e) => handleFormulaChange(index, e.target.value)}
                        onFocus={() => setActiveInput(index)}
                        onBlur={() => {
                          setTimeout(() => {
                            setShowSuggestions({ ...showSuggestions, [index]: false });
                          }, 200);
                        }}
                        isInvalid={!!errors[index]}
                      />
                    </InputGroup>
                    {showSuggestions[index] && suggestions.length > 0 && activeInput === index && (
                      <div className="suggestions-dropdown">
                        {suggestions.slice(0, 5).map((suggestion, idx) => (
                          <div
                            key={idx}
                            className="suggestion-item"
                            onMouseDown={(e) => {
                              e.preventDefault();
                              insertSuggestion(index, suggestion);
                            }}
                          >
                            {suggestion}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors[index] && (
                    <Form.Text className="text-danger">{errors[index]}</Form.Text>
                  )}
                </td>
                <td>
                  <Button
                    variant="outline-danger"
                    size="sm"
                    onClick={() => handleRemoveRow(index)}
                    disabled={formatItems.length === 1}
                  >
                    Remove
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      <div className="formula-help mb-3">
        <Alert variant="light">
          <strong>Formula Help:</strong>
          <ul className="mb-0 mt-2">
            <li>Use particular names exactly as they appear in the Trial Balance</li>
            <li>Use operators: + (add), - (subtract), * (multiply), / (divide)</li>
            <li>You can reference other MIS columns in formulas</li>
            <li>Type to see autocomplete suggestions for particulars and MIS columns</li>
            <li>Example: <code>sales amazon-hr + sales amazon-ka + sales amazon-mh</code></li>
          </ul>
        </Alert>
      </div>

      <div className="text-end">
        <Button variant="primary" size="lg" onClick={handleSave}>
          Save & Generate MIS
        </Button>
        <p className="text-muted mt-2 small">
          <strong>Note:</strong> This will save all data to the database and generate the MIS report.
        </p>
      </div>
    </div>
  );
};

export default MISFormatEditor;
