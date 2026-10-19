import type { ServiceCategory } from '@myhome/shared';
import { ArrowDown, ArrowUp, Pencil } from 'lucide-react';
import { type FormEvent, useState } from 'react';
import { PageHeader } from '@/components/layout/AdminLayout';
import {
  Button,
  Card,
  ConfirmDialog,
  Dialog,
  ErrorState,
  Field,
  IconButton,
  Input,
  LoadingRows,
  Notice,
  Switch,
  Textarea,
} from '@/components/ui';
import { useCategories, useServices, useUpdateCategory } from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { mediaUrl } from '@/lib/media';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';

export function CategoriesPage() {
  const { t } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const categories = useCategories();
  const services = useServices();
  const update = useUpdateCategory();
  const [editing, setEditing] = useState<ServiceCategory | null>(null);
  const [hiding, setHiding] = useState<ServiceCategory | null>(null);
  const list = categories.data ?? [];

  const setVisible = (c: ServiceCategory, isActive: boolean) =>
    update.mutate(
      { id: c.id, patch: { isActive } },
      {
        onSuccess: () => {
          setHiding(null);
          show(isActive ? t('categories.shown') : t('categories.hidden'));
        },
        onError: (e) => show(errorMessage(e), 'error'),
      },
    );

  /** Swap display order with the neighbour (two updates through the API). */
  const move = async (index: number, delta: -1 | 1) => {
    const a = list[index];
    const b = list[index + delta];
    if (!a || !b) return;
    try {
      await update.mutateAsync({ id: a.id, patch: { sortOrder: b.sortOrder } });
      await update.mutateAsync({ id: b.id, patch: { sortOrder: a.sortOrder } });
      show(t('common.saved'));
    } catch (e) {
      show(errorMessage(e), 'error');
    }
  };

  return (
    <div className="page">
      <PageHeader
        title={t('categories.title')}
        subtitle={t('categories.subtitle')}
        crumbs={[{ label: t('nav.dashboard'), to: '/' }, { label: t('categories.title') }]}
      />
      <Card flush>
        {categories.isPending ? (
          <LoadingRows />
        ) : categories.isError ? (
          <ErrorState onRetry={() => void categories.refetch()} />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <caption className="visually-hidden">{t('categories.title')}</caption>
              <thead>
                <tr>
                  <th scope="col">{t('categories.order')}</th>
                  <th scope="col">{t('categories.name')}</th>
                  <th scope="col" className="end">
                    {t('categories.services')}
                  </th>
                  <th scope="col">{t('categories.visible')}</th>
                  <th scope="col" className="end">
                    <span className="visually-hidden">{t('common.edit')}</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {list.map((c, i) => (
                  <tr key={c.id}>
                    <td>
                      <div className="row" style={{ gap: 2 }}>
                        <IconButton
                          icon={ArrowUp}
                          label={`${t('categories.moveUp')}: ${f.text(c.name)}`}
                          disabled={i === 0 || update.isPending}
                          onClick={() => void move(i, -1)}
                        />
                        <IconButton
                          icon={ArrowDown}
                          label={`${t('categories.moveDown')}: ${f.text(c.name)}`}
                          disabled={i === list.length - 1 || update.isPending}
                          onClick={() => void move(i, 1)}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="row">
                        <img className="thumb" src={mediaUrl(c.image)} alt="" />
                        <div style={{ minWidth: 0 }}>
                          <div className="cell-main">{f.text(c.name)}</div>
                          <div className="cell-sub cell-wrap" style={{ maxWidth: 420 }}>
                            {f.text(c.description)}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="end num">
                      {(services.data ?? []).filter((s) => s.categoryId === c.id).length}
                    </td>
                    <td>
                      <Switch
                        checked={c.isActive}
                        label={`${t('categories.visibleToCustomers')}: ${f.text(c.name)}`}
                        disabled={update.isPending}
                        onChange={(on) => (on ? setVisible(c, true) : setHiding(c))}
                      />
                    </td>
                    <td className="end">
                      <Button size="sm" icon={Pencil} onClick={() => setEditing(c)}>
                        {t('common.edit')}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing ? <CategoryDialog category={editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={hiding !== null}
        title={hiding ? `${t('categories.hidden')}?` : ''}
        body={hiding ? f.text(hiding.name) : undefined}
        confirmLabel={t('common.confirm')}
        destructive
        loading={update.isPending}
        onCancel={() => setHiding(null)}
        onConfirm={() => hiding && setVisible(hiding, false)}
      />
    </div>
  );
}

function CategoryDialog({ category, onClose }: { category: ServiceCategory; onClose: () => void }) {
  const { t } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const update = useUpdateCategory();
  const [name, setName] = useState(category.name);
  const [description, setDescription] = useState(category.description);
  const [error, setError] = useState<string | null>(null);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    update.mutate(
      { id: category.id, patch: { name, description } },
      {
        onSuccess: () => {
          show(t('common.saved'));
          onClose();
        },
        onError: (e) => setError(errorMessage(e)),
      },
    );
  };

  return (
    <Dialog
      open
      wide
      title={t('categories.editTitle', { name: f.text(category.name) })}
      onClose={onClose}
    >
      <form className="stack" onSubmit={submit}>
        <div className="grid grid--2">
          <Field label={t('categories.nameEn')}>
            {(p) => (
              <Input
                {...p}
                className="input ltr"
                value={name.en}
                onChange={(e) => setName({ ...name, en: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('categories.nameAr')}>
            {(p) => (
              <Input
                {...p}
                dir="rtl"
                value={name.ar}
                onChange={(e) => setName({ ...name, ar: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('categories.descriptionEn')}>
            {(p) => (
              <Textarea
                {...p}
                className="textarea ltr"
                value={description.en}
                onChange={(e) => setDescription({ ...description, en: e.target.value })}
              />
            )}
          </Field>
          <Field label={t('categories.descriptionAr')}>
            {(p) => (
              <Textarea
                {...p}
                dir="rtl"
                value={description.ar}
                onChange={(e) => setDescription({ ...description, ar: e.target.value })}
              />
            )}
          </Field>
        </div>
        {error ? <Notice tone="danger">{error}</Notice> : null}
        <div className="dialog__actions">
          <Button variant="ghost" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" loading={update.isPending}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
