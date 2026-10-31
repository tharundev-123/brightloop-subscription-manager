import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal.tsx';
import api from '../../api/client.ts';
import { useToast } from '../../context/ToastContext.tsx';
import { RefreshCw, CheckCircle2, Server, Database, ArrowRight, ShieldCheck, FileText, Package, Users } from 'lucide-react';

interface OdooSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OdooSyncModal: React.FC<OdooSyncModalProps> = ({ isOpen, onClose }) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchOdooStatus();
    }
  }, [isOpen]);

  const fetchOdooStatus = async () => {
    try {
      setIsLoading(true);
      const res = await api.get('/odoo/status');
      setStatus(res.data);
    } catch (err: any) {
      toast.error('Failed to load Odoo status', err.response?.data?.error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTriggerSync = async () => {
    try {
      setIsSyncing(true);
      const res = await api.post('/odoo/sync');
      toast.success(
        'Odoo Sync Complete!',
        `Synced: ${res.data.stats.customersSynced} customers, ${res.data.stats.productsSynced} products, ${res.data.stats.invoicesSynced} invoices.`
      );
      fetchOdooStatus();
    } catch (err: any) {
      toast.error('Sync failed', err.response?.data?.error || err.message);
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Odoo ERP Bi-Directional Synchronization Hub" size="lg">
      <div className="space-y-6 py-2">
        {/* Connection Status Banner */}
        <div className="bg-gradient-to-r from-purple-900 to-indigo-900 text-white rounded-xl p-5 shadow-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center text-purple-300">
                <Database className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-extrabold text-base text-white">Odoo ERP Connector</h3>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    ACTIVE
                  </span>
                </div>
                <p className="text-xs text-purple-200 mt-0.5 font-mono">
                  Target: {status?.config?.url || 'https://demo.odoo.com'} ({status?.config?.db || 'odoo_db'})
                </p>
              </div>
            </div>

            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold text-white bg-purple-600 hover:bg-purple-500 transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Syncing...' : 'Sync Now'}
            </button>
          </div>
        </div>

        {/* Sync Entity Mapping Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Customers</div>
              <div className="text-sm font-extrabold text-slate-900 mt-0.5">res.partner</div>
              <div className="text-[10px] text-slate-500 mt-1">2-way profile & credit sync</div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
              <Package className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Products</div>
              <div className="text-sm font-extrabold text-slate-900 mt-0.5">product.template</div>
              <div className="text-[10px] text-slate-500 mt-1">SKUs, variants, prices sync</div>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-slate-500 uppercase">Invoices</div>
              <div className="text-sm font-extrabold text-slate-900 mt-0.5">account.move</div>
              <div className="text-[10px] text-slate-500 mt-1">GL entries & reconciliation</div>
            </div>
          </div>
        </div>

        {/* Recent Synced Feed */}
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
            Recent Synchronization Ledger
          </div>
          <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 max-h-56 overflow-y-auto">
            {status?.recentRecords && status.recentRecords.length > 0 ? (
              status.recentRecords.map((r: any) => (
                <div key={r.id} className="p-3 text-xs flex items-center justify-between hover:bg-slate-50 transition">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span className="font-semibold text-slate-800">{r.entityType}</span>
                    <span className="text-slate-500 font-mono text-[11px]">{r.details}</span>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    {new Date(r.lastSyncedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-xs text-slate-500">
                No sync records yet. Click "Sync Now" above to initiate.
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end pt-2 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 rounded-lg hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};

