import React, { useEffect, useState } from 'react';
import {
  Search, ShoppingCart, Plus, Minus, Trash2, X, Receipt, Check, Package
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';
import type { Product, CartItem } from '../lib/types';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

const TAX_RATE = 8; // 8%

interface Invoice {
  id: string;
  customer_name: string;
  customer_email: string;
  items: CartItem[];
  subtotal: number;
  tax_amount: number;
  total_amount: number;
  payment_method: string;
  created_at: string;
}

export default function Billing() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [customerName, setCustomerName] = useState('Walk-in Customer');
  const [customerEmail, setCustomerEmail] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [processing, setProcessing] = useState(false);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProducts();
  }, []);

  async function loadProducts() {
    setLoading(true);
    const { data } = await supabase
      .from('products')
      .select('*, categories(name)')
      .gt('quantity', 0)
      .order('name');
    setProducts((data || []) as Product[]);
    setLoading(false);
  }

  const filteredProducts = products.filter(p =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.categories as { name: string } | null)?.name?.toLowerCase().includes(search.toLowerCase())
  );

  function addToCart(product: Product) {
    setCart(prev => {
      const existing = prev.find(c => c.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          toast.error(`Only ${product.quantity} in stock`);
          return prev;
        }
        return prev.map(c => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c);
      }
      return [...prev, { product, quantity: 1 }];
    });
  }

  function removeFromCart(id: string) {
    setCart(prev => prev.filter(c => c.product.id !== id));
  }

  function updateCartQty(id: string, qty: number) {
    const item = cart.find(c => c.product.id === id);
    if (!item) return;
    if (qty <= 0) { removeFromCart(id); return; }
    if (qty > item.product.quantity) { toast.error(`Only ${item.product.quantity} in stock`); return; }
    setCart(prev => prev.map(c => c.product.id === id ? { ...c, quantity: qty } : c));
  }

  const subtotal = cart.reduce((sum, c) => sum + c.product.price * c.quantity, 0);
  const taxAmount = subtotal * TAX_RATE / 100;
  const totalAmount = subtotal + taxAmount;

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault();
    if (cart.length === 0) { toast.error('Cart is empty'); return; }
    setProcessing(true);
    try {
      const { data: sale, error: saleErr } = await supabase
        .from('sales')
        .insert({
          customer_name: customerName.trim() || 'Walk-in Customer',
          customer_email: customerEmail.trim(),
          subtotal,
          tax_rate: TAX_RATE,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          payment_method: paymentMethod,
          status: 'completed',
          created_by: user?.id || null,
        })
        .select()
        .single();
      if (saleErr) throw saleErr;

      const items = cart.map(c => ({
        sale_id: sale.id,
        product_id: c.product.id,
        product_name: c.product.name,
        quantity: c.quantity,
        unit_price: c.product.price,
        total_price: c.product.price * c.quantity,
      }));
      const { error: itemErr } = await supabase.from('sale_items').insert(items);
      if (itemErr) throw itemErr;

      // Deduct stock
      await Promise.all(cart.map(c =>
        supabase.from('products')
          .update({ quantity: c.product.quantity - c.quantity })
          .eq('id', c.product.id)
      ));

      setInvoice({
        id: sale.id,
        customer_name: customerName || 'Walk-in Customer',
        customer_email: customerEmail,
        items: [...cart],
        subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        payment_method: paymentMethod,
        created_at: sale.created_at,
      });
      setCart([]);
      setCustomerName('Walk-in Customer');
      setCustomerEmail('');
      loadProducts();
      toast.success('Sale completed!');
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Checkout failed');
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-5 gap-4 h-full">
      {/* Products Panel */}
      <div className="xl:col-span-3 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search products to add..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
          />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16"><div className="w-6 h-6 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin" /></div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map(p => {
              const inCart = cart.find(c => c.product.id === p.id);
              const isLow = p.quantity <= p.low_stock_threshold;
              return (
                <button
                  key={p.id}
                  onClick={() => addToCart(p)}
                  className={`
                    text-left bg-white dark:bg-slate-800 border rounded-xl p-3 transition-all hover:shadow-md
                    ${inCart ? 'border-teal-400 ring-2 ring-teal-400/30' : 'border-slate-200 dark:border-slate-700 hover:border-teal-300'}
                  `}
                >
                  {p.image_url ? (
                    <img src={p.image_url} alt={p.name} className="w-full h-24 object-cover rounded-lg mb-2" />
                  ) : (
                    <div className="w-full h-24 bg-slate-100 dark:bg-slate-700 rounded-lg mb-2 flex items-center justify-center">
                      <Package className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                    </div>
                  )}
                  <p className="font-medium text-slate-700 dark:text-slate-200 text-xs leading-tight truncate">{p.name}</p>
                  <div className="flex items-center justify-between mt-1">
                    <span className="font-bold text-teal-600 dark:text-teal-400 text-sm">₹{p.price.toFixed(2)}</span>
                    <span className={`text-xs ${isLow ? 'text-amber-500' : 'text-slate-400'}`}>
                      {p.quantity} left
                    </span>
                  </div>
                  {inCart && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <Check className="w-3 h-3 text-teal-500" />
                      <span className="text-xs text-teal-500">In cart ({inCart.quantity})</span>
                    </div>
                  )}
                </button>
              );
            })}
            {filteredProducts.length === 0 && (
              <div className="col-span-3 text-center py-12 text-slate-400">
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">No products available</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cart / Checkout Panel */}
      <div className="xl:col-span-2">
        <form onSubmit={handleCheckout} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700/50 shadow-sm overflow-hidden flex flex-col">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-blue-500" />
            <h2 className="font-semibold text-slate-800 dark:text-white">Cart</h2>
            {cart.length > 0 && (
              <span className="ml-auto text-xs bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full font-semibold">
                {cart.reduce((s, c) => s + c.quantity, 0)} items
              </span>
            )}
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto max-h-64 divide-y divide-slate-100 dark:divide-slate-700/50">
            {cart.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <ShoppingCart className="w-8 h-8 mb-2 opacity-30" />
                <p className="text-sm">Click products to add</p>
              </div>
            ) : cart.map(item => (
              <div key={item.product.id} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{item.product.name}</p>
                  <p className="text-xs text-slate-400">₹{item.product.price.toFixed(2)} ea.</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <button type="button" onClick={() => updateCartQty(item.product.id, item.quantity - 1)} className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors">
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-8 text-center text-sm font-semibold text-slate-700 dark:text-white">{item.quantity}</span>
                  <button type="button" onClick={() => updateCartQty(item.product.id, item.quantity + 1)} className="w-6 h-6 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-500 transition-colors">
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
                <div className="w-16 text-right">
                  <p className="text-sm font-semibold text-slate-700 dark:text-white">₹{(item.product.price * item.quantity).toFixed(2)}</p>
                </div>
                <button type="button" onClick={() => removeFromCart(item.product.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          {/* Customer Info */}
          <div className="px-5 py-4 space-y-3 border-t border-slate-100 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30">
            <input
              type="text"
              value={customerName}
              onChange={e => setCustomerName(e.target.value)}
              placeholder="Customer Name"
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
            />
            <input
              type="email"
              value={customerEmail}
              onChange={e => setCustomerEmail(e.target.value)}
              placeholder="Customer Email (optional)"
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
            />
            <select
              value={paymentMethod}
              onChange={e => setPaymentMethod(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 dark:text-slate-200"
            >
              <option value="cash">Cash</option>
              <option value="card">Card</option>
              <option value="upi">UPI / Digital</option>
              <option value="credit">Store Credit</option>
            </select>
          </div>

          {/* Totals */}
          <div className="px-5 py-4 space-y-2 border-t border-slate-100 dark:border-slate-700">
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>Subtotal</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
              <span>Tax ({TAX_RATE}%)</span>
              <span>₹{taxAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-bold text-slate-800 dark:text-white text-lg pt-2 border-t border-slate-200 dark:border-slate-700">
              <span>Total</span>
              <span>₹{totalAmount.toFixed(2)}</span>
            </div>
          </div>

          <div className="px-5 pb-5">
            <button
              type="submit"
              disabled={cart.length === 0 || processing}
              className="w-full bg-teal-600 hover:bg-teal-500 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {processing ? (
                <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />Processing...</>
              ) : (
                <><Receipt className="w-4 h-4" />Complete Sale</>
              )}
            </button>
            {cart.length > 0 && (
              <button type="button" onClick={() => setCart([])} className="w-full mt-2 text-sm text-slate-400 hover:text-red-500 transition-colors">
                Clear cart
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Invoice Modal */}
      {invoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="text-center border-b border-slate-200 dark:border-slate-700 pb-4 mb-4">
                <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-2">
                  <Check className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h2 className="text-xl font-bold text-slate-800 dark:text-white">Sale Complete!</h2>
                <p className="text-xs text-slate-400 mt-1">Invoice #{invoice.id.slice(-8).toUpperCase()}</p>
              </div>

              {/* Customer */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-4 mb-4">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{invoice.customer_name}</p>
                {invoice.customer_email && <p className="text-xs text-slate-400">{invoice.customer_email}</p>}
                <p className="text-xs text-slate-400 mt-1">{format(new Date(invoice.created_at), 'MMMM d, yyyy h:mm a')}</p>
                <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full mt-2 inline-block">
                  {invoice.payment_method}
                </span>
              </div>

              {/* Items */}
              <div className="space-y-2 mb-4">
                {invoice.items.map(item => (
                  <div key={item.product.id} className="flex justify-between text-sm">
                    <span className="text-slate-600 dark:text-slate-300">{item.product.name} × {item.quantity}</span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">₹{(item.product.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              {/* Totals */}
              <div className="border-t border-slate-200 dark:border-slate-700 pt-3 space-y-1.5">
                <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                  <span>Subtotal</span>
                  <span>₹{invoice.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-slate-500 dark:text-slate-400">
                  <span>Tax ({TAX_RATE}%)</span>
                  <span>₹{invoice.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold text-slate-800 dark:text-white text-lg pt-2 border-t border-slate-200 dark:border-slate-700">
                  <span>Total Paid</span>
                  <span>₹{invoice.total_amount.toFixed(2)}</span>
                </div>
              </div>

              <button
                onClick={() => setInvoice(null)}
                className="w-full mt-6 bg-teal-600 hover:bg-teal-500 text-white font-semibold py-3 rounded-xl transition-colors"
              >
                New Sale
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
