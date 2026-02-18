'use client';

import { useState, useEffect, useRef } from 'react';
import { Cloud, X, Loader2, Image as ImageIcon, Search, FolderOpen, Link2 } from 'lucide-react';

type ImageSource = 'cloudinary' | 'google' | 'manual';

interface ImagePickerProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  folder?: string;
}

export function ImagePicker({ value, onChange, label = 'Image', folder = 'uploads' }: ImagePickerProps) {
  const [source, setSource] = useState<ImageSource>('cloudinary');
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [images, setImages] = useState<{ public_id: string; secure_url: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [googleResults, setGoogleResults] = useState<{ link: string; image?: { thumbnailLink: string }; title: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const googleApiKey = process.env.NEXT_PUBLIC_GOOGLE_API_KEY;
  const googleSearchEngineId = process.env.NEXT_PUBLIC_GOOGLE_SEARCH_ENGINE_ID;
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET || 'ml_default';

  const fetchCloudinaryImages = async () => {
    if (!cloudName) return;
    setIsLoading(true);
    try {
      const response = await fetch(`https://res.cloudinary.com/${cloudName}/image/list/${folder}.json`);
      if (response.ok) {
        const data = await response.json();
        setImages(data.resources || []);
      } else {
        setImages([]);
      }
    } catch {
      setImages([]);
    } finally {
      setIsLoading(false);
    }
  };

  const searchGoogleImages = async () => {
    if (!searchQuery.trim() || !googleApiKey || !googleSearchEngineId) return;
    setIsSearching(true);
    try {
      const response = await fetch(
        `https://www.googleapis.com/customsearch/v1?key=${googleApiKey}&cx=${googleSearchEngineId}&q=${encodeURIComponent(searchQuery)}&searchType=image&num=10`
      );
      const data = await response.json();
      setGoogleResults(data.items || []);
    } catch {
      setGoogleResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  useEffect(() => {
    if (isOpen && source === 'cloudinary') {
      fetchCloudinaryImages();
    }
  }, [isOpen, source]);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !cloudName) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('upload_preset', uploadPreset);
      formData.append('folder', folder);
      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, { method: 'POST', body: formData });
      const data = await response.json();
      if (data.secure_url) {
        onChange(data.secure_url);
        setIsOpen(false);
      } else {
        throw new Error(data.error?.message || 'Upload failed');
      }
    } catch (error) {
      alert(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSelect = (url: string) => { onChange(url); setIsOpen(false); };

  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-400">{label}</label>
      <div className="flex gap-2">
        <input
          type="url"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://..."
          className="flex-1 px-3 py-2.5 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-accent-green focus:outline-none"
        />
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as ImageSource)}
          className="px-2 py-2 rounded-lg bg-white/10 border border-white/10 text-sm"
        >
          <option value="cloudinary">Cloudinary</option>
          <option value="google">Google</option>
          <option value="manual">URL</option>
        </select>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/20 transition-colors"
        >
          {source === 'cloudinary' && <Cloud className="w-4 h-4 text-blue-400" />}
          {source === 'google' && <Search className="w-4 h-4 text-red-400" />}
          {source === 'manual' && <Link2 className="w-4 h-4 text-gray-400" />}
        </button>
      </div>

      {value && (
        <div className="relative w-32 h-20 rounded-lg overflow-hidden bg-white/5">
          <img src={value} alt="Preview" className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
          <button type="button" onClick={() => onChange('')} className="absolute top-1 right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
            <X className="w-3 h-3 text-white" />
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-4xl max-h-[80vh] glass-card rounded-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h3 className="font-semibold">{source === 'cloudinary' ? 'Cloudinary Media' : source === 'google' ? 'Google Images' : 'Manual URL'}</h3>
              <button onClick={() => setIsOpen(false)} className="p-2 rounded-lg hover:bg-white/10"><X className="w-5 h-5" /></button>
            </div>

            {source === 'cloudinary' && (
              <>
                <div className="p-4 border-b border-white/10">
                  <input ref={fileInputRef} type="file" accept="image/*" onChange={handleUpload} className="hidden" />
                  <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full py-4 rounded-xl border-2 border-dashed border-white/20 hover:border-blue-400/50 transition-colors flex flex-col items-center gap-2 disabled:opacity-50">
                    {isUploading ? <><Loader2 className="w-6 h-6 animate-spin" /><span className="text-sm">Uploading...</span></> : <><ImageIcon className="w-6 h-6 text-gray-400" /><span className="text-sm text-gray-400">Click to upload</span></>}
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {isLoading ? (
                    <div className="flex items-center justify-center h-40"><Loader2 className="w-6 h-6 animate-spin" /></div>
                  ) : images.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400"><ImageIcon className="w-8 h-8 mb-2 opacity-50" /><p className="text-sm">No images yet</p></div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {images.map((image, i) => (
                        <button key={image.public_id || i} onClick={() => handleSelect(image.secure_url)} className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-accent-green transition-colors">
                          <img src={image.secure_url} alt={image.public_id} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {source === 'google' && (
              <>
                <div className="p-4 border-b border-white/10">
                  <div className="flex gap-2">
                    <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && searchGoogleImages()} placeholder="Search images..." className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-sm focus:border-red-400 focus:outline-none" />
                    <button onClick={searchGoogleImages} disabled={isSearching} className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 disabled:opacity-50">
                      {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4">
                  {googleResults.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-gray-400"><Search className="w-8 h-8 mb-2 opacity-50" /><p className="text-sm">Search for images above</p></div>
                  ) : (
                    <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                      {googleResults.map((item, i) => (
                        <button key={i} onClick={() => handleSelect(item.link)} className="aspect-square rounded-lg overflow-hidden border border-white/10 hover:border-accent-green transition-colors">
                          <img src={item.image?.thumbnailLink || item.link} alt={item.title} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

            {source === 'manual' && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
                <Link2 className="w-16 h-16 text-gray-400 mb-4" />
                <p className="text-sm text-gray-400 mb-4">Paste any image URL directly in the input field above</p>
                <button onClick={() => setIsOpen(false)} className="px-6 py-3 rounded-lg bg-white/10 hover:bg-white/20 transition-colors">Close</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
