import API from './api';

export const getProducts = async () => {
  const response = await API.get('/products');
  return response.data;
};

export const getProductById = async (id) => {
  const response = await API.get(`/products/${id}`);
  return response.data;
};

export const createProduct = async (productData) => {
  const response = await API.post('/products', productData);
  return response.data;
};

export const updateProduct = async (id, productData) => {
  const response = await API.put(`/products/${id}`, productData);
  return response.data;
};

export const deleteProduct = async (id) => {
  const response = await API.delete(`/products/${id}`);
  return response.data;
};

export const getStockLedger = async (productId = null) => {
  const url = productId ? `/products/${productId}/ledger` : '/products/ledger';
  const response = await API.get(url);
  return response.data;
};

export const adjustStock = async (id, adjustData) => {
  const response = await API.post(`/products/${id}/adjust-stock`, adjustData);
  return response.data;
};
