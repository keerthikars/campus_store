import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { supabase } from '../../lib/supabase';
import type { Product } from '../../lib/types';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/products': 'Products',
  '/inventory': 'Inventory',
  '/billing': 'Billing / POS',
  '/reports': 'Sales Reports',
  '/categories': 'Categories',
  '/suppliers': 'Suppliers',
};

export default function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [lowStockCount, setLowStockCount] = useState(0);
  const [lowStockProducts, setLowStockProducts] = useState<Array<{ name: string; quantity: number; low_stock_threshold: number }>>([]);
  const location = useLocation();

  const title = pageTitles[location.pathname] || 'Campus Store';

  useEffect(() => {
    supabase
      .from('products')
      .select('id, name, quantity, low_stock_threshold')
      .then(({ data }) => {
        if (data) {
          const lowStock = (data as Product[]).filter(p => p.quantity <= p.low_stock_threshold);
          setLowStockCount(lowStock.length);
          setLowStockProducts(lowStock.map(p => ({
            name: p.name,
            quantity: p.quantity,
            low_stock_threshold: p.low_stock_threshold
          })));
        }
      });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-cyan-50 via-teal-50 to-slate-50 dark:bg-gradient-to-br dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <Sidebar mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        <Header
          onMenuClick={() => setMobileOpen(true)}
          title={title}
          lowStockCount={lowStockCount}
          lowStockProducts={lowStockProducts}
        />
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
