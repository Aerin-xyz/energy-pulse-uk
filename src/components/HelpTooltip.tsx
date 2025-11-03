import { HelpCircle } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface HelpTooltipProps {
  content: string | React.ReactNode;
  className?: string;
}

export const HelpTooltip = ({ content, className = '' }: HelpTooltipProps) => {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          aria-label="Help information"
        >
          <HelpCircle className={`w-5 h-5 cursor-pointer text-muted-foreground hover:text-foreground transition-colors ${className}`} />
        </button>
      </PopoverTrigger>
      <PopoverContent className="max-w-xs">
        {typeof content === 'string' ? (
          <p className="text-sm">{content}</p>
        ) : (
          content
        )}
      </PopoverContent>
    </Popover>
  );
};
