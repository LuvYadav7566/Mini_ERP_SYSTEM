import React, { useState } from 'react';
import SocketIndicator from './SocketIndicator';
import { useSocket } from '../context/SocketContext';
import { Bell, CheckSquare, Trash2 } from 'lucide-react';

const Header = ({ title }) => {
  const { notifications, clearNotifications, markAsRead } = useSocket();
  const [showDropdown, setShowDropdown] = useState(false);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  return (
    <header className="bg-white border-b border-slate-200 h-16 px-6 flex items-center justify-between sticky top-0 z-30 shadow-sm">
      <h1 className="text-lg font-bold text-slate-800">{title || 'Shiv Furniture Works'}</h1>

      <div className="flex items-center gap-4">
        {/* Socket Status Indicator */}
        <SocketIndicator />

        {/* Notifications Icon & Dropdown */}
        <div className="relative">
          <button 
            onClick={() => setShowDropdown(!showDropdown)} 
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors relative"
          >
            <Bell size={20} className="text-slate-500 hover:text-blue-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-4 h-4 bg-red-500 text-[10px] text-white font-bold rounded-full flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>

          {showDropdown && (
            <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl p-4 shadow-xl border border-slate-200 z-50">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                <h3 className="font-semibold text-sm text-slate-800">System Alerts</h3>
                {notifications.length > 0 && (
                  <button 
                    onClick={clearNotifications}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1"
                  >
                    <Trash2 size={12} /> Clear all
                  </button>
                )}
              </div>

              <div className="max-h-60 overflow-y-auto space-y-2">
                {notifications.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-4">No new notifications</p>
                ) : (
                  notifications.map((n) => (
                    <div 
                      key={n.id} 
                      className={`p-2.5 rounded-lg text-xs transition-colors border ${
                        n.isRead 
                          ? 'bg-slate-50/50 border-transparent text-slate-500' 
                          : 'bg-blue-50/70 border-blue-100 text-slate-700 font-medium'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="flex-1">{n.message}</p>
                        {!n.isRead && (
                          <button 
                            onClick={() => markAsRead(n.id)}
                            className="text-blue-600 hover:text-blue-800 flex-shrink-0"
                            title="Mark as read"
                          >
                            <CheckSquare size={13} />
                          </button>
                        )}
                      </div>
                      <span className="text-[9px] text-slate-400 block mt-1 font-mono">
                        {new Date(n.timestamp || Date.now()).toLocaleTimeString()}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
