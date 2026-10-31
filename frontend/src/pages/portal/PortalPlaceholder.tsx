import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Navbar } from '../../components/layout/Navbar.tsx';
import { UserCheck, FileText, RefreshCw, CheckCircle2 } from 'lucide-react';

export const PortalPlaceholder: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
                <UserCheck className="w-3.5 h-3.5" /> Customer Self-Service Portal
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                Welcome, {user?.name}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                Account email: <strong className="text-slate-800">{user?.email}</strong>
              </p>
            </div>
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Customer Session Active
              </span>
            </div>
          </div>
        </div>

        <div className="bg-slate-100 rounded-xl p-8 border border-slate-200 text-center">
          <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-indigo-600 mx-auto mb-3 shadow-sm">
            <FileText className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Your Subscription Dashboard</h3>
          <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
            In subsequent phases, you will be able to review active software subscriptions, print PDF invoices, and manage renewals or pauses per your plan policy.
          </p>
        </div>
      </main>
    </div>
  );
};

