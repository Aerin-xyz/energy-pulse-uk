import { useEffect, useState } from 'react';

interface AnimatedLogoProps {
  className?: string;
  animate?: boolean;
}

const colorSchemes = [
  { name: 'cool', colors: ['#10b981', '#06b6d4', '#3b82f6'] },      // green → cyan → blue
  { name: 'sunset', colors: ['#f97316', '#ef4444', '#ec4899'] },    // orange → red → magenta
  { name: 'purple', colors: ['#ec4899', '#a855f7', '#6366f1'] },    // magenta → purple → blue
  { name: 'spring', colors: ['#84cc16', '#10b981', '#06b6d4'] },    // lime → green → cyan
];

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

  // Generate circle positions in a ring
  const generateCircles = () => {
    const circles = [];
    const numCircles = 48;
    const radius = 45;
    const centerX = 60;
    const centerY = 60;

    for (let i = 0; i < numCircles; i++) {
      const angle = (i / numCircles) * 2 * Math.PI;
      const x = centerX + radius * Math.cos(angle);
      const y = centerY + radius * Math.sin(angle);
      
      // Distribute colors across the ring
      const colorIndex = Math.floor((i / numCircles) * 3);
      
      circles.push({
        id: i,
        x,
        y,
        colorIndex,
      });
    }

    return circles;
  };

  const circles = generateCircles();
  const colors = colorSchemes[currentScheme].colors;

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
            r="2.5"
            fill={colors[circle.colorIndex]}
            className={isAnimating ? 'logo-circle' : ''}
            style={{
              transition: isAnimating ? 'fill 1.2s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
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
          filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.08));
        }
      `}</style>
    </div>
  );
};
