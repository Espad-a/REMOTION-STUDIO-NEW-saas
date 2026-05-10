"use client";

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TerminalSquare, Loader2, CheckCircle2, XCircle, Clock,
  ArrowLeft, PlayCircle, Image as ImageIcon, Globe, Send, Film, Zap, Server, Workflow, Rocket, AlertTriangle, Activity, Copy
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { showSuccess, showError } from '@/utils/toast';
import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/api';

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
      const res = await fetch(`${API_BASE}/api/jobs`);
      const data = await res.json();
      if (data.success) setJobs(data.jobs);
    } catch (e) { console.error("Failed to fetch jobs"); }
  };

  const fetchPresets = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = session ? { 'Authorization': `Bearer ${session.access_token}` } : {};
      const res = await fetch(`${API_BASE}/api/presets`, { headers });
      const data = await res.json();
      if (data.success) {
        setPresets(data.presets);
        if (data.presets.includes('default')) setSelectedPreset('default');
        else if (data.presets.length > 0) setSelectedPreset(data.presets[0]);
      }
    } catch (e) { console.error("Failed to fetch presets"); }
  };

  useEffect(() => {
    fetchJobs();
    fetchPresets();
    const interval = setInterval(fetchJobs, 2000);
    return () => clearInterval(interval);
  }, []);

  const handleTestWebhook = async () => {
    if (!webhookUrl) return showError("Please enter a webhook URL first.");
    setIsTestingWebhook(true);
    try {
      const res = await fetch(`${API_BASE}/api/test-webhook`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ webhookUrl }) });
      const data = await res.json();
      if (data.success) showSuccess("Test payload sent! Check your webhook provider.");
      else showError("Failed to send webhook: " + data.error);
    } catch (e: any) {
      showError("Network error: " + e.message);
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleStartManualJob = async () => {
    if (!selectedPreset) return showError("Please select a preset first.");
    setIsStarting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${API_BASE}/api/jobs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ preset: selectedPreset, webhookUrl })
      });
      const data = await res.json();
      if (data.success) { showSuccess(`Automation job started using preset "${selectedPreset}"!`); fetchJobs(); }
      else showError(data.error || "Failed to start job");
    } catch (e: any) {
      showError(e.message);
    } finally {
      setIsStarting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-600 border border-emerald-200"><CheckCircle2 className="h-3 w-3" /> Done</span>;
      case 'failed': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-red-50 text-red-500 border border-red-200"><XCircle className="h-3 w-3" /> Failed</span>;
      case 'running': return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-blue-50 text-blue-600 border border-blue-200 animate-pulse"><Loader2 className="h-3 w-3 animate-spin" /> Running</span>;
      default: return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-[#f4f4f2] text-[#666] border border-[#e8e8e6]"><Clock className="h-3 w-3" /> Queued</span>;
    }
  };

  const getAbsoluteUrl = (url: string) => {
    if (!url) return '';
    return url.startsWith('http') ? url : `${API_BASE}/${url}`;
  };

  const baseUrl = window.location.origin;
  const curlCommand = `curl -X POST \\
  ${API_BASE || baseUrl}/api/jobs \\
  -H "Authorization: Bearer <YOUR_SUPABASE_JWT>" \\
  -H "Content-Type: application/json" \\
  -d '{
    "preset": "${selectedPreset || 'default'}",
    "webhookUrl": "${webhookUrl || 'https://hook.us1.make.com/...'}"
  }'`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(curlCommand);
    showSuccess("API snippet copied to clipboard!");
  };

  return (
    <div className="min-h-screen bg-[#f9f9f8] font-sans">
      {/* Header */}
      <div className="bg-white border-b border-[#e8e8e6] px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Workflow className="h-4 w-4 text-[#555]" />
          <span className="text-sm font-medium text-[#111]">Automation Hub</span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate('/library')} className="h-8 text-xs border-[#e8e8e6] bg-white text-[#555] hover:bg-[#f3f3f1] hover:text-[#111] rounded-lg">
            <Film className="mr-1.5 h-3 w-3" /> Library
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/')} className="h-8 text-xs border-[#e8e8e6] bg-white text-[#555] hover:bg-[#f3f3f1] hover:text-[#111] rounded-lg">
            <ArrowLeft className="mr-1.5 h-3 w-3" /> Back to Editor
          </Button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto p-6 md:p-10 space-y-8">
        <div>
          <h1 className="text-2xl font-medium text-[#111] tracking-tight">Automation</h1>
          <p className="text-sm text-[#888] mt-1">Deploy fully-edited videos headlessly via one click or API trigger.</p>
        </div>

        {/* Top grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Execution Engine */}
          <div className="lg:col-span-2 bg-white border border-[#e8e8e6] rounded-xl p-8 flex flex-col items-center text-center">
            <div className="w-12 h-12 bg-[#f4f4f2] rounded-xl flex items-center justify-center mb-4">
              <Rocket className="h-5 w-5 text-[#555]" />
            </div>
            <h2 className="text-lg font-medium text-[#111] mb-1">One-Click Execution</h2>
            <p className="text-sm text-[#888] max-w-sm mb-6">Select a preset containing your prompts, styles, and API keys. The system handles the rest.</p>

            <div className="w-full max-w-sm space-y-3">
              <div className="space-y-1.5 text-left">
                <Label className="text-[11px] font-medium text-[#666] uppercase tracking-wider">Preset configuration</Label>
                <Select value={selectedPreset} onValueChange={setSelectedPreset}>
                  <SelectTrigger className="h-9 border-[#e8e8e6] bg-white text-[#111] text-sm focus:border-[#111] focus:ring-0 rounded-lg">
                    <SelectValue placeholder="Select a preset..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-[#e8e8e6] text-[#111] rounded-xl shadow-lg">
                    {presets.length === 0 && <SelectItem value="none" disabled className="text-[#999]">No presets found</SelectItem>}
                    {presets.map(p => <SelectItem key={p} value={p} className="text-sm">{p}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={handleStartManualJob}
                disabled={isStarting || !selectedPreset}
                className="w-full h-10 text-sm font-medium bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] hover:opacity-90 text-white rounded-lg border-none transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:hover:scale-100"
              >
                {isStarting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
                {isStarting ? 'Initializing...' : 'Launch automation sequence'}
              </Button>
            </div>
          </div>

          {/* Integrations */}
          <div className="bg-white border border-[#e8e8e6] rounded-xl overflow-hidden flex flex-col">
            <Tabs defaultValue="webhook" className="w-full h-full flex flex-col">
              <div className="border-b border-[#e8e8e6] px-3 pt-3">
                <TabsList className="h-8 bg-[#f4f4f2] p-0.5 rounded-lg border border-[#e8e8e6] w-full grid grid-cols-2">
                  <TabsTrigger value="webhook" className="h-7 text-[11px] rounded-md data-[state=active]:bg-white data-[state=active]:text-[#111] data-[state=active]:shadow-sm text-[#666]">
                    <Globe className="mr-1.5 h-3 w-3" /> Webhooks
                  </TabsTrigger>
                  <TabsTrigger value="api" className="h-7 text-[11px] rounded-md data-[state=active]:bg-white data-[state=active]:text-[#111] data-[state=active]:shadow-sm text-[#666]">
                    <Server className="mr-1.5 h-3 w-3" /> API
                  </TabsTrigger>
                </TabsList>
              </div>

              <div className="p-5 flex-grow flex flex-col">
                <TabsContent value="webhook" className="m-0 h-full flex flex-col justify-center gap-4">
                  <div className="text-center space-y-2 mb-2">
                    <div className="inline-flex bg-emerald-50 p-2 rounded-full border border-emerald-100 mb-1">
                      <Send className="h-4 w-4 text-emerald-600" />
                    </div>
                    <h3 className="text-[#111] font-medium text-sm">Delivery Webhook</h3>
                    <p className="text-xs text-[#888] leading-relaxed">
                      Connect to Make.com, n8n, or Zapier. We'll POST the final MP4 and Thumbnail URLs here.
                    </p>
                  </div>
                  
                  <div className="space-y-2 mt-auto">
                    <Input
                      placeholder="https://hook.us1.make.com/..."
                      value={webhookUrl}
                      onChange={(e) => { setWebhookUrl(e.target.value); localStorage.setItem('remotion_webhook_url', e.target.value); }}
                      className="h-9 bg-white border-[#e8e8e6] text-[#111] text-xs focus:border-[#111] focus:ring-0 rounded-lg"
                    />
                    <Button
                      onClick={handleTestWebhook}
                      disabled={!webhookUrl || isTestingWebhook}
                      variant="outline"
                      className="w-full h-8 text-xs border-[#e8e8e6] bg-white text-[#555] hover:bg-[#f3f3f1] hover:text-[#111] rounded-lg"
                    >
                      {isTestingWebhook ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Send className="h-3.5 w-3.5 mr-1.5 text-[#888]" />}
                      Send test payload
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="api" className="m-0 h-full flex flex-col justify-center gap-4">
                  <div className="text-center space-y-2 mb-2">
                    <div className="inline-flex bg-purple-50 p-2 rounded-full border border-purple-100 mb-1">
                      <TerminalSquare className="h-4 w-4 text-purple-600" />
                    </div>
                    <h3 className="text-[#111] font-medium text-sm">REST API Trigger</h3>
                    <p className="text-xs text-[#888] leading-relaxed">
                      Trigger the pipeline programmatically. Note: You'll need a valid Supabase Auth Token.
                    </p>
                  </div>
                  
                  <div className="bg-[#f9f9f8] rounded-xl border border-[#e8e8e6] mt-auto relative group overflow-hidden">
                    <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button onClick={copyToClipboard} size="sm" variant="ghost" className="h-7 px-2 text-[10px] bg-white hover:bg-[#f3f3f1] text-[#555] rounded-md border border-[#e8e8e6] shadow-sm">
                        <Copy className="h-3 w-3 mr-1.5" /> Copy
                      </Button>
                    </div>
                    <pre className="p-4 font-mono text-[10px] text-[#555] overflow-x-auto whitespace-pre-wrap">
{curlCommand}
                    </pre>
                  </div>
                </TabsContent>
              </div>
            </Tabs>
          </div>
        </div>

        {/* Jobs */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-[#888]" />
            <h3 className="text-sm font-medium text-[#111]">Active & past executions</h3>
          </div>

          {jobs.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-[#e0e0de] rounded-xl bg-white text-[#bbb]">
              <Clock className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm text-[#888] mb-1">No jobs yet</p>
              <p className="text-xs text-[#bbb]">Select a preset above and click Launch to start your first job.</p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {jobs.map((job) => (
                <Accordion type="single" collapsible key={job.id} className={`bg-white border rounded-xl overflow-hidden transition-all duration-300 ${job.status === 'running' ? 'border-blue-200' : 'border-[#e8e8e6]'}`}>
                  <AccordionItem value="item-1" className="border-none">
                    <AccordionTrigger className="hover:no-underline py-4 px-5">
                      <div className="flex flex-col md:flex-row md:items-center justify-between w-full gap-3 pr-3">
                        <div className="flex items-center gap-4">
                          {getStatusBadge(job.status)}
                          <div className="text-left">
                            <p className="text-[10px] font-mono text-[#999] mb-0.5">{job.id}</p>
                            <p className={`text-sm font-medium ${job.status === 'running' ? 'text-[#111]' : 'text-[#555]'}`}>
                              {job.step || 'Waiting...'}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-56">
                          <Progress value={job.progress} className={`h-1.5 flex-grow bg-[#f0f0ee] ${job.status === 'failed' ? '[&>div]:bg-red-400' : job.status === 'completed' ? '[&>div]:bg-emerald-500' : '[&>div]:bg-blue-500'}`} />
                          <span className="text-xs font-medium text-[#555] w-8 text-right">{job.progress}%</span>
                        </div>
                      </div>
                    </AccordionTrigger>

                    <AccordionContent className="px-5 pb-5 pt-0 border-t border-[#f0f0ee]">
                      <div className="pt-4 space-y-3">
                        {job.webhookUrl && (
                          <div className="flex items-center justify-between bg-[#f9f9f8] border border-[#e8e8e6] p-3 rounded-lg">
                            <div className="flex items-center gap-2">
                              <Globe className="h-3.5 w-3.5 text-[#888]" />
                              <span className="text-xs text-[#888]">Webhook:</span>
                              <span className="text-xs font-mono text-[#555] truncate max-w-[200px]">{job.webhookUrl}</span>
                            </div>
                            {job.webhookStatus === 'sent' ? <span className="text-[10px] font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">Delivered</span> :
                             job.webhookStatus === 'failed' ? <span className="text-[10px] font-medium text-red-500 bg-red-50 border border-red-200 px-2 py-0.5 rounded">Failed</span> :
                             <span className="text-[10px] font-medium text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">Pending</span>}
                          </div>
                        )}

                        {job.status === 'completed' && job.videoUrl && (
                          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col md:flex-row gap-4 items-center">
                            {job.thumbnailUrl && (
                              <div className="md:w-1/4 flex-shrink-0 w-full">
                                <div className="rounded-lg overflow-hidden border border-emerald-200 aspect-video bg-black">
                                  <img src={getAbsoluteUrl(job.thumbnailUrl)} alt="Thumbnail" className="w-full h-full object-cover" />
                                </div>
                              </div>
                            )}
                            <div className="flex flex-col justify-center flex-grow space-y-2.5 w-full">
                              <div className="flex items-center gap-2 text-emerald-600 font-medium text-sm">
                                <CheckCircle2 className="h-4 w-4" /> Export compiled & uploaded
                              </div>
                              <p className="text-xs text-[#666]">Video, thumbnail, and config files saved to cloud storage.</p>
                              <div className="flex flex-wrap gap-2">
                                <a href={getAbsoluteUrl(job.videoUrl)} target="_blank" rel="noreferrer">
                                  <Button size="sm" className="h-8 px-4 text-xs bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg border-none">
                                    <PlayCircle className="mr-1.5 h-3.5 w-3.5" /> Watch video
                                  </Button>
                                </a>
                                {job.thumbnailUrl && (
                                  <a href={getAbsoluteUrl(job.thumbnailUrl)} target="_blank" rel="noreferrer">
                                    <Button size="sm" variant="outline" className="h-8 px-4 text-xs border-emerald-300 text-emerald-600 hover:bg-emerald-50 rounded-lg">
                                      <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> Thumbnail
                                    </Button>
                                  </a>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {job.error && (
                          <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-500 text-xs flex items-start gap-2.5">
                            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-medium mb-0.5">Execution halted</p>
                              <p className="text-red-400">{job.error}</p>
                            </div>
                          </div>
                        )}

                        <div className="bg-[#f9f9f8] border border-[#e8e8e6] rounded-xl p-3.5 max-h-56 overflow-y-auto font-mono text-[10px] space-y-1.5">
                          {job.logs.map((log: any, i: number) => (
                            <div key={i} className={`flex gap-2.5 ${log.type === 'error' ? 'text-red-500' : log.type === 'warning' ? 'text-amber-500' : log.type === 'success' ? 'text-emerald-600' : 'text-[#888]'}`}>
                              <span className="opacity-50 shrink-0">[{log.time}]</span>
                              <span className="break-words">{log.msg}</span>
                            </div>
                          ))}
                          {job.logs.length === 0 && <p className="text-[#ccc] italic">System initializing...</p>}
                        </div>
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
  );
};

export default Dashboard;