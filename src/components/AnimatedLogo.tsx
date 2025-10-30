import { useEffect, useState } from 'react';

interface AnimatedLogoProps {
  className?: string;
  animate?: boolean;
}

const colorSchemes = [
  { name: 'cool', colors: ['#10b981', '#14b8a6', '#3b82f6'] },      // green → teal → blue
  { name: 'sunset', colors: ['#f97316', '#ef4444', '#ec4899'] },    // orange → red → pink
  { name: 'purple', colors: ['#a855f7', '#8b5cf6', '#3b82f6'] },    // purple → violet → blue
  { name: 'spring', colors: ['#84cc16', '#10b981', '#06b6d4'] },    // lime → green → cyan
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

// Interpolate between two colors
const interpolateColor = (color1: string, color2: string, factor: number): string => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  
  const r = c1[0] + factor * (c2[0] - c1[0]);
  const g = c1[1] + factor * (c2[1] - c1[1]);
  const b = c1[2] + factor * (c2[2] - c1[2]);
  
  return rgbToHex(r, g, b);
};

// Get gradient color at position (0-1) through all 3 colors
const getGradientColor = (position: number, colors: string[]): string => {
  // Smooth transition through all 3 colors
  if (position < 0.5) {
    // Blend between color[0] and color[1]
    return interpolateColor(colors[0], colors[1], position * 2);
  } else {
    // Blend between color[1] and color[2]
    return interpolateColor(colors[1], colors[2], (position - 0.5) * 2);
  }
};

export const AnimatedLogo = ({ className = '', animate = true }: AnimatedLogoProps) => {
  const [currentScheme, setCurrentScheme] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!animate || prefersReducedMotion) {
      setIsAnimating(false);
      return;
    }

    setIsAnimating(true);
    const interval = setInterval(() => {
      setCurrentScheme(prev => (prev + 1) % colorSchemes.length);
    }, 3000);

    return () => clearInterval(interval);
  }, [animate]);

  // Generate circles in multiple organic layers with variance
  const generateCircles = () => {
    const circles = [];
    const centerX = 60;
    const centerY = 60;
    const colors = colorSchemes[currentScheme].colors;
    
    // Define multiple layers with different characteristics
    const layers = [
      { baseRadius: 35, count: 16, sizeRange: [1.8, 2.5] as [number, number], variance: 4, opacity: 0.85 },
      { baseRadius: 42, count: 20, sizeRange: [2.5, 3.5] as [number, number], variance: 3, opacity: 1.0 },
      { baseRadius: 48, count: 18, sizeRange: [2.0, 3.0] as [number, number], variance: 3, opacity: 0.95 },
      { baseRadius: 54, count: 14, sizeRange: [1.5, 2.2] as [number, number], variance: 5, opacity: 0.85 },
    ];
    
    layers.forEach((layer, layerIndex) => {
      for (let i = 0; i < layer.count; i++) {
        // Add angular variance (±0.15 radians ≈ ±8.6 degrees)
        const baseAngle = (i / layer.count) * 2 * Math.PI;
        const angleVariance = pseudoRandom(layerIndex * 1000 + i, -0.15, 0.15);
        const angle = baseAngle + angleVariance;
        
        // Add radial variance
        const radiusVariance = pseudoRandom(layerIndex * 1000 + i * 100, -layer.variance, layer.variance);
        const radius = layer.baseRadius + radiusVariance;
        
        // Calculate position with variance applied
        const x = centerX + radius * Math.cos(angle);
        const y = centerY + radius * Math.sin(angle);
        
        // Calculate gradient position based on angle (normalized to 0-1)
        const gradientPosition = (angle + Math.PI) / (2 * Math.PI);
        const color = getGradientColor(gradientPosition, colors);
        
        // Vary circle size within layer's range
        const size = pseudoRandom(layerIndex * 1000 + i * 200, layer.sizeRange[0], layer.sizeRange[1]);
        
        // Calculate shadow intensity based on size
        const shadowBlur = size > 3 ? 1.5 : 0.8;
        const shadowAlpha = size > 3 ? 0.15 : 0.1;
        
        circles.push({
          id: `layer${layerIndex}-${i}`,
          x,
          y,
          r: size,
          color,
          opacity: layer.opacity,
          shadow: `drop-shadow(0 0 ${shadowBlur}px rgba(0, 0, 0, ${shadowAlpha}))`,
        });
      }
    });

    return circles;
  };

  const circles = generateCircles();

  return (
    <div className={`flex flex-col items-start gap-1 ${className}`}>
      <svg
        width="120"
        height="120"
        viewBox="0 0 120 120"
        className="logo-svg"
        style={{
          contain: 'layout paint',
          willChange: isAnimating ? 'opacity' : 'auto',
        }}
      >
        {circles.map((circle) => (
          <circle
            key={circle.id}
            cx={circle.x}
            cy={circle.y}
            r={circle.r}
            fill={circle.color}
            opacity={circle.opacity}
            className={isAnimating ? 'logo-circle' : ''}
            style={{
              transition: isAnimating ? 'fill 1.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              filter: circle.shadow,
            }}
          />
        ))}
      </svg>
      
      <div className="flex flex-col -mt-2 ml-1">
        <span className="text-[28px] font-bold leading-none tracking-tight text-foreground">
          energy mix
        </span>
        <span className="text-[9px] text-muted-foreground tracking-wide -mt-0.5">
          UK ELECTRICITY DASHBOARD
        </span>
      </div>

      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .logo-circle {
            transition: none !important;
          }
        }

        .logo-svg {
          filter: drop-shadow(0 2px 12px rgba(0, 0, 0, 0.12));
        }
        
        .dark .logo-svg {
          filter: drop-shadow(0 2px 12px rgba(0, 0, 0, 0.4));
        }
      `}</style>
    </div>
  );
};
