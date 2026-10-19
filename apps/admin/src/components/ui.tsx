/**
 * Dashboard building blocks. Styling lives in styles/global.css; components
 * keep markup semantic and keyboard accessible.
 */
import {
  type BookingStatus,
  bookingStatusLabels,
  bookingStatusTone,
  isLiveStatus,
  type StatusTone,
} from '@myhome/shared';
import { CircleAlert, FlaskConical, Inbox, type LucideIcon, X } from 'lucide-react';
import {
  type ButtonHTMLAttributes,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  useEffect,
  useId,
  useRef,
} from 'react';
import { createPortal } from 'react-dom';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';

// ─── Buttons ────────────────────────────────────────────────────────────────

type ButtonVariant = 'primary' | 'accent' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'secondary',
  size,
  icon: Icon,
  loading,
  block,
  children,
  className,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: 'sm';
  icon?: LucideIcon;
  loading?: boolean;
  block?: boolean;
}) {
  const classes = [
    'btn',
    `btn--${variant}`,
    size === 'sm' && 'btn--sm',
    block && 'btn--block',
    className,
  ]
    .filter(Boolean)
    .join(' ');
  return (
    <button
      type="button"
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading ? (
        <span className="spinner" aria-hidden />
      ) : Icon ? (
        <Icon size={16} aria-hidden />
      ) : null}
      {children}
    </button>
  );
}

export function IconButton({
  icon: Icon,
  label,
  badge,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { icon: LucideIcon; label: string; badge?: number }) {
  return (
    <button type="button" className="icon-btn" aria-label={label} title={label} {...rest}>
      <Icon size={18} aria-hidden />
      {badge ? (
        <span className="icon-btn__badge" aria-hidden>
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </button>
  );
}

// ─── Status ─────────────────────────────────────────────────────────────────

export function Badge({
  tone = 'neutral',
  dot,
  children,
}: {
  tone?: StatusTone;
  dot?: boolean;
  children: ReactNode;
}) {
  return (
    <span className={`badge${tone === 'neutral' ? '' : ` badge--${tone}`}`}>
      {dot ? <span className="badge__dot" aria-hidden /> : null}
      {children}
    </span>
  );
}

export function BookingStatusBadge({ status }: { status: BookingStatus }) {
  const f = useFormat();
  return (
    <Badge tone={bookingStatusTone[status]} dot={isLiveStatus(status)}>
      {f.text(bookingStatusLabels[status])}
    </Badge>
  );
}

export function DemoTag({ children }: { children?: ReactNode }) {
  const { t } = useLocale();
  return (
    <span className="demo-tag">
      <FlaskConical size={11} aria-hidden />
      {children ?? t('common.demoFigures')}
    </span>
  );
}

export function Notice({
  tone = 'info',
  icon: Icon = FlaskConical,
  children,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  icon?: LucideIcon;
  children: ReactNode;
}) {
  return (
    <div className={`notice${tone === 'info' ? '' : ` notice--${tone}`}`} role="note">
      <Icon size={16} aria-hidden style={{ flex: 'none', marginTop: 2 }} />
      <div>{children}</div>
    </div>
  );
}

// ─── Surfaces ───────────────────────────────────────────────────────────────

export function Card({
  title,
  actions,
  flush,
  tone,
  children,
  className,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  flush?: boolean;
  tone?: 'midnight';
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={[
        'card',
        flush && 'card--flush',
        tone === 'midnight' && 'card--midnight',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {title || actions ? (
        <div className="card__head">
          {typeof title === 'string' ? <h2 className="h2">{title}</h2> : <div>{title}</div>}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Avatar({ name, large }: { name: string; large?: boolean }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('');
  return (
    <span className={`avatar${large ? ' avatar--lg' : ''}`} aria-hidden>
      {initials}
    </span>
  );
}

export function KeyValues({ items }: { items: [label: ReactNode, value: ReactNode][] }) {
  return (
    <dl className="kv">
      {items.map(([label, value], i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ─── Form fields ────────────────────────────────────────────────────────────

export function Field({
  label,
  hint,
  error,
  children,
  className,
}: {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | null;
  children: (props: {
    id: string;
    'aria-invalid'?: boolean;
    'aria-describedby'?: string;
  }) => ReactNode;
  className?: string;
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      <label className="field__label" htmlFor={id}>
        {label}
      </label>
      {children({
        id,
        ...(error ? { 'aria-invalid': true } : {}),
        ...(describedBy ? { 'aria-describedby': describedBy } : {}),
      })}
      {error ? (
        <span id={`${id}-error`} className="field__error">
          {error}
        </span>
      ) : hint ? (
        <span id={`${id}-hint`} className="field__hint">
          {hint}
        </span>
      ) : null}
    </div>
  );
}

export const Input = (props: InputHTMLAttributes<HTMLInputElement>) => (
  <input className="input" {...props} />
);
export const Select = (props: SelectHTMLAttributes<HTMLSelectElement>) => (
  <select className="select" {...props} />
);
export const Textarea = (props: TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className="textarea" {...props} />
);

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      className="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
    />
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  label,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  label: string;
}) {
  return (
    <div className="segmented" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ─── States ─────────────────────────────────────────────────────────────────

export function Skeleton({
  height = 16,
  width = '100%',
}: {
  height?: number;
  width?: number | string;
}) {
  return <div className="skeleton" style={{ height, width }} aria-hidden />;
}

export function LoadingRows({ rows = 5 }: { rows?: number }) {
  const { t } = useLocale();
  return (
    <div className="stack" style={{ padding: 20 }} role="status" aria-label={t('common.loading')}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} height={22} />
      ))}
    </div>
  );
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  body,
  action,
}: {
  icon?: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}) {
  return (
    <div className="empty">
      <div className="empty__icon">
        <Icon size={22} aria-hidden />
      </div>
      <div className="empty__title">{title}</div>
      {body ? <div>{body}</div> : null}
      {action}
    </div>
  );
}

export function ErrorState({ onRetry }: { onRetry: () => void }) {
  const { t } = useLocale();
  return (
    <EmptyState
      icon={CircleAlert}
      title={t('common.somethingWrong')}
      body={t('common.errorBody')}
      action={
        <Button variant="secondary" onClick={onRetry}>
          {t('common.retry')}
        </Button>
      }
    />
  );
}

// ─── Dialogs ────────────────────────────────────────────────────────────────

/** Modal dialog: focus moves in, Escape closes, focus returns to the trigger. */
export function Dialog({
  open,
  title,
  onClose,
  children,
  wide,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const { t } = useLocale();
  const ref = useRef<HTMLDivElement>(null);
  const titleId = useId();
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const node = ref.current;
    const focusable = () =>
      node
        ? [
            ...node.querySelectorAll<HTMLElement>(
              'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
            ),
          ].filter((el) => !el.hasAttribute('disabled'))
        : [];
    (focusable()[1] ?? focusable()[0])?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'Tab') {
        const items = focusable();
        const first = items[0];
        const last = items[items.length - 1];
        if (!first || !last) return;
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="overlay" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        ref={ref}
        className={`dialog${wide ? ' dialog--wide' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        <div className="row row--between">
          <h2 id={titleId} className="h2 display" style={{ fontSize: 20 }}>
            {title}
          </h2>
          <IconButton icon={X} label={t('common.close')} onClick={onClose} />
        </div>
        {children}
      </div>
    </div>,
    document.body,
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  destructive,
  loading,
  onConfirm,
  onCancel,
  children,
}: {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const { t } = useLocale();
  return (
    <Dialog open={open} title={title} onClose={onCancel}>
      {body ? (
        <p className="secondary" style={{ margin: 0 }}>
          {body}
        </p>
      ) : null}
      {children}
      <div className="dialog__actions">
        <Button variant="ghost" onClick={onCancel}>
          {t('common.cancel')}
        </Button>
        <Button variant={destructive ? 'danger' : 'primary'} loading={loading} onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Dialog>
  );
}
