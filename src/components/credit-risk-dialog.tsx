'use client';

import * as React from 'react';
import type { AssessCreditRiskOutput } from '@/ai/flows/credit-risk-assessment';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

type CreditRiskDialogProps = {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  assessment: AssessCreditRiskOutput | null;
};

export default function CreditRiskDialog({
  isOpen,
  onOpenChange,
  assessment,
}: CreditRiskDialogProps) {
  if (!assessment) return null;

  const getRiskVariant = (riskLevel: 'low' | 'medium' | 'high') => {
    switch (riskLevel) {
      case 'low':
        return 'success';
      case 'medium':
        return 'warning';
      case 'high':
        return 'destructive';
      default:
        return 'default';
    }
  };

  const riskLevelText = {
    low: 'Bajo',
    medium: 'Medio',
    high: 'Alto',
  };
  
    // Custom variants for Badge
  const badgeVariants = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    destructive: 'bg-red-100 text-red-800 border-red-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200',
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Evaluación de Riesgo Crediticio con IA</DialogTitle>
          <DialogDescription>
            La IA ha analizado la información del nuevo cliente. Aquí está el resultado:
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="flex items-center gap-4">
            <span className="font-semibold">Nivel de Riesgo:</span>
             <Badge variant="outline" className={badgeVariants[getRiskVariant(assessment.riskLevel)]}>
              {riskLevelText[assessment.riskLevel]}
            </Badge>
          </div>
          <div>
            <h4 className="font-semibold mb-2">Detalles de la Evaluación:</h4>
            <p className="text-sm text-muted-foreground bg-secondary p-3 rounded-md">
                {assessment.creditRiskAssessment}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Cerrar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
