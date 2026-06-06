import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Link } from 'react-router-dom';
import { Home, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';
import '../styles/mailerlite-overrides.css';
import generated from '@/data/energyMixGenerated.json';

const latestReport = generated.reports[0];
type MailerLiteQuery = (selector: string) => { show: () => void; hide: () => void };
type MailerLiteWindow = Window & {
  ml_webform_success_32802782?: () => void;
  ml_jQuery?: MailerLiteQuery;
  jQuery?: MailerLiteQuery;
};

const Newsletter = () => {
  useEffect(() => {
    const mailerLiteWindow = window as MailerLiteWindow;
    // MailerLite success handler
    mailerLiteWindow.ml_webform_success_32802782 = function() {
      const $ = mailerLiteWindow.ml_jQuery || mailerLiteWindow.jQuery;
      if ($) {
        $('.ml-subscribe-form-32802782 .row-success').show();
        $('.ml-subscribe-form-32802782 .row-form').hide();
      }
    };

    // Fetch MailerLite form data
    fetch("https://assets.mailerlite.com/jsonp/343200/forms/169882898276550620/takel").catch(() => {});
  }, []);

  return (
    <>
      <Helmet>
        <title>Weekly UK Electricity Mix Newsletter | EnergyMix.info</title>
        <meta name="description" content="A short weekly brief on Britain’s electricity mix: renewables, gas, carbon intensity, records and the cleanest times to use power." />
        <link rel="canonical" href="https://energymix.info/newsletter/" />
        <meta property="og:title" content="Weekly UK Electricity Mix Newsletter | EnergyMix.info" />
        <meta property="og:description" content="A short weekly brief on Britain’s electricity mix: renewables, gas, carbon intensity, records and the cleanest times to use power." />
        <meta property="og:url" content="https://energymix.info/newsletter/" />
        <meta property="og:image" content="https://energymix.info/og-newsletter.jpg" />
        <meta property="og:site_name" content="Energy Mix" />
        <meta property="og:locale" content="en_GB" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Weekly UK Electricity Mix Newsletter | EnergyMix.info" />
        <meta name="twitter:description" content="A short weekly brief on Britain’s electricity mix: renewables, gas, carbon intensity, records and the cleanest times to use power." />
        <meta name="twitter:image" content="https://energymix.info/og-newsletter.jpg" />
        <meta name="author" content="Energy Mix" />
        <meta name="robots" content="index, follow" />
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              {
                "@type": "ListItem",
                "position": 1,
                "name": "Home",
                "item": "https://energymix.info/"
              },
              {
                "@type": "ListItem",
                "position": 2,
                "name": "Newsletter",
                "item": "https://energymix.info/newsletter/"
              }
            ]
          })}
        </script>
        <script src="https://www.google.com/recaptcha/api.js" async defer></script>
        <script src="https://groot.mailerlite.com/js/w/webforms.min.js?v176e10baa5e7ed80d35ae235be3d5024" type="text/javascript"></script>
      </Helmet>

      <div className="min-h-screen bg-background relative">
        <div className="absolute inset-0 bg-gradient-nebula opacity-30 pointer-events-none"></div>
        
        {/* Header */}
        <header className="border-b border-primary/20 glass-morphism relative">
          <div className="container mx-auto px-4 py-3">
            <div className="flex justify-between items-center">
              <AnimatedLogo />
              <Link to="/" aria-label="Back to Dashboard">
                <Button variant="outline" size="sm" className="mr-1">
                  <Home className="w-4 h-4 md:mr-2" />
                  <span className="hidden md:inline">Dashboard</span>
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-16 relative z-10">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <Mail className="w-16 h-16 mx-auto mb-6 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold mb-6 text-glow">Weekly UK Electricity Mix Newsletter</h1>
              <p className="text-lg text-foreground/80 leading-relaxed max-w-3xl mx-auto">
                A short weekly brief on Britain’s electricity mix: renewables, gas, wind, solar, carbon intensity, demand, records and the cleanest periods to use power. It is drawn from the <Link to="/" className="text-cosmic-cyan hover:underline">live dashboard</Link>, <Link to="/reports" className="text-cosmic-cyan hover:underline">weekly reports</Link> and transparent <Link to="/data" className="text-cosmic-cyan hover:underline">data sources</Link>.
              </p>
            </div>

            <div className="glass-morphism rounded-lg p-8 mb-8">
              <h2 className="text-xl font-semibold mb-4 text-primary">What you’ll get each week</h2>
              <ul className="space-y-3 text-foreground/80">
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>Renewable share, low-carbon context and the biggest changes in the electricity mix</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>Gas generation, demand, wind and solar highlights</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>Carbon-intensity highs and lows, plus cleaner electricity windows where the data supports them</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>Links to the live UK electricity mix, methodology notes and the latest weekly report</span>
                </li>
              </ul>
            </div>

            <div className="glass-morphism rounded-lg p-8">
              <h2 className="text-xl font-semibold mb-4 text-primary">Get the weekly UK electricity mix brief</h2>
              
              {/* MailerLite Form */}
              <div id="mlb2-32802782" className="ml-form-embedContainer ml-subscribe-form ml-subscribe-form-32802782">
                <div className="ml-form-align-center">
                  <div className="ml-form-embedWrapper embedForm">
                    <div className="ml-form-embedBody ml-form-embedBodyHorizontal row-form">
                      <div className="ml-form-embedContent" style={{ display: 'none' }}>
                        <h4>Newsletter</h4>
                        <p>Signup for news and special offers!</p>
                      </div>

                      <form className="ml-block-form" action="https://assets.mailerlite.com/jsonp/343200/forms/169882898276550620/subscribe" data-code="" method="post" target="_blank">
                        <div className="ml-form-formContent horozintalForm">
                          <div className="ml-form-horizontalRow">
                            <div className="ml-input-horizontal">
                              <div style={{ width: '100%' }} className="horizontal-fields">
                                <div className="ml-field-group ml-field-email ml-validate-email ml-validate-required">
                                  <input type="email" className="form-control" data-inputmask="" name="fields[email]" placeholder="Email" autoComplete="email" />
                                </div>
                              </div>
                            </div>

                            <div className="ml-button-horizontal primary">
                              <button type="submit" className="primary">Subscribe</button>
                              <button disabled style={{ display: 'none' }} type="button" className="loading">
                                <div className="ml-form-embedSubmitLoad"></div>
                                <span className="sr-only">Loading...</span>
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="ml-form-recaptcha ml-validate-required">
                          <div className="g-recaptcha" data-sitekey="6Lf1KHQUAAAAAFNKEX1hdSWCS3mRMv4FlFaNslaD"></div>
                        </div>

                        <input type="hidden" name="ml-submit" value="1" />
                        <input type="hidden" name="anticsrf" value="true" />

                        <div className="ml-mobileButton-horizontal">
                          <button type="submit" className="primary">Subscribe</button>
                          <button disabled style={{ display: 'none' }} type="button" className="loading">
                            <div className="ml-form-embedSubmitLoad"></div>
                            <span className="sr-only">Loading...</span>
                          </button>
                        </div>
                      </form>
                    </div>

                    <div className="ml-form-successBody row-success" style={{ display: 'none' }}>
                      <div className="ml-form-successContent">
                        <h4>Thank you!</h4>
                        <p>You have successfully joined our subscriber list.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mt-6 text-center">
                Weekly when there is something useful to say. Unsubscribe any time. No spam — just clear, source-backed electricity data.
              </p>
            </div>

            <div className="glass-morphism rounded-lg p-8 mt-8">
              <h2 className="text-xl font-semibold mb-4 text-primary">Sample issue</h2>
              <div className="space-y-4 text-foreground/80 leading-relaxed">
                <p className="text-sm uppercase tracking-[0.18em] text-primary/70">From the latest weekly report</p>
                <h3 className="text-2xl font-semibold text-cosmic-cyan">{latestReport.title}</h3>
                <p>{latestReport.summary}</p>
                <ul className="space-y-2 list-disc pl-5">
                  {latestReport.metrics.slice(0, 4).map(([label, value]) => (
                    <li key={label}><strong>{label}:</strong> {value}</li>
                  ))}
                </ul>
                <p>{latestReport.takeaway}</p>
                <Link to={latestReport.slug} className="inline-flex rounded-md border border-primary/30 px-4 py-2 text-cosmic-cyan hover:bg-primary/10">Read the latest weekly report first</Link>
              </div>
            </div>

            <div className="glass-morphism rounded-lg p-8 mt-8">
              <h2 className="text-xl font-semibold mb-4 text-primary">Who it’s for</h2>
              <div className="grid md:grid-cols-2 gap-3 text-foreground/80">
                <p className="rounded-md border border-primary/20 p-3">Energy-curious readers who want the grid explained plainly.</p>
                <p className="rounded-md border border-primary/20 p-3">EV, home-energy and battery users watching cleaner periods.</p>
                <p className="rounded-md border border-primary/20 p-3">Sustainability teams who need readable grid context.</p>
                <p className="rounded-md border border-primary/20 p-3">Journalists, educators and analysts looking for source-backed summaries.</p>
              </div>
            </div>
            
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-primary/20 glass-morphism mt-16 relative">
          <div className="absolute inset-0 bg-gradient-glow opacity-20"></div>
          <div className="container mx-auto px-4 py-6 relative z-10">
            <nav className="flex justify-center gap-6 mb-4">
              <Link to="/about" className="text-sm text-foreground/70 hover:text-primary transition-colors">About</Link>
              <Link to="/data" className="text-sm text-foreground/70 hover:text-primary transition-colors">Data</Link>
              <Link to="/insights" className="text-sm text-foreground/70 hover:text-primary transition-colors">Insights</Link>
              <Link to="/newsletter" className="text-sm text-foreground/70 hover:text-primary transition-colors">Newsletter</Link>
            </nav>
            <div className="text-xs text-foreground/50 text-center">
              Contains BMRS data © Elexon Limited copyright and database right 2026
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Newsletter;
