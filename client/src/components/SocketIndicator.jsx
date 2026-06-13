import React from 'react';
import { useSocket } from '../context/SocketContext';

const SocketIndicator = () => {
  const { connected } = useSocket();

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-900/60 border border-slate-800">
      <span className={`w-2 h-2 rounded-full ${connected ? 'bg-successGlow shadow-[0_0_8px_#00ff87] animate-pulse' : 'bg-dangerGlow shadow-[0_0_8px_#ff007f]'}`}></span>
      <span className="text-slate-400">{connected ? 'Connected' : 'Disconnected'}</span>
    </div>
  );
};

export default SocketIndicator;
