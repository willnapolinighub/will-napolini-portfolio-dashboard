'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertCircle, Sparkles, Loader2, ChevronDown, CreditCard, CheckCircle, XCircle } from 'lucide-react';
import Link from 'next/link';
import { createProduct, updateProduct } from '@/lib/admin-api';
import { ImagePicker } from '@/components/ImagePicker';
import { SUPPORTED_CURRENCIES, centsToPrice } from '@/lib/stripe';

interface TopicItem {
  id: string;
  text: string;
  category: 'Mindset' | 'Skillset' | 'Toolset';
  tag: '🔥' | '♾️';
  enabled: boolean;
}

const DEFAULT_PRODUCT_TOPICS: Omit<TopicItem, 'id' | 'enabled'>[] = [
  // Toolset — AI / automation (hot first)
  { text: 'AI Productivity Prompt Pack',           category: 'Toolset',  tag: '🔥' },
  { text: 'Notion Life OS Template',               category: 'Toolset',  tag: '🔥' },
  { text: 'Solopreneur Automation Toolkit',        category: 'Toolset',  tag: '🔥' },
  { text: 'Content Creation Template Bundle',      category: 'Toolset',  tag: '🔥' },
  { text: 'Second Brain Setup System',             category: 'Toolset',  tag: '♾️' },
  { text: 'Digital Planner Bundle',                category: 'Toolset',  tag: '♾️' },
  { text: 'Goal Setting Printable Workbook',       category: 'Toolset',  tag: '♾️' },
  // Mindset
  { text: 'Growth Mindset Masterclass',            category: 'Mindset',  tag: '♾️' },
  { text: '30-Day Confidence Challenge',           category: 'Mindset',  tag: '♾️' },
  { text: 'Morning Routine Blueprint',             category: 'Mindset',  tag: '♾️' },
  { text: 'Mindset Reset Audio Program',           category: 'Mindset',  tag: '♾️' },
  { text: 'Fear-Breaking Workbook',                category: 'Mindset',  tag: '♾️' },
  { text: 'Mental Resilience Guide',               category: 'Mindset',  tag: '♾️' },
  // Skillset
  { text: 'Public Speaking Video Workshop',        category: 'Skillset', tag: '🔥' },
  { text: 'Leadership Coaching Program',           category: 'Skillset', tag: '🔥' },
  { text: 'Communication Skills Masterclass',      category: 'Skillset', tag: '♾️' },
  { text: 'Time Management System Template',       category: 'Skillset', tag: '♾️' },
  { text: 'Negotiation Skills Guide',              category: 'Skillset', tag: '♾️' },
  { text: 'Critical Thinking Workbook',            category: 'Skillset', tag: '♾️' },
];

export default function NewProductPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    image: '',
    category: 'Mindset' as 'Mindset' | 'Skillset' | 'Toolset',
    price: '',
    originalPrice: '',
    priceCents: 0,
    originalPriceCents: 0,
    currency: 'usd',
    syncToStripe: true,
    stripeLink: '',
    aiPrompt: '',
  });
  
  const [stripeAvailable, setStripeAvailable] = useState(false);
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [isSyncingStripe, setIsSyncingStripe] = useState(false);
  
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [productTopics, setProductTopics] = useState<TopicItem[]>([]);

  const categories = ['Mindset', 'Skillset', 'Toolset'] as const;

  useEffect(() => {
    // Load topics from localStorage or use defaults
    const savedTopics = localStorage.getItem('ai_product_topics');
    if (savedTopics) {
      setProductTopics(JSON.parse(savedTopics));
    } else {
      const defaults = DEFAULT_PRODUCT_TOPICS.map((t, i) => ({ id: `prod-${i}`, ...t, enabled: true }));
      setProductTopics(defaults);
    }
    // Check Stripe availability via API (server-side env check)
    fetch('/api/stripe/status')
      .then(res => res.json())
      .then(data => {
        setStripeAvailable(data.configured);
      })
      .catch(() => {
        setStripeAvailable(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // AI Generation Functions
  const callAI = async (prompt: string): Promise<string> => {
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    if (!response.ok) throw new Error('AI request failed');
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'AI request failed');
    return (data.response || '').replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
  };

  const generateTitle = async () => {
    if (!formData.title && !formData.description) {
      setError('Please enter a topic or description first');
      return;
    }
    setGeneratingField('title');
    try {
      const context = formData.title || formData.description;
      const prompt = `Generate a catchy product title for: "${context}". 
Category: ${formData.category}
Return ONLY the title, nothing else. Keep it under 50 characters.`;
      const result = await callAI(prompt);
      setFormData(prev => ({ ...prev, title: result.trim().replace(/^["']|["']$/g, '') }));
    } catch (err) {
      setError('Failed to generate title');
    } finally {
      setGeneratingField(null);
    }
  };

  const generateDescription = async () => {
    if (!formData.title) {
      alert('Please enter a title first');
      return;
    }
    setGeneratingField('description');
    try {
      const prompt = `Write a compelling product description for: "${formData.title}"
Category: ${formData.category}
Price: ${formData.price || 'TBD'}

Make it persuasive and highlight benefits. Return ONLY the description, nothing else. Keep it under 200 characters.`;
      const result = await callAI(prompt);
      setFormData(prev => ({ ...prev, description: result.trim() }));
    } catch (err) {
      setError('Failed to generate description');
    } finally {
      setGeneratingField(null);
    }
  };

  const generateAIPrompt = async () => {
    if (!formData.title) {
      alert('Please enter a title first');
      return;
    }
    setGeneratingField('aiPrompt');
    try {
      const prompt = `Create a useful AI prompt that customers can use to learn more about: "${formData.title}"
Category: ${formData.category}

The prompt should help customers understand how this product can help them.
Return ONLY the prompt text, nothing else.`;
      const result = await callAI(prompt);
      setFormData(prev => ({ ...prev, aiPrompt: result.trim() }));
    } catch (err) {
      setError('Failed to generate AI prompt');
    } finally {
      setGeneratingField(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title) {
      setError('Title is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    // Step 1: Create product in Supabase
    const result = await createProduct({
      title: formData.title,
      description: formData.description,
      image: formData.image,
      category: formData.category,
      price: formData.price,
      original_price: formData.originalPrice,
      stripe_link: formData.stripeLink,
      ai_prompt: formData.aiPrompt,
      active: true,
    });

    if (!result.success || !result.data) {
      setIsSaving(false);
      setError(result.error || 'Failed to create product');
      return;
    }

    const newProductId = result.data.id;

    // Step 2: Sync to Stripe if enabled and price is set
    if (formData.syncToStripe && stripeAvailable && formData.priceCents > 0) {
      setIsSyncingStripe(true);
      try {
        const syncRes = await fetch('/api/stripe/sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: newProductId,
            title: formData.title,
            description: formData.description,
            image: formData.image,
            priceCents: formData.priceCents,
            originalPriceCents: formData.originalPriceCents || undefined,
            currency: formData.currency,
            category: formData.category,
          }),
        });
        const syncData = await syncRes.json();
        if (syncData.success && syncData.stripeLink) {
          // Update the product with the Stripe payment link
          await updateProduct(newProductId, { stripe_link: syncData.stripeLink });
        } else {
          console.warn('Stripe sync failed:', syncData.error);
        }
      } catch (err) {
        console.warn('Stripe sync error:', err);
      } finally {
        setIsSyncingStripe(false);
      }
    }

    setIsSaving(false);
    router.push('/admin/products');
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/products"
            className="p-2 rounded-lg glass-card hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">New Product</h1>
            <p className="text-sm text-gray-500">Create a digital product</p>
          </div>
        </div>
        <button
          type="submit"
          form="product-form"
          disabled={isSaving}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl gradient-bg text-white text-sm font-medium disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Creating...' : 'Create Product'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Form */}
      <form id="product-form" onSubmit={handleSubmit} className="space-y-4">

        {/* Product Type Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTopicPicker(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3 glass-card rounded-xl text-sm hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-gray-300">Product Type</span>
            </div>
            <span className="text-xs text-gray-500">{showTopicPicker ? '▲ close' : '▼ choose product type'}</span>
          </button>
          {showTopicPicker && (
            <div className="absolute top-full left-0 right-0 mt-1 glass-card rounded-xl overflow-hidden shadow-xl z-30 max-h-72 overflow-y-auto">
              {(['Toolset', 'Mindset', 'Skillset'] as const).map(cat => (
                <div key={cat}>
                  <p className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-white/5 sticky top-0">{cat}</p>
                  {productTopics.filter((t: TopicItem) => t.category === cat && t.enabled).map((topic: TopicItem) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({ ...prev, title: topic.text, category: topic.category }));
                        setShowTopicPicker(false);
                        setTimeout(generateTitle, 100);
                      }}
                      className="flex items-center justify-between w-full px-4 py-2.5 hover:bg-white/10 text-left text-sm"
                    >
                      <span>{topic.text}</span>
                      <span className="ml-2 flex-shrink-0 text-base">{topic.tag}</span>
                    </button>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Title */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400">Title *</label>
            <button
              type="button"
              onClick={generateTitle}
              disabled={generatingField !== null}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-400/10 text-cyan-400 text-xs hover:bg-cyan-400/20 transition-colors disabled:opacity-50"
            >
              {generatingField === 'title' ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-3 h-3" /> Generate</>
              )}
            </button>
          </div>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleChange}
            required
            placeholder="Enter product title..."
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
          />
        </div>

        {/* Description */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400">Description</label>
            <button
              type="button"
              onClick={generateDescription}
              disabled={generatingField !== null}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-400/10 text-cyan-400 text-xs hover:bg-cyan-400/20 transition-colors disabled:opacity-50"
            >
              {generatingField === 'description' ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-3 h-3" /> Generate</>
              )}
            </button>
          </div>
          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            rows={3}
            placeholder="Product description..."
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all resize-none"
          />
        </div>

        {/* Image */}
        <div className="glass-card rounded-xl p-4">
          <ImagePicker
            value={formData.image}
            onChange={(url: string) => setFormData(prev => ({ ...prev, image: url }))}
            label="Image"
            folder="will-napolini/products"
          />
        </div>

        {/* Pricing */}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">Pricing</h3>
            {stripeAvailable && (
              <div className="flex items-center gap-2">
                <label className="text-xs text-gray-400">Sync to Stripe</label>
                <button
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, syncToStripe: !prev.syncToStripe }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${formData.syncToStripe ? 'bg-cyan-400' : 'bg-gray-600'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${formData.syncToStripe ? 'translate-x-5' : ''}`} />
                </button>
              </div>
            )}
          </div>
          
          {/* Currency Selector */}
          <div className="relative">
            <label className="text-xs text-gray-400 mb-1 block">Currency</label>
            <button
              type="button"
              onClick={() => setShowCurrencyPicker(p => !p)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span className="text-sm">
                {SUPPORTED_CURRENCIES.find(c => c.code === formData.currency)?.symbol} {formData.currency.toUpperCase()} ({SUPPORTED_CURRENCIES.find(c => c.code === formData.currency)?.name})
              </span>
              <ChevronDown className={'w-4 h-4 text-gray-400 transition-transform ' + (showCurrencyPicker ? 'rotate-180' : '')} />
            </button>
            {showCurrencyPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 glass-card rounded-xl overflow-hidden shadow-xl z-30">
                {SUPPORTED_CURRENCIES.map(currency => (
                  <button
                    key={currency.code}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, currency: currency.code }));
                      setShowCurrencyPicker(false);
                    }}
                    className={'flex items-center justify-between w-full px-4 py-2.5 hover:bg-white/10 text-left text-sm ' + (formData.currency === currency.code ? 'bg-cyan-400/10 text-cyan-400' : '')}
                  >
                    <span>{currency.symbol} {currency.code.toUpperCase()} - {currency.name}</span>
                    {formData.currency === currency.code && <CheckCircle className="w-4 h-4 text-cyan-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Price (cents) *</label>
              <input
                type="number"
                name="priceCents"
                value={formData.priceCents || ''}
                onChange={(e) => {
                  const cents = parseInt(e.target.value) || 0;
                  setFormData(prev => ({ 
                    ...prev, 
                    priceCents: cents,
                    price: cents > 0 ? centsToPrice(cents, formData.currency) : ''
                  }));
                }}
                placeholder="4900"
                min="0"
                step="1"
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
              />
              {formData.priceCents > 0 && (
                <p className="text-xs text-cyan-400 mt-1">= {centsToPrice(formData.priceCents, formData.currency)}</p>
              )}
            </div>
            <div>
              <label className="text-xs text-gray-400 mb-1 block">Original Price (cents)</label>
              <input
                type="number"
                name="originalPriceCents"
                value={formData.originalPriceCents || ''}
                onChange={(e) => {
                  const cents = parseInt(e.target.value) || 0;
                  setFormData(prev => ({ 
                    ...prev, 
                    originalPriceCents: cents,
                    originalPrice: cents > 0 ? centsToPrice(cents, formData.currency) : ''
                  }));
                }}
                placeholder="9900"
                min="0"
                step="1"
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
              />
              {formData.originalPriceCents > 0 && (
                <p className="text-xs text-gray-400 mt-1">= {centsToPrice(formData.originalPriceCents, formData.currency)}</p>
              )}
            </div>
          </div>
          
          {/* Stripe Status */}
          {stripeAvailable && formData.syncToStripe && formData.priceCents > 0 && (
            <div className="flex items-center gap-2 p-2 rounded-lg bg-cyan-400/10 text-cyan-400 text-xs">
              <CreditCard className="w-4 h-4" />
              <span>Will create product & payment link in Stripe</span>
            </div>
          )}
        </div>

        {/* Settings */}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <h3 className="font-semibold text-sm">Settings</h3>
          
          {/* Category Dropdown */}
          <div className="relative">
            <label className="text-xs text-gray-400 mb-1 block">Category *</label>
            <button
              type="button"
              onClick={() => setShowCategoryPicker(p => !p)}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
            >
              <span className="text-sm">{formData.category}</span>
              <ChevronDown className={'w-4 h-4 text-gray-400 transition-transform ' + (showCategoryPicker ? 'rotate-180' : '')} />
            </button>
            {showCategoryPicker && (
              <div className="absolute top-full left-0 right-0 mt-1 glass-card rounded-xl overflow-hidden shadow-xl z-30">
                {categories.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setFormData(prev => ({ ...prev, category: cat }));
                      setShowCategoryPicker(false);
                    }}
                    className={'flex items-center justify-between w-full px-4 py-2.5 hover:bg-white/10 text-left text-sm ' + (formData.category === cat ? 'bg-cyan-400/10 text-cyan-400' : '')}
                  >
                    <span>{cat}</span>
                    {formData.category === cat && <span className="text-cyan-400">✓</span>}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-gray-400 mb-1 block">Stripe Payment Link</label>
            <input
              type="url"
              name="stripeLink"
              value={formData.stripeLink}
              onChange={handleChange}
              placeholder="https://buy.stripe.com/..."
              className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
            />
          </div>
        </div>

        {/* AI Prompt */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400">AI Prompt for Customers</label>
            <button
              type="button"
              onClick={generateAIPrompt}
              disabled={generatingField !== null}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-400/10 text-cyan-400 text-xs hover:bg-cyan-400/20 transition-colors disabled:opacity-50"
            >
              {generatingField === 'aiPrompt' ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
              ) : (
                <><Sparkles className="w-3 h-3" /> Generate</>
              )}
            </button>
          </div>
          <textarea
            name="aiPrompt"
            value={formData.aiPrompt}
            onChange={handleChange}
            rows={4}
            placeholder="A prompt customers can use with AI to learn about this product..."
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all resize-none"
          />
        </div>
      </form>
    </div>
  );
}
