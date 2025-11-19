import React, { useRef, useCallback, useEffect, useState } from 'react';
import Webcam from 'react-webcam';
import { DetectionBox } from '../types';

interface WebcamViewProps {
  mode: 'register' | 'recognize';
  onCapture?: (imageSrc: string) => void;
  onFrameProcess?: (video: HTMLVideoElement, canvas: HTMLCanvasElement) => void;
  boxes?: DetectionBox[];
  isProcessing?: boolean;
}

const videoConstraints = {
  width: 640,
  height: 480,
  facingMode: "user"
};

export const WebcamView: React.FC<WebcamViewProps> = ({ 
  mode, 
  onCapture, 
  onFrameProcess,
  boxes = [],
  isProcessing = false
}) => {
  const webcamRef = useRef<Webcam>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [cameraReady, setCameraReady] = useState(false);

  const handleUserMedia = () => {
    setCameraReady(true);
  };

  const capture = useCallback(() => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc && onCapture) {
      onCapture(imageSrc);
    }
  }, [webcamRef, onCapture]);

  // Animation loop for drawing boxes and processing frames
  useEffect(() => {
    let animationId: number;

    const loop = () => {
      if (
        webcamRef.current &&
        webcamRef.current.video &&
        webcamRef.current.video.readyState === 4 &&
        canvasRef.current
      ) {
        const video = webcamRef.current.video;
        const canvas = canvasRef.current;
        
        // Match canvas size to video
        const videoWidth = video.videoWidth;
        const videoHeight = video.videoHeight;

        if (canvas.width !== videoWidth || canvas.height !== videoHeight) {
            canvas.width = videoWidth;
            canvas.height = videoHeight;
        }

        // If recognizing, let parent process logic, otherwise just draw
        if (mode === 'recognize' && onFrameProcess) {
           onFrameProcess(video, canvas);
        }

        // Draw bounding boxes
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, canvas.width, canvas.height);
          
          boxes.forEach(box => {
            // Styling based on match
            const isUnknown = box.label.toLowerCase().includes('unknown');
            const color = isUnknown ? '#ef4444' : '#10b981'; // Red vs Green
            
            // Draw Box
            ctx.strokeStyle = color;
            ctx.lineWidth = 3;
            ctx.strokeRect(box.x, box.y, box.width, box.height);

            // Draw Background for Text
            ctx.fillStyle = color;
            const textWidth = ctx.measureText(box.label).width;
            ctx.fillRect(box.x, box.y - 25, textWidth + 10, 25);

            // Draw Text
            ctx.fillStyle = '#ffffff';
            ctx.font = 'bold 16px monospace';
            ctx.fillText(box.label, box.x + 5, box.y - 7);
          });
        }
      }
      animationId = requestAnimationFrame(loop);
    };

    loop();

    return () => cancelAnimationFrame(animationId);
  }, [mode, onFrameProcess, boxes]);

  return (
    <div className="relative w-full max-w-[640px] mx-auto rounded-xl overflow-hidden shadow-2xl border border-zinc-800 bg-black">
      {!cameraReady && (
         <div className="absolute inset-0 flex items-center justify-center z-10 text-zinc-500">
            Iniciando Câmera...
         </div>
      )}
      
      <Webcam
        audio={false}
        ref={webcamRef}
        screenshotFormat="image/jpeg"
        videoConstraints={videoConstraints}
        onUserMedia={handleUserMedia}
        className="w-full h-auto object-cover"
      />
      
      <canvas
        ref={canvasRef}
        className="absolute top-0 left-0 w-full h-full pointer-events-none"
      />

      {mode === 'register' && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center z-20">
          <button
            onClick={capture}
            disabled={isProcessing || !cameraReady}
            className={`
                px-6 py-3 rounded-full font-bold text-white tracking-wide transition-all transform hover:scale-105 active:scale-95
                ${isProcessing ? 'bg-zinc-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/30'}
            `}
          >
            {isProcessing ? 'Processando...' : 'Capturar Rosto'}
          </button>
        </div>
      )}
    </div>
  );
};
