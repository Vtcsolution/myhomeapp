import type { ReviewStatus, ReviewView } from '@myhome/shared';
import { EyeOff, Flag, MessageSquareQuote, Send, Star } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import { Pagination } from '@/components/DataTable';
import { PageHeader } from '@/components/layout/AdminLayout';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  Field,
  LoadingRows,
  Notice,
  Select,
} from '@/components/ui';
import { useReviews, useSetReviewStatus } from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { readPreferences } from '@/services/preferences';

const STATUSES: ReviewStatus[] = ['published', 'flagged', 'hidden'];
const tone = { published: 'success', flagged: 'warning', hidden: 'neutral' } as const;

export function Stars({ rating }: { rating: number }) {
  const { t } = useLocale();
  return (
    <span className="stars" role="img" aria-label={t('common.stars', { count: rating })}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} aria-hidden className={i <= rating ? 'stars__on' : 'stars__off'} />
      ))}
    </span>
  );
}

export function ReviewsPage() {
  const { t } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const [params, setParams] = useSearchParams();
  const status = (STATUSES as string[]).includes(params.get('status') ?? '')
    ? (params.get('status') as ReviewStatus)
    : undefined;
  const maxRating = Number(params.get('rating')) || undefined;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const pageSize = readPreferences().pageSize;
  const reviews = useReviews({
    ...(status ? { status } : {}),
    ...(maxRating ? { maxRating } : {}),
    page,
    pageSize,
  });
  const moderate = useSetReviewStatus();
  const [hiding, setHiding] = useState<ReviewView | null>(null);

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setParams(next, { replace: true });
  };

  const apply = (review: ReviewView, next: ReviewStatus) =>
    moderate.mutate(
      { id: review.id, status: next },
      {
        onSuccess: () => {
          setHiding(null);
          show(t('reviews.moderated'));
        },
        onError: (e) => show(errorMessage(e), 'error'),
      },
    );

  return (
    <div className="page">
      <PageHeader
        title={t('reviews.title')}
        subtitle={t('reviews.subtitle')}
        crumbs={[{ label: t('nav.dashboard'), to: '/' }, { label: t('reviews.title') }]}
      />
      <Notice>{t('reviews.note')}</Notice>
      <Card>
        <div className="filters">
          <Field label={t('common.status')}>
            {(props) => (
              <Select
                {...props}
                value={status ?? ''}
                onChange={(e) => set('status', e.target.value)}
              >
                <option value="">{t('bookings.any')}</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {t(`reviews.${s}`)}
                  </option>
                ))}
              </Select>
            )}
          </Field>
          <Field label={t('reviews.rating')}>
            {(props) => (
              <Select
                {...props}
                value={maxRating ?? ''}
                onChange={(e) => set('rating', e.target.value)}
              >
                <option value="">{t('reviews.anyRating')}</option>
                {[1, 2, 3, 4].map((r) => (
                  <option key={r} value={r}>
                    {t('reviews.upTo', { count: r })}
                  </option>
                ))}
              </Select>
            )}
          </Field>
        </div>
      </Card>
      <Card flush>
        {reviews.isPending ? (
          <LoadingRows />
        ) : reviews.isError ? (
          <ErrorState onRetry={() => void reviews.refetch()} />
        ) : reviews.data.items.length === 0 ? (
          <EmptyState icon={MessageSquareQuote} title={t('reviews.emptyTitle')} />
        ) : (
          <>
            <ul className="list review-list">
              {reviews.data.items.map((r) => (
                <li key={r.id} className="review-item">
                  <div className="row row--between row--wrap">
                    <div className="row row--wrap" style={{ gap: 10 }}>
                      <Stars rating={r.rating} />
                      <Badge tone={tone[r.status]}>{t(`reviews.${r.status}`)}</Badge>
                      <span className="small muted">{f.date(r.createdAt, 'medium')}</span>
                    </div>
                    <div className="row" style={{ gap: 6 }}>
                      {r.status !== 'published' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Send}
                          disabled={moderate.isPending}
                          onClick={() => apply(r, 'published')}
                        >
                          {t('reviews.publish')}
                        </Button>
                      ) : null}
                      {r.status !== 'flagged' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={Flag}
                          disabled={moderate.isPending}
                          onClick={() => apply(r, 'flagged')}
                        >
                          {t('reviews.flag')}
                        </Button>
                      ) : null}
                      {r.status !== 'hidden' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="danger-text"
                          icon={EyeOff}
                          disabled={moderate.isPending}
                          onClick={() => setHiding(r)}
                        >
                          {t('reviews.hide')}
                        </Button>
                      ) : null}
                    </div>
                  </div>
                  <p className="review-item__comment" dir="auto">
                    {r.comment || <span className="muted">{t('reviews.noComment')}</span>}
                  </p>
                  <div className="small secondary row row--wrap" style={{ gap: 12 }}>
                    <span>
                      {t('reviews.customer')}:{' '}
                      <Link to={`/customers/${r.customerId}`}>{r.customerDisplayName}</Link>
                    </span>
                    <span>
                      {t('reviews.professional')}:{' '}
                      <Link to={`/technicians/${r.technicianId}`}>{f.text(r.technicianName)}</Link>
                    </span>
                    <span>
                      {t('reviews.service')}:{' '}
                      <Link to={`/bookings/${r.bookingId}`}>{f.text(r.serviceName)}</Link>
                    </span>
                  </div>
                </li>
              ))}
            </ul>
            <Pagination
              page={page}
              pageSize={pageSize}
              total={reviews.data.total}
              onPage={(p) => set('page', String(p))}
            />
          </>
        )}
      </Card>
      <ConfirmDialog
        open={hiding !== null}
        title={t('reviews.hideTitle')}
        body={t('reviews.hideBody')}
        confirmLabel={t('reviews.hide')}
        destructive
        loading={moderate.isPending}
        onCancel={() => setHiding(null)}
        onConfirm={() => hiding && apply(hiding, 'hidden')}
      />
    </div>
  );
}
