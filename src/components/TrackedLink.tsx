import { Link, LinkProps } from 'react-router-dom';

type TrackedLinkProps = LinkProps & {
  eventName: string;
  eventLabel?: string;
};

declare global {
  interface Window {
    dataLayer?: unknown[];
  }
}

export const TrackedLink = ({ eventName, eventLabel, onClick, ...props }: TrackedLinkProps) => (
  <Link
    {...props}
    onClick={(event) => {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push({ event: eventName, event_label: eventLabel || String(props.to) });
      onClick?.(event);
    }}
  />
);
