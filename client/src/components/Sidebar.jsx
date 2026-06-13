import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Package, 
  Warehouse, 
  ShoppingCart, 
  TrendingUp, 
  Wrench, 
  ClipboardList, 
  Users, 
  LogOut 
} from 'lucide-react';

const Sidebar = () => {
  const { user, logout, hasRole } = useAuth();

  const links = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard, roles: ['Admin', 'Sales User', 'Purchase User', 'Manufacturing User', 'Inventory Manager', 'Business Owner'] },
    { to: '/products', label: 'Products', icon: Package, roles: ['Admin', 'Inventory Manager', 'Business Owner', 'Sales User', 'Purchase User', 'Manufacturing User'] },
    { to: '/inventory', label: 'Inventory Stock', icon: Warehouse, roles: ['Admin', 'Inventory Manager', 'Business Owner', 'Sales User', 'Purchase User', 'Manufacturing User'] },
    { to: '/sales', label: 'Sales Orders', icon: TrendingUp, roles: ['Admin', 'Sales User', 'Business Owner'] },
    { to: '/purchase', label: 'Purchase Orders', icon: ShoppingCart, roles: ['Admin', 'Purchase User', 'Business Owner'] },
    { to: '/manufacturing', label: 'Manufacturing', icon: Wrench, roles: ['Admin', 'Manufacturing User', 'Business Owner'] },
    { to: '/bom', label: 'Bills of Materials', icon: ClipboardList, roles: ['Admin', 'Manufacturing User', 'Inventory Manager', 'Business Owner'] },
    { to: '/audit-logs', label: 'Audit Logs', icon: ClipboardList, roles: ['Admin', 'Business Owner'] },
    { to: '/users', label: 'User Admin', icon: Users, roles: ['Admin'] },
  ];

  return (
    <aside className="w-64 glass-panel border-r border-slate-800 flex flex-col h-screen p-4">
      {/* Header */}
      <div className="py-4 border-b border-slate-800/80 mb-6 flex flex-col items-center">
        <h2 className="text-xl font-bold bg-gradient-to-r from-cyan-400 to-indigo-400 bg-clip-text text-transparent">
          Shiv Furniture
        </h2>
        <span className="text-[10px] uppercase tracking-wider text-cyan-400 font-semibold mt-1">
          Mini ERP Engine
        </span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 space-y-1.5 overflow-y-auto pr-1">
        {links.map((link) => {
          if (!hasRole(link.roles)) return null;
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-300 ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/15 to-indigo-500/5 border-l-4 border-cyan-400 text-cyan-400 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30 border-l-4 border-transparent'
                }`
              }
            >
              <Icon size={18} />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Profile & Logout */}
      <div className="pt-4 border-t border-slate-800/80 flex flex-col gap-3">
        <div className="flex items-center gap-3 px-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center font-bold text-slate-900 text-sm flex-shrink-0">
            {user?.username?.substring(0, 2).toUpperCase() || 'US'}
          </div>
          <div className="overflow-hidden">
            <h4 className="text-sm font-semibold text-slate-200 truncate">{user?.username}</h4>
            <p className="text-[11px] text-slate-400 truncate">{user?.role}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-300 w-full"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
