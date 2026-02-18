'use client';

import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid } from 'recharts';
import { Eye, FileText, ShoppingBag, Users, TrendingUp } from 'lucide-react';
import { getDashboardStats, getPostsAnalytics, getSubscribersByMonth } from '@/lib/admin-api';
import type { PostAnalytics } from '@/lib/admin-api';

const CATEGORY_COLORS: Record<string, string> = {
  Mindset: '#00e5a0',
  Skillset: '#3b82f6',
  Toolset: '#a78bfa',
};

export default function AnalyticsPage() {
  const [stats, setStats] = useState({ postsCount: 0, productsCount: 0, subscribersCount: 0, viewsCount: 0 });
  const [posts, setPosts] = useState<PostAnalytics[]>([]);
  const [subsByMonth, setSubsByMonth] = useState<{ month: string; count: number }[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getDashboardStats(),
      getPostsAnalytics(),
      getSubscribersByMonth(),
    ]).then(([s, p, sm]) => {
      setStats(s);
      setPosts(p);
      setSubsByMonth(sm);
      setIsLoading(false);
    });
  }, []);

  // Category breakdown for donut
  const categoryData = Object.entries(
    posts.reduce<Record<string, number>>((acc, p) => {
      const cat = p.category || 'Other';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {})
  ).map(([name, value]) => ({ name, value }));

  // Top 5 posts for bar chart
  const topPosts = posts.slice(0, 5).map(p => ({
    name: p.title.length > 20 ? p.title.slice(0, 20) + '…' : p.title,
    views: p.views,
  }));

  const statCards = [
    { label: 'Total Views', value: stats.viewsCount, icon: Eye, color: 'text-cyan-400' },
    { label: 'Posts', value: stats.postsCount, icon: FileText, color: 'text-blue-400' },
    { label: 'Products', value: stats.productsCount, icon: ShoppingBag, color: 'text-purple-400' },
    { label: 'Subscribers', value: stats.subscribersCount, icon: Users, color: 'text-yellow-400' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-cyan-400" /> Analytics
        </h1>
        <p className="text-xs text-gray-500 mt-0.5">All-time stats from your own database</p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-3">
        {statCards.map((s) => (
          <div key={s.label} className="glass-card rounded-xl p-4">
            <s.icon className={`w-4 h-4 ${s.color} mb-2`} />
            <p className="text-2xl font-bold gradient-text">{s.value.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Top posts bar chart */}
      {topPosts.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Top Posts by Views</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={topPosts} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: '#e5e7eb' }}
              />
              <Bar dataKey="views" fill="#00e5a0" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Category breakdown donut */}
      {categoryData.length > 0 && (
        <div className="glass-card rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Posts by Category</h2>
          <div className="flex items-center gap-4">
            <PieChart width={120} height={120}>
              <Pie data={categoryData} cx={55} cy={55} innerRadius={30} outerRadius={55} dataKey="value" paddingAngle={3}>
                {categoryData.map((entry) => (
                  <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name] || '#6b7280'} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
              />
            </PieChart>
            <div className="space-y-2">
              {categoryData.map((d) => (
                <div key={d.name} className="flex items-center gap-2 text-sm">
                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: CATEGORY_COLORS[d.name] || '#6b7280' }} />
                  <span className="text-gray-400">{d.name}</span>
                  <span className="font-semibold ml-auto">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subscriber growth line chart */}
      {subsByMonth.length > 1 && (
        <div className="glass-card rounded-xl p-4">
          <h2 className="text-sm font-semibold mb-3">Subscriber Growth</h2>
          <ResponsiveContainer width="100%" height={140}>
            <LineChart data={subsByMonth} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <YAxis tick={{ fontSize: 10, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="count" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* No data state */}
      {posts.length === 0 && (
        <div className="glass-card rounded-xl p-6 text-center border border-cyan-400/20">
          <TrendingUp className="w-8 h-8 text-cyan-400/40 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No data yet. Views will appear here once visitors read your posts.</p>
        </div>
      )}
    </div>
  );
}
