import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Link } from 'react-router-dom';
import { Home, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';
import '@/styles/mailerlite-overrides.css';

const Insights = () => {
  useEffect(() => {
    // MailerLite success handler
    (window as any).ml_webform_success_32802782 = function() {
      const $ = (window as any).ml_jQuery || (window as any).jQuery;
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
        <title>Energy Mix Insights | UK Grid Trends & Renewable Generation Analysis</title>
        <meta name="description" content="Brief explainers and weekly insights from the Energy Mix dashboard — highlighting shifts in UK power generation and renewable share." />
        <link rel="canonical" href="https://energymix.info/insights" />
        <meta property="og:title" content="Energy Mix Insights" />
        <meta property="og:description" content="Short, data-driven explainers on the UK's changing energy mix." />
        <meta property="og:url" content="https://energymix.info/insights" />
        <meta property="og:image" content="https://energymix.info/og-insights.jpg" />
        <meta name="twitter:card" content="summary_large_image" />
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
              <Link to="/">
                <Button variant="outline" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-16 relative z-10">
          <article className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-5xl font-bold mb-8 text-glow">Energy Insights</h1>
            
            <div className="glass-morphism rounded-lg p-8 mb-8 leading-relaxed">
              <p className="text-lg text-foreground/90">
                Short explainers on what's changing in the UK's power system — drawn directly from the Energy Mix dashboard.
              </p>
              <p className="text-foreground/80 mt-4">
                Each post highlights notable shifts in supply, demand, and emissions intensity, turning live data into quick, visual takeaways.
              </p>
            </div>

            <div className="glass-morphism rounded-lg p-8 mb-8">
              <h2 className="text-2xl font-semibold mb-6 text-primary">Recent Topics</h2>
              <ul className="space-y-3 text-foreground/80">
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>When wind generation outpaces gas</span>
                </li>
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Interconnectors and cross-border balancing</span>
                </li>
                <li className="flex items-start gap-3">
                  <TrendingUp className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                  <span>Daily carbon intensity patterns</span>
                </li>
              </ul>
            </div>

            <div className="glass-morphism rounded-lg p-8">
              <p className="text-muted-foreground mb-6 text-center">
                Subscribe below to receive weekly updates when new insights go live.
              </p>
              
              <div id="mlb2-32802782" className="ml-form-embedContainer ml-subscribe-form ml-subscribe-form-32802782">
                <div className="ml-form-align-center">
                  <div className="ml-form-embedWrapper embedForm">
                    <div className="ml-form-embedBody ml-form-embedBodyHorizontal row-form">
                      <form className="ml-block-form" action="https://assets.mailerlite.com/jsonp/343200/forms/169882898276550620/subscribe" data-code="" method="post" target="_blank">
                        <div className="ml-form-formContent horozintalForm">
                          <div className="ml-form-horizontalRow">
                            <div className="ml-input-horizontal">
                              <div style={{width: '100%'}} className="horizontal-fields">
                                <div className="ml-field-group ml-field-email ml-validate-email ml-validate-required">
                                  <input type="email" className="form-control" data-inputmask="" name="fields[email]" placeholder="Email" autoComplete="email" />
                                </div>
                              </div>
                            </div>
                            <div className="ml-button-horizontal primary">
                              <button type="submit" className="primary">Subscribe</button>
                              <button disabled style={{display: 'none'}} type="button" className="loading">
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
                        <div className="ml-mobileButton-horizontal">
                          <button type="submit" className="primary">Subscribe</button>
                          <button disabled style={{display: 'none'}} type="button" className="loading">
                            <div className="ml-form-embedSubmitLoad"></div>
                            <span className="sr-only">Loading...</span>
                          </button>
                        </div>
                        <input type="hidden" name="anticsrf" value="true" />
                      </form>
                    </div>
                    <div className="ml-form-successBody row-success" style={{display: 'none'}}>
                      <div className="ml-form-successContent">
                        <h4>Thank you!</h4>
                        <p>You have successfully joined our subscriber list.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
            </div>
          </article>
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
              Contains BMRS data © Elexon Limited copyright and database right 2025
            </div>
          </div>
        </footer>
      </div>
    </>
  );
};

export default Insights;
