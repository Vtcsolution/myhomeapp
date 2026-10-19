import { SearchX } from 'lucide-react';
import { Link } from 'react-router';
import { PageHeader } from '@/components/layout/AdminLayout';
import { Card, EmptyState } from '@/components/ui';
import { useLocale } from '@/providers/LocaleProvider';

export function NotFoundPage() {
  const { t } = useLocale();
  return (
    <div className="page">
      <PageHeader title={t('common.notFound')} />
      <Card>
        <EmptyState
          icon={SearchX}
          title={t('common.notFound')}
          body={t('common.notFoundBody')}
          action={
            <Link className="btn btn--secondary" to="/">
              {t('common.goToDashboard')}
            </Link>
          }
        />
      </Card>
    </div>
  );
}
