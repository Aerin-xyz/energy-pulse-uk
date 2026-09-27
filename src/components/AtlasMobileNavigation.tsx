import { useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Map, Compass, BarChart3, Lightbulb, Menu } from "lucide-react";
import { AtlasInspector } from "./AtlasInspector";
export function AtlasMobileNavigation({
  links,
}: {
  links: readonly (readonly [string, string, any])[];
}) {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const origin = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    requestAnimationFrame(() => origin.current?.focus());
  };
  return (
    <>
      <nav className="map-mobile-nav" aria-label="Quick navigation">
        {[
          ["/", "Atlas", Map],
          ["/explore", "Explore", Compass],
          ["/data", "Data", BarChart3],
          ["/reports", "Insights", Lightbulb],
        ].map(([url, name, Icon]: any) => (
          <Link
            key={url}
            to={url}
            aria-current={pathname === url ? "page" : undefined}
          >
            <Icon />
            <span>{name}</span>
          </Link>
        ))}
        <button ref={origin} onClick={() => setOpen(true)} aria-expanded={open}>
          <Menu />
          <span>Menu</span>
        </button>
      </nav>
      {open && (
        <AtlasInspector
          title="Explore Energy Mix"
          kind="navigation"
          onClose={close}
        >
          <nav className="atlas-access-list" aria-label="All sections">
            {links.map(([name, url, Icon]) => (
              <Link
                key={url}
                to={url}
                onClick={() => setOpen(false)}
                aria-current={pathname === url ? "page" : undefined}
                style={{
                  display: "flex",
                  gap: 12,
                  alignItems: "center",
                  minHeight: 44,
                }}
              >
                <Icon size={20} />
                {name}
              </Link>
            ))}
          </nav>
        </AtlasInspector>
      )}
    </>
  );
}
