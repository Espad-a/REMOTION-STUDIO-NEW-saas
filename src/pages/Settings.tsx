"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Settings as SettingsIcon, Video, Loader2, ArrowLeft, CheckCircle2, UploadCloud, CloudUpload, RefreshCw, Lock, Save } from 'lucide-react';
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
  
  // Admin Deployment State
  const [pin, setPin] = useState('');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isDeploying, setIsDeploying] = useState(false);
  
  const [framesPerLambda, setFramesPerLambda] = useState('900');
  const [isSavingConfig, setIsSavingConfig] = useState(false);

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

  const handleUnlock = async () => {
    if (pin.length !== 4) return;
    setIsVerifying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('http://localhost:3001/api/admin/verify-pin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (data.success) {
        setIsUnlocked(true);
        showSuccess("Admin settings unlocked!");
        
        // Fetch current config
        const cfgRes = await fetch('http://localhost:3001/api/admin/config', {
          headers: { 'Authorization': `Bearer ${session?.access_token}` }
        });
        const cfgData = await cfgRes.json();
        if (cfgData.success) {
          setFramesPerLambda(cfgData.framesPerLambda);
        }
      } else {
        showError("Invalid PIN.");
        setPin('');
      }
    } catch (e: any) {
      showError("Verification failed: " + e.message);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSavingConfig(true);
    const toastId = showLoading("Saving configuration...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('http://localhost:3001/api/admin/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ pin, framesPerLambda })
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("Cloud Engine configuration updated!");
      } else {
        throw new Error(data.error);
      }
    } catch(e:any) {
      showError("Failed to save config: " + e.message);
    } finally {
      setIsSavingConfig(false);
      dismissToast(toastId as unknown as string);
    }
  };

  const handleDeploySite = async () => {
    setIsDeploying(true);
    const toastId = showLoading("Deploying editor changes to AWS Lambda (this takes about 30 seconds)...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('http://localhost:3001/api/admin/deploy-site', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}` 
        },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`Engine successfully updated! AWS Lambda is now using your newest code.`);
      } else {
        throw new Error(data.error);
      }
    } catch (e: any) {
      showError("Deploy failed: " + e.message);
    } finally {
      setIsDeploying(false);
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
          <div className="space-y-6">
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

            <Card className="bg-[#1e2532] border-[#2d8ceb]/30 p-6 shadow-lg rounded-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#2d8ceb] text-white text-[10px] font-bold px-3 py-1 uppercase tracking-widest rounded-bl-xl">
                Admin Only
              </div>
              <h3 className="text-[#ffffff] font-bold flex items-center gap-2 mb-2">
                <CloudUpload className="h-5 w-5 text-[#2d8ceb]" /> Update Cloud Engine
              </h3>
              <p className="text-sm text-[#aaaaaa] mb-6">
                AWS Lambda handles the heavy lifting of video rendering. Whenever the core visual editor codebase is updated, you must deploy the new engine to AWS.
              </p>
              
              {!isUnlocked ? (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#888888]" />
                    <Input 
                      type="password" 
                      maxLength={4}
                      placeholder="••••" 
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      className="w-24 pl-9 bg-[#1e1e1e] border-[#444444] text-[#eeeeee] text-center tracking-widest font-mono focus:border-[#2d8ceb] h-11"
                      onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                    />
                  </div>
                  <Button 
                    onClick={handleUnlock} 
                    disabled={pin.length !== 4 || isVerifying}
                    variant="outline"
                    className="bg-[#2d8ceb] border-none text-white hover:bg-[#1a73cc] font-bold h-11 px-6"
                  >
                    {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Unlock'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6 animate-in fade-in zoom-in duration-300">
                  <div className="bg-[#1e1e1e] p-5 rounded-xl border border-[#444444] space-y-4 shadow-inner">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold text-[#eeeeee]">Frames Per Lambda (Concurrency Tuner)</Label>
                      <Input 
                        type="number" 
                        value={framesPerLambda}
                        onChange={(e) => setFramesPerLambda(e.target.value)}
                        className="bg-[#232323] border-[#444444] text-[#eeeeee] font-mono focus:border-[#2d8ceb]"
                      />
                      <div className="text-[11px] text-[#888888] leading-tight space-y-1 mt-2">
                        <p><strong>Higher (e.g., 2000):</strong> Spawns fewer Lambdas simultaneously. Prevents AWS "Rate Exceeded" limits.</p>
                        <p><strong>Lower (e.g., 900):</strong> Spawns more Lambdas. Renders faster, but causes timeouts on strict AWS accounts.</p>
                      </div>
                    </div>
                    <Button 
                      onClick={handleSaveConfig} 
                      disabled={isSavingConfig}
                      variant="outline"
                      className="w-full bg-[#333333] border-[#444444] text-[#eeeeee] hover:bg-[#444444]"
                    >
                      {isSavingConfig ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4 text-[#2d8ceb]" />}
                      Save Configuration
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button 
                      onClick={handleDeploySite} 
                      disabled={isDeploying}
                      className="bg-[#2d8ceb] hover:bg-[#1a73cc] text-white font-bold h-11 px-6 rounded-xl shadow-lg w-full max-w-sm"
                    >
                      {isDeploying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                      {isDeploying ? 'Deploying to AWS...' : 'Sync Editor Changes to Cloud'}
                    </Button>
                    <Button variant="ghost" onClick={() => {setIsUnlocked(false); setPin('');}} className="h-11 px-3 text-[#888888] hover:text-[#cccccc] bg-[#232323] border border-[#444444] rounded-xl" title="Lock Settings">
                      <Lock className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;