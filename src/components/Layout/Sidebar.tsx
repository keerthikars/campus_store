import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard, Package, Warehouse, ShoppingCart,
  BarChart3, Tag, Truck, X, ShoppingBag, ChevronLeft, ChevronRight
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/', icon: LayoutDashboard },
  { label: 'Products', path: '/products', icon: Package },
  { label: 'Inventory', path: '/inventory', icon: Warehouse },
  { label: 'Billing / POS', path: '/billing', icon: ShoppingCart },
  { label: 'Sales Reports', path: '/reports', icon: BarChart3 },
  { label: 'Categories', path: '/categories', icon: Tag },
  { label: 'Suppliers', path: '/suppliers', icon: Truck },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

  return (
    <>
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full z-30 flex flex-col
          bg-slate-900 dark:bg-slate-950 border-r border-slate-700/50
          transition-all duration-300 ease-in-out
          ${collapsed ? 'w-16' : 'w-64'}
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Logo */}
        <div className={`flex items-center gap-3 px-4 py-5 border-b border-slate-700/50 ${collapsed ? 'justify-center' : ''}`}>
          <div className="shrink-0 w-8 h-8 bg-teal-500 rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <span className="text-white font-semibold text-sm leading-none">Campus Store</span>
              <p className="text-slate-500 text-xs mt-0.5">IMS v1.0</p>
            </div>
          )}
          {/* Mobile close */}
          <button
            onClick={onClose}
            className="ml-auto text-slate-400 hover:text-white lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 overflow-y-auto">
          <ul className="space-y-1 px-2">
            {navItems.map(({ label, path, icon: Icon }) => {
              const isActive = path === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(path);
              return (
                <li key={path}>
                  <NavLink
                    to={path}
                    onClick={onClose}
                    title={collapsed ? label : undefined}
                    className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                      transition-all duration-150 group relative
                      ${isActive
                        ? 'bg-teal-600 text-white shadow-lg shadow-teal-500/20'
                        : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                      ${collapsed ? 'justify-center' : ''}
                    `}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {!collapsed && <span>{label}</span>}
                    {collapsed && (
                      <span className="
                        absolute left-full ml-2 px-2 py-1 bg-slate-700 text-white text-xs rounded
                        opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50
                        transition-opacity duration-150
                      ">
                        {label}
                      </span>
                    )}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Collapse toggle (desktop only) */}
        <div className="hidden lg:block p-3 border-t border-slate-700/50">
          <button
            onClick={() => setCollapsed(v => !v)}
            className={`
              w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg
              text-slate-400 hover:bg-slate-800 hover:text-white transition-all text-xs font-medium
            `}
          >
            {collapsed ? <ChevronRight className="w-4 h-4" /> : (
              <>
                <ChevronLeft className="w-4 h-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Spacer to push main content */}
      <div className={`hidden lg:block shrink-0 transition-all duration-300 ${collapsed ? 'w-16' : 'w-64'}`} />
    </>
  );
}
