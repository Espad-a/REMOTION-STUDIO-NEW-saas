"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Video, Loader2, ArrowLeft, CheckCircle2, UploadCloud, CloudUpload, RefreshCw, Lock, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { API_BASE } from '@/lib/api';

const Settings = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [placeholderUrl, setPlaceholderUrl] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [loading, setLoading] = useState(true);

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
        const { data } = await supabase.from('profiles').select('placeholder_url').eq('id', user.id).maybeSingle();
        if (data?.placeholder_url) setPlaceholderUrl(data.placeholder_url);
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
    if (!file.type.includes('video/mp4') && !file.type.includes('video/webm')) return showError("Please upload an MP4 or WEBM video file.");
    if (file.size > 20 * 1024 * 1024) return showError("File is too large. Max size is 20MB.");

    setIsUploading(true);
    const toastId = showLoading("Uploading to secure cloud storage...");
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;
      const { error: uploadError } = await supabase.storage.from('user_assets').upload(filePath, file);
      if (uploadError) throw uploadError;
      const { data: { publicUrl } } = supabase.storage.from('user_assets').getPublicUrl(filePath);
      const { error: dbError } = await supabase.from('profiles').upsert({ id: user.id, placeholder_url: publicUrl });
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
      const res = await fetch(`${API_BASE}/api/admin/verify-pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (data.success) {
        setIsUnlocked(true);
        showSuccess("Admin settings unlocked!");
        const cfgRes = await fetch(`${API_BASE}/api/admin/config`, { headers: { 'Authorization': `Bearer ${session?.access_token}` } });
        const cfgData = await cfgRes.json();
        if (cfgData.success) setFramesPerLambda(cfgData.framesPerLambda);
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
      const res = await fetch(`${API_BASE}/api/admin/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pin, framesPerLambda })
      });
      const data = await res.json();
      if (data.success) showSuccess("Cloud Engine configuration updated!");
      else throw new Error(data.error);
    } catch (e: any) {
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
      const res = await fetch(`${API_BASE}/api/admin/deploy-site`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ pin })
      });
      const data = await res.json();
      if (data.success) showSuccess("Engine successfully updated! AWS Lambda is now using your newest code.");
      else throw new Error(data.error);
    } catch (e: any) {
      showError("Deploy failed: " + e.message);
    } finally {
      setIsDeploying(false);
      dismissToast(toastId as unknown as string);
    }
  };

  const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-[10px] font-medium text-[#999] uppercase tracking-widest mb-3">{children}</p>
  );

  return (
    <div className="min-h-screen bg-[#f9f9f8] font-sans">
      {/* Header */}
      <div className="bg-white border-b border-[#e8e8e6] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-[#111] w-7 h-7 rounded-md flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="white">
              <rect x="2" y="2" width="5" height="5" rx="1"/>
              <rect x="9" y="2" width="5" height="5" rx="1"/>
              <rect x="2" y="9" width="5" height="5" rx="1"/>
              <rect x="9" y="9" width="5" height="5" rx="1"/>
            </svg>
          </div>
          <span className="text-sm font-medium text-[#111]">Account Settings</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/')}
          className="h-8 text-xs border-[#e8e8e6] bg-white text-[#555] hover:bg-[#f3f3f1] hover:text-[#111] rounded-lg"
        >
          <ArrowLeft className="mr-1.5 h-3 w-3" /> Back to Editor
        </Button>
      </div>

      <div className="max-w-2xl mx-auto p-6 md:p-10 space-y-8">
        <div>
          <h1 className="text-2xl font-medium text-[#111] tracking-tight">Settings</h1>
          <p className="text-sm text-[#888] mt-1">Manage your account preferences and global default assets.</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#999]" />
          </div>
        ) : (
          <div className="space-y-8">

            {/* Default Fallback Video */}
            <div className="bg-white border border-[#e8e8e6] rounded-xl p-6">
              <SectionLabel>Default Fallback Video</SectionLabel>
              <div className="flex items-start gap-2 mb-5">
                <Video className="h-4 w-4 text-[#555] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#111]">Placeholder video</p>
                  <p className="text-xs text-[#888] mt-0.5 leading-relaxed">
                    When a video or layout requires media but none is provided, the editor uses this fallback. Upload your own MP4 to replace the default.
                  </p>
                </div>
              </div>

              <div className="aspect-video bg-[#f4f4f2] rounded-xl overflow-hidden border border-[#e8e8e6] flex items-center justify-center relative max-w-sm mx-auto mb-5">
                {placeholderUrl ? (
                  <video src={placeholderUrl} autoPlay loop muted playsInline className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center text-[#bbb]">
                    <Video className="h-8 w-8 mx-auto mb-2 opacity-40" />
                    <p className="text-[10px] font-medium uppercase tracking-wider">Default placeholder</p>
                  </div>
                )}
                {placeholderUrl && (
                  <div className="absolute top-2 right-2 bg-emerald-500 text-white text-[10px] font-medium px-2 py-0.5 rounded flex items-center gap-1">
                    <CheckCircle2 className="h-2.5 w-2.5" /> Active
                  </div>
                )}
              </div>

              <div className="flex justify-center">
                <Label
                  htmlFor="video-upload"
                  className={`inline-flex items-center gap-2 h-9 px-4 bg-[#111] hover:bg-[#333] text-white text-xs font-medium rounded-lg cursor-pointer transition-colors ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
                >
                  {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <UploadCloud className="h-3.5 w-3.5" />}
                  {isUploading ? 'Uploading...' : 'Upload New Video (Max 20MB)'}
                </Label>
                <input id="video-upload" type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleFileUpload} disabled={isUploading} />
              </div>
            </div>

            {/* Admin Only */}
            <div className="bg-white border border-[#e8e8e6] rounded-xl p-6 relative overflow-hidden">
              <div className="absolute top-0 right-0 bg-[#111] text-white text-[9px] font-medium px-3 py-1 uppercase tracking-widest rounded-bl-lg">
                Admin Only
              </div>
              <SectionLabel>Cloud Engine</SectionLabel>
              <div className="flex items-start gap-2 mb-5">
                <CloudUpload className="h-4 w-4 text-[#555] mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-[#111]">Update Cloud Engine</p>
                  <p className="text-xs text-[#888] mt-0.5 leading-relaxed">
                    AWS Lambda handles video rendering. Deploy updated code to AWS whenever the editor codebase changes.
                  </p>
                </div>
              </div>

              {!isUnlocked ? (
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Lock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#999]" />
                    <Input
                      type="password"
                      maxLength={4}
                      placeholder="PIN"
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleUnlock()}
                      className="w-24 pl-8 bg-white border-[#e8e8e6] text-[#111] text-center tracking-widest font-mono h-9 text-sm focus:border-[#111] focus:ring-0 rounded-lg"
                    />
                  </div>
                  <Button
                    onClick={handleUnlock}
                    disabled={pin.length !== 4 || isVerifying}
                    className="h-9 px-5 bg-[#111] hover:bg-[#333] text-white text-xs font-medium rounded-lg border-none"
                  >
                    {isVerifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Unlock'}
                  </Button>
                </div>
              ) : (
                <div className="space-y-5 animate-in fade-in duration-300">
                  <div className="bg-[#f9f9f8] border border-[#e8e8e6] rounded-lg p-4 space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-[11px] font-medium text-[#666] uppercase tracking-wider">Frames Per Lambda</Label>
                      <Input
                        type="number"
                        value={framesPerLambda}
                        onChange={(e) => setFramesPerLambda(e.target.value)}
                        className="bg-white border-[#e8e8e6] text-[#111] font-mono h-9 text-sm focus:border-[#111] focus:ring-0 rounded-lg"
                      />
                      <div className="text-[11px] text-[#888] leading-relaxed space-y-0.5 mt-1">
                        <p><span className="font-medium text-[#555]">Higher (e.g. 2000):</span> Fewer Lambdas, prevents rate exceeded errors.</p>
                        <p><span className="font-medium text-[#555]">Lower (e.g. 900):</span> More Lambdas, faster renders but may timeout.</p>
                      </div>
                    </div>
                    <Button
                      onClick={handleSaveConfig}
                      disabled={isSavingConfig}
                      variant="outline"
                      className="h-8 text-xs border-[#e8e8e6] bg-white text-[#555] hover:bg-[#f3f3f1] hover:text-[#111] rounded-lg"
                    >
                      {isSavingConfig ? <Loader2 className="mr-1.5 h-3 w-3 animate-spin" /> : <Save className="mr-1.5 h-3 w-3" />}
                      Save configuration
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      onClick={handleDeploySite}
                      disabled={isDeploying}
                      className="h-9 px-5 bg-[#111] hover:bg-[#333] text-white text-xs font-medium rounded-lg border-none"
                    >
                      {isDeploying ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="mr-1.5 h-3.5 w-3.5" />}
                      {isDeploying ? 'Deploying to AWS...' : 'Sync editor changes to cloud'}
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => { setIsUnlocked(false); setPin(''); }}
                      className="h-9 w-9 p-0 text-[#999] hover:text-[#555] hover:bg-[#f3f3f1] rounded-lg"
                      title="Lock settings"
                    >
                      <Lock className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;