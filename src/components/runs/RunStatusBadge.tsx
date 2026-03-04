import { Badge } from '@/components/ui/badge';
import { Loader2, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface RunStatusBadgeProps {
  status: 'running' | 'completed' | 'failed' | 'partial';
}

const statusConfig = {
  running: { icon: Loader2, label: 'Ejecutando', className: 'bg-blue-50 text-blue-700 border-blue-200', spin: true },
  completed: { icon: CheckCircle, label: 'Completado', className: 'bg-green-50 text-green-700 border-green-200', spin: false },
  failed: { icon: XCircle, label: 'Fallido', className: 'bg-red-50 text-red-600 border-red-200', spin: false },
  partial: { icon: AlertTriangle, label: 'Parcial', className: 'bg-yellow-50 text-yellow-700 border-yellow-200', spin: false },
};

export function RunStatusBadge({ status }: RunStatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <Badge variant="outline" className={`gap-1 ${config.className}`}>
      <Icon className={`w-3 h-3 ${config.spin ? 'animate-spin' : ''}`} />
      {config.label}
    </Badge>
  );
}
