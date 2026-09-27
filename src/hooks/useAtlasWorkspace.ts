import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ATLAS_DEFAULTS,
  readAtlasState,
  atlasSearch,
} from "@/lib/atlasState.mjs";
const key = "energy-mix-atlas-v1";
function remembered() {
  try {
    return {
      ...ATLAS_DEFAULTS,
      ...JSON.parse(sessionStorage.getItem(key) || "{}"),
    };
  } catch {
    return ATLAS_DEFAULTS;
  }
}
export function useAtlasWorkspace() {
  const location = useLocation(),
    navigate = useNavigate();
  const [state, setState] = useState(() =>
    readAtlasState(location.search, remembered()),
  );
  const current = useRef(state);
  current.current = state;
  // Seed the initial entry too. Otherwise Back to a bare URL would read the
  // newest session snapshot and reopen the very panel the user just dismissed.
  useEffect(() => {
    if (!location.state?.atlas)
      navigate(
        {
          pathname: location.pathname,
          search: location.search,
          hash: location.hash,
        },
        {
          replace: true,
          state: { ...location.state, atlas: current.current },
          preventScrollReset: true,
        },
      );
  }, []);

  useEffect(() => {
    const next =
      location.state?.atlas || readAtlasState(location.search, remembered());
    current.current = next;
    setState(next);
  }, [location.key]);
  useEffect(() => {
    const timer = setTimeout(() => {
      try {
        sessionStorage.setItem(key, JSON.stringify(state));
      } catch {}
    }, 150);
    return () => clearTimeout(timer);
  }, [state]);
  const update = (
    patch: any,
    history: "push" | "replace" | "silent" = "replace",
  ) => {
    const next = {
      ...current.current,
      ...(typeof patch === "function" ? patch(current.current) : patch),
    };
    current.current = next;
    setState(next);
    if (history !== "silent")
      try {
        sessionStorage.setItem(key, JSON.stringify(next));
      } catch {}
    if (history !== "silent")
      navigate(
        {
          pathname: location.pathname,
          search: atlasSearch(next, location.search),
          hash: location.hash,
        },
        {
          replace: history === "replace",
          state: { ...location.state, atlas: next },
          preventScrollReset: true,
        },
      );
  };
  return { state, update };
}
