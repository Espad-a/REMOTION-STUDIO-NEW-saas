"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Film, Trash2, ArrowLeft, Download, PlayCircle, Loader2, Play, AlertTriangle, MoreVertical, Copy, RefreshCw, Clock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/api';

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
  const [autoDeleteFailed, setAutoDeleteFailed] = useState(localStorage.getItem('remotion_auto_delete_failed') === 'true');
  const [previewVideo, setPreviewVideo] = useState<RenderEntry | null>(null);

  const fetchRenders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { data, error } = await supabase.from('video_exports').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      let fetchedRenders = data || [];
      const isAutoDelete = localStorage.getItem('remotion_auto_delete_failed') === 'true';
      if (isAutoDelete) {
        const failed = fetchedRenders.filter((r: any) => r.status === 'failed');
        if (failed.length > 0) {
          failed.forEach((r: any) => fetch(`${API_BASE}/api/renders/${r.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session.access_token}` } }));
          fetchedRenders = fetchedRenders.filter((r: any) => r.status !== 'failed');
        }
      }
      const keysToSign = new Set<string>();
      fetchedRenders.forEach(r => {
        if (r.video_url && r.video_url.includes('amazonaws.com')) keysToSign.add(r.video_url);
        if (r.thumbnail_url && r.thumbnail_url.includes('amazonaws.com')) keysToSign.add(r.thumbnail_url);
      });
      if (keysToSign.size > 0) {
        const res = await fetch(`${API_BASE}/api/renders/presign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session.access_token}` },
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
      const mapped = fetchedRenders.map(r => ({ id: r.id, title: r.title, videoUrl: r.video_url, thumbnailUrl: r.thumbnail_url, createdAt: Number(r.created_at), status: r.status }));
      setRenders(mapped);
    } catch (error: any) {
      showError("Failed to fetch render history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRenders(); }, []);

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
            await fetch(`${API_BASE}/api/renders/${r.id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session?.access_token || ''}` } });
            deletedCount++;
          } catch (e) {}
        }
        dismissToast(toastId as unknown as string);
        if (deletedCount > 0) { showSuccess(`Auto-cleaned ${deletedCount} failed renders.`); fetchRenders(); }
      }
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("This will permanently delete the video and its entire folder from S3.")) return;
    const toastId = showLoading("Removing...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/api/renders/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${session?.access_token || ''}` } });
      const data = await res.json();
      if (data.success) { showSuccess("Removed from history!"); fetchRenders(); }
      else throw new Error("Failed to delete.");
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
      const res = await fetch(`${API_BASE}/api/renders/${id}/download-url?title=${encodeURIComponent(title)}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to generate URL");
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
      const res = await fetch(`${API_BASE}/api/renders/${id}/convert`, { method: 'POST', headers: { 'Authorization': `Bearer ${session?.access_token || ''}` } });
      const data = await res.json();
      if (data.success) { showSuccess(data.message); setTimeout(() => navigate('/dashboard'), 1000); }
      else throw new Error(data.error);
    } catch (error: any) {
      showError("Format conversion failed: " + error.message);
    } finally {
      dismissToast(toastId as unknown as string);
    }
  };

  const getAbsoluteUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${API_BASE}/${url}`;
  };

  return (
    <div className="min-h-screen bg-[#f9f9f8] font-sans">
      {/* Header */}
      <div className="bg-white border-b border-[#e8e8e6] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Film className="h-4 w-4 text-[#555]" />
          <span className="text-sm font-medium text-[#111]">Export Library</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-[#f4f4f2] border border-[#e8e8e6] rounded-lg">
            <Label htmlFor="auto-delete" className="text-[11px] font-medium text-[#666] cursor-pointer select-none">Auto-delete failed</Label>
            <Switch id="auto-delete" checked={autoDeleteFailed} onCheckedChange={handleAutoDeleteToggle} className="data-[state=checked]:bg-red-500 scale-75 origin-right" />
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="h-8 text-xs border-[#e8e8e6] bg-white text-[#555] hover:bg-[#f3f3f1] hover:text-[#111] rounded-lg">
            <ArrowLeft className="mr-1.5 h-3 w-3" /> Back to Editor
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6 md:p-10 space-y-6">
        <div>
          <h1 className="text-2xl font-medium text-[#111] tracking-tight">Your exports</h1>
          <div className="flex items-center gap-1.5 mt-2">
            <Clock className="h-3 w-3 text-[#aaa]" />
            <p className="text-[11px] text-[#999]">Source media for format conversions expires after 14 days.</p>
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 text-[#999]">
            <Loader2 className="h-8 w-8 animate-spin text-[#ccc] mb-3" />
            <p className="text-sm">Loading your exports...</p>
          </div>
        ) : renders.length === 0 ? (
          <div className="text-center py-24 border border-dashed border-[#e0e0de] rounded-2xl bg-white text-[#bbb]">
            <Film className="h-10 w-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm text-[#888] mb-4">You haven't exported any videos yet.</p>
            <Button onClick={() => navigate('/')} className="h-9 px-5 bg-[#111] hover:bg-[#333] text-white text-xs rounded-lg border-none">
              Create a video
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {renders.map((render) => {
              const isFailed = render.status === 'failed';
              const msInDay = 1000 * 60 * 60 * 24;
              const daysOld = (Date.now() - render.createdAt) / msInDay;
              const daysLeft = Math.ceil(14 - daysOld);
              const isExpired = daysLeft <= 0;

              return (
                <div
                  key={render.id}
                  className={`bg-white border rounded-xl overflow-hidden flex flex-col transition-all ${isFailed ? 'border-red-200' : 'border-[#e8e8e6] hover:border-[#d0d0ce] cursor-pointer hover:shadow-sm'}`}
                  onClick={() => !isFailed && setPreviewVideo(render)}
                >
                  {/* Thumbnail */}
                  <div className="relative aspect-video bg-[#f4f4f2] overflow-hidden flex items-center justify-center">
                    {isFailed ? (
                      <div className="flex flex-col items-center justify-center h-full text-red-400 p-4 text-center w-full bg-red-50">
                        <AlertTriangle className="h-6 w-6 mb-1.5" />
                        <span className="text-[10px] font-medium uppercase tracking-wider">Incomplete render</span>
                      </div>
                    ) : render.thumbnailUrl ? (
                      <>
                        <img src={getAbsoluteUrl(render.thumbnailUrl)} alt="Blur" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm scale-110" />
                        <img src={getAbsoluteUrl(render.thumbnailUrl)} alt={render.title} className="relative z-10 w-full h-full object-contain group-hover:scale-105 transition-transform duration-500" />
                      </>
                    ) : (
                      <Film className="h-8 w-8 text-[#ccc]" />
                    )}
                    {!isFailed && (
                      <div className="absolute inset-0 bg-black/30 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center z-20">
                        <div className="bg-white/90 p-2.5 rounded-full">
                          <Play className="h-5 w-5 text-[#111] ml-0.5" />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-3.5 flex flex-col flex-grow gap-2.5">
                    <div>
                      <div className="flex justify-between items-start gap-2">
                        <h3 className={`text-sm font-medium line-clamp-2 ${isFailed ? 'text-red-500' : 'text-[#111]'}`} title={render.title}>
                          {render.title}
                        </h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0 shrink-0 text-[#bbb] hover:text-[#555] hover:bg-[#f3f3f1] rounded" onClick={e => e.stopPropagation()}>
                              <MoreVertical className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="bg-white border-[#e8e8e6] text-[#111] w-48 shadow-lg rounded-xl text-xs">
                            {!isFailed && !isExpired && (
                              <DropdownMenuItem onClick={(e) => handleConvertFormat(render.id, e)} className="cursor-pointer focus:bg-[#f3f3f1] text-amber-600 focus:text-amber-700">
                                <RefreshCw className="mr-2 h-3.5 w-3.5" /> Convert Format
                              </DropdownMenuItem>
                            )}
                            <div className="px-3 py-2 space-y-0.5">
                              <span className="text-[10px] font-medium text-[#999] uppercase tracking-wider">S3 Export ID</span>
                              <p className="text-[11px] font-mono text-[#555] break-all">{render.id}</p>
                            </div>
                            <DropdownMenuSeparator className="bg-[#f0f0ee]" />
                            <DropdownMenuItem
                              onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(render.id); showSuccess("Export ID Copied!"); }}
                              className="cursor-pointer focus:bg-[#f3f3f1] focus:text-[#111]"
                            >
                              <Copy className="mr-2 h-3.5 w-3.5 text-[#888]" /> Copy S3 ID
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <p className="text-[11px] text-[#999]">{new Date(render.createdAt).toLocaleString()}</p>
                        {!isFailed && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${isExpired ? 'bg-red-50 text-red-500 border-red-200' : 'bg-emerald-50 text-emerald-600 border-emerald-200'}`}>
                            {isExpired ? 'Expired' : `${daysLeft}d left`}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#f0f0ee]">
                      {!isFailed && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-grow h-8 text-xs border-[#e8e8e6] bg-white text-[#555] hover:bg-[#f3f3f1] hover:text-[#111] rounded-lg"
                          onClick={(e) => forceDownload(render.id, render.title, e)}
                        >
                          <Download className="mr-1.5 h-3 w-3" /> Download
                        </Button>
                      )}
                      {isFailed && <div className="flex-grow text-[10px] text-red-400 italic">Folder remaining in S3</div>}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => handleDelete(render.id, e)}
                        className="h-8 w-8 p-0 border-[#e8e8e6] bg-white text-[#ccc] hover:text-red-500 hover:border-red-200 hover:bg-red-50 shrink-0 rounded-lg transition-colors"
                        title="Delete from S3"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewVideo} onOpenChange={(open) => !open && setPreviewVideo(null)}>
        <DialogContent className="bg-white border-[#e8e8e6] rounded-2xl max-w-5xl w-full p-0 overflow-hidden flex flex-col max-h-[95vh] shadow-xl">
          <DialogHeader className="px-5 py-3.5 border-b border-[#e8e8e6] shrink-0">
            <DialogTitle className="text-[#111] font-medium flex items-center gap-2 truncate pr-4 text-sm">
              <PlayCircle className="h-4 w-4 text-[#555] shrink-0" />
              {previewVideo?.title}
            </DialogTitle>
            <DialogDescription className="hidden">Video Preview</DialogDescription>
          </DialogHeader>
          {previewVideo && (
            <div className="flex flex-col bg-black flex-1 min-h-0">
              <div className="relative w-full flex-1 min-h-[30vh] max-h-[75vh] flex items-center justify-center p-2">
                <video
                  src={getAbsoluteUrl(previewVideo.videoUrl)}
                  poster={previewVideo.thumbnailUrl ? getAbsoluteUrl(previewVideo.thumbnailUrl) : undefined}
                  controls autoPlay
                  className="w-full h-full max-h-[75vh] object-contain rounded"
                />
              </div>
              <div className="bg-white p-4 flex justify-end gap-2 border-t border-[#e8e8e6] shrink-0">
                <Button variant="outline" onClick={() => setPreviewVideo(null)} className="h-8 text-xs border-[#e8e8e6] bg-white text-[#555] hover:bg-[#f3f3f1] rounded-lg">
                  Close
                </Button>
                <Button className="h-8 px-4 text-xs bg-[#111] hover:bg-[#333] text-white rounded-lg border-none" onClick={(e) => forceDownload(previewVideo.id, previewVideo.title, e)}>
                  <Download className="h-3.5 w-3.5 mr-1.5" /> Download MP4
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Library;