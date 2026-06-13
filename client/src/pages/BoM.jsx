import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBoMs, createBoM, deleteBoM } from '../services/manufacturingService';
import { getProducts } from '../services/productService';
import {
  Plus,
  Search,
  Trash2,
  X,
  ClipboardList,
  Wrench,
  Clock,
  PlayCircle,
  FileText,
  AlertTriangle,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';

const BoM = () => {
  const { hasRole } = useAuth();
  const queryClient = useQueryClient();

  const canManage = hasRole(['Admin', 'Business Owner', 'Manufacturing User', 'Inventory Manager']);
  const canDelete = hasRole(['Admin', 'Business Owner']);

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBoM, setSelectedBoM] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Queries
  const { data: boms = [], isLoading: bomsLoading } = useQuery({
    queryKey: ['boms'],
    queryFn: getBoMs,
  });

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
  });

  // Filter finished goods that don't have a BoM yet
  const availableProducts = products.filter(
    (p) => p.category === 'Finished Good' && (!p.bom || p.bom === null)
  );

  // Form State
  const [formData, setFormData] = useState({
    product: '',
    name: '',
    components: [{ product: '', quantity: 1 }],
    operations: [{ name: '', duration: 10, workCenter: 'Assembly Floor' }],
    notes: '',
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: createBoM,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setShowAddModal(false);
      resetForm();
    },
    onError: (err) => {
      setErrorMessage(err.response?.data?.message || 'Failed to create Bill of Materials');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBoM,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['boms'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      setSelectedBoM(null);
    },
    onError: (err) => {
      alert(err.response?.data?.message || 'Failed to delete Bill of Materials');
    },
  });

  const resetForm = () => {
    setFormData({
      product: '',
      name: '',
      components: [{ product: '', quantity: 1 }],
      operations: [{ name: '', duration: 10, workCenter: 'Assembly Floor' }],
      notes: '',
    });
    setErrorMessage('');
  };

  const handleAddComponent = () => {
    setFormData({
      ...formData,
      components: [...formData.components, { product: '', quantity: 1 }],
    });
  };

  const handleRemoveComponent = (idx) => {
    const comps = formData.components.filter((_, i) => i !== idx);
    setFormData({ ...formData, components: comps.length ? comps : [{ product: '', quantity: 1 }] });
  };

  const handleComponentChange = (idx, field, val) => {
    const comps = [...formData.components];
    if (field === 'product') comps[idx].product = val;
    if (field === 'quantity') comps[idx].quantity = parseInt(val) || 0;
    setFormData({ ...formData, components: comps });
  };

  const handleAddOperation = () => {
    setFormData({
      ...formData,
      operations: [...formData.operations, { name: '', duration: 10, workCenter: 'Assembly Floor' }],
    });
  };

  const handleRemoveOperation = (idx) => {
    const ops = formData.operations.filter((_, i) => i !== idx);
    setFormData({
      ...formData,
      operations: ops.length ? ops : [{ name: '', duration: 10, workCenter: 'Assembly Floor' }],
    });
  };

  const handleOperationChange = (idx, field, val) => {
    const ops = [...formData.operations];
    if (field === 'name') ops[idx].name = val;
    if (field === 'duration') ops[idx].duration = parseInt(val) || 0;
    if (field === 'workCenter') ops[idx].workCenter = val;
    setFormData({ ...formData, operations: ops });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.product) {
      setErrorMessage('Please select a finished product');
      return;
    }
    const invalidComp = formData.components.find((c) => !c.product || c.quantity <= 0);
    if (invalidComp) {
      setErrorMessage('Please fill in all components and verify quantities are greater than zero');
      return;
    }
    const invalidOp = formData.operations.find((op) => !op.name || op.duration <= 0 || !op.workCenter);
    if (invalidOp) {
      setErrorMessage('Please fill in all operation details and verify durations are greater than zero');
      return;
    }
    createMutation.mutate(formData);
  };

  const handleDeleteBoM = (id, name) => {
    if (window.confirm(`Are you sure you want to delete the recipe "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const filteredBoms = boms.filter((bom) => {
    const pName = bom.product?.name || '';
    const pSku = bom.product?.sku || '';
    return (
      bom.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pSku.toLowerCase().includes(searchTerm.toLowerCase())
    );
  });

  return (
    <Layout title="Bill of Materials (BoM)">
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <ClipboardList className="text-cyan-400" size={22} /> Recipe Management
          </h2>
          <p className="text-xs text-slate-400">
            Define structure, component quantities, and assembly operations for manufactured furniture.
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
            <Plus size={15} /> Create Recipe
          </button>
        )}
      </div>

      {/* Filter and Search Panel */}
      <div className="glass-panel p-4 rounded-xl flex items-center">
        <div className="relative flex-1">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Recipe Name or Finished Product..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950/40 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-100 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Recipe List */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Recipes List</h3>
          {bomsLoading ? (
            <div className="glass-panel p-6 text-center text-cyan-400 font-mono text-xs">LOADING RECIPES...</div>
          ) : filteredBoms.length === 0 ? (
            <div className="glass-panel p-6 text-center text-slate-400 text-xs">No recipes found.</div>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
              {filteredBoms.map((bom) => (
                <div
                  key={bom._id}
                  onClick={() => setSelectedBoM(bom)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    selectedBoM?._id === bom._id
                      ? 'glass-panel-glow border-cyan-400/30 bg-cyan-500/5'
                      : 'glass-panel border-slate-850 hover:border-slate-700'
                  }`}
                >
                  <h4 className="font-semibold text-slate-100 text-sm">{bom.name}</h4>
                  <div className="text-xs text-slate-400 mt-1 flex justify-between">
                    <span>Product: {bom.product?.name}</span>
                    <span className="font-mono text-cyan-400 text-[10px]">{bom.product?.sku}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-2 flex justify-between border-t border-slate-850/60 pt-2">
                    <span>{bom.components.length} components</span>
                    <span>{bom.operations.length} steps</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Recipe Details */}
        <div className="lg:col-span-2">
          {selectedBoM ? (
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-6">
              {/* Detail Header */}
              <div className="flex justify-between items-start border-b border-slate-850 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-100">{selectedBoM.name}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Finished Goods output: <span className="font-semibold text-slate-200">{selectedBoM.product?.name}</span>
                    <span className="font-mono text-cyan-400 ml-1.5 text-[10px]">[{selectedBoM.product?.sku}]</span>
                  </p>
                </div>
                {canDelete && (
                  <button
                    onClick={() => handleDeleteBoM(selectedBoM._id, selectedBoM.name)}
                    className="p-2 bg-red-500/10 hover:bg-red-500/25 text-red-400 rounded-lg border border-red-500/20 transition-all"
                    title="Delete Recipe"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              {/* Components list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Wrench size={14} /> Bill of Materials (Raw Components)
                </h4>
                <div className="border border-slate-850 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-850 font-semibold">
                        <th className="px-4 py-2.5">Component SKU</th>
                        <th className="px-4 py-2.5">Component Name</th>
                        <th className="px-4 py-2.5 text-right">Qty Needed (Per Unit)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-200">
                      {selectedBoM.components.map((comp, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/10">
                          <td className="px-4 py-2.5 font-mono text-cyan-400">{comp.product?.sku}</td>
                          <td className="px-4 py-2.5">{comp.product?.name}</td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-100">{comp.quantity}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Operations list */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Clock size={14} /> Assembly & Manufacturing Operations
                </h4>
                <div className="border border-slate-850 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-950/40 text-slate-400 border-b border-slate-850 font-semibold">
                        <th className="px-4 py-2.5">Step #</th>
                        <th className="px-4 py-2.5">Operation Name</th>
                        <th className="px-4 py-2.5">Work Center Location</th>
                        <th className="px-4 py-2.5 text-right">Standard Duration</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-slate-200">
                      {selectedBoM.operations.map((op, idx) => (
                        <tr key={idx} className="hover:bg-slate-800/10">
                          <td className="px-4 py-2.5 font-mono text-slate-400">{idx + 1}</td>
                          <td className="px-4 py-2.5 font-semibold">{op.name}</td>
                          <td className="px-4 py-2.5 text-slate-300">{op.workCenter}</td>
                          <td className="px-4 py-2.5 text-right font-mono font-bold text-cyan-400">
                            {op.duration} mins
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {selectedBoM.notes && (
                <div className="p-3 bg-slate-950/20 border border-slate-850 rounded-xl">
                  <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                    <FileText size={12} /> Recipe Notes
                  </h5>
                  <p className="text-xs text-slate-300 italic">{selectedBoM.notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="glass-panel p-12 rounded-2xl border border-slate-800 text-center text-slate-400 text-sm">
              <PlayCircle className="mx-auto text-slate-500 mb-3" size={32} />
              Select a Bill of Materials recipe from the left list to view structure details.
            </div>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl glass-panel-glow bg-slate-900 rounded-2xl border border-slate-800 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
              <h3 className="font-bold text-slate-100">Create Bill of Materials</h3>
              <button onClick={() => setShowAddModal(false)} className="text-slate-400 hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[80vh] overflow-y-auto">
              {errorMessage && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex gap-2 items-center">
                  <AlertTriangle size={14} /> {errorMessage}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1">Recipe Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dining Table Premium recipe"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="glass-input w-full text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 font-semibold mb-1">Output Finished Good *</label>
                  {availableProducts.length === 0 ? (
                    <div className="text-xs text-red-400 pt-3 italic">
                      No finished goods available without a recipe. Add finished goods in the Catalog first.
                    </div>
                  ) : (
                    <select
                      value={formData.product}
                      required
                      onChange={(e) => setFormData({ ...formData, product: e.target.value })}
                      className="glass-input w-full text-sm"
                    >
                      <option value="">-- Select --</option>
                      {availableProducts.map((p) => (
                        <option key={p._id} value={p._id}>
                          [{p.sku}] {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Components */}
              <div className="space-y-3 border-t border-slate-800 pt-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Required Components</h4>
                  <button
                    type="button"
                    onClick={handleAddComponent}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                  >
                    <PlusCircle size={14} /> Add component
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.components.map((item, idx) => (
                    <div key={idx} className="flex gap-3 items-end bg-slate-950/20 p-3 rounded-xl border border-slate-850">
                      <div className="flex-1">
                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">Component Product *</label>
                        <select
                          value={item.product}
                          required
                          onChange={(e) => handleComponentChange(idx, 'product', e.target.value)}
                          className="glass-input w-full text-xs"
                        >
                          <option value="">-- Select component --</option>
                          {products.map((p) => (
                            <option key={p._id} value={p._id}>
                              [{p.sku}] {p.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="w-28">
                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">Quantity Needed *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={item.quantity}
                          onChange={(e) => handleComponentChange(idx, 'quantity', e.target.value)}
                          className="glass-input w-full text-xs font-mono text-right"
                        />
                      </div>
                      {formData.components.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveComponent(idx)}
                          className="text-red-400 hover:text-red-300 p-2.5"
                        >
                          <MinusCircle size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Operations */}
              <div className="space-y-3 border-t border-slate-800 pt-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider">Production Steps</h4>
                  <button
                    type="button"
                    onClick={handleAddOperation}
                    className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                  >
                    <PlusCircle size={14} /> Add Operation
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.operations.map((op, idx) => (
                    <div key={idx} className="flex gap-3 items-end bg-slate-950/20 p-3 rounded-xl border border-slate-850">
                      <div className="flex-1">
                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">Operation Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Painting"
                          value={op.name}
                          onChange={(e) => handleOperationChange(idx, 'name', e.target.value)}
                          className="glass-input w-full text-xs"
                        />
                      </div>
                      <div className="w-40">
                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">Work Center *</label>
                        <select
                          value={op.workCenter}
                          required
                          onChange={(e) => handleOperationChange(idx, 'workCenter', e.target.value)}
                          className="glass-input w-full text-xs"
                        >
                          <option value="Assembly Floor">Assembly Floor</option>
                          <option value="Paint Room">Paint Room</option>
                          <option value="Packaging Unit">Packaging Unit</option>
                          <option value="CNC Station">CNC Station</option>
                        </select>
                      </div>
                      <div className="w-28">
                        <label className="block text-[10px] text-slate-400 font-semibold mb-1">Duration (Mins) *</label>
                        <input
                          type="number"
                          min="1"
                          required
                          value={op.duration}
                          onChange={(e) => handleOperationChange(idx, 'duration', e.target.value)}
                          className="glass-input w-full text-xs font-mono text-right"
                        />
                      </div>
                      {formData.operations.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveOperation(idx)}
                          className="text-red-400 hover:text-red-300 p-2.5"
                        >
                          <MinusCircle size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 font-semibold mb-1">Recipe Instructions / Notes</label>
                <textarea
                  placeholder="Detail wood grains matching, standard quality instructions..."
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="glass-input w-full text-sm h-16 resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="glass-btn-secondary text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || availableProducts.length === 0}
                  className="glass-btn-primary text-xs"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Recipe'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default BoM;
