'use client';

import { useEffect, useState, type Ref } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check, Info, LoaderCircle } from 'lucide-react';
import { PasswordField, TextField } from '@/components/ui/TextField';
import { readRememberedUser } from '@/features/auth/session';
import { loginSchema, type LoginValues } from './schema';
import { DemoAccounts } from './DemoAccounts';

type Tab = 'org' | 'msign';

export interface LoginFormProps {
  /** Resolve with `null` on success, or an error message to show above the fields. */
  onSubmit: (values: LoginValues) => Promise<string | null>;
  submitRef?: Ref<HTMLButtonElement>;
  /** Keeps the button in its loading state after a successful sign-in while the page moves on. */
  busy?: boolean;
}

export function LoginForm({ onSubmit, submitRef, busy = false }: LoginFormProps) {
  const [tab, setTab] = useState<Tab>('org');
  const [showHelp, setShowHelp] = useState(false);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    clearErrors,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
    defaultValues: { username: '', password: '', remember: false },
  });

  useEffect(() => {
    const remembered = readRememberedUser();
    if (remembered) {
      setValue('username', remembered);
      setValue('remember', true);
    }
  }, [setValue]);

  const submit = handleSubmit(async (values) => {
    const message = await onSubmit(values);
    if (message) setError('root.server', { message });
  });

  const loading = isSubmitting || busy;

  return (
    <div className="grid gap-6">
      <h1 className="text-[28px] leading-tight font-semibold tracking-tight">Нэвтрэх</h1>

      <div role="tablist" aria-label="Нэвтрэх төрөл" className="grid grid-cols-2 gap-1 rounded-xl bg-field p-1">
        {(
          [
            ['org', 'Байгууллага'],
            ['msign', 'M Sign'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            role="tab"
            type="button"
            id={`tab-${key}`}
            aria-selected={tab === key}
            aria-controls={`panel-${key}`}
            onClick={() => setTab(key)}
            className={`h-10 rounded-[10px] text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-fg ${
              tab === key ? 'bg-page text-fg shadow-[0_1px_3px_rgba(13,15,18,0.12)]' : 'text-fg-muted hover:text-fg'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'org' ? (
        <form id="panel-org" role="tabpanel" aria-labelledby="tab-org" onSubmit={submit} noValidate className="grid gap-4">
          {errors.root?.server ? (
            <p role="alert" className="rounded-xl bg-error-bg px-4 py-3 text-sm leading-snug text-error">
              {errors.root.server.message}
            </p>
          ) : null}

          <TextField
            label="Нэвтрэх нэр"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            error={errors.username?.message}
            {...register('username')}
          />
          <PasswordField
            label="Нууц үг"
            autoComplete="current-password"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-1">
            <label className="flex cursor-pointer items-center gap-2.5 text-sm">
              <span className="relative grid size-5 place-items-center">
                <input type="checkbox" className="peer size-5 cursor-pointer appearance-none rounded-md border border-hairline bg-page checked:border-brand checked:bg-brand focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-fg" {...register('remember')} />
                <Check aria-hidden className="pointer-events-none absolute size-3.5 stroke-[3] text-page opacity-0 peer-checked:opacity-100" />
              </span>
              Сануулах
            </label>
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              aria-expanded={showHelp}
              className="text-sm text-fg-muted underline-offset-4 hover:text-fg hover:underline"
            >
              Нэвтрэх нэр, нууц үг мартсан?
            </button>
          </div>

          {showHelp ? (
            <p className="flex gap-2 rounded-xl bg-info-bg px-4 py-3 text-sm leading-snug text-fg">
              <Info aria-hidden className="mt-0.5 size-4 shrink-0 text-info" />
              Нэвтрэх нэр, нууц үгээ сэргээхийн тулд 1800-2929 дугаарт холбогдох эсвэл ойрын салбартаа хандана уу.
            </p>
          ) : null}

          <button
            ref={submitRef}
            type="submit"
            disabled={loading}
            className="mt-2 inline-flex h-14 items-center justify-center gap-2 rounded-xl bg-action text-[15px] font-semibold text-on-action transition hover:bg-fg/85 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-fg disabled:cursor-wait"
          >
            {loading ? <LoaderCircle aria-hidden className="size-5 animate-spin" /> : null}
            {loading ? 'Нэвтэрч байна' : 'Нэвтрэх'}
          </button>

          <p className="text-center text-sm text-fg-muted">
            Шинэ харилцагч уу?{' '}
            <a href="https://m-bank.mn/corporate" target="_blank" rel="noreferrer" className="font-semibold text-fg hover:underline">
              Бүртгүүлэх
            </a>
          </p>

          <DemoAccounts
            onPick={(username, password) => {
              setValue('username', username);
              setValue('password', password);
              clearErrors();
            }}
          />
        </form>
      ) : (
        <div id="panel-msign" role="tabpanel" aria-labelledby="tab-msign" className="grid gap-4 rounded-2xl border border-hairline p-5">
          <p className="font-semibold">M Sign-ээр нэвтрэх</p>
          <p className="text-sm leading-relaxed text-fg-muted">
            M Sign-ээр нэвтрэх нь энэ туршилтын хувилбарт идэвхгүй. Байгууллагын нэвтрэх нэр, нууц үгээрээ нэвтэрнэ үү.
          </p>
          <button
            type="button"
            onClick={() => setTab('org')}
            className="h-11 justify-self-start rounded-xl bg-field px-4 text-sm font-medium hover:bg-hairline"
          >
            Байгууллагаар нэвтрэх
          </button>
        </div>
      )}
    </div>
  );
}
