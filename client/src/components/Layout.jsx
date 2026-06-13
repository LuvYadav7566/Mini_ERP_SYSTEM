import React from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import NotificationToast from './NotificationToast';

const Layout = ({ children, title }) => {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-darkBg text-slate-100">
      {/* Sidebar navigation */}
      <Sidebar />

      {/* Main workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <Header title={title} />

        {/* Dynamic content rendering */}
        <main className="flex-1 overflow-y-auto p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-950/20 via-darkBg to-darkBg">
          <div className="max-w-7xl mx-auto space-y-6">
            {children}
          </div>
        </main>
      </div>

      {/* Toast notifications */}
      <NotificationToast />
    </div>
  );
};

export default Layout;
