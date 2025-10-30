import { useEffect, useState, useMemo } from 'react';

interface AnimatedLogoProps {
  className?: string;
  variant?: 'auto' | 'ocean' | 'coral' | 'violet' | 'green';
  speedMs?: number;
  holdMs?: number;
}

const SCHEMES = [
  { key: "ocean",  stops: ["#004683","#1C70AD","#10B8A6","#1C70AD","#004683"], text:"#1CDEE4" },
  { key: "coral",  stops: ["#E5756A","#FF4D6D","#FF5CA8","#FF4D6D","#E5756A"], text:"#FF6B7D" },
  { key: "violet", stops: ["#6F2CF5","#8848FF","#3B82F6","#5A2DE0","#6F2CF5"], text:"#B06CFF" },
  { key: "green",  stops: ["#1AD05C","#18C99B","#1BB2F5","#18C99B","#1AD05C"], text:"#38E3B2" },
];

// Deterministic pseudo-random function based on seed
const pseudoRandom = (seed: number, min: number, max: number): number => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return min + (x - Math.floor(x)) * (max - min);
};

// Convert hex color to RGB
const hexToRgb = (hex: string): [number, number, number] => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result 
    ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)]
    : [0, 0, 0];
};

// Convert RGB to hex color
const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.round(x).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

// Interpolate between two hex colors
const lerpHex = (color1: string, color2: string, factor: number): string => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  const r = c1[0] + factor * (c2[0] - c1[0]);
  const g = c1[1] + factor * (c2[1] - c1[1]);
  const b = c1[2] + factor * (c2[2] - c1[2]);
  
  return rgbToHex(r, g, b);
};

// Sample from 5-stop gradient
const sample5 = (t: number, stops: string[]): string => {
  const n = stops.length - 1;
  const x = Math.min(Math.max(t, 0), 1) * n;
  const i = Math.floor(x);
  const f = x - i;
  return lerpHex(stops[i], stops[Math.min(i + 1, n)], f);
};

interface CircleGeo {
  k: string;
  x: number;
  y: number;
  r: number;
  pos: number;
  op: number;
}

export const AnimatedLogo = ({ 
  className = '', 
  variant = 'auto',
  speedMs = 2500,
  holdMs = 3500
}: AnimatedLogoProps) => {
  const [idx, setIdx] = useState(0);
  const [next, setNext] = useState(1);
  const [fade, setFade] = useState(0);
  
  const reduced = useMemo(() => 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  , []);

  // Memoized geometry - computed once
  const geometry = useMemo((): CircleGeo[] => {
    const circles: CircleGeo[] = [];
    const centerX = 60;
    const centerY = 60;
    
    const layers = [
      { baseRadius: 35, count: 16, sizeRange: [1.8, 2.5] as [number, number], variance: 4, opacity: 0.85 },
      { baseRadius: 42, count: 20, sizeRange: [2.5, 3.5] as [number, number], variance: 3, opacity: 1.0 },
      { baseRadius: 48, count: 18, sizeRange: [2.0, 3.0] as [number, number], variance: 3, opacity: 0.95 },
      { baseRadius: 54, count: 14, sizeRange: [1.5, 2.2] as [number, number], variance: 5, opacity: 0.85 },
    ];
    
    layers.forEach((layer, layerIndex) => {
      for (let i = 0; i < layer.count; i++) {
        const baseAngle = (i / layer.count) * 2 * Math.PI;
        const angleVariance = pseudoRandom(layerIndex * 1000 + i, -0.15, 0.15);
        const angle = baseAngle + angleVariance;
        
        const radiusVariance = pseudoRandom(layerIndex * 1000 + i * 100, -layer.variance, layer.variance);
        const radius = layer.baseRadius + radiusVariance;
        
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        const gradientPosition = (angle + Math.PI) / (2 * Math.PI);
        const size = pseudoRandom(layerIndex * 1000 + i * 200, layer.sizeRange[0], layer.sizeRange[1]);
        
        circles.push({
          k: `layer${layerIndex}-${i}`,
          x,
          y,
          r: size,
          pos: gradientPosition,
          op: layer.opacity,
        });
      }
    });
    
    return circles;
  }, []);

  // Animation loop
  useEffect(() => {
    if (variant !== 'auto' || reduced) return;
    
    let raf: number;
    let t0: number;
    let phase: 'fade' | 'hold' = 'fade';
    
    const loop = (t: number) => {
      if (!t0) t0 = t;
      const dt = t - t0;
      
      if (phase === 'fade') {
        const p = Math.min(dt / speedMs, 1);
        setFade(p);
        if (p === 1) {
          phase = 'hold';
          t0 = t;
          setIdx(next);
          setNext((next + 1) % SCHEMES.length);
        }
      } else {
        if (dt >= holdMs) {
          phase = 'fade';
          t0 = t;
          setFade(0);
        }
      }
      
      raf = requestAnimationFrame(loop);
    };
    
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [variant, reduced, next, speedMs, holdMs]);

  // Determine active schemes
  const currentScheme = variant === 'auto' 
    ? SCHEMES[idx] 
    : SCHEMES.find(s => s.key === variant) ?? SCHEMES[0];
  const nextScheme = SCHEMES[next];

  // Blend text color during fade
  const activeText = variant === 'auto'
    ? lerpHex(currentScheme.text, nextScheme.text, fade)
    : currentScheme.text;

  return (
    <div className={`flex items-center gap-4 ${className}`} role="img" aria-label="Energy Mix logo">
      <svg 
        width="120" 
        height="120" 
        viewBox="0 0 120 120" 
        className="logo-svg"
        style={{ contain: 'layout paint' }}
      >
        <g 
          className={!reduced && variant === 'auto' ? 'spin' : ''}
          style={{ transformOrigin: '60px 60px' }}
        >
          {/* Layer A - current scheme */}
          <g style={{ opacity: variant === 'auto' ? 1 - fade : 1 }}>
            {geometry.map(g => (
              <circle
                key={`a-${g.k}`}
                cx={g.x}
                cy={g.y}
                r={g.r}
                fill={sample5(g.pos, currentScheme.stops)}
                opacity={g.op}
              />
            ))}
          </g>
          
          {/* Layer B - next scheme (auto mode only) */}
          {variant === 'auto' && (
            <g style={{ opacity: fade }}>
              {geometry.map(g => (
                <circle
                  key={`b-${g.k}`}
                  cx={g.x}
                  cy={g.y}
                  r={g.r}
                  fill={sample5(g.pos, nextScheme.stops)}
                  opacity={g.op}
                />
              ))}
            </g>
          )}
        </g>
      </svg>
      
      <div>
        <div 
          className="text-3xl font-semibold tracking-tight leading-none" 
          style={{ color: activeText }}
        >
          energy mix
        </div>
        <div className="text-xs uppercase tracking-widest mt-0.5" style={{ color: '#C8CBCD' }}>
          UK ELECTRICITY DASHBOARD
        </div>
      </div>

      <style>{`
        .logo-svg {
          filter: drop-shadow(0 2px 12px rgba(0, 0, 0, 0.35));
        }
        
        .dark .logo-svg {
          filter: drop-shadow(0 2px 12px rgba(0, 0, 0, 0.55));
        }

        .spin {
          animation: spin 36s linear infinite;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media (prefers-reduced-motion: reduce) {
          .spin {
            animation: none !important;
          }
        }
      `}</style>
    </div>
  );
};
