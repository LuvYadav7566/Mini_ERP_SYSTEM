import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getSalesOrders,
  createSalesOrder,
  updateSalesOrder,
  confirmSalesOrder,
  deliverSalesOrderGoods,
  cancelSalesOrder,
} from '../services/salesService';
import { getProducts } from '../services/productService';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  X,
  Filter,
  Eye,
  Truck,
  CheckCircle,
  Ban,
  AlertTriangle,
  Coins,
  PlusCircle,
  MinusCircle,
  ShoppingBag,
} from 'lucide-react';

const Sales = () => {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  const canManage = hasRole(['Admin', 'Business Owner', 'Sales User']);
  const canDeliver = hasRole(['Admin', 'Business Owner', 'Inventory Manager', 'Sales User']);

  // Page States
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedSO, setSelectedSO] = useState(null);

  // Modal States
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showDeliverModal, setShowDeliverModal] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');

  // Form States
  const [formData, setFormData] = useState({
    customerName: '',
    items: [{ product: '', quantity: 1, salesPrice: 0 }],
    notes: '',
  });

  const [deliverItems, setDeliverItems] = useState([]); // Array of { product, sku, name, quantity, quantityDelivered, qtyToDeliver, onHand }

  // Queries
  const { data: salesOrders = [], isLoading: salesLoading } = useQuery({
    queryKey: ['salesOrders'],
    queryFn: getSalesOrders,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createSalesOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowAddModal(false);
      resetForm();
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create Sales Order');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => updateSalesOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      setShowEditModal(false);
      setSelectedSO(null);
      resetForm();
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to update Sales Order');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: confirmSalesOrder,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['manufacturingOrders'] });
      if (selectedSO?._id === data._id) {
        setSelectedSO(data);
      }
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to confirm Sales Order');
    },
  });

  const deliverMutation = useMutation({
    mutationFn: ({ id, data }) => deliverSalesOrderGoods(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      setShowDeliverModal(false);
      setShowDetailsModal(false);
      setSelectedSO(null);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to deliver goods');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelSalesOrder,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['salesOrders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (selectedSO?._id === data._id) {
        setSelectedSO(data);
      }
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to cancel Sales Order');
    },
  });

  // Form helpers
  const resetForm = () => {
    setFormData({
      customerName: '',
      items: [{ product: '', quantity: 1, salesPrice: 0 }],
      notes: '',
    });
    setErrorMessage('');
  };

  const handleAddItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { product: '', quantity: 1, salesPrice: 0 }],
    });
  };

  const handleRemoveItem = (index) => {
    const newItems = formData.items.filter((_, idx) => idx !== index);
    setFormData({ ...formData, items: newItems.length ? newItems : [{ product: '', quantity: 1, salesPrice: 0 }] });
  };

  const handleItemChange = (index, field, value) => {
    const newItems = [...formData.items];
    if (field === 'product') {
      newItems[index].product = value;
      const prod = products.find((p) => p._id === value);
      if (prod) {
        newItems[index].salesPrice = prod.salesPrice;
      }
    } else if (field === 'quantity') {
      newItems[index].quantity = parseInt(value) || 0;
    } else if (field === 'salesPrice') {
      newItems[index].salesPrice = parseFloat(value) || 0;
    }
    setFormData({ ...formData, items: newItems });
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!formData.customerName) {
      setErrorMessage('Customer name is required');
      return;
    }
    const invalidItem = formData.items.find((i) => !i.product || i.quantity <= 0);
    if (invalidItem) {
      setErrorMessage('Please fill in all product selections and ensure quantities are greater than zero');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleOpenEdit = (so) => {
    setSelectedSO(so);
    setFormData({
      customerName: so.customerName,
      items: so.items.map((i) => ({
        product: i.product._id,
        quantity: i.quantity,
        salesPrice: i.salesPrice,
      })),
      notes: so.notes || '',
    });
    setShowEditModal(true);
  };

  const handleEditSubmit = (e) => {
    e.preventDefault();
    updateMutation.mutate({ id: selectedSO._id, data: formData });
  };

  const handleOpenDeliver = (so) => {
    setSelectedSO(so);
    const items = so.items.map((item) => {
      // Find latest product specs to verify physical stock onHand
      const currentProd = products.find((p) => p._id === item.product._id);
      const onHand = currentProd ? currentProd.onHand : 0;
      const remainder = item.quantity - item.quantityDelivered;
      return {
        product: item.product._id,
        sku: item.product.sku,
        name: item.product.name,
        quantity: item.quantity,
        quantityDelivered: item.quantityDelivered,
        qtyToDeliver: Math.min(remainder, onHand), // Default to either what is needed or what is physically on hand
        onHand,
      };
    });
    setDeliverItems(items);
    setErrorMessage('');
    setShowDeliverModal(true);
  };

  const handleDeliverQtyChange = (index, val) => {
    const items = [...deliverItems];
    const qty = parseInt(val) || 0;
    const maxNeeded = items[index].quantity - items[index].quantityDelivered;
    const maxOnHand = items[index].onHand;
    const limit = Math.min(maxNeeded, maxOnHand);

    if (qty > limit) {
      items[index].qtyToDeliver = limit;
    } else if (qty < 0) {
      items[index].qtyToDeliver = 0;
    } else {
      items[index].qtyToDeliver = qty;
    }
    setDeliverItems(items);
  };

  const handleDeliverSubmit = (e) => {
    e.preventDefault();
    const payload = {
      itemsDelivered: deliverItems
        .filter((i) => i.qtyToDeliver > 0)
        .map((i) => ({
          product: i.product,
          quantityDelivered: i.qtyToDeliver,
        })),
    };

    if (payload.itemsDelivered.length === 0) {
      setErrorMessage('Please specify a delivery quantity greater than zero. Note: Insufficient physical stock will block delivery.');
      return;
    }

    // Verify all item changes don't exceed physical stock
    for (const item of payload.itemsDelivered) {
      const spec = deliverItems.find(i => i.product === item.product);
      if (spec && spec.onHand < item.quantityDelivered) {
        setErrorMessage(`Cannot deliver ${item.quantityDelivered} units of ${spec.name}: Only ${spec.onHand} units physically available.`);
        return;
      }
    }

    deliverMutation.mutate({ id: selectedSO._id, data: payload });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
      case 'Confirmed':
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
      case 'Partially Delivered':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Fully Delivered':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default: // Cancelled
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    }
  };

  const filteredOrders = salesOrders.filter((so) => {
    const matchesSearch =
      so.soNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      so.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || so.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout title="Sales & Orders">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingBag className="text-blue-600" size={22} /> Customer Sales Orders
          </h2>
          <p className="text-xs text-slate-500">
            Process sales, confirm allocations, check MTS/MTO statuses, and dispatch shipments.
          </p>
        </div>
        {canManage && (
          <button
            onClick={() => {
              resetForm();
              setShowAddModal(true);
            }}
            className="glass-btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus size={15} /> Raise SO
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by SO Number or Customer..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-blue-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Partially Delivered">Partially Delivered</option>
            <option value="Fully Delivered">Fully Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders Table */}
      {salesLoading ? (
        <div className="glass-panel p-12 text-center text-blue-600 font-mono">LOADING SALES ORDERS...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-500 text-sm">
          No sales orders found.
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-x-auto border border-slate-250 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">SO Number</th>
                <th className="px-6 py-4">Customer Name</th>
                <th className="px-6 py-4">Items / Total Value</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Date Confirmed</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredOrders.map((so) => {
                return (
                  <tr key={so._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-blue-600">
                      {so.soNumber}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {so.customerName}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-900 flex items-center gap-1">
                        <Coins size={13} className="text-blue-500" />
                        ${so.totalAmount.toFixed(2)}
                      </div>
                      <div className="text-xs text-slate-550 mt-0.5">
                        {so.items.length} Product types ordered
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${getStatusBadge(so.status)}`}>
                        {so.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {so.confirmedAt ? (
                        <>
                          {new Date(so.confirmedAt).toLocaleDateString()} at{' '}
                          {new Date(so.confirmedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </>
                      ) : (
                        <span className="italic text-slate-400">Unconfirmed Draft</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setSelectedSO(so);
                            setShowDetailsModal(true);
                          }}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-700 p-1.5 rounded-lg border border-slate-200 transition-all"
                          title="View Order Details"
                        >
                          <Eye size={15} />
                        </button>
                        {so.status === 'Draft' && canManage && (
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                if (window.confirm(`Confirm Sales Order ${so.soNumber}? This will reserve stock and trigger automatic PO/MO for shortages.`)) {
                                  confirmMutation.mutate(so._id);
                                }
                              }}
                              className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-2.5 py-1 rounded-lg text-xs font-semibold border border-blue-200 transition-all flex items-center gap-1"
                              title="Confirm SO"
                            >
                              <CheckCircle size={13} /> Confirm
                            </button>
                            <button
                              onClick={() => handleOpenEdit(so)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-slate-100 transition-colors"
                              title="Edit SO"
                            >
                              <Edit2 size={15} />
                            </button>
                          </div>
                        )}
                        {(so.status === 'Confirmed' || so.status === 'Partially Delivered') && canDeliver && (
                          <button
                            onClick={() => handleOpenDeliver(so)}
                            className="bg-blue-50 hover:bg-blue-100 text-blue-600 px-2.5 py-1 rounded-lg text-xs font-semibold border border-blue-200 transition-all flex items-center gap-1"
                            title="Deliver Goods"
                          >
                            <Truck size={13} /> Ship Goods
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE SALES ORDER MODAL */}
      {/* CREATE SALES ORDER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Raise Customer Sales Order</h3>
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

              <div>
                <label className="block text-xs text-slate-600 font-semibold mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grand Plaza Hotels"
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="glass-input w-full text-sm"
                />
              </div>

              {/* Items row */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Ordered Products</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold"
                  >
                    <PlusCircle size={14} /> Add Line
                  </button>
                </div>

                <div className="space-y-2.5">
                  {formData.items.map((item, index) => {
                    return (
                      <div key={index} className="flex gap-3 items-end bg-slate-50/50 p-3 rounded-xl border border-slate-200">
                        <div className="flex-1">
                          <label className="block text-[10px] text-slate-600 font-semibold mb-1">Product *</label>
                          <select
                            value={item.product}
                            required
                            onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                            className="glass-input w-full text-xs"
                          >
                            <option value="">-- Select --</option>
                            {products.map((p) => (
                              <option key={p._id} value={p._id}>
                                [{p.sku}] {p.name}
                              </option>
                            ))}
                          </select>
                          {item.product && (
                            <div className="text-[10px] text-slate-500 mt-1 flex gap-3 px-1">
                              <span>Free: <strong className="text-emerald-600 font-mono font-bold">{products.find(p => p._id === item.product)?.freeToUse ?? 0}</strong></span>
                              <span>Reserved: <strong className="text-amber-600 font-mono font-bold">{products.find(p => p._id === item.product)?.reserved ?? 0}</strong></span>
                            </div>
                          )}
                        </div>
                        <div className="w-24">
                          <label className="block text-[10px] text-slate-600 font-semibold mb-1">Quantity *</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="glass-input w-full text-xs font-mono"
                          />
                        </div>
                        <div className="w-28">
                          <label className="block text-[10px] text-slate-600 font-semibold mb-1">Sales Price *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={item.salesPrice}
                            onChange={(e) => handleItemChange(index, 'salesPrice', e.target.value)}
                            className="glass-input w-full text-xs font-mono"
                          />
                        </div>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-500 hover:text-red-700 p-2.5"
                          >
                            <MinusCircle size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 font-semibold mb-1">Special Delivery Notes</label>
                <textarea
                  placeholder="Shipping contact person, gate codes, delivery timelines..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="glass-input w-full text-sm h-16 resize-none"
                />
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
                  className="glass-btn-primary text-xs"
                >
                  {createMutation.isPending ? 'Generating...' : 'Save Draft SO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT SALES ORDER MODAL */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Edit Draft SO: <span className="text-blue-600">{selectedSO?.soNumber}</span></h3>
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

              <div>
                <label className="block text-xs text-slate-600 font-semibold mb-1">Customer Name *</label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  className="glass-input w-full text-sm"
                />
              </div>

              {/* Items row */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Ordered Products</h4>
                  <button
                    type="button"
                    onClick={handleAddItem}
                    className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 font-semibold"
                  >
                    <PlusCircle size={14} /> Add Line
                  </button>
                </div>

                <div className="space-y-2.5">
                  {formData.items.map((item, index) => {
                    return (
                      <div key={index} className="flex gap-3 items-end bg-slate-50/50 p-3 rounded-xl border border-slate-200">
                        <div className="flex-1">
                          <label className="block text-[10px] text-slate-600 font-semibold mb-1">Product *</label>
                          <select
                            value={item.product}
                            required
                            onChange={(e) => handleItemChange(index, 'product', e.target.value)}
                            className="glass-input w-full text-xs"
                          >
                            <option value="">-- Select --</option>
                            {products.map((p) => (
                              <option key={p._id} value={p._id}>
                                [{p.sku}] {p.name}
                              </option>
                            ))}
                          </select>
                          {item.product && (
                            <div className="text-[10px] text-slate-500 mt-1 flex gap-3 px-1">
                              <span>Free: <strong className="text-emerald-600 font-mono font-bold">{products.find(p => p._id === item.product)?.freeToUse ?? 0}</strong></span>
                              <span>Reserved: <strong className="text-amber-600 font-mono font-bold">{products.find(p => p._id === item.product)?.reserved ?? 0}</strong></span>
                            </div>
                          )}
                        </div>
                        <div className="w-24">
                          <label className="block text-[10px] text-slate-600 font-semibold mb-1">Quantity *</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                            className="glass-input w-full text-xs font-mono"
                          />
                        </div>
                        <div className="w-28">
                          <label className="block text-[10px] text-slate-600 font-semibold mb-1">Sales Price *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={item.salesPrice}
                            onChange={(e) => handleItemChange(index, 'salesPrice', e.target.value)}
                            className="glass-input w-full text-xs font-mono"
                          />
                        </div>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(index)}
                            className="text-red-500 hover:text-red-700 p-2.5"
                          >
                            <MinusCircle size={16} />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-600 font-semibold mb-1">Special Delivery Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="glass-input w-full text-sm h-16 resize-none"
                />
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
                  className="glass-btn-primary text-xs"
                >
                  {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && selectedSO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <span>Sales Order:</span>
                <span className="text-blue-600 font-mono">{selectedSO.soNumber}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${getStatusBadge(selectedSO.status)}`}>
                  {selectedSO.status}
                </span>
              </h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto font-sans">
              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-600 text-xs">
                <div>
                  <h5 className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Customer</h5>
                  <div className="font-bold text-slate-900 text-sm">{selectedSO.customerName}</div>
                </div>
                <div>
                  <h5 className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Order Details</h5>
                  <div>Total: <span className="font-bold text-slate-900">${selectedSO.totalAmount.toFixed(2)}</span></div>
                  <div>Created By: {selectedSO.createdBy?.username} ({selectedSO.createdBy?.role})</div>
                </div>
                <div>
                  <h5 className="font-bold text-slate-500 uppercase tracking-wider text-[10px] mb-1">Timeline</h5>
                  <div>Created: {new Date(selectedSO.createdAt).toLocaleDateString()}</div>
                  {selectedSO.confirmedAt && (
                    <div>Confirmed: {new Date(selectedSO.confirmedAt).toLocaleDateString()}</div>
                  )}
                  {selectedSO.completedAt && (
                    <div>Completed: {new Date(selectedSO.completedAt).toLocaleDateString()}</div>
                  )}
                </div>
              </div>

              {/* Items checklist */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider">Allocation & Inbound Status</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                        <th className="px-4 py-3">Product Name</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3 text-right">Ordered Qty</th>
                        <th className="px-4 py-3 text-right">Reserved</th>
                        <th className="px-4 py-3 text-right">Free-to-Use</th>
                        <th className="px-4 py-3 text-right">Shipped Qty</th>
                        <th className="px-4 py-3 text-right">Allocation Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedSO.items.map((item, idx) => {
                        const productDetail = products.find(p => p._id === item.product._id);
                        const freeToUse = productDetail ? productDetail.freeToUse : 0;

                        // Shortage condition on draft confirmation:
                        const shortage = item.quantity - freeToUse;
                        const isShortage = selectedSO.status === 'Draft' && shortage > 0;

                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-medium text-slate-900">{item.product?.name}</td>
                            <td className="px-4 py-3 font-mono text-blue-600 font-medium">{item.product?.sku}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{item.quantity}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-500">{productDetail?.reserved || 0}</td>
                            <td className="px-4 py-3 text-right font-mono text-slate-500">{freeToUse}</td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-emerald-600">
                              {item.quantityDelivered} / {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold">
                              {selectedSO.status === 'Draft' ? (
                                isShortage ? (
                                  <span className="text-amber-600 flex items-center gap-1 justify-end" title="Triggers Draft PO/MO on confirmation">
                                    <AlertTriangle size={12} /> Auto-Procure ({shortage} units)
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 flex items-center gap-1 justify-end">
                                    <Check size={12} /> Instantly Available
                                  </span>
                                )
                              ) : (
                                <span className={`px-2 py-0.5 rounded text-[10px] border ${
                                  item.quantityDelivered === item.quantity
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                                    : 'bg-blue-50 text-blue-700 border-blue-100'
                                }`}>
                                  {item.quantityDelivered === item.quantity ? 'Shipped' : 'Allocated'}
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedSO.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Delivery Instructions</h5>
                  <p className="text-xs text-slate-600 italic">{selectedSO.notes}</p>
                </div>
              )}

              {/* Status Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                <div>
                  {selectedSO.status !== 'Fully Delivered' && selectedSO.status !== 'Cancelled' && canManage && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this customer Sales Order? Allocated stock reservations will be released.')) {
                          cancelMutation.mutate(selectedSO._id);
                        }
                      }}
                      className="glass-btn-danger text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
                    >
                      <Ban size={14} /> Cancel Order
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowDetailsModal(false)}
                    className="glass-btn-secondary text-xs"
                  >
                    Close
                  </button>
                  {selectedSO.status === 'Draft' && canManage && (
                    <button
                      onClick={() => {
                        if (window.confirm('Confirming this Sales Order locks down stock allocations and triggers automatic procurement POs/MOs for shortages. Proceed?')) {
                          confirmMutation.mutate(selectedSO._id);
                        }
                      }}
                      className="glass-btn-primary text-xs font-semibold px-5 py-2 flex items-center gap-1.5"
                    >
                      <CheckCircle size={14} /> Confirm Sales Order
                    </button>
                  )}
                  {(selectedSO.status === 'Confirmed' || selectedSO.status === 'Partially Delivered') && canDeliver && (
                    <button
                      onClick={() => handleOpenDeliver(selectedSO)}
                      className="glass-btn-primary text-xs font-semibold px-5 py-2 flex items-center gap-1.5"
                    >
                      <Truck size={14} /> Dispatch Delivery
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELIVER SHIPMENT MODAL */}
      {showDeliverModal && selectedSO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Truck size={18} className="text-blue-600" />
                <span>Dispatch Shipment: {selectedSO.soNumber}</span>
              </h3>
              <button onClick={() => setShowDeliverModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleDeliverSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs flex gap-2 items-center">
                  <AlertTriangle size={14} /> {errorMessage}
                </div>
              )}

              <p className="text-xs text-slate-550">
                Input the quantity dispatched to the customer in this package. Stock levels will decrease on hand.
              </p>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {deliverItems.map((item, idx) => {
                  const maxNeeded = item.quantity - item.quantityDelivered;
                  const canShip = Math.min(maxNeeded, item.onHand);
                  const isBlocked = item.onHand <= 0 && maxNeeded > 0;

                  return (
                    <div key={idx} className="bg-slate-50/50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-semibold text-slate-800">{item.name}</div>
                          <div className="text-[10px] font-mono text-blue-600 font-medium">{item.sku}</div>
                        </div>
                        <div className="text-right text-xs">
                          <div className="text-slate-500">
                            Shipped: <span className="font-bold text-slate-800">{item.quantityDelivered} / {item.quantity}</span>
                          </div>
                          <div className="text-[10px] text-blue-600 font-mono font-medium mt-0.5">
                            Physical Stock: {item.onHand} Units
                          </div>
                        </div>
                      </div>

                      {maxNeeded === 0 ? (
                        <div className="text-xs text-emerald-600 font-semibold flex items-center gap-1">
                          <Check size={14} /> Fully Shipped & Delivered
                        </div>
                      ) : isBlocked ? (
                        <div className="p-2 bg-red-50 border border-red-155 text-[11px] text-red-650 rounded-lg flex items-center gap-1.5">
                          <AlertTriangle size={12} /> Out of Stock. Finish auto-PO or MO to receive inventory.
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <label className="text-[11px] text-slate-600 font-semibold whitespace-nowrap">
                            Quantity Dispatched:
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={canShip}
                            value={item.qtyToDeliver}
                            onChange={(e) => handleDeliverQtyChange(idx, e.target.value)}
                            className="glass-input flex-1 text-xs py-1.5 font-mono text-right"
                          />
                          <span className="text-[11px] text-slate-400 font-mono">
                            max +{canShip}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowDeliverModal(false)}
                  className="glass-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={deliverMutation.isPending}
                  className="glass-btn-primary text-xs flex items-center gap-1.5"
                >
                  {deliverMutation.isPending ? 'Logging dispatch...' : 'Confirm Shipment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Sales;
