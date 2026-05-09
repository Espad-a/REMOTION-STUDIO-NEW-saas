"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Settings as SettingsIcon, Video, Loader2, ArrowLeft, CheckCircle2, UploadCloud } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [placeholderUrl, setPlaceholderUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('placeholder_url')
          .eq('id', user.id)
          .single();
          
        if (data?.placeholder_url) {
          setPlaceholderUrl(data.placeholder_url);
        }
      } catch (e) {
        console.error("Could not fetch profile");
      } finally {
        setLoading(false);
      }
    };
    
    fetchProfile();
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    
    if (!file.type.includes('video/mp4') && !file.type.includes('video/webm')) {
      return showError("Please upload an MP4 or WEBM video file.");
    }
    
    if (file.size > 20 * 1024 * 1024) {
      return showError("File is too large. Max size is 20MB.");
    }

    setIsUploading(true);
    const toastId = showLoading("Uploading to secure cloud storage...");
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('user_assets')
        .upload(filePath, file);
        
      if (uploadError) throw uploadError;
      
      const { data: { publicUrl } } = supabase.storage
        .from('user_assets')
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase
        .from('profiles')
        .upsert({ id: user.id, placeholder_url: publicUrl });

      if (dbError) throw dbError;
      
      setPlaceholderUrl(publicUrl);
      showSuccess("Placeholder video updated successfully!");
    } catch (error: any) {
      showError("Upload failed: " + error.message);
    } finally {
      setIsUploading(false);
      dismissToast(toastId as unknown as string);
    }
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-[#cccccc] font-sans p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#ffffff] flex items-center gap-2">
              <SettingsIcon className="text-[#2d8ceb] h-8 w-8" /> Account Settings
            </h1>
            <p className="text-[#888888] text-sm mt-1">Manage your account preferences and global default assets.</p>
          </div>
          <Button variant="outline" onClick={() => navigate('/')} className="bg-[#232323] border-[#444444] text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Editor
          </Button>
        </header>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#2d8ceb]" />
          </div>
        ) : (
          <Card className="bg-[#232323] border-[#444444] p-6 shadow-lg rounded-2xl">
            <h3 className="text-[#ffffff] font-bold flex items-center gap-2 mb-2">
              <Video className="h-5 w-5 text-[#2d8ceb]" /> Default Fallback Video
            </h3>
            <p className="text-sm text-[#aaaaaa] mb-6">
              When you generate a video or layout that requires media but none is provided, the editor will use a default fallback video. 
              By default, this is a generic placeholder. You can upload your own custom MP4 file below to act as your fallback.
            </p>

            <div className="space-y-4">
              <div className="aspect-video bg-black rounded-xl overflow-hidden border-2 border-[#333333] flex items-center justify-center relative shadow-inner max-w-lg mx-auto">
                {placeholderUrl ? (
                  <video src={placeholderUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-[#888888]">
                    <Video className="h-10 w-10 mx-auto mb-2 opacity-30" />
                    <p className="text-xs font-bold uppercase tracking-wider">Default Placeholder</p>
                  </div>
                )}
                
                {placeholderUrl && (
                  <div className="absolute top-2 right-2 bg-emerald-500/90 text-white text-[10px] font-bold px-2 py-1 rounded flex items-center gap-1 shadow-sm">
                    <CheckCircle2 className="h-3 w-3" /> Active Custom Fallback
                  </div>
                )}
              </div>

              <div className="flex flex-col items-center justify-center pt-4">
                <Label 
                  htmlFor="video-upload" 
                  className={`flex items-center justify-center gap-2 bg-[#2d8ceb] hover:bg-[#1a73cc] text-white px-6 py-3 rounded-xl cursor-pointer transition-colors shadow-lg ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <UploadCloud className="h-5 w-5" />}
                  <span className="font-bold">{isUploading ? 'Uploading...' : 'Upload New Video (Max 20MB)'}</span>
                </Label>
                <input 
                  id="video-upload" 
                  type="file" 
                  accept="video/mp4,video/webm" 
                  className="hidden" 
                  onChange={handleFileUpload}
                  disabled={isUploading}
                />
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Settings;