import { useEffect, useState } from "react";
import { sourceIndicator } from "../lib/atlasPresentation.mjs";
import { Badge } from "@/components/ui/badge";
import { HelpTooltip } from "@/components/HelpTooltip";

type FreshnessItem = {
  label?: string;
  source?: string;
  timestamp?: string | null;
  cadenceMinutes?: number;
  status?: string;
};

interface SourceFreshnessBarProps {
  sourceFreshness?: Record<string, FreshnessItem>;
}

const preferredOrder = [
  "generation",
  "solar",
  "wind",
  "interconnectors",
  "demand",
  "carbon",
];

const formatTime = (iso?: string | null) => {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  // Do not present future settlement-period fallbacks as source freshness.
  if (date.getTime() > Date.now() + 2 * 60 * 1000) return "—";
  return date.toLocaleTimeString("en-GB", {
    timeZone: "Europe/London",
    hour: "2-digit",
    minute: "2-digit",
  });
};

export const SourceFreshnessBar = ({
  sourceFreshness,
}: SourceFreshnessBarProps) => {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  if (!sourceFreshness) return null;

  const entries = preferredOrder
    .map((key) => [key, sourceFreshness[key]] as const)
    .filter(([, item]) => item);

  if (!entries.length) return null;

  return (
    <div className="container mx-auto px-4 pb-2">
      <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
        {entries.map(([key, item]) => {
          const state = sourceIndicator({
            now,
            available: !["unavailable", "offline"].includes(item.status),
            timestamp: item.timestamp,
            cadenceMinutes: item.cadenceMinutes,
            failed: ["fallback", "error", "bmrs-fallback"].includes(
              item.status,
            ),
          });
          return (
            <Badge
              key={key}
              variant="outline"
              className="gap-1.5 border-primary/20 bg-background/40 py-1"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${state.fresh ? "bg-teal-400" : state.state === "unavailable" ? "bg-muted-foreground" : "bg-amber-400"}`}
              />
              <span className="text-muted-foreground">
                {item.label || key}:
              </span>
              <span className="font-semibold text-foreground">
                {formatTime(item.timestamp)} UK · {state.label}
              </span>
              <HelpTooltip
                content={`${item.source || "Source"}${item.cadenceMinutes ? ` • native cadence about ${item.cadenceMinutes} min` : ""}${item.status ? ` • ${item.status}` : ""}`}
                className="w-3 h-3"
              />
            </Badge>
          );
        })}
      </div>
    </div>
  );
};
