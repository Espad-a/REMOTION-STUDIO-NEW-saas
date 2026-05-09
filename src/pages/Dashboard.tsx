"use client";

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { 
  TerminalSquare, Loader2, CheckCircle2, XCircle, Clock, Video, 
  ArrowLeft, PlayCircle, Settings2, Play, Image as ImageIcon, Globe, Send, Film
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/lib/supabase';

const Dashboard = () => {
  const navigate = useNavigate();
  const [jobs, setJobs] = useState<any[]>([]);
  const [presets, setPresets] = useState<string[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<string>('');
  const [isStarting, setIsStarting] = useState(false);
  
  const [webhookUrl, setWebhookUrl] = useState(localStorage.getItem('remotion_webhook_url') || '');
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);

  const fetchJobs = async () => {
    try {
      const res = await fetch('http://localhost:3001/api/jobs');
      const data = await res.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (e) {
      console.error("Failed to fetch jobs");
    }
  };

  const fetchPresets = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = session ? { 'Authorization': `Bearer ${session.access_token}` } : {};

      const res = await fetch('http://localhost:3001/api/presets', { headers });
      const data = await res.json();
      if (data.success) {
        setPresets(data.presets);
        if (data.presets.includes('default')) {
          setSelectedPreset('default');
        } else if (data.presets.length > 0) {
          setSelectedPreset(data.presets[0]);
        }
      }
    } catch (e) {
      console.error("Failed to fetch presets");
    }
  }

  useEffect(() => {
    fetchJobs();
    fetchPresets();
    const interval = setInterval(fetchJobs, 2000); // Poll every 2 seconds
    return () => clearInterval(interval);
  }, []);

  const handleTestWebhook = async () => {
    if (!webhookUrl) return showError("Please enter a webhook URL first.");
    
    setIsTestingWebhook(true);
    try {
      const res = await fetch('http://localhost:3001/api/test-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ webhookUrl })
      });
      const data = await res.json();
      if (data.success) {
        showSuccess("Test payload sent! Check your webhook provider (Make, n8n, Zapier, etc.).");
      } else {
        showError("Failed to send webhook: " + data.error);
      }
    } catch (e: any) {
      showError("Network error: " + e.message);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleStartManualJob = async () => {
    if (!selectedPreset) {
      return showError("Please select a preset first. Go to the Video Editor to save one if you haven't yet.");
    }

    setIsStarting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const payload = {
        preset: selectedPreset,
        webhookUrl: webhookUrl 
      };

      const res = await fetch('http://localhost:3001/api/jobs', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`Automation job started using preset "${selectedPreset}"!`);
        fetchJobs();
      } else {
        showError(data.error || "Failed to start job");
      }
    } catch (e: any) {
      showError(e.message);
    } finally {
      setIsStarting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'completed': return <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30"><CheckCircle2 className="mr-1 h-3 w-3"/> Done</Badge>;
      case 'failed': return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><XCircle className="mr-1 h-3 w-3"/> Failed</Badge>;
      case 'running': return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Loader2 className="mr-1 h-3 w-3 animate-spin"/> Running</Badge>;
      default: return <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30"><Clock className="mr-1 h-3 w-3"/> Queued</Badge>;
    }
  };

  const getAbsoluteUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `http://localhost:3001/${url}`;
  };

  return (
    <div className="min-h-screen bg-[#1e1e1e] text-[#cccccc] font-sans overflow-y-auto p-4 md:p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[#ffffff] flex items-center gap-2">
              <Settings2 className="text-[#2d8ceb] h-6 w-6" /> Automation Dashboard <span className="text-[12px] bg-[#2d8ceb]/20 text-[#2d8ceb] px-2 py-0.5 rounded font-black tracking-widest ml-1">V1</span>
            </h1>
            <p className="text-[#888888] text-sm mt-1">Monitor and manage fully headless background video generation jobs.</p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate('/library')} className="bg-[#232323] border-[#444444] text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]">
              <Film className="mr-2 h-4 w-4" /> Library
            </Button>
            <Button variant="outline" onClick={() => navigate('/')} className="bg-[#232323] border-[#444444] text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Editor
            </Button>
            <div className="flex items-center bg-[#232323] rounded-lg border border-[#444444] p-1">
              <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                <SelectTrigger className="h-8 border-none shadow-none bg-transparent hover:bg-[#333333] focus:ring-0 text-xs font-medium w-[140px] text-[#eeeeee]">
                  <SelectValue placeholder="Select Preset..." />
                </SelectTrigger>
                <SelectContent className="bg-[#232323] border-[#444444] text-[#eeeeee]">
                  {presets.length === 0 && <SelectItem value="none" disabled>No presets found</SelectItem>}
                  {presets.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="w-px h-4 bg-[#444444] mx-1"></div>
              <Button onClick={handleStartManualJob} disabled={isStarting || !selectedPreset} className="bg-[#2d8ceb] hover:bg-[#2576c7] text-white h-8 text-xs rounded-md px-3">
                {isStarting ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />} Start Job
              </Button>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-[#232323] border-[#444444] p-5 shadow-lg rounded-2xl md:col-span-1 flex flex-col justify-between">
            <div>
              <h3 className="text-[#ffffff] font-bold flex items-center gap-2 mb-3">
                <Globe className="h-4 w-4 text-[#2d8ceb]" /> Webhook Dispatcher
              </h3>
              <p className="text-xs text-[#aaaaaa] mb-4">
                Enter a Webhook URL (like Make.com, n8n, or Zapier) below. Any jobs you start manually from the button above will automatically send their final MP4 and Thumbnail names to this URL.
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <Input 
                  placeholder="https://your-webhook-url.com/..." 
                  value={webhookUrl}
                  onChange={(e) => {
                    setWebhookUrl(e.target.value);
                    localStorage.setItem('remotion_webhook_url', e.target.value);
                  }}
                  className="bg-[#1e1e1e] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb] h-9 text-xs"
                />
                <Button 
                  onClick={handleTestWebhook} 
                  disabled={!webhookUrl || isTestingWebhook}
                  variant="outline"
                  className="bg-[#2d2d2d] border-[#444444] text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333] h-9 shrink-0 px-4"
                >
                  {isTestingWebhook ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2 text-[#2d8ceb]" />}
                  Test 
                </Button>
              </div>
            </div>
          </Card>

          <Card className="bg-[#232323] border-[#444444] p-5 shadow-lg rounded-2xl md:col-span-1">
            <h3 className="text-[#ffffff] font-bold flex items-center gap-2 mb-3">
              <TerminalSquare className="h-4 w-4 text-[#888888]" /> API Trigger Instructions
            </h3>
            <p className="text-xs text-[#aaaaaa] mb-4">You can trigger video generation from anywhere by sending a POST request to the <code className="text-[#cccccc]">/api/jobs</code> endpoint. </p>
            <div className="bg-[#171717] p-3 rounded-xl border border-[#333333] font-mono text-[10px] text-[#2d8ceb] overflow-x-auto">
<pre>{`curl -X POST http://localhost:3001/api/jobs \\
-H "Content-Type: application/json" \\
-H "Authorization: Bearer <YOUR_ACCESS_TOKEN>" \\
-d '{
  "preset": "${selectedPreset || 'default'}",
  "test": true,
  "webhookUrl": "${webhookUrl || 'https://your-webhook-url.com/...'}"
}'`}</pre>
            </div>
            <p className="text-[10px] text-[#888888] mt-3">💡 <strong className="text-[#cccccc]">PRO TIP:</strong> Send <code className="bg-[#1e1e1e] border border-[#333333] px-1 py-0.5 rounded text-[#cccccc]">"test": true</code> to instantly test the rendering flow + webhook with a fast 15-second placeholder video!</p>
          </Card>

          <div className="space-y-4 md:col-span-2">
            <h3 className="text-[#ffffff] font-bold text-lg">Job History</h3>
            {jobs.length === 0 ? (
              <div className="text-center py-16 border-2 border-dashed border-[#444444] rounded-2xl bg-[#232323] text-[#888888]">
                <Clock className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p>No automation jobs have been run yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.map((job) => (
                  <Accordion type="single" collapsible key={job.id} className="bg-[#232323] border border-[#444444] rounded-xl overflow-hidden shadow-sm">
                    <AccordionItem value="item-1" className="border-none">
                      <AccordionTrigger className="hover:no-underline py-4 px-5">
                        <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-4 pr-4">
                          <div className="flex items-center gap-4">
                            {getStatusBadge(job.status)}
                            <div className="text-left">
                              <p className="text-xs font-mono text-[#888888]">{job.id}</p>
                              <p className="text-sm font-bold text-[#eeeeee]">{job.step || 'Waiting...'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 w-full md:w-64">
                            <Progress value={job.progress} className="h-2 w-full bg-[#1e1e1e] [&>div]:bg-[#2d8ceb]" />
                            <span className="text-xs font-bold w-8 text-right">{job.progress}%</span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-5 pb-5 pt-0">
                        {job.webhookUrl && (
                          <div className="mb-4 flex items-center justify-between bg-[#171717] p-3 rounded-lg border border-[#333333]">
                            <div className="flex items-center gap-2">
                              <Globe className="h-4 w-4 text-[#888888]" />
                              <span className="text-xs text-[#aaaaaa]">Webhook URL:</span>
                              <span className="text-xs font-mono text-[#cccccc] truncate max-w-[200px] md:max-w-[400px]">{job.webhookUrl}</span>
                            </div>
                            {job.webhookStatus === 'sent' ? <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">Sent</Badge> : 
                             job.webhookStatus === 'failed' ? <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Failed</Badge> :
                             <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">Pending</Badge>}
                          </div>
                        )}

                        {job.status === 'completed' && job.videoUrl && (
                          <div className="mb-4 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex flex-col md:flex-row gap-4">
                            {job.thumbnailUrl && (
                              <div className="md:w-1/3 flex-shrink-0">
                                <div className="rounded-lg overflow-hidden border-2 border-emerald-500/30 shadow-lg relative aspect-video bg-black">
                                  <img 
                                    src={getAbsoluteUrl(job.thumbnailUrl)} 
                                    alt="Video Thumbnail" 
                                    className="w-full h-full object-cover opacity-90 hover:opacity-100 transition-opacity" 
                                  />
                                </div>
                              </div>
                            )}
                            <div className="flex flex-col justify-center flex-grow space-y-3">
                              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                                <CheckCircle2 className="h-5 w-5" /> Export Successfully Compiled
                              </div>
                              <p className="text-xs text-[#aaaaaa]">
                                Video, Thumbnail, and Title Text file have been saved successfully to your S3 bucket!
                              </p>
                              <div className="flex gap-2 pt-1">
                                <a href={getAbsoluteUrl(job.videoUrl)} target="_blank" rel="noreferrer">
                                  <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 text-white h-9 text-xs rounded-lg px-4">
                                    <PlayCircle className="mr-1.5 h-4 w-4" /> Watch Final MP4
                                  </Button>
                                </a>
                                {job.thumbnailUrl && (
                                  <a href={getAbsoluteUrl(job.thumbnailUrl)} target="_blank" rel="noreferrer">
                                    <Button size="sm" variant="outline" className="border-emerald-600/50 text-emerald-500 hover:bg-emerald-600/20 hover:text-emerald-400 h-9 text-xs rounded-lg px-4">
                                      <ImageIcon className="mr-1.5 h-4 w-4" /> View Thumbnail
                                    </Button>
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {job.error && (
                          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-medium">
                            Error: {job.error}
                          </div>
                        )}

                        <div className="bg-[#171717] rounded-lg border border-[#333333] p-3 max-h-60 overflow-y-auto font-mono text-[10px] space-y-1.5 custom-scrollbar">
                          {job.logs.map((log: any, i: number) => (
                            <div key={i} className={log.type === 'error' ? 'text-red-400' : log.type === 'warning' ? 'text-amber-400' : log.type === 'success' ? 'text-emerald-400' : 'text-[#aaaaaa]'}>
                              <span className="opacity-40 mr-2">[{log.time}]</span>{log.msg}
                            </div>
                          ))}
                          {job.logs.length === 0 && <p className="text-[#555555]">No logs available.</p>}
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;