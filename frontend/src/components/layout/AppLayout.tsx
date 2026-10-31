import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { Navbar } from './Navbar.tsx';
import { useAuth } from '../../context/AuthContext.tsx';
import {
  LayoutDashboard,
  Package,
  CalendarCheck,
  Receipt,
  CreditCard,
  Percent,
  Layers,
  FileText,
} from 'lucide-react';

export const AppLayout: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const navItems = [
    { to: '/dashboard', label: 'Finance Dashboard', icon: LayoutDashboard },
    { to: '/subscriptions', label: 'Subscriptions', icon: CalendarCheck },
    { to: '/templates', label: 'Quotation Templates', icon: FileText },
    { to: '/invoices', label: 'Invoices & Billing', icon: Receipt },
    { to: '/payments', label: 'Payments', icon: CreditCard },
    { to: '/products', label: 'Products & Variants', icon: Package, adminOnly: true },
    { to: '/plans', label: 'Subscription Plans', icon: Layers, adminOnly: true },
    { to: '/taxes-discounts', label: 'Taxes & Discounts', icon: Percent, adminOnly: true },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col md:flex-row gap-6">
        {/* Navigation Sidebar */}
        <aside className="w-full md:w-64 shrink-0">
          <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-3 sticky top-20">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-3 py-2">
              Navigation
            </div>
            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3 py-2 rounded-lg text-sm font-medium transition ${
                        isActive
                          ? 'bg-indigo-50 text-indigo-700 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`
                    }
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 shrink-0" />
                      <span>{item.label}</span>
                    </div>
                    {item.adminOnly && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500 uppercase tracking-tight">
                        {isAdmin ? 'Admin' : 'View'}
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </nav>

            <div className="mt-6 pt-4 border-t border-slate-100 px-3">
              <div className="text-xs font-semibold text-slate-700">Role Authority</div>
              <p className="text-[11px] text-slate-500 mt-1 leading-normal">
                {isAdmin
                  ? '👑 You have full Administrator privileges to create and modify products, plans, taxes, and discounts.'
                  : '💼 You have Staff privileges to create quotations, subscriptions, invoices, and record payments.'}
              </p>
            </div>
          </div>
        </aside>

        {/* Content Outlet */}
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
