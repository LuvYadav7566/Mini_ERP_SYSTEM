import API from './api';

export const getPurchaseOrders = async () => {
  const response = await API.get('/purchase');
  return response.data;
};

export const getPurchaseOrderById = async (id) => {
  const response = await API.get(`/purchase/${id}`);
  return response.data;
};

export const createPurchaseOrder = async (poData) => {
  const response = await API.post('/purchase', poData);
  return response.data;
};

export const updatePurchaseOrder = async (id, poData) => {
  const response = await API.put(`/purchase/${id}`, poData);
  return response.data;
};

export const confirmPurchaseOrder = async (id) => {
  const response = await API.post(`/purchase/${id}/confirm`);
  return response.data;
};

export const receivePurchaseOrderGoods = async (id, receiveData) => {
  const response = await API.post(`/purchase/${id}/receive`, receiveData);
  return response.data;
};

export const cancelPurchaseOrder = async (id) => {
  const response = await API.post(`/purchase/${id}/cancel`);
  return response.data;
};
