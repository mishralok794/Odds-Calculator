import React, { useState } from 'react';
import { HelpCircle } from 'lucide-react';

interface TooltipProps {
  content: string;
  children?: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children || (
        <HelpCircle className="w-3.5 h-3.5 text-gray-500 hover:text-gray-400 cursor-help" />
      )}
      {show && (
        <span className="tooltip-content -top-2 left-full ml-2 whitespace-normal">
          {content}
        </span>
      )}
    </span>
  );
}

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="card p-6 max-w-sm mx-4 animate-slide-up">
        <h3 className="text-lg font-semibold text-gray-100 mb-2">{title}</h3>
        <p className="text-sm text-gray-400 mb-6">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">
            Cancel
          </button>
          <button onClick={onConfirm} className="btn-danger">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] flex items-center justify-center mb-4 text-gray-500">
        {icon}
      </div>
      <h3 className="text-base font-medium text-gray-300 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 max-w-xs mb-6">{description}</p>
      {action}
    </div>
  );
}

interface CollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function Collapsible({ title, children, defaultOpen = false }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-white/[0.02] transition-colors"
      >
        <span className="text-sm font-medium text-gray-300">{title}</span>
        <svg
          className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
            open ? 'rotate-180' : ''
          }`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && <div className="px-4 pb-4 animate-fade-in">{children}</div>}
    </div>
  );
}

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  label: string;
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  id?: string;
}

export function SelectField({ label, value, options, onChange, id }: SelectFieldProps) {
  return (
    <div>
      <label className="label" htmlFor={id}>{label}</label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input-field cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-navy-800">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

interface NumberInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  prefix?: string;
  error?: string;
  id?: string;
  min?: number;
  step?: string;
  tooltip?: string;
}

export function NumberInput({
  label,
  value,
  onChange,
  placeholder,
  prefix,
  error,
  id,
  min,
  step,
  tooltip,
}: NumberInputProps) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1.5">
        <label className="text-sm font-medium text-gray-400" htmlFor={id}>
          {label}
        </label>
        {tooltip && <Tooltip content={tooltip} />}
      </div>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500">
            {prefix}
          </span>
        )}
        <input
          type="number"
          id={id}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          min={min}
          step={step}
          className={`input-field ${prefix ? 'pl-7' : ''} ${error ? 'input-field-error' : ''}`}
        />
      </div>
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

export function ResultRow({
  label,
  value,
  type = 'neutral',
  tooltip,
  large,
}: {
  label: string;
  value: string;
  type?: 'positive' | 'negative' | 'neutral' | 'highlight';
  tooltip?: string;
  large?: boolean;
}) {
  const colorClass =
    type === 'positive'
      ? 'text-emerald-400'
      : type === 'negative'
      ? 'text-red-400'
      : type === 'highlight'
      ? 'text-blue-400'
      : 'text-gray-200';

  return (
    <div className={`flex items-center justify-between py-2 ${large ? 'py-3' : ''}`}>
      <span className="flex items-center gap-1.5 text-sm text-gray-400">
        {label}
        {tooltip && <Tooltip content={tooltip} />}
      </span>
      <span className={`${large ? 'text-lg' : 'text-sm'} font-semibold ${colorClass} font-mono`}>
        {value}
      </span>
    </div>
  );
}

export function SectionDivider() {
  return <div className="border-t border-white/[0.04] my-1" />;
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <button onClick={handleCopy} className="btn-ghost text-xs">
      {copied ? '✓ Copied' : '📋 Copy'}
    </button>
  );
}
