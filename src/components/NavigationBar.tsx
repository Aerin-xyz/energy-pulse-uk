import { Link, useLocation } from 'react-router-dom';
import { Menu, ChevronDown, Home, X, Zap } from 'lucide-react';
import { AnimatedLogo } from '@/components/AnimatedLogo';
import { useState, ReactNode, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

interface NavigationBarProps {
  desktopActions?: ReactNode;
  mobileActions?: ReactNode;
}

type NavigationLink = {
  to: string;
  label: string;
  description?: string;
};

const coreLinks: NavigationLink[] = [
  { to: '/', label: 'Live dashboard', description: 'Current UK grid mix and live intelligence' },
  { to: '/power-flow', label: 'Power flow', description: 'Generation, demand, transfers and storage' },
  { to: '/today', label: 'Today', description: 'The latest daily grid picture' },
  { to: '/reports', label: 'Reports', description: 'Weekly summaries and longer reads' },
  { to: '/records', label: 'Records', description: 'Historic highs, lows and notable moments' },
];

const topicLinks: NavigationLink[] = [
  { to: '/uk-electricity-mix', label: 'Electricity mix' },
  { to: '/carbon-intensity', label: 'Carbon intensity' },
  { to: '/renewables', label: 'Renewables' },
  { to: '/cleanest-time-to-use-electricity', label: 'Cleanest time' },
  { to: '/gas-generation', label: 'Gas generation' },
  { to: '/interconnectors', label: 'Interconnectors' },
  { to: '/electricity-demand', label: 'Demand' },
  { to: '/uk-electricity-generation-live', label: 'Generation live' },
];

const resourceLinks: NavigationLink[] = [
  { to: '/insights', label: 'Insights' },
  { to: '/data', label: 'Data' },
  { to: '/about', label: 'About' },
  { to: '/newsletter', label: 'Newsletter' },
];

const navigationGroups = [
  { label: 'Core dashboard', links: coreLinks },
  { label: 'Learn & data', links: topicLinks },
  { label: 'Resources', links: resourceLinks },
];

const NavLinkItem = ({
  link,
  onClick,
  compact = false,
}: {
  link: NavigationLink;
  onClick?: () => void;
  compact?: boolean;
}) => (
  <Link
    to={link.to}
    className={cn(
      "group block rounded-md border border-transparent transition-all duration-200 hover:border-primary/20 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
      compact ? "px-3 py-2.5" : "px-3.5 py-3"
    )}
    role="menuitem"
    onClick={onClick}
  >
    <span className="block text-sm font-medium text-foreground/95 group-hover:text-primary">
      {link.label}
    </span>
    {link.description && (
      <span className="mt-1 block text-xs leading-snug text-muted-foreground">
        {link.description}
      </span>
    )}
  </Link>
);

const ExploreMegaMenu = ({
  isOpen,
  onClose,
  align = 'right',
}: {
  isOpen: boolean;
  onClose: () => void;
  align?: 'left' | 'right';
}) => (
  <div
    className={cn(
      "absolute top-full z-50 mt-2 w-[min(42rem,calc(100vw-2rem))] transition-all duration-200 origin-top",
      align === 'right' ? "right-0" : "left-0",
      isOpen
        ? "translate-y-0 opacity-100 visible pointer-events-auto"
        : "-translate-y-1 opacity-0 invisible pointer-events-none"
    )}
  >
    <div className="rounded-lg border border-primary/20 glass-morphism shadow-2xl shadow-primary/20 overflow-hidden">
      <div className="grid gap-3 p-3 md:grid-cols-[1fr_1fr]">
        <section className="rounded-md border border-primary/10 bg-background/35 p-2">
          <p className="px-3 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary/80">
            {navigationGroups[0].label}
          </p>
          <ul className="space-y-1" role="menu">
            {navigationGroups[0].links.map((link) => (
              <li role="none" key={link.to}>
                <NavLinkItem link={link} onClick={onClose} />
              </li>
            ))}
          </ul>
        </section>

        <div className="space-y-3">
          <section className="rounded-md border border-primary/10 bg-background/35 p-2">
            <p className="px-3 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary/80">
              {navigationGroups[1].label}
            </p>
            <ul className="grid grid-cols-2 gap-1" role="menu">
              {navigationGroups[1].links.map((link) => (
                <li role="none" key={link.to}>
                  <NavLinkItem link={link} onClick={onClose} compact />
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-md border border-primary/10 bg-background/35 p-2">
            <p className="px-3 pb-1.5 pt-1 text-xs font-semibold uppercase tracking-[0.12em] text-primary/80">
              {navigationGroups[2].label}
            </p>
            <ul className="grid grid-cols-2 gap-1" role="menu">
              {navigationGroups[2].links.map((link) => (
                <li role="none" key={link.to}>
                  <NavLinkItem link={link} onClick={onClose} compact />
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  </div>
);

export const NavigationBar = ({ desktopActions, mobileActions }: NavigationBarProps) => {
  const [isExploreOpen, setIsExploreOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const exploreRef = useRef<HTMLDivElement>(null);
  const tabletExploreRef = useRef<HTMLDivElement>(null);
  const location = useLocation();
  const isHomePage = location.pathname === '/';

  // Close explore section when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const isInsideDesktopMenu = exploreRef.current?.contains(target) ?? false;
      const isInsideTabletMenu = tabletExploreRef.current?.contains(target) ?? false;

      if (!isInsideDesktopMenu && !isInsideTabletMenu) {
        setIsExploreOpen(false);
      }
    };

    if (isExploreOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isExploreOpen]);

  useEffect(() => {
    setIsExploreOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsExploreOpen(false);
        setIsMobileMenuOpen(false);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

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

              <Link
                to="/power-flow"
                className="px-6 py-3 text-base font-medium text-foreground/90 hover:text-primary transition-all duration-200 rounded-md hover:bg-primary/10 hover:shadow-[0_0_15px_rgba(28,222,228,0.3)]"
              >
                Power flow
              </Link>

              {/* Explore Mega Menu */}
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

                <ExploreMegaMenu isOpen={isExploreOpen} onClose={() => setIsExploreOpen(false)} />
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

              {/* Explore Mega Menu with Icon */}
              <div className="flex flex-col relative" ref={tabletExploreRef}>
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

                <ExploreMegaMenu isOpen={isExploreOpen} onClose={() => setIsExploreOpen(false)} />
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
        <div className="container mx-auto px-3 py-2">
          <div className="flex justify-between items-center gap-3">
            <div className="-ml-1 min-w-0">
              <AnimatedLogo className="site-logo-compact" />
            </div>

            {/* Hamburger Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="flex h-11 w-11 shrink-0 items-center justify-center text-foreground/90 hover:text-primary transition-colors rounded-xl hover:bg-primary/10 border border-primary/10"
              aria-label="Toggle navigation menu"
              aria-expanded={isMobileMenuOpen}
            >
              {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

          {/* Mobile Menu - Always in DOM for SEO */}
          <div
            className={cn(
              "fixed inset-x-0 bottom-0 top-[61px] z-50 h-[calc(100dvh-61px)] bg-background/95 backdrop-blur-xl transition-all duration-300",
              isMobileMenuOpen ? "opacity-100 visible pointer-events-auto" : "opacity-0 invisible pointer-events-none"
            )}
          >
            <button
              type="button"
              className="absolute inset-0 cursor-default"
              aria-label="Close navigation menu"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <nav
              className={cn(
                "absolute right-0 top-0 h-full w-full max-w-md overflow-y-auto border-l border-primary/20 bg-background px-4 pb-8 pt-4 shadow-2xl shadow-primary/20 transition-transform duration-300",
                isMobileMenuOpen ? "translate-x-0" : "translate-x-full"
              )}
              aria-label="Mobile navigation"
            >
              <Link
                to="/"
                className="mb-4 flex items-center justify-between rounded-lg border border-primary/25 bg-primary/10 px-4 py-3 text-sm font-semibold text-primary shadow-[0_0_20px_rgba(28,222,228,0.16)]"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Live dashboard
                </span>
                <span aria-hidden="true">Go</span>
              </Link>

              <div className="space-y-5">
                {navigationGroups.map((group) => (
                  <section key={group.label}>
                    <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary/80">
                      {group.label}
                    </p>
                    <ul className="space-y-1">
                      {group.links
                        .filter((link) => !(group.label === 'Core dashboard' && link.to === '/'))
                        .map((link) => (
                          <li key={link.to}>
                            <Link
                              to={link.to}
                              className="block rounded-md border border-primary/10 bg-background/35 px-4 py-3 text-sm font-medium text-foreground/95 transition-colors hover:border-primary/25 hover:bg-primary/10 hover:text-primary"
                              onClick={() => setIsMobileMenuOpen(false)}
                            >
                              {link.label}
                              {link.description && (
                                <span className="mt-1 block text-xs font-normal leading-snug text-muted-foreground">
                                  {link.description}
                                </span>
                              )}
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </section>
                ))}
              </div>
            </nav>
          </div>

          {/* Mobile Actions - Below hamburger menu */}
          {mobileActions && (
            <div className={cn("mt-2 transition-opacity duration-300", isMobileMenuOpen && "opacity-0 invisible")}>
              {mobileActions}
            </div>
          )}
        </div>
      </header>
    </nav>
  );
};
