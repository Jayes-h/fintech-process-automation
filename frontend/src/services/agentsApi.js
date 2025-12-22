import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json'
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
  generateMacros: async (rawFile, skuFile, brandName, date, sellarPortal) => {
    const formData = new FormData();
    formData.append('rawFile', rawFile);
    formData.append('skuFile', skuFile);
    formData.append('brandName', brandName);
    formData.append('date', date);
    formData.append('sellarPortal', sellarPortal || '');
    
    const response = await api.post('/macros/generate', formData, {
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

  getFilesByBrand: async (brandName) => {
    const response = await api.get(`/macros/brand/${brandName}`);
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
  }
};

export default api;

