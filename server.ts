import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { renderMediaOnLambda, renderStillOnLambda, getRenderProgress, deleteRender } from '@remotion/lambda';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import path from 'path';
import fs from 'fs';
import * as DDG from 'duck-duck-scrape';
import { execFile, exec } from 'child_process';
import util from 'util';
import dotenv from 'dotenv';
import * as mm from 'music-metadata';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const execFilePromise = util.promisify(execFile);
const execPromise = util.promisify(exec);

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(express.static(path.resolve('./public')));
app.use('/out', express.static(path.resolve('./out')));

// Initialize Supabase Admin Client for backend operations
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Helper function to upload dynamic media to Supabase
const uploadFileToCloud = async (localPath: string, filename: string): Promise<string> => {
  const fileBuffer = fs.readFileSync(localPath);
  let contentType = 'application/octet-stream';
  if (filename.endsWith('.mp4')) contentType = 'video/mp4';
  else if (filename.endsWith('.mp3')) contentType = 'audio/mpeg';
  else if (filename.endsWith('.wav')) contentType = 'audio/wav';
  else if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) contentType = 'image/jpeg';
  else if (filename.endsWith('.png')) contentType = 'image/png';

  const { error } = await supabaseAdmin.storage
    .from('user_assets')
    .upload(`dynamic/${filename}`, fileBuffer, {
      upsert: true,
      contentType
    });

  if (error) {
    console.error("Supabase upload error:", error);
    throw error;
  }

  const { data } = supabaseAdmin.storage.from('user_assets').getPublicUrl(`dynamic/${filename}`);
  return data.publicUrl;
};

// Supabase Auth Middleware (Required)
const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Missing or invalid authorization header' });
  }
  const token = authHeader.split(' ')[1];
  
  if (token === 'internal_job_token') {
    const internalUserId = req.headers['x-user-id'];
    if (internalUserId) {
      (req as any).user = { sub: internalUserId };
      return next();
    }
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (error || !user) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    (req as any).user = { sub: user.id, ...user };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Supabase Auth Middleware (Optional)
const optionalAuth = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }
  const token = authHeader.split(' ')[1];
  
  if (token === 'internal_job_token') {
    const internalUserId = req.headers['x-user-id'];
    if (internalUserId) (req as any).user = { sub: internalUserId };
    return next();
  }

  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
    if (!error && user) {
      (req as any).user = { sub: user.id, ...user };
    }
  } catch (err) {}
  next();
};

const outputDir = path.resolve('./out');
if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

const templatesDir = path.resolve('./templates');
if (!fs.existsSync(templatesDir)) fs.mkdirSync(templatesDir);

const presetsDir = path.resolve('./presets');
if (!fs.existsSync(presetsDir)) fs.mkdirSync(presetsDir);

const delayFn = (ms: number) => new Promise(res => setTimeout(res, ms));

const cleanPublicAssets = () => {
  console.log(`\n🧹 Auto-cleanup: Sweeping public folder...`);
  const publicDir = path.resolve('./public');
  if (!fs.existsSync(publicDir)) return;
  
  const files = fs.readdirSync(publicDir);
  let deletedCount = 0;
  for (const file of files) {
    if (file === 'placeholder.mp4' || file === 'placeholder.png' || file === 'vite.svg') continue;
    
    if (file.startsWith('image_') || file.startsWith('video_') || file.startsWith('voice_')) {
      try {
        fs.unlinkSync(path.join(publicDir, file));
        deletedCount++;
      } catch (e) {}
    }
  }
  if (deletedCount > 0) {
    console.log(`🧹 Deleted ${deletedCount} temporary media files to save space.`);
  }
};

const extractS3Key = (urlStr: string, bucketName?: string) => {
  try {
    const urlObj = new URL(urlStr);
    let key = urlObj.pathname.startsWith('/') ? urlObj.pathname.substring(1) : urlObj.pathname;
    
    if (bucketName && key.startsWith(`${bucketName}/`)) {
      key = key.substring(bucketName.length + 1);
    }
    return decodeURIComponent(key);
  } catch {
    return null;
  }
};


app.post('/api/render', requireAuth, async (req, res) => {
  console.log(`\n========================================`);
  console.log(`📥 Received Lambda render request!`);

  res.setHeader('Content-Type', 'application/x-ndjson');
  res.setHeader('Transfer-Encoding', 'chunked');
  res.flushHeaders(); 
  
  const inputProps = req.body;
  const userId = (req as any).user.sub;
  
  try {
    const functionName = process.env.REMOTION_FUNCTION_NAME;
    const serveUrl = process.env.REMOTION_SERVE_URL;
    const region = (process.env.REMOTION_AWS_REGION as any) || 'us-east-1';

    if (!functionName || !serveUrl) {
      throw new Error("Missing REMOTION_FUNCTION_NAME or REMOTION_SERVE_URL in .env. Please run the deploy script first.");
    }

    console.log(`🎬 Starting Remotion render on AWS Lambda...`);
    res.write(JSON.stringify({ type: 'info', message: 'Triggering AWS Lambda render...' }) + '\n');

    const fpl = parseInt(process.env.FRAMES_PER_LAMBDA || '900', 10);

    const { renderId, bucketName } = await renderMediaOnLambda({
      region,
      functionName,
      serveUrl,
      composition: 'MyVideo',
      inputProps,
      codec: 'h264',
      privacy: 'public', 
      framesPerLambda: fpl, 
    });

    console.log(`λ Lambda Job Started: ${renderId}`);
    res.write(JSON.stringify({ type: 'info', message: `Lambda Render Started: ${renderId}` }) + '\n');

    // Save the inputProps to Supabase Storage so we can convert it later!
    try {
      const configPath = `dynamic/config_${renderId}.json`;
      await supabaseAdmin.storage.from('user_assets').upload(configPath, JSON.stringify(inputProps), {
        upsert: true,
        contentType: 'application/json'
      });
      console.log(`💾 Saved render config to Cloud Storage (${configPath})`);
    } catch (err: any) {
      console.error(`⚠️ Failed to save render config:`, err.message);
    }

    await supabaseAdmin.from('video_exports').upsert({
      id: renderId,
      user_id: userId,
      title: inputProps.text || 'Explainer Video',
      video_url: '',
      thumbnail_url: '',
      created_at: Date.now(),
      status: 'failed'
    });

    let renderDone = false;
    let outputUrl = '';

    while (!renderDone) {
      await delayFn(2000);
      const progress = await getRenderProgress({
        renderId,
        bucketName,
        functionName,
        region,
      });

      if (progress.fatalErrorEncountered) {
        throw new Error(progress.errors[0]?.message || 'Lambda render encountered a fatal error');
      }

      if (progress.done && progress.outputFile) {
        renderDone = true;
        outputUrl = progress.outputFile;
        res.write(JSON.stringify({ type: 'progress', percent: 100, renderedFrames: 100, totalFrames: 100 }) + '\n');
      } else {
        const percent = Math.round(progress.overallProgress * 100);
        console.log(`⏳ Lambda Progress: ${percent}%`);
        res.write(JSON.stringify({ type: 'progress', percent, renderedFrames: percent, totalFrames: 100 }) + '\n');
      }
    }

    console.log(`📸 Generating grid thumbnail on Lambda...`);
    res.write(JSON.stringify({ type: 'info', message: 'Generating thumbnail on Lambda...' }) + '\n');
    
    const { url: thumbnailUrl } = await renderStillOnLambda({
      region,
      functionName,
      serveUrl,
      composition: 'MyVideo',
      inputProps,
      frame: 59, 
      imageFormat: 'jpeg',
      privacy: 'public'
    });

    const timestamp = Date.now();
    const safeTitle = (inputProps.text || 'video').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase().substring(0, 30);
    const jobFolderName = `${safeTitle}_${timestamp}`;

    await supabaseAdmin.from('video_exports').upsert({
      id: renderId,
      user_id: userId,
      title: inputProps.text || 'Explainer Video',
      video_url: outputUrl,
      thumbnail_url: thumbnailUrl,
      created_at: timestamp,
      status: 'completed'
    });

    console.log(`✅ Lambda Render successfully finished! Output: ${outputUrl}\n========================================\n`);
    res.write(JSON.stringify({ 
      type: 'done', output: outputUrl, thumbnail: thumbnailUrl, 
      videoName: `video_${timestamp}.mp4`, thumbnailName: `thumb_${timestamp}.jpeg`,
      folderName: jobFolderName, title: inputProps.text || 'Explainer Video'
    }) + '\n');
    res.end();

    setTimeout(() => cleanPublicAssets(), 2000);

  } catch (error: any) {
    console.error('\n❌ Render failed:', error);
    res.write(JSON.stringify({ type: 'error', error: error.message }) + '\n');
    res.end();
    setTimeout(() => cleanPublicAssets(), 2000);
  }
});


// Template API
app.post('/api/templates', requireAuth, async (req, res) => {
  const { name, config } = req.body;
  const userId = (req as any).user.sub;
  if (!name) return res.status(400).json({ error: 'Template name is required' });
  
  const { error } = await supabaseAdmin.from('templates').upsert({
    user_id: userId,
    name,
    config
  }, { onConflict: 'name,user_id' });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: `Template ${name} saved to Cloud.` });
});

app.post('/api/admin/templates', requireAuth, async (req, res) => {
  const { name, config } = req.body;
  const userId = (req as any).user.sub;
  if (userId !== process.env.ADMIN_USER_ID) return res.status(403).json({ error: 'Admin access required' });
  
  const { error } = await supabaseAdmin.from('templates').upsert({
    user_id: userId,
    name,
    config,
    is_global: true
  }, { onConflict: 'name,user_id' });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: `Global Template ${name} saved.` });
});

app.delete('/api/templates/:name', requireAuth, async (req, res) => {
  const userId = (req as any).user.sub;
  const { error } = await supabaseAdmin.from('templates').delete().eq('name', req.params.name).eq('user_id', userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get('/api/templates', optionalAuth, async (req, res) => {
  const userId = (req as any).user?.sub;
  
  let query = supabaseAdmin.from('templates').select('name, is_global, user_id');
  if (userId) {
    query = query.or(`is_global.eq.true,user_id.eq.${userId}`);
  } else {
    query = query.eq('is_global', true);
  }
  
  const { data, error } = await query;
  let cloudTemplates = (data || []).map(t => ({ name: t.name, source: 'cloud', is_global: t.is_global, user_id: t.user_id }));
  
  const files = fs.existsSync(templatesDir) ? fs.readdirSync(templatesDir).filter(f => f.endsWith('.json')) : [];
  const localTemplates = files.map(f => ({ name: f.replace('.json', ''), source: 'local', is_global: false, user_id: null }));
  
  const map = new Map();
  localTemplates.forEach(t => map.set(t.name, t));
  cloudTemplates.forEach(t => map.set(t.name, t)); 
  
  const combined = Array.from(map.values());
  res.json({ success: true, templates: combined.map(t => t.name), templateDetails: combined });
});

app.get('/api/templates/:name', optionalAuth, async (req, res) => {
  const name = req.params.name;
  const userId = (req as any).user?.sub;
  const forceLocal = req.query.source === 'local';
  
  if (!forceLocal) {
    let query = supabaseAdmin.from('templates').select('config').eq('name', name);
    if (userId) query = query.or(`is_global.eq.true,user_id.eq.${userId}`);
    else query = query.eq('is_global', true);
    
    const { data } = await query.limit(1);
    if (data && data.length > 0) {
      return res.json({ success: true, config: data[0].config, source: 'cloud' });
    }
  }
  
  const filePath = path.join(templatesDir, `${name}.json`);
  if (fs.existsSync(filePath)) {
    const config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return res.json({ success: true, config, source: 'local' });
  }
  
  res.status(404).json({ error: 'Template not found' });
});


// Presets API
app.post('/api/presets', requireAuth, async (req, res) => {
  const { name, config } = req.body;
  const userId = (req as any).user.sub;
  if (!name) return res.status(400).json({ error: 'Preset name is required' });
  
  const { error } = await supabaseAdmin.from('presets').upsert({
    user_id: userId,
    name,
    config
  }, { onConflict: 'name,user_id' });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: `Preset ${name} saved to Cloud.` });
});

app.post('/api/admin/presets', requireAuth, async (req, res) => {
  const { name, config } = req.body;
  const userId = (req as any).user.sub;
  if (userId !== process.env.ADMIN_USER_ID) return res.status(403).json({ error: 'Admin access required' });
  
  const { error } = await supabaseAdmin.from('presets').upsert({
    user_id: userId,
    name,
    config,
    is_global: true
  }, { onConflict: 'name,user_id' });
  
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true, message: `Global Preset ${name} saved.` });
});

app.delete('/api/presets/:name', requireAuth, async (req, res) => {
  const userId = (req as any).user.sub;
  const { error } = await supabaseAdmin.from('presets').delete().eq('name', req.params.name).eq('user_id', userId);
  if (error) return res.status(500).json({ error: error.message });
  res.json({ success: true });
});

app.get('/api/presets', optionalAuth, async (req, res) => {
  const userId = (req as any).user?.sub;
  
  let query = supabaseAdmin.from('presets').select('name, is_global, user_id');
  if (userId) {
    query = query.or(`is_global.eq.true,user_id.eq.${userId}`);
  } else {
    query = query.eq('is_global', true);
  }
  
  const { data, error } = await query;
  let cloudPresets = (data || []).map(t => ({ name: t.name, source: 'cloud', is_global: t.is_global, user_id: t.user_id }));
  
  const files = fs.existsSync(presetsDir) ? fs.readdirSync(presetsDir).filter(f => f.endsWith('.json')) : [];
  const localPresets = files.map(f => ({ name: f.replace('.json', ''), source: 'local', is_global: false, user_id: null }));
  
  const map = new Map();
  localPresets.forEach(t => map.set(t.name, t));
  cloudPresets.forEach(t => map.set(t.name, t)); 
  
  const combined = Array.from(map.values());
  res.json({ success: true, presets: combined.map(t => t.name), presetDetails: combined });
});

app.get('/api/presets/:name', optionalAuth, async (req, res) => {
  const name = req.params.name;
  const userId = (req as any).user?.sub;
  const forceLocal = req.query.source === 'local';
  
  if (!forceLocal) {
    let query = supabaseAdmin.from('presets').select('config').eq('name', name);
    if (userId) query = query.or(`is_global.eq.true,user_id.eq.${userId}`);
    else query = query.eq('is_global', true);
    
    const { data } = await query.limit(1);
    if (data && data.length > 0) {
      return res.json({ success: true, config: data[0].config, source: 'cloud' });
    }
  }
  
  const filePath = path.join(presetsDir, `${name}.json`);
  if (fs.existsSync(filePath)) {
    const config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return res.json({ success: true, config, source: 'local' });
  }
  
  res.status(404).json({ error: 'Preset not found' });
});


// ==========================================
// Admin Configuration API (PIN Protected)
// ==========================================

app.post('/api/admin/verify-pin', requireAuth, (req, res) => {
  const { pin } = req.body;
  const expectedPin = process.env.ADMIN_PIN || '1234';
  if (pin === expectedPin) {
    res.json({ success: true });
  } else {
    res.status(403).json({ success: false, error: 'Invalid PIN' });
  }
});

app.get('/api/admin/config', requireAuth, (req, res) => {
  res.json({ success: true, framesPerLambda: process.env.FRAMES_PER_LAMBDA || '900' });
});

app.post('/api/admin/config', requireAuth, (req, res) => {
  const { pin, framesPerLambda } = req.body;
  const expectedPin = process.env.ADMIN_PIN || '1234';
  if (pin !== expectedPin) return res.status(403).json({ error: 'Invalid PIN' });
  
  const envPath = path.resolve('./.env');
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  const regex = /^FRAMES_PER_LAMBDA=.*$/m;
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `FRAMES_PER_LAMBDA=${framesPerLambda}`);
  } else {
    envContent += `\nFRAMES_PER_LAMBDA=${framesPerLambda}`;
  }
  fs.writeFileSync(envPath, envContent.trim() + '\n');
  process.env.FRAMES_PER_LAMBDA = framesPerLambda;
  
  res.json({ success: true });
});

app.post('/api/admin/deploy-site', requireAuth, async (req, res) => {
  const { pin } = req.body;
  const expectedPin = process.env.ADMIN_PIN || '1234';
  if (pin !== expectedPin) return res.status(403).json({ error: 'Invalid PIN' });
  
  try {
    const { stdout } = await execPromise('npx tsx scripts/deploy-lambda.ts');
    console.log("Deploy success:", stdout);
    
    dotenv.config({ override: true });
    
    res.json({ success: true, logs: stdout });
  } catch (err: any) {
    console.error("Deploy error:", err);
    res.status(500).json({ error: err.message, logs: err.stdout });
  }
});


// Voice API
app.post('/api/elevenlabs/generate', async (req, res) => {
  try {
    const { text, voiceId, index } = req.body;
    const keyToUse = process.env.ELEVENLABS_API_KEY || process.env.VITE_ELEVENLABS_API_KEY;
    if (!text || !keyToUse || !voiceId) return res.status(400).json({ error: 'Missing parameters or Server API Key' });
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: { 'Accept': 'audio/mpeg', 'Content-Type': 'application/json', 'xi-api-key': keyToUse },
      body: JSON.stringify({ text, model_id: 'eleven_multilingual_v2', voice_settings: { stability: 0.5, similarity_boost: 0.75 } })
    });
    if (!response.ok) throw new Error('ElevenLabs API Error');
    
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const filename = `voice_${index}_${Date.now()}.mp3`;
    const filePath = path.join(path.resolve('./public'), filename);
    
    fs.writeFileSync(filePath, buffer);
    const publicUrl = await uploadFileToCloud(filePath, filename);
    
    res.json({ success: true, filename: publicUrl, localFilename: filename });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/kokoro/generate', async (req, res) => {
  try {
    const { text, voiceId, index } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });
    let audioBuffer: Buffer;
    try {
      const { KokoroTTS } = await import('kokoro-js');
      const { WaveFile } = await import('wavefile');
      const tts = await KokoroTTS.from_pretrained('hexgrad/Kokoro-82M');
      const audio = await tts.generate(text, { voice: voiceId || 'af_bella' });
      const wav = new WaveFile();
      wav.fromScratch(1, audio.sample_rate || 24000, '32f', audio.audio);
      audioBuffer = wav.toBuffer();
    } catch (kokoroError: any) {
      const googleTTS = await import('google-tts-api');
      const results = googleTTS.getAllAudioUrls(text, { lang: 'en', slow: false, splitPunct: ',.?' });
      const buffers = [];
      for (const result of results) {
          const response = await fetch(result.url);
          buffers.push(Buffer.from(await response.arrayBuffer()));
      }
      audioBuffer = Buffer.concat(buffers);
    }
    const filename = `voice_${index}_${Date.now()}.wav`;
    const filePath = path.join(path.resolve('./public'), filename);
    
    fs.writeFileSync(filePath, audioBuffer);
    const publicUrl = await uploadFileToCloud(filePath, filename);
    
    res.json({ success: true, filename: publicUrl, localFilename: filename });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/testing/generate', async (req, res) => {
  try {
    const { text, index } = req.body;
    if (!text) return res.status(400).json({ error: 'Missing text' });
    const googleTTS = await import('google-tts-api');
    const results = googleTTS.getAllAudioUrls(text, { lang: 'en', slow: false, splitPunct: ',.?' });
    const buffers = [];
    for (const result of results) {
        const response = await fetch(result.url);
        buffers.push(Buffer.from(await response.arrayBuffer()));
    }
    const audioBuffer = Buffer.concat(buffers);
    const filename = `voice_${index}_${Date.now()}.mp3`;
    const filePath = path.join(path.resolve('./public'), filename);
    
    fs.writeFileSync(filePath, audioBuffer);
    const publicUrl = await uploadFileToCloud(filePath, filename);
    
    res.json({ success: true, filename: publicUrl, localFilename: filename });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// Unified AI Generative Endpoint
app.post('/api/llm/generate', async (req, res) => {
  try {
    const { system, user, provider, model, useScriptKey } = req.body;
    
    let key = useScriptKey
        ? (process.env.SCRIPT_API_KEY || process.env.VITE_SCRIPT_API_KEY || process.env.GLOBAL_API_KEY || process.env.VITE_GLOBAL_API_KEY)
        : (process.env.GLOBAL_API_KEY || process.env.VITE_GLOBAL_API_KEY);

    if (!key) {
      throw new Error("API key not configured on server. Please add GLOBAL_API_KEY to the .env file.");
    }

    const result = await callLLMServer(system, user, provider, model, key);
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Media Searching
app.get('/api/media/search', async (req, res) => {
  try {
    const { q, type } = req.query;
    if (!q) return res.status(400).json({ error: 'Query required' });
    let results = [];
    try {
      if (type === 'image') {
        const ddgRes = await DDG.searchImages(q as string, { safeSearch: DDG.SafeSearchType.MODERATE });
        results = ddgRes.results;
      } else if (type === 'video') {
        const ddgRes = await DDG.searchVideos(q as string, { safeSearch: DDG.SafeSearchType.MODERATE });
        results = ddgRes.results;
      } else return res.status(400).json({ error: 'Invalid type' });
    } catch (scrapeError: any) {
      const headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' };
      const htmlRes = await fetch(`https://duckduckgo.com/?q=${encodeURIComponent(q as string)}`, { headers });
      const html = await htmlRes.text();
      const vqdMatch = html.match(/vqd=(?:'|")?([^'"&]+)(?:'|")?/);
      if (!vqdMatch) throw new Error("Could not extract VQD token");
      const vqd = vqdMatch[1];
      const apiUrl = type === 'image' 
        ? `https://duckduckgo.com/i.js?l=us-en&o=json&q=${encodeURIComponent(q as string)}&vqd=${vqd}&f=,,,,&p=1`
        : `https://duckduckgo.com/v.js?l=us-en&o=json&q=${encodeURIComponent(q as string)}&vqd=${vqd}&f=,,,,&p=1`;
      const apiRes = await fetch(apiUrl, { headers });
      if (!apiRes.ok) throw new Error(`Fallback API returned ${apiRes.status}`);
      const data = await apiRes.json();
      results = data.results || [];
    }
    res.json({ success: true, results });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/media/download', async (req, res) => {
  try {
    const { url, filename } = req.body;
    if (!url || !filename) return res.status(400).json({ error: 'url and filename required' });
    const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    if (!response.ok) throw new Error(`Failed to download: ${response.statusText}`);
    if ((response.headers.get('content-type') || '').includes('text/html')) throw new Error("HTML web page rejected");
    
    const arrayBuffer = await response.arrayBuffer();
    const filePath = path.join(path.resolve('./public'), filename);
    
    fs.writeFileSync(filePath, Buffer.from(arrayBuffer));
    if (fs.statSync(filePath).size < 5000) { fs.unlinkSync(filePath); throw new Error("File too small"); }
    
    const publicUrl = await uploadFileToCloud(filePath, filename);
    res.json({ success: true, filename: publicUrl, localFilename: filename });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

app.post('/api/media/download-youtube', async (req, res) => {
  try {
    const { url, filename, durationSecs } = req.body;
    if (!url || !filename) return res.status(400).json({ error: 'url and filename required' });
    
    const publicDir = path.resolve('./public');
    const outputPath = path.join(publicDir, filename);
    const binDir = path.resolve('./bin');
    if (!fs.existsSync(binDir)) throw new Error('bin folder not found');
    
    const files = fs.readdirSync(binDir);
    const downloaderFile = files.find(f => f.toLowerCase().includes('yt-dlp') || f.toLowerCase().includes('youtube-dl')) || files[0];
    if (!downloaderFile) throw new Error('No yt-dlp executable found in bin folder');
    const downloaderPath = path.join(binDir, downloaderFile);

    let hasFfmpeg = files.some(f => f.toLowerCase().includes('ffmpeg'));
    if (!hasFfmpeg) {
      try { await execFilePromise('ffmpeg', ['-version']); hasFfmpeg = true; } catch (e) {}
    }

    const args = ['--no-playlist', '-o', outputPath];
    if (hasFfmpeg) args.push('--ffmpeg-location', binDir);

    if (durationSecs) {
      if (!hasFfmpeg) throw new Error("FFmpeg missing. Required for slicing.");
      args.push('-f', 'bestvideo[ext=mp4][vcodec^=avc]+bestaudio[ext=m4a]/best[ext=mp4]/best', '--download-sections', `*0-${Math.ceil(Number(durationSecs))}`);
    } else {
      args.push('-f', hasFfmpeg ? 'bestvideo[ext=mp4][vcodec^=avc]+bestaudio[ext=m4a]/best[ext=mp4]/best' : 'best[ext=mp4]/best');
      if (hasFfmpeg) args.push('--merge-output-format', 'mp4');
    }
    args.push(url);

    await execFilePromise(downloaderPath, args);
    if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 5000) throw new Error('Download missing or corrupt');
    
    const publicUrl = await uploadFileToCloud(outputPath, filename);
    res.json({ success: true, filename: publicUrl, localFilename: filename });
  } catch (error: any) { res.status(500).json({ success: false, error: error.message }); }
});

// PRESIGN MULTIPLE S3 URLS
app.post('/api/renders/presign', requireAuth, async (req, res) => {
  try {
    const { keys } = req.body;
    const bucketName = process.env.REMOTION_BUCKET_NAME;
    const region = process.env.REMOTION_AWS_REGION || 'us-east-1';
    
    if (!bucketName) {
      return res.json({ success: true, urlMap: {} });
    }
    
    const s3Client = new S3Client({ region });
    const urlMap: Record<string, string> = {};
    
    await Promise.all(keys.map(async (urlOrKey: string) => {
      if (!urlOrKey) return;
      let key = urlOrKey;
      
      if (key.startsWith('http')) {
         key = extractS3Key(key, bucketName) || key;
      }
      
      if (key.startsWith('http')) {
         urlMap[urlOrKey] = urlOrKey;
         return;
      }
      
      try {
        const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
        urlMap[urlOrKey] = await getSignedUrl(s3Client, command, { expiresIn: 21600 }); // 6 hours
      } catch(e) {
        urlMap[urlOrKey] = urlOrKey;
      }
    }));
    
    res.json({ success: true, urlMap });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// FORMAT CONVERSION ENDPOINT
app.post('/api/renders/:id/convert', requireAuth, async (req, res) => {
  try {
    const renderId = req.params.id;
    const userId = (req as any).user.sub;

    // Fetch the original config that we now save inside /api/render
    const configPath = `dynamic/config_${renderId}.json`;
    const { data, error } = await supabaseAdmin.storage.from('user_assets').download(configPath);
    
    if (error || !data) {
      throw new Error("Original video config not found. Only newly exported videos can be converted.");
    }

    const inputProps = JSON.parse(await data.text());

    // Toggle format
    inputProps.format = inputProps.format === 'landscape' ? 'portrait' : 'landscape';

    // Kick off a headless job to re-render without re-running AI
    const newJobId = `job_conv_${Date.now()}`;
    jobs.set(newJobId, {
      id: newJobId,
      status: 'queued',
      progress: 0,
      step: 'Initializing Format Conversion',
      logs: [],
    });

    res.json({ success: true, message: `Conversion to ${inputProps.format} started! View progress in Dashboard.` });

    // Run the conversion async
    (async () => {
      const job = jobs.get(newJobId)!;
      try {
        job.status = 'running';
        job.progress = 10;
        job.step = 'Rendering Video on AWS Lambda';
        
        job.logs.push({ time: new Date().toLocaleTimeString(), msg: `Starting conversion to ${inputProps.format}...`, type: 'info' });

        const renderRes = await fetch(`http://localhost:${port}/api/render`, {
          method: 'POST', 
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer internal_job_token`,
            'x-user-id': userId
          }, 
          body: JSON.stringify(inputProps)
        });

        if (!renderRes.body) throw new Error("Lambda render failed to return a response stream.");

        const reader = renderRes.body.getReader();
        const decoder = new TextDecoder();
        let done = false; let buffer = '';
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
                if (data.type === 'info') {
                  job.logs.push({ time: new Date().toLocaleTimeString(), msg: data.message, type: 'info' });
                }
                else if (data.type === 'progress') {
                  job.progress = 10 + Math.round(data.percent * 0.9);
                } else if (data.type === 'done') {
                  job.videoUrl = data.output; 
                  job.thumbnailUrl = data.thumbnail; 
                  job.progress = 100;
                  job.status = 'completed';
                  job.step = 'Finished Conversion';
                  job.logs.push({ time: new Date().toLocaleTimeString(), msg: '🎉 Conversion Complete!', type: 'success' });
                } else if (data.type === 'error') {
                  throw new Error(data.error);
                }
              } catch (e: any) {}
            }
          }
        }
      } catch(e: any) {
         job.status = 'failed';
         job.error = e.message;
         job.step = 'Error';
         job.logs.push({ time: new Date().toLocaleTimeString(), msg: `❌ Conversion Failed: ${e.message}`, type: 'error' });
      }
    })();

  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// DELETE RENDER FROM S3 & SUPABASE
app.delete('/api/renders/:id', requireAuth, async (req, res) => {
  try {
    const bucketName = process.env.REMOTION_BUCKET_NAME;
    const region = (process.env.REMOTION_AWS_REGION as any) || 'us-east-1';
    const userId = (req as any).user.sub;
    
    if (!bucketName) {
      throw new Error("Bucket config missing. Cannot delete from AWS.");
    }

    try {
      await deleteRender({
        region,
        bucketName,
        renderId: req.params.id
      });
    } catch(e) {
      console.error("Warning: Could not delete from AWS S3, it may have already been removed.", e);
    }
    
    await supabaseAdmin.from('video_exports')
      .delete()
      .eq('id', req.params.id)
      .eq('user_id', userId);
    
    res.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting render:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// PRESIGNED DOWNLOAD URL ENDPOINT
app.get('/api/renders/:id/download-url', async (req, res) => {
  try {
    const bucketName = process.env.REMOTION_BUCKET_NAME;
    const region = process.env.REMOTION_AWS_REGION || 'us-east-1';
    const renderId = req.params.id;
    const title = (req.query.title as string) || 'video';
    
    if (!bucketName) {
      throw new Error("Bucket config missing. Cannot generate download URL.");
    }

    const safeTitle = title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    
    const s3Client = new S3Client({ region });
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: `renders/${renderId}/out.mp4`,
      ResponseContentDisposition: `attachment; filename="${safeTitle}.mp4"`
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 900 });

    res.json({ success: true, url: signedUrl });
  } catch (error: any) {
    console.error('Presigned URL generation error:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// =====================================
// HEADLESS AUTOMATION PIPELINE (JOBS)
// =====================================

interface Job {
  id: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number;
  step: string;
  logs: { time: string; msg: string; type: string }[];
  videoUrl?: string;
  thumbnailUrl?: string;
  error?: string;
  webhookUrl?: string;
  webhookStatus?: 'pending' | 'sent' | 'failed';
}

const jobs = new Map<string, Job>();

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
OUTPUT EXACT JSON STRUCTURE:
{ "subtopics": ["<Specific Subtopic 1>", "<Specific Subtopic 2>"] }`;

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


async function callLLMServer(systemMessage: string, userMessage: string, provider: string, model: string, apiKey: string) {
  if (provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'anthropic-beta': 'max-tokens-3-5-sonnet-2024-07-15' },
      body: JSON.stringify({ model, system: systemMessage, messages: [{ role: 'user', content: userMessage }], max_tokens: 4096 })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error?.message || 'Unknown Anthropic API Error');
    let rawContent = data.content?.[0]?.text || "{}";
    return JSON.parse(rawContent.replace(/```json/gi, '').replace(/```/g, '').trim());
  }
  
  let endpoint = 'https://api.openai.com/v1/chat/completions';
  if (provider === 'groq') endpoint = 'https://api.groq.com/openai/v1/chat/completions';
  if (provider === 'openrouter') endpoint = 'https://openrouter.ai/api/v1/chat/completions';

  const body: any = { model, messages: [{ role: 'system', content: systemMessage }, { role: 'user', content: userMessage }] };
  if (provider === 'openai' || provider === 'groq') body.response_format = { type: "json_object" };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (data.error) throw new Error(data.error.message || data.error);
  let rawContent = data.choices?.[0]?.message?.content || "{}";
  return JSON.parse(rawContent.replace(/```json/gi, '').replace(/```/g, '').trim());
}

async function runJob(jobId: string, payload: any, userId: string) {
  const job = jobs.get(jobId);
  if (!job) return;
  const log = (msg: string, type = 'info') => {
    console.log(`[Job ${jobId}] ${msg}`);
    job.logs.push({ time: new Date().toLocaleTimeString(), msg, type });
  };

  try {
    let finalConfig = { ...payload };

    if (payload.preset) {
      log(`📦 Loading preset config: ${payload.preset}`);
      let presetData = null;
      
      // 1. Try to fetch from Supabase first
      let query = supabaseAdmin.from('presets').select('config').eq('name', payload.preset);
      if (userId) query = query.or(`is_global.eq.true,user_id.eq.${userId}`);
      else query = query.eq('is_global', true);
      
      const { data, error } = await query.limit(1);
      
      if (!error && data && data.length > 0) {
        presetData = data[0].config;
      } else {
        // 2. Fallback to local files if not in DB
        const presetPath = path.join(presetsDir, `${payload.preset}.json`);
        if (fs.existsSync(presetPath)) {
          presetData = JSON.parse(fs.readFileSync(presetPath, 'utf-8'));
        }
      }

      if (presetData) {
        finalConfig = { ...presetData, ...payload };
      } else {
        throw new Error(`Preset "${payload.preset}" not found in Cloud or Server.`);
      }
    }

    const { 
      aiProvider = 'groq', aiModel = 'llama-3.1-8b-instant',
      scriptAiProvider = 'anthropic', scriptAiModel = 'claude-sonnet-4-6',
      ttsProvider = 'testing', kokoroVoice = 'af_bella', elVoiceId = '',
      topicOverride = '', count = 6, sentencesPerCut = 1,
      promptOutline = DEFAULT_PROMPT_OUTLINE,
      promptSegment = DEFAULT_PROMPT_SEGMENT,
      prompt1 = DEFAULT_PROMPT_1,
      prompt2 = DEFAULT_PROMPT_2,
      prompt3 = DEFAULT_PROMPT_3,
      gridConfigs = {},
      defaultHudName = '',
      fontFamily = 'Bebas Neue',
      webhookUrl = '',
      test = false
    } = finalConfig;

    if (webhookUrl && !job.webhookUrl) {
      job.webhookUrl = webhookUrl;
      job.webhookStatus = 'pending';
    }

    const isTestMode = test === true || test === 'true';

    // Using exclusively Server Environment Variables for API Keys
    const activeAiKey = process.env.GLOBAL_API_KEY || process.env.VITE_GLOBAL_API_KEY;
    const activeScriptKey = process.env.SCRIPT_API_KEY || process.env.VITE_SCRIPT_API_KEY || activeAiKey;

    if (!isTestMode && !activeAiKey && !activeScriptKey) {
      throw new Error("Missing AI API Keys on server. Please define GLOBAL_API_KEY in the backend .env file.");
    }

    job.status = 'running';
    
    let topicNodes: any[] = [];
    let topicCuts: Record<number, any[]> = {};
    let mainTopic = topicOverride || EXPLAINER_TOPICS[Math.floor(Math.random() * EXPLAINER_TOPICS.length)];

    if (isTestMode) {
      log(`🛠️ TEST MODE ACTIVATED: Skipping AI and Media downloads. Rendering fast grid...`, 'info');
      mainTopic = "Test Webhook Video";
      job.step = 'Generating Test Assets';
      job.progress = 50;

      for (let i = 0; i < 4; i++) {
        topicNodes.push({
          title: `Test Topic ${i+1}`,
          mediaUrl: 'placeholder.mp4',
          script: 'This is a test script for testing the rendering pipeline and webhook functionality.',
          audioUrl: '',
          titleAudioUrl: '',
          titleAudioDuration: 2
        });
        topicCuts[i] = [];
      }
    } else {
      // Step 1: Scripting
      job.step = 'Generating Script';
      log(`🎯 Topic Selected: ${mainTopic}`, 'info');
      
      const outlineData = await callLLMServer(promptOutline, `Topic: "${mainTopic}". Generate exactly ${count} subtopics.`, scriptAiProvider, scriptAiModel, activeScriptKey as string);
      const subtopics = outlineData.subtopics || [];
      if (subtopics.length === 0) throw new Error("Failed to generate outline.");

      let fullScript = "";
      for (let i = 0; i < subtopics.length; i++) {
        log(`✍️ Writing segment ${i + 1}/${subtopics.length}: ${subtopics[i]}`);
        job.progress = Math.round(((i) / subtopics.length) * 20);
        let success = false, retries = 3;
        while (!success && retries > 0) {
          try {
            const segData = await callLLMServer(promptSegment, `Main Topic: "${mainTopic}"\nSub-topic: "${subtopics[i]}"`, scriptAiProvider, scriptAiModel, activeScriptKey as string);
            if (segData?.script) { fullScript += `${subtopics[i]}\n${segData.script}\n\n`; success = true; }
          } catch (e: any) {
            retries--; log(`⚠️ Retrying segment ${i+1}...`, 'warning');
            if (retries > 0) await delayFn(3000);
          }
        }
        if (!success) throw new Error(`Failed to generate segment ${i+1}`);
        if (i < subtopics.length - 1) await delayFn(2000);
      }
      fullScript += `category: ${mainTopic}`;
      log('✅ Script generation complete.', 'success');

      // Step 2: Editor Pipeline
      job.step = 'Executing AI Director Pipeline';
      job.progress = 25;
      log('✂️ Extracting topics & splitting sentences...', 'info');
      
      const step1Prompt = prompt1 + "\n\nCRITICAL RULE: The 'label' for each topic MUST be 1, 2, or 3 words maximum! Do not use long phrases.";
      
      const step1Data = await callLLMServer(step1Prompt, `TRANSCRIPT:\n${fullScript}`, aiProvider, aiModel, activeAiKey as string);
      const topics = step1Data.topics || [];
      if (topics.length === 0) throw new Error("AI found no topics.");

      const templatesFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));
      const fullTemplates = templatesFiles.map(f => ({ name: f.replace('.json',''), ...JSON.parse(fs.readFileSync(path.join(templatesDir, f), 'utf-8')) }));
      const cutTemplates = fullTemplates.filter(t => t.template === 'cut');
      const serverTemplatesList = cutTemplates.map(t => `- ${t.name}: ${t.description || 'General use'}`).join('\n');

      const usedMediaUrls = new Set<string>();

      const internalFetch = async (endpoint: string, p: any) => {
        const res = await fetch(`http://localhost:${port}${endpoint}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(p) });
        return await res.json();
      };

      const downloadMedia = async (query: string, type: string, topicLabel: string, durationSecs?: number) => {
        try {
          const sRes = await fetch(`http://localhost:${port}/api/media/search?q=${encodeURIComponent(query)}&type=${type}`);
          const sData = await sRes.json();
          if (!sData.success || !sData.results?.length) return null;

          for (const result of sData.results) {
            const sourceUrl = type === 'image' ? result.image : (result.content || result.url);
            if (!sourceUrl || usedMediaUrls.has(sourceUrl.split('?')[0])) continue;
            
            const safeTitle = topicLabel.replace(/[^a-z0-9]/gi, '_').toLowerCase().substring(0, 15);
            const ext = type === 'video' ? 'mp4' : (sourceUrl.split('.').pop()?.split('?')[0] || 'jpg').substring(0, 4).replace(/[^a-z]/g, '');
            const filename = `${type}_${safeTitle}_${Date.now()}.${ext}`;

            const reqBody: any = { url: sourceUrl, filename };
            if (type === 'video' && durationSecs) reqBody.durationSecs = durationSecs;

            const endpoint = type === 'video' ? '/api/media/download-youtube' : '/api/media/download';
            const dlData = await internalFetch(endpoint, reqBody);
            if (dlData.success) {
              usedMediaUrls.add(sourceUrl.split('?')[0]);
              return dlData.filename; // this is the publicUrl now
            }
          }
        } catch (e) {} return null;
      };

      for (let i = 0; i < topics.length; i++) {
        const topic = topics[i];
        const safeLabel = topic.label.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
        const safeCat = mainTopic.replace(/[^a-zA-Z0-9\s]/g, ' ').trim();
        
        log(`Processing Topic ${i+1}/${topics.length}: ${topic.label}`);
        job.progress = 30 + Math.round((i / topics.length) * 40);

        let mainImg = await downloadMedia(`${safeLabel} ${safeCat}`, 'image', safeLabel);
        if (!mainImg) mainImg = 'placeholder.mp4';

        const topicSentences = topic.sentences?.length ? topic.sentences : [topic.label];
        const topicScript = topicSentences.join(' ').trim();

        log(`🎙️ Generating TTS for topic title...`);
        let titleAudioUrl = '';
        let titleAudioDurationSecs = 0;
        const titleTtsPayload = ttsProvider === 'elevenlabs' ? { text: topic.label, voiceId: elVoiceId, index: `${i}_title` } : 
                           ttsProvider === 'kokoro' ? { text: topic.label, voiceId: kokoroVoice, index: `${i}_title` } : 
                           { text: topic.label, index: `${i}_title` };
                           
        const titleTtsData = await internalFetch(`/api/${ttsProvider}/generate`, titleTtsPayload);
        if (titleTtsData.success) {
          titleAudioUrl = titleTtsData.filename;
          const audioPath = path.join(path.resolve('./public'), titleTtsData.localFilename || titleTtsData.filename);
          try {
            const metadata = await mm.parseFile(audioPath);
            titleAudioDurationSecs = metadata.format.duration || (topic.label.split(' ').length / 2.5);
          } catch (err) {
            titleAudioDurationSecs = topic.label.split(' ').length / 2.5; 
          }
        }

        log(`🎙️ Generating TTS for topic script...`);
        let audioUrl = '';
        let audioDurationSecs = 0;
        const ttsPayload = ttsProvider === 'elevenlabs' ? { text: topicScript, voiceId: elVoiceId, index: i } : 
                           ttsProvider === 'kokoro' ? { text: topicScript, voiceId: kokoroVoice, index: i } : 
                           { text: topicScript, index: i };
                           
        const ttsData = await internalFetch(`/api/${ttsProvider}/generate`, ttsPayload);
        if (ttsData.success) {
          audioUrl = ttsData.filename;
          const audioPath = path.join(path.resolve('./public'), ttsData.localFilename || ttsData.filename);
          try {
            const metadata = await mm.parseFile(audioPath);
            audioDurationSecs = metadata.format.duration || (topicScript.split(' ').length / 2.5);
            log(`⏱️ Exact script audio duration read: ${audioDurationSecs.toFixed(2)}s`);
          } catch (err) {
            log(`⚠️ Could not read audio duration exactly, using estimation.`);
            audioDurationSecs = topicScript.split(' ').length / 2.5; 
          }
        }

        topicNodes.push({ 
          title: topic.label, 
          mediaUrl: mainImg, 
          script: topicScript, 
          audioUrl, 
          titleAudioUrl, 
          titleAudioDuration: titleAudioDurationSecs 
        });

        const chunkedSentences: string[] = [];
        for (let j = 0; j < topicSentences.length; j += sentencesPerCut) chunkedSentences.push(topicSentences.slice(j, j + sentencesPerCut).join(' '));
        const stepUserText = `TOPIC: ${topic.label}\n\nSENTENCES:\n${chunkedSentences.map((s, idx) => `[${idx}] ${s}`).join('\n')}`;

        log(`🎬 Assigning layouts and writing media queries...`);
        const step2Data = await callLLMServer(`${prompt2}\n\nSERVER TEMPLATES:\n${serverTemplatesList}`, stepUserText, aiProvider, aiModel, activeAiKey as string);
        const step3Data = await callLLMServer(prompt3, stepUserText, aiProvider, aiModel, activeAiKey as string);

        let totalEstSecs = 0;
        const preCuts = chunkedSentences.map((sentence, sIdx) => {
          const moment = step2Data.moments?.find((m:any) => m.sentence_index === sIdx) || step2Data.moments?.[sIdx] || {};
          const dur = moment.duration_estimate || Math.max(3, Math.ceil(sentence.split(/\s+/).length / 3));
          totalEstSecs += dur;
          return { sentence, sIdx, moment, dur };
        });

        const cutsData: any[] = [];
        for (let j = 0; j < preCuts.length; j++) {
          const pre = preCuts[j];
          const queryItem = step3Data.queries?.find((q:any) => q.sentence_index === pre.sIdx) || step3Data.queries?.[pre.sIdx] || {};
          let selectedTemplate = cutTemplates.find(t => t.name === pre.moment.template) || cutTemplates[0];

          let finalSecs = pre.dur;
          if (audioDurationSecs > 0 && totalEstSecs > 0) finalSecs = (pre.dur / totalEstSecs) * audioDurationSecs;
          let mediaType = selectedTemplate.elements?.some((e:any)=>e.type==='video') || selectedTemplate.showVideo ? 'video' : 'image';
          
          let mediaUrl = await downloadMedia(`${queryItem.search_query || pre.sentence.split(/\s+/).slice(0,4).join(' ')} ${safeCat}`, mediaType, safeLabel, finalSecs + 2);
          if (!mediaUrl) mediaUrl = await downloadMedia(`${safeLabel} ${safeCat}`, mediaType, safeLabel, finalSecs + 2);
          if (!mediaUrl) mediaUrl = 'placeholder.mp4';
          if (mediaUrl.endsWith('.mp4')) mediaType = 'video';

          cutsData.push({
            id: Date.now().toString() + j,
            templateName: selectedTemplate.name,
            config: selectedTemplate,
            duration: Math.max(10, Math.floor(finalSecs * 30)),
            mediaType, mediaUrl,
            searchQuery: queryItem.search_query || ''
          });
        }
        topicCuts[i] = cutsData;
      }
    }

    log('✅ Data collection complete. Starting Remotion Lambda Renderer...', 'success');
    job.step = 'Rendering Video on AWS Lambda';
    job.progress = 75;

    const activeCount = topicNodes.length;
    const gridConfig = gridConfigs[activeCount] || { hSpacing: 250, vSpacing: 80, customCircleSize: 350, cols: Math.ceil(Math.sqrt(activeCount)), rows: Math.ceil(activeCount / Math.ceil(Math.sqrt(activeCount))) };
    
    let defaultHudConfig = { hudTitleColor: '#fff', hudProgressColor: '#ccc', hudShowTitle: true, hudShowImage: true, hudShowProgress: true, hudTitleShadow: true, hudImageShadow: true, hudProgressBarShadow: true };
    if (defaultHudName) {
      const hudPath = path.join(templatesDir, `${defaultHudName}.json`);
      if (fs.existsSync(hudPath)) {
        defaultHudConfig = { ...defaultHudConfig, ...JSON.parse(fs.readFileSync(hudPath, 'utf-8')) };
      }
    } else {
      const templatesFiles = fs.readdirSync(templatesDir).filter(f => f.endsWith('.json'));
      const fullTemplates = templatesFiles.map(f => ({ name: f.replace('.json',''), ...JSON.parse(fs.readFileSync(path.join(templatesDir, f), 'utf-8')) }));
      const hudTpl = fullTemplates.find(t => t.template === 'hud');
      if (hudTpl) defaultHudConfig = { ...defaultHudConfig, ...hudTpl };
    }

    const inputProps = {
      ...defaultHudConfig,
      text: mainTopic, 
      template: 'explainer',
      circleCount: activeCount, 
      fontFamily,
      hSpacing: gridConfig.hSpacing, 
      vSpacing: gridConfig.vSpacing, 
      customCircleSize: gridConfig.customCircleSize, 
      cols: gridConfig.cols, 
      rows: gridConfig.rows, 
      showBorder: true,
      topicNodes, 
      topicCuts, 
      elements: [],
      hudEnabled: true
    };

    const renderRes = await fetch(`http://localhost:${port}/api/render`, {
      method: 'POST', 
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer internal_job_token`,
        'x-user-id': userId
      }, 
      body: JSON.stringify(inputProps)
    });

    if (!renderRes.body) throw new Error("Lambda render failed to return a response stream.");

    const reader = renderRes.body.getReader();
    const decoder = new TextDecoder();
    let done = false; let buffer = '';
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
            if (data.type === 'info') log(data.message);
            else if (data.type === 'progress') {
              job.progress = 75 + Math.round(data.percent * 0.25);
            } else if (data.type === 'done') {
              job.videoUrl = data.output; 
              job.thumbnailUrl = data.thumbnail; 
              job.progress = 100;
              job.status = 'completed';
              job.step = 'Finished';
              log('🎉 Lambda Render Complete! ' + data.output, 'success');

              // WEBHOOK DISPATCHER
              if (job.webhookUrl) {
                log(`🔗 Sending completion webhook to ${job.webhookUrl}...`, 'info');
                try {
                  const whRes = await fetch(job.webhookUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      success: true,
                      jobId: job.id,
                      folderName: data.folderName,
                      videoName: data.videoName,
                      videoPath: data.output, 
                      thumbnailName: data.thumbnailName,
                      thumbnailPath: data.thumbnail, 
                      title: mainTopic
                    })
                  });
                  if (!whRes.ok) throw new Error(`HTTP ${whRes.status} ${whRes.statusText}`);
                  log(`✅ Webhook sent successfully!`, 'success');
                  job.webhookStatus = 'sent';
                } catch(err: any) {
                  log(`⚠️ Webhook failed to send: ${err.message}`, 'error');
                  job.webhookStatus = 'failed';
                }
              }

            } else if (data.type === 'error') {
              throw new Error(data.error);
            }
          } catch (e: any) {}
        }
      }
    }
  } catch (error: any) {
    job.status = 'failed';
    job.error = error.message;
    job.step = 'Error';
    log(`❌ Automation Failed: ${error.message}`, 'error');
    if (job.webhookUrl) job.webhookStatus = 'failed';
  } finally {
    setTimeout(() => cleanPublicAssets(), 2000);
  }
}

app.post('/api/jobs', requireAuth, (req, res) => {
  const jobId = `job_${Date.now()}`;
  const webhookUrl = req.body.webhookUrl || '';
  const userId = (req as any).user.sub;
  
  jobs.set(jobId, { 
    id: jobId, 
    status: 'queued', 
    progress: 0, 
    step: 'Initializing', 
    logs: [],
    webhookUrl,
    webhookStatus: webhookUrl ? 'pending' : undefined
  });
  res.json({ success: true, jobId });
  runJob(jobId, req.body, userId).catch(e => console.error(e));
});

app.get('/api/jobs', (req, res) => {
  res.json({ success: true, jobs: Array.from(jobs.values()).reverse() });
});

app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  res.json({ success: true, job });
});

app.post('/api/test-webhook', async (req, res) => {
  const { webhookUrl } = req.body;
  if (!webhookUrl) return res.status(400).json({ error: 'webhookUrl is required' });
  
  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        success: true, 
        message: "Hello from Remotion Studio!", 
        folderName: "sample_folder_123",
        videoName: "sample_video.mp4",
        test: true 
      })
    });
    
    if (!response.ok) {
      return res.status(400).json({ error: `Destination rejected the webhook. HTTP ${response.status} ${response.statusText}` });
    }
    
    await response.text(); 
    
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: `Failed to reach the webhook URL. Check for typos. (${error.message})` });
  }
});


app.listen(port, () => console.log(`Server running at http://localhost:3001`));