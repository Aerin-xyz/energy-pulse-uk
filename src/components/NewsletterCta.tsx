import { TrackedLink } from '@/components/TrackedLink';

type NewsletterCtaProps = {
  label: string;
  title?: string;
  body?: string;
  compact?: boolean;
};

export const NewsletterCta = ({
  label,
  title = 'Get the weekly UK electricity mix briefing',
  body = 'A short, source-backed brief on renewables, gas, carbon intensity, records and cleaner electricity windows.',
  compact = false,
}: NewsletterCtaProps) => (
  <section className={`rounded-lg border border-primary/25 bg-primary/5 ${compact ? 'p-4' : 'p-5 md:p-6'}`}>
    <p className="mb-2 text-sm uppercase tracking-[0.18em] text-primary/75">Weekly brief</p>
    <h2 className={`${compact ? 'text-xl' : 'text-2xl'} font-semibold text-primary mb-3`}>{title}</h2>
    <p className="text-foreground/80">{body}</p>
    <div className="mt-4 flex flex-wrap gap-3">
      <TrackedLink
        to="/newsletter"
        eventName="newsletter_cta_click"
        eventLabel={label}
        className="rounded-md border border-primary/35 px-4 py-2 text-cosmic-cyan hover:bg-primary/10"
      >
        Subscribe to the weekly brief
      </TrackedLink>
      <TrackedLink
        to="/reports"
        eventName="reports_cta_click"
        eventLabel={label}
        className="rounded-md border border-primary/25 px-4 py-2 text-cosmic-cyan hover:bg-primary/10"
      >
        Read latest reports
      </TrackedLink>
    </div>
  </section>
);
