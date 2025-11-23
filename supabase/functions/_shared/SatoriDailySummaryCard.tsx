// Satori-compatible card component with inline styles
// This must use inline styles only - no Tailwind classes or external CSS

// @deno-types="npm:@types/react@18"
import React from 'npm:react@18';

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
        padding: '48px',
        background: 'linear-gradient(135deg, rgb(25, 28, 36) 0%, rgb(32, 28, 47) 50%, rgb(28, 23, 39) 100%)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '40px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '60px',
              fontWeight: 'bold',
              color: 'rgb(250, 251, 252)',
              marginBottom: '8px',
              display: 'flex',
            }}
          >
            UK Energy Mix
          </div>
          <div
            style={{
              fontSize: '28px',
              color: 'rgb(175, 183, 196)',
              display: 'flex',
            }}
          >
            {dateLabel}
          </div>
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
          marginBottom: '40px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'rgb(56, 217, 232)',
              marginBottom: '8px',
              display: 'flex',
            }}
          >
            {carbonIntensity}
          </div>
          <div style={{ fontSize: '24px', color: 'rgb(175, 183, 196)', display: 'flex' }}>
            gCO₂/kWh
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'rgb(114, 195, 177)',
              marginBottom: '8px',
              display: 'flex',
            }}
          >
            {lowCarbonPercent.toFixed(1)}%
          </div>
          <div style={{ fontSize: '24px', color: 'rgb(175, 183, 196)', display: 'flex' }}>
            Low Carbon
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <div
            style={{
              fontSize: '72px',
              fontWeight: 'bold',
              color: 'rgb(249, 182, 73)',
              marginBottom: '8px',
              display: 'flex',
            }}
          >
            {renewablesPercent.toFixed(1)}%
          </div>
          <div style={{ fontSize: '24px', color: 'rgb(175, 183, 196)', display: 'flex' }}>
            Renewables
          </div>
        </div>
      </div>

      {/* Separator */}
      <div
        style={{
          height: '2px',
          background: 'rgba(51, 54, 65, 0.5)',
          marginBottom: '32px',
          display: 'flex',
        }}
      />

      {/* Generation mix bars */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div
          style={{
            fontSize: '28px',
            fontWeight: '600',
            color: 'rgb(250, 251, 252)',
            marginBottom: '16px',
            display: 'flex',
          }}
        >
          Generation Sources
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
          }}
        >
          {sortedMix.map((item) => (
            <div
              key={item.fuelType}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
              }}
            >
              <div
                style={{
                  width: '120px',
                  textAlign: 'right',
                  fontSize: '20px',
                  color: 'rgb(175, 183, 196)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                }}
              >
                {item.fuelType}
              </div>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  height: '32px',
                  background: 'rgba(51, 54, 65, 0.3)',
                  borderRadius: '16px',
                }}
              >
                <div
                  style={{
                    width: `${item.percentage}%`,
                    height: '100%',
                    background: item.color,
                    borderRadius: '16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: '12px',
                  }}
                >
                  <div
                    style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: 'rgba(250, 251, 252, 0.9)',
                      textShadow: '0 1px 2px rgba(0,0,0,0.5)',
                      display: 'flex',
                    }}
                  >
                    {item.percentage.toFixed(1)}%
                  </div>
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
        <div style={{ fontSize: '22px', color: 'rgb(175, 183, 196)', display: 'flex' }}>
          energymix.info
        </div>
        <div style={{ fontSize: '16px', color: 'rgb(175, 183, 196)', display: 'flex' }}>
          Daily average • UK electricity generation
        </div>
      </div>
    </div>
  );
}
