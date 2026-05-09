"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Film, Trash2, ArrowLeft, Download, PlayCircle, Loader2, Play, AlertTriangle, MoreVertical, Copy, RefreshCw, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/lib/supabase';

interface RenderEntry {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl?: string;
  createdAt: number;
  status?: 'completed' | 'failed';
}

const Library = () => {
  const navigate = useNavigate();
  const [renders, setRenders] = useState<RenderEntry[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Auto-delete state
  const [autoDeleteFailed, setAutoDeleteFailed] = useState(localStorage.getItem('remotion_auto_delete_failed') === 'true');
  
  // Preview State
  const [previewVideo, setPreviewVideo] = useState<RenderEntry | null>(null);

  const fetchRenders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      const { data, error } = await supabase
        .from('video_exports')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) throw error;
      
      let fetchedRenders = data || [];
        
      // Handle Auto-Delete in background if enabled
      const isAutoDelete = localStorage.getItem('remotion_auto_delete_failed') === 'true';
      if (isAutoDelete) {
        const failed = fetchedRenders.filter((r: any) => r.status === 'failed');
        if (failed.length > 0) {
          failed.forEach((r: any) => fetch(`http://localhost:3001/api/renders/${r.id}`, { 
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          }));
          fetchedRenders = fetchedRenders.filter((r: any) => r.status !== 'failed');
        }
      }
      
      // Batch presign S3 keys
      const keysToSign = new Set<string>();
      fetchedRenders.forEach(r => {
         if (r.video_url && r.video_url.includes('amazonaws.com')) keysToSign.add(r.video_url);
         if (r.thumbnail_url && r.thumbnail_url.includes('amazonaws.com')) keysToSign.add(r.thumbnail_url);
      });
      
      if (keysToSign.size > 0) {
        const res = await fetch('http://localhost:3001/api/renders/presign', {
           method: 'POST',
           headers: { 
             'Content-Type': 'application/json',
             'Authorization': `Bearer ${session.access_token}`
           },
           body: JSON.stringify({ keys: Array.from(keysToSign) })
        });
        const presignData = await res.json();
        if (presignData.success && presignData.urlMap) {
           fetchedRenders = fetchedRenders.map(r => ({
             ...r,
             video_url: presignData.urlMap[r.video_url] || r.video_url,
             thumbnail_url: presignData.urlMap[r.thumbnail_url] || r.thumbnail_url
           }));
        }
      }
      
      const mapped = fetchedRenders.map(r => ({
        id: r.id,
        title: r.title,
        videoUrl: r.video_url,
        thumbnailUrl: r.thumbnail_url,
        createdAt: Number(r.created_at),
        status: r.status
      }));
      
      setRenders(mapped);
    } catch (error: any) {
      showError("Failed to fetch render history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRenders();
  }, []);

  const handleAutoDeleteToggle = async (checked: boolean) => {
    setAutoDeleteFailed(checked);
    localStorage.setItem('remotion_auto_delete_failed', checked.toString());
    
    if (checked) {
      const failedRenders = renders.filter(r => r.status === 'failed');
      if (failedRenders.length > 0) {
        const toastId = showLoading("Cleaning up failed renders...");
        let deletedCount = 0;
        const { data: { session } } = await supabase.auth.getSession();
        
        for (const r of failedRenders) {
          try {
            await fetch(`http://localhost:3001/api/renders/${r.id}`, { 
              method: 'DELETE',
              headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
            });
            deletedCount++;
          } catch(e) {}
        }
        dismissToast(toastId as unknown as string);
        if (deletedCount > 0) {
          showSuccess(`Auto-cleaned ${deletedCount} failed renders.`);
          fetchRenders();
        }
      }
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); 
    if (!confirm("This will permanently delete the video and its entire folder from S3.")) return;
    
    const toastId = showLoading("Removing...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`http://localhost:3001/api/renders/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("Removed from history!");
        fetchRenders();
      } else {
        throw new Error("Failed to delete.");
      }
    } catch (e: any) {
      showError(e.message);
    } finally {
      dismissToast(toastId as unknown as string);
    }
  };

  const forceDownload = async (id: string, title: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    
    const toastId = showLoading("Generating secure download link...");
    try {
      const res = await fetch(`http://localhost:3001/api/renders/${id}/download-url?title=${encodeURIComponent(title)}`);
      const data = await res.json();
      
      if (!data.success) {
        throw new Error(data.error || "Failed to generate URL");
      }
      
      window.location.href = data.url;
      showSuccess("Download started!");
    } catch (error: any) {
      showError("Download failed: " + error.message);
    } finally {
      dismissToast(toastId as unknown as string);
    }
  };

  const handleConvertFormat = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const toastId = showLoading("Fetching original video configs...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`http://localhost:3001/api/renders/${id}/convert`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${session?.access_token || ''}` }
      });
      const data = await res.json();
      
      if (data.success) {
        showSuccess(data.message);
        setTimeout(() => navigate('/dashboard'), 1000);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      showError("Format conversion failed: " + error.message);
    } finally {
      dismissToast(toastId as unknown as string);
    }
  };

  const getAbsoluteUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `http://localhost:3001/${url}`;
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-[#cccccc] font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#ffffff] flex items-center gap-2">
              <Film className="text-[#2d8ceb] h-8 w-8" /> Export Library
            </h1>
            <div className="flex flex-col gap-2 mt-2">
              <p className="text-[#888888] text-sm leading-none">Watch and download all your previously exported videos.</p>
              <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md border border-amber-500/20 bg-amber-500/10 text-amber-400/90 text-[10px] font-bold uppercase tracking-wider w-fit mt-1">
                <Clock className="h-3 w-3" />
                Source media for format conversions expires after 14 days
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3 bg-[#232323] border border-[#444444] px-3 py-2 rounded-lg shadow-sm">
              <Label htmlFor="auto-delete" className="text-xs font-bold text-[#aaaaaa] uppercase tracking-wider cursor-pointer select-none">
                Auto-Delete Failed
              </Label>
              <Switch 
                id="auto-delete" 
                checked={autoDeleteFailed} 
                onCheckedChange={handleAutoDeleteToggle} 
                className="data-[state=checked]:bg-red-500 scale-75 origin-right" 
              />
            </div>
            <Button variant="outline" onClick={() => navigate('/')} className="bg-[#232323] border-[#444444] text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Editor
            </Button>
          </div>
        </header>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-[#888888]">
            <Loader2 className="h-10 w-10 animate-spin text-[#2d8ceb] mb-4" />
            <p>Loading your exports...</p>
          </div>
        ) : renders.length === 0 ? (
          <div className="text-center py-24 border-2 border-dashed border-[#444444] rounded-2xl bg-[#232323] text-[#888888]">
            <Film className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>You haven't exported any videos yet.</p>
            <Button onClick={() => navigate('/')} className="mt-4 bg-[#2d8ceb] hover:bg-[#2576c7] text-white">
              Create a Video
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {renders.map((render) => {
              const isFailed = render.status === 'failed';
              
              // Calculate days left for assets
              const msInDay = 1000 * 60 * 60 * 24;
              const daysOld = (Date.now() - render.createdAt) / msInDay;
              const daysLeft = Math.ceil(14 - daysOld);
              const isExpired = daysLeft <= 0;
              
              return (
                <Card 
                  key={render.id} 
                  className={`overflow-hidden group border-[#444444] shadow-lg transition-all rounded-2xl bg-[#232323] flex flex-col ${isFailed ? 'border-red-500/30' : 'hover:shadow-xl hover:border-[#555555] cursor-pointer'}`}
                  onClick={() => !isFailed && setPreviewVideo(render)}
                >
                  <div className="relative aspect-video bg-black overflow-hidden flex items-center justify-center border-b border-[#333333]">
                    {isFailed ? (
                      <div className="flex flex-col items-center justify-center h-full text-red-500/60 p-4 text-center w-full bg-red-950/20">
                        <AlertTriangle className="h-8 w-8 mb-2" />
                        <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Incomplete Render</span>
                      </div>
                    ) : render.thumbnailUrl ? (
                      <img 
                        src={getAbsoluteUrl(render.thumbnailUrl)} 
                        alt={render.title} 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90 group-hover:opacity-100"
                      />
                    ) : (
                      <Film className="h-10 w-10 text-[#444444]" />
                    )}
                    
                    {!isFailed && (
                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <div className="bg-[#2d8ceb] p-3 rounded-full text-white transform scale-90 group-hover:scale-100 transition-all">
                          <Play className="h-6 w-6 ml-1" />
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="p-4 flex flex-col justify-between flex-grow space-y-3">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className={`text-sm font-bold line-clamp-2 ${isFailed ? 'text-red-400' : 'text-[#eeeeee]'}`} title={render.title}>
                          {render.title}
                        </h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0 text-[#888888] hover:text-[#ffffff] hover:bg-[#333333]" onClick={e => e.stopPropagation()}>
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-[#232323] border-[#444444] text-[#eeeeee] w-48 shadow-xl">
                            {!isFailed && !isExpired && (
                              <DropdownMenuItem 
                                onClick={(e) => handleConvertFormat(render.id, e)}
                                className="text-xs cursor-pointer focus:bg-[#333333] focus:text-[#ffffff] text-amber-400 focus:text-amber-300"
                              >
                                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Convert Format
                              </DropdownMenuItem>
                            )}
                            <div className="px-3 py-2 flex flex-col space-y-1 mt-1">
                              <span className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">S3 Export ID</span>
                              <span className="text-[11px] font-mono text-[#cccccc] break-all">{render.id}</span>
                            </div>
                            <DropdownMenuSeparator className="bg-[#444444]" />
                            <DropdownMenuItem 
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(render.id); showSuccess("Export ID Copied!"); }}
                              className="text-xs cursor-pointer focus:bg-[#333333] focus:text-[#ffffff]"
                            >
                              <Copy className="mr-2 h-3.5 w-3.5 text-[#aaaaaa]" /> Copy S3 ID
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex flex-col items-start gap-1 mt-1.5">
                        <p className="text-[10px] text-[#888888]">
                          {new Date(render.createdAt).toLocaleString()}
                        </p>
                        {!isFailed && (
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${isExpired ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                            {isExpired ? 'Assets Expired' : `Assets: ${daysLeft}d left`}
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 pt-2 border-t border-[#333333]">
                      {!isFailed && (
                        <div className="flex-grow">
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="w-full h-8 text-xs bg-[#1e1e1e] border-[#444444] text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]"
                            onClick={(e) => forceDownload(render.id, render.title, e)}
                          >
                            <Download className="mr-1.5 h-3 w-3" /> Download
                          </Button>
                        </div>
                      )}
                      {isFailed && <div className="flex-grow text-[10px] text-red-400/80 italic pl-1">Folder left in S3</div>}
                      
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={(e) => handleDelete(render.id, e)} 
                        className="h-8 w-8 p-0 bg-[#1e1e1e] border-[#444444] text-[#888888] hover:text-red-400 hover:bg-red-500/20 flex-shrink-0 transition-colors"
                        title="Delete entire folder from AWS S3"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        {/* Video Preview Dialog */}
        <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
          <DialogContent className="bg-[#232323] border-[#444444] text-[#eeeeee] rounded-xl max-w-4xl w-full p-0 overflow-hidden">
            <div className="bg-[#1e1e1e] px-4 py-3 border-b border-[#444444] flex items-center justify-between">
              <h2 className="text-[#ffffff] font-bold flex items-center gap-2 truncate pr-4">
                <PlayCircle className="h-5 w-5 text-[#2d8ceb] shrink-0" /> 
                {previewVideo?.title}
              </h2>
            </div>
            
            {previewVideo && (
              <div className="flex flex-col bg-black">
                <div className="aspect-video relative w-full flex items-center justify-center">
                  <video 
                    src={getAbsoluteUrl(previewVideo.videoUrl)} 
                    poster={previewVideo.thumbnailUrl ? getAbsoluteUrl(previewVideo.thumbnailUrl) : undefined}
                    controls 
                    autoPlay
                    className="w-full h-full object-contain"
                  />
                </div>
                
                <div className="bg-[#232323] p-4 flex justify-end gap-3 border-t border-[#444444]">
                  <Button variant="outline" onClick={() => setPreviewVideo(null)} className="bg-[#333333] border-[#444444] text-[#cccccc] hover:text-[#ffffff] hover:bg-[#444444]">
                    Close Player
                  </Button>
                  <Button 
                    className="bg-[#2d8ceb] hover:bg-[#1a73cc] text-white shadow-lg"
                    onClick={(e) => forceDownload(previewVideo.id, previewVideo.title, e)}
                  >
                    <Download className="h-4 w-4 mr-2" /> Download MP4
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Library;