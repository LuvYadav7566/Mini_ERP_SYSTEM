import React, { useState } from 'react';
import Layout from '../components/Layout';
import { useQuery } from '@tanstack/react-query';
import { getStockLedger } from '../services/productService';
import {
  History,
  Search,
  Filter,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  Tag,
} from 'lucide-react';

const StockLedger = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  // Fetch Stock Ledger
  const { data: ledger = [], isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['stockLedger'],
    queryFn: () => getStockLedger(),
  });

  // Filters logic
  const filteredLedger = ledger.filter((item) => {
    const productName = item.product?.name || '';
    const productSku = item.product?.sku || '';
    const matchesSearch =
      productName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      productSku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'All' || item.transactionType === typeFilter;
    return matchesSearch && matchesType;
  });

  const getTransactionBadge = (type) => {
    switch (type) {
      case 'Purchase Receipt':
        return 'bg-emerald-50 text-emerald-700 border border-emerald-100';
      case 'Sales Delivery':
        return 'bg-blue-50 text-blue-700 border border-blue-100';
      case 'Manufacturing Consumption':
        return 'bg-red-50 text-red-700 border border-red-100';
      case 'Manufacturing Production':
        return 'bg-purple-50 text-purple-700 border border-purple-100';
      case 'System Initialization':
        return 'bg-sky-50 text-sky-700 border border-sky-100';
      default: // Inventory Adjustment
        return 'bg-slate-100 text-slate-700 border border-slate-200';
    }
  };

  return (
    <Layout title="Inventory Stock Ledger">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <History className="text-blue-600" size={22} /> Audit Trail & History
          </h2>
          <p className="text-xs text-slate-500">
            Immutable log of all physical inventory changes at Shiv Furniture Works.
          </p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="glass-btn-secondary flex items-center gap-2 text-xs py-2"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          {isFetching ? 'Refreshing...' : 'Refresh Logs'}
        </button>
      </div>

      {/* Filter and Search Panel */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap gap-4 items-center">
        {/* Search */}
        <div className="relative flex-1 min-w-[240px]">
          <Search size={18} className="absolute left-3.5 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Product Name or SKU..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 transition-colors"
          />
        </div>

        {/* Type Filter */}
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-blue-500" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-sm text-slate-700 focus:outline-none focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
          >
            <option value="All">All Transaction Types</option>
            <option value="System Initialization">System Initialization</option>
            <option value="Purchase Receipt">Purchase Receipt</option>
            <option value="Sales Delivery">Sales Delivery</option>
            <option value="Manufacturing Consumption">Manufacturing Consumption</option>
            <option value="Manufacturing Production">Manufacturing Production</option>
            <option value="Inventory Adjustment">Inventory Adjustment</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="glass-panel p-12 text-center text-blue-600 font-mono">LOADING AUDIT LEDGER...</div>
      ) : isError ? (
        <div className="glass-panel p-12 text-center text-red-500">
          Error loading stock ledger: {error.message}
        </div>
      ) : filteredLedger.length === 0 ? (
        <div className="glass-panel p-12 text-center text-slate-500 text-sm">
          No ledger logs match your criteria.
        </div>
      ) : (
        <div className="bg-white rounded-2xl overflow-x-auto border border-slate-250 shadow-sm">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Product Details</th>
                <th className="px-6 py-4">Transaction Type</th>
                <th className="px-6 py-4">Quantity Change</th>
                <th className="px-6 py-4">Inventory Balance</th>
                <th className="px-6 py-4">Reference & Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
              {filteredLedger.map((item) => {
                const isAddition = item.quantityChange > 0;
                return (
                  <tr key={item._id} className="hover:bg-slate-55/50 transition-colors">
                    {/* Timestamp */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-500">
                      <div>{new Date(item.createdAt).toLocaleDateString()}</div>
                      <div className="font-mono mt-0.5 text-slate-400">
                        {new Date(item.createdAt).toLocaleTimeString()}
                      </div>
                    </td>

                    {/* Product */}
                    <td className="px-6 py-4">
                      {item.product ? (
                        <>
                          <div className="font-semibold text-slate-900">{item.product.name}</div>
                          <div className="text-[11px] font-mono text-blue-600 font-medium mt-0.5">{item.product.sku}</div>
                        </>
                      ) : (
                        <span className="text-xs text-red-500 font-semibold flex items-center gap-1">
                          <Tag size={12} /> Unknown / Deleted Product
                        </span>
                      )}
                    </td>

                    {/* Transaction Type */}
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-[11px] font-medium whitespace-nowrap ${getTransactionBadge(item.transactionType)}`}>
                        {item.transactionType}
                      </span>
                    </td>

                    {/* Qty Change */}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`flex items-center gap-1.5 font-bold ${
                        isAddition ? 'text-emerald-600' : 'text-red-600'
                      }`}>
                        {isAddition ? (
                          <ArrowUpRight size={14} className="text-emerald-600" />
                        ) : (
                          <ArrowDownLeft size={14} className="text-red-600" />
                        )}
                        <span>{isAddition ? '+' : ''}{item.quantityChange}</span>
                      </div>
                    </td>

                    {/* Balance */}
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-slate-600">
                      <span className="font-mono text-slate-400">{item.prevOnHand}</span>
                      <span className="mx-2 text-slate-400 font-light">&rarr;</span>
                      <span className="font-semibold text-slate-800 font-mono">{item.newOnHand}</span>
                      <span className="text-[10px] text-slate-400 ml-1">Units</span>
                    </td>

                    {/* Reference & Performed By */}
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-xs font-semibold text-slate-700 font-mono">
                          Ref: {item.referenceId || 'N/A'}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          by <span className="text-blue-600 font-medium">{item.performedBy?.username || 'System'}</span> ({item.performedBy?.role || 'Admin'})
                        </span>
                        {item.notes && (
                          <span className="text-[10px] italic text-slate-400 mt-0.5 max-w-[200px] truncate" title={item.notes}>
                            &ldquo;{item.notes}&rdquo;
                          </span>
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
    </Layout>
  );
};

export default StockLedger;
