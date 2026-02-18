'use client';

import { useEffect, useState } from 'react';
import { FileText, ShoppingBag, Users, Eye, Plus, Settings, ArrowRight, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { getDashboardStats } from '@/lib/admin-api';

interface DashboardStats {
  postsCount: number;
  productsCount: number;
  subscribersCount: number;
  viewsCount: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    postsCount: 0, productsCount: 0, subscribersCount: 0, viewsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getDashboardStats().then((data) => {
      setStats(data);
      setIsLoading(false);
    });
  }, []);

  const statCards = [
    { name: 'Posts', value: stats.postsCount, icon: FileText, href: '/admin/posts' },
    { name: 'Products', value: stats.productsCount, icon: ShoppingBag, href: '/admin/products' },
    { name: 'Subscribers', value: stats.subscribersCount, icon: Users, href: '/admin/subscribers' },
    { name: 'Views', value: stats.viewsCount, icon: Eye, href: '/admin/analytics' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((stat) => (
          <Link key={stat.name} href={stat.href} className="glass-card rounded-xl p-4 hover:scale-[1.02] transition-transform">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="w-4 h-4 text-cyan-400" />
              <ArrowRight className="w-3 h-3 text-gray-400" />
            </div>
            <p className="text-2xl font-bold gradient-text">{isLoading ? '...' : stat.value}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{stat.name}</p>
          </Link>
        ))}
      </div>

      <div className="glass-card rounded-xl p-4">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-cyan-400" /> Quick Actions
        </h2>
        <div className="flex gap-2">
          <Link href="/admin/posts/new" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl gradient-bg text-white text-sm font-medium hover:opacity-90 transition-opacity">
            <Plus className="w-4 h-4" /> Post
          </Link>
          <Link href="/admin/products/new" className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-white/20 bg-white/10 text-sm font-medium hover:bg-white/15 transition-colors">
            <Plus className="w-4 h-4" /> Product
          </Link>
          <Link href="/admin/settings" className="flex items-center justify-center w-10 h-10 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 transition-colors">
            <Settings className="w-4 h-4" />
          </Link>
        </div>
      </div>

      {stats.postsCount === 0 && stats.productsCount === 0 && !isLoading && (
        <div className="glass-card rounded-xl p-4 border border-cyan-400/30">
          <h2 className="text-sm font-semibold mb-2 gradient-text">Getting Started</h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Your dashboard is ready! Create your first content.</p>
          <Link href="/admin/posts/new" className="inline-flex items-center gap-1 text-xs font-medium text-cyan-400 hover:underline">
            Create your first post <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}
