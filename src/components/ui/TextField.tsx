'use client';

import { useId, useState, type ComponentProps, type ReactNode } from 'react';
import { CircleAlert, Eye, EyeOff } from 'lucide-react';

type TextFieldProps = ComponentProps<'input'> & {
  label: string;
  error?: string;
  trailing?: ReactNode;
};

/** Filled field with the label inside, as in the M Bank design system (56px). */
export function TextField({ label, error, trailing, className, id: idProp, ...input }: TextFieldProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const errorId = `${id}-error`;
  return (
    <div className={`grid min-w-0 gap-1.5 ${className ?? ''}`}>
      <div
        className={`group relative flex h-14 items-center rounded-xl bg-field ring-1 transition focus-within:bg-page focus-within:ring-2 ${
          error ? 'ring-error focus-within:ring-error' : 'ring-transparent focus-within:ring-fg'
        }`}
      >
        <label htmlFor={id} className="pointer-events-none absolute top-2.5 left-4 text-xs text-fg-muted">
          {label}
        </label>
        <input
          id={id}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className="h-full w-full min-w-0 bg-transparent px-4 pt-5 text-[15px] text-fg outline-none placeholder:text-fg-faint"
          {...input}
        />
        {trailing ? <div className="flex shrink-0 items-center pr-2">{trailing}</div> : null}
      </div>
      {error ? (
        <p id={errorId} className="flex items-start gap-1.5 text-[13px] leading-snug text-error">
          <CircleAlert aria-hidden className="mt-px size-3.5 shrink-0" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function PasswordField(props: Omit<TextFieldProps, 'type' | 'trailing'>) {
  const [visible, setVisible] = useState(false);
  return (
    <TextField
      {...props}
      type={visible ? 'text' : 'password'}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Нууц үг нуух' : 'Нууц үг харах'}
          aria-pressed={visible}
          className="grid size-10 place-items-center rounded-lg text-fg-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-fg"
        >
          {visible ? <EyeOff className="size-5" /> : <Eye className="size-5" />}
        </button>
      }
    />
  );
}
