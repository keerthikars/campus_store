import React, { useState } from 'react';
import { Menu, Sun, Moon, Bell, LogOut, User, AlertTriangle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import toast from 'react-hot-toast';

interface HeaderProps {
  onMenuClick: () => void;
  title: string;
  lowStockCount?: number;
  lowStockProducts?: Array<{ name: string; quantity: number; low_stock_threshold: number }>;
}

export default function Header({ onMenuClick, title, lowStockCount = 0, lowStockProducts = [] }: HeaderProps) {
  const { user, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [showNotifications, setShowNotifications] = useState(false);

  async function handleSignOut() {
    try {
      await signOut();
      toast.success('Signed out successfully');
    } catch {
      toast.error('Failed to sign out');
    }
  }

  return (
    <header className="sticky top-0 z-10 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700/50 px-4 lg:px-6 py-3.5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>
          <h1 className="text-lg font-semibold text-slate-800 dark:text-white">{title}</h1>
        </div>

        <div className="flex items-center gap-2">
          {/* Low stock alert bell */}
          {lowStockCount > 0 && (
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-colors"
                title="Low stock alerts"
              >
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center leading-none font-bold">
                  {lowStockCount > 9 ? '9+' : lowStockCount}
                </span>
              </button>

              {/* Notification dropdown */}
              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-lg z-50">
                  <div className="p-4 border-b border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-5 h-5 text-amber-500" />
                      <h3 className="font-semibold text-slate-800 dark:text-white">Low Stock Alerts</h3>
                    </div>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    {lowStockProducts.length > 0 ? (
                      <div className="divide-y divide-slate-100 dark:divide-slate-700">
                        {lowStockProducts.map((product, idx) => (
                          <div key={idx} className="p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{product.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                  Stock: <span className="font-bold text-amber-600 dark:text-amber-400">{product.quantity}</span> / Min: {product.low_stock_threshold}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-6 text-center text-slate-400 text-sm">No alerts</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-teal-50 dark:hover:bg-teal-900/20 hover:text-teal-600 dark:hover:text-teal-400 transition-colors"
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>

          {/* User info */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-slate-700 ml-1">
            <div className="w-8 h-8 rounded-full bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center">
              <User className="w-4 h-4 text-teal-600 dark:text-teal-400" />
            </div>
            <span className="hidden sm:block text-sm text-slate-600 dark:text-slate-300 max-w-[140px] truncate">
              {user?.email}
            </span>
            <button
              onClick={handleSignOut}
              title="Sign out"
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
