import React, { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Navbar } from './Navbar.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import { OdooSyncModal } from '../odoo/OdooSyncModal.tsx';
import {
  LayoutDashboard,
  Package,
  CalendarCheck,
  Receipt,
  CreditCard,
  Percent,
  Layers,
  FileText,
  Download,
  Database,
  ShieldCheck,
  Activity,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [isOdooOpen, setIsOdooOpen] = useState(false);

  const navItems = [
    { to: '/dashboard', label: 'Finance Dashboard', icon: LayoutDashboard },
    { to: '/subscriptions', label: 'Subscriptions', icon: CalendarCheck },
    { to: '/templates', label: 'Quotation Templates', icon: FileText },
    { to: '/invoices', label: 'Invoices & Billing', icon: Receipt },
    { to: '/payments', label: 'Payments Register', icon: CreditCard },
    { to: '/products', label: 'Products & Variants', icon: Package, adminOnly: true },
    { to: '/plans', label: 'Subscription Plans', icon: Layers, adminOnly: true },
    { to: '/taxes-discounts', label: 'Taxes & Discounts', icon: Percent, adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-[#edf2f7] flex flex-col w-full">
      <Navbar />

      {/* Whole-screen fluid workspace */}
      <div className="flex-1 w-full px-4 sm:px-6 lg:px-10 py-6 flex flex-col lg:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full lg:w-64 xl:w-72 shrink-0">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sticky top-20 space-y-4">
            <div>
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3 py-1.5">
                Core Workspace
              </div>
              <nav className="space-y-1">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
                          isActive
                            ? 'bg-gradient-to-r from-indigo-50 to-indigo-100/70 text-indigo-700 shadow-sm border border-indigo-200/80 font-bold'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                        }`
                      }
                    >
                      <div className="flex items-center gap-2.5">
                        <Icon className="w-4 h-4 shrink-0 text-slate-500" />
                        <span>{item.label}</span>
                      </div>
                      {item.adminOnly && (
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-500 uppercase tracking-tighter">
                          Admin
                        </span>
                      )}
                    </NavLink>
                  );
                })}
              </nav>
            </div>

            {/* Quick Actions & ERP Integration */}
            <div className="pt-3 border-t border-slate-100 space-y-2">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3 py-1">
                Ecosystem & Sync
              </div>
              <button
                type="button"
                onClick={() => setIsOdooOpen(true)}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold text-purple-700 bg-purple-50 hover:bg-purple-100/80 border border-purple-200/80 transition shadow-sm"
              >
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-purple-600" />
                  <span>Odoo ERP Connector</span>
                </div>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </button>

              <div className="px-2 pt-1">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1.5 px-1">
                  Export Data Ledgers (CSV)
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <a
                    href="/api/export/subscriptions.csv"
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition border border-slate-200/60"
                    download
                  >
                    <Download className="w-3 h-3" /> Subs CSV
                  </a>
                  <a
                    href="/api/export/invoices.csv"
                    className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition border border-slate-200/60"
                    download
                  >
                    <Download className="w-3 h-3" /> Invoices
                  </a>
                </div>
              </div>
            </div>

            {/* Role Context Capsule */}
            <div className="pt-3 border-t border-slate-100 px-3">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>{isAdmin ? 'System Administrator' : 'Billing Staff Workspace'}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                {isAdmin
                  ? 'Full authorization: pricing plans, catalog SKUs, taxes, discounts, and ledger exports.'
                  : 'Authorized for subscription lifecycle, quotation issuance, and invoice payment receipts.'}
              </p>
            </div>
          </div>
        </aside>

        {/* Content Outlet expanding to whole screen */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      <OdooSyncModal isOpen={isOdooOpen} onClose={() => setIsOdooOpen(false)} />
    </div>
  );
};
