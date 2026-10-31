import React, { useState, useEffect } from 'react';
import api from '../../api/client.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { Modal } from '../../components/ui/Modal.tsx';
import { Pagination } from '../../components/ui/Pagination.tsx';
import {
  Package,
  Plus,
  Search,
  Tag,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Layers,
  Trash2,
} from 'lucide-react';

interface Variant {
  id: string;
  productId: string;
  attributeName: string;
  attributeValue: string;
  extraPrice: number;
}

interface Product {
  id: string;
  name: string;
  type: string;
  salesPrice: number;
  costPrice: number;
  notes: string | null;
  variants: Variant[];
}

export const ProductsPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [products, setProducts] = useState<Product[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Expanded variant rows
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // New Product Modal
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('SOFTWARE');
  const [salesPrice, setSalesPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [initialVariantName, setInitialVariantName] = useState('');
  const [initialVariantValue, setInitialVariantValue] = useState('');
  const [initialVariantPrice, setInitialVariantPrice] = useState('');

  // Add Variant Modal
  const [isVariantModalOpen, setIsVariantModalOpen] = useState(false);
  const [targetProductId, setTargetProductId] = useState<string | null>(null);
  const [variantAttr, setVariantAttr] = useState('Brand');
  const [variantVal, setVariantVal] = useState('');
  const [variantExtra, setVariantExtra] = useState('');

  const fetchProducts = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await api.get('/products', {
        params: {
          page,
          limit: 10,
          search: search || undefined,
          type: selectedType || undefined,
        },
      });
      setProducts(res.data.data);
      setTotal(res.data.meta.total);
      setTotalPages(res.data.meta.totalPages);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load products');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [page, selectedType]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const variants = initialVariantName && initialVariantValue
        ? [{
            attributeName: initialVariantName,
            attributeValue: initialVariantValue,
            extraPrice: parseFloat(initialVariantPrice) || 0,
          }]
        : [];

      await api.post('/products', {
        name,
        type,
        salesPrice: parseFloat(salesPrice) || 0,
        costPrice: parseFloat(costPrice) || 0,
        notes,
        variants,
      });

      setIsProductModalOpen(false);
      setName('');
      setSalesPrice('');
      setCostPrice('');
      setNotes('');
      setInitialVariantName('');
      setInitialVariantValue('');
      setInitialVariantPrice('');
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to create product');
    }
  };

  const handleAddVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetProductId) return;

    try {
      await api.post(`/products/${targetProductId}/variants`, {
        attributeName: variantAttr,
        attributeValue: variantVal,
        extraPrice: parseFloat(variantExtra) || 0,
      });

      setIsVariantModalOpen(false);
      setVariantVal('');
      setVariantExtra('');
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to add variant');
    }
  };

  const handleDeleteVariant = async (variantId: string) => {
    if (!window.confirm('Are you sure you want to delete this variant?')) return;
    try {
      await api.delete(`/products/variants/${variantId}`);
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.error || 'Failed to delete variant');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Package className="w-5 h-5 text-indigo-600" /> Products & Variants Catalog
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage software solutions, addons, services, and attribute variants with custom extra pricing
          </p>
        </div>

        {isAdmin ? (
          <button
            onClick={() => setIsProductModalOpen(true)}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-4 py-2.5 rounded-lg shadow-sm transition shrink-0"
          >
            <Plus className="w-4 h-4" /> Add New Product
          </button>
        ) : (
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1.5 rounded-md font-medium border border-slate-200">
            Staff View (Catalog is managed by Admin)
          </span>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products by name or notes..."
            className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          />
        </form>

        <select
          value={selectedType}
          onChange={(e) => {
            setSelectedType(e.target.value);
            setPage(1);
          }}
          className="bg-white border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-700 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
        >
          <option value="">All Types (Software, Service, Addon)</option>
          <option value="SOFTWARE">Software</option>
          <option value="SERVICE">Service</option>
          <option value="ADDON">Addon</option>
        </select>
      </div>

      {/* Product List Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-12 text-center text-slate-500 text-sm">Loading product catalog...</div>
        ) : error ? (
          <div className="p-6 text-center text-rose-600 text-sm">{error}</div>
        ) : products.length === 0 ? (
          <div className="py-12 text-center text-slate-500 text-sm">No products found matching criteria.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-700 uppercase font-bold text-[11px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Product Name</th>
                  <th className="py-3 px-4">Type</th>
                  <th className="py-3 px-4 text-right">Sales Price</th>
                  <th className="py-3 px-4 text-right">Cost Price</th>
                  <th className="py-3 px-4 text-right">Margin</th>
                  <th className="py-3 px-4">Variants</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((prod) => {
                  const margin = prod.salesPrice - prod.costPrice;
                  const isExpanded = expandedId === prod.id;

                  return (
                    <React.Fragment key={prod.id}>
                      <tr className="hover:bg-slate-50/70 transition">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          <div>{prod.name}</div>
                          {prod.notes && (
                            <div className="text-[11px] text-slate-400 font-normal truncate max-w-xs">
                              {prod.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              prod.type === 'SOFTWARE'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : prod.type === 'SERVICE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {prod.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-slate-900">
                          ${prod.salesPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right text-slate-500">
                          ${prod.costPrice.toFixed(2)}
                        </td>
                        <td className="py-3 px-4 text-right font-medium text-emerald-600">
                          +${margin.toFixed(2)}
                        </td>
                        <td className="py-3 px-4">
                          {prod.variants.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                              {prod.variants.slice(0, 2).map((v) => (
                                <span
                                  key={v.id}
                                  className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] border border-slate-200 font-medium"
                                >
                                  {v.attributeValue} (+${v.extraPrice})
                                </span>
                              ))}
                              {prod.variants.length > 2 && (
                                <span className="text-[10px] text-slate-400">
                                  +{prod.variants.length - 2} more
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">Standard (No variants)</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center gap-1">
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : prod.id)}
                              className="px-2 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded flex items-center gap-1 transition"
                            >
                              <Layers className="w-3 h-3" />
                              {prod.variants.length}
                              {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>

                            {isAdmin && (
                              <button
                                onClick={() => {
                                  setTargetProductId(prod.id);
                                  setIsVariantModalOpen(true);
                                }}
                                className="px-2 py-1 text-[11px] font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded transition"
                                title="Add variant"
                              >
                                + Variant
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Variants Sub-Table */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90">
                          <td colSpan={7} className="p-4">
                            <div className="bg-white rounded-lg border border-slate-200 p-4">
                              <div className="flex items-center justify-between mb-2">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                                  Variants for {prod.name}
                                </h4>
                                {isAdmin && (
                                  <button
                                    onClick={() => {
                                      setTargetProductId(prod.id);
                                      setIsVariantModalOpen(true);
                                    }}
                                    className="text-xs text-indigo-600 font-semibold hover:underline"
                                  >
                                    + Add New Variant Value
                                  </button>
                                )}
                              </div>

                              {prod.variants.length === 0 ? (
                                <p className="text-xs text-slate-500">No attribute variants defined.</p>
                              ) : (
                                <table className="w-full text-xs text-left">
                                  <thead>
                                    <tr className="text-slate-400 text-[10px] uppercase border-b border-slate-100">
                                      <th className="py-1">Attribute Name</th>
                                      <th className="py-1">Value</th>
                                      <th className="py-1 text-right">Extra Price</th>
                                      <th className="py-1 text-right">Effective Price</th>
                                      {isAdmin && <th className="py-1 text-center">Action</th>}
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100">
                                    {prod.variants.map((v) => (
                                      <tr key={v.id}>
                                        <td className="py-1.5 font-medium text-slate-700">{v.attributeName}</td>
                                        <td className="py-1.5 font-semibold text-indigo-600">{v.attributeValue}</td>
                                        <td className="py-1.5 text-right font-medium text-amber-600">
                                          +${v.extraPrice.toFixed(2)}
                                        </td>
                                        <td className="py-1.5 text-right font-bold text-slate-900">
                                          ${(prod.salesPrice + v.extraPrice).toFixed(2)}
                                        </td>
                                        {isAdmin && (
                                          <td className="py-1.5 text-center">
                                            <button
                                              onClick={() => handleDeleteVariant(v.id)}
                                              className="text-rose-500 hover:text-rose-700 p-1"
                                              title="Delete variant"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </td>
                                        )}
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <Pagination
          page={page}
          totalPages={totalPages}
          total={total}
          limit={10}
          onPageChange={(p) => setPage(p)}
        />
      </div>

      {/* Modal: Create Product */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title="Add New Software Product"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateProduct} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Product Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. BrightERP Finance Hub"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Type *</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="SOFTWARE">Software</option>
                <option value="SERVICE">Service</option>
                <option value="ADDON">Addon</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Sales Price ($) *</label>
              <input
                type="number"
                step="0.01"
                required
                value={salesPrice}
                onChange={(e) => setSalesPrice(e.target.value)}
                placeholder="450.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cost Price ($)</label>
              <input
                type="number"
                step="0.01"
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
                placeholder="100.00"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Internal Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Features, licensing details, deployment prerequisites..."
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="pt-3 border-t border-slate-200">
            <span className="font-semibold text-slate-800 block mb-2">Optional Initial Variant</span>
            <div className="grid grid-cols-3 gap-2">
              <input
                type="text"
                value={initialVariantName}
                onChange={(e) => setInitialVariantName(e.target.value)}
                placeholder="Attribute (e.g. Brand)"
                className="px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-[11px]"
              />
              <input
                type="text"
                value={initialVariantValue}
                onChange={(e) => setInitialVariantValue(e.target.value)}
                placeholder="Value (e.g. Odoo)"
                className="px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-[11px]"
              />
              <input
                type="number"
                step="0.01"
                value={initialVariantPrice}
                onChange={(e) => setInitialVariantPrice(e.target.value)}
                placeholder="Extra ($ e.g. 560)"
                className="px-2 py-1.5 border border-slate-300 rounded focus:ring-2 focus:ring-indigo-500 focus:outline-none text-[11px]"
              />
            </div>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsProductModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition"
            >
              Create Product
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Add Variant */}
      <Modal
        isOpen={isVariantModalOpen}
        onClose={() => setIsVariantModalOpen(false)}
        title="Add Attribute Variant"
        maxWidth="md"
      >
        <form onSubmit={handleAddVariant} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Attribute Name *</label>
            <input
              type="text"
              required
              value={variantAttr}
              onChange={(e) => setVariantAttr(e.target.value)}
              placeholder="e.g. Brand, Tier, Region"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Attribute Value *</label>
            <input
              type="text"
              required
              value={variantVal}
              onChange={(e) => setVariantVal(e.target.value)}
              placeholder="e.g. Odoo, Platinum, EU-Central"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Extra Price ($) *</label>
            <input
              type="number"
              step="0.01"
              required
              value={variantExtra}
              onChange={(e) => setVariantExtra(e.target.value)}
              placeholder="e.g. 560.00"
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              This amount is added to the base sales price when this variant is selected.
            </span>
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsVariantModalOpen(false)}
              className="px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-sm transition"
            >
              Save Variant
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

