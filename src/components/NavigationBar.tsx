import { Link, useLocation } from 'react-router-dom';
import { Menu, ChevronDown, Home } from 'lucide-react';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { useState, ReactNode, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface NavigationBarProps {
  desktopActions?: ReactNode;
  mobileActions?: ReactNode;
}

export const NavigationBar = ({ desktopActions, mobileActions }: NavigationBarProps) => {
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  // Close explore section when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (exploreRef.current && !exploreRef.current.contains(event.target as Node)) {
        setIsExploreOpen(false);
      }
    };

    if (isExploreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExploreOpen]);

  return (
    <nav aria-label="Main navigation" className="w-full border-b border-primary/20 glass-morphism sticky top-0 z-50 shadow-lg shadow-primary/10">
      {/* Desktop Layout (>1280px) - Single Row */}
      <header className="hidden xl:block">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            {/* Logo Section with Tagline */}
            <div className="flex flex-col gap-1 -ml-2">
              <AnimatedLogo />
              <p className="text-xs text-muted-foreground -mt-1">Real-time UK grid data</p>
            </div>

            {/* Navigation Menu - Text Based */}
            <div className="flex items-start gap-4">
              {!isHomePage && (
                <Link
                  to="/"
                  className="px-6 py-3 text-base font-medium text-foreground/90 hover:text-primary transition-all duration-200 rounded-md hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(28,222,228,0.3)]"
                  aria-label="Home page"
                >
                  Home
                </Link>
              )}

              {/* Explore Collapsible Section */}
              <div className="flex flex-col relative" ref={exploreRef}>
                <button
                  onClick={() => setIsExploreOpen(!isExploreOpen)}
                  className={cn(
                    "px-6 py-3 text-base font-medium text-foreground/90 hover:text-primary transition-all duration-200 rounded-md hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(28,222,228,0.3)] flex items-center gap-1",
                    isExploreOpen && "text-primary bg-primary/10"
                  )}
                  aria-expanded={isExploreOpen}
                  aria-label="Explore pages menu"
                >
                  Explore
                  <ChevronDown className={cn("w-5 h-5 transition-transform duration-200", isExploreOpen && "rotate-180")} />
                </button>

                {/* Collapsible Section - Always in DOM for SEO */}
                <div
                  className={cn(
                    "absolute left-0 z-50 w-56 transition-all duration-300 origin-top overflow-hidden",
                    isExploreOpen ? "max-h-64 opacity-100 visible" : "max-h-0 opacity-0 invisible"
                  )}
                >
                  <ul className="py-2 mt-2 rounded-lg border border-primary/20 glass-morphism shadow-xl shadow-primary/20" role="menu">
                    <li role="none">
                      <Link
                        to="/about"
                        className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors"
                        role="menuitem"
                        onClick={() => setIsExploreOpen(false)}
                      >
                        About
                      </Link>
                    </li>
                    <li role="none">
                      <Link
                        to="/data"
                        className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors"
                        role="menuitem"
                        onClick={() => setIsExploreOpen(false)}
                      >
                        Data
                      </Link>
                    </li>
                    <li role="none">
                      <Link
                        to="/insights"
                        className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors"
                        role="menuitem"
                        onClick={() => setIsExploreOpen(false)}
                      >
                        Insights
                      </Link>
                    </li>
                    <li role="none">
                      <Link
                        to="/newsletter"
                        className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors"
                        role="menuitem"
                        onClick={() => setIsExploreOpen(false)}
                      >
                        Newsletter
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Desktop Actions - Compact */}
            {desktopActions && (
              <div className="flex items-center">
                {desktopActions}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Tablet Layout (768px-1279px) - Two Rows */}
      <header className="hidden md:block xl:hidden">
        {/* Row 1: Logo + Navigation */}
        <div className="container mx-auto px-4 py-3 border-b border-primary/10">
          <div className="flex items-center justify-between">
            {/* Logo - No tagline on tablet */}
            <div className="-ml-2">
              <AnimatedLogo />
            </div>

            {/* Navigation Menu - Icon + Text */}
            <div className="flex items-start gap-3">
              {!isHomePage && (
                <Link
                  to="/"
                  className="flex items-center gap-1.5 px-5 py-3 text-sm font-medium text-foreground/90 hover:text-primary transition-all duration-200 rounded-md hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(28,222,228,0.3)]"
                  aria-label="Home page"
                  title="Home"
                >
                  <Home className="w-6 h-6" />
                  <span className="text-sm">Home</span>
                </Link>
              )}

              {/* Explore Collapsible Section with Icon */}
              <div className="flex flex-col relative">
                <button
                  onClick={() => setIsExploreOpen(!isExploreOpen)}
                  className={cn(
                    "flex items-center gap-1.5 px-5 py-3 text-base font-medium text-foreground/90 hover:text-primary transition-all duration-200 rounded-md hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(28,222,228,0.3)]",
                    isExploreOpen && "text-primary bg-primary/10"
                  )}
                  aria-expanded={isExploreOpen}
                  aria-label="Explore pages menu"
                  title="Explore"
                >
                  <Menu className="w-6 h-6" />
                  <span className="text-sm">Explore</span>
                  <ChevronDown className={cn("w-5 h-5 transition-transform duration-200", isExploreOpen && "rotate-180")} />
                </button>

                {/* Collapsible Section - SEO Safe */}
                <div
                  className={cn(
                    "absolute left-0 z-50 w-52 transition-all duration-300 origin-top overflow-hidden",
                    isExploreOpen ? "max-h-64 opacity-100 visible" : "max-h-0 opacity-0 invisible"
                  )}
                >
                  <ul className="py-2 mt-2 rounded-lg border border-primary/20 glass-morphism shadow-xl shadow-primary/20" role="menu">
                    <li role="none">
                      <Link
                        to="/about"
                        className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors"
                        role="menuitem"
                        onClick={() => setIsExploreOpen(false)}
                      >
                        About
                      </Link>
                    </li>
                    <li role="none">
                      <Link
                        to="/data"
                        className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors"
                        role="menuitem"
                        onClick={() => setIsExploreOpen(false)}
                      >
                        Data
                      </Link>
                    </li>
                    <li role="none">
                      <Link
                        to="/insights"
                        className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors"
                        role="menuitem"
                        onClick={() => setIsExploreOpen(false)}
                      >
                        Insights
                      </Link>
                    </li>
                    <li role="none">
                      <Link
                        to="/newsletter"
                        className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors"
                        role="menuitem"
                        onClick={() => setIsExploreOpen(false)}
                      >
                        Newsletter
                      </Link>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Row 2: Energy Balance - Full Width Centered */}
        {desktopActions && (
          <div className="container mx-auto px-4 py-2 flex justify-center">
            {desktopActions}
          </div>
        )}
      </header>

      {/* Mobile Layout (<768px) */}
      <header className="md:hidden">
        <div className="container mx-auto px-4 py-3">
          <div className="flex justify-between items-center">
            <div className="flex flex-col gap-1 -ml-2">
              <AnimatedLogo />
              <p className="text-xs text-muted-foreground -mt-1">Real-time UK electricity generation and flows</p>
            </div>

            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 text-foreground/90 hover:text-primary transition-colors rounded-md hover:bg-primary/10"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              <Menu className="w-6 h-6" />
            </button>
          </div>

          {/* Mobile Menu - Always in DOM for SEO */}
          <nav
            className={cn(
              "transition-all duration-300 origin-top overflow-hidden",
              isMobileMenuOpen ? "max-h-96 opacity-100 visible" : "max-h-0 opacity-0 invisible"
            )}
            aria-label="Mobile navigation"
          >
            <ul className="space-y-1 py-2 border-t border-primary/20 mt-3">
              <li>
                <Link
                  to="/"
                  className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Home
                </Link>
              </li>
              <li>
                <Link
                  to="/about"
                  className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  About
                </Link>
              </li>
              <li>
                <Link
                  to="/data"
                  className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Data
                </Link>
              </li>
              <li>
                <Link
                  to="/insights"
                  className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Insights
                </Link>
              </li>
              <li>
                <Link
                  to="/newsletter"
                  className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors rounded-md"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Newsletter
                </Link>
              </li>
            </ul>
          </nav>

          {/* Mobile Actions - Below hamburger menu */}
          {mobileActions && (
            <div className={cn("mt-3 transition-opacity duration-300", isMobileMenuOpen && "opacity-0 invisible")}>
              {mobileActions}
            </div>
          )}
        </div>
      </header>
    </nav>
  );
};
