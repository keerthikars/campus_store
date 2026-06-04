import React, { useEffect, useState } from 'react';
import {
  Search, ArrowUpDown, AlertTriangle, Package, RefreshCw, Edit2, X
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import type { Product, Category } from '../lib/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

type SortField = 'name' | 'quantity' | 'price' | 'updated_at';
type SortDir = 'asc' | 'desc';

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterStock, setFilterStock] = useState<'all' | 'low' | 'out'>('all');
  const [sortField, setSortField] = useState<SortField>('quantity');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [adjustModal, setAdjustModal] = useState<Product | null>(null);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('restock');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    setLoading(true);
    const [prodRes, catRes] = await Promise.all([
      supabase.from('products').select('*, categories(name), suppliers(name)'),
      supabase.from('categories').select('*').order('name'),
    ]);
    setProducts((prodRes.data || []) as Product[]);
    setCategories(catRes.data || []);
    setLoading(false);
  }

  function handleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  const filtered = products
    .filter(p => {
      const matchSearch = !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = !filterCategory || p.category_id === filterCategory;
      const matchStock = filterStock === 'all' ? true : filterStock === 'out' ? p.quantity === 0 : p.quantity <= p.low_stock_threshold && p.quantity > 0;
      return matchSearch && matchCat && matchStock;
    })
    .sort((a, b) => {
      let av: string | number = a[sortField] as string | number;
      let bv: string | number = b[sortField] as string | number;
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (!adjustModal) return;
    setSaving(true);
    try {
      const delta = parseInt(adjustQty);
      if (isNaN(delta)) throw new Error('Invalid quantity');
      const newQty = adjustReason === 'set'
        ? delta
        : adjustModal.quantity + delta;
      if (newQty < 0) throw new Error('Quantity cannot be negative');
      const { error } = await supabase.from('products').update({ quantity: newQty }).eq('id', adjustModal.id);
      if (error) throw error;
      toast.success('Stock updated');
      setAdjustModal(null);
      loadAll();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setSaving(false);
    }
  }

  const lowStockCount = products.filter(p => p.quantity <= p.low_stock_threshold && p.quantity > 0).length;
  const outOfStockCount = products.filter(p => p.quantity === 0).length;

  return (
    <div className="space-y-4">
      {/* Alert banners */}
      {(lowStockCount > 0 || outOfStockCount > 0) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {outOfStockCount > 0 && (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 rounded-xl px-4 py-3">
              <div className="w-8 h-8 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center shrink-0">
                <Package className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">{outOfStockCount} item{outOfStockCount > 1 ? 's' : ''} out of stock</p>
                <p className="text-xs text-red-500">Immediate restocking required</p>
              </div>
            </div>
          )}
          {lowStockCount > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800/30 rounded-xl px-4 py-3">
              <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">{lowStockCount} item{lowStockCount > 1 ? 's' : ''} low on stock</p>
                <p className="text-xs text-amber-500">Consider restocking soon</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search inventory..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 w-56"
            />
          </div>
          <select
            value={filterCategory}
            onChange={e => setFilterCategory(e.target.value)}
            className="px-3 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            {(['all', 'low', 'out'] as const).map(v => (
              <button
                key={v}
                onClick={() => setFilterStock(v)}
                className={`px-3 py-2 text-xs font-medium transition-colors ${
                  filterStock === v
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {v === 'all' ? 'All' : v === 'low' ? 'Low Stock' : 'Out of Stock'}
              </button>
            ))}
          </div>
        </div>
        <button onClick={loadAll} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-teal-400">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700/50">
                {([
                  { label: 'Product', field: 'name' as SortField },
                  { label: 'Category', field: null },
                  { label: 'Price', field: 'price' as SortField },
                  { label: 'In Stock', field: 'quantity' as SortField },
                  { label: 'Status', field: null },
                  { label: 'Stock Bar', field: null },
                  { label: 'Last Updated', field: 'updated_at' as SortField },
                  { label: 'Actions', field: null },
                ]).map(({ label, field }) => (
                  <th
                    key={label}
                    className={`text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider ${
                      label === 'Category' ? 'hidden sm:table-cell' : ''
                    } ${label === 'Last Updated' ? 'hidden lg:table-cell' : ''} ${label === 'Stock Bar' ? 'hidden md:table-cell' : ''} ${label === 'Actions' ? 'text-right' : ''}`}
                  >
                    {field ? (
                      <button onClick={() => handleSort(field)} className="flex items-center gap-1 hover:text-slate-700 dark:hover:text-white">
                        {label}
                        <ArrowUpDown className={`w-3 h-3 ${sortField === field ? 'text-blue-500' : ''}`} />
                      </button>
                    ) : label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={8} className="text-center py-16"><div className="w-6 h-6 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" /></td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-16 text-slate-400"><Package className="w-10 h-10 mx-auto mb-2 opacity-30" /><p>No items found</p></td></tr>
              ) : filtered.map(p => {
                const isOut = p.quantity === 0;
                const isLow = !isOut && p.quantity <= p.low_stock_threshold;
                const stockPct = Math.min(Math.round((p.quantity / Math.max(p.low_stock_threshold * 2, 1)) * 100), 100);
                return (
                  <tr key={p.id} className={`transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/30 ${isOut ? 'bg-red-50/30 dark:bg-red-900/5' : isLow ? 'bg-amber-50/30 dark:bg-amber-900/5' : ''}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {p.image_url ? (
                          <img src={p.image_url} alt={p.name} className="w-8 h-8 rounded-lg object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center shrink-0">
                            <Package className="w-3.5 h-3.5 text-slate-400" />
                          </div>
                        )}
                        <div>
                          <p className="font-medium text-slate-700 dark:text-slate-200 leading-tight">{p.name}</p>
                          {p.sku && <p className="text-xs text-slate-400">{p.sku}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs">
                        {(p.categories as { name: string } | null)?.name || '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700 dark:text-slate-200">{formatCurrency(p.price)}</td>
                    <td className="px-4 py-3 font-bold text-slate-800 dark:text-white">{p.quantity}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        isOut ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                        : isLow ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400'
                        : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400'
                      }`}>
                        {isOut ? 'Out of Stock' : isLow ? 'Low Stock' : 'In Stock'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell">
                      <div className="w-24">
                        <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${isOut ? 'bg-red-500' : isLow ? 'bg-amber-500' : 'bg-emerald-500'}`}
                            style={{ width: `${stockPct}%` }}
                          />
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">min: {p.low_stock_threshold}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-400 hidden lg:table-cell text-xs">
                      {format(new Date(p.updated_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => { setAdjustModal(p); setAdjustQty(''); setAdjustReason('restock'); }}
                        className="flex items-center gap-1 ml-auto px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-lg text-xs font-medium transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        Adjust
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Adjust Modal */}
      {adjustModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-semibold text-slate-800 dark:text-white">Adjust Stock</h2>
              <button onClick={() => setAdjustModal(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleAdjust} className="p-6 space-y-4">
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4">
                <p className="font-semibold text-slate-700 dark:text-slate-200">{adjustModal.name}</p>
                <p className="text-sm text-slate-400 mt-0.5">Current stock: <span className="font-bold text-slate-700 dark:text-white">{adjustModal.quantity}</span></p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Adjustment Type</label>
                <select
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="restock">Add to Stock (+)</option>
                  <option value="remove">Remove from Stock (-)</option>
                  <option value="set">Set Exact Quantity</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  {adjustReason === 'set' ? 'New Quantity' : 'Quantity'}
                </label>
                <input
                  type="number"
                  min={adjustReason === 'remove' ? undefined : '0'}
                  required
                  value={adjustQty}
                  onChange={e => setAdjustQty(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Enter quantity..."
                />
              </div>
              {adjustQty && !isNaN(parseInt(adjustQty)) && (
                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-3 text-sm text-blue-700 dark:text-blue-300">
                  New quantity will be:{' '}
                  <strong>
                    {adjustReason === 'set'
                      ? parseInt(adjustQty)
                      : adjustReason === 'restock'
                      ? adjustModal.quantity + parseInt(adjustQty)
                      : adjustModal.quantity - parseInt(adjustQty)}
                  </strong>
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setAdjustModal(null)} className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700 rounded-xl">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2.5 text-sm font-medium bg-blue-600 hover:bg-blue-500 text-white rounded-xl">
                  {saving ? 'Saving...' : 'Update Stock'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
