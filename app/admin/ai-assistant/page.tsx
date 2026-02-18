'use client';

import { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Send, 
  Image, 
  Video, 
  Music, 
  FileText, 
  ChevronRight,
  Sparkles,
  Settings,
  Copy,
  Check,
  X,
  Trash2,
  PlusCircle,
  AlertCircle,
  Download,
  RotateCcw,
  Wrench,
  Zap,
  Play,
  Loader2,
  History,
  CornerUpLeft,
  MessageSquarePlus,
  Clock,
} from 'lucide-react';
import MarkdownRenderer from '@/components/MarkdownRenderer';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  enabled: boolean;
}

interface AIConfig {
  provider: string;
  apiKey: string;
  endpoint: string;
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

interface OllamaModel {
  name: string;
  size: number;
  modified_at: string;
}

interface ToolParam {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'select';
  options?: string[];
  required: boolean;
}

interface ToolDefinition {
  id: string;
  name: string;
  description: string;
  endpoint: string;
  method: 'GET' | 'POST';
  params: ToolParam[];
  enabled: boolean;
}

interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
}

interface TopicItem {
  id: string;
  text: string;
  category: 'Mindset' | 'Skillset' | 'Toolset';
  tag: '🔥' | '♾️';
  enabled: boolean;
}

const DEFAULT_BLOG_TOPICS: Omit<TopicItem, 'id' | 'enabled'>[] = [
  { text: 'AI Tools That Will Transform Your Productivity',       category: 'Toolset',  tag: '🔥' },
  { text: 'How to Automate Your Business with No-Code Tools',    category: 'Toolset',  tag: '🔥' },
  { text: 'The Best AI Writing Tools in 2025',                   category: 'Toolset',  tag: '🔥' },
  { text: 'Building Your Second Brain: A Complete Guide',        category: 'Toolset',  tag: '♾️' },
  { text: 'The Power of Deep Work in the Age of AI',             category: 'Mindset',  tag: '🔥' },
  { text: 'How to Build a Growth Mindset in 30 Days',            category: 'Mindset',  tag: '♾️' },
  { text: 'The Compound Effect of Daily Habits',                 category: 'Mindset',  tag: '♾️' },
  { text: 'Morning Routines of High Performers',                 category: 'Mindset',  tag: '♾️' },
  { text: 'How to Overcome Procrastination Once and For All',    category: 'Mindset',  tag: '♾️' },
  { text: 'Emotional Intelligence: The Skill That Outperforms IQ', category: 'Skillset', tag: '♾️' },
  { text: 'Public Speaking: From Fear to Confidence',           category: 'Skillset', tag: '♾️' },
  { text: 'Time Management Strategies for Entrepreneurs',       category: 'Skillset', tag: '♾️' },
];

const DEFAULT_PRODUCT_TOPICS: Omit<TopicItem, 'id' | 'enabled'>[] = [
  { text: 'AI Productivity Prompt Pack',           category: 'Toolset',  tag: '🔥' },
  { text: 'Notion Life OS Template',               category: 'Toolset',  tag: '🔥' },
  { text: 'Solopreneur Automation Toolkit',        category: 'Toolset',  tag: '🔥' },
  { text: 'Content Creation Template Bundle',      category: 'Toolset',  tag: '🔥' },
  { text: 'Second Brain Setup System',             category: 'Toolset',  tag: '♾️' },
  { text: 'Digital Planner Bundle',                category: 'Toolset',  tag: '♾️' },
  { text: 'Growth Mindset Masterclass',            category: 'Mindset',  tag: '♾️' },
  { text: '30-Day Confidence Challenge',           category: 'Mindset',  tag: '♾️' },
  { text: 'Morning Routine Blueprint',             category: 'Mindset',  tag: '♾️' },
  { text: 'Public Speaking Video Workshop',        category: 'Skillset', tag: '🔥' },
  { text: 'Leadership Coaching Program',           category: 'Skillset', tag: '🔥' },
  { text: 'Communication Skills Masterclass',      category: 'Skillset', tag: '♾️' },
];

// Legacy constants for backwards compatibility
const BLOG_TOPICS = [
  { text: 'AI Tools That Will Transform Your Productivity',       category: 'Toolset',  tag: '🔥' },
  { text: 'How to Automate Your Business with No-Code Tools',    category: 'Toolset',  tag: '🔥' },
  { text: 'The Best AI Writing Tools in 2025',                   category: 'Toolset',  tag: '🔥' },
  { text: 'Building Your Second Brain: A Complete Guide',        category: 'Toolset',  tag: '♾️' },
  { text: 'The Power of Deep Work in the Age of AI',             category: 'Mindset',  tag: '🔥' },
  { text: 'How to Build a Growth Mindset in 30 Days',            category: 'Mindset',  tag: '♾️' },
  { text: 'The Compound Effect of Daily Habits',                 category: 'Mindset',  tag: '♾️' },
  { text: 'Morning Routines of High Performers',                 category: 'Mindset',  tag: '♾️' },
  { text: 'How to Overcome Procrastination Once and For All',    category: 'Mindset',  tag: '♾️' },
  { text: 'Emotional Intelligence: The Skill That Outperforms IQ', category: 'Skillset', tag: '♾️' },
  { text: 'Public Speaking: From Fear to Confidence',           category: 'Skillset', tag: '♾️' },
  { text: 'Time Management Strategies for Entrepreneurs',       category: 'Skillset', tag: '♾️' },
] as const;

const PRODUCT_TOPICS = [
  { text: 'AI Productivity Prompt Pack',           category: 'Toolset',  tag: '🔥' },
  { text: 'Notion Life OS Template',               category: 'Toolset',  tag: '🔥' },
  { text: 'Solopreneur Automation Toolkit',        category: 'Toolset',  tag: '🔥' },
  { text: 'Content Creation Template Bundle',      category: 'Toolset',  tag: '🔥' },
  { text: 'Second Brain Setup System',             category: 'Toolset',  tag: '♾️' },
  { text: 'Digital Planner Bundle',                category: 'Toolset',  tag: '♾️' },
  { text: 'Growth Mindset Masterclass',            category: 'Mindset',  tag: '♾️' },
  { text: '30-Day Confidence Challenge',           category: 'Mindset',  tag: '♾️' },
  { text: 'Morning Routine Blueprint',             category: 'Mindset',  tag: '♾️' },
  { text: 'Public Speaking Video Workshop',        category: 'Skillset', tag: '🔥' },
  { text: 'Leadership Coaching Program',           category: 'Skillset', tag: '🔥' },
  { text: 'Communication Skills Masterclass',      category: 'Skillset', tag: '♾️' },
] as const;

const defaultTools: ToolDefinition[] = [
  { id: 'get_posts',      name: 'Get Posts',      description: 'Fetch all blog posts',       endpoint: '/api/public?resource=posts',    method: 'GET',  params: [], enabled: true },
  { id: 'get_products',   name: 'Get Products',   description: 'Fetch all products',         endpoint: '/api/public?resource=products', method: 'GET',  params: [], enabled: true },
  {
    id: 'create_post', name: 'Create Post', description: 'Create a blog post via n8n webhook', endpoint: '/api/admin/tool-call', method: 'POST', enabled: true,
    params: [
      { name: 'title',    label: 'Title',    type: 'text',     required: true },
      { name: 'category', label: 'Category', type: 'select',   options: ['Mindset','Skillset','Toolset'], required: true },
      { name: 'content',  label: 'Content',  type: 'textarea', required: false },
    ],
  },
  {
    id: 'create_product', name: 'Create Product', description: 'Create a product via n8n webhook', endpoint: '/api/admin/tool-call', method: 'POST', enabled: true,
    params: [
      { name: 'title',       label: 'Title',       type: 'text',     required: true },
      { name: 'price',       label: 'Price',       type: 'text',     required: true },
      { name: 'category',    label: 'Category',    type: 'select',   options: ['Mindset','Skillset','Toolset'], required: true },
      { name: 'description', label: 'Description', type: 'textarea', required: false },
    ],
  },
  {
    id: 'delete_post', name: 'Delete Post', description: 'Delete a post by ID via n8n webhook', endpoint: '/api/admin/tool-call', method: 'POST', enabled: true,
    params: [{ name: 'id', label: 'Post ID', type: 'text', required: true }],
  },
];

const defaultPrompts: PromptTemplate[] = [
  { id: '1', name: 'Blog Post', template: 'Write a blog post about...', enabled: true },
  { id: '2', name: 'Product Description', template: 'Create a product description for...', enabled: true },
  { id: '3', name: 'Email Template', template: 'Write an email about...', enabled: true },
  { id: '4', name: 'Social Media Post', template: 'Create a social media post about...', enabled: true },
  { id: '5', name: 'Newsletter', template: 'Write a newsletter about...', enabled: true },
];

const defaultAIConfig: AIConfig = {
  provider: 'ollama',
  apiKey: '',
  endpoint: 'http://localhost:11434/api/chat',
  model: 'qwen3:0.6b',
  temperature: 0.7,
  maxTokens: 2000,
  systemPrompt: 'You are a helpful AI assistant.',
};

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showPromptsSubmenu, setShowPromptsSubmenu] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessage, setStreamingMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputImageRef = useRef<HTMLInputElement>(null);
  const fileInputVideoRef = useRef<HTMLInputElement>(null);
  const fileInputAudioRef = useRef<HTMLInputElement>(null);
  const fileInputDocRef = useRef<HTMLInputElement>(null);

  // Attached file state
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    type: 'image' | 'video' | 'audio' | 'text';
    preview?: string;   // data URL for images
    content?: string;   // text content for docs
    mimeType: string;
  } | null>(null);

  /** Handle a file selected from the file picker */
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, fileType: 'image' | 'video' | 'audio' | 'text') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();

    if (fileType === 'image') {
      reader.onload = () => {
        setAttachedFile({ name: file.name, type: 'image', preview: reader.result as string, mimeType: file.type });
      };
      reader.readAsDataURL(file);
    } else if (fileType === 'text') {
      reader.onload = () => {
        setAttachedFile({ name: file.name, type: 'text', content: reader.result as string, mimeType: file.type });
      };
      reader.readAsText(file);
    } else {
      // video / audio — just attach filename as context (no binary read needed)
      setAttachedFile({ name: file.name, type: fileType, mimeType: file.type });
    }
    // Reset input so the same file can be re-selected
    e.target.value = '';
    setShowMenu(false);
  };
  
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'prompts' | 'ai' | 'tools' | 'topics'>('prompts');
  const [topicsMode, setTopicsMode] = useState<'blog' | 'product'>('blog');
  const [prompts, setPrompts] = useState<PromptTemplate[]>(defaultPrompts);
  const [aiConfig, setAIConfig] = useState<AIConfig>(defaultAIConfig);
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptTemplate, setNewPromptTemplate] = useState('');
  const [ollamaModels, setOllamaModels] = useState<OllamaModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [customModel, setCustomModel] = useState('');
  const [tools, setTools] = useState<ToolDefinition[]>(defaultTools);
  const [showToolsSubmenu, setShowToolsSubmenu] = useState(false);
  const [toolRunning, setToolRunning] = useState<string | null>(null);
  const [activeToolId, setActiveToolId] = useState<string | null>(null);
  const [toolParams, setToolParams] = useState<Record<string, string>>({});
  const [activeSettingsToolId, setActiveSettingsToolId] = useState<string | null>(null);
  const [toolTopicPickerOpen, setToolTopicPickerOpen] = useState(false);
  const [generatingToolField, setGeneratingToolField] = useState<string | null>(null);
  const [generatingTopic, setGeneratingTopic] = useState(false);
  const [generatingPromptName, setGeneratingPromptName] = useState(false);
  const [generatingPromptTemplate, setGeneratingPromptTemplate] = useState(false);

  // ── Topics (localStorage-backed) ──────────────────────────────────────────
  const [blogTopics, setBlogTopics] = useState<TopicItem[]>([]);
  const [productTopics, setProductTopics] = useState<TopicItem[]>([]);
  const [newTopicText, setNewTopicText] = useState('');
  const [newTopicCategory, setNewTopicCategory] = useState<'Mindset' | 'Skillset' | 'Toolset'>('Toolset');
  const [newTopicTag, setNewTopicTag] = useState<'🔥' | '♾️'>('♾️');

  // ── Chat History ──────────────────────────────────────────────────────────
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>(() => Date.now().toString());
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    const savedPrompts = localStorage.getItem('ai_prompts');
    const savedConfig = localStorage.getItem('ai_config');
    const savedTools = localStorage.getItem('ai_tools');
    const savedSessions = localStorage.getItem('ai_sessions');
    const savedBlogTopics = localStorage.getItem('ai_blog_topics');
    const savedProductTopics = localStorage.getItem('ai_product_topics');
    if (savedPrompts) setPrompts(JSON.parse(savedPrompts));
    if (savedConfig) setAIConfig({ ...defaultAIConfig, ...JSON.parse(savedConfig) });
    if (savedTools) setTools(JSON.parse(savedTools));
    if (savedSessions) setSessions(JSON.parse(savedSessions));
    // Load topics with defaults
    if (savedBlogTopics) {
      setBlogTopics(JSON.parse(savedBlogTopics));
    } else {
      const defaults = DEFAULT_BLOG_TOPICS.map((t, i) => ({ id: `blog-${i}`, ...t, enabled: true }));
      setBlogTopics(defaults);
      localStorage.setItem('ai_blog_topics', JSON.stringify(defaults));
    }
    if (savedProductTopics) {
      setProductTopics(JSON.parse(savedProductTopics));
    } else {
      const defaults = DEFAULT_PRODUCT_TOPICS.map((t, i) => ({ id: `prod-${i}`, ...t, enabled: true }));
      setProductTopics(defaults);
      localStorage.setItem('ai_product_topics', JSON.stringify(defaults));
    }
  }, []);

  /** Persist sessions array to localStorage */
  const persistSessions = (updated: ChatSession[]) => {
    localStorage.setItem('ai_sessions', JSON.stringify(updated));
    setSessions(updated);
  };

  /** Save / update the current conversation in session history */
  const saveCurrentSession = (msgs: Message[]) => {
    if (msgs.length === 0) return;
    const title = msgs.find(m => m.role === 'user')?.content.slice(0, 60) || 'New chat';
    const now = new Date().toISOString();
    setSessions(prev => {
      const existing = prev.findIndex(s => s.id === currentSessionId);
      let updated: ChatSession[];
      if (existing >= 0) {
        updated = prev.map(s => s.id === currentSessionId ? { ...s, title, messages: msgs, updatedAt: now } : s);
      } else {
        updated = [{ id: currentSessionId, title, messages: msgs, createdAt: now, updatedAt: now }, ...prev];
      }
      localStorage.setItem('ai_sessions', JSON.stringify(updated));
      return updated;
    });
  };

  /** Start a fresh chat session (saves the current one first) */
  const startNewChat = () => {
    saveCurrentSession(messages);
    setMessages([]);
    setError(null);
    setStreamingMessage('');
    setCurrentSessionId(Date.now().toString());
    setShowMenu(false);
    setShowHistory(false);
  };

  /** Load a past session into the chat view */
  const loadSession = (session: ChatSession) => {
    // Save current session before switching
    saveCurrentSession(messages);
    setMessages(session.messages.map(m => ({ ...m, timestamp: new Date(m.timestamp) })));
    setCurrentSessionId(session.id);
    setError(null);
    setStreamingMessage('');
    setShowHistory(false);
  };

  /** Delete a session from history */
  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = sessions.filter(s => s.id !== id);
    persistSessions(updated);
  };

  /** Clean AI response by removing think tags and extracting content */
  const cleanAIResponse = (response: string): string => {
    // Remove <think...</think"> tags (used by reasoning models like Qwen)
    let cleaned = response.replace(/<think[\s\S]*?<\/think>/gi, '');
    // Remove any leading/trailing whitespace and quotes
    cleaned = cleaned.trim();
    // Remove surrounding quotes if present
    if ((cleaned.startsWith('"') && cleaned.endsWith('"')) || (cleaned.startsWith("'") && cleaned.endsWith("'"))) {
      cleaned = cleaned.slice(1, -1);
    }
    return cleaned;
  };

  /** Call AI directly using client-side aiConfig (no streaming, returns full response) */
  const callAIDirect = async (userPrompt: string): Promise<string> => {
    const endpoint = aiConfig.endpoint || 'http://localhost:11434/api/chat';
    const model = aiConfig.model || 'qwen3:0.6b';
    
    // Build messages array with system prompt
    const messages: { role: string; content: string }[] = [];
    if (aiConfig.systemPrompt?.trim()) {
      messages.push({ role: 'system', content: aiConfig.systemPrompt });
    }
    messages.push({ role: 'user', content: userPrompt });

    if (aiConfig.provider === 'ollama') {
      // Ollama API
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          messages,
          stream: false,
          options: { temperature: aiConfig.temperature, num_predict: 500 }
        })
      });
      if (!response.ok) throw new Error(`Ollama error: ${response.status}`);
      const data = await response.json();
      return data.message?.content || '';
    } else if (aiConfig.provider === 'openai' || aiConfig.provider === 'anthropic') {
      // OpenAI-compatible API
      if (!aiConfig.apiKey) throw new Error('API key required. Add it in Settings → AI.');
      const response = await fetch(endpoint || 'https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiConfig.apiKey}`
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: aiConfig.temperature,
          max_tokens: 500
        })
      });
      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `API error: ${response.status}`);
      }
      const data = await response.json();
      return data.choices?.[0]?.message?.content || '';
    } else {
      // Custom endpoint
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(aiConfig.apiKey && { 'Authorization': `Bearer ${aiConfig.apiKey}` })
        },
        body: JSON.stringify({ message: userPrompt, model })
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      return data.response || data.message || data.content || '';
    }
  };

  /** Generate content for a tool param field */
  const generateForTool = async (field: string, prompt: string) => {
    setGeneratingToolField(field);
    try {
      const response = await callAIDirect(prompt);
      if (response) {
        setToolParams(p => ({ ...p, [field]: cleanAIResponse(response) }));
      }
    } catch (err) {
      console.error('AI generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    }
    setGeneratingToolField(null);
  };

  /** Generate a topic suggestion */
  const generateTopic = async () => {
    setGeneratingTopic(true);
    try {
      const typeLabel = topicsMode === 'blog' ? 'blog post topic' : 'digital product name';
      const tagStyle = newTopicTag === '🔥' ? 'trending - timely and buzzworthy, capitalizing on current interests' : 'evergreen - timeless value that stays relevant';
      const prompt = `You are a content strategist specializing in personal development and productivity.

Generate ONE compelling ${typeLabel} in the "${newTopicCategory}" category.
Style: ${tagStyle}

Requirements:
- 8-12 words maximum
- Action-oriented or curiosity-driven
- Clear value proposition for the audience

Output: Return ONLY the title text, no quotes or explanation.`;
      const response = await callAIDirect(prompt);
      if (response) {
        setNewTopicText(cleanAIResponse(response));
      }
    } catch (err) {
      console.error('AI generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate topic');
    }
    setGeneratingTopic(false);
  };

  /** Generate a prompt name */
  const generatePromptName = async () => {
    setGeneratingPromptName(true);
    try {
      const prompt = `You are a prompt engineer. Create a concise, descriptive name for an AI prompt template.

Requirements:
- 2-4 words maximum
- Use title case (e.g., "Blog Post Writer", "Email Composer")
- Clearly describes the template's purpose

Output: Return ONLY the name, nothing else.`;
      const response = await callAIDirect(prompt);
      if (response) {
        setNewPromptName(cleanAIResponse(response));
      }
    } catch (err) {
      console.error('AI generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate name');
    }
    setGeneratingPromptName(false);
  };

  /** Generate a prompt template (smart - also generates name if empty) */
  const generatePromptTemplate = async () => {
    setGeneratingPromptTemplate(true);
    try {
      const hasName = newPromptName.trim().length > 0;
      const prompt = hasName
        ? `You are a prompt engineering expert. Create a reusable prompt template for: "${newPromptName.trim()}"

Requirements:
- Include 1-2 placeholders in [brackets] for user input
- Start with a clear action verb (Write, Create, Generate, Analyze)
- Specify output format when helpful
- Keep it concise but complete

Output: Return ONLY the template text, nothing else.`
        : `You are a prompt engineering expert. Create a reusable prompt template AND a name for it.

Requirements:
- Include 1-2 placeholders in [brackets] for user input
- Start with a clear action verb (Write, Create, Generate, Analyze)
- Specify output format when helpful
- Keep it concise but complete

Output format (follow exactly):
NAME: [2-4 word name in title case]
TEMPLATE: [the template with [placeholders]]`;
      
      const response = await callAIDirect(prompt);
      if (response) {
        if (hasName) {
          setNewPromptTemplate(cleanAIResponse(response));
        } else {
          // Parse NAME and TEMPLATE from response
          const nameMatch = response.match(/NAME:\s*(.+)/i);
          const templateMatch = response.match(/TEMPLATE:\s*([\s\S]+)/i);
          if (nameMatch && templateMatch) {
            setNewPromptName(cleanAIResponse(nameMatch[1]));
            setNewPromptTemplate(cleanAIResponse(templateMatch[1]));
          } else {
            // Fallback: just use the whole response as template
            setNewPromptTemplate(cleanAIResponse(response));
          }
        }
      }
    } catch (err) {
      console.error('AI generation error:', err);
      setError(err instanceof Error ? err.message : 'Failed to generate template');
    }
    setGeneratingPromptTemplate(false);
  };

  const saveSettings = () => {
    localStorage.setItem('ai_prompts', JSON.stringify(prompts));
    localStorage.setItem('ai_config', JSON.stringify(aiConfig));
    localStorage.setItem('ai_tools', JSON.stringify(tools));
    setShowSettings(false);
  };

  const handleToolCall = async (tool: ToolDefinition, params: Record<string, string> = {}) => {
    if (!tool.endpoint) {
      setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `⚠️ **${tool.name}** has no endpoint configured. Add a webhook URL in **Settings → Tools**.`, timestamp: new Date() }]);
      return;
    }
    setToolRunning(tool.id);
    setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: `[Tool: ${tool.name}]${Object.keys(params).length ? ' ' + JSON.stringify(params) : ''}`, timestamp: new Date() }]);
    try {
      const opts: RequestInit = { method: tool.method, headers: { 'Content-Type': 'application/json' } };
      if (tool.method === 'POST') opts.body = JSON.stringify({ tool: tool.id, params });
      const res = await fetch(tool.endpoint, opts);
      const data = await res.json().catch(async () => ({ raw: await res.text() }));
      setMessages(prev => {
        const updated = [...prev, { id: (Date.now() + 1).toString(), role: 'assistant' as const, content: `**[Tool result: ${tool.name}]**\n\`\`\`json\n${JSON.stringify(data, null, 2)}\n\`\`\``, timestamp: new Date() }];
        saveCurrentSession(updated);
        return updated;
      });
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev, { id: (Date.now() + 1).toString(), role: 'assistant' as const, content: `❌ **${tool.name}** failed: ${err instanceof Error ? err.message : 'Unknown error'}`, timestamp: new Date() }];
        saveCurrentSession(updated);
        return updated;
      });
    } finally {
      setToolRunning(null);
    }
  };

  const fetchOllamaModels = async () => {
    setIsLoadingModels(true);
    try {
      const response = await fetch('http://localhost:11434/api/tags');
      if (response.ok) {
        const data = await response.json();
        setOllamaModels(data.models || []);
        if (data.models?.length > 0) {
          const modelNames = data.models.map((m: OllamaModel) => m.name);
          if (!modelNames.includes(aiConfig.model)) {
            setAIConfig(prev => ({ ...prev, model: data.models[0].name }));
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch Ollama models:', err);
    } finally {
      setIsLoadingModels(false);
    }
  };

  useEffect(() => {
    if (showSettings && aiConfig.provider === 'ollama') {
      fetchOllamaModels();
    }
  }, [showSettings, aiConfig.provider]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingMessage]);

  const buildMessagesArray = (userMessage: string) => {
    const msgs: { role: string; content: string }[] = [];
    if (aiConfig.systemPrompt?.trim()) {
      msgs.push({ role: 'system', content: aiConfig.systemPrompt });
    }
    messages.forEach(m => {
      msgs.push({ role: m.role, content: m.content });
    });
    msgs.push({ role: 'user', content: userMessage });
    return msgs;
  };

  const callOllamaAPI = async (userMessage: string, onStream: (text: string) => void): Promise<string> => {
    const endpoint = aiConfig.endpoint || 'http://localhost:11434/api/chat';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: aiConfig.model || 'qwen3:0.6b',
        messages: buildMessagesArray(userMessage),
        stream: true,
        options: { temperature: aiConfig.temperature, num_predict: aiConfig.maxTokens }
      })
    });
    if (!response.ok) throw new Error('Ollama API error: ' + response.status);
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    let fullContent = '';
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.trim());
      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          if (data.message?.content) {
            fullContent += data.message.content;
            onStream(fullContent);
          }
        } catch {}
      }
    }
    return cleanAIResponse(fullContent || 'No response from Ollama');
  };

  const callOpenAIAPI = async (userMessage: string, onStream: (text: string) => void): Promise<string> => {
    const endpoint = aiConfig.endpoint || 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + aiConfig.apiKey
      },
      body: JSON.stringify({
        model: aiConfig.model || 'gpt-4',
        messages: buildMessagesArray(userMessage),
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
        stream: true
      })
    });
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || 'OpenAI API error: ' + response.status);
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');
    let fullContent = '';
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n').filter(line => line.startsWith('data: '));
      for (const line of lines) {
        const data = line.replace('data: ', '');
        if (data === '[DONE]') continue;
        try {
          const parsed = JSON.parse(data);
          const content = parsed.choices?.[0]?.delta?.content;
          if (content) {
            fullContent += content;
            onStream(fullContent);
          }
        } catch {}
      }
    }
    return fullContent || 'No response from OpenAI';
  };

  const callCustomAPI = async (userMessage: string): Promise<string> => {
    if (!aiConfig.endpoint) throw new Error('Custom endpoint URL is required');
    const response = await fetch(aiConfig.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(aiConfig.apiKey && { 'Authorization': 'Bearer ' + aiConfig.apiKey })
      },
      body: JSON.stringify({
        message: userMessage,
        model: aiConfig.model,
        temperature: aiConfig.temperature,
        max_tokens: aiConfig.maxTokens,
        system_prompt: aiConfig.systemPrompt,
        history: messages
      })
    });
    if (!response.ok) throw new Error('API error: ' + response.status);
    const data = await response.json();
    return data.response || data.message || data.content || JSON.stringify(data);
  };

  const handleSend = async () => {
    if ((!input.trim() && !attachedFile) || isLoading) return;

    // Build message content: text + optional file attachment context
    let content = input.trim();
    if (attachedFile) {
      if (attachedFile.type === 'image') {
        content = (content ? content + '\n\n' : '') + `[Image attached: ${attachedFile.name}]\n(Note: This model does not support image vision. Describe what you'd like to know about it and I'll help based on context.)`;
      } else if (attachedFile.type === 'text' && attachedFile.content) {
        const truncated = attachedFile.content.length > 4000 ? attachedFile.content.slice(0, 4000) + '\n\n[...truncated]' : attachedFile.content;
        content = (content ? content + '\n\n' : `Here is the content of "${attachedFile.name}":\n\n`) + '```\n' + truncated + '\n```';
      } else if (attachedFile.type === 'audio' || attachedFile.type === 'video') {
        content = (content ? content + '\n\n' : '') + `[${attachedFile.type === 'audio' ? 'Audio' : 'Video'} file attached: ${attachedFile.name}]\n(This model cannot process media files directly. Please describe what you need.)`;
      }
    }
    if (!content) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setAttachedFile(null);
    setIsLoading(true);
    setShowMenu(false);
    setError(null);
    setStreamingMessage('');

    try {
      let response: string;
      const onStream = (text: string) => setStreamingMessage(text);

      switch (aiConfig.provider) {
        case 'ollama':
          response = await callOllamaAPI(userMessage.content, onStream);
          break;
        case 'openai':
          if (!aiConfig.apiKey) throw new Error('OpenAI API key is required. Add it in Settings.');
          response = await callOpenAIAPI(userMessage.content, onStream);
          break;
        case 'anthropic':
          if (!aiConfig.apiKey) throw new Error('Anthropic API key is required. Add it in Settings.');
          response = await callOpenAIAPI(userMessage.content, onStream);
          break;
        case 'custom':
          response = await callCustomAPI(userMessage.content);
          break;
        default:
          response = await callOllamaAPI(userMessage.content, onStream);
      }

      // Auto-detect <tool_call>{"tool":"...","params":{...}}</tool_call> in AI response
      const toolMatch = response.match(/<tool_call>([\s\S]*?)<\/tool_call>/);
      if (toolMatch) {
        try {
          const { tool: toolId, params: callParams } = JSON.parse(toolMatch[1]);
          const matchedTool = tools.find(t => t.id === toolId && t.enabled);
          if (matchedTool) {
            const cleanContent = response.replace(/<tool_call>[\s\S]*?<\/tool_call>/, '').trim();
            if (cleanContent) {
              setMessages(prev => [...prev, { id: (Date.now() + 1).toString(), role: 'assistant', content: cleanContent, timestamp: new Date() }]);
            }
            setStreamingMessage('');
            setIsLoading(false);
            await handleToolCall(matchedTool, callParams || {});
            return;
          }
        } catch {}
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => {
        const updated = [...prev, assistantMessage];
        saveCurrentSession(updated);
        return updated;
      });
      setStreamingMessage('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to get response';
      setError(errorMessage);
      console.error('AI API Error:', err);
    } finally {
      setIsLoading(false);
      setStreamingMessage('');
    }
  };

  const handlePromptSelect = (template: string) => {
    setInput(template);
    setShowMenu(false);
    setShowPromptsSubmenu(false);
  };

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const clearChat = () => {
    setMessages([]);
    setError(null);
    setStreamingMessage('');
    setShowMenu(false);
  };

  const exportAsJSON = () => {
    const exportData = {
      exportedAt: new Date().toISOString(),
      config: { provider: aiConfig.provider, model: aiConfig.model, systemPrompt: aiConfig.systemPrompt },
      messages: messages.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp }))
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat-export-' + new Date().toISOString().split('T')[0] + '.json';
    a.click();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  const exportAsMarkdown = () => {
    let markdown = '# Chat Export\n\n**Exported:** ' + new Date().toLocaleString() + '\n**Provider:** ' + aiConfig.provider + '\n**Model:** ' + aiConfig.model + '\n\n---\n\n';
    messages.forEach(m => {
      const role = m.role === 'user' ? '**You:**' : '**Assistant:**';
      markdown += role + '\n\n' + m.content + '\n\n---\n\n';
    });
    const blob = new Blob([markdown], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'chat-export-' + new Date().toISOString().split('T')[0] + '.md';
    a.click();
    URL.revokeObjectURL(url);
    setShowMenu(false);
  };

  const addNewPrompt = () => {
    if (!newPromptName.trim() || !newPromptTemplate.trim()) return;
    setPrompts(prev => [...prev, { id: Date.now().toString(), name: newPromptName, template: newPromptTemplate, enabled: true }]);
    setNewPromptName('');
    setNewPromptTemplate('');
  };

  const deletePrompt = (id: string) => setPrompts(prev => prev.filter(p => p.id !== id));
  const togglePrompt = (id: string) => setPrompts(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p));
  const enabledPrompts = prompts.filter(p => p.enabled);

  const getModelOptions = () => {
    switch (aiConfig.provider) {
      case 'ollama':
        return [
          { value: 'llama3.2', label: 'Llama 3.2' },
          { value: 'llama3.1', label: 'Llama 3.1' },
          { value: 'mistral', label: 'Mistral' },
          { value: 'mixtral', label: 'Mixtral' },
        ];
      case 'openai':
        return [
          { value: 'gpt-4o', label: 'GPT-4o' },
          { value: 'gpt-4', label: 'GPT-4' },
          { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
        ];
      case 'anthropic':
        return [
          { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
          { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' },
        ];
      default:
        return [{ value: 'custom', label: 'Custom Model' }];
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[400px]">
      {showSettings && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowSettings(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="glass-card rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <h2 className="font-bold gradient-text">Settings</h2>
                <button onClick={() => setShowSettings(false)} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex border-b border-white/10">
                <button onClick={() => setActiveSettingsTab('prompts')} className={'flex-1 py-3 text-xs font-medium ' + (activeSettingsTab === 'prompts' ? 'gradient-text border-b-2 border-cyan-400' : 'text-tertiary')}>Prompts</button>
                <button onClick={() => setActiveSettingsTab('ai')} className={'flex-1 py-3 text-xs font-medium ' + (activeSettingsTab === 'ai' ? 'gradient-text border-b-2 border-cyan-400' : 'text-tertiary')}>AI</button>
                <button onClick={() => setActiveSettingsTab('tools')} className={'flex-1 py-3 text-xs font-medium ' + (activeSettingsTab === 'tools' ? 'gradient-text border-b-2 border-cyan-400' : 'text-tertiary')}>Tools</button>
                <button onClick={() => setActiveSettingsTab('topics')} className={'flex-1 py-3 text-xs font-medium ' + (activeSettingsTab === 'topics' ? 'gradient-text border-b-2 border-cyan-400' : 'text-tertiary')}>Topics</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                {activeSettingsTab === 'prompts' ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      {prompts.map((prompt) => (
                        <div key={prompt.id} className={'flex items-center justify-between p-3 rounded-xl border ' + (prompt.enabled ? 'border-white/20 bg-white/5' : 'border-white/10 bg-white/5 opacity-50')}>
                          <div className="flex items-center gap-3">
                            <button onClick={() => togglePrompt(prompt.id)} className={'w-4 h-4 rounded border ' + (prompt.enabled ? 'bg-cyan-400 border-cyan-400' : 'border-gray-400')} />
                            <span className="text-sm">{prompt.name}</span>
                          </div>
                          <button onClick={() => deletePrompt(prompt.id)} className="p-1 rounded hover:bg-red-500/20 text-red-400"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      ))}
                    </div>
                    <div className="border-t border-white/10 pt-4">
                      <h3 className="text-sm font-medium mb-3">Add Custom Prompt</h3>
                      <div className="flex gap-2 mb-2">
                        <input type="text" value={newPromptName} onChange={(e) => setNewPromptName(e.target.value)} placeholder="Prompt name..." className="flex-1 px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-sm focus:border-cyan-400 focus:outline-none" />
                        <button
                          type="button"
                          onClick={generatePromptName}
                          disabled={generatingPromptName}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-cyan-400/10 text-cyan-400 text-sm hover:bg-cyan-400/20 disabled:opacity-50 transition-colors"
                          title="Generate name with AI"
                        >
                          {generatingPromptName
                            ? <><Loader2 className="w-4 h-4 animate-spin" /></>
                            : <><Sparkles className="w-4 h-4" /></>}
                        </button>
                      </div>
                      <div className="flex gap-2 mb-2">
                        <input type="text" value={newPromptTemplate} onChange={(e) => setNewPromptTemplate(e.target.value)} placeholder="Template text..." className="flex-1 px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-sm focus:border-cyan-400 focus:outline-none" />
                        <button
                          type="button"
                          onClick={generatePromptTemplate}
                          disabled={generatingPromptTemplate}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-cyan-400/10 text-cyan-400 text-sm hover:bg-cyan-400/20 disabled:opacity-50 transition-colors"
                          title="Generate template with AI"
                        >
                          {generatingPromptTemplate
                            ? <><Loader2 className="w-4 h-4 animate-spin" /></>
                            : <><Sparkles className="w-4 h-4" /></>}
                        </button>
                      </div>
                      <button onClick={addNewPrompt} disabled={!newPromptName.trim() || !newPromptTemplate.trim()} className="flex items-center gap-2 px-3 py-2 rounded-lg gradient-bg text-white text-sm disabled:opacity-50"><PlusCircle className="w-4 h-4" /> Add Prompt</button>
                    </div>
                  </div>
                ) : activeSettingsTab === 'tools' ? (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 mb-3">Configure endpoints. n8n webhook receives <code className="text-cyan-400 bg-white/5 px-1 rounded">{"{ tool, params }"}</code>. AI can auto-call by outputting <code className="text-cyan-400 bg-white/5 px-1 rounded">{"<tool_call {...}/>"}</code></p>
                    {tools.map((tool, idx) => (
                      <div key={tool.id} className="p-3 rounded-xl border border-white/10 bg-white/5 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button onClick={() => setTools(prev => prev.map((t, i) => i === idx ? { ...t, enabled: !t.enabled } : t))} className={'w-3.5 h-3.5 rounded border flex-shrink-0 ' + (tool.enabled ? 'bg-cyan-400 border-cyan-400' : 'border-gray-500')} />
                            <span className="text-sm font-medium">{tool.name}</span>
                          </div>
                          <span className="text-xs text-gray-500 bg-white/5 px-2 py-0.5 rounded">{tool.method}</span>
                        </div>
                        <input type="url" value={tool.endpoint} onChange={e => setTools(prev => prev.map((t, i) => i === idx ? { ...t, endpoint: e.target.value } : t))} placeholder={tool.method === 'GET' ? 'Auto-configured' : 'https://your-n8n.com/webhook/...'} className="w-full px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs focus:border-cyan-400 focus:outline-none" />
                        {tool.params.length > 0 && <p className="text-xs text-gray-500">Params: {tool.params.map(p => p.name).join(', ')}</p>}
                      </div>
                    ))}
                    <button onClick={() => setTools(prev => [...prev, { id: Date.now().toString(), name: 'Custom Tool', description: 'My n8n tool', endpoint: '', method: 'POST', params: [], enabled: true }])} className="flex items-center gap-2 px-3 py-2 rounded-lg gradient-bg text-white text-sm w-full justify-center"><PlusCircle className="w-4 h-4" /> Add Tool</button>
                  </div>
                ) : activeSettingsTab === 'topics' ? (
                  <div className="space-y-4">
                    {/* Toggle between Blog and Product topics */}
                    <div className="flex gap-2 p-1 bg-white/5 rounded-lg">
                      <button onClick={() => setTopicsMode('blog')} className={'flex-1 py-2 text-xs font-medium rounded-md transition-colors ' + (topicsMode === 'blog' ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400 hover:text-white')}>Blog Topics</button>
                      <button onClick={() => setTopicsMode('product')} className={'flex-1 py-2 text-xs font-medium rounded-md transition-colors ' + (topicsMode === 'product' ? 'bg-cyan-400/20 text-cyan-400' : 'text-gray-400 hover:text-white')}>Product Topics</button>
                    </div>
                    {/* Topics list */}
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {(topicsMode === 'blog' ? blogTopics : productTopics).map((topic) => (
                        <div key={topic.id} className={'flex items-center justify-between p-2.5 rounded-xl border ' + (topic.enabled ? 'border-white/20 bg-white/5' : 'border-white/10 bg-white/5 opacity-50')}>
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <button
                              onClick={() => {
                                const updater = topicsMode === 'blog' ? setBlogTopics : setProductTopics;
                                const storageKey = topicsMode === 'blog' ? 'ai_blog_topics' : 'ai_product_topics';
                                const current = topicsMode === 'blog' ? blogTopics : productTopics;
                                const updated = current.map(t => t.id === topic.id ? { ...t, enabled: !t.enabled } : t);
                                updater(updated);
                                localStorage.setItem(storageKey, JSON.stringify(updated));
                              }}
                              className={'w-3.5 h-3.5 rounded border flex-shrink-0 ' + (topic.enabled ? 'bg-cyan-400 border-cyan-400' : 'border-gray-500')}
                            />
                            <span className="text-xs text-gray-400 px-1.5 py-0.5 rounded bg-white/10 flex-shrink-0">{topic.category}</span>
                            <span className="text-sm">{topic.tag}</span>
                            <span className="text-xs truncate">{topic.text}</span>
                          </div>
                          <button
                            onClick={() => {
                              const updater = topicsMode === 'blog' ? setBlogTopics : setProductTopics;
                              const storageKey = topicsMode === 'blog' ? 'ai_blog_topics' : 'ai_product_topics';
                              const current = topicsMode === 'blog' ? blogTopics : productTopics;
                              const updated = current.filter(t => t.id !== topic.id);
                              updater(updated);
                              localStorage.setItem(storageKey, JSON.stringify(updated));
                            }}
                            className="p-1 rounded hover:bg-red-500/20 text-red-400 flex-shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                    {/* Add new topic form */}
                    <div className="border-t border-white/10 pt-4">
                      <h3 className="text-sm font-medium mb-3">Add New Topic</h3>
                      <div className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={newTopicText}
                          onChange={(e) => setNewTopicText(e.target.value)}
                          placeholder="Topic title..."
                          className="flex-1 px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-sm focus:border-cyan-400 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={generateTopic}
                          disabled={generatingTopic}
                          className="flex items-center gap-1 px-3 py-2 rounded-lg bg-cyan-400/10 text-cyan-400 text-sm hover:bg-cyan-400/20 disabled:opacity-50 transition-colors"
                        >
                          {generatingTopic
                            ? <><Loader2 className="w-4 h-4 animate-spin" /></>
                            : <><Sparkles className="w-4 h-4" /></>}
                        </button>
                      </div>
                      <div className="flex gap-2 mb-2">
                        <select
                          value={newTopicCategory}
                          onChange={(e) => setNewTopicCategory(e.target.value as 'Mindset' | 'Skillset' | 'Toolset')}
                          className="flex-1 px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-sm focus:border-cyan-400 focus:outline-none"
                        >
                          <option value="Mindset">Mindset</option>
                          <option value="Skillset">Skillset</option>
                          <option value="Toolset">Toolset</option>
                        </select>
                        <select
                          value={newTopicTag}
                          onChange={(e) => setNewTopicTag(e.target.value as '🔥' | '♾️')}
                          className="w-24 px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-sm focus:border-cyan-400 focus:outline-none"
                        >
                          <option value="🔥">🔥 Hot</option>
                          <option value="♾️">♾️ Evergreen</option>
                        </select>
                      </div>
                      <button
                        onClick={() => {
                          if (!newTopicText.trim()) return;
                          const newTopic: TopicItem = {
                            id: Date.now().toString(),
                            text: newTopicText,
                            category: newTopicCategory,
                            tag: newTopicTag,
                            enabled: true,
                          };
                          const updater = topicsMode === 'blog' ? setBlogTopics : setProductTopics;
                          const storageKey = topicsMode === 'blog' ? 'ai_blog_topics' : 'ai_product_topics';
                          const current = topicsMode === 'blog' ? blogTopics : productTopics;
                          const updated = [...current, newTopic];
                          updater(updated);
                          localStorage.setItem(storageKey, JSON.stringify(updated));
                          setNewTopicText('');
                        }}
                        disabled={!newTopicText.trim()}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg gradient-bg text-white text-sm disabled:opacity-50"
                      >
                        <PlusCircle className="w-4 h-4" /> Add Topic
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div><label className="text-xs text-gray-400 mb-1 block">Provider</label><select value={aiConfig.provider} onChange={(e) => setAIConfig(prev => ({ ...prev, provider: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-sm focus:border-cyan-400 focus:outline-none"><option value="ollama">Ollama (Local)</option><option value="openai">OpenAI</option><option value="anthropic">Anthropic</option><option value="custom">Custom / n8n</option></select></div>
                    <div><label className="text-xs text-gray-400 mb-1 block">System Prompt</label><textarea value={aiConfig.systemPrompt} onChange={(e) => setAIConfig(prev => ({ ...prev, systemPrompt: e.target.value }))} placeholder="You are a helpful AI assistant..." rows={3} className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-sm focus:border-cyan-400 focus:outline-none resize-none" /></div>
                    {aiConfig.provider !== 'ollama' && <div><label className="text-xs text-gray-400 mb-1 block">API Key</label><input type="password" value={aiConfig.apiKey} onChange={(e) => setAIConfig(prev => ({ ...prev, apiKey: e.target.value }))} placeholder="sk-..." className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-sm focus:border-cyan-400 focus:outline-none" /></div>}
                    <div><label className="text-xs text-gray-400 mb-1 block">{aiConfig.provider === 'ollama' ? 'Ollama Endpoint' : aiConfig.provider === 'custom' ? 'Webhook URL' : 'Endpoint URL'}</label><input type="text" value={aiConfig.endpoint} onChange={(e) => setAIConfig(prev => ({ ...prev, endpoint: e.target.value }))} placeholder="http://localhost:11434/api/chat" className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-sm focus:border-cyan-400 focus:outline-none" /></div>
                    <div><label className="text-xs text-gray-400 mb-1 block">{aiConfig.provider === 'ollama' ? 'Installed Models' : 'Model'}</label>
                      {aiConfig.provider === 'ollama' ? (
                        isLoadingModels ? <div className="text-sm text-gray-400 py-2">Loading models...</div> :
                        ollamaModels.length > 0 ? (
                          <select value={aiConfig.model} onChange={(e) => setAIConfig(prev => ({ ...prev, model: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-sm focus:border-cyan-400 focus:outline-none">
                            {ollamaModels.map(model => <option key={model.name} value={model.name}>{model.name} ({(model.size / 1e9).toFixed(1)} GB)</option>)}
                          </select>
                        ) : <input type="text" value={customModel} onChange={(e) => { setCustomModel(e.target.value); setAIConfig(prev => ({ ...prev, model: e.target.value })); }} placeholder="Enter model name" className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-sm focus:border-cyan-400 focus:outline-none" />
                      ) : (
                        <select value={aiConfig.model} onChange={(e) => setAIConfig(prev => ({ ...prev, model: e.target.value }))} className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-sm focus:border-cyan-400 focus:outline-none">
                          {getModelOptions().map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                        </select>
                      )}
                    </div>
                    <div><label className="text-xs text-gray-400 mb-1 block">Temperature: {aiConfig.temperature}</label><input type="range" min="0" max="1" step="0.1" value={aiConfig.temperature} onChange={(e) => setAIConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))} className="w-full accent-cyan-400" /></div>
                    <div><label className="text-xs text-gray-400 mb-1 block">Max Tokens</label><input type="number" value={aiConfig.maxTokens} onChange={(e) => setAIConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 2000 }))} className="w-full px-3 py-2 rounded-lg border border-white/20 bg-white/5 text-sm focus:border-cyan-400 focus:outline-none" /></div>
                  </div>
                )}
              </div>
              <div className="flex gap-2 p-4 border-t border-white/10">
                <button onClick={() => setShowSettings(false)} className="flex-1 py-2 rounded-lg border border-white/20 text-sm hover:bg-white/10">Cancel</button>
                <button onClick={saveSettings} className="flex-1 py-2 rounded-lg gradient-bg text-white text-sm hover:opacity-90">Save</button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Tool params modal */}
      {activeToolId && (() => {
        const tool = tools.find(t => t.id === activeToolId);
        if (!tool) return null;
        return (
          <>
            <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setActiveToolId(null)} />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="glass-card rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl" style={{ animation: 'deleteModalPopIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both' }}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-cyan-400" /><h3 className="font-semibold text-sm">{tool.name}</h3></div>
                  <button onClick={() => setActiveToolId(null)} className="p-1 rounded hover:bg-white/10 text-gray-400"><X className="w-4 h-4" /></button>
                </div>
                {/* Topic / product-type picker for create_post and create_product */}
                {(tool.id === 'create_post' || tool.id === 'create_product') && (
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setToolTopicPickerOpen(p => !p)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-lg bg-cyan-400/10 border border-cyan-400/20 text-sm hover:bg-cyan-400/20 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="text-cyan-400 text-xs">{tool.id === 'create_post' ? 'Quick Topic' : 'Product Type'}</span>
                      </div>
                      <span className="text-xs text-gray-400">{toolTopicPickerOpen ? '▲' : '▼ pick one'}</span>
                    </button>
                    {toolTopicPickerOpen && (
                        <div className="absolute top-full left-0 right-0 mt-1 glass-card rounded-xl overflow-hidden shadow-2xl z-10 max-h-52 overflow-y-auto">
                        {(tool.id === 'create_post' ? BLOG_TOPICS : PRODUCT_TOPICS).map(topic => (
                          <button
                            key={topic.text}
                            type="button"
                            onClick={() => {
                              setToolParams(p => ({ ...p, title: topic.text, category: topic.category }));
                              setToolTopicPickerOpen(false);
                            }}
                            className="flex items-center justify-between w-full px-3 py-2 hover:bg-white/10 text-left text-sm border-b border-white/5 last:border-0"
                          >
                            <span className="truncate text-xs">{topic.text}</span>
                            <span className="ml-2 flex-shrink-0 text-sm">{topic.tag}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                {tool.params.map(param => (
                  <div key={param.name}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs text-gray-400">{param.label}{param.required && <span className="text-red-400 ml-0.5">*</span>}</label>
                      {param.type === 'textarea' && (tool.id === 'create_post' || tool.id === 'create_product') && (
                        <button
                          type="button"
                          disabled={!!generatingToolField}
                          onClick={() => {
                            const title = toolParams['title'] || '';
                            const category = toolParams['category'] || 'Mindset';
                            const prompt = tool.id === 'create_post'
                              ? `You are an expert content writer in the personal development space.

Task: Write a blog post in HTML format.

TITLE: "${title}"
CATEGORY: ${category}
AUDIENCE: Entrepreneurs and professionals seeking growth

Structure:
1. Engaging introduction (2-3 sentences)
2. 2-3 main sections with h2/h3 headings
3. Practical tips or actionable insights
4. Brief conclusion

Format: Semantic HTML (h2, h3, p, ul, li, strong)
Tone: Professional yet conversational
Length: 400-600 words

Output: Return ONLY the HTML content, no code blocks or explanations.`
                              : `You are a copywriter specializing in digital products.

Task: Write a persuasive product description.

PRODUCT: "${title}"
CATEGORY: ${category}

Requirements:
- Lead with the main benefit
- Include 2-3 key features or outcomes
- End with subtle call-to-action
- Length: 150-200 characters
- Tone: Enthusiastic but professional

Output: Return ONLY the description, nothing else.`;
                            generateForTool(param.name, prompt);
                          }}
                          className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-cyan-400/10 text-cyan-400 text-xs hover:bg-cyan-400/20 disabled:opacity-50"
                        >
                          {generatingToolField === param.name
                            ? <><Loader2 className="w-3 h-3 animate-spin" /> Generating...</>
                            : <><Sparkles className="w-3 h-3" /> Generate</>}
                        </button>
                      )}
                    </div>
                    {param.type === 'textarea' ? (
                      <textarea value={toolParams[param.name] || ''} onChange={e => setToolParams(p => ({ ...p, [param.name]: e.target.value }))} rows={3} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-sm resize-none focus:border-cyan-400 focus:outline-none" />
                    ) : param.type === 'select' ? (
                      <select value={toolParams[param.name] || ''} onChange={e => setToolParams(p => ({ ...p, [param.name]: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-sm focus:border-cyan-400 focus:outline-none">
                        <option value="">Select...</option>
                        {param.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input type="text" value={toolParams[param.name] || ''} onChange={e => setToolParams(p => ({ ...p, [param.name]: e.target.value }))} className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/20 text-sm focus:border-cyan-400 focus:outline-none" />
                    )}
                  </div>
                ))}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setActiveToolId(null)} className="flex-1 py-2.5 rounded-xl border border-white/20 text-sm hover:bg-white/10">Cancel</button>
                  <button onClick={() => { const t = tools.find(x => x.id === activeToolId)!; setActiveToolId(null); handleToolCall(t, toolParams); }} className="flex-1 py-2.5 rounded-xl gradient-bg text-white text-sm flex items-center justify-center gap-2"><Play className="w-3.5 h-3.5" /> Run Tool</button>
                </div>
              </div>
            </div>
          </>
        );
      })()}

      {/* History popup modal */}
      {showHistory && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setShowHistory(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="glass-card rounded-2xl w-full max-w-sm max-h-[70vh] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between p-4 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-400" />
                  <h2 className="font-bold gradient-text">Chat History</h2>
                </div>
                <button onClick={() => setShowHistory(false)} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
              </div>
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {sessions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-2 text-gray-400">
                    <Clock className="w-8 h-8 opacity-30" />
                    <p className="text-sm">No saved chats yet</p>
                  </div>
                ) : (
                  sessions.map(session => (
                    <button
                      key={session.id}
                      onClick={() => loadSession(session)}
                      className={'w-full text-left p-3 rounded-xl border transition-colors hover:bg-white/10 group ' + (session.id === currentSessionId ? 'border-cyan-400/40 bg-cyan-400/5' : 'border-white/10 bg-white/5')}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{session.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{session.messages.length} messages · {new Date(session.updatedAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                        <button
                          onClick={(e) => deleteSession(session.id, e)}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg hover:bg-red-500/20 text-red-400 flex-shrink-0 transition-opacity"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </button>
                  ))
                )}
              </div>
              <div className="p-3 border-t border-white/10">
                <button
                  onClick={startNewChat}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl gradient-bg text-white text-sm"
                >
                  <MessageSquarePlus className="w-4 h-4" /> New Chat
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Error modal dialog */}
      {error && (
        <>
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setError(null)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="glass-card border border-red-500/20 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl"
              style={{ animation: 'deleteModalPopIn 0.2s cubic-bezier(0.34,1.56,0.64,1) both' }}
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-base">Error</h3>
                  <p className="text-sm text-gray-400 mt-1">{error}</p>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-gray-400"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setError(null)}
                  className="px-4 py-2 rounded-xl bg-red-500/90 hover:bg-red-500 text-white text-sm font-medium transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 mb-4 pr-1">
        {messages.length === 0 && !streamingMessage && <div className="flex items-center justify-center h-full"><p className="text-gray-400 text-sm">Start a conversation...</p></div>}
        {messages.map((message) => (
          <div key={message.id} className={'flex ' + (message.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div className={'rounded-2xl p-3 max-w-[85%] group/msg ' + (message.role === 'user' ? 'gradient-bg text-white rounded-br-md' : 'glass-card rounded-bl-md')}>
              {message.role === 'assistant' ? <MarkdownRenderer content={message.content} /> : <p className="text-sm whitespace-pre-wrap">{message.content}</p>}
              {message.role === 'assistant' ? (
                <button onClick={() => copyToClipboard(message.content, message.id)} className="mt-2 flex items-center gap-1 text-xs text-gray-400 hover:text-cyan-400">
                  {copiedId === message.id ? <><Check className="w-3 h-3" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              ) : (
                <button
                  onClick={() => setInput(message.content)}
                  className="mt-1.5 flex items-center gap-1 text-xs text-white/50 hover:text-white opacity-0 group-hover/msg:opacity-100 transition-opacity"
                  title="Reuse this message"
                >
                  <CornerUpLeft className="w-3 h-3" /> Reuse
                </button>
              )}
            </div>
          </div>
        ))}
        {streamingMessage && <div className="flex justify-start"><div className="glass-card rounded-2xl rounded-bl-md p-3 max-w-[85%]"><MarkdownRenderer content={streamingMessage} /><span className="inline-block w-1.5 h-4 bg-cyan-400 animate-pulse ml-1" /></div></div>}
        {isLoading && !streamingMessage && <div className="flex justify-start"><div className="glass-card rounded-2xl rounded-bl-md px-4 py-3"><div className="flex items-center gap-1.5"><span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" /><span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} /><span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} /></div></div></div>}
        <div ref={messagesEndRef} />
      </div>

      <div className="relative">
        {showMenu && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => { setShowMenu(false); setShowPromptsSubmenu(false); }} />
            <div className="absolute bottom-full left-0 mb-2 w-56 glass-card rounded-xl p-2 z-50 shadow-xl">
              <button onClick={startNewChat} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left"><MessageSquarePlus className="w-4 h-4 text-cyan-400" /><span className="text-sm">New Chat</span></button>
              <button onClick={() => { setShowMenu(false); setShowHistory(true); }} className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left"><div className="flex items-center gap-3"><History className="w-4 h-4 text-cyan-400" /><span className="text-sm">History</span></div>{sessions.length > 0 && <span className="text-xs text-gray-400 bg-white/10 px-1.5 py-0.5 rounded-full">{sessions.length}</span>}</button>
              <div className="border-t border-white/10 my-2" />
              <button onClick={() => fileInputImageRef.current?.click()} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left"><Image className="w-4 h-4 text-cyan-400" /><span className="text-sm">Image Upload</span></button>
              <button onClick={() => fileInputVideoRef.current?.click()} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left"><Video className="w-4 h-4 text-cyan-400" /><span className="text-sm">Video Upload</span></button>
              <button onClick={() => fileInputAudioRef.current?.click()} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left"><Music className="w-4 h-4 text-cyan-400" /><span className="text-sm">Audio Upload</span></button>
              <button onClick={() => fileInputDocRef.current?.click()} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left"><FileText className="w-4 h-4 text-cyan-400" /><span className="text-sm">File Upload</span></button>
              <div className="border-t border-white/10 my-2" />
              <div className="relative">
                <button className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left" onClick={() => setShowPromptsSubmenu(!showPromptsSubmenu)}>
                  <div className="flex items-center gap-3"><Sparkles className="w-4 h-4 text-cyan-400" /><span className="text-sm">Prompts</span></div>
                  <ChevronRight className={'w-4 h-4 transition-transform ' + (showPromptsSubmenu ? 'rotate-90' : '')} />
                </button>
                {showPromptsSubmenu && (
                  <div className="pl-4 mt-1 space-y-1">
                    {enabledPrompts.map((prompt) => (
                      <button key={prompt.id} onClick={() => handlePromptSelect(prompt.template)} className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg hover:bg-white/10 text-left text-sm text-gray-400"><span className="w-1 h-1 bg-cyan-400 rounded-full" />{prompt.name}</button>
                    ))}
                  </div>
                )}
              </div>
              <div className="relative">
                <button className="flex items-center justify-between w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left" onClick={() => setShowToolsSubmenu(!showToolsSubmenu)}>
                  <div className="flex items-center gap-3"><Wrench className="w-4 h-4 text-cyan-400" /><span className="text-sm">Tool Calling</span></div>
                  <ChevronRight className={'w-4 h-4 transition-transform ' + (showToolsSubmenu ? 'rotate-90' : '')} />
                </button>
                {showToolsSubmenu && (
                  <div className="pl-4 mt-1 space-y-1">
                    {tools.filter(t => t.enabled).map(tool => (
                      <button
                        key={tool.id}
                        disabled={!!toolRunning}
                        onClick={() => {
                          if (tool.params.length > 0) {
                            setToolParams({});
                            setActiveToolId(tool.id);
                            setShowMenu(false);
                            setShowToolsSubmenu(false);
                          } else {
                            setShowMenu(false);
                            setShowToolsSubmenu(false);
                            handleToolCall(tool);
                          }
                        }}
                        className="flex items-center gap-2 w-full px-3 py-1.5 rounded-lg hover:bg-white/10 text-left text-sm text-gray-400 disabled:opacity-50"
                      >
                        {toolRunning === tool.id ? <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" /> : <Zap className="w-3.5 h-3.5 text-cyan-400" />}
                        {tool.name}
                      </button>
                    ))}
                    {tools.filter(t => t.enabled).length === 0 && (
                      <p className="text-xs text-gray-500 px-3 py-1.5">No tools. Add in Settings → Tools.</p>
                    )}
                  </div>
                )}
              </div>
              <div className="border-t border-white/10 my-2" />
              <button onClick={clearChat} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left"><RotateCcw className="w-4 h-4 text-yellow-500" /><span className="text-sm">Clear Chat</span></button>
              <button onClick={exportAsJSON} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left"><Download className="w-4 h-4 text-blue-400" /><span className="text-sm">Export JSON</span></button>
              <button onClick={exportAsMarkdown} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left"><FileText className="w-4 h-4 text-purple-400" /><span className="text-sm">Export Markdown</span></button>
              <div className="border-t border-white/10 my-2" />
              <button onClick={() => { setShowMenu(false); setShowSettings(true); }} className="flex items-center gap-3 w-full px-3 py-2 rounded-lg hover:bg-white/10 text-left"><Settings className="w-4 h-4 text-cyan-400" /><span className="text-sm">Settings</span></button>
            </div>
          </>
        )}

        {/* Hidden file inputs */}
        <input ref={fileInputImageRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleFileSelect(e, 'image')} />
        <input ref={fileInputVideoRef} type="file" accept="video/*" className="hidden" onChange={(e) => handleFileSelect(e, 'video')} />
        <input ref={fileInputAudioRef} type="file" accept="audio/*" className="hidden" onChange={(e) => handleFileSelect(e, 'audio')} />
        <input ref={fileInputDocRef} type="file" accept=".txt,.md,.csv,.json,.html,.xml,.js,.ts,.py,.css" className="hidden" onChange={(e) => handleFileSelect(e, 'text')} />

        {/* Attachment preview */}
        {attachedFile && (
          <div className="mb-2 flex items-center gap-2 p-2 rounded-xl bg-white/5 border border-white/10">
            {attachedFile.type === 'image' && attachedFile.preview && (
              <img src={attachedFile.preview} alt={attachedFile.name} className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
            )}
            {attachedFile.type !== 'image' && (
              <div className="w-10 h-10 rounded-lg bg-cyan-400/10 flex items-center justify-center flex-shrink-0">
                {attachedFile.type === 'video' ? <Video className="w-5 h-5 text-cyan-400" /> :
                 attachedFile.type === 'audio' ? <Music className="w-5 h-5 text-cyan-400" /> :
                 <FileText className="w-5 h-5 text-cyan-400" />}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">{attachedFile.name}</p>
              <p className="text-xs text-gray-400 capitalize">{attachedFile.type} attached</p>
            </div>
            <button onClick={() => setAttachedFile(null)} className="p-1.5 rounded-lg hover:bg-white/10 text-gray-400 flex-shrink-0">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="glass-card rounded-xl p-2 flex items-center gap-2">
          <button onClick={() => setShowMenu(!showMenu)} className="p-2 rounded-lg hover:bg-white/10"><Plus className="w-5 h-5" /></button>
          <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()} placeholder={attachedFile ? `Ask about ${attachedFile.name}…` : 'Type a message…'} className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-gray-400" />
          <button onClick={handleSend} disabled={(!input.trim() && !attachedFile) || isLoading} className="p-2 rounded-lg gradient-bg text-white disabled:opacity-50 disabled:cursor-not-allowed"><Send className="w-5 h-5" /></button>
        </div>
      </div>
    </div>
  );
}
