import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Package, ShoppingCart, AlertTriangle, TrendingUp, Users, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { format, subDays, startOfDay } from 'date-fns';
import { formatCurrency } from '../lib/utils';
import type { Sale, Product } from '../lib/types';

function RupeeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 3h12M6 8h12M6 3c2 3 4 6 4 10 0 4-2 6-4 8M14 8c0 4-1 7-5 10" />
    </svg>
  );
}

interface DashboardStats {
  totalProducts: number;
  totalSalesAmount: number;
  totalSalesCount: number;
  lowStockCount: number;
  recentSales: Sale[];
  lowStockProducts: Product[];
  dailySales: { date: string; amount: number; count: number }[];
  categoryBreakdown: { name: string; value: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

function StatCard({
  title, value, subtitle, icon: Icon, color, trend
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  trend?: { value: number; positive: boolean };
}) {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
          <p className="text-2xl font-bold text-slate-800 dark:text-white mt-1">{value}</p>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">{subtitle}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs font-medium ${trend.positive ? 'text-emerald-500' : 'text-red-500'}`}>
              {trend.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
              {trend.value}% vs last period
            </div>
          )}
        </div>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalProducts: 0,
    totalSalesAmount: 0,
    totalSalesCount: 0,
    lowStockCount: 0,
    recentSales: [],
    lowStockProducts: [],
    dailySales: [],
    categoryBreakdown: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    try {
      const [productsRes, salesRes, saleItemsRes] = await Promise.all([
        supabase.from('products').select('*, categories(name)'),
        supabase.from('sales').select('*').order('created_at', { ascending: false }).limit(100),
        supabase.from('sale_items').select('*, products(category_id, categories(name))'),
      ]);

      const products = productsRes.data || [];
      const sales = salesRes.data || [];
      const saleItems = saleItemsRes.data || [];

      const lowStock = products.filter((p: Product) => p.quantity <= p.low_stock_threshold);

      // Daily sales for last 7 days
      const dailySales = Array.from({ length: 7 }, (_, i) => {
        const date = subDays(new Date(), 6 - i);
        const dayStart = startOfDay(date).toISOString();
        const dayEnd = startOfDay(subDays(date, -1)).toISOString();
        const daySales = sales.filter(s => s.created_at >= dayStart && s.created_at < dayEnd);
        return {
          date: format(date, 'MMM d'),
          amount: daySales.reduce((sum, s) => sum + s.total_amount, 0),
          count: daySales.length,
        };
      });

      // Category breakdown from sale items
      const catMap: Record<string, number> = {};
      saleItems.forEach((item: Record<string, unknown>) => {
        const catName = (item.products as Record<string, unknown> | null)
          ? ((item.products as Record<string, unknown>).categories as Record<string, unknown> | null)?.name as string || 'Uncategorized'
          : 'Uncategorized';
        catMap[catName] = (catMap[catName] || 0) + Number(item.total_price);
      });
      const categoryBreakdown = Object.entries(catMap)
        .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6);

      setStats({
        totalProducts: products.length,
        totalSalesAmount: sales.reduce((sum, s) => sum + s.total_amount, 0),
        totalSalesCount: sales.length,
        lowStockCount: lowStock.length,
        recentSales: sales.slice(0, 8) as Sale[],
        lowStockProducts: lowStock.slice(0, 5) as Product[],
        dailySales,
        categoryBreakdown,
      });
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={stats.totalProducts}
          subtitle="In inventory"
          icon={Package}
          color="bg-teal-500"
        />
        <StatCard
          title="Total Revenue"
          value={formatCurrency(stats.totalSalesAmount)}
          subtitle="All time"
          icon={RupeeIcon}
          color="bg-teal-500"
        />
        <StatCard
          title="Total Sales"
          value={stats.totalSalesCount}
          subtitle="Transactions"
          icon={ShoppingCart}
          color="bg-cyan-500"
        />
        <StatCard
          title="Low Stock Items"
          value={stats.lowStockCount}
          subtitle="Need restocking"
          icon={AlertTriangle}
          color={stats.lowStockCount > 0 ? 'bg-red-500' : 'bg-slate-500'}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Sales Area Chart */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-slate-800 dark:text-white">Sales Overview</h3>
              <p className="text-xs text-slate-400 mt-0.5">Last 7 days revenue</p>
            </div>
            <div className="flex items-center gap-1 text-xs text-teal-500 bg-teal-50 dark:bg-teal-900/20 px-2 py-1 rounded-full">
              <TrendingUp className="w-3 h-3" />
              <span>7 days</span>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={stats.dailySales}>
              <defs>
                <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#14b8a6" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#14b8a6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
                formatter={(v: number) => [`₹${v.toFixed(2)}`, 'Revenue']}
              />
              <Area type="monotone" dataKey="amount" stroke="#14b8a6" strokeWidth={2} fill="url(#salesGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Category Pie */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-sm">
          <div className="mb-4">
            <h3 className="font-semibold text-slate-800 dark:text-white">Sales by Category</h3>
            <p className="text-xs text-slate-400 mt-0.5">Revenue breakdown</p>
          </div>
          {stats.categoryBreakdown.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={stats.categoryBreakdown} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" paddingAngle={3}>
                    {stats.categoryBreakdown.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
                    formatter={(v: number) => [`₹${v.toFixed(2)}`, 'Revenue']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {stats.categoryBreakdown.slice(0, 4).map((cat, i) => (
                  <div key={cat.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-slate-600 dark:text-slate-300 truncate max-w-[100px]">{cat.name}</span>
                    </div>
                    <span className="text-slate-500 dark:text-slate-400 font-medium">₹{cat.value.toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-slate-400 text-sm">No sales data yet</div>
          )}
        </div>
      </div>

      {/* Daily sales bar chart */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white">Daily Transaction Count</h3>
            <p className="text-xs text-slate-400 mt-0.5">Number of sales per day</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={stats.dailySales}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-700" />
            <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
              formatter={(v: number) => [v, 'Transactions']}
            />
            <Bar dataKey="count" fill="#06b6d4" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Bottom Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Recent Sales */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 dark:text-white">Recent Transactions</h3>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          {stats.recentSales.length === 0 ? (
            <p className="text-center text-slate-400 text-sm py-8">No transactions yet</p>
          ) : (
            <div className="space-y-3">
              {stats.recentSales.map(sale => (
                <div key={sale.id} className="flex items-center justify-between py-2 border-b border-slate-100 dark:border-slate-700/50 last:border-0">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{sale.customer_name}</p>
                    <p className="text-xs text-slate-400">{format(new Date(sale.created_at), 'MMM d, h:mm a')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-slate-800 dark:text-white">₹{sale.total_amount.toFixed(2)}</p>
                    <span className="text-xs bg-teal-50 dark:bg-teal-900/20 text-teal-600 dark:text-teal-400 px-2 py-0.5 rounded-full">
                      {sale.payment_method}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Low Stock Alert */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700/50 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-slate-800 dark:text-white">Low Stock Alerts</h3>
            <AlertTriangle className="w-4 h-4 text-amber-500" />
          </div>
          {stats.lowStockProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-slate-400">
              <Package className="w-8 h-8 mb-2 opacity-50" />
              <p className="text-sm">All products are well-stocked</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.lowStockProducts.map(product => {
                const pct = Math.round((product.quantity / product.low_stock_threshold) * 100);
                const isCritical = product.quantity === 0;
                return (
                  <div key={product.id} className={`p-3 rounded-xl border ${isCritical ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800/30' : 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800/30'}`}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{product.name}</span>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${isCritical ? 'bg-red-500 text-white' : 'bg-amber-500 text-white'}`}>
                        {isCritical ? 'OUT OF STOCK' : `${product.quantity} left`}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                      <div
                        className={`h-1.5 rounded-full ${isCritical ? 'bg-red-500' : 'bg-amber-500'}`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
