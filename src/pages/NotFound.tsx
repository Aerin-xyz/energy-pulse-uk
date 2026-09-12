import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { AtlasNavigation } from "@/components/AtlasNavigation";
export default function NotFound() {
  return (
    <>
      <Helmet>
        <title>Page not found | Energy Mix</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <AtlasNavigation />
      <main className="container mx-auto px-6 py-24">
        <p className="atlas-eyebrow">404 / NO READING HERE</p>
        <h1 className="text-4xl mb-5">This page is not in the archive.</h1>
        <p className="mb-6">
          We won’t substitute another date’s report. Browse the available
          evidence instead.
        </p>
        <Link className="atlas-text-link" to="/reports">
          Browse the report archive →
        </Link>
      </main>
    </>
  );
}
