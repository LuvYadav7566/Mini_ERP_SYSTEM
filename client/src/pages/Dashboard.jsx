import React from 'react';
import Layout from '../components/Layout';
import { useAuth } from '../context/AuthContext';

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <Layout title="Dashboard">
      <div className="glass-panel p-8 rounded-2xl">
        <h2 className="text-2xl font-bold text-slate-100 mb-2">Welcome to Shiv Furniture Works ERP, <span className="text-cyan-400 capitalize">{user?.username}</span>!</h2>
        <p className="text-slate-400 text-sm">Phase 1: Environment, Boilerplate, Authentication, and Socket.IO Layout is fully operational.</p>
        <div className="mt-6 p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/10 text-cyan-300 text-xs">
          Your role is: <span className="font-bold uppercase tracking-wider">{user?.role}</span>. Custom modules will load based on your security clearance.
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
