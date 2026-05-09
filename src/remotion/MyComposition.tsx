import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, staticFile, spring, OffthreadVideo, Easing, Sequence, Audio } from 'remotion';
import { loadFont } from "@remotion/google-fonts/BebasNeue";

const { fontFamily: bebasFont } = loadFont();

export interface CutElement {
  id: string;
  type: 'image' | 'video' | 'ruler' | 'arrow';
  url?: string;
  x: number;
  y: number;
  size: number;
  rotation?: number;
  color?: string;
}

export interface TopicCut {
  id: string;
  templateName: string;
  config: any;
  duration: number;
  mediaType: 'image' | 'video';
  mediaUrl: string;
  searchQuery?: string;
  fallbackQuery?: string;
}

export interface TopicNode {
  title: string;
  mediaUrl: string;
  script?: string;
  audioUrl?: string;
  titleAudioUrl?: string;
  titleAudioDuration?: number;
}

interface MyCompositionProps {
  format?: 'landscape' | 'portrait';
  text: string;
  template: 'default' | 'explainer' | 'cut' | 'hud';
  description?: string;
  circleCount: number;
  fontFamily?: string;
  hSpacing?: number;
  vSpacing?: number;
  customCircleSize?: number;
  cols?: number;
  rows?: number;
  
  elements?: CutElement[];
  
  showImage?: boolean;
  imageUrl?: string;
  imageX?: number;
  imageY?: number;
  imageSize?: number;
  showVideo?: boolean;
  videoUrl?: string;
  videoX?: number;
  videoY?: number;
  videoSize?: number;
  showArrow?: boolean;
  arrowX?: number;
  arrowY?: number;
  arrowRotation?: number;
  arrowSize?: number;
  arrowColor?: string;
  showRuler?: boolean;
  rulerX?: number;
  rulerY?: number;
  rulerWidth?: number;
  rulerRotation?: number;

  showBorder?: boolean;
  topicCuts?: Record<number, TopicCut[]>;
  topicNodes?: TopicNode[]; 
  
  hudEnabled?: boolean;
  hudTitleColor?: string;
  hudProgressColor?: string;
  hudShowTitle?: boolean;
  hudShowImage?: boolean;
  hudShowProgress?: boolean;
  hudTitleShadow?: boolean;
  hudImageShadow?: boolean;
  hudProgressBarShadow?: boolean;

  defaultVideo?: string;
}

const resolveMedia = (url: string | undefined | null, defaultFallback: string) => {
  if (!url) return defaultFallback.startsWith('http') ? defaultFallback : staticFile(defaultFallback);
  if (url.startsWith('http') || url.startsWith('data:') || url.startsWith('blob:')) return url;
  
  let cleanUrl = url.replace(/^\/+/, ''); 
  if (cleanUrl.startsWith('public/')) {
    cleanUrl = cleanUrl.replace('public/', '');
  }
  
  return staticFile(cleanUrl);
};

const migrateLegacyElements = (c: any): CutElement[] => {
  if (c.elements && Array.isArray(c.elements)) {
    return c.elements;
  }
  const migrated: CutElement[] = [];
  if (c.showVideo) {
    migrated.push({ id: 'legacy-vid', type: 'video', url: c.videoUrl, x: c.videoX || 0, y: c.videoY || 0, size: c.videoSize || 70 });
  }
  if (c.showImage) {
    migrated.push({ id: 'legacy-img', type: 'image', url: c.imageUrl, x: c.imageX || 0, y: c.imageY || 0, size: c.imageSize || 70 });
  }
  if (c.showRuler) {
    migrated.push({ id: 'legacy-ruler', type: 'ruler', x: c.rulerX || 0, y: c.rulerY || 0, size: c.rulerWidth || 40, rotation: c.rulerRotation || 0 });
  }
  if (c.showArrow) {
    migrated.push({ id: 'legacy-arrow', type: 'arrow', x: c.arrowX || 0, y: c.arrowY || 0, size: c.arrowSize || 20, rotation: c.arrowRotation || 0, color: c.arrowColor || '#ef4444' });
  }
  return migrated;
};

const RenderDynamicElement: React.FC<{ element: CutElement, entranceScale: number, isCutProp?: boolean, dynamicMediaUrl?: string, defaultVideo: string }> = ({ element, entranceScale, isCutProp, dynamicMediaUrl, defaultVideo }) => {
  const getMediaStyle = (sizePercentage: number): React.CSSProperties => ({
    maxWidth: `${sizePercentage}%`,
    maxHeight: `${sizePercentage}%`,
    width: '10000px',
    height: 'auto',
    objectFit: 'contain',
    display: 'block',
  });

  const transform = `translate(${element.x}px, ${element.y}px) scale(${entranceScale})`;
  const finalUrl = resolveMedia(
    isCutProp ? dynamicMediaUrl : element.url, 
    element.type === 'video' ? defaultVideo : 'placeholder.png'
  );

  const isVideoFile = typeof finalUrl === 'string' && (finalUrl.toLowerCase().endsWith('.mp4') || finalUrl.toLowerCase().endsWith('.webm') || finalUrl.toLowerCase().endsWith('.mov') || finalUrl.includes('supabase.co'));

  return (
    <div style={{
      position: 'absolute',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      width: '100%',
      height: '100%',
      transform,
    }}>
      {(element.type === 'video' || element.type === 'image') && isVideoFile && (
        <OffthreadVideo src={finalUrl} style={getMediaStyle(element.size)} muted />
      )}
      
      {(element.type === 'video' || element.type === 'image') && !isVideoFile && (
        <img src={finalUrl} style={getMediaStyle(element.size)} alt="Prop" />
      )}

      {element.type === 'ruler' && (
        <svg 
          viewBox="0 0 600 60" 
          style={{ 
            width: `${element.size}%`, 
            height: 'auto',
            transform: `rotate(${element.rotation || 0}deg)`,
            filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))'
          }}
        >
          <rect x="0" y="0" width="600" height="60" fill="#fcd34d" rx="6" stroke="#d97706" strokeWidth="2" />
          {Array.from({ length: 61 }).map((_, i) => {
            const isMajor = i % 10 === 0;
            const isMedium = i % 5 === 0 && !isMajor;
            const height = isMajor ? 25 : isMedium ? 15 : 10;
            return (
              <line key={i} x1={i * 10} y1="0" x2={i * 10} y2={height} stroke="#b45309" strokeWidth={isMajor ? 2 : 1} />
            );
          })}
          {Array.from({ length: 6 }).map((_, i) => (
            <text key={`t-${i}`} x={i * 100 + 95} y="45" fontFamily="sans-serif" fontSize="20" fontWeight="bold" fill="#b45309">{i + 1}</text>
          ))}
        </svg>
      )}

      {element.type === 'arrow' && (
        <svg 
          viewBox="0 0 24 24" 
          fill={element.color || '#ef4444'} 
          style={{ 
            width: `${element.size}%`, 
            height: 'auto',
            transform: `rotate(${element.rotation || 0}deg)`,
            filter: 'drop-shadow(0 10px 15px rgba(0,0,0,0.3))'
          }}
        >
          <path d="M2 12l10-10v6h10v8h-10v6z"/>
        </svg>
      )}
    </div>
  );
};


// ==========================================
// HUD OVERLAY COMPONENT
// ==========================================
const HudOverlay: React.FC<{
  topic: TopicNode;
  duration: number;
  fontFamily: string;
  hudTitleColor: string;
  hudProgressColor: string;
  hudShowTitle: boolean;
  hudShowImage: boolean;
  hudShowProgress: boolean;
  hudTitleShadow: boolean;
  hudImageShadow: boolean;
  hudProgressBarShadow: boolean;
  defaultVideo: string;
}> = ({ 
  topic, duration, fontFamily, hudTitleColor, hudProgressColor, 
  hudShowTitle, hudShowImage, hudShowProgress, 
  hudTitleShadow, hudImageShadow, hudProgressBarShadow, defaultVideo
}) => {
  const frame = useCurrentFrame();
  const progress = Math.min(Math.max(frame / duration, 0), 1);
  
  const opacity = interpolate(frame, [0, 15, duration - 15, duration], [0, 1, 1, 0], { 
    extrapolateLeft: 'clamp', 
    extrapolateRight: 'clamp' 
  });

  const hudMediaUrl = resolveMedia(topic.mediaUrl, defaultVideo);
  const isHudVideo = typeof hudMediaUrl === 'string' && (hudMediaUrl.toLowerCase().endsWith('.mp4') || hudMediaUrl.toLowerCase().endsWith('.webm') || hudMediaUrl.includes('supabase.co'));
  
  return (
    <AbsoluteFill style={{ opacity, pointerEvents: 'none', zIndex: 100 }}>
      {hudShowTitle && (
        <div style={{
          position: 'absolute',
          top: 60,
          left: 60,
          width: 550,
          color: hudTitleColor,
          fontSize: 46,
          fontFamily,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          lineHeight: 1.1,
          textShadow: hudTitleShadow ? '0 4px 12px rgba(0,0,0,0.5)' : 'none',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'flex-start',
        }}>
          {topic.title}
        </div>
      )}

      {hudShowProgress && (
        <div style={{
          position: 'absolute',
          top: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 600,
          height: 12,
          backgroundColor: 'rgba(255,255,255,0.3)',
          borderRadius: 6,
          overflow: 'hidden',
          boxShadow: hudProgressBarShadow ? '0 4px 12px rgba(0,0,0,0.3)' : 'none',
        }}>
          <div style={{
            width: `${progress * 100}%`,
            height: '100%',
            backgroundColor: hudProgressColor,
            borderRadius: 6,
          }} />
        </div>
      )}

      {hudShowImage && (
        <div style={{
          position: 'absolute',
          top: 50,
          right: 60,
          width: 120,
          height: 120,
          borderRadius: '50%',
          border: '4px solid white',
          boxShadow: hudImageShadow ? '0 8px 24px rgba(0,0,0,0.4)' : 'none',
          overflow: 'hidden',
          backgroundColor: '#1e293b'
        }}>
          {isHudVideo ? (
            <OffthreadVideo src={hudMediaUrl as string} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
          ) : (
            <img src={hudMediaUrl as string} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Topic HUD" />
          )}
        </div>
      )}
    </AbsoluteFill>
  );
};

// ==========================================
// CUT OVERLAY RENDERER
// ==========================================
const CutOverlayRenderer: React.FC<{ cut: TopicCut, fps: number, defaultVideo: string }> = ({ cut, fps, defaultVideo }) => {
  const frame = useCurrentFrame(); 
  
  const entrance = spring({
    frame,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  const entranceScale = interpolate(entrance, [0, 1], [0.95, 1]);
  const opacity = interpolate(entrance, [0, 1], [0, 1]);

  const c = cut.config || {};
  const elements = migrateLegacyElements(c);

  return (
    <AbsoluteFill style={{ opacity, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      {elements.map((el, idx) => (
        <RenderDynamicElement 
          key={el.id || idx} 
          element={el} 
          entranceScale={entranceScale} 
          isCutProp={el.type === 'image' || el.type === 'video'} 
          dynamicMediaUrl={cut.mediaUrl}
          defaultVideo={defaultVideo}
        />
      ))}
    </AbsoluteFill>
  );
};

// ==========================================
// MAIN COMPOSITION
// ==========================================
export const MyComposition: React.FC<MyCompositionProps> = (props) => {
  const { 
    text, 
    template = 'explainer', 
    format = 'landscape',
    circleCount = 4,
    fontFamily = 'Bebas Neue',
    hSpacing = 80,
    vSpacing = 80,
    customCircleSize = 250,
    cols: manualCols,
    rows: manualRows,
    showBorder = true,
    topicCuts = {},
    topicNodes = [],
    hudEnabled = false,
    hudTitleColor = '#ffffff',
    hudProgressColor = '#4f46e5',
    hudShowTitle = true,
    hudShowImage = true,
    hudShowProgress = true,
    hudTitleShadow = true,
    hudImageShadow = true,
    hudProgressBarShadow = true,
    defaultVideo = 'placeholder.mp4',
  } = props;

  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();

  const selectedFont = fontFamily === 'Bebas Neue' ? bebasFont : 'system-ui, sans-serif';

  const FALLBACK_CHARACTERS = [
    { name: 'Topic', img: defaultVideo },
    { name: 'Topic', img: defaultVideo },
    { name: 'Topic', img: defaultVideo },
    { name: 'Topic', img: defaultVideo },
    { name: 'Topic', img: defaultVideo },
  ];

  if (template === 'hud') {
    const dummyTopic = { title: "Super Long Explainer Topic That Might Wrap", mediaUrl: defaultVideo };
    return (
      <AbsoluteFill style={{ backgroundColor: '#0f172a' }}>
        <HudOverlay 
          topic={dummyTopic}
          duration={150} 
          fontFamily={selectedFont}
          hudTitleColor={hudTitleColor}
          hudProgressColor={hudProgressColor}
          hudShowTitle={hudShowTitle}
          hudShowImage={hudShowImage}
          hudShowProgress={hudShowProgress}
          hudTitleShadow={hudTitleShadow}
          hudImageShadow={hudImageShadow}
          hudProgressBarShadow={hudProgressBarShadow}
          defaultVideo={defaultVideo}
        />
        <div style={{ 
          position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', 
          color: '#334155', fontSize: 30, fontFamily: selectedFont, letterSpacing: '0.1em' 
        }}>
          [ VIDEO CUT PLAYS HERE ]
        </div>
      </AbsoluteFill>
    );
  }

  if (template === 'cut') {
    const entrance = spring({
      frame: frame - 10,
      fps,
      config: { damping: 12, stiffness: 100 },
    });

    const entranceScale = interpolate(entrance, [0, 1], [0.95, 1]);
    const opacity = interpolate(entrance, [0, 1], [0, 1]);

    const elements = migrateLegacyElements(props);

    return (
      <AbsoluteFill style={{ backgroundColor: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <AbsoluteFill style={{ 
          opacity, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center' 
        }}>
          {elements.map((el, idx) => (
            <RenderDynamicElement 
              key={el.id || idx} 
              element={el} 
              entranceScale={entranceScale} 
              defaultVideo={defaultVideo}
            />
          ))}
        </AbsoluteFill>
      </AbsoluteFill>
    );
  }

  if (template === 'explainer') {
    const cols = manualCols || Math.ceil(Math.sqrt(circleCount));
    const rows = Math.ceil(circleCount / cols);

    const introDuration = 60; 
    const transitionDuration = 30; 
    const postCutStay = 30; 

    const cycleDurations: number[] = [];
    const cycleStarts: number[] = [];
    let currentStart = introDuration;

    for (let i = 0; i < circleCount; i++) {
      cycleStarts.push(currentStart);
      const cuts = topicCuts[i] || [];
      const cutsDuration = cuts.reduce((sum, cut) => sum + (cut.duration || 90), 0);
      
      const node = topicNodes[i];
      // Dynamic preCutStay based on title audio duration (+15 frames padding)
      const preCutStay = node?.titleAudioDuration ? Math.max(60, Math.ceil(node.titleAudioDuration * 30) + 15) : 60;

      const cycleDuration = transitionDuration + preCutStay + cutsDuration + postCutStay;
      cycleDurations.push(cycleDuration);
      currentStart += cycleDuration;
    }

    const labelMargin = 20;
    const labelHeight = customCircleSize * 0.12;
    
    // Dynamic max-height calculation to prevent text wrapping from overflowing the canvas
    let maxLines = 1;
    const maxTextWidth = customCircleSize + (hSpacing * 0.8);
    const charsPerLine = Math.max(10, Math.floor(maxTextWidth / (labelHeight * 0.45))); // Approx chars per line for Bebas Neue
    
    for (let i = 0; i < circleCount; i++) {
      const fallbackChar = FALLBACK_CHARACTERS[i % FALLBACK_CHARACTERS.length];
      const title = topicNodes[i]?.title || fallbackChar.name;
      const lines = Math.ceil(title.length / charsPerLine);
      if (lines > maxLines) maxLines = lines;
    }

    const textBlockHeight = labelHeight * 1.1 * maxLines;
    const totalItemHeight = customCircleSize + labelMargin + textBlockHeight;

    // ACCOUNT FOR TEXT SPILLOVER: The text can spill out hSpacing * 0.4 on both the far left and right sides
    const textSpilloverPadding = hSpacing * 0.8; 
    const gridWidth = (cols * customCircleSize) + ((cols - 1) * hSpacing) + textSpilloverPadding;
    const gridHeight = (rows * totalItemHeight) + ((rows - 1) * vSpacing);

    // Padding reduced: 85% ensures circles take up more space and don't feel too padded
    const fitScaleX = (width * 0.85) / gridWidth;
    const fitScaleY = (height * 0.85) / gridHeight;
    const baseScale = Math.min(1, fitScaleX, fitScaleY);

    // Zoom padding dynamically adjusted so portrait doesn't leave massive vertical gaps
    const zoomPadX = format === 'portrait' ? 0.95 : 0.85;
    const zoomPadY = format === 'portrait' ? 0.85 : 0.75;
    const targetZoom = Math.min((height * zoomPadY) / totalItemHeight, (width * zoomPadX) / maxTextWidth);

    let cameraScale = baseScale;
    let cameraX = 0;
    let cameraY = 0;

    const getTargetPos = (index: number) => {
      const col = index % cols;
      const row = Math.floor(index / cols);
      // We calculate center relative to the grid bounding box horizontally
      const cellCenterX = (textSpilloverPadding / 2) + (col * (customCircleSize + hSpacing)) + (customCircleSize / 2);
      
      // Fix for Centering: Target the physical center of the circle, instead of the bounding box that includes text
      const visualCenterY = (customCircleSize / 2) + (labelMargin / 2);
      const cellCenterY = row * (totalItemHeight + vSpacing) + visualCenterY;
      
      const relativeX = cellCenterX - gridWidth / 2;
      const relativeY = cellCenterY - gridHeight / 2;
      return { x: -relativeX, y: -relativeY };
    };

    if (frame > introDuration) {
      let activeCircleIndex = circleCount - 1;
      for (let i = 0; i < circleCount; i++) {
        if (frame >= cycleStarts[i] && frame < cycleStarts[i] + cycleDurations[i]) {
          activeCircleIndex = i;
          break;
        }
      }

      const activeCycleStart = cycleStarts[activeCircleIndex] || introDuration;
      const localFrame = frame - activeCycleStart;
      const targetPos = getTargetPos(activeCircleIndex);

      if (localFrame < transitionDuration) {
        if (activeCircleIndex === 0) {
          cameraScale = interpolate(localFrame, [0, transitionDuration], [baseScale, targetZoom], {
            extrapolateRight: 'clamp',
            easing: Easing.inOut(Easing.quad)
          });
          cameraX = interpolate(localFrame, [0, transitionDuration], [0, targetPos.x * targetZoom], {
            extrapolateRight: 'clamp',
            easing: Easing.inOut(Easing.quad)
          });
          cameraY = interpolate(localFrame, [0, transitionDuration], [0, targetPos.y * targetZoom], {
            extrapolateRight: 'clamp',
            easing: Easing.inOut(Easing.quad)
          });
        } else {
          const prevTargetPos = getTargetPos(activeCircleIndex - 1);
          cameraScale = targetZoom;
          cameraX = interpolate(localFrame, [0, transitionDuration], [prevTargetPos.x * targetZoom, targetPos.x * targetZoom], {
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.45, 0, 0.55, 1)
          });
          cameraY = interpolate(localFrame, [0, transitionDuration], [prevTargetPos.y * targetZoom, targetPos.y * targetZoom], {
            extrapolateRight: 'clamp',
            easing: Easing.bezier(0.45, 0, 0.55, 1)
          });
        }
      } else {
        cameraScale = targetZoom;
        cameraX = targetPos.x * targetZoom;
        cameraY = targetPos.y * targetZoom;
      }
    }

    return (
      <AbsoluteFill style={{ backgroundColor: '#ffffff' }}>
        <div style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: `scale(${cameraScale}) translate(${cameraX / cameraScale}px, ${cameraY / cameraScale}px)`,
        }}>
          {/* Main Grid Wrapper with explicitly padded bounds */}
          <div style={{ 
            width: gridWidth,
            height: gridHeight,
            position: 'relative'
          }}>
            {Array.from({ length: circleCount }).map((_, i) => {
              const fallbackChar = FALLBACK_CHARACTERS[i % FALLBACK_CHARACTERS.length];
              const nodeTitle = topicNodes[i]?.title || fallbackChar.name;
              const nodeImg = resolveMedia(topicNodes[i]?.mediaUrl, fallbackChar.img);
              
              const isNodeVideo = typeof nodeImg === 'string' && (nodeImg.toLowerCase().endsWith('.mp4') || nodeImg.toLowerCase().endsWith('.webm') || nodeImg.includes('supabase.co'));

              const delay = i * 3;
              const entrance = spring({
                frame: frame - 15 - delay,
                fps,
                config: { damping: 12, stiffness: 100 },
              });

              const opacity = interpolate(entrance, [0, 1], [0, 1]);
              const scale = interpolate(entrance, [0, 1], [0.8, 1]);
              const translateY = interpolate(entrance, [0, 1], [40, 0]);

              const col = i % cols;
              const row = Math.floor(i / cols);
              const leftPos = (textSpilloverPadding / 2) + col * (customCircleSize + hSpacing);
              const topPos = row * (totalItemHeight + vSpacing);

              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: leftPos,
                    top: topPos,
                    width: customCircleSize,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    opacity,
                    transform: `scale(${scale}) translateY(${translateY}px)`,
                    transformOrigin: 'center top'
                  }}
                >
                  <div
                    style={{
                      width: customCircleSize,
                      height: customCircleSize,
                      borderRadius: '50%',
                      overflow: 'hidden',
                      backgroundColor: '#f1f5f9',
                      boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
                      border: showBorder ? '4px solid #0f172a' : 'none',
                    }}
                  >
                    {isNodeVideo ? (
                      <OffthreadVideo src={nodeImg as string} style={{ width: '100%', height: '100%', objectFit: 'cover' }} muted />
                    ) : (
                      <img src={nodeImg as string} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={nodeTitle} />
                    )}
                  </div>
                  <div style={{
                    marginTop: labelMargin,
                    fontSize: labelHeight,
                    fontWeight: '600',
                    color: '#0f172a',
                    fontFamily: selectedFont,
                    textTransform: 'uppercase',
                    letterSpacing: '0.15em',
                    textAlign: 'center',
                    lineHeight: 1.1,
                    width: maxTextWidth,
                    wordWrap: 'break-word',
                  }}>
                    {nodeTitle}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* RENDER CUTS */}
        {Array.from({ length: circleCount }).map((_, i) => {
          const cuts = topicCuts[i] || [];
          if (cuts.length === 0) return null;
          
          const node = topicNodes[i];
          const preCutStay = node?.titleAudioDuration ? Math.max(60, Math.ceil(node.titleAudioDuration * 30) + 15) : 60;

          const activeCycleStart = cycleStarts[i] || 0;
          const cutPhaseStart = activeCycleStart + transitionDuration + preCutStay;
          let currentCutStart = cutPhaseStart;
          
          return cuts.map((cut) => {
            const cutDuration = cut.duration || 90;
            const start = currentCutStart;
            currentCutStart += cutDuration;
            
            return (
              <Sequence key={cut.id} from={start} durationInFrames={cutDuration}>
                <AbsoluteFill style={{ zIndex: 50, backgroundColor: '#ffffff' }}>
                  <CutOverlayRenderer 
                    cut={cut} 
                    fps={fps} 
                    defaultVideo={defaultVideo}
                  />
                </AbsoluteFill>
              </Sequence>
            );
          });
        })}

        {/* RENDER DYNAMIC HUD OVERLAYS */}
        {hudEnabled && Array.from({ length: circleCount }).map((_, i) => {
          const cuts = topicCuts[i] || [];
          if (cuts.length === 0) return null;
          
          const node = topicNodes[i];
          const preCutStay = node?.titleAudioDuration ? Math.max(60, Math.ceil(node.titleAudioDuration * 30) + 15) : 60;

          const activeCycleStart = cycleStarts[i] || 0;
          const cutPhaseStart = activeCycleStart + transitionDuration + preCutStay;
          const cutsDuration = cuts.reduce((sum, cut) => sum + (cut.duration || 90), 0);
          
          const fallbackChar = FALLBACK_CHARACTERS[i % FALLBACK_CHARACTERS.length];
          const nodeTitle = topicNodes[i]?.title || fallbackChar.name;
          const nodeImgUrl = topicNodes[i]?.mediaUrl || fallbackChar.img;

          return (
            <Sequence key={`hud-${i}`} from={cutPhaseStart} durationInFrames={cutsDuration}>
              <HudOverlay 
                topic={{ title: nodeTitle, mediaUrl: nodeImgUrl }}
                duration={cutsDuration}
                fontFamily={selectedFont}
                hudTitleColor={hudTitleColor}
                hudProgressColor={hudProgressColor}
                hudShowTitle={hudShowTitle}
                hudShowImage={hudShowImage}
                hudShowProgress={hudShowProgress}
                hudTitleShadow={hudTitleShadow}
                hudImageShadow={hudImageShadow}
                hudProgressBarShadow={hudProgressBarShadow}
                defaultVideo={defaultVideo}
              />
            </Sequence>
          );
        })}

        {/* RENDER TOPIC AUDIO VOICEOVERS - ALIGNED WITH RESPECTIVE PHASES */}
        {Array.from({ length: circleCount }).map((_, i) => {
          const node = topicNodes[i];
          if (!node) return null;
          
          const activeCycleStart = cycleStarts[i] || 0;
          const preCutStay = node.titleAudioDuration ? Math.max(60, Math.ceil(node.titleAudioDuration * 30) + 15) : 60;
          
          const titleAudioStart = activeCycleStart + transitionDuration;
          const scriptAudioStart = activeCycleStart + transitionDuration + preCutStay;
          
          return (
            <React.Fragment key={`audio-group-${i}`}>
              {node.titleAudioUrl && (
                <Sequence key={`audio-title-${i}`} from={titleAudioStart}>
                  <Audio src={resolveMedia(node.titleAudioUrl, '')} />
                </Sequence>
              )}
              {node.audioUrl && (
                <Sequence key={`audio-script-${i}`} from={scriptAudioStart}>
                  <Audio src={resolveMedia(node.audioUrl, '')} />
                </Sequence>
              )}
            </React.Fragment>
          );
        })}

      </AbsoluteFill>
    );
  }

  return (
    <AbsoluteFill style={{ backgroundColor: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 120, fontWeight: 'bold', color: '#4f46e5', fontFamily: selectedFont }}>
        {text}
      </div>
    </AbsoluteFill>
  );
};