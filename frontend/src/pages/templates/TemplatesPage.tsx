import React, { useState, useEffect } from 'react';
import api from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import {
  FileText,
  Plus,
  Zap,
  CheckCircle2,
  Calendar,
  Layers,
  Sparkles,
} from 'lucide-react';

interface TemplateLine {
  id: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  product: { id: string; name: string; type: string };
}

interface QuotationTemplate {
  id: string;
  name: string;
  validDays: number;
  notes: string | null;
  plan: { id: string; name: string; price: number; billingPeriod: string };
  lines: TemplateLine[];
}

export const TemplatesPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [templates, setTemplates] = useState<QuotationTemplate[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 1-Click Instantiation Modal
  const [isInstantModalOpen, setIsInstantModalOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<QuotationTemplate | null>(null);
  const [instantCustomerId, setInstantCustomerId] = useState('');
  const [instantPaymentTerms, setInstantPaymentTerms] = useState('IMMEDIATE');
  const [instantSuccess, setInstantSuccess] = useState<string | null>(null);

  // New Template Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [planId, setPlanId] = useState('');
  const [validDays, setValidDays] = useState('30');
  const [notes, setNotes] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [lineQty, setLineQty] = useState('1');
  const [linePrice, setLinePrice] = useState('');
  const [templateLines, setTemplateLines] = useState<any[]>([]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [tplRes, custRes, planRes, prodRes] = await Promise.all([
        api.get('/templates'),
        api.get('/users?role=CUSTOMER&limit=50'),
        api.get('/plans'),
        api.get('/products?limit=50'),
      ]);
      setTemplates(tplRes.data.data);
      setCustomers(custRes.data.data);
      setPlans(planRes.data.data);
      setProducts(prodRes.data.data);
      if (planRes.data.data.length > 0) {
        setPlanId(planRes.data.data[0].id);
      }
      if (custRes.data.data.length > 0) {
        setInstantCustomerId(custRes.data.data[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenInstantModal = (template: QuotationTemplate) => {
    setSelectedTemplate(template);
    setInstantSuccess(null);
    setIsInstantModalOpen(true);
  };

  const handleInstantCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate || !instantCustomerId) return;

    try {
      const res = await api.post('/subscriptions/from-template', {
        templateId: selectedTemplate.id,
        customerId: instantCustomerId,
        paymentTerms: instantPaymentTerms,
      });

      setInstantSuccess(
        `Subscription ${res.data.subscription.subscriptionNumber} created successfully in status '${res.data.subscription.status}'!`
      );
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create subscription from template');
    }
  };

  const handleAddLine = () => {
    if (!selectedProductId) return;
    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const unitPrice = parseFloat(linePrice) || prod.salesPrice;
    setTemplateLines([
      ...templateLines,
      {
        productId: prod.id,
        name: prod.name,
        quantity: parseInt(lineQty) || 1,
        unitPrice,
      },
    ]);
    setSelectedProductId('');
    setLineQty('1');
    setLinePrice('');
  };

  const handleCreateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/templates', {
        name,
        planId,
        validDays: parseInt(validDays) || 30,
        notes,
        lines: templateLines,
      });

      setIsCreateModalOpen(false);
      setName('');
      setValidDays('30');
      setNotes('');
      setTemplateLines([]);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create template');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" /> Quotation Templates
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Pre-configured bundles and quote packages that instantiate into formal subscriptions with 1 click
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition shrink-0"
        >
          <Plus className="w-4 h-4" /> Create New Template
        </button>
      </div>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="py-12 text-center text-slate-500 text-sm">Loading quotation templates...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {templates.map((tpl) => {
            const linesTotal = tpl.lines.reduce((acc, l) => acc + l.quantity * l.unitPrice, 0);
            const totalWithPlan = tpl.plan.price + linesTotal;

            return (
              <div
                key={tpl.id}
                className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 flex flex-col justify-between hover:border-indigo-300 transition"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <h3 className="text-base font-bold text-slate-900">{tpl.name}</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Valid {tpl.validDays} Days
                    </span>
                  </div>

                  {tpl.notes && (
                    <p className="text-xs text-slate-500 mb-3">{tpl.notes}</p>
                  )}

                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-xs space-y-1.5 my-3">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span>Default Plan:</span>
                      <span>
                        {tpl.plan.name} (${tpl.plan.price}/{tpl.plan.billingPeriod.toLowerCase()})
                      </span>
                    </div>

                    <div className="pt-2 border-t border-slate-200/70">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Pre-filled Product Lines:
                      </span>
                      {tpl.lines.map((l) => (
                        <div key={l.id} className="flex items-center justify-between text-slate-600">
                          <span>
                            {l.quantity}x {l.product.name}
                          </span>
                          <span className="font-medium text-slate-900">
                            ${(l.quantity * l.unitPrice).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between mt-2">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-bold block">Estimated Total</span>
                    <span className="text-base font-extrabold text-slate-900">
                      ~${totalWithPlan.toFixed(2)}
                    </span>
                  </div>

                  <button
                    onClick={() => handleOpenInstantModal(tpl)}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition"
                  >
                    <Zap className="w-3.5 h-3.5 text-amber-300" />
                    1-Click Subscription
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: 1-Click Instant Subscription */}
      <Modal
        isOpen={isInstantModalOpen}
        onClose={() => setIsInstantModalOpen(false)}
        title="1-Click Create Subscription"
        maxWidth="md"
      >
        {instantSuccess ? (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-7 h-7" />
            </div>
            <div className="text-sm font-semibold text-slate-900">{instantSuccess}</div>
            <div className="pt-2 flex justify-center gap-3">
              <button
                type="button"
                onClick={() => setIsInstantModalOpen(false)}
                className="px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-lg hover:bg-indigo-700 transition"
              >
                Close & View Subscriptions
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleInstantCreate} className="space-y-4 text-xs">
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-lg">
              <span className="font-bold text-indigo-900 block">Template Selected:</span>
              <span className="text-slate-700 font-medium">{selectedTemplate?.name}</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Select Customer *</label>
              <select
                required
                value={instantCustomerId}
                onChange={(e) => setInstantCustomerId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
              >
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.email})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Payment Terms</label>
              <select
                value={instantPaymentTerms}
                onChange={(e) => setInstantPaymentTerms(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
              >
                <option value="IMMEDIATE">Immediate</option>
                <option value="NET_15">Net 15 Days</option>
                <option value="NET_30">Net 30 Days</option>
              </select>
            </div>

            <div className="pt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsInstantModalOpen(false)}
                className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5 text-amber-300" />
                Generate Subscription
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal: Create Template */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Build Quotation Template"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateTemplate} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Template Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Growth SaaS Bundle"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Plan *</label>
              <select
                value={planId}
                onChange={(e) => setPlanId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
              >
                {plans.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.price}/{p.billingPeriod.toLowerCase()})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Valid Days</label>
              <input
                type="number"
                value={validDays}
                onChange={(e) => setValidDays(e.target.value)}
                placeholder="30"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none text-xs"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Template Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Package description, SLA assurances..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          {/* Add Line Section */}
          <div className="pt-3 border-t border-slate-200">
            <span className="font-semibold text-slate-800 block mb-2">Include Products in Bundle</span>
            <div className="flex gap-2">
              <select
                value={selectedProductId}
                onChange={(e) => {
                  setSelectedProductId(e.target.value);
                  const p = products.find((x) => x.id === e.target.value);
                  if (p) setLinePrice(String(p.salesPrice));
                }}
                className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-xs"
              >
                <option value="">Select a Product...</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (${p.salesPrice})
                  </option>
                ))}
              </select>
              <input
                type="number"
                min="1"
                value={lineQty}
                onChange={(e) => setLineQty(e.target.value)}
                placeholder="Qty"
                className="w-16 px-2 py-2 border border-slate-300 rounded-lg text-xs"
              />
              <input
                type="number"
                step="0.01"
                value={linePrice}
                onChange={(e) => setLinePrice(e.target.value)}
                placeholder="Unit $"
                className="w-20 px-2 py-2 border border-slate-300 rounded-lg text-xs"
              />
              <button
                type="button"
                onClick={handleAddLine}
                className="px-3 py-2 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition text-xs font-semibold shrink-0"
              >
                + Add
              </button>
            </div>

            {templateLines.length > 0 && (
              <div className="mt-3 space-y-1 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                {templateLines.map((line, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs text-slate-700">
                    <span>
                      {line.quantity}x {line.name}
                    </span>
                    <span className="font-semibold">
                      ${(line.quantity * line.unitPrice).toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition"
            >
              Save Template
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

