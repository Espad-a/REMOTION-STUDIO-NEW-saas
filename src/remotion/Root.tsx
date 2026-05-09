import React from 'react';
import { Composition, CalculateMetadataFunction } from 'remotion';
import { MyComposition } from './MyComposition';

const calculateMetadata: CalculateMetadataFunction<any> = ({ props }) => {
  let duration = 150;
  
  if (props.template === 'explainer' || props.template === 'voice') {
    let explainerDuration = 60; // intro duration
    const count = props.circleCount || 4;
    
    for (let i = 0; i < count; i++) {
      const cuts = props.topicCuts?.[i] || [];
      const cutsDuration = cuts.reduce((sum: number, cut: any) => sum + (cut.duration || 90), 0);
      
      const node = props.topicNodes?.[i];
      const preCutStay = node?.titleAudioDuration ? Math.max(60, Math.ceil(node.titleAudioDuration * 30) + 15) : 60;

      // 30 (pan) + preCutStay + cuts + 30 (post-cut wait)
      explainerDuration += 30 + preCutStay + cutsDuration + 30; 
    }
    duration = explainerDuration;
  }
  
  // Dynamically set resolution based on format
  const width = props.format === 'portrait' ? 1080 : 1920;
  const height = props.format === 'portrait' ? 1920 : 1080;

  return {
    durationInFrames: Math.max(1, duration),
    width,
    height
  };
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="MyVideo"
        component={MyComposition}
        durationInFrames={150} // Fallback duration
        calculateMetadata={calculateMetadata}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          text: "Explainer Video",
          template: 'explainer' as const,
          format: 'landscape',
          circleCount: 4,
        }}
      />
    </>
  );
};