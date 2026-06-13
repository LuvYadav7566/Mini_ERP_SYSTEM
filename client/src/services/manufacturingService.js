import API from './api';

// Bill of Materials (BoM)
export const getBoMs = async () => {
  const response = await API.get('/manufacturing/bom');
  return response.data;
};

export const getBoMById = async (id) => {
  const response = await API.get(`/manufacturing/bom/${id}`);
  return response.data;
};

export const createBoM = async (bomData) => {
  const response = await API.post('/manufacturing/bom', bomData);
  return response.data;
};

export const updateBoM = async (id, bomData) => {
  const response = await API.put(`/manufacturing/bom/${id}`, bomData);
  return response.data;
};

export const deleteBoM = async (id) => {
  const response = await API.delete(`/manufacturing/bom/${id}`);
  return response.data;
};

// Manufacturing Orders (MO)
export const getManufacturingOrders = async () => {
  const response = await API.get('/manufacturing/mo');
  return response.data;
};

export const getManufacturingOrderById = async (id) => {
  const response = await API.get(`/manufacturing/mo/${id}`);
  return response.data;
};

export const createManufacturingOrder = async (moData) => {
  const response = await API.post('/manufacturing/mo', moData);
  return response.data;
};

export const confirmManufacturingOrder = async (id) => {
  const response = await API.post(`/manufacturing/mo/${id}/confirm`);
  return response.data;
};

export const startWorkOrder = async (id, woId) => {
  const response = await API.post(`/manufacturing/mo/${id}/work-order/${woId}/start`);
  return response.data;
};

export const completeWorkOrder = async (id, woId) => {
  const response = await API.post(`/manufacturing/mo/${id}/work-order/${woId}/complete`);
  return response.data;
};

export const cancelManufacturingOrder = async (id) => {
  const response = await API.post(`/manufacturing/mo/${id}/cancel`);
  return response.data;
};
