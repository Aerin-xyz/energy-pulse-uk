// Satori-compatible card component with inline styles
// This must use inline styles only - no Tailwind classes or external CSS

interface FuelMixItem {
  fuelType: string;
  percentage: number;
  color: string;
}

interface SatoriDailySummaryCardProps {
  dateLabel: string; // "Fri 14 Nov 2025"
  carbonIntensity: number;
  lowCarbonPercent: number;
  renewablesPercent: number;
  mixBreakdown: FuelMixItem[];
  logoDataUrl: string; // Base64 encoded logo
}

export function SatoriDailySummaryCard({
  dateLabel,
  carbonIntensity,
  lowCarbonPercent,
  renewablesPercent,
  mixBreakdown,
  logoDataUrl,
}: SatoriDailySummaryCardProps) {
  // Sort mix by percentage descending, take top 8
  const sortedMix = [...mixBreakdown]
    .sort((a, b) => b.percentage - a.percentage)
    .slice(0, 8);

  return (
    <div
      style={{
        width: '1200px',
        height: '630px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px',
        background: 'linear-gradient(135deg, hsl(220, 30%, 10%), hsl(250, 40%, 15%), hsl(280, 35%, 12%))',
        position: 'relative',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Nebula overlay */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(circle at 20% 50%, hsla(280, 50%, 20%, 0.3), transparent 70%)',
          pointerEvents: 'none',
        }}
      />

      {/* Content */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          justifyContent: 'space-between',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1
              style={{
                fontSize: '60px',
                fontWeight: 'bold',
                color: 'hsl(210, 40%, 98%)',
                margin: 0,
                marginBottom: '8px',
              }}
            >
              UK Energy Mix
            </h1>
            <p
              style={{
                fontSize: '28px',
                color: 'hsl(210, 20%, 70%)',
                margin: 0,
              }}
            >
              {dateLabel}
            </p>
          </div>
          <img
            src={logoDataUrl}
            alt="Energy Mix"
            style={{
              width: '64px',
              height: '64px',
              opacity: 0.9,
            }}
          />
        </div>

        {/* Main metrics */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginTop: '32px',
            marginBottom: '32px',
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: 'hsl(187, 89%, 55%)',
                marginBottom: '8px',
              }}
            >
              {carbonIntensity}
            </div>
            <div style={{ fontSize: '24px', color: 'hsl(210, 20%, 70%)' }}>
              gCO₂/kWh
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: 'hsl(168, 42%, 59%)',
                marginBottom: '8px',
              }}
            >
              {lowCarbonPercent.toFixed(1)}%
            </div>
            <div style={{ fontSize: '24px', color: 'hsl(210, 20%, 70%)' }}>
              Low Carbon
            </div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                fontSize: '72px',
                fontWeight: 'bold',
                color: 'hsl(40, 92%, 58%)',
                marginBottom: '8px',
              }}
            >
              {renewablesPercent.toFixed(1)}%
            </div>
            <div style={{ fontSize: '24px', color: 'hsl(210, 20%, 70%)' }}>
              Renewables
            </div>
          </div>
        </div>

        {/* Separator */}
        <div
          style={{
            height: '2px',
            background: 'hsla(220, 25%, 18%, 0.5)',
            marginTop: '24px',
            marginBottom: '24px',
          }}
        />

        {/* Generation mix bars */}
        <div style={{ marginTop: '16px' }}>
          <h2
            style={{
              fontSize: '28px',
              fontWeight: '600',
              color: 'hsl(210, 40%, 98%)',
              marginBottom: '16px',
            }}
          >
            Generation Sources
          </h2>
          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '12px',
            }}
          >
            {sortedMix.map((item, index) => (
              <div
                key={item.fuelType}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  width: index < 4 ? '48%' : '48%',
                }}
              >
                <div
                  style={{
                    width: '128px',
                    textAlign: 'right',
                    fontSize: '20px',
                    color: 'hsl(210, 20%, 70%)',
                  }}
                >
                  {item.fuelType}
                </div>
                <div
                  style={{
                    flex: 1,
                    height: '32px',
                    background: 'hsla(220, 20%, 18%, 0.3)',
                    borderRadius: '16px',
                    overflow: 'hidden',
                    position: 'relative',
                  }}
                >
                  <div
                    style={{
                      height: '100%',
                      width: `${item.percentage}%`,
                      background: item.color,
                      borderRadius: '16px',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      paddingRight: '12px',
                    }}
                  >
                    <span
                      style={{
                        fontSize: '16px',
                        fontWeight: '600',
                        color: 'hsla(210, 40%, 98%, 0.9)',
                        textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      }}
                    >
                      {item.percentage.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: '32px',
          }}
        >
          <div style={{ fontSize: '22px', color: 'hsl(210, 20%, 70%)' }}>
            energymix.info
          </div>
          <div style={{ fontSize: '16px', color: 'hsl(210, 20%, 70%)' }}>
            Daily average • UK electricity generation
          </div>
        </div>
      </div>
    </div>
  );
}
