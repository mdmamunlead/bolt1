import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { DownloadStatus } from '@/lib/types';

export function StatusBadge({ status }: { status: DownloadStatus }) {
  const config: Record<
    DownloadStatus,
    { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }
  > = {
    waiting: { label: 'Waiting', variant: 'secondary' },
    downloading: { label: 'Downloading', variant: 'default', className: 'text-primary' },
    processing: { label: 'Processing', variant: 'default', className: 'text-warning' },
    completed: { label: 'Completed', variant: 'default', className: 'text-success' },
    failed: { label: 'Failed', variant: 'destructive' },
    paused: { label: 'Paused', variant: 'secondary' },
    cancelled: { label: 'Cancelled', variant: 'outline' },
  };
  const c = config[status];
  return (
    <Badge variant={c.variant} className={cn('text-xs', c.className)}>
      {c.label}
    </Badge>
  );
}
