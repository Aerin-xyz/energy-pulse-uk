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

  // Generate circle positions in double concentric rings with gradient colors
  const generateCircles = () => {
    const circles = [];
    const numCircles = 48;
    const centerX = 60;
    const centerY = 60;
    const colors = colorSchemes[currentScheme].colors;
    
    // Inner ring
    const innerRadius = 40;
    for (let i = 0; i < numCircles; i++) {
      const angle = (i / numCircles) * 2 * Math.PI;
      const x = centerX + innerRadius * Math.cos(angle);
      const y = centerY + innerRadius * Math.sin(angle);
      const gradientPosition = i / numCircles;
      const color = getGradientColor(gradientPosition, colors);
      
      circles.push({
        id: `inner-${i}`,
        x,
        y,
        r: 2.2,
        color,
      });
    }
    
    // Outer ring (offset by half position for staggered effect)
    const outerRadius = 50;
    for (let i = 0; i < numCircles; i++) {
      const angle = ((i + 0.5) / numCircles) * 2 * Math.PI;
      const x = centerX + outerRadius * Math.cos(angle);
      const y = centerY + outerRadius * Math.sin(angle);
      const gradientPosition = (i + 0.5) / numCircles;
      const color = getGradientColor(gradientPosition, colors);
      
      circles.push({
        id: `outer-${i}`,
        x,
        y,
        r: 2.5,
        color,
      });
    }

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
            className={isAnimating ? 'logo-circle' : ''}
            style={{
              transition: isAnimating ? 'fill 1.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
              filter: 'drop-shadow(0 0 2px rgba(0, 0, 0, 0.1))',
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
