import React from 'react';
import type { StatusOrcamento } from '@/lib/types';

const TONES = {
  neutral: 'bg-slate-100 text-slate-600',
  info: 'bg-porto-blue/10 text-porto-blueDark',
  success: 'bg-emerald-100 text-emerald-700',
  warn: 'bg-porto-yellow/30 text-yellow-800',
  danger: 'bg-rose-100 text-rose-600',
} as const;

export function Badge({ tone = 'neutral', children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone]}`}>
      {children}
    </span>
  );
}

const STATUS_LABEL: Record<StatusOrcamento, string> = {
  rascunho: 'Rascunho',
  enviado: 'Enviado',
  aprovado: 'Aprovado',
  recusado: 'Recusado',
};

const STATUS_TONE: Record<StatusOrcamento, keyof typeof TONES> = {
  rascunho: 'neutral',
  enviado: 'warn',
  aprovado: 'success',
  recusado: 'danger',
};

export function StatusBadge({ status }: { status: StatusOrcamento }) {
  return <Badge tone={STATUS_TONE[status]}>{STATUS_LABEL[status]}</Badge>;
}

export { STATUS_LABEL };
