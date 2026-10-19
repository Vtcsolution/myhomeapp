import {
  documentStatusLabels,
  documentStatusTone,
  documentTypeLabels,
  type TechnicianDocument,
} from '@myhome/shared';
import { FileCheck2, FileText, Upload } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { ScreenHeader } from '@/components/ui/Headers';
import { Screen } from '@/components/ui/Screen';
import { SkeletonList } from '@/components/ui/Skeleton';
import { EmptyState, ErrorState } from '@/components/ui/StateViews';
import { Text } from '@/components/ui/Text';
import { useResubmitDocument, useTechnicianProfile } from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

/** The professional's documents and their (simulated) verification status. */
export default function DocumentsScreen() {
  const { t } = useLocale();
  const profile = useTechnicianProfile();
  const docs = profile.data?.documents ?? [];

  return (
    <Screen
      header={
        <ScreenHeader
          back
          fallbackHref="/pro/profile"
          title={t('documents.title')}
          subtitle={t('documents.subtitle')}
        />
      }
      refreshing={profile.isRefetching}
      onRefresh={() => void profile.refetch()}
    >
      <DemoNotice text={t('documents.demoNote')} />
      {profile.isPending ? (
        <SkeletonList count={4} height={90} />
      ) : profile.isError ? (
        <ErrorState onRetry={() => void profile.refetch()} />
      ) : docs.length === 0 ? (
        <EmptyState icon={FileText} title={t('documents.emptyTitle')} />
      ) : (
        <View style={styles.list}>
          {docs.map((doc) => (
            <DocumentCard key={doc.id} doc={doc} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function DocumentCard({ doc }: { doc: TechnicianDocument }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const resubmit = useResubmitDocument();
  const [busy, setBusy] = useState(false);
  const canResubmit = doc.status === 'expired' || doc.status === 'rejected';
  const Icon = doc.status === 'verified' ? FileCheck2 : FileText;

  return (
    <Card>
      <View style={styles.row}>
        <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
          <Icon size={18} color={colors.accent} strokeWidth={1.75} />
        </View>
        <View style={styles.flex}>
          <Text variant="bodyStrong">{f.text(documentTypeLabels[doc.type])}</Text>
          <Text variant="caption" tone="muted">
            {t('documents.submitted', { date: f.date(doc.uploadedAt, 'medium') })}
          </Text>
          {doc.expiresAt ? (
            <Text variant="caption" tone={doc.status === 'expired' ? 'danger' : 'secondary'}>
              {t('documents.validUntil', { date: f.date(doc.expiresAt, 'medium') })}
            </Text>
          ) : null}
        </View>
        <Badge
          label={f.text(documentStatusLabels[doc.status])}
          tone={documentStatusTone[doc.status]}
        />
      </View>
      {canResubmit ? (
        <Button
          label={t('documents.resubmit')}
          icon={Upload}
          variant="secondary"
          size="sm"
          loading={busy}
          style={styles.action}
          onPress={() => {
            setBusy(true);
            resubmit.mutate(doc.id, {
              onSuccess: () => show(t('documents.resubmitted'), 'success'),
              onError: (e) => show(errorMessage(e)),
              onSettled: () => setBusy(false),
            });
          }}
        />
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  list: { gap: space.md },
  row: { flexDirection: 'row', gap: space.md, alignItems: 'flex-start' },
  icon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  action: { alignSelf: 'flex-start', marginTop: space.md },
});
