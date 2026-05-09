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
  TerminalSquare, Mic, Volume2, Navigation, Ruler, RefreshCw, FilePlus, Dices, Star, Activity, Globe, UserCircle, CloudUpload, FolderOpen, Lock, Coins
} from 'lucide-react';
import { showSuccess, showError, showLoading, dismissToast } from '@/utils/toast';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

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

const DEFAULT_PROMPT_OUTLINE = `You are a master YouTube documentary producer. Given a main topic and a desired number of segments, create a logical, engaging outline of sub-topics or characters to cover.
Ensure there are EXACTLY the requested number of subtopics. Be highly specific with the subtopic names so the writer knows exactly what to cover.
CRITICAL RULE: Keep the subtopic names VERY SHORT (maximum 2-4 words). Do not use long sentences. They must fit cleanly on screen as titles.
OUTPUT EXACT JSON STRUCTURE:
{ "subtopics": ["<Short Title 1>", "<Short Title 2>"] }`;

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

const DEFAULT_PROMPT_1 = `You are an editor. Analyze the explainer transcript and output ONLY a valid JSON object. No markdown.\n\nYour job:\n1. Identify all main topics/characters being explained.\n2. Break down the text for each topic into DISTINCT, SHORT SENTENCES (or visual beats) into an array. Do not lump multiple visual ideas into one sentence. Each sentence will become a separate video cut.\n\nOUTPUT EXACT JSON STRUCTURE: \n{ "topics": [ { "label": "<Full Topic Name>", "sentences": ["<Sentence 1>", "<Sentence 2>", "<Sentence 3>"] } ] }`;
const DEFAULT_PROMPT_2 = `You are a video layout director. You will receive a specific topic and its exact sentences. Output ONLY a valid JSON object. No markdown.\n\nYour job: For EVERY SINGLE SENTENCE provided, pick the best template from the SERVER TEMPLATES list to represent it visually. Do NOT generate search queries. Read the descriptions of the templates carefully to know when to use them!\n\nRULES:\n1. You MUST output exactly one moment per sentence provided.\n2. Estimate the duration for each sentence (~3 words = 1 second). Minimum 3s.\n3. If there are video templates (ones with 'vid' in the name), use them SPARINGLY (maximum ONCE per topic). Use image templates for the rest.\n\nOUTPUT EXACT JSON STRUCTURE: \n{ "label": "<Topic Name>", "moments": [ { "sentence_index": <number>, "template": "<Template Name>", "duration_estimate": <seconds> } ] }`;
const DEFAULT_PROMPT_3 = `You are a media researcher. You will receive a specific topic and its exact sentences. Output ONLY a valid JSON object. No markdown.\n\nYour job: For EVERY SINGLE SENTENCE, generate a CLEAN, 3-5 word 'search_query' for finding an image or video that perfectly matches that sentence visually.\n\nRULES:\n1. The system searches DuckDuckGo. Do NOT use special characters, quotes, or parentheses.\n2. Do NOT use abstract concepts. Use concrete visual keywords (e.g., use "vintage 1950s computer lab" instead of "Early enthusiasm for machine solving").\n\nOUTPUT EXACT JSON STRUCTURE: \n{ "label": "<Topic Name>", "queries": [ { "sentence_index": <number>, "search_query": "<3-5 words>" } ] }`;

const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

const getUiMediaSrc = (url: string, defaultUrl: string) => {
  if (!url) return defaultUrl;
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  return url.startsWith('/') ? url : `/${url}`;
};

type LogEntry = {
  message: string;
  type: 'info' | 'success' | 'warning' | 'search' | 'error';
};

const VideoEditor = () => {
  const navigate = useNavigate();
  const { user, credits, signOut } = useAuth();
  
  const [customDefaultVideo, setCustomDefaultVideo] = useState<string>('placeholder.mp4');

  const [text, setText] = useState("Explainer Video");
  const [template, setTemplate] = useState<'explainer' | 'cut' | 'hud' | 'voice'>('explainer');
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
  
  // UI Templates (Visuals)
  const [loadedTemplatePath, setLoadedTemplatePath] = useState<string | null>(null);
  const [templateDescription, setTemplateDescription] = useState("");
  const [templates, setTemplates] = useState<string[]>([]);
  const [templateDetails, setTemplateDetails] = useState<any[]>([]);
  const [fullTemplates, setFullTemplates] = useState<any[]>([]);
  
  // Global Presets
  const [presets, setPresets] = useState<string[]>([]);
  const [presetDetails, setPresetDetails] = useState<any[]>([]);
  const [loadedPresetPath, setLoadedPresetPath] = useState<string | null>(null);
  const [isPresetDialogOpen, setIsPresetDialogOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState("");

  const [newTemplateName, setNewTemplateName] = useState("");
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [saveMode, setSaveMode] = useState<'new' | 'update'>('new');
  const [saveFolder, setSaveFolder] = useState<'cut' | 'hud'>('cut');

  // Import Dialog
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

  // TTS Settings
  const [ttsProvider, setTtsProvider] = useState<'elevenlabs' | 'kokoro' | 'testing'>('testing');
  const [elVoiceId, setElVoiceId] = useState('ErXwobaYiN019PkySvjV');
  const [kokoroVoice, setKokoroVoice] = useState('af_bella');

  const [topicNodes, setTopicNodes] = useState<TopicNode[]>([]);
  const [topicCuts, setTopicCuts] = useState<Record<number, TopicCut[]>>({});

  const [isAIOpen, setIsAIOpen] = useState(false);
  
  // Pipeline AI Settings
  const [aiProvider, setAiProvider] = useState('groq');
  const [aiModel, setAiModel] = useState('llama-3.1-8b-instant');
  
  // Script Generation AI Settings
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
      supabase.from('profiles').select('placeholder_url').eq('id', user.id).single().then(({ data }) => {
        if (data?.placeholder_url) {
          setCustomDefaultVideo(data.placeholder_url);
        }
      });
    }
  }, [user]);

  const LOCAL_ASSETS = [
    { name: 'System Default Placeholder', path: 'placeholder.mp4' },
    ...(customDefaultVideo && customDefaultVideo !== 'placeholder.mp4' ? [{ name: 'My Custom Placeholder', path: customDefaultVideo }] : [])
  ];

  let explainerDuration = 60; 
  for (let i = 0; i < circleCount; i++) {
    const cuts = topicCuts[i] || [];
    const cutsDuration = cuts.reduce((sum, cut) => sum + (cut.duration || 90), 0);
    const node = topicNodes[i];
    const preCutStay = node?.titleAudioDuration ? Math.max(60, Math.ceil(node.titleAudioDuration * 30) + 15) : 60;
    explainerDuration += 30 + preCutStay + cutsDuration + 30; 
  }

  const durationInFrames = (template === 'explainer' || template === 'voice') ? explainerDuration : 150;

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
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
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

      const resT = await fetch('http://localhost:3001/api/templates', { headers });
      const dataT = await resT.json();
      if (dataT.success) {
        setTemplates(dataT.templates);
        setTemplateDetails(dataT.templateDetails);
        const full = await Promise.all(dataT.templates.map(async (name: string) => {
          const r = await fetch(`http://localhost:3001/api/templates/${name}`, { headers });
          const d = await r.json();
          return { name, ...d.config };
        }));
        setFullTemplates(full);
      }

      const resP = await fetch('http://localhost:3001/api/presets', { headers });
      const dataP = await resP.json();
      if (dataP.success) {
        setPresets(dataP.presets);
        setPresetDetails(dataP.presetDetails);
        if (!loadedPresetPath && dataP.presets.includes('default')) {
          loadPreset('default');
        }
      }
    } catch (e) {
      console.error("Failed to fetch data", e);
    }
  };

  useEffect(() => {
    fetchTemplatesAndPresets();
  }, []);

  const loadPreset = async (name: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = session ? { 'Authorization': `Bearer ${session.access_token}` } : {};
      
      const res = await fetch(`http://localhost:3001/api/presets/${name}`, { headers });
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
    } catch (e) {
      showError("Failed to load preset");
    }
  };

  const savePreset = async () => {
    if (!newPresetName) return;
    const config = {
      aiProvider, aiModel,
      scriptAiProvider, scriptAiModel,
      ttsProvider, elVoiceId, kokoroVoice,
      promptOutline, promptSegment, prompt1, prompt2, prompt3,
      sentencesPerCut, gridConfigs, defaultHudName, fontFamily, format
    };
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch('http://localhost:3001/api/presets', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: newPresetName, config })
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`Preset "${newPresetName}" saved to cloud!`);
        setIsPresetDialogOpen(false);
        setLoadedPresetPath(newPresetName);
        fetchTemplatesAndPresets();
      }
    } catch (e) {
      showError("Failed to save preset");
    }
  };

  const deletePreset = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the global preset "${name}"?`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(`http://localhost:3001/api/presets/${name}`, { method: 'DELETE', headers });
      if (res.ok) {
        showSuccess(`Deleted preset "${name}"`);
        if (loadedPresetPath === name) setLoadedPresetPath(null);
        fetchTemplatesAndPresets();
      } else {
        const errorData = await res.json();
        showError("Failed to delete preset: " + (errorData.error || res.statusText));
      }
    } catch (e: any) {
      showError("Failed to delete preset: " + e.message);
    }
  };

  const openSaveDialog = (folder: 'cut' | 'hud') => {
    setSaveMode('new');
    setSaveFolder(folder);
    setNewTemplateName('');
    setIsSaveDialogOpen(true);
  };

  const openUpdateDialog = () => {
    setSaveMode('update');
    setIsSaveDialogOpen(true);
  };

  const handleSetDefaultHud = () => {
    if (!loadedTemplatePath) return showError("Please select a HUD template from the dropdown first.");
    setDefaultHudName(loadedTemplatePath);
    showSuccess(`${loadedTemplatePath} is now your default HUD! (Remember to Save Global Preset to keep it)`);
  }

  const saveGridLayout = () => {
    setGridConfigs(prev => ({
      ...prev,
      [circleCount]: { hSpacing: currentGrid.hSpacing, vSpacing: currentGrid.vSpacing, customCircleSize: currentGrid.customCircleSize, cols: currentGrid.cols, rows: currentGrid.rows }
    }));
    showSuccess(`Grid layout updated! (Remember to Save Global Preset to keep it permanently)`);
  };

  const saveTemplate = async (isManualCloudUpload = false) => {
    if (saveMode === 'new' && !newTemplateName && !isManualCloudUpload) return;
    
    const config = {
      description: templateDescription,
      text, template: saveMode === 'new' ? saveFolder : template, 
      format,
      circleCount, fontFamily, 
      hSpacing: currentGrid.hSpacing, 
      vSpacing: currentGrid.vSpacing, 
      customCircleSize: currentGrid.customCircleSize, 
      cols: currentGrid.cols, 
      rows: currentGrid.rows, 
      elements, showBorder, topicCuts, topicNodes,
      hudEnabled, hudTitleColor, hudProgressColor, 
      hudShowTitle, hudShowImage, hudShowProgress,
      hudTitleShadow, hudImageShadow, hudProgressBarShadow
    };

    const payloadName = (saveMode === 'update' || isManualCloudUpload) ? loadedTemplatePath : newTemplateName;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch('http://localhost:3001/api/templates', {
        method: 'POST',
        headers,
        body: JSON.stringify({ name: payloadName, config, folder: saveMode === 'new' ? saveFolder : undefined }),
      });
      const data = await res.json();
      if (data.success) {
        showSuccess(`Template "${payloadName}" saved to Cloud!`);
        setIsSaveDialogOpen(false);
        setLoadedTemplatePath(data.path || payloadName || "");
        fetchTemplatesAndPresets();
      }
    } catch (e) {
      showError("Failed to save template to cloud");
    }
  };

  const deleteTemplate = async (name: string) => {
    if (!confirm(`Are you sure you want to delete the visual template "${name}"?`)) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      const res = await fetch(`http://localhost:3001/api/templates/${name}`, { method: 'DELETE', headers });
      if (res.ok) {
        showSuccess(`Deleted template "${name}"`);
        if (loadedTemplatePath === name) handleNewTemplate();
        fetchTemplatesAndPresets();
      } else {
        const errorData = await res.json();
        showError("Failed to delete template: " + (errorData.error || res.statusText));
      }
    } catch (e: any) {
      showError("Failed to delete template: " + e.message);
    }
  };

  const handleNewTemplate = () => {
    setLoadedTemplatePath(null);
    setTemplateDescription('');
    setElements([{ id: '1', type: 'image', url: '', x: 0, y: 0, size: 70 }]);
    setTopicCuts({});
    setHudEnabled(false);
    showSuccess("Started a new empty template.");
  };

  const loadTemplate = async (path: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = session ? { 'Authorization': `Bearer ${session.access_token}` } : {};

      const res = await fetch(`http://localhost:3001/api/templates/${path}`, { headers });
      const data = await res.json();
      if (data.success) {
        const c = data.config;
        setText(c.text);
        setTemplate(c.template || 'explainer');
        
        const loadedCircleCount = c.circleCount || 4;
        setGridConfigs(prev => ({
          ...prev,
          [loadedCircleCount]: {
            ...prev[loadedCircleCount],
            hSpacing: c.hSpacing ?? prev[loadedCircleCount].hSpacing,
            vSpacing: c.vSpacing ?? prev[loadedCircleCount].vSpacing,
            customCircleSize: c.customCircleSize ?? prev[loadedCircleCount].customCircleSize,
            cols: c.cols ?? prev[loadedCircleCount].cols,
            rows: c.rows ?? prev[loadedCircleCount].rows,
          }
        }));
        
        setCircleCount(loadedCircleCount);
        setFontFamily(c.fontFamily || 'Bebas Neue');
        if (c.format) setFormat(c.format);
        setTemplateDescription(c.description || "");
        
        if (c.elements) {
          setElements(c.elements);
        } else {
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

        if (c.topicNodes && c.topicNodes.length > 0) {
          setTopicNodes(c.topicNodes);
        }
        setLoadedTemplatePath(path);
        showSuccess(`Loaded "${path}" from ${data.source === 'cloud' ? 'Cloud' : 'Local'}!`);
      }
    } catch (e) {
      showError("Failed to load template");
    }
  };

  const handleUploadLocalToCloud = async () => {
    if (localTemplatesToImport.length === 0 && localPresetsToImport.length === 0) {
      return showError("Please select at least one file to import.");
    }
    
    const toastId = showLoading("Importing files to cloud...");
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers: any = { 'Content-Type': 'application/json' };
      if (session) headers['Authorization'] = `Bearer ${session.access_token}`;

      let uploaded = 0;
      for (const tName of localTemplatesToImport) {
        const res = await fetch(`http://localhost:3001/api/templates/${tName}?source=local`, { headers });
        const data = await res.json();
        if (data.success && data.config) {
          await fetch('http://localhost:3001/api/templates', { method: 'POST', headers, body: JSON.stringify({ name: tName, config: data.config }) });
          uploaded++;
        }
      }
      for (const pName of localPresetsToImport) {
        const res = await fetch(`http://localhost:3001/api/presets/${pName}?source=local`, { headers });
        const data = await res.json();
        if (data.success && data.config) {
          await fetch('http://localhost:3001/api/presets', { method: 'POST', headers, body: JSON.stringify({ name: pName, config: data.config }) });
          uploaded++;
        }
      }

      showSuccess(`Successfully imported ${uploaded} files to the Cloud!`);
      setIsImportDialogOpen(false);
      setLocalTemplatesToImport([]);
      setLocalPresetsToImport([]);
      fetchTemplatesAndPresets();
    } catch (e: any) {
      showError("Failed to import files: " + e.message);
    } finally {
      dismissToast(toastId as unknown as string);
    }
  };


  const addCutElement = (type: CutElement['type']) => {
    const newEl: CutElement = {
      id: Date.now().toString(),
      type, x: 0, y: 0, size: type === 'arrow' ? 20 : type === 'ruler' ? 40 : 70, rotation: 0, color: '#ef4444'
    };
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
      const response = await fetch('http://localhost:3001/api/render', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ 
          text, template, format, circleCount, fontFamily, hSpacing: currentGrid.hSpacing, vSpacing: currentGrid.vSpacing, 
          customCircleSize: currentGrid.customCircleSize, cols: currentGrid.cols, rows: currentGrid.rows, 
          elements, showBorder, topicCuts, topicNodes, hudEnabled, hudTitleColor, hudProgressColor, 
          hudShowTitle, hudShowImage, hudShowProgress, hudTitleShadow, hudImageShadow, hudProgressBarShadow,
          defaultVideo: customDefaultVideo
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        let errMsg = errText;
        try { errMsg = JSON.parse(errText).error || errText; } catch(e){}
        throw new Error(`Server returned ${response.status}: ${errMsg}`);
      }
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
              else if (data.type === 'progress') {
                setRenderProgress(data.percent);
                setRenderStatus(`Rendering frames: ${data.renderedFrames} / ${data.totalFrames}`);
              } else if (data.type === 'done') {
                setRenderProgress(100);
                setRenderStatus("Done!");
                
                setTimeout(() => {
                  setIsRendering(false);
                  toast.success("Render Complete!", {
                    description: "Your video has been saved to S3.",
                    duration: 8000,
                    action: {
                      label: "View in Library ➔",
                      onClick: () => navigate('/library')
                    }
                  });
                }, 1000);
              } else if (data.type === 'error') {
                throw new Error(data.error);
              }
            } catch (e: any) {}
          }
        }
      }
    } catch (error: any) {
      showError("Render failed: " + error.message);
      setIsRendering(false);
    }
  };

  const generateTopicAudio = async (topicIndex: number) => {
    const topic = topicNodes[topicIndex];
    if (!topic.script?.trim()) return showError(`Please enter a script for "${topic.title}" before generating.`);

    if (ttsProvider === 'elevenlabs' && (!elVoiceId)) {
      return showError("Please configure your ElevenLabs Voice ID.");
    }

    const toastId = showLoading(`Generating voiceovers for ${topic.title}...`);
    try {
      const endpoint = ttsProvider === 'elevenlabs' ? '/api/elevenlabs/generate' : 
                       ttsProvider === 'kokoro' ? '/api/kokoro/generate' : '/api/testing/generate';
      
      const titlePayload = ttsProvider === 'elevenlabs' 
        ? { text: topic.title, voiceId: elVoiceId, index: `${topicIndex}_title` } 
        : ttsProvider === 'kokoro'
        ? { text: topic.title, voiceId: kokoroVoice, index: `${topicIndex}_title` }
        : { text: topic.title, index: `${topicIndex}_title` };

      const titleRes = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(titlePayload)
      });
      const titleData = await titleRes.json();
      if (!titleData.success) throw new Error(titleData.error);
      const newTitleAudioUrl = titleData.filename;

      const titleAudioDurationSecs = await new Promise<number>((resolve) => {
        const audio = new Audio(`http://localhost:3001/${newTitleAudioUrl}`);
        audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
        audio.addEventListener('error', () => resolve(0));
        audio.load();
      });

      const scriptPayload = ttsProvider === 'elevenlabs' 
        ? { text: topic.script, voiceId: elVoiceId, index: topicIndex } 
        : ttsProvider === 'kokoro'
        ? { text: topic.script, voiceId: kokoroVoice, index: topicIndex }
        : { text: topic.script, index: topicIndex };

      const scriptRes = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(scriptPayload)
      });
      const scriptData = await scriptRes.json();
      if (!scriptData.success) throw new Error(scriptData.error);
      const newScriptAudioUrl = scriptData.filename;

      const scriptAudioDurationSecs = await new Promise<number>((resolve) => {
        const audio = new Audio(`http://localhost:3001/${newScriptAudioUrl}`);
        audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
        audio.addEventListener('error', () => resolve(0));
        audio.load();
      });

      if (scriptAudioDurationSecs > 0) {
        setTopicCuts(prev => {
          const cuts = prev[topicIndex] || [];
          if (cuts.length === 0) return prev;
          
          const totalCurrentFrames = cuts.reduce((sum, c) => sum + c.duration, 0) || 1;
          const targetTotalFrames = Math.floor(scriptAudioDurationSecs * 30);
          
          const newCuts = cuts.map(c => ({
            ...c, duration: Math.max(10, Math.floor((c.duration / totalCurrentFrames) * targetTotalFrames))
          }));
          return { ...prev, [topicIndex]: newCuts };
        });
        showSuccess(`Voiceovers ready! Visual cuts dynamically synced to ${scriptAudioDurationSecs.toFixed(1)}s.`);
      } else {
        showSuccess(`Voiceovers ready for ${topic.title}!`);
      }
      
      updateTopicNode(topicIndex, { 
        audioUrl: newScriptAudioUrl, 
        titleAudioUrl: newTitleAudioUrl,
        titleAudioDuration: titleAudioDurationSecs || (topic.title.split(' ').length / 2.5)
      });
    } catch (err: any) {
      showError("Audio Generation Failed: " + err.message);
    } finally {
      dismissToast(toastId as unknown as string);
    }
  };

  const cutTemplates = fullTemplates.filter(t => t.template === 'cut');
  const hudTemplates = fullTemplates.filter(t => t.template === 'hud');
  const groupedTemplates = templateDetails.reduce((acc, detail) => {
    const path = detail.name;
    const [folder, ...rest] = path.includes('/') ? path.split('/') : ['main', path];
    const name = rest.length ? rest.join('/') : folder;
    const key = rest.length ? folder : 'main';
    if (!acc[key]) acc[key] = [];
    acc[key].push({ path, name, source: detail.source, is_global: detail.is_global, user_id: detail.user_id });
    return acc;
  }, {} as Record<string, {path: string, name: string, source: string, is_global: boolean, user_id: string}[]>);

  const addLog = (message: string, type: LogEntry['type'] = 'info') => {
    setGenerationLogs(prev => [...prev, { message, type }]);
  };

  const callLLM = async (systemMessage: string, userMessage: string, pOverride?: string, mOverride?: string, useScriptKey: boolean = false) => {
    const activeProvider = pOverride || aiProvider;
    const activeModel = mOverride || aiModel;

    const response = await fetch('http://localhost:3001/api/llm/generate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        system: systemMessage,
        user: userMessage,
        provider: activeProvider,
        model: activeModel,
        useScriptKey
      })
    });

    const json = await response.json();
    if (!json.success) throw new Error(json.error);
    return json.data;
  };

  const handleResetUsedTopics = () => {
    setUsedTopics([]);
    showSuccess("Topic list has been reset! All topics are available again.");
  };

  const handleRandomizeTopic = () => {
    let availableTopics = EXPLAINER_TOPICS.filter(t => !usedTopics.includes(t));
    
    if (availableTopics.length === 0) {
      showSuccess("All 50 topics were used! Resetting list automatically.");
      setUsedTopics([]);
      availableTopics = EXPLAINER_TOPICS;
    }

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
      const outlineMsg = `Topic: "${autoScriptTopic}". Generate exactly ${autoScriptCount} subtopics.`;
      
      const outlineData = await callLLM(promptOutline, outlineMsg, scriptAiProvider, scriptAiModel, true);
      const subtopics = outlineData.subtopics || [];
      if (subtopics.length === 0) throw new Error("AI failed to generate an outline.");

      let fullScript = "";

      for (let i = 0; i < subtopics.length; i++) {
        let success = false;
        let retries = 3;
        let lastError = "";

        while (!success && retries > 0) {
          setScriptGenStatus(`Writing segment ${i + 1} of ${subtopics.length}... ${retries < 3 ? `(Retry ${4-retries}/3)` : ''}`);
          
          try {
            const segmentMsg = `Main Topic: "${autoScriptTopic}"\nCurrent Sub-topic to write about: "${subtopics[i]}"`;
            const segmentData = await callLLM(promptSegment, segmentMsg, scriptAiProvider, scriptAiModel, true);
            
            if (segmentData && segmentData.script) {
              fullScript += `${subtopics[i]}\n${segmentData.script}\n\n`;
              setVideoScript(fullScript + `\n\n[...Writing next segment: ${subtopics[i+1] || 'finishing up'}...]`);
              success = true;
            } else {
              throw new Error("Invalid format returned by AI.");
            }
          } catch (segmentErr: any) {
            console.warn(`Segment ${i+1} failed:`, segmentErr);
            lastError = segmentErr.message || "Unknown API Error";
            retries--;
            if (retries > 0) {
              await delay(3000); 
            }
          }
        }

        if (!success) {
          console.error(`Segment ${i+1} failed permanently after 3 retries.`);
          fullScript += `${subtopics[i]}\n(Segment generation failed: ${lastError})\n\n`;
          setVideoScript(fullScript + `\n\n[...Writing next segment: ${subtopics[i+1] || 'finishing up'}...]`);
        }

        if (i < subtopics.length - 1) {
          await delay(2000); 
        }
      }

      fullScript += `category: ${autoScriptTopic}`;
      setVideoScript(fullScript.trim());
      showSuccess("Detailed segmented script generated successfully!");
    } catch (e: any) {
      showError("Failed to generate script: " + e.message);
    } finally {
      setIsGeneratingScript(false);
      setScriptGenStatus("");
    }
  };

  const handleAIGenerate = async () => {
    if (cutTemplates.length === 0) return showError("You need to create and save at least one 'Single Cut' template first.");

    setIsGenerating(true);
    setGenerationLogs([]);
    try {
      const categoryMatch = videoScript.match(/category:\s*(.+)/i);
      const categoryStr = categoryMatch ? categoryMatch[1].trim() : "";

      addLog("Step 1: Editor extracting topics & sentences...", "info");
      const step1Data = await callLLM(prompt1, `TRANSCRIPT:\n${videoScript}`, aiProvider, aiModel, false);
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
          const searchRes = await fetch(`http://localhost:3001/api/media/search?q=${encodeURIComponent(query)}&type=${type}`);
          const searchData = await searchRes.json();
          if (!searchData.success || !searchData.results || searchData.results.length === 0) {
            addLog(`⚠️ No results found for "${query}"`, "warning");
            return null;
          }
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
              const dlRes = await fetch(isVideo ? 'http://localhost:3001/api/media/download-youtube' : 'http://localhost:3001/api/media/download', {
                method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody)
              });
              const dlData = await dlRes.json();
              if (dlData.success) {
                usedMediaUrls.add(cleanUrl);
                if (type === 'video' && titleKey) usedVideoTitles.add(titleKey);
                addLog(`✅ File Saved: ${dlData.filename}`, "success");
                return dlData.filename; 
              } else {
                addLog(`⚠️ Server rejected file (${dlData.error}). Trying next...`, "warning");
                await delay(300);
              }
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
        
        addLog(`⚠️ Exhausted all broad queries for "${topicLabel}". Using placeholder.`, "warning");
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
        for (let j = 0; j < topicSentences.length; j += sentencesPerCut) {
          chunkedSentences.push(topicSentences.slice(j, j + sentencesPerCut).join(' '));
        }

        let generatedTitleAudioUrl = '';
        let titleAudioDurationSecs = 0;
        let generatedAudioUrl = '';
        let audioDurationSecs = 0;

        addLog(`🎙️ Generating Title Voiceover for "${topic.label}"...`, "info");
        try {
          const endpoint = ttsProvider === 'elevenlabs' ? '/api/elevenlabs/generate' : 
                           ttsProvider === 'kokoro' ? '/api/kokoro/generate' : '/api/testing/generate';
          
          const titlePayload = ttsProvider === 'elevenlabs' 
            ? { text: topic.label, voiceId: elVoiceId, index: `${i}_title` } 
            : ttsProvider === 'kokoro'
            ? { text: topic.label, voiceId: kokoroVoice, index: `${i}_title` }
            : { text: topic.label, index: `${i}_title` };

          const titleRes = await fetch(`http://localhost:3001${endpoint}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(titlePayload)
          });
          
          const titleData = await titleRes.json();
          if (titleData.success) {
            generatedTitleAudioUrl = titleData.filename;
            titleAudioDurationSecs = await new Promise<number>((resolve) => {
              const audio = new Audio(`http://localhost:3001/${generatedTitleAudioUrl}`);
              audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
              audio.addEventListener('error', () => resolve(0));
              audio.load();
            });
          }
        } catch (err: any) { addLog(`⚠️ Title Voiceover request error: ${err.message}`, "error"); }

        addLog(`🎙️ Generating Script Voiceover for "${topic.label}"...`, "info");
        try {
          const endpoint = ttsProvider === 'elevenlabs' ? '/api/elevenlabs/generate' : 
                           ttsProvider === 'kokoro' ? '/api/kokoro/generate' : '/api/testing/generate';
          
          const payload = ttsProvider === 'elevenlabs' 
            ? { text: topicScript, voiceId: elVoiceId, index: i } 
            : ttsProvider === 'kokoro'
            ? { text: topicScript, voiceId: kokoroVoice, index: i }
            : { text: topicScript, index: i };

          const ttsRes = await fetch(`http://localhost:3001${endpoint}`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          
          const ttsData = await ttsRes.json();
          if (ttsData.success) {
            generatedAudioUrl = ttsData.filename;
            addLog(`✅ Voiceover Saved: ${ttsData.filename}`, "success");
            audioDurationSecs = await new Promise<number>((resolve) => {
              const audio = new Audio(`http://localhost:3001/${generatedAudioUrl}`);
              audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
              audio.addEventListener('error', () => resolve(0));
              audio.load();
            });
            addLog(`⏱️ Voiceover Duration calculated: ${audioDurationSecs.toFixed(2)}s`, "info");
          } else {
            addLog(`⚠️ Voiceover failed: ${ttsData.error}`, "warning");
          }
        } catch (err: any) { addLog(`⚠️ Voiceover request error: ${err.message}`, "error"); }

        newTopicNodes.push({ 
          title: topic.label, 
          mediaUrl: downloadedMain, 
          script: topicScript, 
          audioUrl: generatedAudioUrl,
          titleAudioUrl: generatedTitleAudioUrl,
          titleAudioDuration: titleAudioDurationSecs
        });

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

        const cutsData: TopicCut[] = preCutsData.map((pre) => {
          const queryItem = queries.find((q: any) => q.sentence_index === pre.sIdx) || queries[pre.sIdx] || {};
          let selectedTemplate = cutTemplates.find(t => t.name === pre.moment.template);
          if (!selectedTemplate) selectedTemplate = cutTemplates.find(t => t.elements && t.elements.some((e:any) => e.type === 'image' || e.type === 'video')) || cutTemplates[0];

          let rawAiQuery = queryItem.search_query || pre.sentence.split(/\s+/).slice(0, 4).join(' ');
          rawAiQuery = rawAiQuery.replace(/[^a-zA-Z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
          
          let finalSecs = pre.durationSecs;
          if (audioDurationSecs > 0 && totalEstSecs > 0) finalSecs = (pre.durationSecs / totalEstSecs) * audioDurationSecs;
          
          let mediaType: 'image' | 'video' = 'image';
          if (selectedTemplate.elements) { if (selectedTemplate.elements.some((e: any) => e.type === 'video')) mediaType = 'video'; } 
          else { if (selectedTemplate.showVideo) mediaType = 'video'; }

          return {
            id: Date.now().toString() + Math.random().toString(),
            templateName: selectedTemplate.name, config: selectedTemplate,
            duration: Math.max(10, Math.floor(finalSecs * 30)),
            mediaType, mediaUrl: '',
            searchQuery: `${rawAiQuery} ${safeCategory}`.trim(),
            fallbackQuery: `${safeTopicLabel} ${safeCategory}`.trim()
          };
        });

        addLog(`--- Fetching ${cutsData.length} cuts for "${topic.label}" ---`, "info");
        for (let j = 0; j < cutsData.length; j++) {
          const cut = cutsData[j] as any;
          cut.mediaUrl = await fetchAndVerifyMedia(cut.searchQuery, cut.fallbackQuery, cut.mediaType, topic.label, (cut.duration / 30) + 2);
          
          if (cut.mediaUrl.toLowerCase().endsWith('.mp4') || cut.mediaUrl.toLowerCase().endsWith('.webm')) {
            cut.mediaType = 'video';
            if (cut.config && cut.config.elements) {
              cut.config = {
                ...cut.config,
                elements: cut.config.elements.map((e: any) => 
                  e.type === 'image' ? { ...e, type: 'video' } : e
                )
              };
            }
          }
        }
        newTopicCuts[i] = cutsData;
      }

      setTopicNodes(newTopicNodes);
      setTopicCuts(newTopicCuts);
      addLog(`🎉 AI Pipeline Complete!`, "success");
      showSuccess(`AI Pipeline Complete! Dynamic audio-synced timeline generated.`);
    } catch (e: any) {
      addLog(`❌ Fatal Error: ${e.message}`, "error");
      showError("AI Generation failed: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const addTopicCut = (topicIndex: number) => {
    const defaultTemplate = cutTemplates.length > 0 ? cutTemplates[0] : null;
    if (!defaultTemplate) return showError("Please create and save a 'Single Cut' template first!");
    setTopicCuts(prev => ({ ...prev, [topicIndex]: [...(prev[topicIndex] || []), { id: Date.now().toString(), templateName: defaultTemplate.name, config: defaultTemplate, duration: 90, mediaType: 'image', mediaUrl: '', searchQuery: '' }] }));
  };

  const updateTopicCut = (topicIndex: number, cutId: string, updates: Partial<TopicCut>) => setTopicCuts(prev => ({ ...prev, [topicIndex]: prev[topicIndex].map(c => c.id === cutId ? { ...c, ...updates } : c) }));
  const removeTopicCut = (topicIndex: number, cutId: string) => setTopicCuts(prev => ({ ...prev, [topicIndex]: prev[topicIndex].filter(c => c.id !== cutId) }));
  const updateTopicNode = (index: number, updates: Partial<TopicNode>) => setTopicNodes(prev => { const next = [...prev]; if (next[index]) next[index] = { ...next[index], ...updates }; return next; });

  const isCurrentTemplateLocal = loadedTemplatePath && templateDetails.find(t => t.name === loadedTemplatePath)?.source === 'local';
  const isCurrentPresetLocal = loadedPresetPath && presetDetails.find(p => p.name === loadedPresetPath)?.source === 'local';

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-[#cccccc] overflow-hidden font-sans">
      
      {isRendering && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#232323] border-t border-[#444444] p-4 md:p-6 shadow-2xl animate-in slide-in-from-bottom-full duration-300">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center gap-6">
            <div className="flex items-center gap-3 w-full md:w-auto md:min-w-[250px]">
              {renderProgress < 100 ? <Loader2 className="h-6 w-6 animate-spin text-[#eeeeee]" /> : <CheckCircle2 className="h-6 w-6 text-green-500" />}
              <div>
                <h3 className="font-bold text-[#ffffff]">{renderProgress < 100 ? "Exporting Video..." : "Export Complete!"}</h3>
                <p className="text-xs text-[#aaaaaa]">{renderStatus}</p>
              </div>
            </div>
            <div className="flex-grow w-full flex items-center gap-4">
              <Progress value={renderProgress} className="h-3 flex-grow bg-[#1e1e1e] [&>div]:bg-[#2d8ceb]" />
              <span className="text-[#eeeeee] font-bold min-w-[3rem] text-right">{renderProgress}%</span>
            </div>
          </div>
        </div>
      )}

      <header className="min-h-14 py-2 bg-[#232323] border-b border-[#444444] flex flex-wrap items-center justify-between px-4 z-20 shrink-0 shadow-sm gap-x-4 gap-y-3">
        <div className="flex items-center gap-2 shrink-0">
          <div className="bg-[#2d8ceb] p-1.5 rounded-lg shadow-sm"><VideoIcon className="h-4 w-4 text-white" /></div>
          <h1 className="text-[15px] font-bold text-[#ffffff] tracking-tight">Remotion Studio</h1>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
           <div className="flex flex-wrap items-center bg-[#1e1e1e] p-1 rounded-lg border border-[#333333]">
             <Select onValueChange={(path) => loadTemplate(path)} value={loadedTemplatePath || ""}>
               <SelectTrigger className="h-7 border-none shadow-none bg-transparent hover:bg-[#333333] focus:ring-0 text-xs font-medium w-[220px] text-[#eeeeee]">
                  <SelectValue placeholder="Open Visual Template..." />
               </SelectTrigger>
               <SelectContent className="bg-[#232323] border-[#444444] text-[#eeeeee]">
                  {Object.entries(groupedTemplates).map(([folder, items]) => (
                    items.map(item => (
                      <SelectItem key={item.path} value={item.path}>
                        <span className="text-[#888888] font-normal mr-1.5">[{folder}]</span> 
                        {item.name} 
                        {item.source === 'local' && <span className="ml-2 text-[9px] text-[#2d8ceb] font-bold uppercase tracking-wider">[Built-in]</span>}
                        {item.is_global && <span className="ml-2 text-[9px] text-emerald-500 font-bold uppercase tracking-wider">[Global]</span>}
                      </SelectItem>
                    ))
                  ))}
               </SelectContent>
             </Select>
             {loadedTemplatePath && (() => {
               const activeTpl = templateDetails.find(t => t.name === loadedTemplatePath);
               const canDelete = activeTpl && activeTpl.source !== 'local' && (!activeTpl.is_global || activeTpl.user_id === user?.id);
               
               return (
                 <>
                   {isCurrentTemplateLocal && (
                      <Button onClick={() => saveTemplate(true)} variant="ghost" size="sm" className="h-7 w-7 p-0 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400 ml-1" title="Upload this Built-in Template to Cloud">
                        <CloudUpload className="h-3.5 w-3.5" />
                      </Button>
                   )}
                   {canDelete && (
                      <Button onClick={() => deleteTemplate(loadedTemplatePath)} variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#888888] hover:bg-red-500/20 hover:text-red-400 ml-1" title="Delete Template">
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                   )}
                 </>
               );
             })()}

             <div className="w-px h-4 bg-[#444444] mx-1"></div>
             <Button variant="ghost" size="sm" onClick={handleNewTemplate} className="h-7 text-xs px-2 text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]"><FilePlus className="mr-1.5 h-3 w-3" /> New</Button>
             {loadedTemplatePath && <Button variant="ghost" size="sm" onClick={openUpdateDialog} className="h-7 text-xs px-2 text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]"><RefreshCw className="mr-1.5 h-3 w-3" /> Update</Button>}
             {template === 'cut' && <Button variant="ghost" size="sm" onClick={() => openSaveDialog('cut')} className="h-7 text-xs px-2 text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]"><Save className="mr-1.5 h-3 w-3" /> Save Cut</Button>}
             {template === 'hud' && <Button variant="ghost" size="sm" onClick={() => openSaveDialog('hud')} className="h-7 text-xs px-2 text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]"><Save className="mr-1.5 h-3 w-3" /> Save HUD</Button>}
           </div>

           <div className="flex flex-wrap items-center bg-[#1e1e1e] p-1 rounded-lg border border-[#333333]">
              <Select onValueChange={(path) => loadPreset(path)} value={loadedPresetPath || ""}>
                 <SelectTrigger className="h-7 border-none shadow-none bg-transparent hover:bg-[#333333] focus:ring-0 text-xs font-medium w-[160px] text-[#2d8ceb]">
                    <SelectValue placeholder="Global Presets..." />
                 </SelectTrigger>
                 <SelectContent className="bg-[#232323] border-[#444444] text-[#eeeeee]">
                    {presets.length === 0 && <SelectItem value="none" disabled>No presets saved</SelectItem>}
                    {presetDetails.map(p => (
                      <SelectItem key={p.name} value={p.name}>
                        {p.name} 
                        {p.source === 'local' && <span className="ml-2 text-[9px] text-[#2d8ceb] font-bold uppercase tracking-wider">[Built-in]</span>}
                        {p.is_global && <span className="ml-2 text-[9px] text-emerald-500 font-bold uppercase tracking-wider">[Global]</span>}
                      </SelectItem>
                    ))}
                 </SelectContent>
               </Select>
               {loadedPresetPath && (() => {
                 const activePre = presetDetails.find(p => p.name === loadedPresetPath);
                 const canDelete = activePre && activePre.source !== 'local' && (!activePre.is_global || activePre.user_id === user?.id);
                 
                 return (
                   <>
                     {isCurrentPresetLocal && (
                        <Button onClick={savePreset} variant="ghost" size="sm" className="h-7 w-7 p-0 text-amber-500 hover:bg-amber-500/20 hover:text-amber-400 ml-1" title="Upload this Built-in Preset to Cloud">
                          <CloudUpload className="h-3.5 w-3.5" />
                        </Button>
                     )}
                     {canDelete && (
                        <Button onClick={() => deletePreset(loadedPresetPath)} variant="ghost" size="sm" className="h-7 w-7 p-0 text-[#888888] hover:bg-red-500/20 hover:text-red-400 ml-1" title="Delete Preset">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                     )}
                   </>
                 );
               })()}
               <div className="w-px h-4 bg-[#444444] mx-1"></div>
               <Button variant="ghost" size="sm" onClick={() => setIsPresetDialogOpen(true)} className="h-7 text-xs px-2 text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]">
                 <Globe className="mr-1.5 h-3 w-3" /> Save Config
               </Button>
               <div className="w-px h-4 bg-[#444444] mx-1"></div>
               <Button variant="ghost" size="sm" onClick={() => setIsImportDialogOpen(true)} className="h-7 text-xs px-2 text-amber-500 hover:bg-amber-500/10 hover:text-amber-400" title="Import built-in files to your cloud account">
                 <FolderOpen className="mr-1.5 h-3 w-3" /> Import
               </Button>
           </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-[#1e1e1e] border border-[#333333] px-3 py-1 rounded-lg text-sm text-[#eeeeee]" title="Your Credit Balance">
            <Coins className="h-4 w-4 text-yellow-500" />
            <span className="font-bold">{credits.toLocaleString()}</span>
          </div>

          <div className="w-px h-4 bg-[#444444] mx-1"></div>
          
          <Button onClick={() => navigate('/settings')} variant="ghost" size="sm" className="h-8 text-xs rounded-lg text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]"><Settings2 className="lg:mr-1.5 h-3 w-3" /> <span className="hidden lg:inline">Settings</span></Button>
          <div className="w-px h-4 bg-[#444444] mx-1 hidden lg:block"></div>
          <Button onClick={() => navigate('/dashboard')} variant="ghost" size="sm" className="h-8 text-xs rounded-lg text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]"><Activity className="lg:mr-1.5 h-3 w-3" /> <span className="hidden lg:inline">Automation</span></Button>
          <div className="w-px h-4 bg-[#444444] mx-1 hidden lg:block"></div>
          <Button onClick={() => navigate('/library')} variant="ghost" size="sm" className="h-8 text-xs rounded-lg text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]"><Film className="lg:mr-1.5 h-3 w-3" /> <span className="hidden lg:inline">Library</span></Button>
          <div className="w-px h-4 bg-[#444444] mx-1 hidden lg:block"></div>
          <Button onClick={() => navigate('/downloader')} variant="ghost" size="sm" className="h-8 text-xs rounded-lg text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]"><Search className="lg:mr-1.5 h-3 w-3" /> <span className="hidden lg:inline">Find Media</span></Button>
          <Button onClick={handleRender} disabled={isRendering} size="sm" className="h-8 text-xs bg-[#2d8ceb] hover:bg-[#2576c7] text-white rounded-lg shadow-sm font-medium px-4 border border-[#1a73cc]"><Download className="lg:mr-1.5 h-3 w-3" /> <span className="hidden lg:inline">Export Video</span></Button>

          <div className="w-px h-4 bg-[#444444] mx-1"></div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 text-xs rounded-lg text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333] max-w-[120px] truncate">
                <UserCircle className="mr-1.5 h-4 w-4 shrink-0" />
                <span className="truncate">{user?.email?.split('@')[0]}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#232323] border-[#444444] text-[#eeeeee]">
              <DropdownMenuItem onClick={signOut} className="text-xs cursor-pointer focus:bg-[#333333] focus:text-[#ffffff] text-red-400 focus:text-red-300">
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-[420px] flex-shrink-0 bg-[#232323] border-r border-[#444444] flex flex-col z-10 shadow-lg">
          <div className="p-3 border-b border-[#444444] bg-[#1e1e1e]">
            <Tabs value={template === 'voice' ? 'explainer' : template} onValueChange={(v: any) => setTemplate(v)} className="w-full">
              <TabsList className="grid w-full grid-cols-4 bg-[#232323] p-1 rounded-xl h-9 border border-[#333333]">
                <TabsTrigger value="explainer" className="rounded-lg data-[state=active]:bg-[#333333] data-[state=active]:text-[#ffffff] text-[#aaaaaa] text-[11px] font-medium h-7"><LayoutGrid className="mr-1.5 h-3.5 w-3.5" /> Main</TabsTrigger>
                <TabsTrigger value="cut" className="rounded-lg data-[state=active]:bg-[#333333] data-[state=active]:text-[#ffffff] text-[#aaaaaa] text-[11px] font-medium h-7"><Scissors className="mr-1.5 h-3.5 w-3.5" /> Cut</TabsTrigger>
                <TabsTrigger value="hud" className="rounded-lg data-[state=active]:bg-[#333333] data-[state=active]:text-[#ffffff] text-[#aaaaaa] text-[11px] font-medium h-7"><Target className="mr-1.5 h-3.5 w-3.5" /> HUD</TabsTrigger>
                <TabsTrigger value="voice" onClick={() => setTemplate('voice')} data-state={template === 'voice' ? 'active' : 'inactive'} className="rounded-lg data-[state=active]:bg-[#333333] data-[state=active]:text-[#ffffff] text-[#aaaaaa] text-[11px] font-medium h-7"><Mic className="mr-1.5 h-3.5 w-3.5" /> Voice</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
            
            {template === 'voice' && (
              <div className="space-y-4 animate-in fade-in duration-200">
                <Card className="p-4 border-[#444444] shadow-sm rounded-xl space-y-4 bg-[#333333]">
                  <div className="flex items-center gap-2 text-[#ffffff] font-semibold mb-2">
                    <Volume2 className="h-4 w-4 text-[#cccccc]" />
                    <span className="text-sm">Voice Configuration</span>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">TTS Provider</Label>
                      <Select value={ttsProvider} onValueChange={(v: any) => setTtsProvider(v)}>
                        <SelectTrigger className="h-8 text-xs rounded-lg bg-[#232323] border-[#444444] text-[#eeeeee]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[#232323] border-[#444444] text-[#eeeeee]">
                          <SelectItem value="elevenlabs" className="text-xs">ElevenLabs (High Quality - Paid)</SelectItem>
                          <SelectItem value="kokoro" className="text-xs">Kokoro-82M (Local Native - Free)</SelectItem>
                          <SelectItem value="testing" className="text-xs">Fast Testing (Google TTS - Free)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {ttsProvider === 'elevenlabs' && (
                      <div className="pt-2 space-y-4 border-t border-[#444444]">
                        <div className="space-y-1.5 flex items-center justify-between">
                          <Label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider flex items-center gap-2"><Lock className="h-3 w-3" /> ElevenLabs API Key</Label>
                          <span className="text-[9px] text-[#2d8ceb] font-mono">SECURED ON SERVER</span>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">ElevenLabs Voice ID</Label>
                          <Input value={elVoiceId} onChange={(e) => setElVoiceId(e.target.value)} className="h-8 text-xs rounded-lg bg-[#232323] border-[#444444] text-[#eeeeee]" />
                        </div>
                      </div>
                    )}

                    {ttsProvider === 'kokoro' && (
                      <div className="pt-2 space-y-4 border-t border-[#444444]">
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">Kokoro Voice</Label>
                          <Select value={kokoroVoice} onValueChange={setKokoroVoice}>
                            <SelectTrigger className="h-8 text-xs rounded-lg bg-[#232323] border-[#444444] text-[#eeeeee]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#232323] border-[#444444] text-[#eeeeee]">
                              <SelectItem value="af_bella" className="text-xs">Bella (American Female)</SelectItem>
                              <SelectItem value="af_sarah" className="text-xs">Sarah (American Female)</SelectItem>
                              <SelectItem value="am_michael" className="text-xs">Michael (American Male)</SelectItem>
                              <SelectItem value="am_adam" className="text-xs">Adam (American Male)</SelectItem>
                              <SelectItem value="bf_emma" className="text-xs">Emma (British Female)</SelectItem>
                              <SelectItem value="bm_george" className="text-xs">George (British Male)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <p className="text-[10px] text-[#888888] leading-tight mt-1">First generation per session will take a bit longer to download the Kokoro-82M model to the server memory.</p>
                      </div>
                    )}

                    {ttsProvider === 'testing' && (
                      <div className="pt-2 space-y-4 border-t border-[#444444]">
                        <p className="text-[10px] text-[#888888] leading-tight">Uses Google TTS. It's incredibly fast, 100% free, and perfect for testing visual pacing before generating your final, high-quality audio.</p>
                      </div>
                    )}
                  </div>
                </Card>

                <div className="space-y-3">
                  {Array.from({ length: circleCount }).map((_, i) => {
                    const node = topicNodes[i];
                    if (!node) return null;
                    return (
                      <Card key={i} className="p-4 border border-[#444444] shadow-sm rounded-xl space-y-3 bg-[#2d2d2d]">
                        <div className="flex items-center gap-2 font-semibold text-[#eeeeee] text-sm">
                          <span className="flex items-center justify-center bg-[#232323] text-[#cccccc] w-5 h-5 rounded-full text-[10px] border border-[#444444]">{i + 1}</span>
                          <span className="truncate">{node.title}</span>
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">Topic Script</Label>
                          <Textarea value={node.script || ''} onChange={(e) => updateTopicNode(i, { script: e.target.value })} placeholder={`Enter the voiceover script specifically for ${node.title}...`} className="min-h-[80px] text-xs rounded-lg bg-[#1e1e1e] border-[#444444] text-[#eeeeee]" />
                        </div>
                        <div className="flex flex-col gap-2 pt-1">
                          <Button onClick={() => generateTopicAudio(i)} variant="secondary" className="w-full text-xs h-8 bg-[#232323] text-[#eeeeee] hover:bg-[#383838] rounded-lg border border-[#444444]"><Wand2 className="mr-1.5 h-3 w-3 text-[#2d8ceb]" /> Generate Audio</Button>
                          {node.audioUrl && (
                            <div className="mt-2 p-2 bg-[#1e1e1e] rounded-lg border border-[#444444]">
                              <Label className="text-[9px] font-bold text-[#888888] uppercase mb-1.5 block tracking-wider">Preview File</Label>
                              <audio src={`http://localhost:3001/${node.audioUrl}`} controls className="w-full h-7 opacity-80 hover:opacity-100 transition-opacity" />
                            </div>
                          )}
                        </div>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}

            {template === 'explainer' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#ffffff] font-semibold mb-2"><Type className="h-4 w-4 text-[#cccccc]" /><span className="text-sm">Global Video Details</span></div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">Headline Text</Label>
                    <Input value={text} onChange={(e) => setText(e.target.value)} className="h-8 text-xs rounded-lg bg-[#333333] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb]" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">Font Family</Label>
                      <Select value={fontFamily} onValueChange={setFontFamily}>
                        <SelectTrigger className="w-full h-8 text-xs rounded-lg bg-[#333333] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb]"><SelectValue placeholder="Select Font" /></SelectTrigger>
                        <SelectContent className="bg-[#232323] border-[#444444] text-[#eeeeee]">
                          <SelectItem value="Bebas Neue">Bebas Neue</SelectItem><SelectItem value="System">System Sans</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">Format</Label>
                      <Select value={format} onValueChange={(v: any) => setFormat(v)}>
                        <SelectTrigger className="w-full h-8 text-xs rounded-lg bg-[#333333] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb]">
                          <SelectValue placeholder="Format" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#232323] border-[#444444] text-[#eeeeee]">
                          <SelectItem value="landscape">Landscape (16:9)</SelectItem>
                          <SelectItem value="portrait">Portrait (9:16)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <div className="h-px bg-[#444444] my-4 w-full"></div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-[#ffffff] font-semibold"><LayoutGrid className="h-4 w-4 text-[#cccccc]" /><span className="text-sm">Grid Settings</span></div>
                    <Button variant="ghost" size="sm" onClick={() => setShowAdvanced(!showAdvanced)} title="Advanced Layout" className={`h-7 w-7 p-0 rounded-full transition-colors ${showAdvanced ? 'bg-[#444444] text-[#eeeeee]' : 'bg-[#333333] text-[#aaaaaa] hover:text-[#eeeeee] hover:bg-[#444444]'}`}><Settings2 className="h-3.5 w-3.5" /></Button>
                  </div>
                  <div className="space-y-4">
                    <div className="space-y-2.5">
                      <div className="flex justify-between text-[10px] font-bold text-[#888888] uppercase tracking-wider"><span>Topics Count</span><span className="text-[#eeeeee]">{circleCount}</span></div>
                      <Slider value={[circleCount]} onValueChange={(v) => setCircleCount(v[0])} min={1} max={15} step={1} className="py-1 [&>span:first-child]:bg-[#444444] [&>span:first-child>span]:bg-[#2d8ceb] [&_[role=slider]]:bg-[#eeeeee] [&_[role=slider]]:border-[#2d8ceb]" />
                    </div>
                    <div className="flex items-center justify-between pt-2">
                      <Label htmlFor="show-border-explainer" className="text-[10px] font-bold text-[#aaaaaa] uppercase tracking-wider">Show Grid Borders</Label>
                      <Switch id="show-border-explainer" checked={showBorder} onCheckedChange={setShowBorder} className="scale-75 origin-right data-[state=unchecked]:bg-[#444444] data-[state=checked]:bg-[#2d8ceb]" />
                    </div>
                    {showAdvanced && (
                      <div className="pt-3 pb-2 space-y-4 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-[#444444]">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2"><Label className="text-[10px] uppercase text-[#888888] font-bold tracking-wider">Cols</Label><Slider value={[currentGrid.cols]} onValueChange={(v) => setGridConfigs(prev => ({...prev, [circleCount]: {...prev[circleCount], cols: v[0]}}))} min={1} max={10} step={1} className="[&>span:first-child]:bg-[#444444] [&>span:first-child>span]:bg-[#2d8ceb] [&_[role=slider]]:bg-[#eeeeee] [&_[role=slider]]:border-[#2d8ceb]" /></div>
                          <div className="space-y-2"><Label className="text-[10px] uppercase text-[#888888] font-bold tracking-wider">Rows</Label><Slider value={[currentGrid.rows]} onValueChange={(v) => setGridConfigs(prev => ({...prev, [circleCount]: {...prev[circleCount], rows: v[0]}}))} min={1} max={10} step={1} className="[&>span:first-child]:bg-[#444444] [&>span:first-child>span]:bg-[#2d8ceb] [&_[role=slider]]:bg-[#eeeeee] [&_[role=slider]]:border-[#2d8ceb]" /></div>
                        </div>
                        <div className="space-y-2"><Label className="text-[10px] uppercase text-[#888888] font-bold tracking-wider">Size ({currentGrid.customCircleSize}px)</Label><Slider value={[currentGrid.customCircleSize]} onValueChange={(v) => setGridConfigs(prev => ({...prev, [circleCount]: {...prev[circleCount], customCircleSize: v[0]}}))} min={100} max={500} step={10} className="[&>span:first-child]:bg-[#444444] [&>span:first-child>span]:bg-[#2d8ceb] [&_[role=slider]]:bg-[#eeeeee] [&_[role=slider]]:border-[#2d8ceb]" /></div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2"><Label className="text-[10px] uppercase text-[#888888] font-bold tracking-wider">H-Spacing</Label><Slider value={[currentGrid.hSpacing]} onValueChange={(v) => setGridConfigs(prev => ({...prev, [circleCount]: {...prev[circleCount], hSpacing: v[0]}}))} min={0} max={500} step={1} className="[&>span:first-child]:bg-[#444444] [&>span:first-child>span]:bg-[#2d8ceb] [&_[role=slider]]:bg-[#eeeeee] [&_[role=slider]]:border-[#2d8ceb]" /></div>
                          <div className="space-y-2"><Label className="text-[10px] uppercase text-[#888888] font-bold tracking-wider">V-Spacing</Label><Slider value={[currentGrid.vSpacing]} onValueChange={(v) => setGridConfigs(prev => ({...prev, [circleCount]: {...prev[circleCount], vSpacing: v[0]}}))} min={0} max={500} step={1} className="[&>span:first-child]:bg-[#444444] [&>span:first-child>span]:bg-[#2d8ceb] [&_[role=slider]]:bg-[#eeeeee] [&_[role=slider]]:border-[#2d8ceb]" /></div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-px bg-[#444444] my-4 w-full"></div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-[#ffffff] font-semibold"><Target className="h-4 w-4 text-[#cccccc]" /><span className="text-sm">HUD Tracking</span></div><Switch checked={hudEnabled} onCheckedChange={setHudEnabled} className="scale-75 origin-right data-[state=unchecked]:bg-[#444444] data-[state=checked]:bg-[#2d8ceb]" /></div>
                  {hudEnabled && (
                    <div className="pt-1 space-y-2 animate-in fade-in duration-300">
                      <div className="flex items-center gap-2">
                        <Select onValueChange={(v: string) => { const tpl = fullTemplates.find(t => t.name === v); if (tpl) { setHudTitleColor(tpl.hudTitleColor ?? '#ffffff'); setHudProgressColor(tpl.hudProgressColor ?? '#e2e8f0'); setHudShowTitle(tpl.hudShowTitle ?? true); setHudShowImage(tpl.hudShowImage ?? true); setHudShowProgress(tpl.hudShowProgress ?? true); setHudTitleShadow(tpl.hudTitleShadow ?? true); setHudImageShadow(tpl.hudImageShadow ?? true); setHudProgressBarShadow(tpl.hudProgressBarShadow ?? true); showSuccess("HUD Settings Applied!"); } }}>
                          <SelectTrigger className="h-8 text-xs bg-[#333333] border-[#444444] rounded-lg text-[#eeeeee] flex-grow focus:border-[#2d8ceb]"><SelectValue placeholder="Apply saved HUD style..." /></SelectTrigger>
                          <SelectContent className="bg-[#232323] border-[#444444] text-[#eeeeee]">{hudTemplates.length === 0 ? <SelectItem value="none" disabled>No HUD templates saved</SelectItem> : hudTemplates.map(t => <SelectItem key={t.name} value={t.name}>{t.name} {t.name === defaultHudName && "(Default)"}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <p className="text-[9px] text-[#888888] leading-tight">HUD automatically tracks the active topic image and duration.</p>
                    </div>
                  )}
                </div>

                <div className="h-px bg-[#444444] my-4 w-full"></div>

                <div className="space-y-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-[#ffffff] font-semibold"><Scissors className="h-4 w-4 text-[#cccccc]" /><span className="text-sm">Timeline Cuts</span></div>
                    <Button onClick={() => setIsAIOpen(true)} variant="outline" size="sm" className="h-7 px-2 text-[11px] bg-[#333333] text-[#eeeeee] border-[#444444] hover:bg-[#444444] rounded-lg shadow-sm"><Wand2 className="mr-1.5 h-3 w-3 text-[#2d8ceb]" /> AI Pipeline</Button>
                  </div>
                  
                  <Accordion type="single" collapsible className="w-full space-y-2">
                    {Array.from({ length: circleCount }).map((_, i) => {
                      const node = topicNodes[i] || { title: `Topic ${i + 1}`, mediaUrl: customDefaultVideo };
                      const cuts = topicCuts[i] || [];
                      
                      const mediaSrc = getUiMediaSrc(node.mediaUrl, customDefaultVideo);
                      const isVideoNode = mediaSrc.toLowerCase().endsWith('.mp4') || mediaSrc.toLowerCase().endsWith('.webm') || mediaSrc.includes('supabase.co');
                      
                      return (
                        <AccordionItem key={i} value={`topic-${i}`} className="border border-[#444444] bg-[#2d2d2d] rounded-xl px-3 overflow-hidden shadow-sm">
                          <AccordionTrigger className="text-xs font-semibold text-[#eeeeee] hover:no-underline py-3 hover:text-[#ffffff]">
                            <div className="flex items-center justify-between w-full pr-3">
                              <div className="flex items-center gap-3">
                                <div className="h-6 w-6 rounded-full overflow-hidden border border-[#444444] flex-shrink-0 bg-[#1e1e1e]">
                                  {isVideoNode ? (
                                    <video src={mediaSrc} className="w-full h-full object-cover" muted loop autoPlay playsInline />
                                  ) : (
                                    <img src={mediaSrc} alt={node.title} className="w-full h-full object-cover" />
                                  )}
                                </div>
                                <span>{i + 1}. {node.title}</span>
                              </div>
                              {cuts.length > 0 && <span className="text-[9px] bg-[#444444] text-[#eeeeee] px-2 py-0.5 rounded-full font-bold">{cuts.length} CUTS</span>}
                            </div>
                          </AccordionTrigger>
                          <AccordionContent className="space-y-4 pt-2 pb-4">
                            <div className="bg-[#1e1e1e] p-3 rounded-lg border border-[#444444] space-y-3 mb-4 shadow-inner">
                              <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-1.5"><Label className="text-[10px] text-[#888888] font-bold uppercase tracking-wider">Title</Label><Input value={node.title} onChange={(e) => updateTopicNode(i, { title: e.target.value })} className="h-7 text-[11px] rounded-md bg-[#333333] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb]" /></div>
                                <div className="space-y-1.5"><Label className="text-[10px] text-[#888888] font-bold uppercase tracking-wider">Image Src</Label><Input value={node.mediaUrl} onChange={(e) => updateTopicNode(i, { mediaUrl: e.target.value })} className="h-7 text-[11px] rounded-md bg-[#333333] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb]" /></div>
                              </div>
                            </div>
                            <h4 className="text-[10px] font-bold text-[#888888] uppercase tracking-widest px-1">Visual Cut Layers</h4>
                            {cuts.length === 0 && <p className="text-[11px] text-[#888888] italic text-center py-2">No active cuts.</p>}
                            {cuts.map((cut, cutIndex) => (
                              <div key={cut.id} className="p-3 border border-[#444444] rounded-lg bg-[#232323] space-y-3 relative group shadow-sm">
                                <div className="absolute right-1 top-1"><Button variant="ghost" size="sm" onClick={() => removeTopicCut(i, cut.id)} className="h-6 w-6 p-0 text-[#888888] hover:text-red-400 hover:bg-red-500/20 rounded-full"><Trash2 className="h-3 w-3" /></Button></div>
                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-[#888888] tracking-wider">#{cutIndex + 1}</span>
                                  {cut.searchQuery && <span className="text-[9px] px-1.5 py-0.5 bg-[#2d8ceb]/20 text-[#2d8ceb] rounded border border-[#2d8ceb]/30 flex items-center gap-1 line-clamp-1 max-w-[160px]"><CheckCircle2 className="h-2.5 w-2.5 flex-shrink-0" /> "{cut.searchQuery}"</span>}
                                </div>
                                <div className="space-y-3">
                                  <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1.5 col-span-2">
                                      <Label className="text-[9px] font-bold text-[#888888] uppercase">Template Layout</Label>
                                      <Select value={cut.templateName} onValueChange={(v: string) => updateTopicCut(i, cut.id, { templateName: v, config: cutTemplates.find(ct => ct.name === v) || {} })}><SelectTrigger className="h-7 text-[11px] bg-[#333333] border-[#444444] rounded-md text-[#eeeeee] focus:border-[#2d8ceb]"><SelectValue placeholder="Layout" /></SelectTrigger><SelectContent className="bg-[#232323] border-[#444444] text-[#eeeeee]">{cutTemplates.map(t => <SelectItem key={t.name} value={t.name} className="text-[11px] hover:bg-[#333333]">{t.name}</SelectItem>)}</SelectContent></Select>
                                    </div>
                                    <div className="space-y-1.5 col-span-1">
                                      <Label className="text-[9px] font-bold text-[#888888] uppercase">Type</Label>
                                      <Select value={cut.mediaType} onValueChange={(v: 'image'|'video') => updateTopicCut(i, cut.id, { mediaType: v })}><SelectTrigger className="h-7 text-[11px] bg-[#333333] border-[#444444] rounded-md px-2 text-[#eeeeee] focus:border-[#2d8ceb]"><SelectValue /></SelectTrigger><SelectContent className="bg-[#232323] border-[#444444] text-[#eeeeee]"><SelectItem value="image" className="text-[11px] hover:bg-[#333333]">IMG</SelectItem><SelectItem value="video" className="text-[11px] hover:bg-[#333333]">VID</SelectItem></SelectContent></Select>
                                    </div>
                                  </div>
                                  <div className="space-y-1.5">
                                    <Label className="text-[9px] font-bold text-[#888888] uppercase">Media Path</Label>
                                    <div className="flex gap-1.5">
                                      <Input value={cut.mediaUrl} onChange={(e) => updateTopicCut(i, cut.id, { mediaUrl: e.target.value })} className="h-7 text-[11px] bg-[#333333] border-[#444444] rounded-md text-[#eeeeee] focus:border-[#2d8ceb]" />
                                      <DropdownMenu>
                                        <DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-7 px-2 text-[10px] bg-[#444444] border-[#555555] text-[#eeeeee] hover:bg-[#555555] hover:text-[#ffffff]">Asset</Button></DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="bg-[#232323] border-[#444444] text-[#eeeeee]">
                                          {LOCAL_ASSETS.map(asset => <DropdownMenuItem key={asset.path} onClick={() => updateTopicCut(i, cut.id, { mediaUrl: asset.path })} className="text-[11px] focus:bg-[#333333] focus:text-[#ffffff] cursor-pointer">{asset.name}</DropdownMenuItem>)}
                                        </DropdownMenuContent>
                                      </DropdownMenu>
                                    </div>
                                  </div>
                                  <div className="space-y-2 pt-1">
                                    <div className="flex justify-between text-[9px] font-medium text-[#aaaaaa] uppercase tracking-widest"><span>Duration</span><span className="text-[#eeeeee] font-bold">{(cut.duration / 30).toFixed(1)}s</span></div>
                                    <Slider value={[cut.duration]} onValueChange={(v) => updateTopicCut(i, cut.id, { duration: v[0] })} min={30} max={600} step={15} className="[&>span:first-child]:bg-[#444444] [&>span:first-child>span]:bg-[#2d8ceb] [&_[role=slider]]:bg-[#eeeeee] [&_[role=slider]]:border-[#2d8ceb]" />
                                  </div>
                                </div>
                              </div>
                            ))}
                            <Button size="sm" variant="outline" onClick={(e) => { e.preventDefault(); addTopicCut(i); }} className="w-full border-dashed text-[#aaaaaa] hover:text-[#ffffff] bg-transparent border-[#555555] hover:bg-[#444444] h-8 text-[11px] rounded-lg"><Plus className="mr-1.5 h-3.5 w-3.5" /> Add Cut Layer</Button>
                          </AccordionContent>
                        </AccordionItem>
                      );
                    })}
                  </Accordion>
                </div>
              </div>
            )}

            {template === 'cut' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-[#ffffff] font-semibold mb-2"><Square className="h-4 w-4 text-[#cccccc]" /><span className="text-sm">Cut Template Designer</span></div>
                  <div className="flex items-center justify-between p-3 bg-[#1e1e1e] rounded-xl border border-[#444444]">
                    <Label htmlFor="show-border" className="text-[10px] font-bold text-[#aaaaaa] uppercase tracking-wider">Show Grid Borders</Label>
                    <Switch id="show-border" checked={showBorder} onCheckedChange={setShowBorder} className="scale-75 origin-right data-[state=unchecked]:bg-[#444444] data-[state=checked]:bg-[#2d8ceb]" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">AI Director Definition</Label>
                    <Textarea placeholder="Describe when to use this layout (e.g. 'Use when explaining stats')" value={templateDescription} onChange={(e) => setTemplateDescription(e.target.value)} className="h-16 text-xs bg-[#333333] border-[#444444] text-[#eeeeee] rounded-lg resize-none focus:border-[#2d8ceb]" />
                  </div>
                </div>
                <div className="h-px bg-[#444444] my-4 w-full"></div>
                <div className="space-y-4">
                  <div className="flex items-center gap-2 text-[#ffffff] font-semibold"><LayoutGrid className="h-4 w-4 text-[#cccccc]" /><span className="text-sm">Canvas Elements</span></div>
                  {elements.map((el, index) => (
                    <Card key={el.id} className="p-4 border border-[#444444] shadow-sm rounded-xl space-y-4 relative group bg-[#2d2d2d]">
                      <div className="absolute right-1 top-1 z-10 opacity-0 group-hover:opacity-100 transition-opacity"><Button variant="ghost" size="sm" onClick={() => removeCutElement(el.id)} className="h-6 w-6 p-0 text-[#888888] hover:text-red-400 hover:bg-red-500/20 rounded-full"><Trash2 className="h-3 w-3" /></Button></div>
                      <div className="flex items-center justify-between pr-6">
                        <div className="flex items-center gap-2 text-[#eeeeee] font-semibold text-xs">
                          {el.type === 'image' && <ImageIcon className="h-3.5 w-3.5 text-[#aaaaaa]" />}{el.type === 'video' && <Film className="h-3.5 w-3.5 text-[#aaaaaa]" />}{el.type === 'ruler' && <Ruler className="h-3.5 w-3.5 text-[#aaaaaa]" />}{el.type === 'arrow' && <Navigation className="h-3.5 w-3.5 text-[#aaaaaa]" />}<span className="capitalize">{el.type} Block</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => updateCutElement(el.id, { x: 0, y: 0, rotation: 0 })} className="h-6 px-2 text-[9px] uppercase font-bold text-[#888888] hover:text-[#ffffff] tracking-wider hover:bg-[#444444]">Center</Button>
                      </div>
                      <div className="space-y-4">
                        {(el.type === 'image' || el.type === 'video') && (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <Label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">Mock Path</Label>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-5 px-1.5 text-[9px] text-[#cccccc] hover:text-[#ffffff] hover:bg-[#444444] font-bold uppercase tracking-wider">Asset</Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-lg bg-[#232323] border-[#444444] text-[#eeeeee]">{LOCAL_ASSETS.map(asset => <DropdownMenuItem key={asset.path} onClick={() => updateCutElement(el.id, { url: asset.path })} className="text-[11px] cursor-pointer focus:bg-[#333333] focus:text-[#ffffff]">{asset.name}</DropdownMenuItem>)}</DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                            <Input value={el.url || ''} onChange={(e) => updateCutElement(el.id, { url: e.target.value })} className="h-8 text-xs rounded-md bg-[#1e1e1e] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb]" />
                          </div>
                        )}
                        {el.type === 'arrow' && (
                          <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-[#888888] tracking-wider">Tint</Label>
                            <div className="flex gap-2">
                              <Input type="color" value={el.color || '#ef4444'} onChange={(e) => updateCutElement(el.id, { color: e.target.value })} className="h-8 w-12 p-0.5 rounded-md cursor-pointer border-none bg-[#1e1e1e]" />
                              <Input value={el.color || '#ef4444'} onChange={(e) => updateCutElement(el.id, { color: e.target.value })} className="h-8 rounded-md font-mono text-xs uppercase bg-[#1e1e1e] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb]" />
                            </div>
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2"><Label className="text-[9px] uppercase font-bold text-[#888888] tracking-wider">Size ({el.size}%)</Label><Slider value={[el.size]} onValueChange={(v) => updateCutElement(el.id, { size: v[0] })} min={5} max={100} step={1} className="[&>span:first-child]:bg-[#444444] [&>span:first-child>span]:bg-[#2d8ceb] [&_[role=slider]]:bg-[#eeeeee] [&_[role=slider]]:border-[#2d8ceb]" /></div>
                          {(el.type === 'ruler' || el.type === 'arrow') && <div className="space-y-2"><Label className="text-[9px] uppercase font-bold text-[#888888] tracking-wider">Rot ({el.rotation || 0}°)</Label><Slider value={[el.rotation || 0]} onValueChange={(v) => updateCutElement(el.id, { rotation: v[0] })} min={0} max={360} step={1} className="[&>span:first-child]:bg-[#444444] [&>span:first-child>span]:bg-[#2d8ceb] [&_[role=slider]]:bg-[#eeeeee] [&_[role=slider]]:border-[#2d8ceb]" /></div>}
                          <div className="space-y-2"><Label className="text-[9px] uppercase font-bold text-[#888888] tracking-wider">Pos X ({el.x}px)</Label><Slider value={[el.x]} onValueChange={(v) => updateCutElement(el.id, { x: v[0] })} min={-1000} max={1000} step={1} className="[&>span:first-child]:bg-[#444444] [&>span:first-child>span]:bg-[#2d8ceb] [&_[role=slider]]:bg-[#eeeeee] [&_[role=slider]]:border-[#2d8ceb]" /></div>
                          <div className="space-y-2"><Label className="text-[9px] uppercase font-bold text-[#888888] tracking-wider">Pos Y ({el.y}px)</Label><Slider value={[el.y]} onValueChange={(v) => updateCutElement(el.id, { y: v[0] })} min={-1000} max={1000} step={1} className="[&>span:first-child]:bg-[#444444] [&>span:first-child>span]:bg-[#2d8ceb] [&_[role=slider]]:bg-[#eeeeee] [&_[role=slider]]:border-[#2d8ceb]" /></div>
                        </div>
                      </div>
                    </Card>
                  ))}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild><Button variant="outline" className="w-full border-dashed text-[#cccccc] hover:text-[#ffffff] bg-transparent border-[#555555] hover:bg-[#444444] h-10 rounded-xl font-medium"><Plus className="mr-2 h-4 w-4" /> Add Component</Button></DropdownMenuTrigger>
                    <DropdownMenuContent align="center" className="w-[300px] rounded-xl p-2 bg-[#232323] border-[#444444] text-[#eeeeee]">
                      <DropdownMenuItem onClick={() => addCutElement('image')} className="cursor-pointer text-xs py-2 focus:bg-[#333333] focus:text-[#ffffff]"><ImageIcon className="mr-2 h-4 w-4 text-[#aaaaaa]" /> Image Graphic</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addCutElement('video')} className="cursor-pointer text-xs py-2 focus:bg-[#333333] focus:text-[#ffffff]"><Film className="mr-2 h-4 w-4 text-[#aaaaaa]" /> Video Graphic</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addCutElement('ruler')} className="cursor-pointer text-xs py-2 focus:bg-[#333333] focus:text-[#ffffff]"><Ruler className="mr-2 h-4 w-4 text-[#aaaaaa]" /> Measurement Ruler</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => addCutElement('arrow')} className="cursor-pointer text-xs py-2 focus:bg-[#333333] focus:text-[#ffffff]"><Navigation className="mr-2 h-4 w-4 text-[#aaaaaa]" /> Focus Arrow</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            )}

            {template === 'hud' && (
              <div className="space-y-6 animate-in fade-in duration-200">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-[#ffffff] font-semibold"><Target className="h-4 w-4 text-[#cccccc]" /><span className="text-sm">HUD Configuration</span></div>
                  <Button onClick={handleSetDefaultHud} variant="outline" size="sm" className="h-7 px-2 text-[10px] bg-[#333333] border-[#444444] text-[#eeeeee] hover:bg-[#444444] hover:text-[#ffffff]"><Star className="mr-1.5 h-3 w-3 text-yellow-500" /> Set Default</Button>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2 p-4 bg-[#232323] rounded-xl border border-[#444444]">
                    <div className="flex items-center justify-between"><Label className="text-xs font-bold text-[#eeeeee] uppercase flex items-center gap-2 tracking-wider"><Type className="h-3.5 w-3.5 text-[#aaaaaa]" /> Active Title</Label><Switch checked={hudShowTitle} onCheckedChange={setHudShowTitle} className="scale-75 origin-right data-[state=unchecked]:bg-[#444444] data-[state=checked]:bg-[#2d8ceb]" /></div>
                    {hudShowTitle && <div className="flex items-center justify-between pt-3 border-t border-[#444444] mt-3"><Label className="text-[10px] text-[#888888] font-bold uppercase tracking-wider">Drop Shadow</Label><Switch checked={hudTitleShadow} onCheckedChange={setHudTitleShadow} className="scale-75 origin-right data-[state=unchecked]:bg-[#444444] data-[state=checked]:bg-[#2d8ceb]" /></div>}
                  </div>
                  <div className="space-y-2 p-4 bg-[#232323] rounded-xl border border-[#444444]">
                    <div className="flex items-center justify-between"><Label className="text-xs font-bold text-[#eeeeee] uppercase flex items-center gap-2 tracking-wider"><ImageIcon className="h-3.5 w-3.5 text-[#aaaaaa]" /> Profile Image</Label><Switch checked={hudShowImage} onCheckedChange={setHudShowImage} className="scale-75 origin-right data-[state=unchecked]:bg-[#444444] data-[state=checked]:bg-[#2d8ceb]" /></div>
                    {hudShowImage && <div className="flex items-center justify-between pt-3 border-t border-[#444444] mt-3"><Label className="text-[10px] text-[#888888] font-bold uppercase tracking-wider">Drop Shadow</Label><Switch checked={hudImageShadow} onCheckedChange={setHudImageShadow} className="scale-75 origin-right data-[state=unchecked]:bg-[#444444] data-[state=checked]:bg-[#2d8ceb]" /></div>}
                  </div>
                  <div className="space-y-2 p-4 bg-[#232323] rounded-xl border border-[#444444]">
                    <div className="flex items-center justify-between"><Label className="text-xs font-bold text-[#eeeeee] uppercase flex items-center gap-2 tracking-wider"><Target className="h-3.5 w-3.5 text-[#aaaaaa]" /> Progress Track</Label><Switch checked={hudShowProgress} onCheckedChange={setHudShowProgress} className="scale-75 origin-right data-[state=unchecked]:bg-[#444444] data-[state=checked]:bg-[#2d8ceb]" /></div>
                    {hudShowProgress && <div className="flex items-center justify-between pt-3 border-t border-[#444444] mt-3"><Label className="text-[10px] text-[#888888] font-bold uppercase tracking-wider">Drop Shadow</Label><Switch checked={hudProgressBarShadow} onCheckedChange={setHudProgressBarShadow} className="scale-75 origin-right data-[state=unchecked]:bg-[#444444] data-[state=checked]:bg-[#2d8ceb]" /></div>}
                  </div>
                  <div className="h-px bg-[#444444] my-4 w-full"></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">Title Color</Label><div className="flex gap-1.5"><Input type="color" value={hudTitleColor} onChange={(e) => setHudTitleColor(e.target.value)} className="h-8 w-10 p-0.5 rounded-md cursor-pointer border-none bg-[#1e1e1e]" /><Input value={hudTitleColor} onChange={(e) => setHudTitleColor(e.target.value)} className="h-8 rounded-md font-mono text-[10px] uppercase bg-[#1e1e1e] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb]" /></div></div>
                    <div className="space-y-1.5"><Label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider">Track Color</Label><div className="flex gap-1.5"><Input type="color" value={hudProgressColor} onChange={(e) => setHudProgressColor(e.target.value)} className="h-8 w-10 p-0.5 rounded-md cursor-pointer border-none bg-[#1e1e1e]" /><Input value={hudProgressColor} onChange={(e) => setHudProgressColor(e.target.value)} className="h-8 rounded-md font-mono text-[10px] uppercase bg-[#1e1e1e] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb]" /></div></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </aside>
        
        <main className="flex-1 bg-[#1e1e1e] relative flex flex-col items-center justify-center p-4 md:p-12 overflow-hidden shadow-inner">
          <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#ffffff 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
          <div className={`w-full ${format === 'portrait' ? 'max-w-[40vh] aspect-[9/16]' : 'max-w-6xl aspect-video'} bg-black rounded-xl shadow-2xl border border-[#444444] overflow-hidden relative z-10 ring-2 ring-[#333333] transition-all duration-300`}>
            <Player
              component={MyComposition} durationInFrames={durationInFrames} 
              compositionWidth={format === 'portrait' ? 1080 : 1920} 
              compositionHeight={format === 'portrait' ? 1920 : 1080} 
              fps={30}
              style={{ width: '100%', height: '100%' }} controls
              inputProps={{ 
                text, template: template === 'voice' ? 'explainer' : template, format, circleCount, fontFamily, 
                hSpacing: currentGrid.hSpacing, vSpacing: currentGrid.vSpacing, customCircleSize: currentGrid.customCircleSize, cols: currentGrid.cols, rows: currentGrid.rows, 
                elements, showBorder, topicCuts, topicNodes, hudEnabled, hudTitleColor, hudProgressColor, hudShowTitle, hudShowImage, hudShowProgress, hudTitleShadow, hudImageShadow, hudProgressBarShadow,
                defaultVideo: customDefaultVideo
              }}
            />
          </div>
        </main>
      </div>

      {/* Template Save Dialog */}
      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="bg-[#232323] border-[#444444] text-[#eeeeee] rounded-xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#ffffff]">
              {saveMode === 'new' ? `Save New ${saveFolder.toUpperCase()} Template` : 'Update Template'}
            </DialogTitle>
            <DialogDescription className="text-[#aaaaaa]">
              {saveMode === 'new' ? 'Give your template a name to save it to your cloud library.' : `This will overwrite your currently loaded template (${loadedTemplatePath}).`}
            </DialogDescription>
          </DialogHeader>
          {saveMode === 'new' && (
            <div className="py-4">
              <Label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-2 block">Template Name</Label>
              <Input 
                value={newTemplateName} 
                onChange={e => setNewTemplateName(e.target.value)} 
                placeholder="e.g. stats-view" 
                className="bg-[#1e1e1e] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb] focus:ring-1 focus:ring-[#2d8ceb]" 
              />
            </div>
          )}
          <DialogFooter className="mt-2 border-t border-[#444444] pt-4">
            <Button variant="ghost" onClick={() => setIsSaveDialogOpen(false)} className="text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]">Cancel</Button>
            <Button className="bg-[#2d8ceb] hover:bg-[#1a73cc] text-white" onClick={() => saveTemplate(false)} disabled={saveMode === 'new' && !newTemplateName.trim()}>
              <CloudUpload className="h-4 w-4 mr-2" /> Save to Cloud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Preset Save Dialog */}
      <Dialog open={isPresetDialogOpen} onOpenChange={setIsPresetDialogOpen}>
        <DialogContent className="bg-[#232323] border-[#444444] text-[#eeeeee] rounded-xl max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-[#ffffff]">Save Global Preset</DialogTitle>
            <DialogDescription className="text-[#aaaaaa]">
              Save your current API keys, custom prompts, grid settings, and default HUD into a reusable config file.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider mb-2 block">Preset Name</Label>
            <Input 
              value={newPresetName} 
              onChange={e => setNewPresetName(e.target.value)} 
              placeholder="e.g. default" 
              className="bg-[#1e1e1e] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb] focus:ring-1 focus:ring-[#2d8ceb]" 
            />
            <p className="text-[9px] text-[#888888] mt-2 leading-tight">Name it "default" to automatically load it every time the app opens.</p>
          </div>
          <DialogFooter className="mt-2 border-t border-[#444444] pt-4">
            <Button variant="ghost" onClick={() => setIsPresetDialogOpen(false)} className="text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]">Cancel</Button>
            <Button className="bg-[#2d8ceb] hover:bg-[#1a73cc] text-white" onClick={savePreset} disabled={!newPresetName.trim()}>
              <CloudUpload className="h-4 w-4 mr-2" /> Save to Cloud
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Import Local Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="bg-[#232323] border-[#444444] text-[#eeeeee] rounded-xl max-w-md">
          <DialogHeader>
            <DialogTitle className="text-[#ffffff] flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-amber-500" /> Import Built-in Files
            </DialogTitle>
            <DialogDescription className="text-[#aaaaaa]">
              Select which built-in templates and presets you want to upload to your personal cloud account.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
            
            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider block">Built-in Templates</Label>
              {templateDetails.filter(t => t.source === 'local').length === 0 ? (
                <p className="text-xs text-[#555555] italic px-2">No built-in templates found.</p>
              ) : (
                <div className="space-y-2 bg-[#1e1e1e] p-2 rounded-lg border border-[#333333]">
                  {templateDetails.filter(t => t.source === 'local').map(t => (
                    <div key={t.name} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`tpl-${t.name}`} 
                        checked={localTemplatesToImport.includes(t.name)}
                        onCheckedChange={(checked) => {
                          if (checked) setLocalTemplatesToImport(prev => [...prev, t.name]);
                          else setLocalTemplatesToImport(prev => prev.filter(n => n !== t.name));
                        }}
                        className="border-[#555555] data-[state=checked]:bg-[#2d8ceb]"
                      />
                      <label htmlFor={`tpl-${t.name}`} className="text-xs text-[#cccccc] cursor-pointer hover:text-[#ffffff] truncate">
                        {t.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-bold text-[#888888] uppercase tracking-wider block">Built-in Presets</Label>
              {presetDetails.filter(p => p.source === 'local').length === 0 ? (
                <p className="text-xs text-[#555555] italic px-2">No built-in presets found.</p>
              ) : (
                <div className="space-y-2 bg-[#1e1e1e] p-2 rounded-lg border border-[#333333]">
                  {presetDetails.filter(p => p.source === 'local').map(p => (
                    <div key={p.name} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`pre-${p.name}`} 
                        checked={localPresetsToImport.includes(p.name)}
                        onCheckedChange={(checked) => {
                          if (checked) setLocalPresetsToImport(prev => [...prev, p.name]);
                          else setLocalPresetsToImport(prev => prev.filter(n => n !== p.name));
                        }}
                        className="border-[#555555] data-[state=checked]:bg-[#2d8ceb]"
                      />
                      <label htmlFor={`pre-${p.name}`} className="text-xs text-[#cccccc] cursor-pointer hover:text-[#ffffff] truncate">
                        {p.name}
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
          <DialogFooter className="mt-2 border-t border-[#444444] pt-4">
            <Button variant="ghost" onClick={() => setIsImportDialogOpen(false)} className="text-[#cccccc] hover:text-[#ffffff] hover:bg-[#333333]">Cancel</Button>
            <Button className="bg-[#2d8ceb] hover:bg-[#1a73cc] text-white" onClick={handleUploadLocalToCloud} disabled={localTemplatesToImport.length === 0 && localPresetsToImport.length === 0}>
              <CloudUpload className="h-4 w-4 mr-2" /> Upload Selected
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isAIOpen} onOpenChange={setIsAIOpen}>
        <DialogContent className="rounded-2xl max-w-2xl max-h-[90vh] overflow-hidden flex flex-col bg-[#232323] border-[#444444] text-[#eeeeee]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[#ffffff]"><Wand2 className="h-5 w-5 text-[#2d8ceb]" /> AI Video Pipeline</DialogTitle>
            <DialogDescription className="hidden">Configure and execute the AI Video Pipeline.</DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="script" className="w-full mt-2 flex flex-col overflow-hidden h-full">
            <TabsList className="grid w-full grid-cols-4 mb-4 bg-[#1e1e1e] p-1 rounded-xl flex-shrink-0 border border-[#444444]">
              <TabsTrigger value="script" className="rounded-lg data-[state=active]:bg-[#333333] data-[state=active]:text-[#ffffff] text-[#aaaaaa] text-xs"><AlignLeft className="mr-1 h-3 w-3" /> Script</TabsTrigger>
              <TabsTrigger value="prompts" className="rounded-lg data-[state=active]:bg-[#333333] data-[state=active]:text-[#ffffff] text-[#aaaaaa] text-xs"><ListTree className="mr-1 h-3 w-3" /> Prompts</TabsTrigger>
              <TabsTrigger value="settings" className="rounded-lg data-[state=active]:bg-[#333333] data-[state=active]:text-[#ffffff] text-[#aaaaaa] flex gap-1 items-center text-xs"><Settings2 className="h-3 w-3"/> Config</TabsTrigger>
              <TabsTrigger value="generate" className="rounded-lg data-[state=active]:bg-[#2d8ceb] data-[state=active]:text-white text-xs font-bold text-[#aaaaaa] hover:text-[#eeeeee]"><Wand2 className="mr-1 h-3 w-3" /> Run Pipeline</TabsTrigger>
            </TabsList>

            <div className="flex-grow overflow-y-auto pr-2 pb-4 custom-scrollbar">
              <TabsContent value="script" className="space-y-4 m-0">
                <div className="bg-[#1e1e1e] border border-[#444444] p-4 rounded-xl space-y-4 shadow-inner">
                  <div className="flex items-center gap-2 text-[#ffffff] font-semibold mb-1"><Wand2 className="h-4 w-4 text-[#2d8ceb]" /> Auto-Generate Script</div>
                  <p className="text-xs text-[#aaaaaa]">Let the AI write the script for you based on a topic.</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-2 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label className="text-[10px] uppercase font-bold text-[#888888]">Main Topic</Label>
                        <div className="flex items-center gap-2 text-[9px] font-mono text-[#888888]">
                          <span>{usedTopics.length}/{EXPLAINER_TOPICS.length} USED</span>
                          {usedTopics.length > 0 && (
                            <button onClick={handleResetUsedTopics} className="text-[#2d8ceb] hover:text-[#1a73cc] font-bold ml-1 transition-colors">RESET</button>
                          )}
                        </div>
                      </div>
                      <Input 
                        placeholder="e.g. Demon Slayer Breathing Styles" 
                        value={autoScriptTopic} 
                        onChange={(e) => setAutoScriptTopic(e.target.value)}
                        className="bg-[#2d2d2d] border-[#444444] text-[#eeeeee] text-xs h-9 focus:border-[#2d8ceb]"
                      />
                    </div>
                    <div className="space-y-1.5 relative">
                      <Label className="text-[10px] uppercase font-bold text-[#888888]">Topic Count</Label>
                      <div className="flex gap-1.5">
                        <Input 
                          type="number" min="1" max="15" 
                          value={autoScriptCount} 
                          onChange={(e) => setAutoScriptCount(parseInt(e.target.value) || 1)}
                          className="bg-[#2d2d2d] border-[#444444] text-[#eeeeee] text-xs h-9 font-bold focus:border-[#2d8ceb]"
                        />
                        <Button variant="outline" onClick={handleRandomizeTopic} className="h-9 px-3 bg-[#2d2d2d] border-[#444444] text-[#aaaaaa] hover:text-[#ffffff] hover:bg-[#383838]" title="Randomize Topic & Count"><Dices className="h-4 w-4" /></Button>
                      </div>
                    </div>
                  </div>
                  
                  <Button 
                    onClick={handleGenerateScript} 
                    disabled={isGeneratingScript || !autoScriptTopic.trim()} 
                    className="w-full bg-[#333333] text-[#eeeeee] hover:bg-[#444444] border border-[#555555] h-9 text-xs font-semibold rounded-lg shadow-sm"
                  >
                    {isGeneratingScript ? <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#2d8ceb]" /> : <Wand2 className="mr-2 h-4 w-4 text-[#2d8ceb]" />}
                    {isGeneratingScript ? (scriptGenStatus || "Writing Script...") : "Generate Detailed Script"}
                  </Button>
                </div>

                <div className="flex items-center gap-3 my-4"><div className="h-px bg-[#444444] flex-grow"></div><span className="text-[10px] font-bold text-[#888888] uppercase tracking-widest">OR PASTE YOUR OWN</span><div className="h-px bg-[#444444] flex-grow"></div></div>

                <div className="space-y-2">
                  <Label className="text-xs uppercase font-bold text-[#888888]">Final Video Script</Label>
                  <Textarea placeholder="Paste your script here... Add 'category: anime' at the very bottom." value={videoScript} onChange={e => setVideoScript(e.target.value)} className="rounded-xl min-h-[250px] text-sm bg-[#1e1e1e] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb]" />
                </div>
              </TabsContent>

              <TabsContent value="prompts" className="space-y-6 m-0">
                <p className="text-sm text-[#aaaaaa]">The pipeline is now split into steps so each prompt only has one responsibility, reducing errors.</p>
                <div className="space-y-2"><Label className="text-xs uppercase font-bold text-[#cccccc]">Chain 0A: The Outliner (Topic List)</Label><Textarea value={promptOutline} onChange={e => setPromptOutline(e.target.value)} className="rounded-xl min-h-[120px] text-[10px] font-mono bg-[#1e1e1e] border-[#444444] text-[#cccccc] focus:border-[#2d8ceb]" /></div>
                <div className="space-y-2"><Label className="text-xs uppercase font-bold text-[#cccccc]">Chain 0B: The Segment Writer</Label><Textarea value={promptSegment} onChange={e => setPromptSegment(e.target.value)} className="rounded-xl min-h-[120px] text-[10px] font-mono bg-[#1e1e1e] border-[#444444] text-[#cccccc] focus:border-[#2d8ceb]" /></div>
                <div className="space-y-2"><Label className="text-xs uppercase font-bold text-[#cccccc]">Chain 1: The Editor (Text Splitting)</Label><Textarea value={prompt1} onChange={e => setPrompt1(e.target.value)} className="rounded-xl min-h-[120px] text-[10px] font-mono bg-[#1e1e1e] border-[#444444] text-[#cccccc] focus:border-[#2d8ceb]" /></div>
                <div className="space-y-2"><Label className="text-xs uppercase font-bold text-[#cccccc]">Chain 2: The Director (Layout Assignments)</Label><Textarea value={prompt2} onChange={e => setPrompt2(e.target.value)} className="rounded-xl min-h-[120px] text-[10px] font-mono bg-[#1e1e1e] border-[#444444] text-[#cccccc] focus:border-[#2d8ceb]" /></div>
                <div className="space-y-2"><Label className="text-xs uppercase font-bold text-[#cccccc]">Chain 3: The Researcher (Media Queries)</Label><Textarea value={prompt3} onChange={e => setPrompt3(e.target.value)} className="rounded-xl min-h-[120px] text-[10px] font-mono bg-[#1e1e1e] border-[#444444] text-[#cccccc] focus:border-[#2d8ceb]" /></div>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6 m-0">
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl mb-4">
                  <div className="flex items-start gap-2">
                    <Lock className="h-5 w-5 text-emerald-400 mt-0.5 shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-400">Secure Server-Side API Keys</h4>
                      <p className="text-xs text-[#aaaaaa] mt-1">
                        API keys are now securely managed from your backend <code className="text-[#cccccc]">.env</code> file (<code className="text-[#cccccc]">GLOBAL_API_KEY</code>, <code className="text-[#cccccc]">SCRIPT_API_KEY</code>). They are no longer exposed or requested in the browser.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2"><Settings2 className="h-4 w-4 text-[#aaaaaa]" /><h4 className="text-sm font-bold text-[#eeeeee]">Pipeline Execution AI</h4></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-[#888888]">Provider</Label>
                      <Select value={aiProvider} onValueChange={handleProviderChange}><SelectTrigger className="rounded-xl h-9 text-xs bg-[#1e1e1e] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb]"><SelectValue /></SelectTrigger><SelectContent className="bg-[#232323] border-[#444444] text-[#eeeeee]"><SelectItem value="groq" className="text-xs">Groq</SelectItem><SelectItem value="openrouter" className="text-xs">OpenRouter</SelectItem><SelectItem value="openai" className="text-xs">OpenAI</SelectItem><SelectItem value="anthropic" className="text-xs">Anthropic</SelectItem></SelectContent></Select>
                    </div>
                    <div className="space-y-2"><Label className="text-[10px] uppercase font-bold text-[#888888]">Model</Label><Input value={aiModel} onChange={e => setAiModel(e.target.value)} className="rounded-xl h-9 text-xs bg-[#1e1e1e] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb]" /></div>
                  </div>
                </div>

                <div className="h-px bg-[#444444] my-4"></div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2"><AlignLeft className="h-4 w-4 text-[#aaaaaa]" /><h4 className="text-sm font-bold text-[#eeeeee]">Script Generation AI</h4></div>
                  <p className="text-[10px] text-[#888888] leading-tight">Use a more powerful model here to write higher quality scripts.</p>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] uppercase font-bold text-[#888888]">Provider</Label>
                      <Select value={scriptAiProvider} onValueChange={handleScriptProviderChange}><SelectTrigger className="rounded-xl h-9 text-xs bg-[#1e1e1e] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb]"><SelectValue /></SelectTrigger><SelectContent className="bg-[#232323] border-[#444444] text-[#eeeeee]"><SelectItem value="groq" className="text-xs">Groq</SelectItem><SelectItem value="openrouter" className="text-xs">OpenRouter</SelectItem><SelectItem value="openai" className="text-xs">OpenAI</SelectItem><SelectItem value="anthropic" className="text-xs">Anthropic</SelectItem></SelectContent></Select>
                    </div>
                    <div className="space-y-2"><Label className="text-[10px] uppercase font-bold text-[#888888]">Model</Label><Input value={scriptAiModel} onChange={e => setScriptAiModel(e.target.value)} className="rounded-xl h-9 text-xs bg-[#1e1e1e] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb]" /></div>
                  </div>
                </div>

                <div className="h-px bg-[#444444] my-4"></div>
                
                <div className="space-y-2 pt-2">
                  <Label className="text-[10px] uppercase font-bold text-[#aaaaaa]">Sentences Per Visual Cut</Label>
                  <Select value={sentencesPerCut.toString()} onValueChange={(v) => setSentencesPerCut(parseInt(v))}>
                    <SelectTrigger className="rounded-xl h-9 text-xs bg-[#1e1e1e] border-[#444444] text-[#eeeeee] focus:border-[#2d8ceb]"><SelectValue /></SelectTrigger>
                    <SelectContent className="bg-[#232323] border-[#444444] text-[#eeeeee]"><SelectItem value="1" className="text-xs">1 Sentence (Fast paced, lots of cuts)</SelectItem><SelectItem value="2" className="text-xs">2 Sentences (Balanced pacing)</SelectItem><SelectItem value="3" className="text-xs">3 Sentences (Slower paced)</SelectItem><SelectItem value="4" className="text-xs">4 Sentences (Very few cuts)</SelectItem></SelectContent>
                  </Select>
                  <p className="text-[10px] text-[#888888]">Groups sentences together before sending them to the Director AI, reducing the total number of visual changes per topic.</p>
                </div>
              </TabsContent>

              <TabsContent value="generate" className="space-y-6 m-0 h-full flex flex-col py-4">
                <div className="text-center space-y-2 max-w-sm mx-auto">
                  <h3 className="text-lg font-bold text-[#ffffff]">Start Automation</h3>
                  <p className="text-sm text-[#aaaaaa] pb-4">This extracts topics, assigns layouts, grabs sentences *specific* to each topic, and downloads media tailored exactly to that sentence + category.</p>
                  <Button onClick={handleAIGenerate} disabled={isGenerating || !videoScript.trim()} className="bg-[#2d8ceb] text-white hover:bg-[#2576c7] rounded-xl w-full h-12 shadow-lg mb-4 text-sm font-bold">
                    {isGenerating ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Wand2 className="mr-2 h-5 w-5" />}
                    {isGenerating ? "Processing..." : "Run Pipeline"}
                  </Button>
                </div>
                {(isGenerating || generationLogs.length > 0) && (
                  <div className="w-full bg-[#171717] rounded-xl border border-[#444444] overflow-hidden flex flex-col h-64 shadow-inner mt-4">
                    <div className="bg-[#232323] px-4 py-2 flex items-center justify-between border-b border-[#444444]">
                      <div className="flex items-center gap-2"><TerminalSquare className="h-4 w-4 text-[#888888]" /><span className="text-xs font-mono text-[#aaaaaa]">Pipeline Activity Log</span></div>
                      {isGenerating && <Loader2 className="h-3 w-3 animate-spin text-[#2d8ceb]" />}
                    </div>
                    <div className="p-4 flex-grow overflow-y-auto font-mono text-[10px] sm:text-xs space-y-1.5 scroll-smooth custom-scrollbar">
                      {generationLogs.map((log, idx) => (
                        <div key={idx} className={log.type === 'search' ? 'text-[#cccccc]' : log.type === 'success' ? 'text-emerald-400' : log.type === 'warning' ? 'text-amber-400' : log.type === 'error' ? 'text-red-400' : 'text-[#aaaaaa]'}>
                          <span className="opacity-50 mr-2">[{new Date().toLocaleTimeString()}]</span>{log.message}
                        </div>
                      ))}
                      <div ref={logsEndRef} />
                    </div>
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default VideoEditor;