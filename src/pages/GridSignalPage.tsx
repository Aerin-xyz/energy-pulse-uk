import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { StaticPageLayout } from "@/components/StaticPageLayout";
import { useEnergyData } from "@/contexts/EnergyDataContext";
import { sourceState } from "@/lib/gridMetrics.mjs";
export function GridSignalPage({ kind }: { kind: "price" | "storage" }) {
  const { data } = useEnergyData();
  const price = kind === "price";
  const signal = price ? data?.marketIndexPrice : data?.storage;
  const title = price
    ? "Wholesale electricity, explained."
    : "Storage moves electricity through time.";
  const route = price ? "/wholesale-electricity-price/" : "/pumped-storage/";
  return (
    <>
      <Helmet>
        <title>
          {price ? "GB Wholesale Electricity Price" : "GB Pumped Storage"} |
          Energy Mix
        </title>
        <link rel="canonical" href={`https://energymix.info${route}`} />
        <meta
          name="description"
          content={
            price
              ? "The latest GB wholesale market index price, with source timestamps and an explanation of why it differs from your household tariff."
              : "GB pumped-storage generation and charging, with source timestamps. Pumped storage is not battery state of charge."
          }
        />
      </Helmet>
      <StaticPageLayout
        eyebrow={price ? "Explore / Markets" : "Explore / Storage"}
        title={title}
        intro={
          price
            ? "A wholesale market index is a price signal, not your electricity bill."
            : "Pumped storage uses electricity to move water uphill, then releases it through turbines when needed."
        }
      >
        <section className="atlas-route-metrics">
          <div>
            <span>
              {price ? "Latest market index" : "Latest pumped-storage transfer"}
            </span>
            <strong>
              {price
                ? data?.marketIndexPrice
                  ? `£${data.marketIndexPrice.priceGBPPerMWh.toFixed(2)} /MWh`
                  : "Unavailable"
                : data?.storage
                  ? `${(data.storage.absMW / 1000).toFixed(2)} GW · ${data.storage.mode}`
                  : "Unavailable"}
            </strong>
            <small>
              {
                sourceState(
                  price
                    ? data?.marketIndexPrice?.startTime
                    : data?.storage?.timestamp,
                  price ? 30 : 5,
                ).label
              }
            </small>
            <small>{signal?.source || "Source reading unavailable"}</small>
          </div>
        </section>
        <section>
          <h2>What this number means</h2>
          <p>
            {price
              ? "The Elexon Market Index Price describes wholesale trading for a settlement period. It can be negative. Supplier charges, network costs, taxes and your contract determine what you pay at home. It is not a day-ahead tariff or a prediction of the next hour."
              : "This reading covers Elexon pumped storage, not the whole battery fleet. Charging is a withdrawal from the system; generation is a contribution. Neither tells us how full the reservoirs or batteries are. Storage is excluded from primary renewable generation to avoid counting the same energy twice."}
          </p>
        </section>
        <section>
          <h2>Read the evidence</h2>
          <p>
            {price
              ? "Values are volume-weighted across available positive-volume market-index provider rows at the latest returned interval. Missing prices remain unavailable."
              : "The sign is normalised as positive for generation into the system and negative for charging. Source times may differ from the generation mix and interconnector readings."}
          </p>
          <p>
            Latest source interval:{" "}
            {price
              ? data?.marketIndexPrice?.startTime || "unavailable"
              : data?.storage?.timestamp || "unavailable"}
            .
          </p>
          <p>
            <Link to="/methodology">Metric definitions</Link> ·{" "}
            <Link to="/explore">Explore all readings</Link> ·{" "}
            <Link to="/">Return to the atlas</Link>
          </p>
        </section>
      </StaticPageLayout>
    </>
  );
}
