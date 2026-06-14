import API from './api';

export const getVendors = async () => {
  const response = await API.get('/vendors');
  return response.data;
};

export const createVendor = async (vendorData) => {
  const response = await API.post('/vendors', vendorData);
  return response.data;
};

export const updateVendor = async (id, vendorData) => {
  const response = await API.put(`/vendors/${id}`, vendorData);
  return response.data;
};

export const deleteVendor = async (id) => {
  const response = await API.delete(`/vendors/${id}`);
  return response.data;
};
