"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Player } from '@remotion/player';
import { MyComposition, TopicCut, TopicNode, CutElement } from '../remotion/MyComposition';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Download, Video as VideoIcon, Loader2, Type, Settings2, Save,
  LayoutGrid, Scissors, ImageIcon, Film, Plus, Target, Square,
  Trash2, Wand2, AlignLeft, ListTree, Search, CheckCircle2,
  TerminalSquare, Mic, Volume2, Navigation, Ruler, RefreshCw, FilePlus, Dices, Star, Activity, Globe, UserCircle, CloudUpload, FolderOpen, Lock, Coins, Sparkles, Palette, Zap
} from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { API_BASE } from '@/lib/api';

const LAYOUT_CONFIGS: Record<number, any> = {
  1: { hSpacing: 80, vSpacing: 80, customCircleSize: 500, cols: 1, rows: 1 },
  2: { hSpacing: 230, vSpacing: 80, customCircleSize: 500, cols: 2, rows: 1 },
  3: { hSpacing: 250, vSpacing: 80, customCircleSize: 350, cols: 2, rows: 2 },
  4: { hSpacing: 270, vSpacing: 80, customCircleSize: 350, cols: 2, rows: 2 },
  5: { hSpacing: 270, vSpacing: 80, customCircleSize: 350, cols: 3, rows: 2 },
  6: { hSpacing: 270, vSpacing: 80, customCircleSize: 350, cols: 3, rows: 2 },
  7: { hSpacing: 125, vSpacing: 85, customCircleSize: 340, cols: 4, rows: 3 },
  8: { hSpacing: 125, vSpacing: 85, customCircleSize: 340, cols: 4, rows: 3 },
  9: { hSpacing: 190, vSpacing: 45, customCircleSize: 240, cols: 4, rows: 3 },
  10: { hSpacing: 190, vSpacing: 45, customCircleSize: 240, cols: 4, rows: 3 },
  11: { hSpacing: 190, vSpacing: 45, customCircleSize: 240, cols: 4, rows: 3 },
  12: { hSpacing: 190, vSpacing: 45, customCircleSize: 240, cols: 4, rows: 3 },
  13: { hSpacing: 135, vSpacing: 75, customCircleSize: 230, cols: 5, rows: 4 },
  14: { hSpacing: 135, vSpacing: 75, customCircleSize: 230, cols: 5, rows: 4 },
  15: { hSpacing: 135, vSpacing: 75, customCircleSize: 230, cols: 5, rows: 4 }
};

const EXPLAINER_TOPICS = [
  "The Lore of Elden Ring", "Demon Slayer Breathing Styles", "The History of the Roman Empire",
  "Black Holes and the Event Horizon", "Quantum Physics Explained", "Greek Mythology: The Olympians",
  "The Story of Studio Ghibli", "The Evolution of Artificial Intelligence", "How the Pyramids Were Built",
  "The Bermuda Triangle Mystery", "The Psychology of Serial Killers", "The French Revolution",
  "Cyberpunk 2077 World Lore", "The Life of Nikola Tesla", "Norse Mythology: Ragnarok",
  "The Search for Extraterrestrial Life", "How the Internet Actually Works", "The History of Bitcoin and Crypto",
  "Jujutsu Kaisen: Cursed Energy Explained", "The Fermi Paradox", "The Space Race (USA vs USSR)",
  "The Salem Witch Trials", "How Blackbeard Built His Pirate Empire", "The Fall of the Aztecs",
  "The Mariana Trench and Deep Sea Life", "The Mandela Effect", "The History of Video Game Consoles"
];

const DEFAULT_PROMPT_OUTLINE = `You are a master YouTube documentary producer. Given a main topic and a desired number of segments, create a logical, engaging outline of sub-topics to cover.
Ensure there are EXACTLY the requested number of subtopics.
CRITICAL RULE: Keep the subtopic names EXTREMELY SHORT. They MUST be 1, 2, or 3 words MAXIMUM. NEVER EXCEED 3 WORDS.
Good examples: "Early Life", "The Betrayal", "Final Battle".
Bad examples: "The story of his early life", "When he betrayed his friends".
OUTPUT EXACT JSON STRUCTURE:
{ "subtopics": ["<1-3 Word Title>", "<1-3 Word Title>"] }`;

const DEFAULT_PROMPT_SEGMENT = `You are a script writer for a highly detailed, long-form YouTube documentary channel. You will be given a Main Topic and a specific Sub-topic to focus on for this segment.

**Layout rules:**
- Write entirely in flowing prose paragraphs — never use lists, bold text, or section headers.
- Each paragraph should be 5–8 sentences and flow naturally.
- DO NOT include the sub-topic title in the script body itself. Just write the narration.
- AIM FOR 400–600 WORDS for this specific segment. DO NOT BE BRIEF. Go into extreme, rich detail.

**Tone and voice:**
- Casual, conversational, and engaging — like a knowledgeable friend explaining something over a coffee.
- Explain the "why" and "how", not just the "what". Use specific examples, lore, quotes, or historical context.
- Vary sentence length throughout to create natural rhythm and pacing. Short punchy sentences. Then a longer one that builds on it.

**Critical tone rules:**
- AVOID poetic, overly metaphorical, or "inspirational quote" phrasing at all costs.
- DO use casual filler language and natural spoken rhythms where it fits: "and here's the thing...", "the crazy part is...", "umm, yeah, that actually happened".
- DO use light, dry humor when appropriate.
- NEVER use hollow filler phrases like "it's important to note that" or "one must consider". Just say the thing.

**TTS formatting rules:**
- Use commas to create natural pauses within a sentence.
- Paragraph breaks and newlines create long, awkward silences in TTS. Do NOT use a new paragraph as a stylistic pause.
- Never write a word or phrase on its own line.
- Dashes (—) are great for a quick interruption or an aside.
- The final output should read like one clean, unbroken audio performance.

OUTPUT EXACT JSON STRUCTURE:
{ "script": "<Your long, detailed script for this segment here>" }`;

const DEFAULT_PROMPT_1 = `You are an editor. Analyze the explainer transcript and output ONLY a valid JSON object. No markdown.\n\nYour job:\n1. Identify all main topics/characters being explained.\n2. The 'label' for each topic MUST BE EXTREMELY SHORT. Maximum 1, 2, or 3 words ONLY. (e.g. "Early Life", "The Battle").\n3. Break down the text for each topic into DISTINCT, SHORT SENTENCES (or visual beats) into an array. Do not lump multiple visual ideas into one sentence. Each sentence will become a separate video cut.\n\nOUTPUT EXACT JSON STRUCTURE: \n{ "topics": [ { "label": "<1-3 Word Title>", "sentences": ["<Sentence 1>", "<Sentence 2>", "<Sentence 3>"] } ] }`;
const DEFAULT_PROMPT_2 = `You are a video layout director. You will receive a specific topic and its exact sentences. Output ONLY a valid JSON object. No markdown.\n\nYour job: For EVERY SINGLE SENTENCE provided, pick the best template from the SERVER TEMPLATES list to represent it visually. Do NOT generate search queries. Read the descriptions of the templates carefully to know when to use them!\n\nRULES:\n1. You MUST output exactly one moment per sentence provided.\n2. Estimate the duration for each sentence (~3 words = 1 second). Minimum 3s.\n3. If there are video templates (ones with 'vid' in the name), use them SPARINGLY (maximum ONCE per topic). Use image templates for the rest.\n\nOUTPUT EXACT JSON STRUCTURE: \n{ "label": "<Topic Name>", "moments": [ { "sentence_index": <number>, "template": "<Template Name>", "duration_estimate": <seconds> } ] }`;
const DEFAULT_PROMPT_3 = `You are a media researcher. You will receive a specific topic and its exact sentences. Output ONLY a valid JSON object. No markdown.\n\nYour job: For EVERY SINGLE SENTENCE, generate a CLEAN, 3-5 word 'search_query' for finding an image or video that perfectly matches that sentence visually.\n\nRULES:\n1. The system searches DuckDuckGo. Do NOT use special characters, quotes, or parentheses.\n2. Do NOT use abstract concepts. Use concrete visual keywords (e.g., use "vintage 1950s computer lab" instead of "Early enthusiasm for machine solving").\n\nOUTPUT EXACT JSON STRUCTURE: \n{ "label": "<Topic Name>", "queries": [ { "sentence_index": <number>, "search_query": "<3-5 words>" } ] }`;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const getUiMediaSrc = (url: string, defaultUrl: string) => {
  if (!url) return defaultUrl;
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
};

const isVideoFormat = (url: string | unknown) => {
  if (typeof url !== 'string') return false;
  const clean = url.split('?')[0].toLowerCase();
  return clean.endsWith('.mp4') || clean.endsWith('.webm') || clean.endsWith('.mov') || clean.endsWith('.mkv');
};

type LogEntry = { message: string; type: 'info' | 'success' | 'warning' | 'search' | 'error'; };

// Reusable style tokens
const SL = "text-[10px] font-medium text-[#999] uppercase tracking-wider"; // section label
const INP = "h-8 bg-white border-[#e8e8e6] text-[#111] text-xs rounded-lg focus:border-[#111] focus:ring-0";
const SEL_TRIG = "h-8 border-[#e8e8e6] bg-white text-[#111] text-xs rounded-lg focus:border-[#111] focus:ring-0";
const SEL_CONT = "bg-white border-[#e8e8e6] text-[#111] rounded-xl shadow-lg";
const CARD = "bg-white border border-[#e8e8e6] rounded-xl p-4";
const BTN_GHOST = "h-7 text-xs px-2 text-[#555] hover:text-[#111] hover:bg-[#f3f3f1] rounded-lg";
const DIVIDER = <div className="w-px h-4 bg-[#e8e8e6] mx-0.5" />;
const SL_SLIDER = "[&>span:first-child]:bg-[#e8e8e6] [&>span:first-child>span]:bg-[#111] [&_[role=slider]]:bg-white [&_[role=slider]]:border-[#111] [&_[role=slider]]:shadow-sm";

const VideoEditor = () => {
  const navigate = useNavigate();
  const { user, credits, signOut } = useAuth();

  const [customDefaultVideo, setCustomDefaultVideo] = useState<string>('placeholder.mp4');
  const [activeTab, setActiveTab] = useState<'create' | 'timeline' | 'style' | 'templates'>('create');
  const [designerMode, setDesignerMode] = useState<'cut' | 'hud'>('cut');
  const [text, setText] = useState("Explainer Video");
  const [format, setFormat] = useState<'landscape' | 'portrait'>('landscape');
  const [circleCount, setCircleCount] = useState(4);
  const [fontFamily, setFontFamily] = useState('Bebas Neue');
  const [gridConfigs, setGridConfigs] = useState<Record<number, any>>(LAYOUT_CONFIGS);
  const currentGrid = gridConfigs[circleCount] || LAYOUT_CONFIGS[4];
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatus, setRenderStatus] = useState("Initializing...");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [elements, setElements] = useState<CutElement[]>([{ id: '1', type: 'image', url: '', x: 0, y: 0, size: 70 }]);
  const [showBorder, setShowBorder] = useState(true);
  const [loadedTemplatePath, setLoadedTemplatePath] = useState<string | null>(null);
  const [templateDescription, setTemplateDescription] = useState("");
  const [templates, setTemplates] = useState<string[]>([]);
  const [templateDetails, setTemplateDetails] = useState<any[]>([]);
  const [fullTemplates, setFullTemplates] = useState<any[]>([]);
  const [presets, setPresets] = useState<string[]>([]);
  const [presetDetails, setPresetDetails] = useState<any[]>([]);
  const [loadedPresetPath, setLoadedPresetPath] = useState<string | null>(null);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveMode, setSaveMode] = useState<'new' | 'update'>('new');
  const [saveFolder, setSaveFolder] = useState<'cut' | 'hud'>('cut');
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [localTemplatesToImport, setLocalTemplatesToImport] = useState<string[]>([]);
  const [localPresetsToImport, setLocalPresetsToImport] = useState<string[]>([]);
  const [hudEnabled, setHudEnabled] = useState(false);
  const [hudTitleColor, setHudTitleColor] = useState('#ffffff');
  const [hudProgressColor, setHudProgressColor] = useState('#e2e8f0');
  const [hudShowTitle, setHudShowTitle] = useState(true);
  const [hudShowImage, setHudShowImage] = useState(true);
  const [hudShowProgress, setHudShowProgress] = useState(true);
  const [hudTitleShadow, setHudTitleShadow] = useState(true);
  const [hudImageShadow, setHudImageShadow] = useState(true);
  const [hudProgressBarShadow, setHudProgressBarShadow] = useState(true);
  const [defaultHudName, setDefaultHudName] = useState('');
  const [ttsProvider, setTtsProvider] = useState<'elevenlabs' | 'kokoro' | 'testing'>('testing');
  const [elVoiceId, setElVoiceId] = useState('ErXwobaYiN019PkySvjV');
  const [kokoroVoice, setKokoroVoice] = useState('af_bella');
  const [topicNodes, setTopicNodes] = useState<TopicNode[]>([]);
  const [topicCuts, setTopicCuts] = useState<Record<number, TopicCut[]>>({});
  const [aiProvider, setAiProvider] = useState('groq');
  const [aiModel, setAiModel] = useState('llama-3.1-8b-instant');
  const [scriptAiProvider, setScriptAiProvider] = useState('anthropic');
  const [scriptAiModel, setScriptAiModel] = useState('claude-sonnet-4-6');
  const [videoScript, setVideoScript] = useState('');
  const [promptOutline, setPromptOutline] = useState(DEFAULT_PROMPT_OUTLINE);
  const [promptSegment, setPromptSegment] = useState(DEFAULT_PROMPT_SEGMENT);
  const [prompt1, setPrompt1] = useState(DEFAULT_PROMPT_1);
  const [prompt2, setPrompt2] = useState(DEFAULT_PROMPT_2);
  const [prompt3, setPrompt3] = useState(DEFAULT_PROMPT_3);
  const [sentencesPerCut, setSentencesPerCut] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationLogs, setGenerationLogs] = useState<LogEntry[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [autoScriptTopic, setAutoScriptTopic] = useState("");
  const [autoScriptCount, setAutoScriptCount] = useState(6);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [scriptGenStatus, setScriptGenStatus] = useState("");
  const [usedTopics, setUsedTopics] = useState<string[]>([]);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('placeholder_url').eq('id', user.id).maybeSingle().then(({ data }) => {
        if (data?.placeholder_url) setCustomDefaultVideo(data.placeholder_url);
      });
    }
  }, [user]);

  const LOCAL_ASSETS = [
    { name: 'System Default Placeholder', path: 'placeholder.mp4' },
    ...(customDefaultVideo && customDefaultVideo !== 'placeholder.mp4' ? [{ name: 'My Custom Placeholder', path: customDefaultVideo }] : [])
  ];

  let explainerDuration = 60;
  for (let i = 0; i < circleCount; i++) {
    const rawCuts = topicCuts[i] || [];
    const cuts = Array.isArray(rawCuts) ? rawCuts : [];
    const cutsDuration = cuts.reduce((sum, cut) => sum + (cut.duration || 90), 0);
    const node = topicNodes[i];
    const preCutStay = node?.titleAudioDuration ? Math.max(60, Math.ceil(node.titleAudioDuration * 30) + 15) : 60;
    explainerDuration += 30 + preCutStay + cutsDuration + 30;
  }

  const playerTemplate = activeTab === 'templates' ? designerMode : 'explainer';
  const durationInFrames = playerTemplate === 'explainer' ? explainerDuration : 150;

  useEffect(() => {
    setTopicNodes(prev => {
      if (prev.length === circleCount) return prev;
      const newNodes = [...prev];
      while (newNodes.length < circleCount) {
        newNodes.push({ title: `Topic ${newNodes.length + 1}`, mediaUrl: customDefaultVideo, script: '', audioUrl: '' });
      }
      return newNodes.slice(0, circleCount);
    });
  }, [circleCount, customDefaultVideo]);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [generationLogs]);

  const handleProviderChange = (v: string) => {
    setAiProvider(v);
    if (v === 'groq') setAiModel('llama-3.1-8b-instant');
    if (v === 'openrouter') setAiModel('google/gemma-3-27b-it');
    if (v === 'openai') setAiModel('gpt-4o-mini');
    if (v === 'anthropic') setAiModel('claude-haiku-4-5-20251001');
  };

  const handleScriptProviderChange = (v: string) => {
    setScriptAiProvider(v);
    if (v === 'groq') setScriptAiModel('llama-3.3-70b-versatile');
    if (v === 'openrouter') setScriptAiModel('anthropic/claude-3.5-sonnet');
    if (v === 'openai') setScriptAiModel('gpt-4o');
    if (v === 'anthropic') setScriptAiModel('claude-sonnet-4-6');
  };

  const fetchTemplatesAndPresets = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = session ? { 'Authorization': `Bearer ${session.access_token}` } : {};
      const resT = await fetch(`${API_BASE}/api/templates`, { headers });
      const dataT = await resT.json();
      if (dataT.success) {
        setTemplates(dataT.templates || []);
        setTemplateDetails(dataT.templateDetails || []);
        const full = await Promise.all((dataT.templates || []).map(async (name: string) => {
          const r = await fetch(`${API_BASE}/api/templates/${name}`, { headers });
          const d = await r.json();
          return { name, ...d.config };
        }));
        setFullTemplates(full);
      }
      const resP = await fetch(`${API_BASE}/api/presets`, { headers });
      const dataP = await resP.json();
      if (dataP.success) {
        setPresets(dataP.presets || []);
        setPresetDetails(dataP.presetDetails || []);
        if (!loadedPresetPath && dataP.presets && dataP.presets.includes('default')) loadPreset('default');
      }
    } catch (e) { console.error("Failed to fetch data", e); }
  };

  useEffect(() => { fetchTemplatesAndPresets(); }, []);

  const loadPreset = async (name: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = session ? { 'Authorization': `Bearer ${session.access_token}` } : {};
      const res = await fetch(`${API_BASE}/api/presets/${name}`, { headers });
      const data = await res.json();
      if (data.success) {
        const c = data.config;
        if (c.aiProvider) setAiProvider(c.aiProvider);
        if (c.aiModel) setAiModel(c.aiModel);
        if (c.scriptAiProvider) setScriptAiProvider(c.scriptAiProvider);
        if (c.scriptAiModel) setScriptAiModel(c.scriptAiModel);
        if (c.ttsProvider) setTtsProvider(c.ttsProvider);
        if (c.elVoiceId !== undefined) setElVoiceId(c.elVoiceId);
        if (c.kokoroVoice) setKokoroVoice(c.kokoroVoice);
        if (c.promptOutline) setPromptOutline(c.promptOutline);
        if (c.promptSegment) setPromptSegment(c.promptSegment);
        if (c.prompt1) setPrompt1(c.prompt1);
        if (c.prompt2) setPrompt2(c.prompt2);
        if (c.prompt3) setPrompt3(c.prompt3);
        if (c.sentencesPerCut) setSentencesPerCut(c.sentencesPerCut);
        if (c.gridConfigs) setGridConfigs(c.gridConfigs);
        if (c.defaultHudName) setDefaultHudName(c.defaultHudName);
        if (c.fontFamily) setFontFamily(c.fontFamily);
        if (c.format) setFormat(c.format);
        setLoadedPresetPath(name);
        showSuccess(`Loaded Preset: ${name}`);
      }
    } catch (e) { showError("Failed to load preset"); }
  };

  const savePreset = async () => {
    if (!newPresetName) return;
    const config = { aiProvider, aiModel, scriptAiProvider, scriptAiModel, ttsProvider, elVoiceId, kokoroVoice, promptOutline, promptSegment, prompt1, prompt2, prompt3, sentencesPerCut, gridConfigs, defaultHudName, fontFamily, format };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(`${API_BASE}/api/presets`, { method: 'POST', headers, body: JSON.stringify({ name: newPresetName, config }) });
      const data = await res.json();
      if (data.success) { showSuccess(`Preset "${newPresetName}" saved to cloud!`); setIsPresetDialogOpen(false); setLoadedPresetPath(newPresetName); fetchTemplatesAndPresets(); }
    } catch (e) { showError("Failed to save preset"); }
  };

  const deletePreset = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the global preset "${name}"?`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(`${API_BASE}/api/presets/${name}`, { method: 'DELETE', headers });
      if (res.ok) { showSuccess(`Deleted preset "${name}"`); if (loadedPresetPath === name) setLoadedPresetPath(null); fetchTemplatesAndPresets(); }
      else { const errorData = await res.json(); showError("Failed to delete preset: " + (errorData.error || res.statusText)); }
    } catch (e: any) { showError("Failed to delete preset: " + e.message); }
  };

  const openSaveDialog = (folder: 'cut' | 'hud') => { setSaveMode('new'); setSaveFolder(folder); setNewTemplateName(''); setIsSaveDialogOpen(true); };
  const openUpdateDialog = () => { setSaveMode('update'); setIsSaveDialogOpen(true); };

  const handleSetDefaultHud = () => {
    if (!loadedTemplatePath) return showError("Please select a HUD template from the dropdown first.");
    setDefaultHudName(loadedTemplatePath);
    showSuccess(`${loadedTemplatePath} is now your default HUD! (Remember to Save Global Preset to keep it)`);
  };

  const saveGridLayout = () => {
    setGridConfigs(prev => ({ ...prev, [circleCount]: { hSpacing: currentGrid.hSpacing, vSpacing: currentGrid.vSpacing, customCircleSize: currentGrid.customCircleSize, cols: currentGrid.cols, rows: currentGrid.rows } }));
    showSuccess(`Grid layout updated!`);
  };

  const saveTemplate = async (isManualCloudUpload = false) => {
    if (saveMode === 'new' && !newTemplateName && !isManualCloudUpload) return;
    const config = { description: templateDescription, text, template: saveMode === 'new' ? saveFolder : playerTemplate, format, circleCount, fontFamily, hSpacing: currentGrid.hSpacing, vSpacing: currentGrid.vSpacing, customCircleSize: currentGrid.customCircleSize, cols: currentGrid.cols, rows: currentGrid.rows, elements, showBorder, topicCuts, topicNodes, hudEnabled, hudTitleColor, hudProgressColor, hudShowTitle, hudShowImage, hudShowProgress, hudTitleShadow, hudImageShadow, hudProgressBarShadow };
    const payloadName = (saveMode === 'update' || isManualCloudUpload) ? loadedTemplatePath : newTemplateName;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(`${API_BASE}/api/templates`, { method: 'POST', headers, body: JSON.stringify({ name: payloadName, config, folder: saveMode === 'new' ? saveFolder : undefined }) });
      const data = await res.json();
      if (data.success) { showSuccess(`Template "${payloadName}" saved to Cloud!`); setIsSaveDialogOpen(false); setLoadedTemplatePath(data.path || payloadName || ""); fetchTemplatesAndPresets(); }
    } catch (e) { showError("Failed to save template to cloud"); }
  };

  const deleteTemplate = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the visual template "${name}"?`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;
      const res = await fetch(`${API_BASE}/api/templates/${name}`, { method: 'DELETE', headers });
      if (res.ok) { showSuccess(`Deleted template "${name}"`); if (loadedTemplatePath === name) handleNewTemplate(); fetchTemplatesAndPresets(); }
      else { const errorData = await res.json(); showError("Failed to delete template: " + (errorData.error || res.statusText)); }
    } catch (e: any) { showError("Failed to delete template: " + e.message); }
  };

  const handleNewTemplate = () => { setLoadedTemplatePath(null); setTemplateDescription(''); setElements([{ id: '1', type: 'image', url: '', x: 0, y: 0, size: 70 }]); setTopicCuts({}); setHudEnabled(false); showSuccess("Started a new empty template."); };

  const loadTemplate = async (path: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = session ? { 'Authorization': `Bearer ${session.access_token}` } : {};
      const res = await fetch(`${API_BASE}/api/templates/${path}`, { headers });
      const data = await res.json();
      if (data.success) {
        const c = data.config;
        setText(c.text);
        const loadedTemp = c.template || 'explainer';
        if (loadedTemp === 'cut' || loadedTemp === 'hud') { setActiveTab('templates'); setDesignerMode(loadedTemp); } else { setActiveTab('style'); }
        const loadedCircleCount = c.circleCount || 4;
        setGridConfigs(prev => ({ ...prev, [loadedCircleCount]: { ...prev[loadedCircleCount], hSpacing: c.hSpacing ?? prev[loadedCircleCount].hSpacing, vSpacing: c.vSpacing ?? prev[loadedCircleCount].vSpacing, customCircleSize: c.customCircleSize ?? prev[loadedCircleCount].customCircleSize, cols: c.cols ?? prev[loadedCircleCount].cols, rows: c.rows ?? prev[loadedCircleCount].rows } }));
        setCircleCount(loadedCircleCount);
        setFontFamily(c.fontFamily || 'Bebas Neue');
        if (c.format) setFormat(c.format);
        setTemplateDescription(c.description || "");
        if (c.elements) { setElements(c.elements); } else {
          const migrated: CutElement[] = [];
          if (c.showVideo) migrated.push({ id: Date.now()+'v', type: 'video', url: c.videoUrl, x: c.videoX || 0, y: c.videoY || 0, size: c.videoSize || 70 });
          if (c.showImage) migrated.push({ id: Date.now()+'i', type: 'image', url: c.imageUrl, x: c.imageX || 0, y: c.imageY || 0, size: c.imageSize || 70 });
          if (c.showRuler) migrated.push({ id: Date.now()+'r', type: 'ruler', x: c.rulerX || 0, y: c.rulerY || 0, size: c.rulerWidth || 40, rotation: c.rulerRotation || 0 });
          if (c.showArrow) migrated.push({ id: Date.now()+'a', type: 'arrow', x: c.arrowX || 0, y: c.arrowY || 0, size: c.arrowSize || 20, rotation: c.arrowRotation || 0, color: c.arrowColor || '#ef4444' });
          setElements(migrated.length ? migrated : [{ id: '1', type: 'image', url: '', x: 0, y: 0, size: 70 }]);
        }
        setShowBorder(c.showBorder !== undefined ? c.showBorder : true);
        setTopicCuts(c.topicCuts || {});
        setHudEnabled(c.hudEnabled ?? false);
        setHudTitleColor(c.hudTitleColor ?? '#ffffff');
        setHudProgressColor(c.hudProgressColor ?? '#e2e8f0');
        setHudShowTitle(c.hudShowTitle ?? true);
        setHudShowImage(c.hudShowImage ?? true);
        setHudShowProgress(c.hudShowProgress ?? true);
        setHudTitleShadow(c.hudTitleShadow ?? true);
        setHudImageShadow(c.hudImageShadow ?? true);
        setHudProgressBarShadow(c.hudProgressBarShadow ?? true);
        if (c.topicNodes && c.topicNodes.length > 0) setTopicNodes(c.topicNodes);
        setLoadedTemplatePath(path);
        showSuccess(`Loaded "${path}" from ${data.source === 'cloud' ? 'Cloud' : 'Local'}!`);
      }
    } catch (e) { showError("Failed to load template"); }
  };

  const handleUploadLocalToCloud = async () => {
    if (localTemplatesToImport.length === 0 && localPresetsToImport.length === 0) return showError("Please select at least one file to import.");
    const toastId = showLoading("Importing files to cloud...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;
      let uploaded = 0;
      for (const tName of localTemplatesToImport) {
        const res = await fetch(`${API_BASE}/api/templates/${tName}?source=local`, { headers });
        const data = await res.json();
        if (data.success && data.config) { await fetch(`${API_BASE}/api/templates`, { method: 'POST', headers, body: JSON.stringify({ name: tName, config: data.config }) }); uploaded++; }
      }
      for (const pName of localPresetsToImport) {
        const res = await fetch(`${API_BASE}/api/presets/${pName}?source=local`, { headers });
        const data = await res.json();
        if (data.success && data.config) { await fetch(`${API_BASE}/api/presets`, { method: 'POST', headers, body: JSON.stringify({ name: pName, config: data.config }) }); uploaded++; }
      }
      showSuccess(`Successfully imported ${uploaded} files to the Cloud!`);
      setIsImportDialogOpen(false);
      setLocalTemplatesToImport([]);
      setLocalPresetsToImport([]);
      fetchTemplatesAndPresets();
    } catch (e: any) { showError("Failed to import files: " + e.message); }
    finally { dismissToast(toastId as unknown as string); }
  };

  const addCutElement = (type: CutElement['type']) => {
    const newEl: CutElement = { id: Date.now().toString(), type, x: 0, y: 0, size: type === 'arrow' ? 20 : type === 'ruler' ? 40 : 70, rotation: 0, color: '#ef4444' };
    if (type === 'video') newEl.url = customDefaultVideo;
    if (type === 'image') newEl.url = '';
    setElements([...elements, newEl]);
  };

  const updateCutElement = (id: string, updates: Partial<CutElement>) => setElements(prev => prev.map(el => el.id === id ? { ...el, ...updates } : el));
  const removeCutElement = (id: string) => setElements(prev => prev.filter(el => el.id !== id));

  const handleRender = async () => {
    setIsRendering(true);
    setRenderProgress(0);
    setRenderStatus("Connecting to server...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${API_BASE}/api/render`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${session?.access_token}` },
        body: JSON.stringify({ text, template: 'explainer', format, circleCount, fontFamily, hSpacing: currentGrid.hSpacing, vSpacing: currentGrid.vSpacing, customCircleSize: currentGrid.customCircleSize, cols: currentGrid.cols, rows: currentGrid.rows, elements, showBorder, topicCuts, topicNodes, hudEnabled, hudTitleColor, hudProgressColor, hudShowTitle, hudShowImage, hudShowProgress, hudTitleShadow, hudImageShadow, hudProgressBarShadow, defaultVideo: customDefaultVideo }),
      });
      if (!response.ok) { const errText = await response.text(); let errMsg = errText; try { errMsg = JSON.parse(errText).error || errText; } catch (e) {} throw new Error(`Server returned ${response.status}: ${errMsg}`); }
      if (!response.body) throw new Error("No response body from server");
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let buffer = '';
      while (!done) {
        const { value, done: readerDone } = await reader.read();
        done = readerDone;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const data = JSON.parse(line);
              if (data.type === 'info') setRenderStatus(data.message);
              else if (data.type === 'progress') { setRenderProgress(data.percent); setRenderStatus(`Rendering frames: ${data.renderedFrames} / ${data.totalFrames}`); }
              else if (data.type === 'done') {
                setRenderProgress(100); setRenderStatus("Done!");
                setTimeout(() => { setIsRendering(false); toast.success("Render Complete!", { description: "Your video has been saved to S3.", duration: 8000, action: { label: "View in Library ➔", onClick: () => navigate('/library') } }); }, 1000);
              } else if (data.type === 'error') { throw new Error(data.error); }
            } catch (e: any) {}
          }
        }
      }
    } catch (error: any) { showError("Render failed: " + error.message); setIsRendering(false); }
  };

  const generateTopicAudio = async (topicIndex: number) => {
    const topic = topicNodes[topicIndex];
    if (!topic || !topic.script?.trim()) return showError(`Please enter a script before generating.`);
    if (ttsProvider === 'elevenlabs' && (!elVoiceId)) return showError("Please configure your ElevenLabs Voice ID.");
    const toastId = showLoading(`Generating voiceovers for ${topic.title}...`);
    try {
      const endpoint = ttsProvider === 'elevenlabs' ? '/api/elevenlabs/generate' : ttsProvider === 'kokoro' ? '/api/kokoro/generate' : '/api/testing/generate';
      const titlePayload = ttsProvider === 'elevenlabs' ? { text: topic.title, voiceId: elVoiceId, index: `${topicIndex}_title` } : ttsProvider === 'kokoro' ? { text: topic.title, voiceId: kokoroVoice, index: `${topicIndex}_title` } : { text: topic.title, index: `${topicIndex}_title` };
      const titleRes = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(titlePayload) });
      const titleData = await titleRes.json();
      if (!titleData.success) throw new Error(titleData.error);
      
      const newTitleAudioUrl = titleData.filename;
      const titleAudioSrc = newTitleAudioUrl.startsWith('http') ? newTitleAudioUrl : `${API_BASE}/${newTitleAudioUrl}`;
      const titleAudioDurationSecs = await new Promise<number>((resolve) => { 
        const audio = new Audio(titleAudioSrc); 
        audio.addEventListener('loadedmetadata', () => resolve(audio.duration)); 
        audio.addEventListener('error', () => resolve(0)); 
        audio.load(); 
      });
      
      const scriptPayload = ttsProvider === 'elevenlabs' ? { text: topic.script, voiceId: elVoiceId, index: topicIndex } : ttsProvider === 'kokoro' ? { text: topic.script, voiceId: kokoroVoice, index: topicIndex } : { text: topic.script, index: topicIndex };
      const scriptRes = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scriptPayload) });
      const scriptData = await scriptRes.json();
      if (!scriptData.success) throw new Error(scriptData.error);
      
      const newScriptAudioUrl = scriptData.filename;
      const scriptAudioSrc = newScriptAudioUrl.startsWith('http') ? newScriptAudioUrl : `${API_BASE}/${newScriptAudioUrl}`;
      const scriptAudioDurationSecs = await new Promise<number>((resolve) => { 
        const audio = new Audio(scriptAudioSrc); 
        audio.addEventListener('loadedmetadata', () => resolve(audio.duration)); 
        audio.addEventListener('error', () => resolve(0)); 
        audio.load(); 
      });
      
      if (scriptAudioDurationSecs > 0) {
        setTopicCuts(prev => {
          const rawCuts = prev[topicIndex] || [];
          const cuts = Array.isArray(rawCuts) ? rawCuts : [];
          if (cuts.length === 0) return prev;
          const totalCurrentFrames = cuts.reduce((sum, c) => sum + (c.duration || 90), 0) || 1;
          const targetTotalFrames = Math.floor(scriptAudioDurationSecs * 30);
          const newCuts = cuts.map(c => ({ ...c, duration: Math.max(10, Math.floor(((c.duration || 90) / totalCurrentFrames) * targetTotalFrames)) }));
          return { ...prev, [topicIndex]: newCuts };
        });
        showSuccess(`Voiceovers ready! Visual cuts dynamically synced to ${scriptAudioDurationSecs.toFixed(1)}s.`);
      } else { showSuccess(`Voiceovers ready for ${topic.title}!`); }
      updateTopicNode(topicIndex, { audioUrl: newScriptAudioUrl, titleAudioUrl: newTitleAudioUrl, titleAudioDuration: titleAudioDurationSecs || (topic.title.split(' ').length / 2.5) });
    } catch (err: any) { showError("Audio Generation Failed: " + err.message); }
    finally { dismissToast(toastId as unknown as string); }
  };

  const cutTemplates = fullTemplates.filter(t => t.template === 'cut');
  const hudTemplates = fullTemplates.filter(t => t.template === 'hud');
  const groupedTemplates = (templateDetails || []).reduce((acc, detail) => {
    const path = detail.name;
    const [folder, ...rest] = path.includes('/') ? path.split('/') : ['main', path];
    const name = rest.length ? rest.join('/') : folder;
    const key = rest.length ? folder : 'main';
    if (!acc[key]) acc[key] = [];
    acc[key].push({ path, name, source: detail.source, is_global: detail.is_global, user_id: detail.user_id });
    return acc;
  }, {} as Record<string, { path: string; name: string; source: string; is_global: boolean; user_id: string }[]>);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => setGenerationLogs(prev => [...prev, { message, type }]);

  const callLLM = async (systemMessage: string, userMessage: string, pOverride?: string, mOverride?: string, useScriptKey: boolean = false) => {
    const response = await fetch(`${API_BASE}/api/llm/generate`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ system: systemMessage, user: userMessage, provider: pOverride || aiProvider, model: mOverride || aiModel, useScriptKey }) });
    const json = await response.json();
    if (!json.success) throw new Error(json.error);
    return json.data;
  };

  const handleResetUsedTopics = () => { setUsedTopics([]); showSuccess("Topic list has been reset!"); };

  const handleRandomizeTopic = () => {
    let availableTopics = EXPLAINER_TOPICS.filter(t => !usedTopics.includes(t));
    if (availableTopics.length === 0) { showSuccess("All topics used! Resetting."); setUsedTopics([]); availableTopics = EXPLAINER_TOPICS; }
    const randomCount = Math.floor(Math.random() * (15 - 6 + 1)) + 6;
    setAutoScriptCount(randomCount);
    const randomTopic = availableTopics[Math.floor(Math.random() * availableTopics.length)];
    setAutoScriptTopic(randomTopic);
    setUsedTopics(prev => [...prev, randomTopic]);
    showSuccess(`Randomized Topic: ${randomTopic}`);
  };

  const handleGenerateScript = async () => {
    if (!autoScriptTopic.trim()) return showError("Please enter a main topic.");
    setIsGeneratingScript(true);
    setVideoScript("");
    try {
      setScriptGenStatus("Generating outline...");
      const outlineData = await callLLM(promptOutline, `Topic: "${autoScriptTopic}". Generate exactly ${autoScriptCount} subtopics.`, scriptAiProvider, scriptAiModel, true);
      const subtopics = outlineData.subtopics || [];
      if (subtopics.length === 0) throw new Error("AI failed to generate an outline.");
      let fullScript = "";
      for (let i = 0; i < subtopics.length; i++) {
        let success = false; let retries = 3; let lastError = "";
        while (!success && retries > 0) {
          setScriptGenStatus(`Writing segment ${i + 1} of ${subtopics.length}...${retries < 3 ? ` (Retry ${4 - retries}/3)` : ''}`);
          try {
            const segmentData = await callLLM(promptSegment, `Main Topic: "${autoScriptTopic}"\nCurrent Sub-topic: "${subtopics[i]}"`, scriptAiProvider, scriptAiModel, true);
            if (segmentData && segmentData.script) { fullScript += `${subtopics[i]}\n${segmentData.script}\n\n`; setVideoScript(fullScript + `\n\n[...Writing: ${subtopics[i + 1] || 'finishing up'}...]`); success = true; }
            else throw new Error("Invalid format returned by AI.");
          } catch (segmentErr: any) { lastError = segmentErr.message || "Unknown API Error"; retries--; if (retries > 0) await delay(3000); }
        }
        if (!success) { fullScript += `${subtopics[i]}\n(Segment generation failed: ${lastError})\n\n`; setVideoScript(fullScript + `\n\n[...Writing: ${subtopics[i + 1] || 'finishing up'}...]`); }
        if (i < subtopics.length - 1) await delay(2000);
      }
      fullScript += `category: ${autoScriptTopic}`;
      setVideoScript(fullScript.trim());
      showSuccess("Script generated successfully!");
    } catch (e: any) { showError("Failed to generate script: " + e.message); }
    finally { setIsGeneratingScript(false); setScriptGenStatus(""); }
  };

  const handleAIGenerate = async () => {
    if (cutTemplates.length === 0) return showError("You need to create and save at least one 'Single Cut' template first.");
    setIsGenerating(true);
    setGenerationLogs([]);
    try {
      const categoryMatch = videoScript.match(/category:\s*(.+)/i);
      const categoryStr = categoryMatch ? categoryMatch[1].trim() : "";
      addLog("Step 1: Editor extracting topics & sentences...", "info");
      
      const step1Prompt = prompt1 + "\n\nCRITICAL RULE: The 'label' for each topic MUST be 1, 2, or 3 words maximum! Do not use long phrases.";
      
      const step1Data = await callLLM(step1Prompt, `TRANSCRIPT:\n${videoScript}`, aiProvider, aiModel, false);
      const topics = step1Data.topics || [];
      if (topics.length === 0) throw new Error("AI could not find any topics in the script.");
      setCircleCount(topics.length);
      addLog(`Found ${topics.length} main topics.`, "success");
      const newTopicNodes: TopicNode[] = [];
      const newTopicCuts: Record<number, TopicCut[]> = {};
      const serverTemplatesList = cutTemplates.map(t => `- ${t.name}: ${t.description || 'General media use'}`).join('\n');
      const usedMediaUrls = new Set<string>();
      const usedVideoTitles = new Set<string>();

      const attemptSearchAndDownload = async (query: string, type: string, topicLabel: string, durationSecs?: number): Promise<string | null> => {
        addLog(`🔍 Searching DuckDuckGo: "${query}"`, "search");
        try {
          const searchRes = await fetch(`${API_BASE}/api/media/search?q=${encodeURIComponent(query)}&type=${type}`);
          const searchData = await searchRes.json();
          if (!searchData.success || !searchData.results || searchData.results.length === 0) { addLog(`⚠️ No results found for "${query}"`, "warning"); return null; }
          for (const result of searchData.results) {
            const sourceUrl = type === 'image' ? result.image : (result.content || result.url);
            if (!sourceUrl) continue;
            const cleanUrl = sourceUrl.split('?')[0];
            const titleKey = result.title ? result.title.toLowerCase().trim() : "";
            if (usedMediaUrls.has(cleanUrl)) continue;
            if (type === 'video' && titleKey && usedVideoTitles.has(titleKey)) continue;
            const isVideo = type === 'video';
            const safeTitle = topicLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 15);
            const ext = isVideo ? 'mp4' : (sourceUrl.split('.').pop()?.split('?')[0] || 'jpg').substring(0, 4).replace(/[^a-z]/g, '');
            const filename = `${type}_${safeTitle}_${Date.now()}.${ext}`;
            addLog(`⬇️ Downloading & Verifying ${isVideo ? 'Video' : type}...`, "info");
            const reqBody: any = { url: sourceUrl, filename };
            if (isVideo && durationSecs) reqBody.durationSecs = durationSecs;
            try {
              const dlRes = await fetch(isVideo ? `${API_BASE}/api/media/download-youtube` : `${API_BASE}/api/media/download`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody) });
              const dlData = await dlRes.json();
              if (dlData.success) { usedMediaUrls.add(cleanUrl); if (type === 'video' && titleKey) usedVideoTitles.add(titleKey); addLog(`✅ File Saved: ${dlData.filename}`, "success"); return dlData.filename; }
              else { addLog(`⚠️ Server rejected file (${dlData.error}). Trying next...`, "warning"); await delay(300); }
            } catch (err) { addLog(`⚠️ Download request error. Moving to next...`, "warning"); }
          }
        } catch (e) { addLog(`⚠️ Search request failed entirely.`, "error"); }
        return null;
      };

      const fetchAndVerifyMedia = async (idealQuery: string, fallbackQuery: string, type: string, topicLabel: string, durationSecs?: number): Promise<string> => {
        let result = await attemptSearchAndDownload(idealQuery, type, topicLabel, durationSecs);
        if (result) return result;
        addLog(`⚠️ Exhausted specific query. Broadening to: "${fallbackQuery}"`, "info");
        result = await attemptSearchAndDownload(fallbackQuery, type, topicLabel, durationSecs);
        if (result) return result;
        addLog(`⚠️ Exhausted all queries for "${topicLabel}". Using placeholder.`, "warning");
        return customDefaultVideo;
      };

      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        const safeTopicLabel = topic.label.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        const safeCategory = categoryStr.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
        addLog(`--- Setting up Main Circle for "${topic.label}" ---`, "info");
        const downloadedMain = await fetchAndVerifyMedia(`${safeTopicLabel} ${safeCategory}`.trim(), safeTopicLabel, 'image', topic.label);
        const topicSentences = topic.sentences && topic.sentences.length > 0 ? topic.sentences : [topic.label];
        const topicScript = topicSentences.join(' ').trim();
        const chunkedSentences: string[] = [];
        for (let j = 0; j < topicSentences.length; j += sentencesPerCut) chunkedSentences.push(topicSentences.slice(j, j + sentencesPerCut).join(' '));
        let generatedTitleAudioUrl = '', titleAudioDurationSecs = 0, generatedAudioUrl = '', audioDurationSecs = 0;
        addLog(`🎙️ Generating Title Voiceover for "${topic.label}"...`, "info");
        try {
          const endpoint = ttsProvider === 'elevenlabs' ? '/api/elevenlabs/generate' : ttsProvider === 'kokoro' ? '/api/kokoro/generate' : '/api/testing/generate';
          const titlePayload = ttsProvider === 'elevenlabs' ? { text: topic.label, voiceId: elVoiceId, index: `${i}_title` } : ttsProvider === 'kokoro' ? { text: topic.label, voiceId: kokoroVoice, index: `${i}_title` } : { text: topic.label, index: `${i}_title` };
          const titleRes = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(titlePayload) });
          const titleData = await titleRes.json();
          if (titleData.success) { 
            generatedTitleAudioUrl = titleData.filename; 
            const titleAudioSrc = generatedTitleAudioUrl.startsWith('http') ? generatedTitleAudioUrl : `${API_BASE}/${generatedTitleAudioUrl}`;
            titleAudioDurationSecs = await new Promise<number>((resolve) => { const audio = new Audio(titleAudioSrc); audio.addEventListener('loadedmetadata', () => resolve(audio.duration)); audio.addEventListener('error', () => resolve(0)); audio.load(); }); 
          }
        } catch (err: any) { addLog(`⚠️ Title Voiceover request error: ${err.message}`, "error"); }
        addLog(`🎙️ Generating Script Voiceover for "${topic.label}"...`, "info");
        try {
          const endpoint = ttsProvider === 'elevenlabs' ? '/api/elevenlabs/generate' : ttsProvider === 'kokoro' ? '/api/kokoro/generate' : '/api/testing/generate';
          const payload = ttsProvider === 'elevenlabs' ? { text: topicScript, voiceId: elVoiceId, index: i } : ttsProvider === 'kokoro' ? { text: topicScript, voiceId: kokoroVoice, index: i } : { text: topicScript, index: i };
          const ttsRes = await fetch(`${API_BASE}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const ttsData = await ttsRes.json();
          if (ttsData.success) { 
            generatedAudioUrl = ttsData.filename; addLog(`✅ Voiceover Saved: ${ttsData.filename}`, "success"); 
            const scriptAudioSrc = generatedAudioUrl.startsWith('http') ? generatedAudioUrl : `${API_BASE}/${generatedAudioUrl}`;
            audioDurationSecs = await new Promise<number>((resolve) => { const audio = new Audio(scriptAudioSrc); audio.addEventListener('loadedmetadata', () => resolve(audio.duration)); audio.addEventListener('error', () => resolve(0)); audio.load(); }); addLog(`⏱️ Voiceover Duration: ${audioDurationSecs.toFixed(2)}s`, "info"); 
          } else { addLog(`⚠️ Voiceover failed: ${ttsData.error}`, "warning"); }
        } catch (err: any) { addLog(`⚠️ Voiceover request error: ${err.message}`, "error"); }
        newTopicNodes.push({ title: topic.label, mediaUrl: downloadedMain, script: topicScript, audioUrl: generatedAudioUrl, titleAudioUrl: generatedTitleAudioUrl, titleAudioDuration: titleAudioDurationSecs });
        const stepUserText = `TOPIC: ${topic.label}\n\nSENTENCES:\n${chunkedSentences.map((s: string, idx: number) => `[${idx}] ${s}`).join('\n')}`;
        addLog(`Step 2: Director assigning layouts for "${topic.label}"...`, "info");
        const step2Data = await callLLM(`${prompt2}\n\nSERVER TEMPLATES AVAILABLE AND DESCRIPTIONS:\n${serverTemplatesList}`, stepUserText, aiProvider, aiModel, false);
        const moments = step2Data.moments || [];
        addLog(`Step 3: Researcher writing queries for "${topic.label}"...`, "info");
        const step3Data = await callLLM(prompt3, stepUserText, aiProvider, aiModel, false);
        const queries = step3Data.queries || [];
        let totalEstSecs = 0;
        const preCutsData = chunkedSentences.map((sentenceChunk: string, sIdx: number) => {
          const moment = moments.find((m: any) => m.sentence_index === sIdx) || moments[sIdx] || {};
          const fallbackDuration = Math.max(3, Math.ceil(sentenceChunk.split(/\s+/).length / 3));
          const durationSecs = moment.duration_estimate || fallbackDuration;
          totalEstSecs += durationSecs;
          return { sentence: sentenceChunk, sIdx, moment, durationSecs };
        });
        const rawAiCuts: TopicCut[] = preCutsData.map((pre) => {
          const queryItem = queries.find((q: any) => q.sentence_index === pre.sIdx) || queries[pre.sIdx] || {};
          let selectedTemplate = cutTemplates.find(t => t.name === pre.moment.template);
          if (!selectedTemplate) selectedTemplate = cutTemplates.find(t => t.elements && t.elements.some((e: any) => e.type === 'image' || e.type === 'video')) || cutTemplates[0];
          let rawAiQuery = queryItem.search_query || pre.sentence.split(/\s+/).slice(0, 4).join(' ');
          rawAiQuery = rawAiQuery.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
          let finalSecs = pre.durationSecs;
          if (audioDurationSecs > 0 && totalEstSecs > 0) finalSecs = (pre.durationSecs / totalEstSecs) * audioDurationSecs;
          let mediaType: 'image' | 'video' = 'image';
          if (selectedTemplate.elements) { if (selectedTemplate.elements.some((e: any) => e.type === 'video')) mediaType = 'video'; } else { if (selectedTemplate.showVideo) mediaType = 'video'; }
          
          const isVideoFormatCheck = isVideoFormat(pre.mediaUrl);
          if (isVideoFormatCheck) mediaType = 'video';
          
          return { id: Date.now().toString() + Math.random().toString(), templateName: selectedTemplate.name, config: selectedTemplate, duration: Math.max(10, Math.floor(finalSecs * 30)), mediaType, mediaUrl: '', searchQuery: `${rawAiQuery} ${safeCategory}`.trim(), fallbackQuery: `${safeTopicLabel} ${safeCategory}`.trim() };
        });
        addLog(`--- Fetching ${rawAiCuts.length} cuts for "${topic.label}" ---`, "info");
        for (let j = 0; j < rawAiCuts.length; j++) {
          const cut = rawAiCuts[j] as any;
          cut.mediaUrl = await fetchAndVerifyMedia(cut.searchQuery, cut.fallbackQuery, cut.mediaType, topic.label, (cut.duration / 30) + 2);
          if (isVideoFormat(cut.mediaUrl)) { cut.mediaType = 'video'; if (cut.config && cut.config.elements) { cut.config = { ...cut.config, elements: cut.config.elements.map((e: any) => e.type === 'image' ? { ...e, type: 'video' } : e) }; } }
        }
        newTopicCuts[i] = rawAiCuts;
      }
      setTopicNodes(newTopicNodes);
      setTopicCuts(newTopicCuts);
      addLog(`🎉 AI Pipeline Complete!`, "success");
      showSuccess(`AI Pipeline Complete! Dynamic audio-synced timeline generated.`);
    } catch (e: any) { addLog(`❌ Fatal Error: ${e.message}`, "error"); showError("AI Generation failed: " + e.message); }
    finally { setIsGenerating(false); }
  };

  const addTopicCut = (topicIndex: number) => {
    const defaultTemplate = cutTemplates.length > 0 ? cutTemplates[0] : null;
    if (!defaultTemplate) return showError("Please create and save a 'Single Cut' template first!");
    setTopicCuts(prev => { const existing = prev[topicIndex] || []; return { ...prev, [topicIndex]: [...(Array.isArray(existing) ? existing : []), { id: Date.now().toString(), templateName: defaultTemplate.name, config: defaultTemplate, duration: 90, mediaType: 'image', mediaUrl: '', searchQuery: '' }] }; });
  };

  const updateTopicCut = (topicIndex: number, cutId: string, updates: Partial<TopicCut>) => setTopicCuts(prev => { const existing = prev[topicIndex] || []; return { ...prev, [topicIndex]: (Array.isArray(existing) ? existing : []).map(c => c.id === cutId ? { ...c, ...updates } : c) }; });
  const removeTopicCut = (topicIndex: number, cutId: string) => setTopicCuts(prev => { const existing = prev[topicIndex] || []; return { ...prev, [topicIndex]: (Array.isArray(existing) ? existing : []).filter(c => c.id !== cutId) }; });
  const updateTopicNode = (index: number, updates: Partial<TopicNode>) => setTopicNodes(prev => { const next = [...prev]; if (next[index]) next[index] = { ...next[index], ...updates }; return next; });

  const isCurrentTemplateLocal = loadedTemplatePath && (templateDetails || []).find(t => t.name === loadedTemplatePath)?.source === 'local';
  const isCurrentPresetLocal = loadedPresetPath && (presetDetails || []).find(p => p.name === loadedPresetPath)?.source === 'local';

  return (
    <div className="flex flex-col h-screen bg-[#f4f4f2] overflow-hidden font-sans">

      {/* Render Progress Bar */}
      {isRendering && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-[#e8e8e6] p-4 shadow-lg animate-in slide-in-from-bottom-full duration-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-4">
            <div className="flex items-center gap-3 w-full md:w-auto md:min-w-[240px]">
              {renderProgress < 100 ? <Loader2 className="h-5 w-5 animate-spin text-[#555]" /> : <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
              <div>
                <p className="text-sm font-medium text-[#111]">{renderProgress < 100 ? "Exporting video..." : "Export complete!"}</p>
                <p className="text-xs text-[#888]">{renderStatus}</p>
              </div>
            </div>
            <div className="flex-grow w-full flex items-center gap-3">
              <Progress value={renderProgress} className="h-1.5 flex-grow bg-[#f0f0ee] [&>div]:bg-[#111]" />
              <span className="text-sm font-medium text-[#111] min-w-[2.5rem] text-right">{renderProgress}%</span>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="h-12 bg-white border-b border-[#e8e8e6] flex items-center justify-between px-4 z-20 shrink-0 gap-x-3">
        {/* Logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-[#111] w-7 h-7 rounded-md flex items-center justify-center">
            <svg width="12" height="12" viewBox="0 0 16 16" fill="white">
              <rect x="2" y="2" width="5" height="5" rx="1"/>
              <rect x="9" y="2" width="5" height="5" rx="1"/>
              <rect x="2" y="9" width="5" height="5" rx="1"/>
              <rect x="9" y="9" width="5" height="5" rx="1"/>
            </svg>
          </div>
          <span className="text-[13px] font-medium text-[#111] tracking-tight hidden sm:block">Remotion Studio</span>
        </div>

        {/* Template + Preset pickers */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* Template picker */}
          <div className="flex items-center bg-[#f4f4f2] border border-[#e8e8e6] rounded-lg px-1 h-8">
            <Select onValueChange={(path) => loadTemplate(path)} value={loadedTemplatePath || ""}>
              <SelectTrigger className="h-6 border-none shadow-none bg-transparent hover:bg-white focus:ring-0 text-xs font-medium w-[190px] text-[#555] px-2">
                <SelectValue placeholder="Open template..." />
              </SelectTrigger>
              <SelectContent className={SEL_CONT}>
                {Object.entries(groupedTemplates).map(([folder, items]) => items.map(item => (
                  <SelectItem key={item.path} value={item.path} className="text-xs">
                    <span className="text-[#999] mr-1">[{folder}]</span>{item.name}
                    {item.source === 'local' && <span className="ml-1.5 text-[9px] text-blue-500 font-medium">[Built-in]</span>}
                    {item.is_global && <span className="ml-1.5 text-[9px] text-emerald-500 font-medium">[Global]</span>}
                  </SelectItem>
                )))}
              </SelectContent>
            </Select>
            {loadedTemplatePath && (() => {
              const activeTpl = (templateDetails || []).find(t => t.name === loadedTemplatePath);
              const canDelete = activeTpl && activeTpl.source !== 'local' && (!activeTpl.is_global || activeTpl.user_id === user?.id);
              return (<>
                {isCurrentTemplateLocal && <Button onClick={() => saveTemplate(true)} variant="ghost" size="sm" className="h-6 w-6 p-0 text-amber-500 hover:bg-amber-50 ml-0.5"><CloudUpload className="h-3 w-3" /></Button>}
                {canDelete && <Button onClick={() => deleteTemplate(loadedTemplatePath)} variant="ghost" size="sm" className="h-6 w-6 p-0 text-[#bbb] hover:text-red-500 hover:bg-red-50 ml-0.5"><Trash2 className="h-3 w-3" /></Button>}
              </>);
            })()}
            {DIVIDER}
            <Button variant="ghost" size="sm" onClick={handleNewTemplate} className={BTN_GHOST}><FilePlus className="mr-1 h-3 w-3" />New</Button>
            {loadedTemplatePath && <Button variant="ghost" size="sm" onClick={openUpdateDialog} className={BTN_GHOST}><RefreshCw className="mr-1 h-3 w-3" />Update</Button>}
            {activeTab === 'templates' && designerMode === 'cut' && <Button variant="ghost" size="sm" onClick={() => openSaveDialog('cut')} className={BTN_GHOST}><Save className="mr-1 h-3 w-3" />Save cut</Button>}
            {activeTab === 'templates' && designerMode === 'hud' && <Button variant="ghost" size="sm" onClick={() => openSaveDialog('hud')} className={BTN_GHOST}><Save className="mr-1 h-3 w-3" />Save HUD</Button>}
          </div>

          {/* Preset picker */}
          <div className="flex items-center bg-[#f4f4f2] border border-[#e8e8e6] rounded-lg px-1 h-8">
            <Select onValueChange={(path) => loadPreset(path)} value={loadedPresetPath || ""}>
              <SelectTrigger className="h-6 border-none shadow-none bg-transparent hover:bg-white focus:ring-0 text-xs font-medium w-[140px] text-[#555] px-2">
                <SelectValue placeholder="Presets..." />
              </SelectTrigger>
              <SelectContent className={SEL_CONT}>
                {presets.length === 0 && <SelectItem value="none" disabled className="text-xs text-[#999]">No presets saved</SelectItem>}
                {(presetDetails || []).map(p => (
                  <SelectItem key={p.name} value={p.name} className="text-xs">
                    {p.name}
                    {p.source === 'local' && <span className="ml-1.5 text-[9px] text-blue-500 font-medium">[Built-in]</span>}
                    {p.is_global && <span className="ml-1.5 text-[9px] text-emerald-500 font-medium">[Global]</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {loadedPresetPath && (() => {
              const activePre = (presetDetails || []).find(p => p.name === loadedPresetPath);
              const canDelete = activePre && activePre.source !== 'local' && (!activePre.is_global || activePre.user_id === user?.id);
              return (<>
                {isCurrentPresetLocal && <Button onClick={savePreset} variant="ghost" size="sm" className="h-6 w-6 p-0 text-amber-500 hover:bg-amber-50 ml-0.5"><CloudUpload className="h-3 w-3" /></Button>}
                {canDelete && <Button onClick={() => deletePreset(loadedPresetPath)} variant="ghost" size="sm" className="h-6 w-6 p-0 text-[#bbb] hover:text-red-500 hover:bg-red-50 ml-0.5"><Trash2 className="h-3 w-3" /></Button>}
              </>);
            })()}
            {DIVIDER}
            <Button variant="ghost" size="sm" onClick={() => setIsPresetDialogOpen(true)} className={BTN_GHOST}><Globe className="mr-1 h-3 w-3" />Save</Button>
            {DIVIDER}
            <Button variant="ghost" size="sm" onClick={() => setIsImportDialogOpen(true)} className={`${BTN_GHOST} text-amber-600`}><FolderOpen className="mr-1 h-3 w-3" />Import</Button>
          </div>
        </div>

        {/* Right nav */}
        <div className="flex items-center gap-1.5 shrink-0">
          <div className="flex items-center gap-1.5 bg-[#f4f4f2] border border-[#e8e8e6] px-2.5 py-1 rounded-lg text-xs text-[#555]" title="Credits">
            <Coins className="h-3.5 w-3.5 text-amber-500" />
            <span className="font-medium">{credits.toLocaleString()}</span>
          </div>
          {DIVIDER}
          <Button onClick={() => navigate('/settings')} variant="ghost" size="sm" className={BTN_GHOST}><Settings2 className="lg:mr-1 h-3 w-3" /><span className="hidden lg:inline">Settings</span></Button>
          {DIVIDER}
          <Button onClick={() => navigate('/dashboard')} size="sm" className="h-7 text-xs bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] hover:opacity-90 text-white rounded-lg font-medium px-3 border-none">
            <Zap className="mr-1 h-3 w-3 fill-current" /><span className="hidden lg:inline">Automate</span>
          </Button>
          {DIVIDER}
          <Button onClick={() => navigate('/library')} variant="ghost" size="sm" className={BTN_GHOST}><Film className="lg:mr-1 h-3 w-3" /><span className="hidden lg:inline">Library</span></Button>
          {DIVIDER}
          <Button onClick={() => navigate('/downloader')} variant="ghost" size="sm" className={BTN_GHOST}><Search className="lg:mr-1 h-3 w-3" /><span className="hidden lg:inline">Find Media</span></Button>
          <Button onClick={handleRender} disabled={isRendering} size="sm" className="h-7 text-xs bg-[#111] hover:bg-[#333] text-white rounded-lg font-medium px-3 border-none">
            <Download className="lg:mr-1 h-3 w-3" /><span className="hidden lg:inline">Export MP4</span>
          </Button>
          {DIVIDER}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className={`${BTN_GHOST} max-w-[100px] truncate`}>
                <UserCircle className="mr-1 h-3.5 w-3.5 shrink-0" />
                <span className="truncate text-xs">{user?.email?.split('@')[0]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className={SEL_CONT}>
              <DropdownMenuItem onClick={signOut} className="text-xs cursor-pointer focus:bg-[#f3f3f1] text-red-500">Sign Out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside className="w-[400px] flex-shrink-0 bg-white border-r border-[#e8e8e6] flex flex-col z-10">
          {/* Tabs */}
          <div className="p-2.5 border-b border-[#e8e8e6] bg-[#f9f9f8]">
            <Tabs value={activeTab} onValueChange={(v: any) => setActiveTab(v)} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-white border border-[#e8e8e6] p-0.5 rounded-lg h-9">
                <TabsTrigger value="create" className="rounded-md data-[state=active]:bg-[#111] data-[state=active]:text-white text-[#888] text-[11px] font-medium h-8"><Sparkles className="mr-1 h-3 w-3" />Create</TabsTrigger>
                <TabsTrigger value="timeline" className="rounded-md data-[state=active]:bg-[#111] data-[state=active]:text-white text-[#888] text-[11px] font-medium h-8"><Scissors className="mr-1 h-3 w-3" />Timeline</TabsTrigger>
                <TabsTrigger value="style" className="rounded-md data-[state=active]:bg-[#111] data-[state=active]:text-white text-[#888] text-[11px] font-medium h-8"><Palette className="mr-1 h-3 w-3" />Style</TabsTrigger>
                <TabsTrigger value="templates" className="rounded-md data-[state=active]:bg-[#111] data-[state=active]:text-white text-[#888] text-[11px] font-medium h-8"><Square className="mr-1 h-3 w-3" />Design</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-5">

            {/* ===== CREATE TAB ===== */}
            {activeTab === 'create' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="text-center space-y-1">
                  <h2 className="text-base font-medium text-[#111] flex items-center justify-center gap-1.5"><Sparkles className="h-4 w-4 text-[#555]" />AI Auto-Pilot</h2>
                  <p className="text-xs text-[#888]">From a single topic to a fully edited video.</p>
                </div>

                <div className="bg-[#f9f9f8] border border-[#e8e8e6] rounded-xl p-4 space-y-3">
                  <div className="grid grid-cols-3 gap-2">
                    <div className="col-span-2 space-y-1">
                      <div className="flex items-center justify-between">
                        <Label className={SL}>Video topic</Label>
                        <div className="flex items-center gap-1.5 text-[9px] text-[#bbb]">
                          <span>{usedTopics.length}/{EXPLAINER_TOPICS.length} used</span>
                          {usedTopics.length > 0 && <button onClick={handleResetUsedTopics} className="text-[#555] hover:text-[#111] font-medium">reset</button>}
                        </div>
                      </div>
                      <Input placeholder="e.g. Demon Slayer Breathing Styles" value={autoScriptTopic} onChange={(e) => setAutoScriptTopic(e.target.value)} className={INP} />
                    </div>
                    <div className="space-y-1">
                      <Label className={SL}>Topics</Label>
                      <div className="flex gap-1">
                        <Input type="number" min="1" max="15" value={autoScriptCount} onChange={(e) => setAutoScriptCount(parseInt(e.target.value) || 1)} className={`${INP} font-medium`} />
                        <Button variant="outline" onClick={handleRandomizeTopic} className="h-8 w-8 p-0 border-[#e8e8e6] bg-white text-[#888] hover:bg-[#f3f3f1] rounded-lg shrink-0"><Dices className="h-3.5 w-3.5" /></Button>
                      </div>
                    </div>
                  </div>
                  <Button onClick={handleGenerateScript} disabled={isGeneratingScript || !autoScriptTopic.trim()} className="w-full h-8 bg-white border border-[#e8e8e6] text-[#555] hover:bg-[#f3f3f1] hover:text-[#111] text-xs rounded-lg">
                    {isGeneratingScript ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <AlignLeft className="mr-1.5 h-3.5 w-3.5" />}
                    {isGeneratingScript ? (scriptGenStatus || "Writing script...") : "Write script for me"}
                  </Button>
                </div>

                <div className="space-y-1.5">
                  <Label className={SL}>Review script</Label>
                  <Textarea placeholder="The generated script will appear here. You can also paste your own script directly!" value={videoScript} onChange={e => setVideoScript(e.target.value)} className="rounded-xl min-h-[180px] text-sm bg-white border-[#e8e8e6] text-[#111] focus:border-[#111] focus:ring-0 resize-none" />
                </div>

                <Button onClick={handleAIGenerate} disabled={isGenerating || !videoScript.trim()} className="w-full h-12 text-sm font-medium bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:opacity-90 text-white rounded-xl border-none">
                  {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                  {isGenerating ? "Executing pipeline..." : "Generate full video layout"}
                </Button>

                {(isGenerating || generationLogs.length > 0) && (
                  <div className="bg-[#111] rounded-xl overflow-hidden flex flex-col h-56 border border-[#222]">
                    <div className="px-3 py-2 flex items-center justify-between border-b border-[#222]">
                      <div className="flex items-center gap-2"><TerminalSquare className="h-3.5 w-3.5 text-[#666]" /><span className="text-[10px] font-medium uppercase tracking-wider text-[#666]">Pipeline log</span></div>
                      {isGenerating && <Loader2 className="h-3 w-3 animate-spin text-[#555]" />}
                    </div>
                    <div className="p-3 flex-grow overflow-y-auto font-mono text-[10px] space-y-1">
                      {generationLogs.map((log, idx) => (
                        <div key={idx} className={log.type === 'search' ? 'text-[#999]' : log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : log.type === 'error' ? 'text-red-400' : 'text-[#666]'}>
                          <span className="opacity-40 mr-2">[{new Date().toLocaleTimeString()}]</span>{log.message}
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                )}

                <Accordion type="single" collapsible className="w-full">
                  <AccordionItem value="settings" className="border border-[#e8e8e6] bg-white rounded-xl px-3">
                    <AccordionTrigger className="text-xs font-medium text-[#888] hover:no-underline py-3 hover:text-[#555]">
                      <div className="flex items-center gap-2"><Settings2 className="h-3.5 w-3.5" />Advanced pipeline settings</div>
                    </AccordionTrigger>
                    <AccordionContent className="space-y-5 pt-1 pb-4">
                      <div className="space-y-3">
                        <p className="text-[11px] font-medium text-[#555]">Script Generation AI</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1"><Label className={SL}>Provider</Label><Select value={scriptAiProvider} onValueChange={handleScriptProviderChange}><SelectTrigger className={SEL_TRIG}><SelectValue /></SelectTrigger><SelectContent className={SEL_CONT}><SelectItem value="groq" className="text-xs">Groq</SelectItem><SelectItem value="openrouter" className="text-xs">OpenRouter</SelectItem><SelectItem value="openai" className="text-xs">OpenAI</SelectItem><SelectItem value="anthropic" className="text-xs">Anthropic</SelectItem></SelectContent></Select></div>
                          <div className="space-y-1"><Label className={SL}>Model</Label><Input value={scriptAiModel} onChange={e => setScriptAiModel(e.target.value)} className={INP} /></div>
                        </div>
                      </div>
                      <div className="h-px bg-[#f0f0ee]" />
                      <div className="space-y-3">
                        <p className="text-[11px] font-medium text-[#555]">Layout & Media AI</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-1"><Label className={SL}>Provider</Label><Select value={aiProvider} onValueChange={handleProviderChange}><SelectTrigger className={SEL_TRIG}><SelectValue /></SelectTrigger><SelectContent className={SEL_CONT}><SelectItem value="groq" className="text-xs">Groq</SelectItem><SelectItem value="openrouter" className="text-xs">OpenRouter</SelectItem><SelectItem value="openai" className="text-xs">OpenAI</SelectItem><SelectItem value="anthropic" className="text-xs">Anthropic</SelectItem></SelectContent></Select></div>
                          <div className="space-y-1"><Label className={SL}>Model</Label><Input value={aiModel} onChange={e => setAiModel(e.target.value)} className={INP} /></div>
                        </div>
                        <div className="space-y-1"><Label className={SL}>Sentences per visual cut</Label><Select value={sentencesPerCut.toString()} onValueChange={(v) => setSentencesPerCut(parseInt(v))}><SelectTrigger className={SEL_TRIG}><SelectValue /></SelectTrigger><SelectContent className={SEL_CONT}><SelectItem value="1" className="text-xs">1 — Fast paced</SelectItem><SelectItem value="2" className="text-xs">2 — Balanced</SelectItem><SelectItem value="3" className="text-xs">3 — Slower paced</SelectItem><SelectItem value="4" className="text-xs">4 — Very few cuts</SelectItem></SelectContent></Select></div>
                      </div>
                      <div className="h-px bg-[#f0f0ee]" />
                      <div className="space-y-3">
                        <p className="text-[11px] font-medium text-[#555]">System prompts</p>
                        {[['0A: Outliner', promptOutline, setPromptOutline], ['0B: Segment writer', promptSegment, setPromptSegment], ['1: Editor', prompt1, setPrompt1], ['2: Director', prompt2, setPrompt2], ['3: Researcher', prompt3, setPrompt3]].map(([label, val, setter]: any) => (
                          <div key={label} className="space-y-1"><Label className={SL}>{label}</Label><Textarea value={val} onChange={e => setter(e.target.value)} className="min-h-[100px] text-[10px] font-mono bg-[#f9f9f8] border-[#e8e8e6] text-[#555] focus:border-[#111] focus:ring-0 rounded-lg resize-none" /></div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              </div>
            )}

            {/* ===== TIMELINE TAB ===== */}
            {activeTab === 'timeline' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="bg-[#f9f9f8] border border-[#e8e8e6] rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2"><Volume2 className="h-3.5 w-3.5 text-[#888]" /><span className="text-xs font-medium text-[#111]">Voice configuration</span></div>
                  <div className="space-y-1"><Label className={SL}>TTS Provider</Label>
                    <Select value={ttsProvider} onValueChange={(v: any) => setTtsProvider(v)}>
                      <SelectTrigger className={SEL_TRIG}><SelectValue /></SelectTrigger>
                      <SelectContent className={SEL_CONT}>
                        <SelectItem value="elevenlabs" className="text-xs">ElevenLabs (High Quality — Paid)</SelectItem>
                        <SelectItem value="kokoro" className="text-xs">Kokoro-82M (Local — Free)</SelectItem>
                        <SelectItem value="testing" className="text-xs">Fast Testing (Google TTS — Free)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {ttsProvider === 'elevenlabs' && (
                    <div className="space-y-3 pt-2 border-t border-[#f0f0ee]">
                      <div className="flex items-center justify-between"><Label className={`${SL} flex items-center gap-1`}><Lock className="h-2.5 w-2.5" />ElevenLabs API key</Label><span className="text-[9px] text-[#999] font-mono">Secured on server</span></div>
                      <div className="space-y-1"><Label className={SL}>Voice ID</Label><Input value={elVoiceId} onChange={(e) => setElVoiceId(e.target.value)} className={INP} /></div>
                    </div>
                  )}
                  {ttsProvider === 'kokoro' && (
                    <div className="space-y-2 pt-2 border-t border-[#f0f0ee]">
                      <div className="space-y-1"><Label className={SL}>Kokoro voice</Label>
                        <Select value={kokoroVoice} onValueChange={setKokoroVoice}>
                          <SelectTrigger className={SEL_TRIG}><SelectValue /></SelectTrigger>
                          <SelectContent className={SEL_CONT}>
                            <SelectItem value="af_bella" className="text-xs">Bella (American Female)</SelectItem>
                            <SelectItem value="af_sarah" className="text-xs">Sarah (American Female)</SelectItem>
                            <SelectItem value="am_michael" className="text-xs">Michael (American Male)</SelectItem>
                            <SelectItem value="am_adam" className="text-xs">Adam (American Male)</SelectItem>
                            <SelectItem value="bf_emma" className="text-xs">Emma (British Female)</SelectItem>
                            <SelectItem value="bm_george" className="text-xs">George (British Male)</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-[10px] text-[#999]">First generation per session takes longer to load the model.</p>
                    </div>
                  )}
                  {ttsProvider === 'testing' && (
                    <p className="text-[10px] text-[#999] pt-2 border-t border-[#f0f0ee]">Uses Google TTS — fast, free, perfect for testing visual pacing.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2"><Scissors className="h-3.5 w-3.5 text-[#888]" /><span className="text-xs font-medium text-[#111]">Timeline cuts</span></div>
                  <Accordion type="single" collapsible className="w-full space-y-1.5">
                    {Array.from({ length: circleCount }).map((_, i) => {
                      const node = topicNodes[i] || { title: `Topic ${i + 1}`, mediaUrl: customDefaultVideo };
                      const cuts = Array.isArray(topicCuts[i]) ? topicCuts[i] : [];
                      const mediaSrc = getUiMediaSrc(node.mediaUrl, customDefaultVideo);
                      const isVideoNode = isVideoFormat(mediaSrc);
                      
                      return (
                        <AccordionItem key={i} value={`topic-${i}`} className="border border-[#e8e8e6] bg-white rounded-xl px-3 overflow-hidden">
                          <AccordionTrigger className="text-xs font-medium text-[#111] hover:no-underline py-2.5 hover:text-[#333]">
                            <div className="flex items-center justify-between w-full pr-2">
                              <div className="flex items-center gap-2.5">
                                <div className="h-5 w-5 rounded-full overflow-hidden border border-[#e8e8e6] shrink-0 bg-[#f4f4f2]">
                                  {isVideoNode ? <video src={mediaSrc} className="w-full h-full object-cover" muted loop autoPlay playsInline /> : <img src={mediaSrc} alt={node.title} className="w-full h-full object-cover" />}
                                </div>
                                <span>{i + 1}. {node.title}</span>
                              </div>
                              {cuts.length > 0 && <span className="text-[9px] bg-[#f4f4f2] text-[#888] px-1.5 py-0.5 rounded-full border border-[#e8e8e6]">{cuts.length} cuts</span>}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-3 pt-1 pb-3">
                            <div className="bg-[#f9f9f8] border border-[#e8e8e6] p-3 rounded-lg space-y-2.5">
                              <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-1"><Label className={SL}>Title</Label><Input value={node.title} onChange={(e) => updateTopicNode(i, { title: e.target.value })} className={`${INP} h-7 text-[11px]`} /></div>
                                <div className="space-y-1"><Label className={SL}>Image src</Label><Input value={node.mediaUrl} onChange={(e) => updateTopicNode(i, { mediaUrl: e.target.value })} className={`${INP} h-7 text-[11px]`} /></div>
                              </div>
                              <div className="space-y-1 pt-2 border-t border-[#f0f0ee]">
                                <Label className={SL}>Topic script</Label>
                                <Textarea value={node.script || ''} onChange={(e) => updateTopicNode(i, { script: e.target.value })} placeholder={`Voiceover script for ${node.title}...`} className="min-h-[70px] text-xs rounded-lg bg-white border-[#e8e8e6] text-[#111] focus:border-[#111] focus:ring-0 resize-none" />
                              </div>
                              <Button onClick={() => generateTopicAudio(i)} className="w-full h-7 text-xs bg-[#111] hover:bg-[#333] text-white rounded-lg border-none"><Wand2 className="mr-1.5 h-3 w-3" />Generate audio for topic</Button>
                              {node.audioUrl && (
                                <div className="p-2 bg-white border border-[#e8e8e6] rounded-lg">
                                  <Label className={`${SL} block mb-1`}>Preview</Label>
                                  <audio src={node.audioUrl.startsWith('http') ? node.audioUrl : `${API_BASE}/${node.audioUrl}`} controls className="w-full h-7" />
                                </div>
                              )}
                            </div>
                            <p className={`${SL} px-0.5`}>Visual cut layers</p>
                            {cuts.length === 0 && <p className="text-[11px] text-[#bbb] italic text-center py-1">No active cuts.</p>}
                            {cuts.map((cut, cutIndex) => (
                              <div key={cut.id} className="p-2.5 border border-[#e8e8e6] rounded-lg bg-white space-y-2.5 relative group">
                                <div className="absolute right-1 top-1 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="sm" onClick={() => removeTopicCut(i, cut.id)} className="h-5 w-5 p-0 text-[#ccc] hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="h-3 w-3" /></Button></div>
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-medium text-[#999]">#{cutIndex + 1}</span>
                                  {cut.searchQuery && <span className="text-[9px] px-1.5 py-0.5 bg-[#f4f4f2] text-[#888] rounded border border-[#e8e8e6] truncate max-w-[150px]">"{cut.searchQuery}"</span>}
                                </div>
                                <div className="grid grid-cols-3 gap-1.5">
                                  <div className="col-span-2 space-y-1"><Label className={SL}>Template</Label><Select value={cut.templateName} onValueChange={(v) => updateTopicCut(i, cut.id, { templateName: v, config: cutTemplates.find(ct => ct.name === v) || {} })}><SelectTrigger className={`${SEL_TRIG} h-7 text-[11px]`}><SelectValue /></SelectTrigger><SelectContent className={SEL_CONT}>{cutTemplates.map(t => <SelectItem key={t.name} value={t.name} className="text-[11px]">{t.name}</SelectItem>)}</SelectContent></Select></div>
                                  <div className="space-y-1"><Label className={SL}>Type</Label><Select value={cut.mediaType} onValueChange={(v: 'image' | 'video') => updateTopicCut(i, cut.id, { mediaType: v })}><SelectTrigger className={`${SEL_TRIG} h-7 text-[11px] px-2`}><SelectValue /></SelectTrigger><SelectContent className={SEL_CONT}><SelectItem value="image" className="text-[11px]">IMG</SelectItem><SelectItem value="video" className="text-[11px]">VID</SelectItem></SelectContent></Select></div>
                                </div>
                                <div className="space-y-1">
                                  <Label className={SL}>Media path</Label>
                                  <div className="flex gap-1.5">
                                    <Input value={cut.mediaUrl} onChange={(e) => updateTopicCut(i, cut.id, { mediaUrl: e.target.value })} className={`${INP} h-7 text-[11px]`} />
                                    <DropdownMenu>
                                      <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-7 px-2 text-[10px] border-[#e8e8e6] bg-white text-[#888] hover:bg-[#f3f3f1] rounded-lg">Asset</Button></DropdownMenuTrigger>
                                      <DropdownMenuContent align="end" className={SEL_CONT}>{LOCAL_ASSETS.map(asset => <DropdownMenuItem key={asset.path} onClick={() => updateTopicCut(i, cut.id, { mediaUrl: asset.path })} className="text-[11px] cursor-pointer focus:bg-[#f3f3f1]">{asset.name}</DropdownMenuItem>)}</DropdownMenuContent>
                                    </DropdownMenu>
                                  </div>
                                </div>
                                <div className="space-y-1.5">
                                  <div className="flex justify-between text-[10px] text-[#999]"><span>Duration</span><span className="font-medium text-[#555]">{(cut.duration / 30).toFixed(1)}s</span></div>
                                  <Slider value={[cut.duration]} onValueChange={(v) => updateTopicCut(i, cut.id, { duration: v[0] })} min={30} max={600} step={15} className={SL_SLIDER} />
                                </div>
                              </div>
                            ))}
                            <Button size="sm" variant="outline" onClick={(e) => { e.preventDefault(); addTopicCut(i); }} className="w-full border-dashed border-[#e0e0de] text-[#bbb] hover:text-[#555] bg-white hover:bg-[#f9f9f8] h-7 text-[11px] rounded-lg"><Plus className="mr-1 h-3 w-3" />Add cut layer</Button>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              </div>
            )}

            {/* ===== STYLE TAB ===== */}
            {activeTab === 'style' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <div className="space-y-3">
                  <div className="flex items-center gap-2"><Type className="h-3.5 w-3.5 text-[#888]" /><span className="text-xs font-medium text-[#111]">Global video details</span></div>
                  <div className="space-y-1"><Label className={SL}>Headline text</Label><Input value={text} onChange={(e) => setText(e.target.value)} className={INP} /></div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1"><Label className={SL}>Font family</Label>
                      <Select value={fontFamily} onValueChange={setFontFamily}>
                        <SelectTrigger className={SEL_TRIG}><SelectValue /></SelectTrigger>
                        <SelectContent className={SEL_CONT}><SelectItem value="Bebas Neue" className="text-xs">Bebas Neue</SelectItem><SelectItem value="System" className="text-xs">System Sans</SelectItem></SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1"><Label className={SL}>Format</Label>
                      <Select value={format} onValueChange={(v: any) => setFormat(v)}>
                        <SelectTrigger className={SEL_TRIG}><SelectValue /></SelectTrigger>
                        <SelectContent className={SEL_CONT}><SelectItem value="landscape" className="text-xs">Landscape 16:9</SelectItem><SelectItem value="portrait" className="text-xs">Portrait 9:16</SelectItem></SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
                <div className="h-px bg-[#f0f0ee]" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><LayoutGrid className="h-3.5 w-3.5 text-[#888]" /><span className="text-xs font-medium text-[#111]">Grid settings</span></div>
                    <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)} className={`h-6 w-6 p-0 rounded-md ${showAdvanced ? 'bg-[#f0f0ee] text-[#555]' : 'text-[#bbb] hover:text-[#555] hover:bg-[#f3f3f1]'}`}><Settings2 className="h-3 w-3" /></Button>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] text-[#888]"><span>Topics count</span><span className="font-medium text-[#555]">{circleCount}</span></div>
                      <Slider value={[circleCount]} onValueChange={(v) => setCircleCount(v[0])} min={1} max={15} step={1} className={SL_SLIDER} />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label htmlFor="show-border-explainer" className={SL}>Show grid borders</Label>
                      <Switch id="show-border-explainer" checked={showBorder} onCheckedChange={setShowBorder} className="scale-75 origin-right data-[state=unchecked]:bg-[#e8e8e6] data-[state=checked]:bg-[#111]" />
                    </div>
                    {showAdvanced && (
                      <div className="pt-3 space-y-3 border-t border-[#f0f0ee] animate-in fade-in duration-200">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5"><Label className={SL}>Cols</Label><Slider value={[currentGrid.cols]} onValueChange={(v) => setGridConfigs(prev => ({ ...prev, [circleCount]: { ...prev[circleCount], cols: v[0] } }))} min={1} max={10} step={1} className={SL_SLIDER} /></div>
                          <div className="space-y-1.5"><Label className={SL}>Rows</Label><Slider value={[currentGrid.rows]} onValueChange={(v) => setGridConfigs(prev => ({ ...prev, [circleCount]: { ...prev[circleCount], rows: v[0] } }))} min={1} max={10} step={1} className={SL_SLIDER} /></div>
                        </div>
                        <div className="space-y-1.5"><Label className={SL}>Size ({currentGrid.customCircleSize}px)</Label><Slider value={[currentGrid.customCircleSize]} onValueChange={(v) => setGridConfigs(prev => ({ ...prev, [circleCount]: { ...prev[circleCount], customCircleSize: v[0] } }))} min={100} max={500} step={10} className={SL_SLIDER} /></div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1.5"><Label className={SL}>H-Spacing</Label><Slider value={[currentGrid.hSpacing]} onValueChange={(v) => setGridConfigs(prev => ({ ...prev, [circleCount]: { ...prev[circleCount], hSpacing: v[0] } }))} min={0} max={500} step={1} className={SL_SLIDER} /></div>
                          <div className="space-y-1.5"><Label className={SL}>V-Spacing</Label><Slider value={[currentGrid.vSpacing]} onValueChange={(v) => setGridConfigs(prev => ({ ...prev, [circleCount]: { ...prev[circleCount], vSpacing: v[0] } }))} min={0} max={500} step={1} className={SL_SLIDER} /></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="h-px bg-[#f0f0ee]" />
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-[#888]" /><span className="text-xs font-medium text-[#111]">HUD tracking</span></div>
                    <Switch checked={hudEnabled} onCheckedChange={setHudEnabled} className="scale-75 origin-right data-[state=unchecked]:bg-[#e8e8e6] data-[state=checked]:bg-[#111]" />
                  </div>
                  {hudEnabled && (
                    <div className="space-y-2 animate-in fade-in duration-200">
                      <Select onValueChange={(v: string) => { const tpl = fullTemplates.find(t => t.name === v); if (tpl) { setHudTitleColor(tpl.hudTitleColor ?? '#ffffff'); setHudProgressColor(tpl.hudProgressColor ?? '#e2e8f0'); setHudShowTitle(tpl.hudShowTitle ?? true); setHudShowImage(tpl.hudShowImage ?? true); setHudShowProgress(tpl.hudShowProgress ?? true); setHudTitleShadow(tpl.hudTitleShadow ?? true); setHudImageShadow(tpl.hudImageShadow ?? true); setHudProgressBarShadow(tpl.hudProgressBarShadow ?? true); showSuccess("HUD Settings Applied!"); } }}>
                        <SelectTrigger className={SEL_TRIG}><SelectValue placeholder="Apply saved HUD style..." /></SelectTrigger>
                        <SelectContent className={SEL_CONT}>{hudTemplates.length === 0 ? <SelectItem value="none" disabled className="text-xs">No HUD templates saved</SelectItem> : hudTemplates.map(t => <SelectItem key={t.name} value={t.name} className="text-xs">{t.name}{t.name === defaultHudName && " (Default)"}</SelectItem>)}</SelectContent>
                      </Select>
                      <p className="text-[10px] text-[#999]">HUD automatically tracks the active topic image and duration.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ===== DESIGN TAB ===== */}
            {activeTab === 'templates' && (
              <div className="space-y-5 animate-in fade-in duration-200">
                <Tabs value={designerMode} onValueChange={(v: any) => setDesignerMode(v)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-white border border-[#e8e8e6] p-0.5 rounded-lg h-8">
                    <TabsTrigger value="cut" className="rounded-md data-[state=active]:bg-[#111] data-[state=active]:text-white text-[#888] text-[11px] font-medium h-7"><Scissors className="mr-1 h-3 w-3" />Cut Layout</TabsTrigger>
                    <TabsTrigger value="hud" className="rounded-md data-[state=active]:bg-[#111] data-[state=active]:text-white text-[#888] text-[11px] font-medium h-7"><Target className="mr-1 h-3 w-3" />HUD Overlay</TabsTrigger>
                  </TabsList>

                  <TabsContent value="cut" className="space-y-4 pt-3">
                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between bg-[#f9f9f8] border border-[#e8e8e6] rounded-lg px-3 py-2">
                        <Label htmlFor="show-border" className={SL}>Show grid borders</Label>
                        <Switch id="show-border" checked={showBorder} onCheckedChange={setShowBorder} className="scale-75 origin-right data-[state=unchecked]:bg-[#e8e8e6] data-[state=checked]:bg-[#111]" />
                      </div>
                      <div className="space-y-1"><Label className={SL}>AI director definition</Label><Textarea placeholder="Describe when to use this layout (e.g. 'Use when explaining stats')" value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} className="h-14 text-xs bg-white border-[#e8e8e6] text-[#111] focus:border-[#111] focus:ring-0 rounded-lg resize-none" /></div>
                    </div>
                    <div className="h-px bg-[#f0f0ee]" />
                    <div className="space-y-3">
                      <div className="flex items-center gap-2"><LayoutGrid className="h-3.5 w-3.5 text-[#888]" /><span className="text-xs font-medium text-[#111]">Canvas elements</span></div>
                      {elements.map((el) => (
                        <div key={el.id} className="border border-[#e8e8e6] bg-white rounded-xl p-3 space-y-3 relative group">
                          <div className="absolute right-1.5 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="sm" onClick={() => removeCutElement(el.id)} className="h-5 w-5 p-0 text-[#ccc] hover:text-red-500 hover:bg-red-50 rounded"><Trash2 className="h-3 w-3" /></Button></div>
                          <div className="flex items-center justify-between pr-6">
                            <div className="flex items-center gap-2 text-[#555] text-xs font-medium">
                              {el.type === 'image' && <ImageIcon className="h-3.5 w-3.5 text-[#888]" />}{el.type === 'video' && <Film className="h-3.5 w-3.5 text-[#888]" />}{el.type === 'ruler' && <Ruler className="h-3.5 w-3.5 text-[#888]" />}{el.type === 'arrow' && <Navigation className="h-3.5 w-3.5 text-[#888]" />}<span className="capitalize">{el.type} block</span>
                            </div>
                            <Button variant="ghost" size="sm" onClick={() => updateCutElement(el.id, { x: 0, y: 0, rotation: 0 })} className="h-5 px-1.5 text-[9px] font-medium text-[#bbb] hover:text-[#555] hover:bg-[#f3f3f1] rounded">Center</Button>
                          </div>
                          <div className="space-y-3">
                            {(el.type === 'image' || el.type === 'video') && (
                              <div className="space-y-1">
                                <div className="flex items-center justify-between"><Label className={SL}>Mock path</Label>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-4 px-1.5 text-[9px] text-[#bbb] hover:text-[#555] hover:bg-[#f3f3f1] font-medium rounded">Asset</Button></DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className={SEL_CONT}>{LOCAL_ASSETS.map(asset => <DropdownMenuItem key={asset.path} onClick={() => updateCutElement(el.id, { url: asset.path })} className="text-[11px] cursor-pointer focus:bg-[#f3f3f1]">{asset.name}</DropdownMenuItem>)}</DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                                <Input value={el.url || ''} onChange={(e) => updateCutElement(el.id, { url: e.target.value })} className={`${INP} h-7 text-[11px]`} />
                              </div>
                            )}
                            {el.type === 'arrow' && (
                              <div className="space-y-1"><Label className={SL}>Tint</Label>
                                <div className="flex gap-1.5"><Input type="color" value={el.color || '#ef4444'} onChange={(e) => updateCutElement(el.id, { color: e.target.value })} className="h-8 w-10 p-0.5 rounded-md cursor-pointer border-[#e8e8e6]" /><Input value={el.color || '#ef4444'} onChange={(e) => updateCutElement(el.id, { color: e.target.value })} className={`${INP} h-8 font-mono text-[11px] uppercase`} /></div>
                              </div>
                            )}
                            <div className="grid grid-cols-2 gap-2.5">
                              <div className="space-y-1.5"><Label className={SL}>Size ({el.size}%)</Label><Slider value={[el.size]} onValueChange={(v) => updateCutElement(el.id, { size: v[0] })} min={5} max={100} step={1} className={SL_SLIDER} /></div>
                              {(el.type === 'ruler' || el.type === 'arrow') && <div className="space-y-1.5"><Label className={SL}>Rotation ({el.rotation || 0}°)</Label><Slider value={[el.rotation || 0]} onValueChange={(v) => updateCutElement(el.id, { rotation: v[0] })} min={0} max={360} step={1} className={SL_SLIDER} /></div>}
                              <div className="space-y-1.5"><Label className={SL}>Pos X ({el.x}px)</Label><Slider value={[el.x]} onValueChange={(v) => updateCutElement(el.id, { x: v[0] })} min={-1000} max={1000} step={1} className={SL_SLIDER} /></div>
                              <div className="space-y-1.5"><Label className={SL}>Pos Y ({el.y}px)</Label><Slider value={[el.y]} onValueChange={(v) => updateCutElement(el.id, { y: v[0] })} min={-1000} max={1000} step={1} className={SL_SLIDER} /></div>
                            </div>
                          </div>
                        </div>
                      ))}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="outline" className="w-full border-dashed border-[#e0e0de] text-[#bbb] hover:text-[#555] bg-white hover:bg-[#f9f9f8] h-9 rounded-xl text-xs"><Plus className="mr-1.5 h-3.5 w-3.5" />Add component</Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="center" className={`${SEL_CONT} w-56 p-1`}>
                          <DropdownMenuItem onClick={() => addCutElement('image')} className="cursor-pointer text-xs py-2 focus:bg-[#f3f3f1]"><ImageIcon className="mr-2 h-3.5 w-3.5 text-[#888]" />Image graphic</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addCutElement('video')} className="cursor-pointer text-xs py-2 focus:bg-[#f3f3f1]"><Film className="mr-2 h-3.5 w-3.5 text-[#888]" />Video graphic</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addCutElement('ruler')} className="cursor-pointer text-xs py-2 focus:bg-[#f3f3f1]"><Ruler className="mr-2 h-3.5 w-3.5 text-[#888]" />Measurement ruler</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => addCutElement('arrow')} className="cursor-pointer text-xs py-2 focus:bg-[#f3f3f1]"><Navigation className="mr-2 h-3.5 w-3.5 text-[#888]" />Focus arrow</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </TabsContent>

                  <TabsContent value="hud" className="space-y-4 pt-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-[#888]" /><span className="text-xs font-medium text-[#111]">HUD configuration</span></div>
                      <Button onClick={handleSetDefaultHud} variant="outline" size="sm" className="h-7 px-2 text-[10px] border-[#e8e8e6] bg-white text-[#555] hover:bg-[#f3f3f1] rounded-lg"><Star className="mr-1 h-3 w-3 text-amber-400" />Set default</Button>
                    </div>
                    <div className="space-y-2">
                      {[
                        { label: 'Active title', show: hudShowTitle, setShow: setHudShowTitle, shadow: hudTitleShadow, setShadow: setHudTitleShadow, icon: <Type className="h-3 w-3 text-[#888]" /> },
                        { label: 'Profile image', show: hudShowImage, setShow: setHudShowImage, shadow: hudImageShadow, setShadow: setHudImageShadow, icon: <ImageIcon className="h-3 w-3 text-[#888]" /> },
                        { label: 'Progress track', show: hudShowProgress, setShow: setHudShowProgress, shadow: hudProgressBarShadow, setShadow: setHudProgressBarShadow, icon: <Target className="h-3 w-3 text-[#888]" /> },
                      ].map((item) => (
                        <div key={item.label} className="border border-[#e8e8e6] bg-white rounded-xl p-3 space-y-2">
                          <div className="flex items-center justify-between">
                            <Label className="text-xs font-medium text-[#111] flex items-center gap-1.5">{item.icon}{item.label}</Label>
                            <Switch checked={item.show} onCheckedChange={item.setShow} className="scale-75 origin-right data-[state=unchecked]:bg-[#e8e8e6] data-[state=checked]:bg-[#111]" />
                          </div>
                          {item.show && <div className="flex items-center justify-between pt-2 border-t border-[#f0f0ee]"><Label className={SL}>Drop shadow</Label><Switch checked={item.shadow} onCheckedChange={item.setShadow} className="scale-75 origin-right data-[state=unchecked]:bg-[#e8e8e6] data-[state=checked]:bg-[#111]" /></div>}
                        </div>
                      ))}
                    </div>
                    <div className="h-px bg-[#f0f0ee]" />
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1"><Label className={SL}>Title color</Label><div className="flex gap-1.5"><Input type="color" value={hudTitleColor} onChange={(e) => setHudTitleColor(e.target.value)} className="h-8 w-9 p-0.5 rounded-md cursor-pointer border-[#e8e8e6]" /><Input value={hudTitleColor} onChange={(e) => setHudTitleColor(e.target.value)} className={`${INP} font-mono text-[11px] uppercase`} /></div></div>
                      <div className="space-y-1"><Label className={SL}>Track color</Label><div className="flex gap-1.5"><Input type="color" value={hudProgressColor} onChange={(e) => setHudProgressColor(e.target.value)} className="h-8 w-9 p-0.5 rounded-md cursor-pointer border-[#e8e8e6]" /><Input value={hudProgressColor} onChange={(e) => setHudProgressColor(e.target.value)} className={`${INP} font-mono text-[11px] uppercase`} /></div></div>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            )}
          </div>
        </aside>

        {/* Canvas */}
        <main className="flex-1 bg-[#f4f4f2] relative flex flex-col items-center justify-center p-4 md:p-10 overflow-hidden" style={{ backgroundImage: 'radial-gradient(circle, #d4d4d0 1px, transparent 1px)', backgroundSize: '20px 20px' }}>
          <div className={`w-full ${format === 'portrait' ? 'max-w-[38vh] aspect-[9/16]' : 'max-w-5xl aspect-video'} bg-black rounded-xl overflow-hidden relative z-10 border border-[#e0e0de] shadow-xl transition-all duration-300`}>
            <Player
              component={MyComposition}
              durationInFrames={durationInFrames}
              compositionWidth={format === 'portrait' ? 1080 : 1920}
              compositionHeight={format === 'portrait' ? 1920 : 1080}
              fps={30}
              style={{ width: '100%', height: '100%' }}
              controls
              inputProps={{ text, template: playerTemplate as 'explainer' | 'cut' | 'hud', format, circleCount, fontFamily, hSpacing: currentGrid.hSpacing, vSpacing: currentGrid.vSpacing, customCircleSize: currentGrid.customCircleSize, cols: currentGrid.cols, rows: currentGrid.rows, elements, showBorder, topicCuts, topicNodes, hudEnabled, hudTitleColor, hudProgressColor, hudShowTitle, hudShowImage, hudShowProgress, hudTitleShadow, hudImageShadow, hudProgressBarShadow, defaultVideo: customDefaultVideo }}
            />
          </div>
        </main>
      </div>

      {/* Save Template Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="bg-white border-[#e8e8e6] rounded-2xl shadow-xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium text-[#111]">{saveMode === 'new' ? `Save new ${saveFolder === 'cut' ? 'cut' : 'HUD'} template` : 'Update template'}</DialogTitle>
            <DialogDescription className="text-xs text-[#888]">{saveMode === 'new' ? 'Give your template a name to save it to the cloud.' : `Update "${loadedTemplatePath}" with current settings.`}</DialogDescription>
          </DialogHeader>
          {saveMode === 'new' && <Input placeholder="Template name" value={newTemplateName} onChange={(e) => setNewTemplateName(e.target.value)} className={INP} onKeyDown={(e) => e.key === 'Enter' && saveTemplate()} />}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)} className="h-8 text-xs border-[#e8e8e6] bg-white text-[#555] hover:bg-[#f3f3f1] rounded-lg">Cancel</Button>
            <Button onClick={() => saveTemplate()} className="h-8 text-xs bg-[#111] hover:bg-[#333] text-white rounded-lg border-none">Save to cloud</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Preset Dialog */}
      <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
        <DialogContent className="bg-white border-[#e8e8e6] rounded-2xl shadow-xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium text-[#111]">Save global preset</DialogTitle>
            <DialogDescription className="text-xs text-[#888]">Save your current AI providers, prompts, voice settings, and grid config.</DialogDescription>
          </DialogHeader>
          <Input placeholder="Preset name" value={newPresetName} onChange={(e) => setNewPresetName(e.target.value)} className={INP} onKeyDown={(e) => e.key === 'Enter' && savePreset()} />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPresetDialogOpen(false)} className="h-8 text-xs border-[#e8e8e6] bg-white text-[#555] hover:bg-[#f3f3f1] rounded-lg">Cancel</Button>
            <Button onClick={savePreset} disabled={!newPresetName} className="h-8 text-xs bg-[#111] hover:bg-[#333] text-white rounded-lg border-none">Save preset</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="bg-white border-[#e8e8e6] rounded-2xl shadow-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-medium text-[#111]">Import built-in files to cloud</DialogTitle>
            <DialogDescription className="text-xs text-[#888]">Select local templates and presets to upload to your cloud account.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-60 overflow-y-auto py-1">
            {templates.filter(t => (templateDetails || []).find(td => td.name === t)?.source === 'local').map(t => (
              <div key={t} className="flex items-center gap-2">
                <Checkbox id={`t-${t}`} checked={localTemplatesToImport.includes(t)} onCheckedChange={(c) => setLocalTemplatesToImport(prev => c ? [...prev, t] : prev.filter(x => x !== t))} />
                <label htmlFor={`t-${t}`} className="text-xs text-[#555] cursor-pointer">[Template] {t}</label>
              </div>
            ))}
            {presets.filter(p => (presetDetails || []).find(pd => pd.name === p)?.source === 'local').map(p => (
              <div key={p} className="flex items-center gap-2">
                <Checkbox id={`p-${p}`} checked={localPresetsToImport.includes(p)} onCheckedChange={(c) => setLocalPresetsToImport(prev => c ? [...prev, p] : prev.filter(x => x !== p))} />
                <label htmlFor={`p-${p}`} className="text-xs text-[#555] cursor-pointer">[Preset] {p}</label>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)} className="h-8 text-xs border-[#e8e8e6] bg-white text-[#555] hover:bg-[#f3f3f1] rounded-lg">Cancel</Button>
            <Button onClick={handleUploadLocalToCloud} className="h-8 text-xs bg-[#111] hover:bg-[#333] text-white rounded-lg border-none">Import to cloud</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoEditor;