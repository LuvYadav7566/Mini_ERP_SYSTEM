import API from './api';

export const getSalesOrders = async () => {
  const response = await API.get('/sales');
  return response.data;
};

export const getSalesOrderById = async (id) => {
  const response = await API.get(`/sales/${id}`);
  return response.data;
};

export const createSalesOrder = async (soData) => {
  const response = await API.post('/sales', soData);
  return response.data;
};

export const updateSalesOrder = async (id, soData) => {
  const response = await API.put(`/sales/${id}`, soData);
  return response.data;
};

export const confirmSalesOrder = async (id) => {
  const response = await API.post(`/sales/${id}/confirm`);
  return response.data;
};

export const deliverSalesOrderGoods = async (id, deliverData) => {
  const response = await API.post(`/sales/${id}/deliver`, deliverData);
  return response.data;
};

export const cancelSalesOrder = async (id) => {
  const response = await API.post(`/sales/${id}/cancel`);
  return response.data;
};
