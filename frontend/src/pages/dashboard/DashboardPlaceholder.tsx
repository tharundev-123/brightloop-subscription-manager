import React from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { Navbar } from '../../components/layout/Navbar.tsx';
import { Shield, Sparkles, Database, Users, CheckCircle } from 'lucide-react';

export const DashboardPlaceholder: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
                <Sparkles className="w-3.5 h-3.5" /> Phase 2 Verification Mode
              </div>
              <h1 className="text-2xl font-bold text-slate-900">
                Welcome back, {user?.name}
              </h1>
              <p className="text-slate-500 text-sm mt-1">
                You are currently signed in as an internal <strong className="text-indigo-600">{user?.role}</strong>.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-emerald-50 text-emerald-800 text-xs font-semibold border border-emerald-200">
                <CheckCircle className="w-4 h-4 text-emerald-600" />
                Auth & RBAC Active
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center mb-3">
              <Shield className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">Role-Based Access</h3>
            <p className="text-slate-500 text-xs mt-1">
              Admin has full control to create staff, products, plans, taxes and discounts. Staff can manage day-to-day operations.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center mb-3">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">Seeded Performance DB</h3>
            <p className="text-slate-500 text-xs mt-1">
              Over 1,050 subscriptions, 600 invoices, and 461 payments pre-loaded and ready for subsequent phases.
            </p>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900 text-base">Customer Gatekeeping</h3>
            <p className="text-slate-500 text-xs mt-1">
              Customers cannot access this internal staff dashboard and are strictly isolated to their self-service portal.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

