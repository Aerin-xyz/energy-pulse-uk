import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { pageSchema } from '@/lib/initialEvidence.mjs';

export function RouteStructuredData() {
  const { pathname } = useLocation();
  return <Helmet><script type="application/ld+json" id="site-identity">{JSON.stringify(pageSchema(pathname))}</script></Helmet>;
}
