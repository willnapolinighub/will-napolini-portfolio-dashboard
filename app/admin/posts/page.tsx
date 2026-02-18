'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Calendar, AlertCircle, FileText } from 'lucide-react';
import Link from 'next/link';
import { BlogPost } from '@/lib/types';
import { getAdminPosts, deletePost } from '@/lib/admin-api';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { toast } from '@/components/Toast';

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchPosts();
  }, []);

  async function fetchPosts() {
    setIsLoading(true);
    setError(null);
    const data = await getAdminPosts();
    setPosts(data);
    setIsLoading(false);
    
    if (data.length === 0 && !error) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      if (!supabaseUrl) {
        setError('Supabase is not configured. Please add your credentials to .env.local');
      }
    }
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filterCategory === 'all' || post.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    const result = await deletePost(deleteTarget.id);
    if (result.success) {
      setPosts(posts.filter(p => p.id !== deleteTarget.id));
      toast('Post deleted', 'success');
    } else {
      toast('Failed to delete post', 'error');
    }
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">Blog Posts</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your blog content</p>
        <Link
          href="/admin/posts/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-bg text-white text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Post
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search posts..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl glass-card border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="w-full px-4 py-3 rounded-xl glass-card border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
        >
          <option value="all">All Categories</option>
          <option value="Mindset">Mindset</option>
          <option value="Skillset">Skillset</option>
          <option value="Toolset">Toolset</option>
        </select>
      </div>

      {/* Error banner */}
      {error && (
        <div className="flex items-start gap-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
          {error}
        </div>
      )}

      {/* Posts List - Single Column Cards */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No posts found.</p>
            <p className="text-sm mt-1">Create your first post!</p>
          </div>
        ) : (
          filteredPosts.map((post) => (
            <div key={post.id} className="glass-card rounded-xl overflow-hidden">
              {/* Post Image */}
              <div className="w-full h-36 bg-gradient-to-br from-white/5 to-white/10 overflow-hidden flex items-center justify-center">
                {post.image ? (
                  <img
                    src={post.image}
                    alt={post.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <FileText className="w-8 h-8 text-white/20" />
                )}
              </div>
              
              {/* Post Info */}
              <div className="p-3">
                {/* Category & Date */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    post.category === 'Mindset' ? 'bg-green-500/20 text-green-400' :
                    post.category === 'Skillset' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {post.category}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Calendar className="w-3 h-3" />
                    {post.date}
                  </div>
                </div>
                
                {/* Title */}
                <h3 className="font-semibold mb-1">{post.title}</h3>
                
                {/* Description */}
                <p className="text-xs text-gray-400 line-clamp-2 mb-3">{post.description}</p>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/posts/edit?id=${post.id}`}
                    className="flex-1 text-center py-2 rounded-lg gradient-bg text-white text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <Edit className="w-4 h-4 inline mr-1" />
                    Edit
                  </Link>
                  <button
                    onClick={() => setDeleteTarget({ id: post.id, title: post.title })}
                    className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      <DeleteConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => !isDeleting && setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        title={deleteTarget?.title || 'this post'}
        isDeleting={isDeleting}
      />
    </div>
  );
}
