import { brand, isApiError } from '@myhome/shared';
import { DEMO_ACCOUNTS } from '@myhome/shared/mock';
import { FlaskConical, Languages, LogIn } from 'lucide-react';
import { type FormEvent, useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { Button, Field, IconButton, Input, Notice } from '@/components/ui';
import { useLocale } from '@/providers/LocaleProvider';
import { useSession } from '@/providers/SessionProvider';

/** Demo-only sign-in. Credentials come from the shared demo accounts and are prefilled. */
export function LoginPage() {
  const { t, locale, setLocale, brandName } = useLocale();
  const { session, signIn } = useSession();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? '/';
  const [email, setEmail] = useState<string>(DEMO_ACCOUNTS.adminEmail);
  const [password, setPassword] = useState<string>(DEMO_ACCOUNTS.adminPassword);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = `${t('login.title')} · ${brandName}`;
  }, [t, brandName]);

  if (session) return <Navigate to={from} replace />;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await signIn(email, password);
      navigate(from, { replace: true });
    } catch (e) {
      setError(
        isApiError(e) && e.code === 'UNAUTHORIZED' ? t('login.invalid') : t('common.actionFailed'),
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login">
      <section className="login__brand">
        <div className="row">
          <span className="monogram" aria-hidden>
            {brand.monogram}
          </span>
          <span className="sidebar__brand-name">{brandName}</span>
        </div>
        <div className="stack" style={{ gap: 16, maxWidth: 520 }}>
          <span className="overline" style={{ color: 'var(--champagne)' }}>
            {t('nav.console')}
          </span>
          <h1
            className="display"
            style={{ fontSize: 'clamp(28px, 4vw, 44px)', lineHeight: 1.12, margin: 0 }}
          >
            {t('login.heroTitle')}
          </h1>
          <p style={{ color: 'rgba(251,248,243,0.72)', margin: 0, fontSize: 15 }}>
            {t('login.heroBody')}
          </p>
        </div>
        <span className="small" style={{ color: 'rgba(251,248,243,0.5)' }}>
          {brand.legalName}
        </span>
      </section>
      <section className="login__panel">
        <form className="login__form" onSubmit={submit} noValidate>
          <div className="row row--between">
            <h2 className="h1 display">{t('login.title')}</h2>
            <IconButton
              icon={Languages}
              label={`${t('topbar.language')}: ${locale === 'en' ? t('common.arabic') : t('common.english')}`}
              onClick={() => setLocale(locale === 'en' ? 'ar' : 'en')}
            />
          </div>
          <p className="secondary" style={{ margin: 0 }}>
            {t('login.subtitle')}
          </p>
          <Notice icon={FlaskConical}>{t('login.demoNote')}</Notice>
          <Field label={t('login.email')}>
            {(props) => (
              <Input
                {...props}
                type="email"
                autoComplete="username"
                className="input ltr"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            )}
          </Field>
          <Field label={t('login.password')} error={error}>
            {(props) => (
              <Input
                {...props}
                type="password"
                autoComplete="current-password"
                className="input ltr"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            )}
          </Field>
          <Button type="submit" variant="primary" icon={LogIn} loading={busy} block>
            {t('login.signIn')}
          </Button>
        </form>
      </section>
    </div>
  );
}
