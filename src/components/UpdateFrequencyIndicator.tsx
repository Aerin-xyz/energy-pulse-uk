import { Clock, Zap, Globe, Database } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface UpdateFrequencyIndicatorProps {
  updateType: 'high' | 'mid' | 'full';
  nextHighFreqAt?: Date | null;
  nextMidFreqAt?: Date | null;
  nextUpdateAt?: Date | null;
}

const UPDATE_ICONS = {
  high: Zap,
  mid: Globe,
  full: Database
};

const UPDATE_LABELS = {
  high: 'Embedded Sources',
  mid: 'Interconnectors & EU',
  full: 'Full Settlement Data'
};

const UPDATE_COLORS = {
  high: 'bg-green-500/10 text-green-600 border-green-500/20',
  mid: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  full: 'bg-purple-500/10 text-purple-600 border-purple-500/20'
};

export const UpdateFrequencyIndicator = ({ 
  updateType, 
  nextHighFreqAt, 
  nextMidFreqAt, 
  nextUpdateAt 
}: UpdateFrequencyIndicatorProps) => {
  const Icon = UPDATE_ICONS[updateType];
  
  return (
    <div className="flex items-center gap-2 text-xs">
      <Badge variant="outline" className={UPDATE_COLORS[updateType]}>
        <Icon className="w-3 h-3 mr-1" />
        {UPDATE_LABELS[updateType]}
      </Badge>
      
      <div className="flex items-center gap-1 text-muted-foreground">
        <Clock className="w-3 h-3" />
        <span className="font-mono">
          {nextUpdateAt ? formatTimeUntil(nextUpdateAt) : '--:--'}
        </span>
      </div>
    </div>
  );
};

function formatTimeUntil(date: Date): string {
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  
  if (diff <= 0) {
    return 'updating...';
  }
  
  const minutes = Math.floor(diff / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}