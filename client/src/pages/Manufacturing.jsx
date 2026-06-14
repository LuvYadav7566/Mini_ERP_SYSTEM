import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  getManufacturingOrders,
  createManufacturingOrder,
  confirmManufacturingOrder,
  startWorkOrder,
  completeWorkOrder,
  cancelManufacturingOrder,
} from '../services/manufacturingService';
import { getProducts } from '../services/productService';
import API from '../services/api'; // for fetching users
import {
  Plus,
  Search,
  CheckCircle,
  Clock,
  Play,
  X,
  AlertTriangle,
  Users,
  Layers,
  Wrench,
  Ban,
  Filter,
  Check,
} from 'lucide-react';

const Manufacturing = () => {
  const { hasRole, user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const canManage = hasRole(['Admin', 'Business Owner', 'Manufacturing User']);
  const canConfirm = hasRole(['Admin', 'Business Owner', 'Manufacturing User', 'Inventory Manager']);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedMO, setSelectedMO] = useState(null);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form states
  const [formData, setFormData] = useState({
    product: '',
    quantity: 1,
    assignee: '',
    notes: '',
  });

  // Queries
  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ['manufacturingOrders'],
    queryFn: getManufacturingOrders,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['usersList'],
    queryFn: async () => {
      const res = await API.get('/auth/users');
      return res.data;
    },
  });

  // Filter finished goods that have a BoM recipe
  const buildableProducts = products.filter((p) => p.category === 'Finished Good' && p.bom);
  const operators = users.filter((u) => u.role === 'Manufacturing User' || u.role === 'Admin');

  // Mutations
  const createMutation = useMutation({
    mutationFn: createManufacturingOrder,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manufacturingOrders'] });
      setShowAddModal(false);
      resetForm();
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create Manufacturing Order');
    },
  });

  const confirmMutation = useMutation({
    mutationFn: confirmManufacturingOrder,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manufacturingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (selectedMO?._id === data._id) {
        setSelectedMO(data);
      }
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to confirm Manufacturing Order');
    },
  });

  const startWOMutation = useMutation({
    mutationFn: ({ id, woId }) => startWorkOrder(id, woId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manufacturingOrders'] });
      if (selectedMO?._id === data._id) {
        setSelectedMO(data);
      }
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to start Work Order');
    },
  });

  const completeWOMutation = useMutation({
    mutationFn: ({ id, woId }) => completeWorkOrder(id, woId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manufacturingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stockLedger'] });
      if (selectedMO?._id === data._id) {
        setSelectedMO(data);
      }
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to complete Work Order');
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelManufacturingOrder,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['manufacturingOrders'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      if (selectedMO?._id === data._id) {
        setSelectedMO(data);
      }
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to cancel Manufacturing Order');
    },
  });

  const resetForm = () => {
    setFormData({
      product: '',
      quantity: 1,
      assignee: '',
      notes: '',
    });
    setErrorMessage('');
  };

  const handleCreateSubmit = (e) => {
    e.preventDefault();
    if (!formData.product) {
      setErrorMessage('Please select a finished product');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleOpenDetails = (mo) => {
    setSelectedMO(mo);
    setShowDetailsModal(true);
  };

  // Status Badge Colors
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Draft':
        return 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
      case 'Confirmed':
        return 'bg-blue-500/10 text-blue-600 border border-blue-500/20';
      case 'In Progress':
        return 'bg-cyan-500/10 text-cyan-600 border border-cyan-500/20';
      case 'Completed':
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
      default: // Cancelled
        return 'bg-rose-500/10 text-rose-600 border border-rose-500/20';
    }
  };

  const getWOStatusBadge = (status) => {
    switch (status) {
      case 'Pending':
        return 'bg-slate-500/10 text-slate-500 border border-slate-500/20';
      case 'In Progress':
        return 'bg-cyan-500/10 text-cyan-600 border border-cyan-500/20 animate-pulse';
      default: // Completed
        return 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20';
    }
  };

  // Filters
  const filteredOrders = orders.filter((mo) => {
    const matchesSearch =
      mo.moNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mo.product?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || mo.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Calculate Manufacturing Dashboard Stats
  const totalOrders = orders.filter(o => o.status !== 'Cancelled').length;
  
  const completedOrders = orders.filter(o => o.status === 'Completed');
  const completedOrdersCount = completedOrders.length;
  const completedUnitsCount = completedOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

  const pendingOrders = orders.filter(o => ['Draft', 'Confirmed', 'In Progress'].includes(o.status));
  const pendingOrdersCount = pendingOrders.length;
  const pendingUnitsCount = pendingOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

  const activeOrders = orders.filter(o => o.status === 'In Progress');
  const activeOrdersCount = activeOrders.length;
  const activeUnitsCount = activeOrders.reduce((sum, o) => sum + (o.quantity || 0), 0);

  return (
    <Layout title="Manufacturing Floor">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center border-b border-slate-200 pb-3">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <Wrench className="text-cyan-500" size={22} /> Production Orders
          </h2>
          <p className="text-xs text-slate-500">
            Build finished items, track operation runs, and coordinate component consumption.
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
            <Plus size={15} /> Create MO
          </button>
        )}
      </div>

      {/* Manufacturing Dashboard Panel */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 animate-in fade-in duration-200">
        {/* Total Orders Card */}
        <div className="glass-panel p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <Wrench size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider font-semibold">Total Orders</span>
            <span className="text-base font-bold text-slate-800">
              {ordersLoading ? '...' : `${totalOrders} MOs`}
            </span>
            <span className="text-[9px] text-slate-500 block mt-0.5">Excludes cancelled orders</span>
          </div>
        </div>

        {/* Completed Products Card */}
        <div className="glass-panel p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider font-semibold">Completed Products</span>
            <span className="text-base font-bold text-slate-800">
              {ordersLoading ? '...' : `${completedUnitsCount} Units`}
            </span>
            <span className="text-[9px] text-slate-500 block mt-0.5">
              {ordersLoading ? 'Calculating...' : `${completedOrdersCount} orders finished`}
            </span>
          </div>
        </div>

        {/* Pending Products Card */}
        <div className="glass-panel p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
            <Clock size={20} />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider font-semibold">Pending Products</span>
            <span className="text-base font-bold text-slate-800">
              {ordersLoading ? '...' : `${pendingUnitsCount} Units`}
            </span>
            <span className="text-[9px] text-slate-500 block mt-0.5">
              {ordersLoading ? 'Calculating...' : `${pendingOrdersCount} orders pending`}
            </span>
          </div>
        </div>

        {/* In Progress Card */}
        <div className="glass-panel p-4 rounded-xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-lg bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center">
            <Play size={20} fill="currentColor" />
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block font-medium uppercase tracking-wider font-semibold">In Progress</span>
            <span className="text-base font-bold text-slate-800">
              {ordersLoading ? '...' : `${activeUnitsCount} Units`}
            </span>
            <span className="text-[9px] text-slate-500 block mt-0.5">
              {ordersLoading ? 'Calculating...' : `${activeOrdersCount} orders active`}
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Panel */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-center">
        <div className="relative flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by MO Number or Product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-cyan-500" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-cyan-500 focus:bg-white focus:ring-4 focus:ring-cyan-100"
          >
            <option value="All">All Statuses</option>
            <option value="Draft">Draft</option>
            <option value="Confirmed">Confirmed (Awaiting Parts)</option>
            <option value="In Progress">In Progress (Active)</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {ordersLoading ? (
        <div className="glass-panel p-12 text-center text-cyan-600 font-mono">LOADING MANUFACTURING FLOOR...</div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-500 text-sm">
          No manufacturing orders found.
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-x-auto border border-slate-250 shadow-sm animate-in fade-in duration-200">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-550 uppercase tracking-wider">
                <th className="px-6 py-4">MO Number</th>
                <th className="px-6 py-4">Finished Product</th>
                <th className="px-6 py-4">Target Qty</th>
                <th className="px-6 py-4">Assignee</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Operation Progress</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredOrders.map((mo) => {
                // Calculate operation stats
                const totalWOs = mo.workOrders.length;
                const completedWOs = mo.workOrders.filter((w) => w.status === 'Completed').length;
                const progressPct = totalWOs > 0 ? Math.round((completedWOs / totalWOs) * 100) : 0;

                return (
                  <tr key={mo._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-mono font-semibold text-cyan-600">
                      {mo.moNumber}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {mo.product?.name}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-slate-800">
                      {mo.quantity} Units
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-550">
                      {mo.assignee?.username || 'Unassigned'}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium ${getStatusBadge(mo.status)}`}>
                        {mo.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3 w-44">
                        <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-cyan-400 to-cyan-600 h-full transition-all duration-550"
                            style={{ width: `${progressPct}%` }}
                          />
                        </div>
                        <span className="text-[11px] font-mono text-slate-500">
                          {completedWOs}/{totalWOs}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleOpenDetails(mo)}
                          className="bg-slate-50 hover:bg-slate-100 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 transition-all flex items-center gap-1"
                        >
                          Details & Steps
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE MO MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-bold text-slate-800">Draft Manufacturing Order</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-650">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-650 text-xs flex gap-2 items-center">
                  <AlertTriangle size={14} /> {errorMessage}
                </div>
              )}

              <div>
                <label className="block text-xs text-slate-605 font-semibold mb-1">Product output *</label>
                {buildableProducts.length === 0 ? (
                  <div className="text-xs text-red-600 pt-3 italic">
                    No products have a recipe configured. Set up a Bill of Materials recipe first.
                  </div>
                ) : (
                  <select
                    value={formData.product}
                    required
                    onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                    className="glass-input w-full text-sm"
                  >
                    <option value="">-- Select --</option>
                    {buildableProducts.map((p) => (
                      <option key={p._id} value={p._id}>
                        [{p.sku}] {p.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs text-slate-605 font-semibold mb-1">Quantity *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={formData.quantity}
                  onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })}
                  className="glass-input w-full text-sm font-mono text-right"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-605 font-semibold mb-1">Floor Assignee</label>
                <select
                  value={formData.assignee}
                  onChange={(e) => setFormData({ ...formData, assignee: e.target.value })}
                  className="glass-input w-full text-sm"
                >
                  <option value="">-- Select Operator --</option>
                  {operators.map((op) => (
                    <option key={op._id} value={op._id}>
                      {op.username} ({op.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-605 font-semibold mb-1">Special Notes</label>
                <textarea
                  placeholder="e.g. Rush order, specific wood grain details..."
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
                  disabled={createMutation.isPending || buildableProducts.length === 0}
                  className="glass-btn-primary text-xs"
                >
                  {createMutation.isPending ? 'Generating...' : 'Save Draft MO'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DETAILS Drawer Modal */}
      {showDetailsModal && selectedMO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-3xl bg-white rounded-2xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div>
                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                  <span>Manufacturing Order:</span>
                  <span className="text-cyan-600 font-mono">{selectedMO.moNumber}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${getStatusBadge(selectedMO.status)}`}>
                    {selectedMO.status}
                  </span>
                </h3>
              </div>
              <button onClick={() => setShowDetailsModal(false)} className="text-slate-400 hover:text-slate-650">
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
              {/* Info grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-slate-600 text-xs">
                <div>
                  <div className="mb-1"><span className="text-slate-500">Output:</span> <span className="font-bold text-slate-900">{selectedMO.product?.name}</span></div>
                  <div><span className="text-slate-550">SKU:</span> <span className="font-mono text-cyan-600">{selectedMO.product?.sku}</span></div>
                  <div><span className="text-slate-500">Quantity to Produce:</span> <span className="font-bold font-mono text-slate-800">{selectedMO.quantity} Units</span></div>
                </div>
                <div>
                  <div className="mb-1"><span className="text-slate-500">Created By:</span> <span className="text-slate-850">{selectedMO.createdBy?.username}</span></div>
                  <div><span className="text-slate-500">Floor Assignee:</span> <span className="text-cyan-600">{selectedMO.assignee?.username || 'Unassigned'}</span></div>
                  {selectedMO.confirmedAt && (
                    <div><span className="text-slate-500">Confirmed On:</span> <span className="text-slate-700">{new Date(selectedMO.confirmedAt).toLocaleDateString()}</span></div>
                  )}
                </div>
              </div>

              {/* Component availability list */}
              <div className="space-y-2.5">
                <h4 className="text-xs font-bold text-cyan-600 uppercase tracking-wider flex items-center gap-1">
                  <Layers size={14} /> Component Availability & Reservation Checklist
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 font-semibold">
                        <th className="px-4 py-2.5">Component SKU</th>
                        <th className="px-4 py-2.5">Component Name</th>
                        <th className="px-4 py-2.5 text-right">Required</th>
                        <th className="px-4 py-2.5 text-right">Free-to-Use</th>
                        <th className="px-4 py-2.5 text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {selectedMO.components.map((comp, idx) => {
                        const productDetail = comp.product;
                        const freeQty = productDetail ? productDetail.freeToUse : 0;
                        
                        // Shortage happens if freeQty is less than what this MO requires, and the order is not yet confirmed
                        // If order is already confirmed, reservations have already occurred
                        const isShortage = selectedMO.status === 'Draft' && freeQty < comp.quantityRequired;
                        
                        return (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="px-4 py-2.5 font-mono text-cyan-600">{productDetail?.sku}</td>
                            <td className="px-4 py-2.5">{productDetail?.name}</td>
                            <td className="px-4 py-2.5 text-right font-mono font-bold">{comp.quantityRequired}</td>
                            <td className="px-4 py-2.5 text-right font-mono text-slate-550">{freeQty}</td>
                            <td className="px-4 py-2.5 text-right font-semibold">
                              {selectedMO.status === 'Draft' ? (
                                isShortage ? (
                                  <span className="text-red-600 flex items-center gap-1 justify-end">
                                    <AlertTriangle size={12} /> Shortage
                                  </span>
                                ) : (
                                  <span className="text-emerald-600 flex items-center gap-1 justify-end">
                                    <Check size={12} /> Ready
                                  </span>
                                )
                              ) : (
                                <span className="text-slate-500 italic">Reserved</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Work Order flow tracking */}
              {selectedMO.status !== 'Draft' && (
                <div className="space-y-3 border-t border-slate-200 pt-4">
                  <h4 className="text-xs font-bold text-cyan-600 uppercase tracking-wider flex items-center gap-1">
                    <Wrench size={14} /> Production Routing (Work Orders)
                  </h4>

                  <div className="space-y-2.5">
                    {selectedMO.workOrders.map((wo, idx) => {
                      const isAssignedToMe = true; // simplified client-side check
                      const isPending = wo.status === 'Pending';
                      const isInProgress = wo.status === 'In Progress';
                      const isCompleted = wo.status === 'Completed';

                      // Find if the previous work order is completed
                      const prevCompleted = idx === 0 || selectedMO.workOrders[idx - 1].status === 'Completed';
                      const canStart = isPending && prevCompleted && canManage;
                      const canComplete = isInProgress && canManage;

                      return (
                        <div
                          key={wo._id}
                          className={`flex flex-col md:flex-row md:items-center justify-between p-3.5 rounded-xl border transition-all ${
                            isInProgress
                              ? 'border-cyan-200 bg-cyan-50/50 shadow-sm shadow-cyan-500/5'
                              : 'border-slate-200 bg-slate-50/50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-slate-100 text-slate-550 text-xs font-bold flex items-center justify-center font-mono">
                              {idx + 1}
                            </span>
                            <div>
                              <div className="text-xs font-semibold text-slate-800">{wo.name}</div>
                              <div className="text-[10px] text-slate-500 mt-0.5">
                                Location: <span className="text-cyan-600 font-semibold">{wo.workCenter}</span> | Est: {wo.duration} mins
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-4 mt-2.5 md:mt-0">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${getWOStatusBadge(wo.status)}`}>
                              {wo.status}
                            </span>

                            {canStart && (
                              <button
                                onClick={() => startWOMutation.mutate({ id: selectedMO._id, woId: wo._id })}
                                className="bg-cyan-50 hover:bg-cyan-100 text-cyan-600 px-3 py-1 border border-cyan-200 text-xs font-semibold transition-all flex items-center gap-1"
                              >
                                <Play size={10} fill="currentColor" /> Start Step
                              </button>
                            )}

                            {canComplete && (
                              <button
                                onClick={() => completeWOMutation.mutate({ id: selectedMO._id, woId: wo._id })}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded text-xs font-bold transition-all flex items-center gap-1"
                              >
                                <CheckCircle size={11} /> Complete Step
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Notes */}
              {selectedMO.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                  <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Floor Notes</h5>
                  <p className="text-xs text-slate-655 italic">{selectedMO.notes}</p>
                </div>
              )}

              {/* Action buttons */}
              <div className="flex items-center justify-between border-t border-slate-200 pt-4">
                <div>
                  {selectedMO.status !== 'Completed' && selectedMO.status !== 'Cancelled' && canManage && (
                    <button
                      onClick={() => {
                        if (window.confirm('Are you sure you want to cancel this manufacturing order? Component reservations will be released.')) {
                          cancelMutation.mutate(selectedMO._id);
                        }
                      }}
                      className="glass-btn-danger text-xs font-semibold px-4 py-2 flex items-center gap-1.5"
                    >
                      <Ban size={14} /> Cancel Order
                    </button>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="glass-btn-secondary text-xs"
                  >
                    Close
                  </button>
                  {selectedMO.status === 'Draft' && canConfirm && (
                    <button
                      onClick={() => confirmMutation.mutate(selectedMO._id)}
                      className="glass-btn-primary text-xs font-semibold px-5 py-2 flex items-center gap-1.5 animate-pulse hover:animate-none"
                    >
                      <CheckCircle size={14} /> Confirm MO & Reserve Parts
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default Manufacturing;
