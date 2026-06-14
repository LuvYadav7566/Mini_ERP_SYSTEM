import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
} from '../services/productService';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Warehouse,
  Coins,
  AlertTriangle,
  Check,
  X,
  Sliders,
  Filter,
  ArrowUpDown,
} from 'lucide-react';

const Products = () => {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  // Access control checks
  const canManage = hasRole(['Admin', 'Business Owner', 'Inventory Manager']);
  const canDelete = hasRole(['Admin', 'Business Owner']);

  // Page States
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [strategyFilter, setStrategyFilter] = useState('All');
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAdjustModal, setShowAdjustModal] = useState(false);

  // Form States
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: 'Component',
    salesPrice: 0,
    costPrice: 0,
    freeToUse: 0,
    procurementStrategy: 'MTS',
    procureOnDemand: false,
    procurementType: 'Purchase',
    vendor: '',
  });

  const [adjustData, setAdjustData] = useState({
    quantityChange: 0,
    notes: '',
  });

  const [errorMessage, setErrorMessage] = useState('');

  // Fetch Products
  const { data: products = [], isLoading, isError, error } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowAddModal(false);
      resetForm();
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create product');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowEditModal(false);
      setSelectedProduct(null);
      resetForm();
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to update product');
    },
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, data }) => adjustStock(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowAdjustModal(false);
      setSelectedProduct(null);
      setAdjustData({ quantityChange: 0, notes: '' });
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to adjust stock');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to delete product');
    },
  });

  const resetForm = () => {
    setFormData({
      sku: '',
      name: '',
      description: '',
      category: 'Component',
      salesPrice: 0,
      costPrice: 0,
      freeToUse: 0,
      procurementStrategy: 'MTS',
      procureOnDemand: false,
      procurementType: 'Purchase',
      vendor: '',
    });
    setErrorMessage('');
  };

  const handleOpenEdit = (product) => {
    setSelectedProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description || '',
      category: product.category,
      salesPrice: product.salesPrice,
      costPrice: product.costPrice,
      freeToUse: product.freeToUse,
      procurementStrategy: product.procurementStrategy,
      procureOnDemand: product.procureOnDemand,
      procurementType: product.procurementType || 'Purchase',
      vendor: product.vendor || '',
    });
    setShowEditModal(true);
  };

  const handleOpenAdjust = (product) => {
    setSelectedProduct(product);
    setAdjustData({ quantityChange: 0, notes: '' });
    setShowAdjustModal(true);
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    createMutation.mutate(formData);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({ id: selectedProduct._id, data: formData });
  };

  const handleAdjustSubmit = (e) => {
    e.preventDefault();
    adjustMutation.mutate({ id: selectedProduct._id, data: adjustData });
  };

  const handleDelete = (id, name) => {
    if (window.confirm(`Are you sure you want to delete product "${name}"? This will also purge its stock logs.`)) {
      deleteMutation.mutate(id);
    }
  };

  // Filters logic
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || product.category === categoryFilter;
    const matchesStrategy = strategyFilter === 'All' || product.procurementStrategy === strategyFilter;
    return matchesSearch && matchesCategory && matchesStrategy;
  });

  return (
    <Layout title="Products & Inventory">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Product Catalogue</h2>
          <p className="text-xs text-slate-500">Manage furniture components, finished goods, and stock parameters.</p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="glass-btn-primary flex items-center gap-2 text-xs"
          >
            <Plus size={16} /> Add Product
          </button>
        )}
      </div>

      {/* Filter and Search Panel */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-colors"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-blue-500" />
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          >
            <option value="All">All Categories</option>
            <option value="Raw Material">Raw Materials</option>
            <option value="Component">Components</option>
            <option value="Finished Good">Finished Goods</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Strategy Filter */}
        <div className="flex items-center gap-2">
          <Sliders size={14} className="text-blue-500" />
          <select
            value={strategyFilter}
            onChange={(e) => setStrategyFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          >
            <option value="All">All Strategies</option>
            <option value="MTS">MTS (Make To Stock)</option>
            <option value="MTO">MTO (Make To Order)</option>
          </select>
        </div>
      </div>

      {/* Products Table/Grid */}
      {isLoading ? (
        <div className="glass-panel p-12 text-center text-blue-600 font-mono">LOADING PRODUCTS...</div>
      ) : isError ? (
        <div className="glass-panel p-12 text-center text-red-500">
          Error loading products: {error.message}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-500 text-sm">
          No products match your criteria.
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-x-auto border border-slate-250 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">SKU / Name</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Financials</th>
                <th className="px-6 py-4">Stock (Reserved / Free to Use)</th>
                <th className="px-6 py-4">Replenishment</th>
                {canManage && <th className="px-6 py-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredProducts.map((product) => {
                const isShortage = product.freeToUse <= 0;
                return (
                  <tr key={product._id} className="hover:bg-slate-50/50 transition-colors">
                    {/* SKU & Name */}
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900">{product.name}</div>
                      <div className="text-[11px] font-mono text-blue-600 font-medium mt-0.5">{product.sku}</div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium ${
                        product.category === 'Finished Good'
                          ? 'bg-purple-50 text-purple-700 border border-purple-100'
                          : product.category === 'Raw Material'
                          ? 'bg-amber-50 text-amber-700 border border-amber-100'
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {product.category}
                      </span>
                    </td>

                    {/* Financials */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <span className="text-slate-900 flex items-center gap-1">
                          <Coins size={12} className="text-blue-500" />
                          ₹{product.salesPrice.toFixed(2)} <span className="text-[10px] text-slate-500">(Sales)</span>
                        </span>
                        <span className="text-xs text-slate-500 mt-0.5">
                          Cost: ₹{product.costPrice.toFixed(2)}
                        </span>
                      </div>
                    </td>

                    {/* Stock Status */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-amber-600">{product.reserved}</span>
                          <span className="text-[10px] text-slate-500">Reserved</span>
                        </div>
                        <div className="text-slate-300 font-light">/</div>
                        <div className="flex flex-col">
                          <span className={`font-semibold ${isShortage ? 'text-red-600' : 'text-emerald-600'}`}>
                            {product.freeToUse}
                          </span>
                          <span className="text-[10px] text-slate-500">Free to Use</span>
                        </div>
                        {isShortage && (
                          <AlertTriangle size={14} className="text-red-500" title="Low stock warning" />
                        )}
                      </div>
                    </td>

                    {/* Replenishment Settings */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-xs text-slate-900">
                            {product.procurementStrategy}
                          </span>
                          {product.procureOnDemand && (
                            <span className="text-[9px] uppercase font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                              Auto
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 mt-0.5">
                          {product.procurementType} {product.vendor ? `(${product.vendor})` : ''}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    {canManage && (
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleOpenAdjust(product)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-2.5 py-1 rounded-lg text-xs font-semibold border border-blue-200 transition-all"
                            title="Adjust Stock Levels"
                          >
                            Adjust Stock
                          </button>
                          <button
                            onClick={() => handleOpenEdit(product)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                            title="Edit Specs"
                          >
                            <Edit2 size={15} />
                          </button>
                          {canDelete && (
                            <button
                              onClick={() => handleDelete(product._id, product.name)}
                              className="p-1.5 rounded-lg text-red-500 hover:text-red-700 hover:bg-red-50 transition-all"
                              title="Delete Product"
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Add New Product</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex gap-2 items-center">
                  <AlertTriangle size={14} /> {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">SKU *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. SKU-WOOD-LEG"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="glass-input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Oak Wood Leg"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="glass-input w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 font-semibold mb-1">Description</label>
                <textarea
                  placeholder="Specifications, size, dimensions..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="glass-input w-full text-sm h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="glass-input w-full text-sm"
                  >
                    <option value="Raw Material">Raw Material</option>
                    <option value="Component">Component</option>
                    <option value="Finished Good">Finished Good</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">Initial Stock (Free to Use) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.freeToUse}
                    onChange={(e) => setFormData({ ...formData, freeToUse: parseInt(e.target.value) || 0 })}
                    className="glass-input w-full text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">Sales Price *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.salesPrice}
                    onChange={(e) => setFormData({ ...formData, salesPrice: parseFloat(e.target.value) || 0 })}
                    className="glass-input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">Cost Price *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="glass-input w-full text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-blue-600 tracking-wider uppercase">Procurement Strategy</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 font-semibold mb-1">Strategy Type *</label>
                    <select
                      value={formData.procurementStrategy}
                      onChange={(e) => setFormData({ ...formData, procurementStrategy: e.target.value })}
                      className="glass-input w-full text-sm"
                    >
                      <option value="MTS">MTS (Make To Stock)</option>
                      <option value="MTO">MTO (Make To Order)</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600 text-xs">
                      <input
                        type="checkbox"
                        checked={formData.procureOnDemand}
                        onChange={(e) => setFormData({ ...formData, procureOnDemand: e.target.checked })}
                        className="rounded bg-slate-50 border-slate-300 text-blue-600 focus:ring-blue-100 focus:ring-2 w-4 h-4"
                      />
                      Procure on Demand
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 font-semibold mb-1">Procurement Method</label>
                    <select
                      value={formData.procurementType}
                      onChange={(e) => setFormData({ ...formData, procurementType: e.target.value })}
                      className="glass-input w-full text-sm"
                    >
                      <option value="Purchase">Purchase (Buy from Vendor)</option>
                      <option value="Manufacturing">Manufacturing (Build via BoM)</option>
                    </select>
                  </div>
                  {formData.procurementType === 'Purchase' ? (
                    <div>
                      <label className="block text-xs text-slate-600 font-semibold mb-1">Preferred Vendor</label>
                      <input
                        type="text"
                        placeholder="e.g. Apex Timber Ltd."
                        value={formData.vendor}
                        onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                        className="glass-input w-full text-sm"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-slate-600 font-semibold mb-1">BoM Link</label>
                      <input
                        type="text"
                        disabled
                        placeholder="Linked automatically in Phase 3"
                        className="glass-input w-full text-sm bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="glass-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="glass-btn-primary text-xs flex items-center gap-2"
                >
                  {createMutation.isPending ? 'Saving...' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Edit Product: <span className="text-blue-600">{formData.name}</span></h3>
              <button onClick={() => setShowEditModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex gap-2 items-center">
                  <AlertTriangle size={14} /> {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">SKU (Immutable)</label>
                  <input
                    type="text"
                    disabled
                    value={formData.sku}
                    className="glass-input w-full text-sm bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="glass-input w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 font-semibold mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="glass-input w-full text-sm h-16 resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="glass-input w-full text-sm"
                  >
                    <option value="Raw Material">Raw Material</option>
                    <option value="Component">Component</option>
                    <option value="Finished Good">Finished Good</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">Stock levels (Managed via Adjustment)</label>
                  <input
                    type="text"
                    disabled
                    value={`${formData.freeToUse} Free / ${selectedProduct?.reserved || 0} Reserved`}
                    className="glass-input w-full text-sm bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">Sales Price *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.salesPrice}
                    onChange={(e) => setFormData({ ...formData, salesPrice: parseFloat(e.target.value) || 0 })}
                    className="glass-input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-600 font-semibold mb-1">Cost Price *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    required
                    value={formData.costPrice}
                    onChange={(e) => setFormData({ ...formData, costPrice: parseFloat(e.target.value) || 0 })}
                    className="glass-input w-full text-sm"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 space-y-4">
                <h4 className="text-xs font-bold text-blue-600 tracking-wider uppercase">Procurement Strategy</h4>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 font-semibold mb-1">Strategy Type *</label>
                    <select
                      value={formData.procurementStrategy}
                      onChange={(e) => setFormData({ ...formData, procurementStrategy: e.target.value })}
                      className="glass-input w-full text-sm"
                    >
                      <option value="MTS">MTS (Make To Stock)</option>
                      <option value="MTO">MTO (Make To Order)</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-6">
                    <label className="flex items-center gap-2 cursor-pointer text-slate-600 text-xs">
                      <input
                        type="checkbox"
                        checked={formData.procureOnDemand}
                        onChange={(e) => setFormData({ ...formData, procureOnDemand: e.target.checked })}
                        className="rounded bg-slate-50 border-slate-300 text-blue-600 focus:ring-blue-100 focus:ring-2 w-4 h-4"
                      />
                      Procure on Demand
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-600 font-semibold mb-1">Procurement Method</label>
                    <select
                      value={formData.procurementType}
                      onChange={(e) => setFormData({ ...formData, procurementType: e.target.value })}
                      className="glass-input w-full text-sm"
                    >
                      <option value="Purchase">Purchase (Buy from Vendor)</option>
                      <option value="Manufacturing">Manufacturing (Build via BoM)</option>
                    </select>
                  </div>
                  {formData.procurementType === 'Purchase' ? (
                    <div>
                      <label className="block text-xs text-slate-600 font-semibold mb-1">Preferred Vendor</label>
                      <input
                        type="text"
                        placeholder="Vendor name"
                        value={formData.vendor}
                        onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
                        className="glass-input w-full text-sm"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs text-slate-600 font-semibold mb-1">BoM Link</label>
                      <input
                        type="text"
                        disabled
                        placeholder="Linked automatically in Phase 3"
                        className="glass-input w-full text-sm bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed"
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="glass-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="glass-btn-primary text-xs flex items-center gap-2"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Update Specifications'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ADJUST STOCK MODAL */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Warehouse size={18} className="text-blue-600" />
                Adjust Stock: {selectedProduct?.name}
              </h3>
              <button onClick={() => setShowAdjustModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex gap-2 items-center">
                  <AlertTriangle size={14} /> {errorMessage}
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Current Free to Use:</span>
                  <span className="font-bold text-blue-600">{selectedProduct?.freeToUse} Units</span>
                </div>
                <div className="flex justify-between text-xs border-t border-slate-150 pt-1.5">
                  <span className="text-slate-500">Expected New Free to Use:</span>
                  <span className={`font-bold ${
                    (selectedProduct?.freeToUse || 0) + adjustData.quantityChange < 0
                      ? 'text-red-600'
                      : 'text-emerald-600'
                  }`}>
                    {(selectedProduct?.freeToUse || 0) + adjustData.quantityChange} Units
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 font-semibold mb-1">
                  Quantity Change * (positive to add, negative to subtract)
                </label>
                <input
                  type="number"
                  required
                  placeholder="e.g. 50 or -15"
                  value={adjustData.quantityChange || ''}
                  onChange={(e) => setAdjustData({ ...adjustData, quantityChange: parseInt(e.target.value) || 0 })}
                  className="glass-input w-full text-sm font-mono"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-600 font-semibold mb-1">Reason / Notes *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Audit reconciliation, damaged items"
                  value={adjustData.notes}
                  onChange={(e) => setAdjustData({ ...adjustData, notes: e.target.value })}
                  className="glass-input w-full text-sm"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="glass-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending || adjustData.quantityChange === 0 || !adjustData.notes.trim()}
                  className="glass-btn-primary text-xs flex items-center gap-2"
                >
                  {adjustMutation.isPending ? 'Adjusting...' : 'Save Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Products;
