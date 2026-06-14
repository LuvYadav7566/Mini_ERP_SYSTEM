import React from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { getSalesOrders } from '../services/salesService';
import { getProducts } from '../services/productService';
import { getPurchaseOrders } from '../services/purchaseService';
import { getManufacturingOrders } from '../services/manufacturingService';
import { 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  Package, 
  IndianRupee, 
  ShoppingCart, 
  Percent, 
  Database,
  BarChart3,
  PieChart as PieIcon,
  Activity
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

const Dashboard = () => {
  const { user, hasRole } = useAuth();

  const isOwnerOrAdmin = hasRole(['Admin', 'Business Owner']);
  const isManufacturingUser = hasRole(['Manufacturing User']);

  // Fetch Manufacturing Orders (conditional for manufacturing user/admin/owner)
  const { data: manufacturingOrders = [], isLoading: manufacturingLoading } = useQuery({
    queryKey: ['manufacturingOrders'],
    queryFn: getManufacturingOrders,
    enabled: isManufacturingUser || isOwnerOrAdmin,
  });

  const completedMOCount = manufacturingOrders.filter(o => o.status === 'Completed').length;
  const waitingMOCount = manufacturingOrders.filter(o => ['Draft', 'Confirmed'].includes(o.status)).length;
  const remainingMOCount = manufacturingOrders.filter(o => o.status === 'In Progress').length;

  // Fetch Sales Orders
  const { data: salesOrders = [] } = useQuery({
    queryKey: ['salesOrders'],
    queryFn: getSalesOrders,
  });

  // Fetch Products (conditional for admin/owner)
  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: getProducts,
    enabled: isOwnerOrAdmin,
  });

  // Fetch Purchase Orders (conditional for admin/owner)
  const { data: purchaseOrders = [] } = useQuery({
    queryKey: ['purchaseOrders'],
    queryFn: getPurchaseOrders,
    enabled: isOwnerOrAdmin,
  });

  // Calculate metrics for simplified view (sales/inventory staff roles)
  const partiallyDeliverableCount = salesOrders.filter(so => so.status === 'Partially Deliverable').length;
  const waitingForStockCount = salesOrders.filter(so => so.status === 'Waiting for Stock').length;
  const totalSalesCount = salesOrders.length;

  // Calculate metrics for Owner/Admin view
  const confirmedSales = salesOrders.filter(so => so.status !== 'Draft' && so.status !== 'Cancelled');
  const totalSalesRevenue = confirmedSales.reduce((acc, so) => acc + so.totalAmount, 0);

  const activePurchases = purchaseOrders.filter(po => po.status !== 'Cancelled');
  const totalPurchasesCost = activePurchases.reduce((acc, po) => acc + po.totalAmount, 0);

  const grossProfit = totalSalesRevenue - totalPurchasesCost;
  const profitMargin = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;

  const totalInventoryValue = products.reduce((acc, p) => acc + ((p.freeToUse || 0) * (p.costPrice || 0)), 0);

  // Generate trend data for the last 7 days
  const getLast7DaysData = () => {
    const data = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateString = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
      
      const dayStart = new Date(date);
      dayStart.setHours(0, 0, 0, 0);
      
      const dayEnd = new Date(date);
      dayEnd.setHours(23, 59, 59, 999);

      const daySales = salesOrders
        .filter(so => so.status !== 'Draft' && so.status !== 'Cancelled' && new Date(so.createdAt) >= dayStart && new Date(so.createdAt) <= dayEnd)
        .reduce((acc, so) => acc + so.totalAmount, 0);

      const dayPurchases = purchaseOrders
        .filter(po => po.status !== 'Cancelled' && new Date(po.createdAt) >= dayStart && new Date(po.createdAt) <= dayEnd)
        .reduce((acc, po) => acc + po.totalAmount, 0);

      data.push({
        name: dateString,
        Sales: parseFloat(daySales.toFixed(2)),
        Purchases: parseFloat(dayPurchases.toFixed(2)),
      });
    }
    return data;
  };

  const trendData = getLast7DaysData();

  // Status Pie Chart Data
  const getStatusDistribution = () => {
    const counts = {};
    salesOrders.forEach(so => {
      counts[so.status] = (counts[so.status] || 0) + 1;
    });
    return Object.keys(counts).map(status => ({
      name: status,
      value: counts[status]
    }));
  };

  const statusPieData = getStatusDistribution();
  const PIE_COLORS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#ef4444', '#64748b'];

  // Top Products by Stock Value
  const getTopProductsByValue = () => {
    return [...products]
      .map(p => ({
        name: p.sku,
        nameFull: p.name,
        value: parseFloat(((p.freeToUse || 0) * (p.costPrice || 0)).toFixed(2))
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);
  };

  const topProductsData = getTopProductsByValue();

  // Categories Breakdown
  const getCategoryBreakdown = () => {
    const counts = {};
    products.forEach(p => {
      counts[p.category] = (counts[p.category] || 0) + 1;
    });
    return Object.keys(counts).map(cat => ({
      name: cat,
      value: counts[cat]
    }));
  };

  const categoryPieData = getCategoryBreakdown();

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        {/* Welcome Banner */}
        <div className="glass-panel p-8 rounded-2xl bg-white border border-slate-200/80 shadow-sm relative overflow-hidden">
          <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-blue-50/50 to-transparent pointer-events-none" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">
            Welcome to Shiv Furniture Works, <span className="text-blue-600 capitalize">{user?.username}</span>!
          </h2>
          <p className="text-slate-500 text-sm max-w-xl">
            You are logged in with security clearance. Custom modules and metrics are loaded based on your account credentials.
          </p>
          <div className="mt-6 inline-flex p-3.5 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-xs font-semibold uppercase tracking-wider">
            Clearance Level: {user?.role}
          </div>
        </div>

        {isOwnerOrAdmin ? (
          /* OWNER & ADMIN VISUAL DASHBOARD */
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Owner Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {/* Sales Revenue */}
              <div className="glass-panel p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                  <IndianRupee size={24} />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Sales Revenue</span>
                  <span className="text-lg font-bold text-slate-800">₹{totalSalesRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">All confirmed orders</span>
                </div>
              </div>

              {/* Purchase Cost */}
              <div className="glass-panel p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                  <ShoppingCart size={24} />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Purchase Cost</span>
                  <span className="text-lg font-bold text-slate-800">₹{totalPurchasesCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">All active procurements</span>
                </div>
              </div>

              {/* Gross Margin */}
              <div className="glass-panel p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className={`w-12 h-12 rounded-xl border flex items-center justify-center ${
                  profitMargin >= 30 
                    ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                    : profitMargin > 0 
                    ? 'bg-amber-50 text-amber-600 border-amber-100'
                    : 'bg-rose-50 text-rose-600 border-rose-100'
                }`}>
                  <Percent size={24} />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Gross Margin</span>
                  <span className="text-lg font-bold text-slate-800">{profitMargin.toFixed(1)}%</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    Profit: ₹{grossProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Stock Value */}
              <div className="glass-panel p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-cyan-50 text-cyan-600 border border-cyan-100 flex items-center justify-center">
                  <Database size={24} />
                </div>
                <div>
                  <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Inventory Value</span>
                  <span className="text-lg font-bold text-slate-800">₹{totalInventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                  <span className="text-[10px] text-slate-500 block mt-0.5">Based on product cost price</span>
                </div>
              </div>
            </div>

            {/* Owner Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sales vs Purchases Area Chart */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Activity size={16} className="text-blue-500" /> Sales vs Purchases Trend (7 Days)
                </h3>
                <div className="h-72 w-full text-xs font-sans">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={trendData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <defs>
                        <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                        </linearGradient>
                        <linearGradient id="colorPurchases" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                          <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip formatter={(value) => `₹${value}`} />
                      <Legend />
                      <Area type="monotone" dataKey="Sales" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorSales)" />
                      <Area type="monotone" dataKey="Purchases" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorPurchases)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Top Products by Value Bar Chart */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 size={16} className="text-cyan-500" /> Top 5 Products by Stock Value
                </h3>
                <div className="h-72 w-full text-xs font-sans">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={topProductsData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                      <XAxis dataKey="name" stroke="#64748b" />
                      <YAxis stroke="#64748b" />
                      <Tooltip formatter={(value) => `₹${value}`} />
                      <Legend />
                      <Bar dataKey="value" name="Stock Value" fill="#06b6d4" radius={[6, 6, 0, 0]}>
                        {topProductsData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Sales Order Status Pie Chart */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <PieIcon size={16} className="text-purple-500" /> Sales Orders Status Distribution
                </h3>
                <div className="h-72 w-full text-xs font-sans flex items-center justify-center">
                  {statusPieData.length === 0 ? (
                    <div className="text-slate-400 text-xs">No orders recorded</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusPieData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={90}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {statusPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>

              {/* Product Category Breakdown Pie Chart */}
              <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <Package size={16} className="text-emerald-500" /> Product Category Breakdown
                </h3>
                <div className="h-72 w-full text-xs font-sans flex items-center justify-center">
                  {categoryPieData.length === 0 ? (
                    <div className="text-slate-400 text-xs">No products recorded</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={categoryPieData}
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          dataKey="value"
                        >
                          {categoryPieData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={PIE_COLORS[(index + 2) % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : isManufacturingUser ? (
          /* MANUFACTURING STAFF DASHBOARD */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* Completed */}
            <div className="glass-panel p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider font-semibold">Completed</span>
                <span className="text-2xl font-bold text-slate-800">
                  {manufacturingLoading ? '...' : completedMOCount}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Manufacturing orders completed</span>
              </div>
            </div>

            {/* Waiting */}
            <div className="glass-panel p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                <Clock size={24} />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider font-semibold">Waiting</span>
                <span className="text-2xl font-bold text-slate-800">
                  {manufacturingLoading ? '...' : waitingMOCount}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Orders awaiting production run</span>
              </div>
            </div>

            {/* Remaining */}
            <div className="glass-panel p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider font-semibold">Remaining</span>
                <span className="text-2xl font-bold text-slate-800">
                  {manufacturingLoading ? '...' : remainingMOCount}
                </span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Orders currently in progress</span>
              </div>
            </div>
          </div>
        ) : (
          /* STANDARD SALES/INVENTORY STAFF DASHBOARD */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in fade-in duration-200">
            {/* Partially Deliverable */}
            <div className="glass-panel p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 border border-amber-100 flex items-center justify-center">
                <Clock size={24} />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Partially Deliverable</span>
                <span className="text-2xl font-bold text-slate-800">{partiallyDeliverableCount}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Orders with partial stock shipped</span>
              </div>
            </div>

            {/* Waiting for Stock */}
            <div className="glass-panel p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 flex items-center justify-center">
                <AlertCircle size={24} />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Waiting for Stock</span>
                <span className="text-2xl font-bold text-slate-800">{waitingForStockCount}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Orders awaiting procurement completion</span>
              </div>
            </div>

            {/* Total Sales Orders */}
            <div className="glass-panel p-6 rounded-2xl bg-white border border-slate-200/80 shadow-sm flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
              <div>
                <span className="text-xs text-slate-400 block font-medium uppercase tracking-wider">Total Sales Orders</span>
                <span className="text-2xl font-bold text-slate-800">{totalSalesCount}</span>
                <span className="text-[10px] text-slate-500 block mt-0.5">Total orders raised in system</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default Dashboard;
