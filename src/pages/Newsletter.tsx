import { AnimatedLogo } from '@/components/AnimatedLogo';
import { Link } from 'react-router-dom';
import { Home, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';
import '../styles/mailerlite-overrides.css';

const Newsletter = () => {
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
        <title>Energy Mix Newsletter | Weekly UK Electricity & Carbon Insights</title>
        <meta name="description" content="Get a weekly summary of Britain’s electricity mix, renewables, gas, carbon intensity, records and grid trends." />
        <link rel="canonical" href="https://energymix.info/newsletter/" />
        <meta property="og:title" content="Energy Mix Newsletter" />
        <meta property="og:description" content="Weekly data snapshots from the UK Energy Mix dashboard." />
        <meta property="og:url" content="https://energymix.info/newsletter/" />
        <meta property="og:image" content="https://energymix.info/og-newsletter.jpg" />
        <meta property="og:site_name" content="Energy Mix" />
        <meta property="og:locale" content="en_GB" />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Energy Mix Newsletter" />
        <meta name="twitter:description" content="Weekly data snapshots from the UK Energy Mix dashboard." />
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
          <div className="max-w-2xl mx-auto">
            <div className="text-center mb-12">
              <Mail className="w-16 h-16 mx-auto mb-6 text-primary" />
              <h1 className="text-4xl md:text-5xl font-bold mb-6 text-glow">Get Weekly Energy Mix Updates</h1>
              <p className="text-lg text-foreground/80 leading-relaxed">
                Stay informed with a short, data-driven summary every week — tracking how the UK's energy mix changes over time. Each newsletter is drawn directly from <Link to="/" className="text-cosmic-cyan hover:underline">our live dashboard</Link> and includes <Link to="/insights" className="text-cosmic-cyan hover:underline">detailed insights</Link>.
              </p>
            </div>

            <div className="glass-morphism rounded-lg p-8 mb-8">
              <h2 className="text-xl font-semibold mb-4 text-primary">What You'll Receive</h2>
              <ul className="space-y-3 text-foreground/80">
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>Top three movements in generation and demand</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>Snapshot of carbon intensity and renewables</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-primary font-bold">•</span>
                  <span>Insight links back to the live dashboard</span>
                </li>
              </ul>
            </div>

            <div className="glass-morphism rounded-lg p-8">
              <h2 className="text-xl font-semibold mb-4 text-primary">Join the List</h2>
              
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
                We respect your privacy. No spam — just clear, actionable energy data.
              </p>
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
