"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";
import { Search, Image as ImageIcon, Video as VideoIcon, Download, Loader2, ArrowLeft, ExternalLink, Info, AlertTriangle, Activity, Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { API_BASE } from '@/lib/api';

const MediaDownloader = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [type, setType] = useState<'image' | 'video'>('image');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [downloadingUrl, setDownloadingUrl] = useState<string | null>(null);
  const [showFfmpegDialog, setShowFfmpegDialog] = useState(false);

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    setResults([]);
    try {
      const res = await fetch(`${API_BASE}/api/media/search?q=${encodeURIComponent(query)}&type=${type}`);
      if (!res.ok) {
        const text = await res.text();
        try { const json = JSON.parse(text); throw new Error(json.error || 'Server error'); }
        catch { throw new Error(`Server returned an error (${res.status}).`); }
      }
      const data = await res.json();
      if (data.success) setResults(data.results || []);
      else throw new Error(data.error);
    } catch (error: any) {
      showError('Search failed: ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = async (item: any, isYouTube: boolean) => {
    const url = type === 'image' ? item.image : (item.content || item.url);
    if (!url) return showError('Could not find source URL for this media');
    setDownloadingUrl(url);
    const toastId = showLoading(isYouTube ? 'Downloading from YouTube...' : 'Saving media...');
    try {
      const safeTitle = (item.title || query).replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
      let ext = url.split('.').pop()?.split('?')[0] || (type === 'image' ? 'jpg' : 'mp4');
      if (ext.length > 4) ext = type === 'image' ? 'jpg' : 'mp4';
      if (isYouTube) ext = 'mp4';
      const filename = `${safeTitle}_${Date.now()}.${ext}`;
      const endpoint = isYouTube ? `${API_BASE}/api/media/download-youtube` : `${API_BASE}/api/media/download`;
      const res = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url, filename }) });
      if (!res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          if (json.error === 'FFMPEG_MISSING') { dismissToast(toastId as unknown as string); setDownloadingUrl(null); setShowFfmpegDialog(true); return; }
          throw new Error(json.error || 'Server error');
        } catch (e: any) { if (e.message) throw e; throw new Error(`Server error (${res.status})`); }
      }
      const data = await res.json();
      if (data.success) { navigator.clipboard.writeText(`/${data.filename}`); showSuccess(`Saved as /${data.filename} and copied to clipboard!`); }
      else {
        if (data.error === 'FFMPEG_MISSING') { dismissToast(toastId as unknown as string); setDownloadingUrl(null); setShowFfmpegDialog(true); return; }
        throw new Error(data.error);
      }
    } catch (error: any) {
      showError('Failed to download: ' + error.message);
    } finally {
      if (!showFfmpegDialog) { dismissToast(toastId as unknown as string); setDownloadingUrl(null); }
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9f8] font-sans">
      {/* Header */}
      <div className="bg-white border-b border-[#e8e8e6] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Download className="h-4 w-4 text-[#555]" />
          <span className="text-sm font-medium text-[#111]">Media Downloader</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/library')} className="h-8 text-xs border-[#e8e8e6] bg-white text-[#555] hover:bg-[#f3f3f1] hover:text-[#111] rounded-lg">
            <Film className="mr-1.5 h-3 w-3" /> Library
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/dashboard')} className="h-8 text-xs border-[#e8e8e6] bg-white text-[#555] hover:bg-[#f3f3f1] hover:text-[#111] rounded-lg">
            <Activity className="mr-1.5 h-3 w-3" /> Dashboard
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="h-8 text-xs border-[#e8e8e6] bg-white text-[#555] hover:bg-[#f3f3f1] hover:text-[#111] rounded-lg">
            <ArrowLeft className="mr-1.5 h-3 w-3" /> Back to Editor
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 md:p-10 space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-[#111] tracking-tight">Find Media</h1>
          <p className="text-sm text-[#888] mt-1">Search and save media directly to your public folder.</p>
        </div>

        {/* Search bar */}
        <div className="bg-white border border-[#e8e8e6] rounded-xl p-5">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
            <Tabs value={type} onValueChange={(v) => { setType(v as any); setResults([]); }}>
              <TabsList className="h-9 bg-[#f4f4f2] p-1 rounded-lg border border-[#e8e8e6]">
                <TabsTrigger value="image" className="h-7 text-xs rounded-md data-[state=active]:bg-white data-[state=active]:text-[#111] data-[state=active]:shadow-sm text-[#666]">
                  <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> Images
                </TabsTrigger>
                <TabsTrigger value="video" className="h-7 text-xs rounded-md data-[state=active]:bg-white data-[state=active]:text-[#111] data-[state=active]:shadow-sm text-[#666]">
                  <VideoIcon className="mr-1.5 h-3.5 w-3.5" /> Videos
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <form onSubmit={handleSearch} className="flex-grow flex gap-2 w-full">
              <Input
                placeholder={type === 'video' ? 'Search videos...' : 'Search images...'}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-9 bg-white border-[#e8e8e6] text-[#111] text-sm focus:border-[#111] focus:ring-0 rounded-lg"
              />
              <Button type="submit" disabled={isSearching} className="h-9 px-4 bg-[#111] hover:bg-[#333] text-white rounded-lg border-none shrink-0">
                {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              </Button>
            </form>
          </div>

          {type === 'video' && (
            <div className="mt-4 flex items-start gap-2.5 p-3 bg-[#f9f9f8] border border-[#e8e8e6] rounded-lg text-xs text-[#666]">
              <Info className="h-3.5 w-3.5 shrink-0 text-[#888] mt-0.5" />
              <p>YouTube videos are downloaded in the highest quality. Make sure <code className="font-mono bg-[#f0f0ee] px-1 py-0.5 rounded text-[10px]">ffmpeg</code> is installed on your server for best results.</p>
            </div>
          )}
        </div>

        {/* Results */}
        <div>
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-20 text-[#999]">
              <Loader2 className="h-8 w-8 animate-spin mb-3 text-[#ccc]" />
              <p className="text-sm">Searching DuckDuckGo...</p>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-20 border border-dashed border-[#e0e0de] rounded-xl bg-white text-[#bbb]">
              <Search className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm text-[#888]">No results yet. Enter a query to find media.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {results.map((item, index) => {
                const thumb = type === 'image'
                  ? (item.thumbnail || item.image)
                  : (item.images?.medium || item.images?.large || item.images?.small || item.thumbnail || item.image);
                const sourceUrl = type === 'image' ? item.image : (item.content || item.url);
                const isCurrentDownloading = downloadingUrl === sourceUrl;
                const isYouTube = type === 'video' && sourceUrl && (sourceUrl.includes('youtube.com') || sourceUrl.includes('youtu.be'));
                if (!thumb) return null;

                return (
                  <div key={index} className="bg-white border border-[#e8e8e6] rounded-xl overflow-hidden group hover:border-[#d0d0ce] transition-all flex flex-col">
                    <div className="relative aspect-video bg-[#f4f4f2] overflow-hidden">
                      <img
                        src={thumb}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png'; }}
                      />
                      {type === 'video' && (
                        <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                          <VideoIcon className="h-6 w-6 text-white opacity-70" />
                          {item.duration && (
                            <div className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                              {item.duration}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="p-3 flex flex-col gap-2.5 flex-grow">
                      <div>
                        <p className="text-xs font-medium text-[#111] line-clamp-2" title={item.title}>{item.title}</p>
                        {isYouTube && <p className="text-[10px] text-blue-600 font-medium mt-0.5">YouTube source</p>}
                      </div>
                      <div className="flex items-center gap-1.5 mt-auto">
                        <Button
                          onClick={() => handleDownload(item, isYouTube)}
                          disabled={isCurrentDownloading}
                          className="flex-1 h-8 text-xs bg-[#111] hover:bg-[#333] text-white rounded-lg border-none"
                        >
                          {isCurrentDownloading ? <><Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> Saving...</> : <><Download className="mr-1.5 h-3 w-3" /> {isYouTube ? 'Download HQ' : 'Save'}</>}
                        </Button>
                        <a href={sourceUrl || item.url} target="_blank" rel="noreferrer" className="shrink-0">
                          <Button variant="outline" size="sm" className="h-8 w-8 p-0 border-[#e8e8e6] bg-white text-[#888] hover:bg-[#f3f3f1] hover:text-[#555] rounded-lg">
                            <ExternalLink className="h-3 w-3" />
                          </Button>
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={showFfmpegDialog} onOpenChange={setShowFfmpegDialog}>
        <DialogContent className="sm:max-w-md bg-white border-[#e8e8e6] rounded-2xl shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#111]">
              <AlertTriangle className="h-4 w-4 text-amber-500" /> FFmpeg Required
            </DialogTitle>
            <DialogDescription className="text-[#666] pt-2 space-y-3 text-sm">
              <p>To download YouTube videos in the highest quality, FFmpeg is required to merge video and audio streams. It was not found on your system.</p>
              <div className="bg-[#f9f9f8] border border-[#e8e8e6] rounded-lg p-3 text-xs space-y-1.5">
                <p className="font-medium text-[#111]">How to fix:</p>
                <ol className="list-decimal pl-4 space-y-1 text-[#666]">
                  <li>Download the FFmpeg executable for your OS.</li>
                  <li>Drop <code className="font-mono bg-[#f0f0ee] px-1 rounded">ffmpeg.exe</code> into the <code className="font-mono bg-[#f0f0ee] px-1 rounded">bin/</code> folder of this app.</li>
                </ol>
              </div>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowFfmpegDialog(false)} className="h-9 bg-[#111] hover:bg-[#333] text-white rounded-lg border-none text-xs">
              I understand
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MediaDownloader;
