'use client';

import { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { ShopProduct } from '@/lib/types';
import { getAdminProducts, deleteProduct } from '@/lib/admin-api';
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal';
import { toast } from '@/components/Toast';

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setIsLoading(true);
    const data = await getAdminProducts();
    setProducts(data);
    setIsLoading(false);
  }

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);

    // Step 1: Archive in Stripe (deactivates product + payment link)
    // Best-effort — if Stripe fails we still delete from DB
    try {
      await fetch('/api/stripe/archive/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId: deleteTarget.id }),
      });
    } catch {
      // Stripe archive failed — proceed with DB delete anyway
    }

    // Step 2: Delete from database
    const result = await deleteProduct(deleteTarget.id);
    if (result.success) {
      setProducts(products.filter(p => p.id !== deleteTarget.id));
      toast('Product deleted', 'success');
    } else {
      toast('Failed to delete product', 'error');
    }
    setIsDeleting(false);
    setDeleteTarget(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">Products</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Manage your digital products</p>
        <Link
          href="/admin/products/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl gradient-bg text-white text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          New Product
        </Link>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-10 pr-4 py-3 rounded-xl glass-card border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
        />
      </div>

      {/* Products List - Single Column */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="w-8 h-8 border-4 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mx-auto" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <p>No products found.</p>
            <p className="text-sm mt-1">Create your first product!</p>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div key={product.id} className="glass-card rounded-xl overflow-hidden">
              {/* Product Image */}
              <div className="w-full h-36 bg-gradient-to-br from-white/5 to-white/10 overflow-hidden flex items-center justify-center">
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <ShoppingBag className="w-8 h-8 text-white/20" />
                )}
              </div>
              
              {/* Product Info */}
              <div className="p-3">
                {/* Category & Price */}
                <div className="flex items-center justify-between mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    product.category === 'Mindset' ? 'bg-green-500/20 text-green-400' :
                    product.category === 'Skillset' ? 'bg-blue-500/20 text-blue-400' :
                    'bg-purple-500/20 text-purple-400'
                  }`}>
                    {product.category}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="font-bold text-cyan-400">{product.price}</span>
                  </div>
                </div>
                
                {/* Title */}
                <h3 className="font-semibold mb-1">{product.title}</h3>
                
                {/* Description */}
                <p className="text-xs text-gray-400 line-clamp-2 mb-3">{product.description}</p>
                
                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/admin/products/edit?id=${product.id}`}
                    className="flex-1 text-center py-2 rounded-lg gradient-bg text-white text-sm font-medium hover:opacity-90 transition-opacity"
                  >
                    <Edit className="w-4 h-4 inline mr-1" />
                    Edit
                  </Link>
                  <button
                    onClick={() => setDeleteTarget({ id: product.id, title: product.title })}
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
        title={deleteTarget?.title || 'this product'}
        isDeleting={isDeleting}
      />
    </div>
  );
}
