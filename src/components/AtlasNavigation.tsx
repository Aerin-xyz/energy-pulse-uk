import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, Zap } from "lucide-react";
export function AtlasNavigation() {
  const { pathname } = useLocation();
  return (
    <header className="atlas-nav">
      <Link to="/" className="atlas-brand">
        <span className="atlas-brand-mark">
          <Zap size={21} />
        </span>
        <span>
          energy<span className="atlas-brand-light">mix</span>
          <small>BRITAIN, IN THE CURRENT.</small>
        </span>
      </Link>
      <nav aria-label="Main navigation">
        {[
          ["/", "Live"],
          ["/explore", "Explore"],
          ["/reports", "Briefings"],
          ["/uk-electricity-mix", "Learn"],
        ].map(([url, label]) => (
          <Link
            key={url}
            to={url}
            aria-current={pathname === url ? "page" : undefined}
          >
            {label}
          </Link>
        ))}
      </nav>
      <Link className="atlas-source-link" to="/data">
        Open data. Clear answers. <ArrowUpRight size={14} />
      </Link>
    </header>
  );
}
