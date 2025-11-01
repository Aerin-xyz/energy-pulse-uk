import { Link } from 'react-router-dom';
import { Menu, ChevronDown, Home } from 'lucide-react';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { useState, ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface NavigationBarProps {
  desktopActions?: ReactNode;
  mobileActions?: ReactNode;
}

export const NavigationBar = ({ desktopActions, mobileActions }: NavigationBarProps) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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
            <div className="flex items-center gap-4">
              <Link
                to="/"
                className="px-4 py-2 text-sm font-medium text-foreground/90 hover:text-primary transition-all duration-200 rounded-md hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(28,222,228,0.3)]"
                aria-label="Home page"
              >
                Home
              </Link>

              {/* Explore Dropdown */}
              <div 
                className="relative"
                onMouseEnter={() => setIsDropdownOpen(true)}
                onMouseLeave={() => setIsDropdownOpen(false)}
              >
                <button
                  className={cn(
                    "px-4 py-2 text-sm font-medium text-foreground/90 hover:text-primary transition-all duration-200 rounded-md hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(28,222,228,0.3)] flex items-center gap-1",
                    isDropdownOpen && "text-primary bg-primary/10"
                  )}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  aria-label="Explore pages menu"
                >
                  Explore
                  <ChevronDown className={cn("w-4 h-4 transition-transform duration-200", isDropdownOpen && "rotate-180")} />
                </button>

                {/* Dropdown Menu - Always in DOM for SEO */}
                <div
                  className={cn(
                    "absolute top-full left-0 mt-2 w-48 rounded-lg border border-primary/20 glass-morphism shadow-xl shadow-primary/20 transition-all duration-200 origin-top z-50",
                    isDropdownOpen ? "opacity-100 visible scale-100" : "opacity-0 invisible scale-95 pointer-events-none"
                  )}
                >
                  <ul className="py-2" role="menu">
                    <li role="none">
                      <Link
                        to="/about"
                        className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors"
                        role="menuitem"
                      >
                        About
                      </Link>
                    </li>
                    <li role="none">
                      <Link
                        to="/data"
                        className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors"
                        role="menuitem"
                      >
                        Data
                      </Link>
                    </li>
                    <li role="none">
                      <Link
                        to="/insights"
                        className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors"
                        role="menuitem"
                      >
                        Insights
                      </Link>
                    </li>
                    <li role="none">
                      <Link
                        to="/newsletter"
                        className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors"
                        role="menuitem"
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
            <div className="flex items-center gap-3">
              <Link
                to="/"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground/90 hover:text-primary transition-all duration-200 rounded-md hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(28,222,228,0.3)]"
                aria-label="Home page"
                title="Home"
              >
                <Home className="w-4 h-4" />
                <span className="sr-only">Home</span>
              </Link>

              {/* Explore Dropdown with Icon */}
              <div 
                className="relative"
                onMouseEnter={() => setIsDropdownOpen(true)}
                onMouseLeave={() => setIsDropdownOpen(false)}
              >
                <button
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-foreground/90 hover:text-primary transition-all duration-200 rounded-md hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(28,222,228,0.3)]",
                    isDropdownOpen && "text-primary bg-primary/10"
                  )}
                  aria-expanded={isDropdownOpen}
                  aria-haspopup="true"
                  aria-label="Explore pages menu"
                  title="Explore"
                >
                  <Menu className="w-4 h-4" />
                  <span className="text-xs">Explore</span>
                  <ChevronDown className={cn("w-3.5 h-3.5 transition-transform duration-200", isDropdownOpen && "rotate-180")} />
                </button>

                {/* Dropdown Menu - SEO Safe */}
                <div
                  className={cn(
                    "absolute top-full right-0 mt-2 w-44 rounded-lg border border-primary/20 glass-morphism shadow-xl shadow-primary/20 transition-all duration-200 origin-top z-50",
                    isDropdownOpen ? "opacity-100 visible scale-100" : "opacity-0 invisible scale-95 pointer-events-none"
                  )}
                >
                  <ul className="py-2" role="menu">
                    <li role="none">
                      <Link
                        to="/about"
                        className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors"
                        role="menuitem"
                      >
                        About
                      </Link>
                    </li>
                    <li role="none">
                      <Link
                        to="/data"
                        className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors"
                        role="menuitem"
                      >
                        Data
                      </Link>
                    </li>
                    <li role="none">
                      <Link
                        to="/insights"
                        className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors"
                        role="menuitem"
                      >
                        Insights
                      </Link>
                    </li>
                    <li role="none">
                      <Link
                        to="/newsletter"
                        className="block px-4 py-2.5 text-sm text-foreground/90 hover:text-primary hover:bg-primary/10 transition-colors"
                        role="menuitem"
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
