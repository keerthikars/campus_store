import React, { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { Download, FileText, Calendar, TrendingUp, DollarSign, ShoppingCart } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import type { Sale } from '../lib/types';
import { format, startOfDay, endOfDay, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import toast from 'react-hot-toast';

type Period = 'daily' | 'weekly' | 'monthly';

interface ReportData {
  sales: Sale[];
  totalRevenue: number;
  totalTax: number;
  totalTransactions: number;
  avgOrderValue: number;
  chartData: { label: string; revenue: number; transactions: number }[];
}

export default function Reports() {
  const [period, setPeriod] = useState<Period>('weekly');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [useCustom, setUseCustom] = useState(false);
  const [data, setData] = useState<ReportData>({
    sales: [],
    totalRevenue: 0,
    totalTax: 0,
    totalTransactions: 0,
    avgOrderValue: 0,
    chartData: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!useCustom) loadReport();
  }, [period, useCustom]);

  function getDateRange() {
    const now = new Date();
    if (useCustom && customStart && customEnd) {
      return { start: new Date(customStart), end: endOfDay(new Date(customEnd)) };
    }
    switch (period) {
      case 'daily': return { start: startOfDay(now), end: endOfDay(now) };
      case 'weekly': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'monthly': return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }

  async function loadReport() {
    setLoading(true);
    try {
      const { start, end } = getDateRange();
      const { data: sales } = await supabase
        .from('sales')
        .select('*, sale_items(*)')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: false });

      const allSales = (sales || []) as Sale[];
      const totalRevenue = allSales.reduce((s, sale) => s + sale.total_amount, 0);
      const totalTax = allSales.reduce((s, sale) => s + sale.tax_amount, 0);

      // Build chart data
      let chartData: { label: string; revenue: number; transactions: number }[] = [];
      if (!useCustom && period === 'daily') {
        chartData = Array.from({ length: 24 }, (_, h) => ({
          label: `${h}:00`,
          revenue: allSales.filter(s => new Date(s.created_at).getHours() === h).reduce((sum, s) => sum + s.total_amount, 0),
          transactions: allSales.filter(s => new Date(s.created_at).getHours() === h).length,
        })).filter(d => d.transactions > 0 || d.revenue > 0);
      } else if (!useCustom && period === 'weekly') {
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        chartData = days.map((label, i) => ({
          label,
          revenue: allSales.filter(s => {
            const d = new Date(s.created_at).getDay();
            return (d === 0 ? 6 : d - 1) === i;
          }).reduce((sum, s) => sum + s.total_amount, 0),
          transactions: allSales.filter(s => {
            const d = new Date(s.created_at).getDay();
            return (d === 0 ? 6 : d - 1) === i;
          }).length,
        }));
      } else {
        // Group by day
        const dayMap: Record<string, { revenue: number; transactions: number }> = {};
        allSales.forEach(s => {
          const day = format(new Date(s.created_at), 'MMM d');
          if (!dayMap[day]) dayMap[day] = { revenue: 0, transactions: 0 };
          dayMap[day].revenue += s.total_amount;
          dayMap[day].transactions++;
        });
        chartData = Object.entries(dayMap).map(([label, v]) => ({ label, ...v }));
      }

      setData({
        sales: allSales,
        totalRevenue,
        totalTax,
        totalTransactions: allSales.length,
        avgOrderValue: allSales.length ? totalRevenue / allSales.length : 0,
        chartData,
      });
    } finally {
      setLoading(false);
    }
  }

  async function exportPDF() {
    try {
      const { jsPDF } = await import('jspdf');
      const autoTable = (await import('jspdf-autotable')).default;
      const doc = new jsPDF();
      doc.setFontSize(18);
      doc.text('Campus Store - Sales Report', 14, 20);
      doc.setFontSize(11);
      doc.text(`Period: ${getPeriodLabel()}`, 14, 30);
      doc.text(`Generated: ${format(new Date(), 'MMMM d, yyyy h:mm a')}`, 14, 37);

      // Summary
      doc.setFontSize(13);
      doc.text('Summary', 14, 50);
      autoTable(doc, {
        startY: 55,
        head: [['Metric', 'Value']],
        body: [
          ['Total Revenue', `₹${data.totalRevenue.toFixed(2)}`],
          ['Total Tax Collected', `₹${data.totalTax.toFixed(2)}`],
          ['Total Transactions', String(data.totalTransactions)],
          ['Avg. Order Value', `₹${data.avgOrderValue.toFixed(2)}`],
        ],
        theme: 'striped',
      });

      // Sales table
      const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10;
      doc.setFontSize(13);
      doc.text('Transaction Details', 14, finalY);
      autoTable(doc, {
        startY: finalY + 5,
        head: [['Date', 'Customer', 'Items', 'Subtotal', 'Tax', 'Total', 'Payment']],
        body: data.sales.map(s => [
          format(new Date(s.created_at), 'MMM d, yyyy h:mm a'),
          s.customer_name,
          String(s.sale_items?.length || 0),
          `₹${s.subtotal.toFixed(2)}`,
          `₹${s.tax_amount.toFixed(2)}`,
          `₹${s.total_amount.toFixed(2)}`,
          s.payment_method,
        ]),
        theme: 'striped',
        styles: { fontSize: 8 },
      });

      doc.save(`campus-store-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
      toast.success('PDF exported');
    } catch {
      toast.error('Failed to export PDF');
    }
  }

  async function exportExcel() {
    try {
      const XLSX = await import('xlsx');
      const wsData = [
        ['Campus Store - Sales Report'],
        [`Period: ${getPeriodLabel()}`],
        [],
        ['Summary'],
        ['Total Revenue', `₹${data.totalRevenue.toFixed(2)}`],
        ['Total Tax', `₹${data.totalTax.toFixed(2)}`],
        ['Total Transactions', data.totalTransactions],
        ['Avg. Order Value', `₹${data.avgOrderValue.toFixed(2)}`],
        [],
        ['Date', 'Customer', 'Email', 'Subtotal', 'Tax', 'Total', 'Payment', 'Status'],
        ...data.sales.map(s => [
          format(new Date(s.created_at), 'yyyy-MM-dd HH:mm'),
          s.customer_name,
          s.customer_email,
          s.subtotal,
          s.tax_amount,
          s.total_amount,
          s.payment_method,
          s.status,
        ]),
      ];
      const ws = XLSX.utils.aoa_to_sheet(wsData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sales Report');
      XLSX.writeFile(wb, `campus-store-report-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
      toast.success('Excel exported');
    } catch {
      toast.error('Failed to export Excel');
    }
  }

  function getPeriodLabel() {
    if (useCustom && customStart && customEnd) return `${customStart} to ${customEnd}`;
    if (period === 'daily') return `Today, ${format(new Date(), 'MMMM d, yyyy')}`;
    if (period === 'weekly') return `This Week`;
    return `${format(new Date(), 'MMMM yyyy')}`;
  }

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Period</label>
          <div className="flex rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700">
            {(['daily', 'weekly', 'monthly'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => { setPeriod(p); setUseCustom(false); }}
                className={`px-4 py-2 text-xs font-semibold capitalize transition-colors ${
                  !useCustom && period === p
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">Custom From</label>
            <input
              type="date"
              value={customStart}
              onChange={e => setCustomStart(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1.5">To</label>
            <input
              type="date"
              value={customEnd}
              onChange={e => setCustomEnd(e.target.value)}
              className="px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-600 rounded-xl text-sm text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={() => { setUseCustom(true); setTimeout(loadReport, 100); }}
            disabled={!customStart || !customEnd}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-300 dark:disabled:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Apply
          </button>
        </div>
        <div className="ml-auto flex items-end gap-2">
          <button
            onClick={exportPDF}
            className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium transition-colors"
          >
            <FileText className="w-4 h-4" />
            PDF
          </button>
          <button
            onClick={exportExcel}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Excel
          </button>
        </div>
      </div>

      {/* Period label */}
      <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
        <Calendar className="w-4 h-4" />
        <span>{getPeriodLabel()}</span>
        {loading && <span className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin ml-1" />}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
        {[
          { label: 'Total Revenue', value: `₹${data.totalRevenue.toFixed(2)}`, icon: DollarSign, color: 'bg-teal-500' },
          { label: 'Transactions', value: data.totalTransactions, icon: ShoppingCart, color: 'bg-teal-600' },
          { label: 'Tax Collected', value: `₹${data.totalTax.toFixed(2)}`, icon: TrendingUp, color: 'bg-cyan-500' },
          { label: 'Avg. Order Value', value: `₹${data.avgOrderValue.toFixed(2)}`, icon: DollarSign, color: 'bg-teal-700' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-slate-800 rounded-2xl p-4 border border-slate-200 dark:border-slate-700/50 shadow-sm flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color} shrink-0`}>
              <Icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs text-slate-400">{label}</p>
              <p className="font-bold text-slate-800 dark:text-white text-lg">{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Chart */}
      {data.chartData.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 p-6 shadow-sm">
          <h3 className="font-semibold text-slate-800 dark:text-white mb-4">Revenue Breakdown</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={data.chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="left" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `₹${v}`} />
              <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip
                contentStyle={{ background: '#1e293b', border: 'none', borderRadius: 8, color: '#f1f5f9', fontSize: 12 }}
                formatter={(v: number, name: string) => [name === 'revenue' ? `₹${v.toFixed(2)}` : v, name === 'revenue' ? 'Revenue' : 'Transactions']}
              />
              <Legend formatter={v => v === 'revenue' ? 'Revenue' : 'Transactions'} />
              <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              <Bar yAxisId="right" dataKey="transactions" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-700">
          <h3 className="font-semibold text-slate-800 dark:text-white">Transaction Details</h3>
          <p className="text-xs text-slate-400 mt-0.5">{data.totalTransactions} transactions</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date & Time</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden sm:table-cell">Payment</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Subtotal</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider hidden md:table-cell">Tax</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
              {loading ? (
                <tr><td colSpan={6} className="text-center py-10"><div className="w-6 h-6 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto" /></td></tr>
              ) : data.sales.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-10 text-slate-400 text-sm">No transactions in this period</td></tr>
              ) : data.sales.map(sale => (
                <tr key={sale.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300 text-xs">{format(new Date(sale.created_at), 'MMM d, yyyy h:mm a')}</td>
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-700 dark:text-slate-200">{sale.customer_name}</p>
                    {sale.customer_email && <p className="text-xs text-slate-400">{sale.customer_email}</p>}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <span className="px-2 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full text-xs capitalize">
                      {sale.payment_method}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600 dark:text-slate-300">₹{sale.subtotal.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-slate-400 hidden md:table-cell">₹{sale.tax_amount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-800 dark:text-white">₹{sale.total_amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            {data.sales.length > 0 && (
              <tfoot>
                <tr className="bg-slate-50 dark:bg-slate-900/50 border-t-2 border-slate-300 dark:border-slate-600">
                  <td colSpan={3} className="px-4 py-3 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Totals</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-700 dark:text-slate-200">₹{data.sales.reduce((s, x) => s + x.subtotal, 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-bold text-slate-500 hidden md:table-cell">₹{data.totalTax.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-bold text-teal-600 dark:text-teal-400 text-base">₹{data.totalRevenue.toFixed(2)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}
