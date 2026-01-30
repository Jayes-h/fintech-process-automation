import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'ngrok-skip-browser-warning': true,

  }
});

export const agentsApi = {
  getAllAgents: async () => {
    const response = await api.get('/agents');
    return response.data;
  },

  getAgentById: async (id) => {
    const response = await api.get(`/agents/${id}`);
    return response.data;
  },

  createAgent: async (agentData) => {
    const response = await api.post('/agents', agentData);
    return response.data;
  },

  updateAgent: async (id, agentData) => {
    const response = await api.put(`/agents/${id}`, agentData);
    return response.data;
  },

  deleteAgent: async (id) => {
    const response = await api.delete(`/agents/${id}`);
    return response.data;
  }
};

export const misAgentApi = {
  uploadTrialBalance: async (agentId, file, brand, createdBy) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('agentId', agentId);
    formData.append('brand', brand);
    formData.append('createdBy', createdBy);
    
    const response = await api.post('/mis-agent/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  listMISAgents: async (brand = null) => {
    const url = brand ? `/mis-agent/list?brand=${brand}` : '/mis-agent/list';
    const response = await api.get(url);
    return response.data;
  },

  getFormatsByBrand: async (brand) => {
    const response = await api.get(`/mis-agent/formats/brand/${brand}`);
    return response.data;
  },

  getAllFormats: async () => {
    const response = await api.get('/mis-agent/formats/all');
    return response.data;
  },

  saveFormat: async (agentId, format, formatBrand) => {
    const response = await api.post('/mis-agent/format/save', {
      agentId,
      format,
      formatBrand
    });
    return response.data;
  },

  getMISAgent: async (agentId) => {
    const response = await api.get(`/mis-agent/${agentId}`);
    return response.data;
  },

  getParticulars: async (agentId) => {
    const response = await api.get(`/mis-agent/${agentId}/particulars`);
    return response.data;
  },

  saveMISFormat: async (agentId, format) => {
    const response = await api.post(`/mis-agent/${agentId}/format`, { format });
    return response.data;
  },

  generateMIS: async (agentId, format) => {
    const response = await api.post(`/mis-agent/${agentId}/generate`, { format });
    return response.data;
  },

  downloadExcel: async (agentId) => {
    const response = await api.get(`/mis-agent/${agentId}/download`, {
      responseType: 'blob'
    });
    return response.data;
  },

  saveAndGenerateMIS: async (agentId, brand, createdBy, trialBalance, tbWorking, format, months) => {
    const response = await api.post('/mis-agent/save-and-generate', {
      agentId,
      brand,
      createdBy,
      trialBalance,
      tbWorking,
      format,
      months
    });
    return response.data;
  }
};

export const misDataApi = {
  create: async (data) => {
    const response = await api.post('/mis-data', data);
    return response.data;
  },

  getAll: async (filters = {}) => {
    const queryParams = new URLSearchParams(filters).toString();
    const url = queryParams ? `/mis-data?${queryParams}` : '/mis-data';
    const response = await api.get(url);
    return response.data;
  },

  getById: async (id) => {
    const response = await api.get(`/mis-data/${id}`);
    return response.data;
  },

  getByBrand: async (brand) => {
    const response = await api.get(`/mis-data/brand/${brand}`);
    return response.data;
  },

  getAllBrands: async () => {
    const response = await api.get('/mis-data/brands');
    return response.data;
  },

  getFormatByBrand: async (brand) => {
    const response = await api.get(`/mis-data/format/brand/${brand}`);
    return response.data;
  },

  update: async (id, data) => {
    const response = await api.put(`/mis-data/${id}`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await api.delete(`/mis-data/${id}`);
    return response.data;
  }
};

export const macrosApi = {
  generateMacros: async (
    rawFile,
    brandId,
    sellerPortalId,
    date,
    fileType = null,
    withInventory = true
  ) => {
    const formData = new FormData();
    formData.append('rawFile', rawFile);
    formData.append('brandId', brandId);
    formData.append('sellerPortalId', sellerPortalId);
    formData.append('date', date);
  
    if (fileType) {
      formData.append('fileType', fileType);
    }
  
    formData.append('withInventory', withInventory.toString());
  
    // ✅ STEP 1: Resolve seller portal UUID → portal details
    const sellerPortalResponse =
      await sellerPortalsApi.getSellerPortalById(sellerPortalId);
  
    const portalName = sellerPortalResponse?.data?.name?.toUpperCase();
    console.log("portal name =====>",portalName);
    if (!portalName) {
      throw new Error('Invalid seller portal ID');
    }
  
    // ✅ STEP 2: Decide endpoint
    let endpoint;
  
    if (portalName === 'AMAZON') {
      // Only Amazon needs B2B / B2C split
      console.log("amazon");
      endpoint =
        fileType === 'B2B'
          ? '/macros-b2b/generate'
          : '/macros/generate';
    } else if (portalName === 'Myntra') {
      console.log("myntra");
      // Myntra needs 3 files - handled separately
      endpoint = '/macros-myntra/generate';
    } else {
      console.log("flipkart");
      // Flipkart & others (no B2B/B2C logic)
      endpoint = 'macros-flipkart/generate';
    }
  
    // Debug log
    console.log('Generating macros with:', {
      brandId,
      sellerPortalId,
      portalName,
      date,
      fileType,
      withInventory,
      endpoint,
      hasRawFile: !!rawFile
    });
  
    const response = await api.post(endpoint, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  
    return response.data;
  },
  
  getAllBrands: async () => {
    const response = await api.get('/macros/brands');
    return response.data;
  },

  getFilesByBrand: async (brandName, brandId = null) => {
    const url = brandId 
      ? `/macros/brand/${brandName}?brandId=${brandId}`
      : `/macros/brand/${brandName}`;
    const response = await api.get(url);
    return response.data;
  },

  getFilesByBrandAndPortal: async (brandId, sellerPortalId) => {
    const response = await api.get(`/macros/files/${brandId}/${sellerPortalId}`);
    return response.data;
  },

  getProcess1Data: async (brandName, date) => {
    const response = await api.get(`/macros/process1/${brandName}/${date}`);
    return response.data;
  },

  getPivotData: async (brandName, date) => {
    const response = await api.get(`/macros/pivot/${brandName}/${date}`);
    return response.data;
  },

  downloadProcess1: async (fileId) => {
    const response = await api.get(`/macros/download/process1/${fileId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  downloadPivot: async (fileId) => {
    const response = await api.get(`/macros/download/pivot/${fileId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  downloadCombined: async (fileId, portalName, fileType) => {
    if (portalName === 'Amazon') {
      if(fileType === 'B2B') {   
        const response = await api.get(`/macros-b2b/download/combined/${fileId}`, {
          responseType: 'blob'
        });
        return response.data;
      } else {
        const response = await api.get(`/macros/download/combined/${fileId}`, {
          responseType: 'blob'
        });
        return response.data;
      }
      // const response = await api.get(`/macros/download/combined/${fileId}`, {
      //   responseType: 'blob'
      // });
      // return response.data;
    } else if (portalName === 'Myntra') {
      console.log("portal name from download api", portalName);
      const response = await api.get(`/macros-myntra/download/combined/${fileId}`, {
        responseType: 'blob'
      });
      return response.data;
    } else {
      console.log("portal name from download api", portalName);
      const response = await api.get(`/macros-flipkart/download/combined/${fileId}`, {
        responseType: 'blob'
      });
      return response.data;
    }
  },

  deleteMacrosFile: async (fileId) => {
    const response = await api.delete(`/macros/files/${fileId}`);
    return response.data;
  }
};

export const brandsApi = {
  getAllBrands: async () => {
    const response = await api.get('/brands');
    return response.data;
  },

  getBrandById: async (id) => {
    const response = await api.get(`/brands/${id}`);
    return response.data;
  },

  createBrand: async (name) => {
    const response = await api.post('/brands', { name });
    return response.data;
  },

  updateBrand: async (id, name) => {
    const response = await api.put(`/brands/${id}`, { name });
    return response.data;
  },

  updateBrandInfo: async (brandId, data) => {
    const response = await api.put(`/brands/${brandId}`, data);
    return response.data;
  },

  uploadBrandImage: async (brandId, formData) => {
    const response = await api.post(`/brands/${brandId}/upload-image`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  assignAgentToBrand: async (brandId, agentId) => {
    const response = await api.post(`/brands/${brandId}/agents`, { agentId });
    return response.data;
  },

  removeAgentFromBrand: async (brandId, agentId) => {
    const response = await api.delete(`/brands/${brandId}/agents/${agentId}`);
    return response.data;
  },

  getBrandAgents: async (brandId) => {
    const response = await api.get(`/brands/${brandId}/agents`);
    return response.data;
  },

  getBrandPortals: async (brandId) => {
    const response = await api.get(`/brands/${brandId}/portals`);
    return response.data;
  },

  assignPortalToBrand: async (brandId, portalId) => {
    const response = await api.post(`/brands/${brandId}/portals`, { portalId });
    return response.data;
  },

  removePortalFromBrand: async (brandId, portalId) => {
    const response = await api.delete(`/brands/${brandId}/portals/${portalId}`);
    return response.data;
  },

  deleteBrand: async (id) => {
    const response = await api.delete(`/brands/${id}`);
    return response.data;
  }
};

export const sellerPortalsApi = {
  getAllSellerPortals: async () => {
    const response = await api.get('/seller-portals');
    return response.data;
  },

  getSellerPortalById: async (id) => {
    const response = await api.get(`/seller-portals/${id}`);
    return response.data;
  },

  createSellerPortal: async (name) => {
    const response = await api.post('/seller-portals', { name });
    return response.data;
  },

  updateSellerPortal: async (id, name) => {
    const response = await api.put(`/seller-portals/${id}`, { name });
    return response.data;
  },

  deleteSellerPortal: async (id) => {
    const response = await api.delete(`/seller-portals/${id}`);
    return response.data;
  }
};

export const skuApi = {
  getAllSKUs: async (brandId = null, salesPortalId = null) => {
    const params = new URLSearchParams();
    if (brandId) params.append('brandId', brandId);
    if (salesPortalId) params.append('salesPortalId', salesPortalId);
    const url = params.toString() ? `/sku?${params.toString()}` : '/sku';
    const response = await api.get(url);
    return response.data;
  },

  getSKUById: async (id) => {
    const response = await api.get(`/sku/${id}`);
    return response.data;
  },

  getSKUsByBrand: async (brandId) => {
    const response = await api.get(`/sku/brand/${brandId}`);
    return response.data;
  },

  createSKU: async (brandId, salesPortalId, salesPortalSku, tallyNewSku) => {
    const response = await api.post('/sku', {
      brandId,
      salesPortalId,
      salesPortalSku,
      tallyNewSku
    });
    return response.data;
  },

  bulkCreateSKUs: async (brandId, salesPortalId, skus) => {
    const response = await api.post('/sku/bulk', {
      brandId,
      salesPortalId,
      skus
    });
    return response.data;
  },

  updateSKU: async (id, brandId, salesPortalId, salesPortalSku, tallyNewSku) => {
    const response = await api.put(`/sku/${id}`, {
      brandId,
      salesPortalId,
      salesPortalSku,
      tallyNewSku
    });
    return response.data;
  },

  deleteSKU: async (id) => {
    const response = await api.delete(`/sku/${id}`);
    return response.data;
  },

  uploadSKUFile: async (brandId, salesPortalId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('brandId', brandId);
    formData.append('salesPortalId', salesPortalId);
    
    const response = await api.post('/sku/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  }
};

export const stateConfigApi = {
  getStateConfig: async (brandId, sellerPortalId) => {
    const response = await api.get(`/state-config/${brandId}/${sellerPortalId}`);
    return response.data;
  },

  getStateConfigsByBrand: async (brandId) => {
    const response = await api.get(`/state-config/brand/${brandId}`);
    return response.data;
  },

  createOrUpdateStateConfig: async (brandId, sellerPortalId, configData) => {
    const response = await api.post('/state-config', {
      brandId,
      sellerPortalId,
      configData
    });
    return response.data;
  },

  uploadStateConfigFile: async (brandId, sellerPortalId, file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await api.post(`/state-config/upload/${brandId}/${sellerPortalId}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    return response.data;
  },

  updateStateConfig: async (id, configData) => {
    const response = await api.put(`/state-config/${id}`, { configData });
    return response.data;
  },

  deleteStateConfig: async (id) => {
    const response = await api.delete(`/state-config/${id}`);
    return response.data;
  }
};

export const myntraMacrosApi = {
  generateMacros: async (
    rtoFile,
    packedFile,
    rtFile,
    brandId,
    sellerPortalId,
    date,
    withInventory = true
  ) => {
    const formData = new FormData();
    formData.append('rtoFile', rtoFile);
    formData.append('packedFile', packedFile);
    formData.append('rtFile', rtFile);
    formData.append('brandId', brandId);
    formData.append('sellerPortalId', sellerPortalId);
    formData.append('date', date);
    formData.append('withInventory', withInventory.toString());
    
    const response = await api.post('/macros-myntra/generate', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
    
    return response.data;
  },

  getFilesByBrandAndPortal: async (brandId, sellerPortalId) => {
    const response = await api.get(`/macros-myntra/files/${brandId}/${sellerPortalId}`);
    return response.data;
  },

  getWorkingFileData: async (brandId, sellerPortalId, date) => {
    const response = await api.get(`/macros-myntra/working/${brandId}/${sellerPortalId}/${date}`);
    return response.data;
  },

  getPivotData: async (brandId, sellerPortalId, date) => {
    const response = await api.get(`/macros-myntra/pivot/${brandId}/${sellerPortalId}/${date}`);
    return response.data;
  },

  getAfterPivotData: async (brandId, sellerPortalId, date) => {
    const response = await api.get(`/macros-myntra/after-pivot/${brandId}/${sellerPortalId}/${date}`);
    return response.data;
  },

  downloadCombined: async (fileId) => {
    const response = await api.get(`/macros-myntra/download/combined/${fileId}`, {
      responseType: 'blob'
    });
    return response.data;
  },

  deleteMacrosFile: async (fileId) => {
    const response = await api.delete(`/macros-myntra/files/${fileId}`);
    return response.data;
  }
};

export default api;

