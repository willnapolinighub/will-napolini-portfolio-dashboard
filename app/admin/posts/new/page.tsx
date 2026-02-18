'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertCircle, Sparkles, Loader2, ChevronDown } from 'lucide-react';
import Link from 'next/link';
import { createPost } from '@/lib/admin-api';
import { ImagePicker } from '@/components/ImagePicker';

interface TopicItem {
  id: string;
  text: string;
  category: 'Mindset' | 'Skillset' | 'Toolset';
  tag: '🔥' | '♾️';
  enabled: boolean;
}

const DEFAULT_BLOG_TOPICS: Omit<TopicItem, 'id' | 'enabled'>[] = [
  // Toolset — AI / automation (hot first)
  { text: 'AI Tools That Will Transform Your Productivity',       category: 'Toolset',  tag: '🔥' },
  { text: 'How to Automate Your Business with No-Code Tools',    category: 'Toolset',  tag: '🔥' },
  { text: 'The Best AI Writing Tools in 2025',                   category: 'Toolset',  tag: '🔥' },
  { text: 'Building Your Second Brain: A Complete Guide',        category: 'Toolset',  tag: '♾️' },
  { text: 'Best Note-Taking Systems for Knowledge Workers',      category: 'Toolset',  tag: '♾️' },
  { text: 'Top Project Management Tools for Freelancers',        category: 'Toolset',  tag: '♾️' },
  { text: 'How to Build a Personal Knowledge Management System', category: 'Toolset',  tag: '♾️' },
  // Mindset — evergreen personal development
  { text: 'The Power of Deep Work in the Age of AI',             category: 'Mindset',  tag: '🔥' },
  { text: 'How to Build a Growth Mindset in 30 Days',            category: 'Mindset',  tag: '♾️' },
  { text: 'The Compound Effect of Daily Habits',                 category: 'Mindset',  tag: '♾️' },
  { text: 'Morning Routines of High Performers',                 category: 'Mindset',  tag: '♾️' },
  { text: 'How to Overcome Procrastination Once and For All',    category: 'Mindset',  tag: '♾️' },
  { text: 'Building Unshakeable Self-Confidence',                category: 'Mindset',  tag: '♾️' },
  { text: 'The Science of Habit Formation',                      category: 'Mindset',  tag: '♾️' },
  // Skillset
  { text: 'Emotional Intelligence: The Skill That Outperforms IQ', category: 'Skillset', tag: '♾️' },
  { text: 'Mastering Communication Skills in the Workplace',    category: 'Skillset', tag: '♾️' },
  { text: 'Public Speaking: From Fear to Confidence',           category: 'Skillset', tag: '♾️' },
  { text: 'Time Management Strategies for Entrepreneurs',       category: 'Skillset', tag: '♾️' },
  { text: 'The Art of Critical Thinking',                       category: 'Skillset', tag: '♾️' },
  { text: 'Negotiation Skills for Everyday Life',               category: 'Skillset', tag: '♾️' },
];

export default function NewPostPage() {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    slug: '',
    description: '',
    content: '',
    image: '',
    category: 'Mindset' as 'Mindset' | 'Skillset' | 'Toolset',
    aiPrompt: '',
    readTime: '5 min read',
  });
  
  const [generatingField, setGeneratingField] = useState<string | null>(null);
  const [showTopicPicker, setShowTopicPicker] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [blogTopics, setBlogTopics] = useState<TopicItem[]>([]);

  const categories = ['Mindset', 'Skillset', 'Toolset'] as const;

  useEffect(() => {
    // Load topics from localStorage or use defaults
    const savedTopics = localStorage.getItem('ai_blog_topics');
    if (savedTopics) {
      setBlogTopics(JSON.parse(savedTopics));
    } else {
      const defaults = DEFAULT_BLOG_TOPICS.map((t, i) => ({ id: `blog-${i}`, ...t, enabled: true }));
      setBlogTopics(defaults);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
      ...(name === 'title' && { slug: value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') }),
    }));
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
      const prompt = `Generate a catchy, SEO-friendly blog post title for: "${context}". 
Category: ${formData.category}
Return ONLY the title, nothing else. Keep it under 60 characters.`;
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
      const prompt = `Write a compelling meta description for a blog post titled: "${formData.title}"
Category: ${formData.category}
Return ONLY the description, nothing else. Keep it under 160 characters and make it engaging for readers.`;
      const result = await callAI(prompt);
      setFormData(prev => ({ ...prev, description: result.trim() }));
    } catch (err) {
      setError('Failed to generate description');
    } finally {
      setGeneratingField(null);
    }
  };

  const generateContent = async () => {
    if (!formData.title) {
      alert('Please enter a title first');
      return;
    }
    setGeneratingField('content');
    try {
      const prompt = `Write a comprehensive blog post in HTML format for:
Title: "${formData.title}"
Description: ${formData.description || 'No description provided'}
Category: ${formData.category}

Requirements:
- Use proper HTML tags (h2, h3, p, ul, li, blockquote, etc.)
- Include an engaging introduction
- Structure with clear headings
- Include practical tips and examples
- Write in a professional yet conversational tone
- End with a conclusion and call-to-action

Return ONLY the HTML content, no code blocks or explanations.`;
      const result = await callAI(prompt);
      setFormData(prev => ({ ...prev, content: result.trim() }));
      const wordCount = result.split(/\s+/).length;
      const readTime = Math.max(1, Math.ceil(wordCount / 200));
      setFormData(prev => ({ ...prev, readTime: `${readTime} min read` }));
    } catch (err) {
      setError('Failed to generate content');
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
      const prompt = `Create a useful AI prompt that readers can use to explore the topic of: "${formData.title}"
Category: ${formData.category}

The prompt should help readers get personalized advice or insights related to this topic.
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

    const result = await createPost({
      title: formData.title,
      slug: formData.slug,
      description: formData.description,
      content: formData.content,
      image: formData.image,
      category: formData.category,
      ai_prompt: formData.aiPrompt,
      read_time: formData.readTime,
      published: true,
    });

    setIsSaving(false);

    if (result.success) {
      router.push('/admin/posts');
    } else {
      setError(result.error || 'Failed to create post');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/admin/posts"
            className="p-2 rounded-lg glass-card hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">New Post</h1>
            <p className="text-sm text-gray-500">Create a blog post</p>
          </div>
        </div>
        <button
          type="submit"
          form="post-form"
          disabled={isSaving}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 rounded-xl gradient-bg text-white text-sm font-medium disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Publishing...' : 'Publish Post'}
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 text-red-400 bg-red-500/10 p-3 rounded-xl text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Form */}
      <form id="post-form" onSubmit={handleSubmit} className="space-y-4">

        {/* Topic Picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setShowTopicPicker(p => !p)}
            className="w-full flex items-center justify-between px-4 py-3 glass-card rounded-xl text-sm hover:bg-white/10 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="text-gray-300">Quick Topic</span>
            </div>
            <span className="text-xs text-gray-500">{showTopicPicker ? '▲ close' : '▼ pick a topic'}</span>
          </button>
          {showTopicPicker && (
            <div className="absolute top-full left-0 right-0 mt-1 glass-card rounded-xl overflow-hidden shadow-xl z-30 max-h-72 overflow-y-auto">
              {(['Toolset', 'Mindset', 'Skillset'] as const).map(cat => (
                <div key={cat}>
                  <p className="px-3 py-1.5 text-xs font-semibold text-gray-500 bg-white/5 sticky top-0">{cat}</p>
                  {blogTopics.filter((t: TopicItem) => t.category === cat && t.enabled).map((topic: TopicItem) => (
                    <button
                      key={topic.id}
                      type="button"
                      onClick={() => {
                        setFormData(prev => ({
                          ...prev,
                          title: topic.text,
                          category: topic.category,
                          slug: topic.text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
                        }));
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
            placeholder="Enter post title..."
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
          />
        </div>

        {/* Slug */}
        <div className="glass-card rounded-xl p-4">
          <label className="text-xs text-gray-400 mb-2 block">Slug (URL)</label>
          <input
            type="text"
            name="slug"
            value={formData.slug}
            onChange={handleChange}
            placeholder="auto-generated-from-title"
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
            rows={2}
            placeholder="Brief description for SEO..."
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all resize-none"
          />
        </div>

        {/* AI Prompt */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs text-gray-400">AI Prompt for Readers</label>
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
            placeholder="A prompt readers can use with AI to explore this topic..."
            className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all resize-none"
          />
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
            <label className="text-xs text-gray-400 mb-1 block">Read Time</label>
            <input
              type="text"
              name="readTime"
              value={formData.readTime}
              onChange={handleChange}
              className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
            />
          </div>

          <ImagePicker
            value={formData.image}
            onChange={(url: string) => setFormData(prev => ({ ...prev, image: url }))}
            label="Image"
            folder="will-napolini/posts"
          />
        </div>
      </form>
    </div>
  );
}
