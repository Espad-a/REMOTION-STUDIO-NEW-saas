"use client";

import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Search, Image as ImageIcon, Video as VideoIcon, Download, Loader2, ArrowLeft, ExternalLink, Info, AlertTriangle, Activity, Film } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';

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
      const res = await fetch(`http://localhost:3001/api/media/search?q=${encodeURIComponent(query)}&type=${type}`);
      
      if (!res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          throw new Error(json.error || 'Server error');
        } catch {
          throw new Error(`Server returned an error (${res.status}). Ensure the backend server is running.`);
        }
      }

      const data = await res.json();
      
      if (data.success) {
        setResults(data.results || []);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      showError('Search failed: ' + error.message);
    } finally {
      setIsSearching(false);
    }
  };

  const handleDownload = async (item: any, isYouTube: boolean) => {
    const url = type === 'image' ? item.image : (item.content || item.url);
    if (!url) {
      return showError('Could not find source URL for this media');
    }

    setDownloadingUrl(url);
    const toastId = showLoading(isYouTube ? 'Downloading from YouTube (this might take a minute)...' : 'Saving media...');

    try {
      const safeTitle = (item.title || query).replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 30);
      let ext = url.split('.').pop()?.split('?')[0] || (type === 'image' ? 'jpg' : 'mp4');
      
      if (ext.length > 4) ext = type === 'image' ? 'jpg' : 'mp4';
      if (isYouTube) ext = 'mp4'; // YouTube downloads will be forced to mp4
      
      const filename = `${safeTitle}_${Date.now()}.${ext}`;
      const endpoint = isYouTube ? 'http://localhost:3001/api/media/download-youtube' : 'http://localhost:3001/api/media/download';

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, filename })
      });

      if (!res.ok) {
        const text = await res.text();
        try {
          const json = JSON.parse(text);
          
          if (json.error === 'FFMPEG_MISSING') {
            dismissToast(toastId as unknown as string);
            setDownloadingUrl(null);
            setShowFfmpegDialog(true);
            return;
          }

          throw new Error(json.error || 'Server error');
        } catch (e: any) {
          if (e.message) throw e;
          throw new Error(`Server error (${res.status}): It might have crashed. Check server console.`);
        }
      }

      const data = await res.json();

      if (data.success) {
        navigator.clipboard.writeText(`/${data.filename}`);
        showSuccess(`Saved as /${data.filename} and copied to clipboard!`);
      } else {
        if (data.error === 'FFMPEG_MISSING') {
          dismissToast(toastId as unknown as string);
          setDownloadingUrl(null);
          setShowFfmpegDialog(true);
          return;
        }
        throw new Error(data.error);
      }
    } catch (error: any) {
      showError('Failed to download: ' + error.message);
    } finally {
      if (!showFfmpegDialog) {
        dismissToast(toastId as unknown as string);
        setDownloadingUrl(null);
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-2">
              <Download className="text-indigo-600 h-8 w-8" /> Media Downloader
            </h1>
            <p className="text-slate-500">Search and save media directly to your public folder.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/library')} className="rounded-xl border-slate-200 bg-white">
              <Film className="mr-2 h-4 w-4" /> Library
            </Button>
            <Button variant="outline" onClick={() => navigate('/dashboard')} className="rounded-xl border-slate-200 bg-white">
              <Activity className="mr-2 h-4 w-4" /> Dashboard
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="rounded-xl border-slate-200 bg-white">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Editor
            </Button>
          </div>
        </header>

        <Card className="p-6 border-none shadow-sm rounded-2xl bg-white">
          <Tabs value={type} onValueChange={(v) => { setType(v as any); setResults([]); }} className="w-full">
            <div className="flex flex-col md:flex-row gap-4 items-center mb-6">
              <TabsList className="grid grid-cols-2 w-full md:w-64 bg-slate-100 p-1 rounded-xl">
                <TabsTrigger value="image" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <ImageIcon className="mr-2 h-4 w-4" /> Images
                </TabsTrigger>
                <TabsTrigger value="video" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">
                  <VideoIcon className="mr-2 h-4 w-4" /> Videos
                </TabsTrigger>
              </TabsList>

              <form onSubmit={handleSearch} className="flex-grow flex gap-2 w-full">
                <Input 
                  placeholder={type === 'video' ? `Search videos...` : `Search images...`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="rounded-xl h-12 bg-slate-50 border-slate-200"
                />
                <Button type="submit" disabled={isSearching} className="rounded-xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700 text-white">
                  {isSearching ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                </Button>
              </form>
            </div>

            {type === 'video' && (
              <div className="mb-6 p-4 bg-indigo-50 text-indigo-800 rounded-xl border border-indigo-200 text-sm flex items-start gap-3">
                <Info className="h-5 w-5 flex-shrink-0 text-indigo-500 mt-0.5" />
                <p>
                  <strong>High Quality YouTube Downloads:</strong> Videos are downloaded in the highest quality. If you want the best resolution, make sure you have `ffmpeg` installed on your machine.
                </p>
              </div>
            )}

            <div className="mt-4">
              {isSearching ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Loader2 className="h-12 w-12 animate-spin mb-4 text-indigo-300" />
                  <p>Searching DuckDuckGo...</p>
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50">
                  <Search className="h-12 w-12 mx-auto mb-4 text-slate-300" />
                  <p>No results yet. Enter a query to find media.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                  {results.map((item, index) => {
                    const thumb = type === 'image' 
                      ? (item.thumbnail || item.image) 
                      : (item.images?.medium || item.images?.large || item.images?.small || item.thumbnail || item.image);
                    
                    const sourceUrl = type === 'image' ? item.image : (item.content || item.url);
                    const isCurrentDownloading = downloadingUrl === sourceUrl;
                    const isYouTube = type === 'video' && sourceUrl && (sourceUrl.includes('youtube.com') || sourceUrl.includes('youtu.be'));
                    
                    if (!thumb) return null;

                    return (
                      <Card key={index} className="overflow-hidden group border-none shadow-sm hover:shadow-md transition-all rounded-2xl bg-slate-50 flex flex-col">
                        <div className="relative aspect-video bg-slate-200 overflow-hidden">
                          <img 
                            src={thumb} 
                            alt={item.title} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                            onError={(e) => { (e.target as HTMLImageElement).src = '/placeholder.png' }}
                          />
                          {type === 'video' && (
                            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                              <VideoIcon className="h-8 w-8 text-white opacity-70" />
                              {item.duration && (
                                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-2 py-1 rounded">
                                  {item.duration}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="p-4 space-y-3 flex-grow flex flex-col justify-between">
                          <div className="space-y-1">
                            <p className="text-xs font-medium text-slate-700 line-clamp-2" title={item.title}>
                              {item.title}
                            </p>
                            {isYouTube && (
                              <p className="text-[10px] text-indigo-600 font-bold">YouTube Source</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2 pt-2">
                            <Button 
                              onClick={() => handleDownload(item, isYouTube)} 
                              disabled={isCurrentDownloading}
                              variant={isYouTube ? "default" : "secondary"}
                              className={`w-full text-xs h-8 shadow-none ${isYouTube ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200'}`}
                            >
                              {isCurrentDownloading ? (
                                <><Loader2 className="mr-2 h-3 w-3 animate-spin" /> Saving...</>
                              ) : isYouTube ? (
                                <><Download className="mr-2 h-3 w-3" /> Download HQ Video</>
                              ) : (
                                <><Download className="mr-2 h-3 w-3" /> Save to App</>
                              )}
                            </Button>
                            <a href={sourceUrl || item.url} target="_blank" rel="noreferrer" className="flex-shrink-0">
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0" title="Visit Source">
                                <ExternalLink className="h-3 w-3" />
                              </Button>
                            </a>
                          </div>
                        </div>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </Tabs>
        </Card>

        <Dialog open={showFfmpegDialog} onOpenChange={setShowFfmpegDialog}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-5 w-5" /> FFmpeg Required
              </DialogTitle>
              <DialogDescription className="text-slate-600 pt-2 space-y-4">
                <p>
                  To download YouTube videos in the <strong>highest quality</strong>, the app needs to merge the best video stream and the best audio stream together.
                </p>
                <p>
                  This requires an external tool called <strong>FFmpeg</strong>, which was not found on your system.
                </p>
                <div className="bg-slate-100 p-3 rounded-xl border border-slate-200 text-sm">
                  <p className="font-bold mb-1">How to fix this:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>Download the FFmpeg executable for your OS.</li>
                    <li>Drop the <code className="bg-slate-200 px-1 py-0.5 rounded">ffmpeg.exe</code> file directly into the <code className="bg-slate-200 px-1 py-0.5 rounded">bin/</code> folder of this app (right next to yt-dlp).</li>
                  </ol>
                </div>
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="sm:justify-end">
              <Button onClick={() => setShowFfmpegDialog(false)} className="rounded-xl">
                I understand
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default MediaDownloader;