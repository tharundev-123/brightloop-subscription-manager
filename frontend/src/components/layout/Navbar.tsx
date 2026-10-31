import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext.tsx';
import { LogOut, User as UserIcon, Shield, Briefcase, UserCheck, RefreshCw, Database, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { OdooSyncModal } from '../odoo/OdooSyncModal.tsx';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOdooModalOpen, setIsOdooModalOpen] = useState(false);

  const getRoleBadge = (role?: string) => {
    switch (role) {
      case 'ADMIN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm">
            <Shield className="w-3 h-3 text-purple-400" />
            ADMIN
          </span>
        );
      case 'STAFF':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm">
            <Briefcase className="w-3 h-3 text-indigo-400" />
            STAFF
          </span>
        );
      case 'CUSTOMER':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
            <UserCheck className="w-3 h-3 text-emerald-400" />
            PORTAL
          </span>
        );
    }
  };

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md w-full">
        {/* Full-width container with responsive side gutters */}
        <div className="w-full px-4 sm:px-6 lg:px-10 h-16 flex items-center justify-between">
          {/* Logo & Brand Identity */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 flex items-center justify-center text-white font-extrabold text-lg shadow-glow group-hover:scale-105 transition-transform duration-200">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl font-black tracking-tight text-white group-hover:text-indigo-300 transition">
                    Brightloop
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 uppercase tracking-widest">
                    v2.0
                  </span>
                </div>
                <span className="text-[11px] block text-slate-400 font-medium -mt-0.5 tracking-tight">
                  Odoo Recurring Billing Engine
                </span>
              </div>
            </Link>
          </div>

          {/* Right Header Navigation & Actions */}
          {user && (
            <div className="flex items-center gap-3.5">
              {/* Odoo Quick Sync Button for Staff/Admin */}
              {user.role !== 'CUSTOMER' && (
                <button
                  onClick={() => setIsOdooModalOpen(true)}
                  className="hidden sm:inline-flex items-center gap-2 text-xs font-bold text-purple-200 hover:text-white bg-slate-800/90 hover:bg-slate-800 px-3.5 py-1.5 rounded-xl border border-purple-500/30 hover:border-purple-500/60 shadow-sm transition"
                  title="Open Odoo ERP Connector Hub"
                >
                  <Database className="w-3.5 h-3.5 text-purple-400" />
                  <span>Odoo Sync</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </button>
              )}

              {/* User Profile Capsule */}
              <div className="flex items-center gap-3 pl-3 border-l border-slate-800 bg-slate-800/40 py-1 px-3 rounded-xl border border-slate-700/50">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-black text-xs shadow-sm">
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="text-right hidden md:block">
                  <div className="text-xs font-bold text-white leading-tight">{user.name}</div>
                  <div className="text-[10px] text-slate-400 font-medium">{user.email}</div>
                </div>
                <div className="ml-1">{getRoleBadge(user.role)}</div>
              </div>

              {/* Sign Out */}
              <button
                onClick={logout}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 px-3 py-1.5 rounded-xl transition border border-transparent hover:border-rose-500/30"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Odoo Sync Modal */}
      <OdooSyncModal
        isOpen={isOdooModalOpen}
        onClose={() => setIsOdooModalOpen(false)}
      />
    </>
  );
};
