'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  FileText, 
  ShoppingBag, 
  Users, 
  Settings,
  LogOut,
  X,
  Sparkles,
  ChevronDown,
  TrendingUp,
} from 'lucide-react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { ThemeToggle } from '@/components/ThemeToggle';
import { Toaster } from '@/components/Toast';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Posts', href: '/admin/posts', icon: FileText },
  { name: 'Products', href: '/admin/products', icon: ShoppingBag },
  { name: 'Subscribers', href: '/admin/subscribers', icon: Users },
  { name: 'Analytics', href: '/admin/analytics', icon: TrendingUp },
  { name: 'AI Assistant', href: '/admin/ai-assistant', icon: Sparkles },
  { name: 'Settings', href: '/admin/settings', icon: Settings },
];

const bottomNav = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Posts', href: '/admin/posts', icon: FileText },
  { name: 'Products', href: '/admin/products', icon: ShoppingBag },
  { name: 'Subscribers', href: '/admin/subscribers', icon: Users },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      if (typeof window === 'undefined') {
        setIsLoading(false);
        return;
      }

      const isLoginPage = pathname === '/admin/login' || pathname === '/admin/login/';
      if (isLoginPage) {
        setIsLoading(false);
        return;
      }

      // Check for admin_token cookie
      const token = document.cookie
        .split(';')
        .find(c => c.trim().startsWith('admin_token='))
        ?.split('=')[1];

      if (!token) {
        router.push('/admin/login');
      } else {
        setIsAuthenticated(true);
      }
      setIsLoading(false);
    };
    checkAuth();
  }, [router, pathname]);

  const handleLogout = async () => {
    // Clear cookie with Secure flag in production
    const isProduction = window.location.protocol === 'https:';
    const secureFlag = isProduction ? '; Secure' : '';
    document.cookie = `admin_token=; path=/; max-age=0; SameSite=Lax${secureFlag}`;
    // Sign out of Supabase
    await supabase.auth.signOut();
    setMenuOpen(false);
    router.push('/admin/login');
  };

  // Don't apply layout to login page
  if (pathname === '/admin/login' || pathname === '/admin/login/') {
    return <>{children}</>;
  }

  // Show loading while checking auth
  if (isLoading) {
    return (
      <div className="min-h-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Get current page title
  const currentPage = navigation.find(item => pathname === item.href || pathname.startsWith(item.href + '/'));
  const pageTitle = currentPage?.name || 'Admin';

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="min-h-full flex flex-col">
      {/* Menu Overlay */}
      {menuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40"
          onClick={() => setMenuOpen(false)}
        />
      )}

      {/* Popup Menu Modal */}
      {menuOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="glass-card rounded-2xl p-4 w-full max-w-xs animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
              <span className="font-bold gradient-text">Menu</span>
              <button 
                onClick={() => setMenuOpen(false)}
                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Navigation */}
            <nav className="space-y-1">
              {navigation.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                      isActive 
                        ? 'bg-white/10 font-medium' 
                        : 'text-gray-600 dark:text-gray-400 hover:bg-white/10'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : ''}`} />
                    <span className={isActive ? 'gradient-text' : ''}>{item.name}</span>
                  </Link>
                );
              })}
              
              {/* Logout */}
              <div className="pt-2 mt-2 border-t border-white/10">
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Logout
                </button>
              </div>
            </nav>
          </div>
        </div>
      )}

      {/* Welcome Header */}
      <div className="glass-card rounded-2xl px-4 py-3 flex items-center gap-3">
        {/* Menu trigger */}
        <button
          onClick={() => setMenuOpen(true)}
          className="flex items-center gap-3 flex-1 min-w-0 text-left hover:opacity-80 transition-opacity"
        >
          <img
            src="https://avatars.githubusercontent.com/u/192521042?v=4"
            alt="Will Napolini"
            className="w-11 h-11 rounded-full object-cover profile-img flex-shrink-0"
          />
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold gradient-text leading-tight">Will Napolini</h1>
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{today}</p>
          </div>
          <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
        </button>

        {/* Theme Toggle */}
        <ThemeToggle />
      </div>

      <Toaster />

      {/* Page content */}
      <main className="flex-1 mt-4">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="glass-card rounded-xl p-2 mt-4">
        <div className="flex justify-around">
          {bottomNav.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`flex flex-col items-center gap-1 px-3 py-2 rounded-lg transition-colors ${
                  isActive 
                    ? '' 
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-cyan-400' : ''}`} />
                <span className={`text-xs ${isActive ? 'gradient-text font-medium' : ''}`}>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
