'use client';

import { useState, useEffect } from 'react';
import { Save, Settings, Webhook, CreditCard, Bot, Check, AlertCircle, Loader2, Database, Link2, Wallet } from 'lucide-react';
import { toast } from '@/components/Toast';

interface ChatSettings {
  provider: 'ollama' | 'openai' | 'anthropic' | 'n8n';
  model: string;
  endpoint: string;
  apiKey: string;
  systemPrompt: string;
  enableProductChat: boolean;
  enableBlogChat: boolean;
}

interface DbConnection {
  url: string;
  anonKey: string;
  connected: boolean;
}

interface DbConnections {
  posts: DbConnection;
  products: DbConnection;
  subscribers: DbConnection;
  analytics: DbConnection;
}

export default function AdminSettingsPage() {
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingChat, setIsTestingChat] = useState(false);
  const [chatTestResult, setChatTestResult] = useState<{ success: boolean; message: string } | null>(null);
  
  const [settings, setSettings] = useState({
    siteName: 'Will Napolini',
    siteUrl: 'https://willnapolini.com',
    newsletterWebhook: '',
    chatWebhook: '',
  });

  const [polarSettings, setPolarSettings] = useState({
    accessToken: '',
    webhookSecret: '',
  });

  const [stripeApiSettings, setStripeApiSettings] = useState({
    secretKey: '',
    webhookSecret: '',
    testMode: true,
  });
  const [stripeTestResult, setStripeTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTestingStripe, setIsTestingStripe] = useState(false);

  const [chatSettings, setChatSettings] = useState<ChatSettings>({
    provider: 'ollama',
    model: 'qwen3:0.6b',
    endpoint: 'http://127.0.0.1:11434/api/chat',
    apiKey: '',
    systemPrompt: 'You are a helpful AI assistant for Will Napolini\'s website. You help visitors learn about courses, products, and blog content. Be friendly, helpful, and concise.',
    enableProductChat: true,
    enableBlogChat: true,
  });

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  
  // Database connections state
  const [dbConnections, setDbConnections] = useState<DbConnections>({
    posts: { url: '', anonKey: '', connected: false },
    products: { url: '', anonKey: '', connected: false },
    subscribers: { url: '', anonKey: '', connected: false },
    analytics: { url: '', anonKey: '', connected: false },
  });
  // Load settings on mount
  useEffect(() => {
    fetchChatSettings();
    fetchDbConnections();
  }, []);
  
  const fetchDbConnections = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      if (data.success && data.settings?.db_connections) {
        setDbConnections(data.settings.db_connections);
      }
    } catch (err) {
      console.error('Failed to fetch DB connections:', err);
    }
  };

  const fetchChatSettings = async () => {
    try {
      const response = await fetch('/api/chat-config');
      const data = await response.json();
      if (data.success && data.settings) {
        setChatSettings(data.settings);
      }
    } catch (err) {
      console.error('Failed to fetch chat settings:', err);
    }
  };
  
  useEffect(() => {
    // Fetch Ollama models if provider is ollama
    if (chatSettings.provider === 'ollama') {
      fetchOllamaModels();
    }
  }, [chatSettings.provider]);

  const fetchOllamaModels = async () => {
    try {
      const response = await fetch('http://127.0.0.1:11434/api/tags');
      if (response.ok) {
        const data = await response.json();
        setAvailableModels(data.models?.map((m: { name: string }) => m.name) || []);
      }
    } catch (err) {
      console.error('Failed to fetch Ollama models:', err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    if (name in chatSettings) {
      setChatSettings(prev => ({ 
        ...prev, 
        [name]: type === 'checkbox' ? checked : value 
      }));
    } else {
      setSettings(prev => ({ ...prev, [name]: value }));
    }
    
    // Fetch models when provider changes to ollama
    if (name === 'provider' && value === 'ollama') {
      fetchOllamaModels();
    }
  };

  const testChatConnection = async () => {
    setIsTestingChat(true);
    setChatTestResult(null);
    
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: 'Say "Connection successful!" in exactly those words.' }],
          config: chatSettings,
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setChatTestResult({ success: true, message: `Connected via ${data.provider}! Response: "${data.response.substring(0, 100)}..."` });
      } else {
        setChatTestResult({ success: false, message: data.error || 'Connection failed' });
      }
    } catch (err) {
      setChatTestResult({ success: false, message: err instanceof Error ? err.message : 'Connection failed' });
    } finally {
      setIsTestingChat(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const [chatRes, dbRes, polarRes, stripeRes] = await Promise.all([
        fetch('/api/chat-config', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(chatSettings),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'db_connections', value: dbConnections }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'polar_settings', value: polarSettings }),
        }),
        fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ key: 'stripe_api', value: stripeApiSettings }),
        }),
      ]);

      const chatData = await chatRes.json();
      const dbData = await dbRes.json();
      const polarData = await polarRes.json();
      const stripeData = await stripeRes.json();

      if (chatData.success && dbData.success && stripeData.success) {
        toast('All settings saved!', 'success');
      } else {
        toast('Save error: ' + (chatData.error || dbData.error || polarData.error || stripeData.error || 'Unknown error'), 'error');
      }
    } catch (err) {
      console.error('Save error:', err);
      toast('Failed to save settings', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3">
        <h1 className="text-xl font-bold">Settings</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">Configure your site and integrations</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Site Settings */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Settings className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold">Site Settings</h2>
          </div>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Site Name</label>
              <input
                type="text"
                name="siteName"
                value={settings.siteName}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Site URL</label>
              <input
                type="url"
                name="siteUrl"
                value={settings.siteUrl}
                onChange={handleChange}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Chat AI Configuration */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Bot className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold">Chat AI Configuration</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Configure the AI provider for frontend chat bots (product/blog chats).
          </p>
          
          <div className="space-y-4">
            {/* Provider Selection */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-gray-400 mb-1">AI Provider</label>
                <select
                  name="provider"
                  value={chatSettings.provider}
                  onChange={handleChange}
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
                >
                  <option value="ollama">Ollama (Local)</option>
                  <option value="openai">OpenAI</option>
                  <option value="anthropic">Anthropic</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Model</label>
                {chatSettings.provider === 'ollama' && availableModels.length > 0 ? (
                  <select
                    name="model"
                    value={chatSettings.model}
                    onChange={handleChange}
                    className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
                  >
                    {availableModels.map(model => (
                      <option key={model} value={model}>{model}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    name="model"
                    value={chatSettings.model}
                    onChange={handleChange}
                    placeholder={chatSettings.provider === 'openai' ? 'gpt-4o-mini' : 'claude-3-haiku-20240307'}
                    className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
                  />
                )}
              </div>
            </div>

            {/* Endpoint */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                API Endpoint
                {chatSettings.provider === 'ollama' && <span className="text-gray-500 ml-1">(Ollama must be running)</span>}
              </label>
              <input
                type="url"
                name="endpoint"
                value={chatSettings.endpoint}
                onChange={handleChange}
                placeholder={chatSettings.provider === 'ollama' ? 'http://127.0.0.1:11434/api/chat' : 'https://api.openai.com/v1/chat/completions'}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
              />
            </div>

            {/* API Key (for cloud providers) */}
            {chatSettings.provider !== 'ollama' && (
              <div>
                <label className="block text-xs text-gray-400 mb-1">API Key</label>
                <input
                  type="password"
                  name="apiKey"
                  value={chatSettings.apiKey}
                  onChange={handleChange}
                  placeholder="sk-..."
                  className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
                />
              </div>
            )}

            {/* System Prompt */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">System Prompt</label>
              <textarea
                name="systemPrompt"
                value={chatSettings.systemPrompt}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all resize-none"
              />
            </div>

            {/* Enable toggles */}
            <div className="flex flex-wrap gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="enableProductChat"
                  checked={chatSettings.enableProductChat}
                  onChange={handleChange}
                  className="w-4 h-4 rounded accent-cyan-400"
                />
                <span className="text-sm">Enable on Products</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="enableBlogChat"
                  checked={chatSettings.enableBlogChat}
                  onChange={handleChange}
                  className="w-4 h-4 rounded accent-cyan-400"
                />
                <span className="text-sm">Enable on Blogs</span>
              </label>
            </div>

            {/* Test Connection */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={testChatConnection}
                disabled={isTestingChat}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm disabled:opacity-50"
              >
                {isTestingChat ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
                ) : (
                  'Test Connection'
                )}
              </button>
              
              {chatTestResult && (
                <div className={`flex items-center gap-2 text-sm ${chatTestResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {chatTestResult.success ? (
                    <><Check className="w-4 h-4" /> {chatTestResult.message}</>
                  ) : (
                    <><AlertCircle className="w-4 h-4" /> {chatTestResult.message}</>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Database Connections */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Database className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold">Database Connections</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Configure separate Supabase databases for each data type. Leave empty to use the default database.
          </p>
          
          <div className="space-y-6">
            {(['posts', 'products', 'subscribers', 'analytics'] as const).map((dbType) => (
              <div key={dbType} className="p-3 rounded-lg bg-white/5 border border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Link2 className="w-4 h-4 text-gray-400" />
                    <span className="font-medium capitalize">{dbType}</span>
                  </div>
                  {dbConnections[dbType].connected && (
                    <span className="text-xs text-green-400 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Connected
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <input
                    type="url"
                    placeholder="Supabase URL"
                    value={dbConnections[dbType].url}
                    onChange={(e) => setDbConnections(prev => ({
                      ...prev,
                      [dbType]: { ...prev[dbType], url: e.target.value }
                    }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-cyan-400 focus:outline-none"
                  />
                  <input
                    type="password"
                    placeholder="Service Role Key"
                    value={dbConnections[dbType].anonKey}
                    onChange={(e) => setDbConnections(prev => ({
                      ...prev,
                      [dbType]: { ...prev[dbType], anonKey: e.target.value }
                    }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-cyan-400 focus:outline-none"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* n8n Webhooks */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Webhook className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold">n8n Webhooks</h2>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Configure your n8n workflow webhooks for backend functionality.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Newsletter Webhook</label>
              <input
                type="url"
                name="newsletterWebhook"
                value={settings.newsletterWebhook}
                onChange={handleChange}
                placeholder="https://your-n8n.com/webhook/newsletter"
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">AI Chat Webhook (alternative)</label>
              <input
                type="url"
                name="chatWebhook"
                value={settings.chatWebhook}
                onChange={handleChange}
                placeholder="https://your-n8n.com/webhook/chat"
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Stripe API Integration */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <CreditCard className="w-5 h-5 text-cyan-400" />
            <h2 className="font-semibold">Stripe API Integration</h2>
            <span className="text-xs text-gray-500 ml-2">Auto-create products & payment links</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Connect Stripe to automatically create products and payment links when adding new products.
            Get your keys from <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">Stripe Dashboard → API Keys</a>
          </p>
          
          <div className="space-y-4">
            {/* Test Mode Toggle */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-white/5">
              <div>
                <p className="text-sm font-medium">Test Mode</p>
                <p className="text-xs text-gray-400">Use test API keys (sk_test_...)</p>
              </div>
              <button
                type="button"
                onClick={() => setStripeApiSettings(prev => ({ ...prev, testMode: !prev.testMode }))}
                className={`relative w-12 h-6 rounded-full transition-colors ${stripeApiSettings.testMode ? 'bg-cyan-400' : 'bg-gray-600'}`}
              >
                <span className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${stripeApiSettings.testMode ? 'translate-x-6' : ''}`} />
              </button>
            </div>

            {/* Secret Key */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">
                Secret Key {stripeApiSettings.testMode ? '(Test)' : '(Live)'}
              </label>
              <input
                type="password"
                value={stripeApiSettings.secretKey}
                onChange={(e) => setStripeApiSettings(prev => ({ ...prev, secretKey: e.target.value }))}
                placeholder={stripeApiSettings.testMode ? 'sk_test_...' : 'sk_live_...'}
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
              />
            </div>

            {/* Webhook Secret */}
            <div>
              <label className="block text-xs text-gray-400 mb-1">Webhook Secret (optional)</label>
              <input
                type="password"
                value={stripeApiSettings.webhookSecret}
                onChange={(e) => setStripeApiSettings(prev => ({ ...prev, webhookSecret: e.target.value }))}
                placeholder="whsec_..."
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-cyan-400/20 transition-all"
              />
              <p className="text-xs text-gray-500 mt-1">
                Webhook endpoint: <code className="text-cyan-400">/api/stripe/webhook</code>
              </p>
            </div>

            {/* Test Connection */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={async () => {
                  setIsTestingStripe(true);
                  setStripeTestResult(null);
                  try {
                    const res = await fetch('/api/stripe/test', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(stripeApiSettings),
                    });
                    const data = await res.json();
                    setStripeTestResult({ 
                      success: data.success, 
                      message: data.success ? 'Stripe connected! Account: ' + data.accountId : data.error 
                    });
                  } catch (err) {
                    setStripeTestResult({ success: false, message: 'Connection failed' });
                  } finally {
                    setIsTestingStripe(false);
                  }
                }}
                disabled={isTestingStripe || !stripeApiSettings.secretKey}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors text-sm disabled:opacity-50"
              >
                {isTestingStripe ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Testing...</>
                ) : (
                  'Test Connection'
                )}
              </button>
              
              {stripeTestResult && (
                <div className={`flex items-center gap-2 text-sm ${stripeTestResult.success ? 'text-green-400' : 'text-red-400'}`}>
                  {stripeTestResult.success ? (
                    <><Check className="w-4 h-4" /> {stripeTestResult.message}</>
                  ) : (
                    <><AlertCircle className="w-4 h-4" /> {stripeTestResult.message}</>
                  )}
                </div>
              )}
            </div>

            {/* Status */}
            {stripeApiSettings.secretKey && (
              <div className="flex items-center gap-2 p-2 rounded-lg bg-cyan-400/10 text-cyan-400 text-xs">
                <CreditCard className="w-4 h-4" />
                <span>
                  {stripeApiSettings.testMode ? 'Test mode - no real charges' : 'Live mode - real charges will be made'}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Polar.sh Settings */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Wallet className="w-5 h-5 text-accent-blue" />
            <h2 className="font-semibold">Polar.sh</h2>
            <span className="text-xs text-gray-500 ml-2">Alternative to Stripe</span>
          </div>
          <p className="text-xs text-gray-400 mb-4">
            Configure Polar.sh for digital product sales. Get your credentials from <a href="https://polar.sh/dashboard" target="_blank" rel="noopener noreferrer" className="text-accent-blue hover:underline">polar.sh/dashboard</a>
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-400 mb-1">Access Token</label>
              <input
                type="password"
                value={polarSettings.accessToken}
                onChange={(e) => setPolarSettings(prev => ({ ...prev, accessToken: e.target.value }))}
                placeholder="polar_oat_..."
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-accent-blue/20 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-400 mb-1">Webhook Secret</label>
              <input
                type="password"
                value={polarSettings.webhookSecret}
                onChange={(e) => setPolarSettings(prev => ({ ...prev, webhookSecret: e.target.value }))}
                placeholder="whsec_..."
                className="w-full px-3 py-2.5 rounded-lg bg-white/5 border-none focus:ring-2 focus:ring-accent-blue/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          disabled={isSaving}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl gradient-bg text-white font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Saving...' : 'Save All Settings'}
        </button>
      </form>
    </div>
  );
}
