import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getVendors, createVendor, updateVendor, deleteVendor } from '../services/vendorService';
import {
  getPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  confirmPurchaseOrder,
  receivePurchaseOrderGoods,
  cancelPurchaseOrder,
} from '../services/purchaseService';
import { getProducts } from '../services/productService';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Check,
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
  Users,
  ShoppingCart,
} from 'lucide-react';

const Purchase = () => {
  const { hasRole, user } = useAuth();
  const queryClient = useQueryClient();

  // Access control
  const canManagePO = hasRole(['Admin', 'Business Owner', 'Purchase User']);
  const canReceivePO = hasRole(['Admin', 'Business Owner', 'Inventory Manager', 'Purchase User']);
  const canDeleteVendor = hasRole(['Admin', 'Business Owner']);

  // Tabs
  const [activeTab, setActiveTab] = useState('orders'); // 'orders' or 'vendors'

  // Common Search and Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Selected Item details
  const [selectedPO, setSelectedPO] = useState(null);
  const [selectedVendor, setSelectedVendor] = useState(null);

  // Modal Triggers
  const [showAddPOModal, setShowAddPOModal] = useState(false);
  const [showEditPOModal, setShowEditPOModal] = useState(false);
  const [showPODetailsModal, setShowPODetailsModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  
  const [showAddVendorModal, setShowAddVendorModal] = useState(false);
  const [showEditVendorModal, setShowEditVendorModal] = useState(false);

  // Errors
  const [errorMessage, setErrorMessage] = useState('');

  // Queries
  const { data: purchaseOrders = [], isLoading: poLoading } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: getPurchaseOrders,
  });

  const { data: vendors = [], isLoading: vendorsLoading } = useQuery({
    queryKey: ['vendors'],
    queryFn: getVendors,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  // Vendor Form state
  const [vendorForm, setVendorForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    address: '',
    notes: '',
  });

  // PO Form state
  const [poForm, setPoForm] = useState({
    vendor: '',
    items: [{ product: '', quantity: 1, costPrice: 0 }],
    notes: '',
  });

  // Goods receiving state
  const [receiveItems, setReceiveItems] = useState([]); // Array of { product, sku, name, quantity, quantityReceived, qtyToReceive }

  // Vendor Mutations
  const createVendorMutation = useMutation({
    mutationFn: createVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setShowAddVendorModal(false);
      resetVendorForm();
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create vendor');
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: ({ id, data }) => updateVendor(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      setShowEditVendorModal(false);
      setSelectedVendor(null);
      resetVendorForm();
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to update vendor');
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: deleteVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to delete vendor');
    },
  });

  // PO Mutations
  const createPOMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowAddPOModal(false);
      resetPOForm();
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create Purchase Order');
    },
  });

  const updatePOMutation = useMutation({
    mutationFn: ({ id, data }) => updatePurchaseOrder(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      setShowEditPOModal(false);
      setSelectedPO(null);
      resetPOForm();
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to update Purchase Order');
    },
  });

  const confirmPOMutation = useMutation({
    mutationFn: confirmPurchaseOrder,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      // Update details modal view if open
      if (selectedPO?._id === data._id) {
        setSelectedPO(data);
      }
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to confirm Purchase Order');
    },
  });

  const receivePOMutation = useMutation({
    mutationFn: ({ id, data }) => receivePurchaseOrderGoods(id, data),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowReceiveModal(false);
      setShowPODetailsModal(false);
      setSelectedPO(null);
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to receive goods');
    },
  });

  const cancelPOMutation = useMutation({
    mutationFn: cancelPurchaseOrder,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['purchaseOrders'] });
      if (selectedPO?._id === data._id) {
        setSelectedPO(data);
      }
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to cancel Purchase Order');
    },
  });

  // Resets
  const resetVendorForm = () => {
    setVendorForm({ name: '', contactPerson: '', email: '', phone: '', address: '', notes: '' });
    setErrorMessage('');
  };

  const resetPOForm = () => {
    setPoForm({
      vendor: '',
      items: [{ product: '', quantity: 1, costPrice: 0 }],
      notes: '',
    });
    setErrorMessage('');
  };

  // Vendor Handlers
  const handleVendorCreateSubmit = (e) => {
    e.preventDefault();
    createVendorMutation.mutate(vendorForm);
  };

  const handleVendorEditSubmit = (e) => {
    e.preventDefault();
    updateVendorMutation.mutate({ id: selectedVendor._id, data: vendorForm });
  };

  const handleOpenEditVendor = (v) => {
    setSelectedVendor(v);
    setVendorForm({
      name: v.name,
      contactPerson: v.contactPerson || '',
      email: v.email || '',
      phone: v.phone || '',
      address: v.address || '',
      notes: v.notes || '',
    });
    setShowEditVendorModal(true);
  };

  const handleDeleteVendor = (id, name) => {
    if (window.confirm(`Are you sure you want to delete vendor "${name}"?`)) {
      deleteVendorMutation.mutate(id);
    }
  };

  // PO Form helper logic
  const handleAddPOItem = () => {
    setPoForm({
      ...poForm,
      items: [...poForm.items, { product: '', quantity: 1, costPrice: 0 }],
    });
  };

  const handleRemovePOItem = (index) => {
    const newItems = poForm.items.filter((_, idx) => idx !== index);
    setPoForm({ ...poForm, items: newItems.length ? newItems : [{ product: '', quantity: 1, costPrice: 0 }] });
  };

  const handlePOItemChange = (index, field, value) => {
    const newItems = [...poForm.items];
    if (field === 'product') {
      newItems[index].product = value;
      // Auto-fill cost price from selected product
      const prod = products.find((p) => p._id === value);
      if (prod) {
        newItems[index].costPrice = prod.costPrice;
      }
    } else if (field === 'quantity') {
      newItems[index].quantity = parseInt(value) || 0;
    } else if (field === 'costPrice') {
      newItems[index].costPrice = parseFloat(value) || 0;
    }
    setPoForm({ ...poForm, items: newItems });
  };

  const handlePOCreateSubmit = (e) => {
    e.preventDefault();
    if (!poForm.vendor) {
      setErrorMessage('Please select a vendor');
      return;
    }
    const invalidItem = poForm.items.find((i) => !i.product || i.quantity <= 0);
    if (invalidItem) {
      setErrorMessage('Please fill in all product selections and ensure quantities are greater than zero');
      return;
    }
    createPOMutation.mutate(poForm);
  };

  const handleOpenEditPO = (po) => {
    setSelectedPO(po);
    setPoForm({
      vendor: po.vendor._id,
      items: po.items.map((i) => ({
        product: i.product._id,
        quantity: i.quantity,
        costPrice: i.costPrice,
      })),
      notes: po.notes || '',
    });
    setShowEditPOModal(true);
  };

  const handlePOEditSubmit = (e) => {
    e.preventDefault();
    updatePOMutation.mutate({ id: selectedPO._id, data: poForm });
  };

  const handleOpenReceive = (po) => {
    setSelectedPO(po);
    const items = po.items.map((item) => ({
      product: item.product._id,
      sku: item.product.sku,
      name: item.product.name,
      quantity: item.quantity,
      quantityReceived: item.quantityReceived,
      qtyToReceive: item.quantity - item.quantityReceived, // Default to receive the remainder
    }));
    setReceiveItems(items);
    setErrorMessage('');
    setShowReceiveModal(true);
  };

  const handleReceiveQtyChange = (index, val) => {
    const items = [...receiveItems];
    const qty = parseInt(val) || 0;
    const maxAllowed = items[index].quantity - items[index].quantityReceived;
    if (qty > maxAllowed) {
      items[index].qtyToReceive = maxAllowed;
    } else if (qty < 0) {
      items[index].qtyToReceive = 0;
    } else {
      items[index].qtyToReceive = qty;
    }
    setReceiveItems(items);
  };

  const handleReceiveSubmit = (e) => {
    e.preventDefault();
    const payload = {
      itemsReceived: receiveItems
        .filter((i) => i.qtyToReceive > 0)
        .map((i) => ({
          product: i.product,
          quantityReceived: i.qtyToReceive,
        })),
    };

    if (payload.itemsReceived.length === 0) {
      setErrorMessage('Please input a quantity greater than zero for at least one item');
      return;
    }

    receivePOMutation.mutate({ id: selectedPO._id, data: payload });
  };

  // Status Badges coloring
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-500/10 text-slate-400 border border-slate-500/20';
      case 'Confirmed':
        return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
      case 'Partially Received':
        return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
      case 'Fully Received':
        return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default: // Cancelled
        return 'bg-rose-500/10 text-rose-400 border border-rose-500/20';
    }
  };

  // Filters
  const filteredOrders = purchaseOrders.filter((po) => {
    const matchesSearch =
      po.poNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.vendor?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || po.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const filteredVendors = vendors.filter((v) => {
    return (
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (v.contactPerson && v.contactPerson.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  });

  return (
    <Layout title="Procurement & Purchase">
      {/* Tab controls */}
      <div className="flex justify-between items-center border-b border-slate-800 pb-3">
        <div className="flex gap-4">
          <button
            onClick={() => {
              setActiveTab('orders');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold tracking-wide transition-all ${
              activeTab === 'orders'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingCart size={16} /> Purchase Orders
          </button>
          <button
            onClick={() => {
              setActiveTab('vendors');
              setSearchTerm('');
            }}
            className={`flex items-center gap-2 pb-3 text-sm font-semibold tracking-wide transition-all ${
              activeTab === 'vendors'
                ? 'text-cyan-400 border-b-2 border-cyan-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users size={16} /> Vendors List
          </button>
        </div>

        {activeTab === 'orders' && canManagePO && (
          <button
            onClick={() => {
              resetPOForm();
              setShowAddPOModal(true);
            }}
            className="glass-btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus size={15} /> Raise PO
          </button>
        )}

        {activeTab === 'vendors' && canManagePO && (
          <button
            onClick={() => {
              resetVendorForm();
              setShowAddVendorModal(true);
            }}
            className="glass-btn-primary text-xs flex items-center gap-1.5"
          >
            <Plus size={15} /> Add Vendor
          </button>
        )}
      </div>

      {/* SEARCH AND FILTERS */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder={
              activeTab === 'orders' ? 'Search by PO Number or Vendor...' : 'Search by Vendor Name...'
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/40 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        {activeTab === 'orders' && (
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-cyan-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-slate-950/40 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Confirmed">Confirmed</option>
              <option value="Partially Received">Partially Received</option>
              <option value="Fully Received">Fully Received</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>
        )}
      </div>

      {/* ORDERS TAB CONTENT */}
      {activeTab === 'orders' && (
        <>
          {poLoading ? (
            <div className="glass-panel p-12 text-center text-cyan-400 font-mono">LOADING ORDERS...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="glass-panel p-12 text-center text-slate-400 text-sm">
              No purchase orders found.
            </div>
          ) : (
            <div className="glass-panel rounded-xl overflow-x-auto border border-slate-800/80">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">PO Number</th>
                    <th className="px-6 py-4">Vendor</th>
                    <th className="px-6 py-4">Items / Total Value</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Raised Date</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
                  {filteredOrders.map((po) => {
                    return (
                      <tr key={po._id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="px-6 py-4 font-mono font-semibold text-cyan-400">
                          {po.poNumber}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold">{po.vendor?.name}</div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {po.vendor?.contactPerson || 'No contact'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-100 flex items-center gap-1">
                            <Coins size={13} className="text-cyan-400" />
                            ${po.totalAmount.toFixed(2)}
                          </div>
                          <div className="text-xs text-slate-400 mt-0.5">
                            {po.items.length} Product types ordered
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${getStatusBadge(po.status)}`}>
                            {po.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          {new Date(po.createdAt).toLocaleDateString()} at{' '}
                          {new Date(po.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setSelectedPO(po);
                                setShowPODetailsModal(true);
                              }}
                              className="bg-slate-800 hover:bg-slate-700 text-slate-200 p-1.5 rounded-lg border border-slate-750 transition-all"
                              title="View Order Details"
                            >
                              <Eye size={15} />
                            </button>
                            {po.status === 'Draft' && canManagePO && (
                              <button
                                onClick={() => handleOpenEditPO(po)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                                title="Edit PO"
                              >
                                <Edit2 size={15} />
                              </button>
                            )}
                            {(po.status === 'Confirmed' || po.status === 'Partially Received') && canReceivePO && (
                              <button
                                onClick={() => handleOpenReceive(po)}
                                className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 px-2.5 py-1 rounded-lg text-xs font-semibold border border-cyan-500/20 transition-all flex items-center gap-1"
                                title="Receive Items"
                              >
                                <Truck size={13} /> Receive
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
        </>
      )}

      {/* VENDORS TAB CONTENT */}
      {activeTab === 'vendors' && (
        <>
          {vendorsLoading ? (
            <div className="glass-panel p-12 text-center text-cyan-400 font-mono">LOADING VENDORS...</div>
          ) : filteredVendors.length === 0 ? (
            <div className="glass-panel p-12 text-center text-slate-400 text-sm">
              No vendors found.
            </div>
          ) : (
            <div className="glass-panel rounded-xl overflow-x-auto border border-slate-800/80">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-slate-900/40 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    <th className="px-6 py-4">Vendor Name</th>
                    <th className="px-6 py-4">Contact Person</th>
                    <th className="px-6 py-4">Contact Info</th>
                    <th className="px-6 py-4">Address</th>
                    {canManagePO && <th className="px-6 py-4 text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-sm text-slate-200">
                  {filteredVendors.map((v) => {
                    return (
                      <tr key={v._id} className="hover:bg-slate-800/10 transition-colors">
                        <td className="px-6 py-4 font-semibold text-slate-100">{v.name}</td>
                        <td className="px-6 py-4 text-slate-300">{v.contactPerson || 'N/A'}</td>
                        <td className="px-6 py-4 text-xs text-slate-400">
                          <div>{v.email || 'No Email'}</div>
                          <div className="mt-0.5 font-mono">{v.phone || 'No Phone'}</div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-400 max-w-[200px] truncate" title={v.address}>
                          {v.address || 'N/A'}
                        </td>
                        {canManagePO && (
                          <td className="px-6 py-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleOpenEditVendor(v)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                                title="Edit Vendor"
                              >
                                <Edit2 size={15} />
                              </button>
                              {canDeleteVendor && (
                                <button
                                  onClick={() => handleDeleteVendor(v._id, v.name)}
                                  className="p-1.5 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all"
                                  title="Delete Vendor"
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
        </>
      )}

      {/* CREATE VENDOR MODAL */}
      {showAddVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel-glow bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-slate-100">Add New Vendor</h3>
              <button onClick={() => setShowAddVendorModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleVendorCreateSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2 items-center">
                  <AlertTriangle size={14} /> {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Vendor Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Timber Land Co."
                  value={vendorForm.name}
                  onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                  className="glass-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Contact Person</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={vendorForm.contactPerson}
                  onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                  className="glass-input w-full text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="vendor@mail.com"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                    className="glass-input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    placeholder="+1 555-0199"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    className="glass-input w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Address</label>
                <input
                  type="text"
                  placeholder="Street address, city, zip"
                  value={vendorForm.address}
                  onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                  className="glass-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Notes</label>
                <textarea
                  placeholder="Terms, deliveries schedules, contract details..."
                  value={vendorForm.notes}
                  onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                  className="glass-input w-full text-sm h-16 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddVendorModal(false)}
                  className="glass-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createVendorMutation.isPending}
                  className="glass-btn-primary text-xs"
                >
                  {createVendorMutation.isPending ? 'Saving...' : 'Add Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT VENDOR MODAL */}
      {showEditVendorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md glass-panel-glow bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-slate-100">Edit Vendor</h3>
              <button onClick={() => setShowEditVendorModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleVendorEditSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2 items-center">
                  <AlertTriangle size={14} /> {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Vendor Name *</label>
                <input
                  type="text"
                  required
                  value={vendorForm.name}
                  onChange={(e) => setVendorForm({ ...vendorForm, name: e.target.value })}
                  className="glass-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Contact Person</label>
                <input
                  type="text"
                  value={vendorForm.contactPerson}
                  onChange={(e) => setVendorForm({ ...vendorForm, contactPerson: e.target.value })}
                  className="glass-input w-full text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1">Email</label>
                  <input
                    type="email"
                    value={vendorForm.email}
                    onChange={(e) => setVendorForm({ ...vendorForm, email: e.target.value })}
                    className="glass-input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1">Phone</label>
                  <input
                    type="text"
                    value={vendorForm.phone}
                    onChange={(e) => setVendorForm({ ...vendorForm, phone: e.target.value })}
                    className="glass-input w-full text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Address</label>
                <input
                  type="text"
                  value={vendorForm.address}
                  onChange={(e) => setVendorForm({ ...vendorForm, address: e.target.value })}
                  className="glass-input w-full text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Notes</label>
                <textarea
                  value={vendorForm.notes}
                  onChange={(e) => setVendorForm({ ...vendorForm, notes: e.target.value })}
                  className="glass-input w-full text-sm h-16 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditVendorModal(false)}
                  className="glass-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateVendorMutation.isPending}
                  className="glass-btn-primary text-xs"
                >
                  {updateVendorMutation.isPending ? 'Updating...' : 'Update Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE PURCHASE ORDER MODAL */}
      {showAddPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl glass-panel-glow bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-slate-100">Draft Purchase Order</h3>
              <button onClick={() => setShowAddPOModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePOCreateSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2 items-center">
                  <AlertTriangle size={14} /> {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Preferred Vendor *</label>
                <select
                  value={poForm.vendor}
                  required
                  onChange={(e) => setPoForm({ ...poForm, vendor: e.target.value })}
                  className="glass-input w-full text-sm"
                >
                  <option value="">-- Select Vendor --</option>
                  {vendors.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items row */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Ordered Products</h4>
                  <button
                    type="button"
                    onClick={handleAddPOItem}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                  >
                    <PlusCircle size={14} /> Add Line
                  </button>
                </div>

                <div className="space-y-2.5">
                  {poForm.items.map((item, index) => {
                    return (
                      <div key={index} className="flex gap-3 items-end bg-slate-950/20 p-3 rounded-xl border border-slate-850">
                        <div className="flex-1">
                          <label className="block text-[10px] text-slate-400 font-semibold mb-1">Product *</label>
                          <select
                            value={item.product}
                            required
                            onChange={(e) => handlePOItemChange(index, 'product', e.target.value)}
                            className="glass-input w-full text-xs"
                          >
                            <option value="">-- Select --</option>
                            {products.map((p) => (
                              <option key={p._id} value={p._id}>
                                [{p.sku}] {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="block text-[10px] text-slate-400 font-semibold mb-1">Quantity *</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handlePOItemChange(index, 'quantity', e.target.value)}
                            className="glass-input w-full text-xs font-mono"
                          />
                        </div>
                        <div className="w-28">
                          <label className="block text-[10px] text-slate-400 font-semibold mb-1">Cost Price *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={item.costPrice}
                            onChange={(e) => handlePOItemChange(index, 'costPrice', e.target.value)}
                            className="glass-input w-full text-xs font-mono"
                          />
                        </div>
                        {poForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePOItem(index)}
                            className="text-red-400 hover:text-red-300 p-2.5"
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
                <label className="block text-xs text-slate-400 font-semibold mb-1">Notes / Shipping Terms</label>
                <textarea
                  placeholder="Standard freight terms, delivery instructions..."
                  value={poForm.notes}
                  onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                  className="glass-input w-full text-sm h-16 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddPOModal(false)}
                  className="glass-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createPOMutation.isPending}
                  className="glass-btn-primary text-xs"
                >
                  {createPOMutation.isPending ? 'Generating...' : 'Save Draft PO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT PURCHASE ORDER MODAL */}
      {showEditPOModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl glass-panel-glow bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-slate-100">Edit Draft PO: <span className="text-cyan-400">{selectedPO?.poNumber}</span></h3>
              <button onClick={() => setShowEditPOModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handlePOEditSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2 items-center">
                  <AlertTriangle size={14} /> {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Preferred Vendor *</label>
                <select
                  value={poForm.vendor}
                  required
                  onChange={(e) => setPoForm({ ...poForm, vendor: e.target.value })}
                  className="glass-input w-full text-sm"
                >
                  <option value="">-- Select Vendor --</option>
                  {vendors.map((v) => (
                    <option key={v._id} value={v._id}>
                      {v.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Items row */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Ordered Products</h4>
                  <button
                    type="button"
                    onClick={handleAddPOItem}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                  >
                    <PlusCircle size={14} /> Add Line
                  </button>
                </div>

                <div className="space-y-2.5">
                  {poForm.items.map((item, index) => {
                    return (
                      <div key={index} className="flex gap-3 items-end bg-slate-950/20 p-3 rounded-xl border border-slate-850">
                        <div className="flex-1">
                          <label className="block text-[10px] text-slate-400 font-semibold mb-1">Product *</label>
                          <select
                            value={item.product}
                            required
                            onChange={(e) => handlePOItemChange(index, 'product', e.target.value)}
                            className="glass-input w-full text-xs"
                          >
                            <option value="">-- Select --</option>
                            {products.map((p) => (
                              <option key={p._id} value={p._id}>
                                [{p.sku}] {p.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="w-24">
                          <label className="block text-[10px] text-slate-400 font-semibold mb-1">Quantity *</label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={item.quantity}
                            onChange={(e) => handlePOItemChange(index, 'quantity', e.target.value)}
                            className="glass-input w-full text-xs font-mono"
                          />
                        </div>
                        <div className="w-28">
                          <label className="block text-[10px] text-slate-400 font-semibold mb-1">Cost Price *</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            required
                            value={item.costPrice}
                            onChange={(e) => handlePOItemChange(index, 'costPrice', e.target.value)}
                            className="glass-input w-full text-xs font-mono"
                          />
                        </div>
                        {poForm.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePOItem(index)}
                            className="text-red-400 hover:text-red-300 p-2.5"
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
                <label className="block text-xs text-slate-400 font-semibold mb-1">Notes / Shipping Terms</label>
                <textarea
                  placeholder="Standard freight terms, delivery instructions..."
                  value={poForm.notes}
                  onChange={(e) => setPoForm({ ...poForm, notes: e.target.value })}
                  className="glass-input w-full text-sm h-16 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditPOModal(false)}
                  className="glass-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatePOMutation.isPending}
                  className="glass-btn-primary text-xs"
                >
                  {updatePOMutation.isPending ? 'Updating...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* PO DETAILS MODAL */}
      {showPODetailsModal && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-3xl glass-panel-glow bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/20">
              <div>
                <h3 className="font-bold text-slate-100 flex items-center gap-2">
                  <span>Purchase Order:</span>
                  <span className="text-cyan-400 font-mono">{selectedPO.poNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${getStatusBadge(selectedPO.status)}`}>
                    {selectedPO.status}
                  </span>
                </h3>
              </div>
              <button onClick={() => setShowPODetailsModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-6 max-h-[85vh] overflow-y-auto">
              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-slate-950/30 p-4 rounded-xl border border-slate-850 text-slate-300 text-xs">
                <div>
                  <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Vendor Details</h5>
                  <div className="font-bold text-slate-100">{selectedPO.vendor?.name}</div>
                  <div>Contact: {selectedPO.vendor?.contactPerson || 'N/A'}</div>
                  <div>Phone: {selectedPO.vendor?.phone || 'N/A'}</div>
                </div>
                <div>
                  <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Order Details</h5>
                  <div>Total Value: <span className="font-bold text-slate-100">${selectedPO.totalAmount.toFixed(2)}</span></div>
                  <div>Raised By: {selectedPO.createdBy?.username} ({selectedPO.createdBy?.role})</div>
                  <div>Created On: {new Date(selectedPO.createdAt).toLocaleDateString()}</div>
                </div>
                <div>
                  <h5 className="font-bold text-slate-400 uppercase tracking-wider text-[10px] mb-1">Confirmation Details</h5>
                  {selectedPO.confirmedAt ? (
                    <>
                      <div>Confirmed On: {new Date(selectedPO.confirmedAt).toLocaleDateString()}</div>
                      {selectedPO.completedAt && (
                        <div>Completed On: {new Date(selectedPO.completedAt).toLocaleDateString()}</div>
                      )}
                    </>
                  ) : (
                    <div className="italic text-slate-500">Awaiting confirmation</div>
                  )}
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Ordered Products</h4>
                <div className="border border-slate-850 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-950/50 text-slate-400 font-semibold border-b border-slate-850">
                        <th className="px-4 py-3">Product Name</th>
                        <th className="px-4 py-3">SKU</th>
                        <th className="px-4 py-3 text-right">Ordered Qty</th>
                        <th className="px-4 py-3 text-right">Cost Price</th>
                        <th className="px-4 py-3 text-right">Received Qty</th>
                        <th className="px-4 py-3 text-right">Line Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-200">
                      {selectedPO.items.map((item, idx) => {
                        const subtotal = item.quantity * item.costPrice;
                        return (
                          <tr key={idx} className="hover:bg-slate-800/10">
                            <td className="px-4 py-2.5 font-medium">{item.product?.name}</td>
                            <td className="px-4 py-2.5 font-mono text-cyan-400">{item.product?.sku}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold">{item.quantity}</td>
                            <td className="px-4 py-2.5 text-right font-mono">${item.costPrice.toFixed(2)}</td>
                            <td className={`px-4 py-2.5 text-right font-mono font-bold ${
                              item.quantityReceived === item.quantity
                                ? 'text-emerald-400'
                                : item.quantityReceived > 0
                                ? 'text-amber-400'
                                : 'text-slate-500'
                            }`}>
                              {item.quantityReceived} / {item.quantity}
                            </td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold">${subtotal.toFixed(2)}</td>
                          </tr>
                        );
                      })}
                      <tr className="bg-slate-950/20 font-bold border-t border-slate-850 text-slate-100">
                        <td colSpan="5" className="px-4 py-3 text-right uppercase">Grand Total:</td>
                        <td className="px-4 py-3 text-right font-mono text-cyan-400 text-sm">
                          ${selectedPO.totalAmount.toFixed(2)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedPO.notes && (
                <div className="p-3 bg-slate-950/20 border border-slate-850 rounded-xl">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Notes / Terms</h5>
                  <p className="text-xs text-slate-300 italic">{selectedPO.notes}</p>
                </div>
              )}

              {/* Status Action Buttons */}
              <div className="flex items-center justify-between pt-4 border-t border-slate-800">
                <div>
                  {selectedPO.status === 'Draft' && canManagePO && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this draft Purchase Order?')) {
                          cancelPOMutation.mutate(selectedPO._id);
                        }
                      }}
                      className="glass-btn-danger text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
                    >
                      <Ban size={14} /> Cancel PO
                    </button>
                  )}
                  {selectedPO.status === 'Confirmed' && canManagePO && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this confirmed Purchase Order? No goods have been received.')) {
                          cancelPOMutation.mutate(selectedPO._id);
                        }
                      }}
                      className="glass-btn-danger text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
                    >
                      <Ban size={14} /> Cancel PO
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowPODetailsModal(false)}
                    className="glass-btn-secondary text-xs"
                  >
                    Close
                  </button>
                  {selectedPO.status === 'Draft' && canManagePO && (
                    <button
                      onClick={() => {
                        if (window.confirm('Confirming this PO signals that it has been sent to the vendor. Proceed?')) {
                          confirmPOMutation.mutate(selectedPO._id);
                        }
                      }}
                      className="glass-btn-primary text-xs font-semibold px-5 py-2 flex items-center gap-1.5"
                    >
                      <CheckCircle size={14} /> Confirm PO
                    </button>
                  )}
                  {(selectedPO.status === 'Confirmed' || selectedPO.status === 'Partially Received') && canReceivePO && (
                    <button
                      onClick={() => handleOpenReceive(selectedPO)}
                      className="glass-btn-primary text-xs font-semibold px-5 py-2 flex items-center gap-1.5"
                    >
                      <Truck size={14} /> Receive Goods
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* RECEIVE GOODS MODAL */}
      {showReceiveModal && selectedPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg glass-panel-glow bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/20">
              <h3 className="font-bold text-slate-100 flex items-center gap-2">
                <Truck size={18} className="text-cyan-400" />
                <span>Receive Shipment: {selectedPO.poNumber}</span>
              </h3>
              <button onClick={() => setShowReceiveModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleReceiveSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2 items-center">
                  <AlertTriangle size={14} /> {errorMessage}
                </div>
              )}

              <p className="text-xs text-slate-400">
                Specify quantities received in this shipment. Physical stock levels and ledgers will update immediately.
              </p>

              <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                {receiveItems.map((item, idx) => {
                  const maxAllowed = item.quantity - item.quantityReceived;
                  return (
                    <div key={idx} className="bg-slate-950/30 p-3.5 rounded-xl border border-slate-850 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="text-xs font-semibold text-slate-200">{item.name}</div>
                          <div className="text-[10px] font-mono text-cyan-400">{item.sku}</div>
                        </div>
                        <div className="text-right text-xs">
                          <span className="text-slate-400">Received So Far:</span>{' '}
                          <span className="font-bold text-slate-200">
                            {item.quantityReceived} / {item.quantity}
                          </span>
                        </div>
                      </div>

                      {maxAllowed === 0 ? (
                        <div className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                          <Check size={14} /> Fully Received
                        </div>
                      ) : (
                        <div className="flex items-center gap-3">
                          <label className="text-[11px] text-slate-400 font-semibold whitespace-nowrap">
                            Quantity Inbound:
                          </label>
                          <input
                            type="number"
                            min="0"
                            max={maxAllowed}
                            value={item.qtyToReceive}
                            onChange={(e) => handleReceiveReceiveQtyChange ? handleReceiveQtyChange(idx, e.target.value) : handleReceiveQtyChange(idx, e.target.value)}
                            className="glass-input flex-1 text-xs py-1.5 font-mono text-right"
                          />
                          <span className="text-[11px] text-slate-500 font-mono">
                            max +{maxAllowed}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowReceiveModal(false)}
                  className="glass-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={receivePOMutation.isPending}
                  className="glass-btn-primary text-xs flex items-center gap-1.5"
                >
                  {receivePOMutation.isPending ? 'Logging receipt...' : 'Confirm Delivery'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Purchase;
