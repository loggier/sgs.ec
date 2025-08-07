
'use client';

import * as React from 'react';
import { differenceInDays, startOfDay } from 'date-fns';
import { Badge } from './ui/badge';
import { cn } from '@/lib/utils';

type PaymentStatusBadgeProps = {
  paymentDate: Date | string | null;
  className?: string;
};

const badgeVariants = {
  success: 'bg-green-100 text-green-800 border-green-200',
  warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  destructive: 'bg-red-100 text-red-800 border-red-200',
  info: 'bg-blue-100 text-blue-800 border-blue-200',
};

export default function PaymentStatusBadge({ paymentDate, className }: PaymentStatusBadgeProps) {
  const [hasMounted, setHasMounted] = React.useState(false);
  React.useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <Badge variant="outline" className={cn("animate-pulse w-24 h-6", className)} />;
  }
  
  if (!paymentDate) {
    return <Badge variant="outline" className={className}>Sin fecha</Badge>;
  }

  const today = startOfDay(new Date());
  const nextPaymentDay = startOfDay(new Date(paymentDate));
  const daysDiff = differenceInDays(nextPaymentDay, today);

  let text, variant;

  if (daysDiff < 0) {
    text = `Atrasado ${Math.abs(daysDiff)} día(s)`;
    variant = 'destructive';
  } else if (daysDiff === 0) {
    text = 'Vence hoy';
    variant = 'info';
  } else if (daysDiff <= 7) {
    text = `Vence en ${daysDiff} día(s)`;
    variant = 'warning';
  } else {
    text = `Vence en ${daysDiff} días`;
    variant = 'success';
  }

  return (
    <Badge variant="outline" className={cn(badgeVariants[variant as keyof typeof badgeVariants], className)}>
      {text}
    </Badge>
  );
}
