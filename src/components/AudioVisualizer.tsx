import { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  isActive: boolean;
  stream: MediaStream | null;
}

export default function AudioVisualizer({ isActive, stream }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const dataArrayRef = useRef<Uint8Array | null>(null);

  useEffect(() => {
    if (!isActive) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      // Draw silent baseline
      drawSilent();
      return;
    }

    // Try starting real Audio Analyzer if stream is provided
    if (stream) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const audioContext = new AudioCtx();
          const analyser = audioContext.createAnalyser();
          const source = audioContext.createMediaStreamSource(stream);
          source.connect(analyser);
          
          analyser.fftSize = 256;
          const bufferLength = analyser.frequencyBinCount;
          const dataArray = new Uint8Array(bufferLength);
          
          audioContextRef.current = audioContext;
          analyserRef.current = analyser;
          dataArrayRef.current = dataArray;
        }
      } catch (e) {
        console.warn('Could not launch real Web Audio Context analyzer:', e);
      }
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let simTime = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      // Gradient styling for the visual waves/bars
      const gradient = ctx.createLinearGradient(0, 0, width, 0);
      gradient.addColorStop(0, '#f43f5e'); // Rose 500
      gradient.addColorStop(0.5, '#ec4899'); // Pink 500
      gradient.addColorStop(1, '#a855f7'); // Purple 500

      ctx.fillStyle = gradient;
      ctx.lineWidth = 3;
      ctx.strokeStyle = gradient;

      // Draw active visualizer
      if (analyserRef.current && dataArrayRef.current) {
        // Real Audio Spectrum rendering
        const analyser = analyserRef.current;
        const dataArray = dataArrayRef.current;
        analyser.getByteFrequencyData(dataArray);

        const barWidth = (width / dataArray.length) * 2.5;
        let x = 0;

        ctx.beginPath();
        for (let i = 0; i < dataArray.length; i++) {
          const val = dataArray[i];
          const percent = val / 255;
          const barHeight = Math.max(4, percent * height * 0.85);

          // Draw rounded vertical bars symmetrical from the center
          const yPos = (height - barHeight) / 2;
          ctx.beginPath();
          ctx.roundRect ? ctx.roundRect(x, yPos, barWidth - 2, barHeight, 4) : ctx.rect(x, yPos, barWidth - 2, barHeight);
          ctx.fill();

          x += barWidth;
        }
      } else {
        // High fidelity Simulated wave when microphone data-stream is not fully bound
        ctx.beginPath();
        ctx.moveTo(0, height / 2);
        
        simTime += 0.15;
        const points = 80;
        const step = width / points;

        for (let i = 0; i <= points; i++) {
          const x = i * step;
          // Combine multiple sine waves for a complex, natural voice-like wave
          const baseWave = Math.sin(i * 0.15 - simTime) * 15;
          const secondaryWave = Math.sin(i * 0.35 + simTime * 0.7) * 8;
          const noise = Math.sin(i * 0.8 - simTime * 1.5) * 5;
          
          // Taper off waves towards the edges
          const edgeTaper = Math.sin((i / points) * Math.PI);
          const y = (height / 2) + (baseWave + secondaryWave + noise) * edgeTaper;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
      }

      animationRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(() => {});
      }
      audioContextRef.current = null;
      analyserRef.current = null;
      dataArrayRef.current = null;
    };
  }, [isActive, stream]);

  const drawSilent = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.beginPath();
    ctx.strokeStyle = '#e2e8f0'; // slate 200 light baseline
    ctx.lineWidth = 2;
    ctx.moveTo(0, canvas.height / 2);
    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
  };

  useEffect(() => {
    drawSilent();
  }, []);

  return (
    <div className="relative w-full h-16 bg-slate-50 border border-slate-100 dark:bg-slate-900/40 dark:border-slate-800 rounded-2xl overflow-hidden flex items-center justify-center p-2 mb-1">
      <canvas 
        id="audio-wave-canvas"
        ref={canvasRef} 
        width={400} 
        height={64} 
        className="w-full h-full max-w-lg object-contain"
      />
      {isActive && (
        <span className="absolute top-2 right-3 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      )}
    </div>
  );
}
