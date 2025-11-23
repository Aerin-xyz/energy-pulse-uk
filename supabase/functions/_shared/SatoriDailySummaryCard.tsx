// Satori-compatible card component with inline styles
// High-resolution (2x) version optimized for LinkedIn posting
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
        width: '2400px',
        height: '1260px',
        display: 'flex',
        flexDirection: 'column',
        padding: '96px',
        background: 'linear-gradient(135deg, rgb(25, 28, 36) 0%, rgb(32, 28, 47) 50%, rgb(28, 23, 39) 100%)',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '64px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div
            style={{
              fontSize: '100px',
              fontWeight: 'bold',
              color: 'rgb(250, 251, 252)',
              marginBottom: '16px',
              display: 'flex',
              letterSpacing: '-2px',
            }}
          >
            UK Energy Mix
          </div>
          <div
            style={{
              fontSize: '48px',
              color: 'rgb(175, 183, 196)',
              display: 'flex',
              fontWeight: '500',
            }}
          >
            {dateLabel}
          </div>
        </div>
        <img
          src={logoDataUrl}
          alt="Energy Mix"
          style={{
            width: '128px',
            height: '128px',
            opacity: 0.9,
          }}
        />
      </div>

      {/* Main metrics - Hero layout with carbon intensity prominent */}
      <div
        style={{
          display: 'flex',
          gap: '64px',
          marginBottom: '80px',
          alignItems: 'stretch',
        }}
      >
        {/* Carbon Intensity - Hero metric */}
        <div 
          style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center',
            justifyContent: 'center',
            flex: '1',
            background: 'rgba(56, 217, 232, 0.08)',
            borderRadius: '32px',
            padding: '64px 48px',
            border: '3px solid rgba(56, 217, 232, 0.2)',
          }}
        >
          <div
            style={{
              fontSize: '140px',
              fontWeight: 'bold',
              color: 'rgb(56, 217, 232)',
              marginBottom: '16px',
              display: 'flex',
              lineHeight: '1',
            }}
          >
            {carbonIntensity}
          </div>
          <div style={{ fontSize: '44px', color: 'rgb(175, 183, 196)', display: 'flex', fontWeight: '600' }}>
            gCO₂/kWh
          </div>
          <div style={{ fontSize: '32px', color: 'rgb(135, 143, 156)', display: 'flex', marginTop: '8px' }}>
            Carbon Intensity
          </div>
        </div>

        {/* Secondary metrics */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', flex: '1' }}>
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              background: 'rgba(114, 195, 177, 0.08)',
              borderRadius: '24px',
              padding: '48px 32px',
              flex: '1',
              justifyContent: 'center',
              border: '2px solid rgba(114, 195, 177, 0.15)',
            }}
          >
            <div
              style={{
                fontSize: '96px',
                fontWeight: 'bold',
                color: 'rgb(114, 195, 177)',
                marginBottom: '8px',
                display: 'flex',
                lineHeight: '1',
              }}
            >
              {lowCarbonPercent.toFixed(1)}%
            </div>
            <div style={{ fontSize: '36px', color: 'rgb(175, 183, 196)', display: 'flex', fontWeight: '600' }}>
              Low Carbon
            </div>
          </div>
          
          <div 
            style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center',
              background: 'rgba(249, 182, 73, 0.08)',
              borderRadius: '24px',
              padding: '48px 32px',
              flex: '1',
              justifyContent: 'center',
              border: '2px solid rgba(249, 182, 73, 0.15)',
            }}
          >
            <div
              style={{
                fontSize: '96px',
                fontWeight: 'bold',
                color: 'rgb(249, 182, 73)',
                marginBottom: '8px',
                display: 'flex',
                lineHeight: '1',
              }}
            >
              {renewablesPercent.toFixed(1)}%
            </div>
            <div style={{ fontSize: '36px', color: 'rgb(175, 183, 196)', display: 'flex', fontWeight: '600' }}>
              Renewables
            </div>
          </div>
        </div>
      </div>

      {/* Separator */}
      <div
        style={{
          height: '3px',
          background: 'rgba(51, 54, 65, 0.6)',
          marginBottom: '64px',
          display: 'flex',
          borderRadius: '2px',
        }}
      />

      {/* Generation mix bars */}
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div
          style={{
            fontSize: '52px',
            fontWeight: '700',
            color: 'rgb(250, 251, 252)',
            marginBottom: '32px',
            display: 'flex',
            letterSpacing: '-1px',
          }}
        >
          Generation Sources
        </div>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {sortedMix.map((item) => (
            <div
              key={item.fuelType}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '32px',
              }}
            >
              <div
                style={{
                  width: '220px',
                  textAlign: 'right',
                  fontSize: '38px',
                  color: 'rgb(200, 206, 216)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  fontWeight: '500',
                }}
              >
                {item.fuelType}
              </div>
              <div
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  height: '56px',
                  background: 'rgba(51, 54, 65, 0.4)',
                  borderRadius: '28px',
                  border: '2px solid rgba(51, 54, 65, 0.6)',
                }}
              >
                <div
                  style={{
                    width: `${item.percentage}%`,
                    height: '100%',
                    background: item.color,
                    borderRadius: '28px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: '24px',
                    minWidth: item.percentage > 5 ? 'auto' : '0',
                  }}
                >
                  {item.percentage > 5 && (
                    <div
                      style={{
                        fontSize: '32px',
                        fontWeight: '700',
                        color: 'rgba(250, 251, 252, 0.95)',
                        textShadow: '0 2px 4px rgba(0,0,0,0.6)',
                        display: 'flex',
                      }}
                    >
                      {item.percentage.toFixed(1)}%
                    </div>
                  )}
                </div>
                {item.percentage <= 5 && (
                  <div
                    style={{
                      fontSize: '32px',
                      fontWeight: '600',
                      color: 'rgb(175, 183, 196)',
                      display: 'flex',
                      marginLeft: '24px',
                    }}
                  >
                    {item.percentage.toFixed(1)}%
                  </div>
                )}
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
          marginTop: '64px',
        }}
      >
        <div style={{ fontSize: '42px', color: 'rgb(175, 183, 196)', display: 'flex', fontWeight: '600' }}>
          energymix.info
        </div>
        <div style={{ fontSize: '32px', color: 'rgb(135, 143, 156)', display: 'flex' }}>
          Daily average • UK electricity generation
        </div>
      </div>
    </div>
  );
}
