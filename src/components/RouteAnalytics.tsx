import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { canonicalPath } from '@/lib/initialEvidence.mjs';

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

const buildPagePath = (location: ReturnType<typeof useLocation>) =>
  canonicalPath(location.pathname);

export const RouteAnalytics = () => {
  const location = useLocation();
  const previousPath = useRef<string | null>(null);

  useEffect(() => {
    const pagePath = buildPagePath(location);

    if (previousPath.current === null) {
      previousPath.current = pagePath;
      return;
    }

    if (previousPath.current === pagePath) {
      return;
    }

    previousPath.current = pagePath;

    const timer = window.setTimeout(() => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({
        event: 'virtual_page_view',
        page_path: pagePath,
        page_location: `${window.location.origin}${pagePath}`,
        page_title: document.title,
      });
    }, 0);

    return () => window.clearTimeout(timer);
  }, [location]);

  return null;
};
