import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Container, Button, Card, Alert, Spinner, Row, Col, Form, Modal, Table, Badge, Tabs, Tab } from 'react-bootstrap';
import { macrosApi, brandsApi, sellerPortalsApi, skuApi, stateConfigApi } from '../services/agentsApi';
import { useBrand } from '../contexts/BrandContext';
import { validateFileType, validateFileSize, downloadBlob } from '../utils/fileHelpers';
import './MacrosGeneratorPage.css';

const MacrosGeneratorPage = () => {
  const { agentId, brandId } = useParams();
  const navigate = useNavigate();
  const { selectedBrand } = useBrand();

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  const [sellerPortals, setSellerPortals] = useState([]);
  const [loadingPortals, setLoadingPortals] = useState(true);
  
  // Files dashboard state
  const [showFilesDashboard, setShowFilesDashboard] = useState(false);
  const [portalFiles, setPortalFiles] = useState([]);
  const [loadingFiles, setLoadingFiles] = useState(false);
  
  // Modals state
  const [showEditPortalModal, setShowEditPortalModal] = useState(false);
  const [showSKUModal, setShowSKUModal] = useState(false);
  const [showCreateSKUModal, setShowCreateSKUModal] = useState(false);
  const [showStateConfigModal, setShowStateConfigModal] = useState(false);
  const [showCreateStateConfigModal, setShowCreateStateConfigModal] = useState(false);
  const [showCreateFileModal, setShowCreateFileModal] = useState(false);
  const [showMissingSKUModal, setShowMissingSKUModal] = useState(false);
  
  // Missing SKU state
  const [missingSKUs, setMissingSKUs] = useState([]);
  const [missingSKUData, setMissingSKUData] = useState({}); // { skuId: tallyNewSku }
  const [addingMissingSKUs, setAddingMissingSKUs] = useState(false);
  
  // Selected portal for operations
  const [selectedPortal, setSelectedPortal] = useState(null);
  
  // Create file form state
  const [rawFile, setRawFile] = useState(null);
  const [fileType, setFileType] = useState('');
  
  // Filter state for Amazon files
  const [monthFilter, setMonthFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  
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
    const previousMonthIndex = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    return months[previousMonthIndex];
  };
  
  const getDefaultYear = () => {
    return currentYear.toString();
  };
  
  const [month, setMonth] = useState(getDefaultMonth());
  const [year, setYear] = useState(getDefaultYear());
  
  // Check if selected portal is Amazon
  const isAmazonPortal = () => {
    const portalName = selectedPortal?.name || selectedPortal?.sellerPortalName || '';
    return portalName.toLowerCase() === 'amazon';
  };
  
  // SKU data
  const [skus, setSkus] = useState([]);
  const [loadingSKUs, setLoadingSKUs] = useState(false);
  const [skuSearchQuery, setSkuSearchQuery] = useState('');
  
  // State config data
  const [stateConfig, setStateConfig] = useState(null);
  const [loadingStateConfig, setLoadingStateConfig] = useState(false);
  
  // Edit portal form
  const [editPortalName, setEditPortalName] = useState('');
  
  // Create SKU form
  const [newSKU, setNewSKU] = useState({ salesPortalSku: '', tallyNewSku: '' });
  const [uploadSKUFile, setUploadSKUFile] = useState(null);
  
  // State config form
  const [stateConfigData, setStateConfigData] = useState('{}');
  const [stateConfigFile, setStateConfigFile] = useState(null);
  const [stateConfigTab, setStateConfigTab] = useState('upload'); // 'upload' or 'manual'
  const [stateConfigTableData, setStateConfigTableData] = useState([]); // For table display

  useEffect(() => {
    loadSellerPortals();
  }, [brandId]);

  const loadSellerPortals = async () => {
    try {
      setLoadingPortals(true);
      const response = await brandsApi.getBrandPortals(brandId);
      if (response.success) {
        setSellerPortals(response.data || []);
      } else {
        // Fallback: load all portals if brand portals endpoint fails
        const allPortalsResponse = await sellerPortalsApi.getAllSellerPortals();
        setSellerPortals(allPortalsResponse.data || allPortalsResponse || []);
      }
    } catch (err) {
      console.error('Error loading seller portals:', err);
      // Fallback: load all portals
      try {
        const allPortalsResponse = await sellerPortalsApi.getAllSellerPortals();
        setSellerPortals(allPortalsResponse.data || allPortalsResponse || []);
      } catch (fallbackErr) {
        setError('Failed to load seller portals');
      }
    } finally {
      setLoadingPortals(false);
    }
  };

  const handlePortalCardClick = async (portal) => {
    setSelectedPortal(portal);
    setMonthFilter(''); // Reset filters when switching portals
    setTypeFilter('');
    setShowFilesDashboard(true);
    await loadPortalFiles(portal);
  };

  const loadPortalFiles = async (portal) => {
    try {
      setLoadingFiles(true);
      const portalId = portal.id || portal.sellerPortalId;
      // Use the new endpoint that filters by both brandId and sellerPortalId
      const response = await macrosApi.getFilesByBrandAndPortal(brandId, portalId);
      if (response.success) {
        setPortalFiles(response.data || []);
      } else {
        setPortalFiles([]);
      }
    } catch (err) {
      console.error('Error loading portal files:', err);
      // Fallback to old method if new endpoint fails
      try {
        const portalName = portal.name || portal.sellerPortalName;
        const fallbackResponse = await macrosApi.getFilesByBrand(portalName, brandId);
        if (fallbackResponse.success) {
          setPortalFiles(fallbackResponse.data || []);
        } else {
          setPortalFiles([]);
        }
      } catch (fallbackErr) {
        console.error('Fallback error loading portal files:', fallbackErr);
        setPortalFiles([]);
      }
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleDownloadCombined = async (fileId, portalName, date) => {
    try {
      setLoading(true);
      setError(null);
      const blob = await macrosApi.downloadCombined(fileId);
      if (!blob || blob.size === 0) {
        throw new Error('Received empty file');
      }
      downloadBlob(blob, `Macros_${portalName}_${date}.xlsx`);
      setSuccess('Macros file downloaded successfully! Contains Amazon B2C Process1 and Amazon B2C Pivot sheets.');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to download combined file');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMacrosFile = async (fileId, portalName, date) => {
    if (!window.confirm(`Are you sure you want to delete this macros file?\n\nPortal: ${portalName}\nDate: ${date}\n\nThis action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await macrosApi.deleteMacrosFile(fileId);
      setSuccess('Macros file deleted successfully!');
      // Reload the file list
      if (selectedPortal) {
        await loadPortalFiles(selectedPortal);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete macros file');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewFile = (portal) => {
    setSelectedPortal(portal);
    setRawFile(null);
    setMonth(getDefaultMonth());
    setYear(getDefaultYear());
    setShowCreateFileModal(true);
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

  const handleGenerateFile = async () => {
    if (!rawFile) {
      setError('Raw file is required');
      return;
    }

    if (!month || !year) {
      setError('Month and Year are required');
      return;
    }

    // Validate fileType for Amazon
    if (isAmazonPortal() && !fileType) {
      setError('File Type (B2C or B2B) is required for Amazon');
      return;
    }

    const date = `${month}-${year}`;
    const portalId = selectedPortal.id || selectedPortal.sellerPortalId;

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      // Check if SKUs exist
      try {
        const skuCheckResponse = await skuApi.getAllSKUs(brandId, portalId);
        if (!skuCheckResponse.success || !skuCheckResponse.data || skuCheckResponse.data.length === 0) {
          setError('No SKUs found for this brand and seller portal. Please add SKUs first.');
          setLoading(false);
          return;
        }
      } catch (skuError) {
        setError('Failed to check SKUs. Please verify your selection and try again.');
        setLoading(false);
        return;
      }

      const response = await macrosApi.generateMacros(rawFile, brandId, portalId, date, fileType || null);
      
      if (response.success) {
        setSuccess(`Macros generated successfully! Processed ${response.data.process1RecordCount} Amazon B2C Process1 records and ${response.data.pivotRecordCount} Amazon B2C Pivot records.`);
        setRawFile(null);
        setFileType('');
        setMonth(getDefaultMonth());
        setYear(getDefaultYear());
        setShowCreateFileModal(false);
        await loadPortalFiles(selectedPortal);
      }
    } catch (err) {
      // Check if error is about missing SKUs
      const errorData = err.response?.data || {};
      const errorMessage = errorData.message || err.message || '';
      
      // First check if missingSKUs array is directly in the response
      if (errorData.missingSKUs && Array.isArray(errorData.missingSKUs) && errorData.missingSKUs.length > 0) {
        const missingSKUList = errorData.missingSKUs;
        setMissingSKUs(missingSKUList);
        // Initialize missingSKUData with empty values for each missing SKU
        const initialData = {};
        missingSKUList.forEach(sku => {
          initialData[sku] = '';
        });
        setMissingSKUData(initialData);
        setShowMissingSKUModal(true);
        setError(`Missing SKUs detected: ${missingSKUList.join(', ')}. Please add them to continue.`);
      } 
      // Check if error message contains "missing from the database" or "missing SKUs"
      else if (errorMessage && (errorMessage.includes('missing from the database') || errorMessage.includes('missing SKUs') || errorMessage.includes('SKUs are missing'))) {
        // Try to extract SKU IDs from error message
        // Pattern: "Some SKUs are missing from the database: SKU1, SKU2, SKU3"
        // or "Failed to process macros: Some SKUs are missing from the database: SKU1, SKU2, SKU3"
        let missingSKUList = [];
        
        // Try multiple patterns to extract SKUs
        const patterns = [
          /:\s*([^,]+(?:,\s*[^,]+)*)$/,  // Match everything after last colon
          /missing.*?:\s*([^,]+(?:,\s*[^,]+)*)/i,  // Match after "missing" keyword
          /SKUs?\s+(?:are\s+)?missing[^:]*:\s*([^,]+(?:,\s*[^,]+)*)/i  // More specific pattern
        ];
        
        for (const pattern of patterns) {
          const match = errorMessage.match(pattern);
          if (match && match[1]) {
            missingSKUList = match[1].split(',').map(s => s.trim()).filter(s => s && s.length > 0);
            if (missingSKUList.length > 0) break;
          }
        }
        
        if (missingSKUList.length > 0) {
          setMissingSKUs(missingSKUList);
          const initialData = {};
          missingSKUList.forEach(sku => {
            initialData[sku] = '';
          });
          setMissingSKUData(initialData);
          setShowMissingSKUModal(true);
          setError(`Missing SKUs detected: ${missingSKUList.join(', ')}. Please add them to continue.`);
        } else {
          setError(errorMessage || 'Failed to generate macros');
        }
      } else {
        setError(errorMessage || 'Failed to generate macros');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleMissingSKUInputChange = (skuId, value) => {
    setMissingSKUData(prev => ({
      ...prev,
      [skuId]: value
    }));
  };

  const handleAddMissingSKUsAndRetry = async () => {
    // Validate all SKUs have names
    const missingNames = missingSKUs.filter(sku => !missingSKUData[sku] || missingSKUData[sku].trim() === '');
    if (missingNames.length > 0) {
      setError(`Please provide Tally New SKU names for: ${missingNames.join(', ')}`);
      return;
    }

    const portalId = selectedPortal.id || selectedPortal.sellerPortalId;
    const date = `${month}-${year}`;

    try {
      setAddingMissingSKUs(true);
      setError(null);

      // Create SKUs one by one
      const createdSKUs = [];
      const errors = [];

      for (const skuId of missingSKUs) {
        try {
          const response = await skuApi.createSKU(
            brandId,
            portalId,
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
        setAddingMissingSKUs(false);
        return;
      }

      if (createdSKUs.length > 0) {
        setSuccess(`Successfully added ${createdSKUs.length} SKU(s). Retrying macros generation...`);
        
        // Reset missing SKU data
        setMissingSKUData({});
        setMissingSKUs([]);
        setShowMissingSKUModal(false);
        
        // Small delay to ensure SKUs are saved, then retry generation
        setTimeout(async () => {
          try {
            setLoading(true);
            setError(null);
            setSuccess(null);
            
            const response = await macrosApi.generateMacros(rawFile, brandId, portalId, date, fileType || null);
            
            if (response.success) {
              setSuccess(`Macros generated successfully! Processed ${response.data.process1RecordCount} Amazon B2C Process1 records and ${response.data.pivotRecordCount} Amazon B2C Pivot records.`);
              setRawFile(null);
              setFileType('');
              setMonth(getDefaultMonth());
              setYear(getDefaultYear());
              setShowCreateFileModal(false);
              await loadPortalFiles(selectedPortal);
            }
          } catch (retryErr) {
            // If still missing SKUs, show modal again
            if (retryErr.response?.data?.missingSKUs && retryErr.response.data.missingSKUs.length > 0) {
              const missingSKUList = retryErr.response.data.missingSKUs;
              setMissingSKUs(missingSKUList);
              const initialData = {};
              missingSKUList.forEach(sku => {
                initialData[sku] = '';
              });
              setMissingSKUData(initialData);
              setShowMissingSKUModal(true);
              setError(`Additional missing SKUs detected: ${missingSKUList.join(', ')}. Please add them to continue.`);
            } else {
              setError(retryErr.response?.data?.message || retryErr.message || 'Failed to generate macros');
            }
          } finally {
            setLoading(false);
            setAddingMissingSKUs(false);
          }
        }, 500);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to add SKUs');
      setAddingMissingSKUs(false);
    }
  };

  const handleEditPortal = (portal) => {
    setSelectedPortal(portal);
    setEditPortalName(portal.name || portal.sellerPortalName);
    setShowEditPortalModal(true);
  };

  const handleUpdatePortal = async () => {
    if (!editPortalName.trim()) {
      setError('Portal name is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const portalId = selectedPortal.id || selectedPortal.sellerPortalId;
      await sellerPortalsApi.updateSellerPortal(portalId, editPortalName.trim());
      setSuccess('Portal updated successfully!');
      setShowEditPortalModal(false);
      loadSellerPortals();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to update portal');
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePortal = async (portal) => {
    if (!window.confirm(`Are you sure you want to delete "${portal.name || portal.sellerPortalName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const portalId = portal.id || portal.sellerPortalId;
      await sellerPortalsApi.deleteSellerPortal(portalId);
      setSuccess('Portal deleted successfully!');
      loadSellerPortals();
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete portal');
    } finally {
      setLoading(false);
    }
  };

  const handleSeeSKU = async (portal) => {
    setSelectedPortal(portal);
    setShowSKUModal(true);
    await loadSKUs(portal);
  };

  const loadSKUs = async (portal) => {
    try {
      setLoadingSKUs(true);
      const portalId = portal.id || portal.sellerPortalId;
      const response = await skuApi.getAllSKUs(brandId, portalId);
      setSkus(response.data || []);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to load SKUs');
      setSkus([]);
    } finally {
      setLoadingSKUs(false);
    }
  };

  const handleCreateSKU = (portal) => {
    setSelectedPortal(portal);
    setNewSKU({ salesPortalSku: '', tallyNewSku: '' });
    setUploadSKUFile(null);
    setShowCreateSKUModal(true);
  };

  const handleSubmitSKU = async () => {
    if (!newSKU.salesPortalSku.trim() || !newSKU.tallyNewSku.trim()) {
      setError('Both Sales Portal SKU and Tally New SKU are required');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const portalId = selectedPortal.id || selectedPortal.sellerPortalId;
      await skuApi.createSKU(brandId, portalId, newSKU.salesPortalSku.trim(), newSKU.tallyNewSku.trim());
      setSuccess('SKU created successfully!');
      setShowCreateSKUModal(false);
      setNewSKU({ salesPortalSku: '', tallyNewSku: '' });
      if (showSKUModal) {
        await loadSKUs(selectedPortal);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to create SKU');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSKUFile = async () => {
    if (!uploadSKUFile) {
      setError('Please select a file to upload');
      return;
    }

    if (!validateFileType(uploadSKUFile)) {
      setError('File must be an Excel file (.xlsx, .xls)');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const portalId = selectedPortal.id || selectedPortal.sellerPortalId;
      await skuApi.uploadSKUFile(brandId, portalId, uploadSKUFile);
      setSuccess('SKUs uploaded successfully!');
      setUploadSKUFile(null);
      setShowCreateSKUModal(false);
      if (showSKUModal) {
        await loadSKUs(selectedPortal);
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to upload SKUs');
    } finally {
      setLoading(false);
    }
  };

  const handleSeeStateConfig = async (portal) => {
    setSelectedPortal(portal);
    setShowStateConfigModal(true);
    await loadStateConfig(portal);
  };

  const loadStateConfig = async (portal) => {
    try {
      setLoadingStateConfig(true);
      const portalId = portal.id || portal.sellerPortalId;
      const response = await stateConfigApi.getStateConfig(brandId, portalId);
      setStateConfig(response.data);
      if (response.data && response.data.configData) {
        const configData = response.data.configData;
        setStateConfigData(JSON.stringify(configData, null, 2));
        
        // Parse configData for table display
        // Handle both formats: { states: [...] } or direct array
        let tableData = [];
        if (configData.states && Array.isArray(configData.states)) {
          // Format from file upload: { states: [{ States: "...", "Amazon Pay Ledger": "...", "Invoice No.": "..." }] }
          tableData = configData.states;
        } else if (Array.isArray(configData)) {
          // Direct array format
          tableData = configData;
        } else if (typeof configData === 'object') {
          // Try to find array values in the object
          const keys = Object.keys(configData);
          for (const key of keys) {
            if (Array.isArray(configData[key])) {
              tableData = configData[key];
              break;
            }
          }
        }
        
        setStateConfigTableData(tableData);
      } else {
        setStateConfigData('{}');
        setStateConfigTableData([]);
      }
    } catch (err) {
      if (err.response?.status === 404) {
        setStateConfig(null);
        setStateConfigData('{}');
        setStateConfigTableData([]);
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to load state config');
      }
    } finally {
      setLoadingStateConfig(false);
    }
  };

  const handleCreateStateConfig = (portal) => {
    setSelectedPortal(portal);
    setStateConfigData('{}');
    setShowCreateStateConfigModal(true);
  };

  const handleStateConfigFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
      const validTypes = [
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
        'application/vnd.ms-excel', // .xls
        'text/csv' // .csv
      ];
      
      if (!validTypes.includes(file.type) && !file.name.match(/\.(xlsx|xls|csv)$/i)) {
        setError('Please upload a valid Excel file (.xlsx, .xls) or CSV file');
        setStateConfigFile(null);
        return;
      }
      
      setStateConfigFile(file);
      setError(null);
    }
  };

  const handleSubmitStateConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const portalId = selectedPortal.id || selectedPortal.sellerPortalId;

      if (stateConfigTab === 'upload') {
        // Upload file
        if (!stateConfigFile) {
          setError('Please select a file to upload');
          setLoading(false);
          return;
        }

        const response = await stateConfigApi.uploadStateConfigFile(brandId, portalId, stateConfigFile);
        setSuccess(`State config saved successfully! Parsed ${response.parsedRows || 0} rows from file.`);
        setStateConfigFile(null);
        setShowCreateStateConfigModal(false);
        if (showStateConfigModal) {
          await loadStateConfig(selectedPortal);
        }
      } else {
        // Manual JSON input
        let parsedData;
        try {
          parsedData = JSON.parse(stateConfigData);
        } catch (err) {
          setError('Invalid JSON format. Please check your state config data.');
          setLoading(false);
          return;
        }

        await stateConfigApi.createOrUpdateStateConfig(brandId, portalId, parsedData);
        setSuccess('State config saved successfully!');
        setShowCreateStateConfigModal(false);
        if (showStateConfigModal) {
          await loadStateConfig(selectedPortal);
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to save state config');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSKU = async (skuId) => {
    if (!window.confirm('Are you sure you want to delete this SKU?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await skuApi.deleteSKU(skuId);
      setSuccess('SKU deleted successfully!');
      await loadSKUs(selectedPortal);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete SKU');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStateConfig = async () => {
    if (!stateConfig || !stateConfig.id) {
      setError('No state config to delete');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this state config? This action cannot be undone.')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await stateConfigApi.deleteStateConfig(stateConfig.id);
      setSuccess('State config deleted successfully!');
      setStateConfig(null);
      setStateConfigData('{}');
      setStateConfigTableData([]);
      setShowStateConfigModal(false);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to delete state config');
    } finally {
      setLoading(false);
    }
  };

  if (loadingPortals) {
    return (
      <Container className="text-center py-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-3">Loading seller portals...</p>
      </Container>
    );
  }

  return (
    <Container fluid className="macros-generator-page py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="mb-2">Macros Agent</h1>
          <p className="text-muted">
            {selectedBrand ? `Manage seller portals for ${selectedBrand.name}` : 'Manage seller portals'}
          </p>
        </div>
        <Button variant="outline-primary" onClick={() => navigate(`/brand/${brandId}`)}>
          Back to Dashboard
        </Button>
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

      {!showFilesDashboard ? (
        sellerPortals.length === 0 ? (
          <Alert variant="info" className="text-center">
            No seller portals available. Please add seller portals from the Brand Dashboard → Portals.
          </Alert>
        ) : (
          <Row className="g-4">
            {sellerPortals.map((portal) => {
              const portalId = portal.id || portal.sellerPortalId;
              const portalName = portal.name || portal.sellerPortalName;
              
              return (
                <Col key={portalId} xs={12} sm={6} md={4} lg={3}>
                  <Card 
                    className="h-100 seller-portal-card"
                    style={{ cursor: 'pointer' }}
                    onClick={() => handlePortalCardClick(portal)}
                  >
                    <Card.Body className="d-flex flex-column">
                      <div className="text-center mb-3 flex-grow-1">
                        <h5 className="mb-2">{portalName}</h5>
                        <Badge bg="secondary">Seller Portal</Badge>
                      </div>
                      <div className="seller-portal-actions" onClick={(e) => e.stopPropagation()}>
                        <Row className="g-2">
                          <Col xs={6}>
                            <Button
                              variant="outline-primary"
                              size="sm"
                              className="w-100"
                              onClick={() => handleEditPortal(portal)}
                              title="Edit Portal"
                            >
                              ✏️ Edit
                            </Button>
                          </Col>
                          <Col xs={6}>
                            <Button
                              variant="outline-danger"
                              size="sm"
                              className="w-100"
                              onClick={() => handleDeletePortal(portal)}
                              title="Delete Portal"
                            >
                              🗑️ Delete
                            </Button>
                          </Col>
                          <Col xs={6}>
                            <Button
                              variant="outline-info"
                              size="sm"
                              className="w-100"
                              onClick={() => handleSeeSKU(portal)}
                              title="View SKUs"
                            >
                              📦 SKU
                            </Button>
                          </Col>
                          <Col xs={6}>
                            <Button
                              variant="outline-success"
                              size="sm"
                              className="w-100"
                              onClick={() => handleCreateSKU(portal)}
                              title="Create SKU"
                            >
                              ➕ SKU
                            </Button>
                          </Col>
                          <Col xs={6}>
                            <Button
                              variant="outline-warning"
                              size="sm"
                              className="w-100"
                              onClick={() => handleSeeStateConfig(portal)}
                              title="View State Config"
                            >
                              ⚙️ Config
                            </Button>
                          </Col>
                          <Col xs={6}>
                            <Button
                              variant="outline-secondary"
                              size="sm"
                              className="w-100"
                              onClick={() => handleCreateStateConfig(portal)}
                              title="Create State Config"
                            >
                              ➕ Config
                            </Button>
                          </Col>
                        </Row>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              );
            })}
          </Row>
        )
      ) : (
        <Card>
          <Card.Header className="d-flex justify-content-between align-items-center">
            <div>
              <h5 className="mb-0">
                Files for {selectedPortal?.name || selectedPortal?.sellerPortalName}
              </h5>
            </div>
            <div>
              <Button
                variant="success"
                className="me-2"
                onClick={() => handleCreateNewFile(selectedPortal)}
              >
                ➕ Create New File
              </Button>
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setShowFilesDashboard(false);
                  setSelectedPortal(null);
                  setPortalFiles([]);
                }}
              >
                ← Back to Portals
              </Button>
            </div>
          </Card.Header>
          <Card.Body>
            {/* Filter Bar for Amazon */}
            {isAmazonPortal() && portalFiles.length > 0 && (
              <div className="mb-3">
                <Row className="g-3">
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Filter by Month</Form.Label>
                      <Form.Select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                      >
                        <option value="">All Months</option>
                        {months.map((monthName, index) => (
                          <option key={index} value={monthName}>
                            {monthName}
                          </option>
                        ))}
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6}>
                    <Form.Group>
                      <Form.Label>Filter by File Type</Form.Label>
                      <Form.Select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                      >
                        <option value="">All Types</option>
                        <option value="B2C">B2C</option>
                        <option value="B2B">B2B</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                </Row>
                {(monthFilter || typeFilter) && (
                  <div className="mt-2">
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => {
                        setMonthFilter('');
                        setTypeFilter('');
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                )}
              </div>
            )}
            
            {loadingFiles ? (
              <div className="text-center py-4">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3">Loading files...</p>
              </div>
            ) : portalFiles.length === 0 ? (
              <Alert variant="info" className="text-center">
                No files created yet. Click "Create New File" to get started.
              </Alert>
            ) : (() => {
              // Filter files for Amazon based on month and type filters (working together)
              const filteredFiles = isAmazonPortal() && (monthFilter || typeFilter)
                ? portalFiles.filter(file => {
                    // Extract month from date (format: "Month-Year")
                    const fileMonth = file.date ? file.date.split('-')[0] : '';
                    const matchesMonth = !monthFilter || fileMonth === monthFilter;
                    const matchesType = !typeFilter || file.fileType === typeFilter;
                    return matchesMonth && matchesType;
                  })
                : portalFiles;
              
              return filteredFiles.length === 0 ? (
                <Alert variant="info" className="text-center">
                  No files match your filter criteria.
                </Alert>
              ) : (
                <div className="files-list">
                  {filteredFiles.map((file) => {
                    const portalName = file.sellerPortalName || selectedPortal?.name || selectedPortal?.sellerPortalName;
                    return (
                      <Card key={file.id} className="mb-3">
                        <Card.Body>
                          <div className="d-flex justify-content-between align-items-center flex-wrap">
                            <div className="mb-2 mb-md-0">
                              <strong>Brand:</strong> {file.brandName || 'N/A'} | <strong>Date:</strong> {file.date}
                              {file.fileType && (
                                <> | <strong>Type:</strong> <Badge bg="info">{file.fileType}</Badge></>
                              )}
                              <br />
                              <small className="text-muted">
                                Amazon B2C Process1 Records: {file.process1RecordCount || 0} | 
                                Amazon B2C Pivot Records: {file.pivotRecordCount || 0}
                                <br />
                                Created: {new Date(file.createdAt).toLocaleString()}
                              </small>
                            </div>
                            <div className="d-flex gap-2">
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleDownloadCombined(file.id, portalName, file.date); }}
                                disabled={loading}
                                title="Download Amazon B2C Process1 and Amazon B2C Pivot as single Excel file with two sheets"
                              >
                                📥 Download Excel
                              </Button>
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={(e) => { e.stopPropagation(); handleDeleteMacrosFile(file.id, portalName, file.date); }}
                                disabled={loading}
                                title="Delete this macros file"
                              >
                                🗑️ Delete
                              </Button>
                            </div>
                          </div>
                        </Card.Body>
                      </Card>
                    );
                  })}
                </div>
              );
            })()}
          </Card.Body>
        </Card>
      )}

      {/* Edit Portal Modal */}
      <Modal show={showEditPortalModal} onHide={() => setShowEditPortalModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Edit Seller Portal</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group>
            <Form.Label>Portal Name</Form.Label>
            <Form.Control
              type="text"
              value={editPortalName}
              onChange={(e) => setEditPortalName(e.target.value)}
              placeholder="Enter portal name"
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditPortalModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdatePortal} disabled={loading}>
            {loading ? <Spinner size="sm" className="me-2" /> : null}
            Update
          </Button>
        </Modal.Footer>
      </Modal>

      {/* See SKU Modal */}
      <Modal show={showSKUModal} onHide={() => { setShowSKUModal(false); setSkuSearchQuery(''); }} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            SKUs for {selectedPortal?.name || selectedPortal?.sellerPortalName}
            {skus.length > 0 && (
              <Badge bg="secondary" className="ms-2">{skus.length} SKU{skus.length !== 1 ? 's' : ''}</Badge>
            )}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingSKUs ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
            </div>
          ) : skus.length === 0 ? (
            <Alert variant="info">
              <Alert.Heading>No SKUs Found</Alert.Heading>
              <p className="mb-0">
                No SKUs have been added for this seller portal yet. Click "Create SKU" to add one.
              </p>
            </Alert>
          ) : (
            <div>
              <div className="mb-3 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <small className="text-muted">
                  Brand: <strong>{selectedBrand?.name}</strong> | Portal: <strong>{selectedPortal?.name || selectedPortal?.sellerPortalName}</strong>
                </small>
                {/* Search Bar for Sales Portal SKU */}
                <div style={{ minWidth: '300px' }}>
                  <Form.Control
                    type="text"
                    placeholder="🔍 Search Sales Portal SKU..."
                    value={skuSearchQuery}
                    onChange={(e) => setSkuSearchQuery(e.target.value)}
                    style={{ 
                      borderRadius: '20px',
                      paddingLeft: '15px'
                    }}
                  />
                </div>
              </div>
              {/* Show filtered count if search is active */}
              {skuSearchQuery && (
                <div className="mb-2">
                  <small className="text-muted">
                    Showing {skus.filter(sku => 
                      sku.salesPortalSku?.toLowerCase().includes(skuSearchQuery.toLowerCase())
                    ).length} of {skus.length} SKUs
                    {skuSearchQuery && (
                      <Button 
                        variant="link" 
                        size="sm" 
                        className="p-0 ms-2"
                        onClick={() => setSkuSearchQuery('')}
                      >
                        Clear search
                      </Button>
                    )}
                  </small>
                </div>
              )}
              <div style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                <Table striped bordered hover responsive className="mb-0">
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#2F5597', color: 'white', zIndex: 10 }}>
                    <tr>
                      <th style={{ minWidth: '200px' }}>Sales Portal SKU</th>
                      <th style={{ minWidth: '200px' }}>Tally New SKU</th>
                      <th style={{ minWidth: '180px', textAlign: 'center' }}>Added on</th>
                      <th style={{ minWidth: '100px', textAlign: 'center' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skus
                      .filter(sku => 
                        !skuSearchQuery || 
                        sku.salesPortalSku?.toLowerCase().includes(skuSearchQuery.toLowerCase())
                      )
                      .map((sku) => (
                      <tr key={sku.id}>
                        <td><strong>{sku.salesPortalSku}</strong></td>
                        <td>{sku.tallyNewSku}</td>
                        <td style={{ textAlign: 'center' }}>
                          {sku.createdAt ? (
                            <div>
                              <div>
                                {new Date(sku.createdAt).toLocaleDateString('en-US', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric'
                                })}
                              </div>
                              <small className="text-muted">
                                {new Date(sku.createdAt).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                  hour12: true
                                })}
                              </small>
                            </div>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td style={{ textAlign: 'center' }}>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleDeleteSKU(sku.id)}
                          >
                            Delete
                          </Button>
                        </td>
                      </tr>
                    ))}
                    {skuSearchQuery && skus.filter(sku => 
                      sku.salesPortalSku?.toLowerCase().includes(skuSearchQuery.toLowerCase())
                    ).length === 0 && (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          No SKUs found matching "<strong>{skuSearchQuery}</strong>"
                        </td>
                      </tr>
                    )}
                  </tbody>
                </Table>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => { setShowSKUModal(false); setSkuSearchQuery(''); }}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Create SKU Modal */}
      <Modal show={showCreateSKUModal} onHide={() => setShowCreateSKUModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Create SKU for {selectedPortal?.name || selectedPortal?.sellerPortalName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Sales Portal SKU</Form.Label>
              <Form.Control
                type="text"
                value={newSKU.salesPortalSku}
                onChange={(e) => setNewSKU({ ...newSKU, salesPortalSku: e.target.value })}
                placeholder="Enter sales portal SKU"
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tally New SKU</Form.Label>
              <Form.Control
                type="text"
                value={newSKU.tallyNewSku}
                onChange={(e) => setNewSKU({ ...newSKU, tallyNewSku: e.target.value })}
                placeholder="Enter tally new SKU"
              />
            </Form.Group>
            <hr />
            <Form.Group className="mb-3">
              <Form.Label>Or Upload Excel File</Form.Label>
              <Form.Control
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setUploadSKUFile(e.target.files[0])}
              />
              <Form.Text className="text-muted">
                Excel file should have columns: "sales portal sku" and "tally new sku"
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateSKUModal(false)}>
            Cancel
          </Button>
          {uploadSKUFile ? (
            <Button variant="primary" onClick={handleUploadSKUFile} disabled={loading}>
              {loading ? <Spinner size="sm" className="me-2" /> : null}
              Upload File
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSubmitSKU} disabled={loading}>
              {loading ? <Spinner size="sm" className="me-2" /> : null}
              Create SKU
            </Button>
          )}
        </Modal.Footer>
      </Modal>

      {/* See State Config Modal */}
      <Modal show={showStateConfigModal} onHide={() => setShowStateConfigModal(false)} size="xl">
        <Modal.Header closeButton>
          <Modal.Title>
            State Config for {selectedPortal?.name || selectedPortal?.sellerPortalName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingStateConfig ? (
            <div className="text-center py-4">
              <Spinner animation="border" variant="primary" />
              <p className="mt-3">Loading state config...</p>
            </div>
          ) : !stateConfig ? (
            <Alert variant="info">
              <Alert.Heading>No State Config Found</Alert.Heading>
              <p className="mb-0">
                No state config has been created for this seller portal yet. Click "Create Config" to add one.
              </p>
            </Alert>
          ) : stateConfigTableData.length > 0 ? (
            <div>
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h6 className="mb-0">
                  <strong>State Configuration Data</strong>
                  <Badge bg="secondary" className="ms-2">{stateConfigTableData.length} entries</Badge>
                </h6>
                <small className="text-muted">
                  Brand: <strong>{selectedBrand?.name}</strong> | Portal: <strong>{selectedPortal?.name || selectedPortal?.sellerPortalName}</strong>
                </small>
              </div>
              <div style={{ maxHeight: '500px', overflowY: 'auto', border: '1px solid #dee2e6', borderRadius: '4px' }}>
                <Table striped bordered hover responsive className="state-config-table mb-0">
                  <thead style={{ position: 'sticky', top: 0, backgroundColor: '#2F5597', color: 'white', zIndex: 10 }}>
                    <tr>
                      <th style={{ minWidth: '60px', textAlign: 'center' }}>#</th>
                      <th style={{ minWidth: '200px' }}>States</th>
                      <th style={{ minWidth: '250px' }}>Amazon Pay Ledger</th>
                      <th style={{ minWidth: '200px' }}>Invoice No.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stateConfigTableData.map((row, index) => (
                      <tr key={index}>
                        <td style={{ textAlign: 'center', fontWeight: '600' }}>{index + 1}</td>
                        <td><strong>{row.States || row.states || row['States'] || '-'}</strong></td>
                        <td>{row['Amazon Pay Ledger'] || row['amazon pay ledger'] || row.amazonPayLedger || '-'}</td>
                        <td>{row['Invoice No.'] || row['Invoice No'] || row['invoice no.'] || row.invoiceNo || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
              {stateConfigTableData.length === 0 && (
                <Alert variant="warning" className="mt-3">
                  No data rows found in the state config.
                </Alert>
              )}
            </div>
          ) : (
            <div>
              <Alert variant="warning" className="mb-3">
                <Alert.Heading>Unable to Display as Table</Alert.Heading>
                <p className="mb-2">The state config data is not in the expected format for table display.</p>
                <p className="mb-0"><strong>Raw JSON Data:</strong></p>
              </Alert>
              <Form.Group>
                <Form.Control
                  as="textarea"
                  rows={10}
                  value={stateConfigData}
                  readOnly
                  style={{ fontFamily: 'monospace', fontSize: '12px' }}
                />
              </Form.Group>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowStateConfigModal(false)}>
            Close
          </Button>
          {stateConfig && (
            <>
              <Button 
                variant="danger" 
                onClick={handleDeleteStateConfig}
                disabled={loading}
              >
                {loading ? <Spinner size="sm" className="me-2" /> : null}
                Delete Config
              </Button>
              <Button 
                variant="primary" 
                onClick={() => {
                  setShowStateConfigModal(false);
                  handleCreateStateConfig(selectedPortal);
                }}
              >
                Edit Config
              </Button>
            </>
          )}
        </Modal.Footer>
      </Modal>

      {/* Create State Config Modal */}
      <Modal show={showCreateStateConfigModal} onHide={() => {
        setShowCreateStateConfigModal(false);
        setStateConfigFile(null);
        setStateConfigTab('upload');
        setStateConfigData('{}');
      }} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>
            Create/Update State Config for {selectedPortal?.name || selectedPortal?.sellerPortalName}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Tabs 
            activeKey={stateConfigTab} 
            onSelect={(k) => {
              setStateConfigTab(k);
              setError(null);
            }}
            className="mb-3"
          >
            <Tab eventKey="upload" title="📁 Upload File">
              <Alert variant="info" className="mb-3">
                <strong>Expected Excel Format:</strong>
                <ul className="mb-0 mt-2">
                  <li>Column headers: <strong>States</strong>, <strong>Amazon Pay Ledger</strong>, <strong>Invoice No.</strong></li>
                  <li>Each row represents a state configuration</li>
                </ul>
              </Alert>
              <Form.Group>
                <Form.Label>Upload State Config File (Excel)</Form.Label>
                <Form.Control
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleStateConfigFileChange}
                />
                {stateConfigFile && (
                  <Form.Text className="text-success d-block mt-2">
                    ✓ Selected: {stateConfigFile.name} ({(stateConfigFile.size / 1024).toFixed(2)} KB)
                  </Form.Text>
                )}
                <Form.Text className="text-muted d-block mt-2">
                  Upload an Excel file with columns: States, Amazon Pay Ledger, Invoice No.
                  This config will be stored for Brand: <strong>{selectedBrand?.name}</strong> and Portal: <strong>{selectedPortal?.name || selectedPortal?.sellerPortalName}</strong>
                </Form.Text>
              </Form.Group>
            </Tab>
            <Tab eventKey="manual" title="✏️ Manual JSON">
              <Form.Group>
                <Form.Label>Config Data (JSON)</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={10}
                  value={stateConfigData}
                  onChange={(e) => setStateConfigData(e.target.value)}
                  placeholder='{"key": "value"}'
                  style={{ fontFamily: 'monospace' }}
                />
                <Form.Text className="text-muted">
                  Enter valid JSON format. This config will be stored for Brand: {selectedBrand?.name} and Portal: {selectedPortal?.name || selectedPortal?.sellerPortalName}
                </Form.Text>
              </Form.Group>
            </Tab>
          </Tabs>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowCreateStateConfigModal(false);
              setStateConfigFile(null);
              setStateConfigTab('upload');
              setStateConfigData('{}');
            }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleSubmitStateConfig} 
            disabled={loading || (stateConfigTab === 'upload' && !stateConfigFile)}
          >
            {loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                {stateConfigTab === 'upload' ? 'Uploading...' : 'Saving...'}
              </>
            ) : (
              stateConfigTab === 'upload' ? 'Upload & Save Config' : 'Save Config'
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Create New File Modal */}
      <Modal show={showCreateFileModal} onHide={() => setShowCreateFileModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Create New Macros File</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
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
            {isAmazonPortal() && (
              <Row>
                <Col md={12}>
                  <Form.Group className="mb-3">
                    <Form.Label>File Type <span className="text-danger">*</span></Form.Label>
                    <Form.Select
                      value={fileType}
                      onChange={(e) => setFileType(e.target.value)}
                      required
                    >
                      <option value="">Select File Type</option>
                      <option value="B2C">B2C</option>
                      <option value="B2B">B2B</option>
                    </Form.Select>
                    <Form.Text className="text-muted">
                      Select the type of file: B2C (Business to Consumer) or B2B (Business to Business)
                    </Form.Text>
                  </Form.Group>
                </Col>
              </Row>
            )}
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
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="outline-secondary" onClick={() => setShowCreateFileModal(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleGenerateFile}
            disabled={loading || !rawFile || !month || !year || (isAmazonPortal() && !fileType)}
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

      {/* Missing SKU Modal */}
      <Modal 
        show={showMissingSKUModal} 
        onHide={() => {
          setShowMissingSKUModal(false);
          setMissingSKUData({});
          setMissingSKUs([]);
        }} 
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton style={{ backgroundColor: '#fff3cd', borderBottom: '2px solid #ffc107' }}>
          <Modal.Title>
            <span style={{ fontSize: '1.5rem', marginRight: '10px' }}>⚠️</span>
            Missing SKUs Detected
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant="warning" className="mb-4">
            <Alert.Heading>SKUs Not Found in Database</Alert.Heading>
            <p className="mb-0">
              The following SKUs were not found in the database. Please provide their <strong>Tally New SKU</strong> names to add them and continue with macros generation.
            </p>
          </Alert>

          <div className="mb-4 p-3" style={{ backgroundColor: '#f8f9fa', borderRadius: '5px', border: '1px solid #dee2e6' }}>
            <h6 className="mb-3"><strong>Selected Details:</strong></h6>
            <div className="row">
              <div className="col-md-6">
                <p className="mb-2">
                  <strong>Brand:</strong> 
                  <span className="ms-2 badge bg-primary">
                    {selectedBrand?.name || 'N/A'}
                  </span>
                </p>
              </div>
              <div className="col-md-6">
                <p className="mb-2">
                  <strong>Seller Portal:</strong> 
                  <span className="ms-2 badge bg-info text-dark">
                    {selectedPortal?.name || selectedPortal?.sellerPortalName || 'N/A'}
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
            <strong>💡 Note:</strong> After adding these SKUs, macros generation will automatically retry.
          </Alert>
        </Modal.Body>
        <Modal.Footer>
          <Button 
            variant="secondary" 
            onClick={() => {
              setShowMissingSKUModal(false);
              setMissingSKUData({});
              setMissingSKUs([]);
            }}
            disabled={addingMissingSKUs}
          >
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleAddMissingSKUsAndRetry}
            disabled={addingMissingSKUs || loading}
          >
            {addingMissingSKUs || loading ? (
              <>
                <Spinner size="sm" className="me-2" />
                {addingMissingSKUs ? 'Adding SKUs...' : 'Retrying...'}
              </>
            ) : (
              'Add SKUs & Generate Macros'
            )}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default MacrosGeneratorPage;

