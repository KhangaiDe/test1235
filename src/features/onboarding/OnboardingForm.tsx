'use client';

import { useId, type ComponentProps } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { onboardingSchema, type OnboardingValues } from './schema';
import { DEMO_FAILING_REGISTER } from './api';

export interface OnboardingFormProps {
  /** Resolve with `null` on success, or an error message to show above the form. */
  onSubmit: (values: OnboardingValues) => Promise<string | null>;
}

export function OnboardingForm({ onSubmit }: OnboardingFormProps) {
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<OnboardingValues>({
    resolver: zodResolver(onboardingSchema),
    mode: 'onTouched',
    defaultValues: { registerNumber: '', email: '', phone: '', acceptTerms: false },
  });

  const submit = handleSubmit(async (values) => {
    const message = await onSubmit(values);
    if (message) setError('root.server', { message });
  });

  return (
    <form onSubmit={submit} noValidate className="grid gap-4">
      {errors.root?.server ? (
        <p role="alert" className="rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm leading-snug text-ink">
          {errors.root.server.message}
        </p>
      ) : null}

      <Field
        label="Регистрийн дугаар"
        error={errors.registerNumber?.message}
        inputMode="numeric"
        autoComplete="off"
        maxLength={7}
        placeholder="1234567"
        {...register('registerNumber')}
      />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label="Ажлын имэйл"
          error={errors.email?.message}
          type="email"
          autoComplete="email"
          placeholder="ner@company.mn"
          {...register('email')}
        />
        <Field
          label="Утасны дугаар"
          error={errors.phone?.message}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          maxLength={8}
          placeholder="99112233"
          {...register('phone')}
        />
      </div>

      <div className="grid gap-1.5">
        <label className="flex cursor-pointer items-start gap-3 text-sm leading-snug text-ink">
          <input
            type="checkbox"
            className="mt-0.5 size-[18px] shrink-0 cursor-pointer accent-brand"
            aria-invalid={errors.acceptTerms ? true : undefined}
            aria-describedby={errors.acceptTerms ? 'acceptTerms-error' : undefined}
            {...register('acceptTerms')}
          />
          Үйлчилгээний нөхцөлийг зөвшөөрч байна
        </label>
        {errors.acceptTerms ? (
          <p id="acceptTerms-error" className="text-[13px] text-danger">
            {errors.acceptTerms.message}
          </p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-1 inline-flex h-12 items-center justify-center gap-2 rounded-full bg-brand px-6 text-[15px] font-semibold text-on-brand transition hover:-translate-y-px hover:shadow-[0_8px_28px_-10px_var(--color-brand)] focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-brand disabled:cursor-wait disabled:opacity-70 sm:justify-self-start"
      >
        M corporate нээх
        <svg viewBox="0 0 16 16" fill="none" aria-hidden className="size-4">
          <path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <p className="text-xs leading-relaxed text-muted">
        Туршилтын хувилбар: алдааны урсгалыг үзэх бол регистрт {DEMO_FAILING_REGISTER} оруулна уу.
      </p>
    </form>
  );
}

type FieldProps = ComponentProps<'input'> & { label: string; error?: string };

function Field({ label, error, ...input }: FieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  return (
    <div className="grid min-w-0 gap-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-muted">
        {label}
      </label>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? errorId : undefined}
        className="h-12 w-full rounded-xl border border-line bg-stage/80 px-4 text-[15px] text-ink tabular-nums placeholder:text-muted/50 transition outline-none focus:border-brand focus:ring-3 focus:ring-brand/20 aria-invalid:border-danger"
        {...input}
      />
      {error ? (
        <p id={errorId} className="text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
