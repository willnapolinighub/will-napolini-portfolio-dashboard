'use client';

import { useState, useEffect } from 'react';
import { Search, Download, Calendar, User, Trash2 } from 'lucide-react';
import { getAdminSubscribers, deleteSubscriber, AdminSubscriber } from '@/lib/admin-api';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { toast } from '@/components/Toast';

export default function AdminSubscribersPage() {
  const [subscribers, setSubscribers] = useState<AdminSubscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; email: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchSubscribers();
  }, []);

  async function fetchSubscribers() {
    setIsLoading(true);
    const data = await getAdminSubscribers();
    setSubscribers(data);
    setIsLoading(false);
  }

  const filteredSubscribers = subscribers.filter(sub =>
    sub.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deleteSubscriber(deleteTarget.id);
    if (result.success) {
      setSubscribers(subscribers.filter(s => s.id !== deleteTarget.id));
      toast('Subscriber removed', 'success');
    } else {
      toast('Failed to remove subscriber', 'error');
    }
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  const handleExport = () => {
    const csv = [
      'Email,Source,Subscribed At,Status',
      ...filteredSubscribers.map(s => 
        `${s.email},${s.source},${s.subscribed_at},${s.active ? 'active' : 'unsubscribed'}`
      )
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'subscribers.csv';
    a.click();
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">Subscribers</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {subscribers.filter(s => s.active).length} active subscribers
        </p>
        <button
          onClick={handleExport}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl glass-card text-sm font-medium hover:bg-white/10 transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search by email..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl glass-card border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
        />
      </div>

      {/* Subscribers List - Single Column Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredSubscribers.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No subscribers yet.</p>
            <p className="text-sm mt-1">They will appear here when someone subscribes.</p>
          </div>
        ) : (
          filteredSubscribers.map((subscriber) => (
            <div key={subscriber.id} className="glass-card rounded-xl p-3">
              {/* Email */}
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-cyan-400/20 flex items-center justify-center">
                  <User className="w-4 h-4 text-cyan-400" />
                </div>
                <span className="font-medium text-sm truncate flex-1">{subscriber.email}</span>
              </div>
              
              {/* Source & Status */}
              <div className="flex items-center justify-between mb-2">
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/10">
                  {subscriber.source}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  subscriber.active 
                    ? 'bg-green-500/20 text-green-400' 
                    : 'bg-gray-500/20 text-gray-400'
                }`}>
                  {subscriber.active ? 'Active' : 'Unsubscribed'}
                </span>
              </div>
              
              {/* Date + Remove */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <Calendar className="w-3 h-3" />
                  {new Date(subscriber.subscribed_at).toLocaleDateString()}
                </div>
                <button
                  onClick={() => setDeleteTarget({ id: subscriber.id, email: subscriber.email })}
                  className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                  aria-label="Remove subscriber"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={deleteTarget?.email || 'this subscriber'}
        isDeleting={isDeleting}
      />
    </div>
  );
}
