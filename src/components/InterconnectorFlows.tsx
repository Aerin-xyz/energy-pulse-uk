import { Card } from '@/components/ui/card';
import { ArrowUpRight, ArrowDownLeft, ChevronDown } from 'lucide-react';
import { HelpTooltip } from '@/components/HelpTooltip';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from '@/components/ui/collapsible';
import { useState } from 'react';

interface InterconnectorData {
  name: string;
  country: string;
  flow: number; // Positive = import, Negative = export
  capacity: number;
  status?: 'live' | 'offline' | 'unavailable' | 'bmrs-fallback';
}

interface InterconnectorFlowsProps {
  data: InterconnectorData[];
  interconnectorStatus?: 'live' | 'cached' | 'unavailable';
}

const countryFlags: Record<string, string> = {
  'France': '🇫🇷',
  'Belgium': '🇧🇪',
  'Netherlands': '🇳🇱',
  'Ireland': '🇮🇪',
  'Norway': '🇳🇴',
  'Denmark': '🇩🇰',
  'Northern Ireland': '🇬🇧',
};

const getCountryFlag = (country: string): string => {
  return countryFlags[country] || '';
};

// Detailed information about each interconnector
const interconnectorDetails: Record<string, {
  endpoints: { uk: string; foreign: string };
  cable: { length: string; type: string; commissioned: string };
  facts: string[];
  sources: Array<{ text: string; url: string }>;
}> = {
  'IFA': {
    endpoints: {
      uk: 'Sellindge, Kent',
      foreign: 'Les Mandarins, Normandy, France'
    },
    cable: {
      length: '70 km subsea + land cables',
      type: 'HVDC (High Voltage Direct Current)',
      commissioned: '1986'
    },
    facts: [
      'First major electricity interconnector between UK and mainland Europe',
      'Can power up to 1 million homes at full capacity',
      'Runs beneath the English Channel alongside IFA2'
    ],
    sources: [
      { text: 'National Grid', url: 'https://www.nationalgrid.com/electricity-transmission/infrastructure/interconnectors' },
      { text: 'IFA Interconnector', url: 'https://www.ifa-interconnector.com/' }
    ]
  },
  'IFA2': {
    endpoints: {
      uk: 'Chilling, Hampshire',
      foreign: 'Tourbe, Normandy, France'
    },
    cable: {
      length: '240 km total (200 km subsea)',
      type: 'HVDC (High Voltage Direct Current)',
      commissioned: '2021'
    },
    facts: [
      'Second interconnector between UK and France',
      '1,000 MW capacity can supply power to 1 million British homes',
      'Uses latest converter technology for improved efficiency'
    ],
    sources: [
      { text: 'National Grid', url: 'https://www.nationalgrid.com/electricity-transmission/infrastructure/interconnectors' },
      { text: 'IFA2 Project', url: 'https://www.ifa2-interconnector.com/' }
    ]
  },
  'ElecLink': {
    endpoints: {
      uk: 'Folkestone, Kent',
      foreign: 'Peuplingues, Calais, France'
    },
    cable: {
      length: '51 km',
      type: 'HVDC (High Voltage Direct Current)',
      commissioned: '2022'
    },
    facts: [
      'First interconnector to use the Channel Tunnel infrastructure',
      'Runs through the service tunnel of the Channel Tunnel',
      'Can power up to 1 million homes'
    ],
    sources: [
      { text: 'ElecLink', url: 'https://eleclink.co.uk/' },
      { text: 'Getlink', url: 'https://www.getlinkgroup.com/' }
    ]
  },
  'BritNed': {
    endpoints: {
      uk: 'Isle of Grain, Kent',
      foreign: 'Maasvlakte, Rotterdam, Netherlands'
    },
    cable: {
      length: '260 km (220 km subsea)',
      type: 'HVDC (High Voltage Direct Current)',
      commissioned: '2011'
    },
    facts: [
      'First direct power link between UK and Netherlands',
      '1,000 MW capacity can supply power to 1 million homes',
      'Enables trading between UK and Dutch electricity markets'
    ],
    sources: [
      { text: 'BritNed', url: 'https://www.britned.com/' },
      { text: 'National Grid', url: 'https://www.nationalgrid.com/electricity-transmission/infrastructure/interconnectors' }
    ]
  },
  'Nemo Link': {
    endpoints: {
      uk: 'Richborough, Kent',
      foreign: 'Herdersbrug, Bruges, Belgium'
    },
    cable: {
      length: '140 km (130 km subsea)',
      type: 'HVDC (High Voltage Direct Current)',
      commissioned: '2019'
    },
    facts: [
      'First electricity link between UK and Belgium',
      '1,000 MW capacity supplies enough electricity for 1 million homes',
      'Joint venture between National Grid and Belgian transmission system operator Elia'
    ],
    sources: [
      { text: 'NEMO Link', url: 'https://www.nemolink.co.uk/' },
      { text: 'National Grid', url: 'https://www.nationalgrid.com/electricity-transmission/infrastructure/interconnectors' }
    ]
  },
  'NSL': {
    endpoints: {
      uk: 'Blyth, Northumberland',
      foreign: 'Kvilldal, Suldal, Norway'
    },
    cable: {
      length: '730 km (515 km subsea)',
      type: 'HVDC (High Voltage Direct Current)',
      commissioned: '2021'
    },
    facts: [
      "World's longest subsea power cable",
      '1,400 MW capacity can power up to 1.4 million homes',
      'Connects UK to Norwegian hydropower reserves'
    ],
    sources: [
      { text: 'National Grid NSL', url: 'https://www.northsealink.com/' },
      { text: 'Statnett', url: 'https://www.statnett.no/en/' }
    ]
  },
  'Moyle': {
    endpoints: {
      uk: 'Auchencrosh, Ayrshire, Scotland',
      foreign: 'Ballycronan More, County Antrim, Northern Ireland'
    },
    cable: {
      length: '64 km subsea',
      type: 'HVDC (High Voltage Direct Current)',
      commissioned: '2002 (original 2001, rebuilt after fault)'
    },
    facts: [
      'Links Great Britain with Northern Ireland via Scotland',
      '500 MW capacity bi-directional flow',
      'Crosses the North Channel between Scotland and Northern Ireland'
    ],
    sources: [
      { text: 'Mutual Energy', url: 'https://www.mutual-energy.com/' },
      { text: 'National Grid', url: 'https://www.nationalgrid.com/electricity-transmission/infrastructure/interconnectors' }
    ]
  },
  'EWIC': {
    endpoints: {
      uk: 'Shotton, Deeside, Wales',
      foreign: 'Rush North Beach, County Dublin, Ireland'
    },
    cable: {
      length: '260 km (186 km subsea)',
      type: 'HVDC (High Voltage Direct Current)',
      commissioned: '2013'
    },
    facts: [
      'Connects Great Britain to Republic of Ireland via Wales',
      '500 MW capacity bi-directional flow',
      'Crosses the Irish Sea between Wales and Ireland'
    ],
    sources: [
      { text: 'EirGrid', url: 'https://www.eirgridgroup.com/' },
      { text: 'National Grid', url: 'https://www.nationalgrid.com/electricity-transmission/infrastructure/interconnectors' }
    ]
  },
  'Viking Link': {
    endpoints: {
      uk: 'Bicker Fen, Lincolnshire',
      foreign: 'Revsing, South Jutland, Denmark'
    },
    cable: {
      length: '765 km (630 km subsea)',
      type: 'HVDC (High Voltage Direct Current)',
      commissioned: '2023'
    },
    facts: [
      "World's longest land and subsea interconnector",
      '1,400 MW capacity can power up to 1.4 million homes',
      'Links UK to Danish wind power resources'
    ],
    sources: [
      { text: 'National Grid Viking Link', url: 'https://www.viking-link.com/' },
      { text: 'Energinet', url: 'https://en.energinet.dk/' }
    ]
  },
  'Greenlink': {
    endpoints: {
      uk: 'Pembroke, Pembrokeshire, Wales',
      foreign: 'Great Island, County Wexford, Ireland'
    },
    cable: {
      length: '200 km (160 km subsea)',
      type: 'HVDC (High Voltage Direct Current) - 320 kV',
      commissioned: '2024'
    },
    facts: [
      'Newest electricity interconnector between UK and Ireland',
      '500 MW capacity can power up to 500,000 homes',
      'Second electricity link between Great Britain and Republic of Ireland (after EWIC)',
      'Bi-directional flow enables both countries to import/export as needed'
    ],
    sources: [
      { text: 'National Grid', url: 'https://www.nationalgrid.com/media-centre/press-releases/greenlink-interconnector-live-connecting-national-grid-and-eirgrid-networks' },
      { text: 'Greenlink Interconnector', url: 'https://www.greenlink.ie/' }
    ]
  }
};

export const InterconnectorFlows = ({ data, interconnectorStatus = 'live' }: InterconnectorFlowsProps) => {
  const [openInterconnectors, setOpenInterconnectors] = useState<Set<string>>(new Set());
  
  const totalImports = data.filter(item => item.flow > 0).reduce((sum, item) => sum + item.flow, 0);
  const totalExports = Math.abs(data.filter(item => item.flow < 0).reduce((sum, item) => sum + item.flow, 0));

  const toggleInterconnector = (name: string) => {
    const newOpen = new Set(openInterconnectors);
    if (newOpen.has(name)) {
      newOpen.delete(name);
    } else {
      newOpen.add(name);
    }
    setOpenInterconnectors(newOpen);
  };

  return (
    <Card className="p-6 border-primary/30 glow-cyan">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <h2 className="text-2xl font-bold text-card-foreground">Interconnector Flows</h2>
          <HelpTooltip 
            content={
              <div className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-cosmic-cyan rounded-full animate-pulse glow-cyan" />
                    <span className="font-medium text-sm">Live</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-4">Actively trading electricity</p>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-orange-500 rounded-full" />
                    <span className="font-medium text-sm">Offline</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-4">Temporarily not operational</p>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-amber-500 rounded-full" />
                    <span className="font-medium text-sm">BMRS Fallback</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-4">UK data when ENTSO-E unavailable</p>
                  
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-muted rounded-full" />
                    <span className="font-medium text-sm">Unavailable</span>
                  </div>
                  <p className="text-xs text-muted-foreground ml-4">No current data available</p>
                </div>
                
                <div className="text-xs text-muted-foreground border-t border-border pt-2 space-y-1">
                  <p>Interconnectors may be offline due to maintenance, market conditions, weather, or technical constraints.</p>
                  <p className="text-[11px]">Note: Temporary overloads or reporting delays can push values over 100%.</p>
                </div>
              </div>
            }
          />
        </div>
        <div className="flex items-center gap-2">
          {interconnectorStatus === 'live' ? (
            <>
              <div className="w-3 h-3 bg-cosmic-cyan rounded-full animate-pulse glow-cyan"></div>
              <span className="text-sm text-muted-foreground">Live</span>
            </>
          ) : interconnectorStatus === 'cached' ? (
            <>
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-sm text-muted-foreground">Last Known</span>
            </>
          ) : (
            <>
              <div className="w-3 h-3 bg-muted rounded-full"></div>
              <span className="text-sm text-muted-foreground">Unavailable</span>
            </>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
        <div className="glass-morphism border-cosmic-cyan/30 rounded-lg p-4 glow-cyan">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownLeft className="w-5 h-5 text-cosmic-cyan" />
            <span className="text-sm font-medium text-card-foreground">Total Imports</span>
          </div>
          <span className="text-2xl font-bold text-cosmic-cyan text-glow">{totalImports.toFixed(1)} MW</span>
        </div>

        <div className="glass-morphism border-cosmic-violet/30 rounded-lg p-4 glow-violet">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight className="w-5 h-5 text-cosmic-violet" />
            <span className="text-sm font-medium text-card-foreground">Total Exports</span>
          </div>
          <span className="text-2xl font-bold text-cosmic-violet text-glow">{totalExports.toFixed(1)} MW</span>
        </div>
      </div>

      {/* Interconnector List */}
      <div className="space-y-3">
        {data.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No interconnector data available</p>
            {interconnectorStatus === 'unavailable' && (
              <p className="text-sm mt-1">Unable to fetch current interconnector flows</p>
            )}
          </div>
        ) : (
          data
            .sort((a, b) => {
              // Sort by status first (live > offline > unavailable), then by flow magnitude
              const statusOrder = { live: 4, 'bmrs-fallback': 3, offline: 2, unavailable: 1 };
              const aStatus = statusOrder[a.status || 'unavailable'];
              const bStatus = statusOrder[b.status || 'unavailable'];
              if (aStatus !== bStatus) return bStatus - aStatus;
              return Math.abs(b.flow) - Math.abs(a.flow);
            })
            .map((interconnector, index) => {
            const isImport = interconnector.flow > 0;
            const flowValue = Math.abs(interconnector.flow);
            const utilization = (flowValue / interconnector.capacity) * 100;
            const isActive = (interconnector.status === 'live' || interconnector.status === 'bmrs-fallback') && flowValue > 0;
            const isOffline = interconnector.status === 'offline';
            const isUnavailable = interconnector.status === 'unavailable';
            const details = interconnectorDetails[interconnector.name];
            const isOpen = openInterconnectors.has(interconnector.name);
            
            return (
              <Collapsible
                key={index}
                open={isOpen}
                onOpenChange={() => toggleInterconnector(interconnector.name)}
              >
                <div
                  className={`border rounded-lg transition-all ${
                    isActive 
                      ? 'glass-morphism border-cosmic-cyan/50 hover:glow-cyan' 
                      : isOffline
                      ? 'glass-morphism border-orange-500/30 hover:bg-orange-500/20'
                      : 'glass-morphism border-muted/30 hover:bg-muted/20'
                  }`}
                >
                  <CollapsibleTrigger className="w-full flex items-center justify-between p-4 cursor-pointer hover:bg-primary/5 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {/* Flow direction indicator */}
                        {isActive && (
                          <div className={`w-3 h-3 rounded-full ${isImport ? 'bg-energy-imports' : 'bg-cosmic-violet'}`} />
                        )}
                        
                        {/* Status indicator */}
                        <div className={`w-2 h-2 rounded-full ${
                          interconnector.status === 'live' 
                            ? 'bg-cosmic-cyan animate-pulse glow-cyan' 
                            : interconnector.status === 'bmrs-fallback'
                            ? 'bg-amber-500'
                            : interconnector.status === 'offline'
                            ? 'bg-orange-500'
                            : 'bg-muted'
                        }`} />
                      </div>
                      
                      <div>
                        <div className="font-medium text-card-foreground">
                          {interconnector.name}
                        </div>
                        <div className="text-sm text-muted-foreground flex items-center gap-1.5">
                          <span className="text-base" aria-label={interconnector.country}>{getCountryFlag(interconnector.country)}</span>
                          <span>{interconnector.country}</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Capacity: {interconnector.capacity && interconnector.capacity > 0 ? `${interconnector.capacity} MW` : 'n/a'}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {isActive ? (
                          <>
                            <div className="flex items-center gap-2">
                              {isImport ? (
                                <ArrowDownLeft className="w-4 h-4 text-energy-imports" />
                              ) : (
                                <ArrowUpRight className="w-4 h-4 text-cosmic-violet" />
                              )}
                              <span className={`text-lg font-bold ${isImport ? 'text-energy-imports' : 'text-cosmic-violet'}`}>
                                {flowValue.toFixed(0)} MW
                              </span>
                            </div>
                            {interconnector.capacity && interconnector.capacity > 0 && (
                              <div className="text-sm text-muted-foreground">
                                {utilization.toFixed(1)}% utilization
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="text-right">
                            <span className={`text-sm font-medium ${
                              isOffline ? 'text-orange-500' : 'text-muted-foreground'
                            }`}>
                              {isOffline ? 'Offline' : 'Unavailable'}
                            </span>
                            <div className="text-xs text-muted-foreground mt-1">
                              {isOffline ? 'No current flow' : 'No data'}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <ChevronDown 
                        className={`w-5 h-5 text-muted-foreground transition-transform duration-200 ${
                          isOpen ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    {details ? (
                      <div className="px-4 pb-4 pt-2 space-y-3 text-sm border-t border-border/50">
                        {/* Connection Points */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="glass-morphism p-3 rounded-lg border border-border/50">
                            <div className="text-xs text-muted-foreground mb-1">UK Connection</div>
                            <div className="font-medium">📍 {details.endpoints.uk}</div>
                          </div>
                          <div className="glass-morphism p-3 rounded-lg border border-border/50">
                            <div className="text-xs text-muted-foreground mb-1">International Connection</div>
                            <div className="font-medium">📍 {details.endpoints.foreign}</div>
                          </div>
                        </div>

                        {/* Cable Specifications */}
                        <div className="glass-morphism p-3 rounded-lg border border-border/50">
                          <div className="text-xs text-muted-foreground mb-2">Cable Specifications</div>
                          <div className="space-y-1 text-xs">
                            <div><span className="text-muted-foreground">Length:</span> {details.cable.length}</div>
                            <div><span className="text-muted-foreground">Type:</span> {details.cable.type}</div>
                            <div><span className="text-muted-foreground">Commissioned:</span> {details.cable.commissioned}</div>
                          </div>
                        </div>

                        {/* Interesting Facts */}
                        <div className="glass-morphism p-3 rounded-lg border border-border/50">
                          <div className="text-xs text-muted-foreground mb-2">Key Facts</div>
                          <ul className="space-y-1 text-xs list-disc list-inside">
                            {details.facts.map((fact, idx) => (
                              <li key={idx}>{fact}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Sources */}
                        <div className="text-xs text-muted-foreground">
                          Sources: {details.sources.map((source, idx) => (
                            <a 
                              key={idx} 
                              href={source.url} 
                              target="_blank" 
                              rel="noopener noreferrer" 
                              className="text-cosmic-cyan hover:underline"
                            >
                              {source.text}{idx < details.sources.length - 1 ? ', ' : ''}
                            </a>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="px-4 pb-4 pt-2 text-sm text-muted-foreground border-t border-border/50">
                        Detailed information not available for this interconnector.
                      </div>
                    )}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
            })
        )}
      </div>
    </Card>
  );
};