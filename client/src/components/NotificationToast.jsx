import React, { useEffect, useState } from 'react';
import { useSocket } from '../context/SocketContext';
import { Bell, X } from 'lucide-react';

const NotificationToast = () => {
  const { socket } = useSocket();
  const [activeToast, setActiveToast] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleNewNotification = (data) => {
      setActiveToast({
        id: Date.now(),
        message: data.message,
        type: data.type || 'info',
      });

      // Auto dismiss
      const timer = setTimeout(() => {
        setActiveToast(null);
      }, 5000);

      return () => clearTimeout(timer);
    };

    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket]);

  if (!activeToast) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 max-w-sm w-full glass-panel-glow rounded-xl p-4 flex gap-3 items-start border border-cyan-500/30 shadow-[0_0_15px_rgba(0,242,254,0.15)] bg-slate-900">
      <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
        <Bell size={20} className="animate-bounce" />
      </div>
      <div className="flex-1">
        <h4 className="font-semibold text-slate-100 text-sm">System Update</h4>
        <p className="text-xs text-slate-300 mt-1">{activeToast.message}</p>
      </div>
      <button 
        onClick={() => setActiveToast(null)} 
        className="text-slate-400 hover:text-slate-200 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
};

export default NotificationToast;
