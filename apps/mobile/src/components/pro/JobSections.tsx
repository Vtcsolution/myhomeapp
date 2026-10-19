import { isApiError, type JobView, type MediaKey, parseKwdToFils } from '@myhome/shared';
import { Camera, CirclePlus, NotebookPen, Receipt } from 'lucide-react-native';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DemoNotice } from '@/components/ui/DemoNotice';
import { Photo } from '@/components/ui/Photo';
import { PressableScale } from '@/components/ui/Pressable';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Sheet } from '@/components/ui/Sheet';
import { Text } from '@/components/ui/Text';
import { TextField } from '@/components/ui/TextField';
import {
  useAddExtraCharge,
  useAddWorkNote,
  useAddWorkPhoto,
  useCategory,
  useCategoryServices,
} from '@/data/queries';
import { useErrorMessage } from '@/hooks/useErrorMessage';
import { useFormat } from '@/hooks/useFormat';
import { useLocale } from '@/providers/LocaleProvider';
import { useToast } from '@/providers/ToastProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { radius, space } from '@/theme/tokens';

const EXTRA_MIN = 500;
const EXTRA_MAX = 2_000_000;

function SectionTitle({ icon: Icon, title }: { icon: typeof Receipt; title: string }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionTitle}>
      <Icon size={18} color={colors.accent} strokeWidth={1.75} />
      <Text variant="title3" accessibilityRole="header">
        {title}
      </Text>
    </View>
  );
}

/** Extra work quoted on site; the customer approves each charge in their app. */
export function ExtraChargesSection({ job }: { job: JobView }) {
  const { t } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const add = useAddExtraCharge();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [tried, setTried] = useState(false);
  const canAdd = job.status === 'arrived' || job.status === 'in_progress';
  const fils = parseKwdToFils(amount);
  const valid =
    description.trim().length >= 3 &&
    description.trim().length <= 120 &&
    fils !== null &&
    fils >= EXTRA_MIN &&
    fils <= EXTRA_MAX;

  if (!canAdd && job.extraCharges.length === 0) return null;

  const send = () => {
    setTried(true);
    if (!valid || fils === null) return;
    add.mutate(
      { id: job.id, description: description.trim(), amount: fils },
      {
        onSuccess: () => {
          show(t('job.extraSent'), 'success');
          setOpen(false);
          setDescription('');
          setAmount('');
          setTried(false);
        },
        onError: (e) => show(errorMessage(e)),
      },
    );
  };

  return (
    <Card>
      <SectionTitle icon={Receipt} title={t('job.extraTitle')} />
      <View style={styles.list}>
        {job.extraCharges.map((charge) => (
          <View key={charge.id} style={styles.extra}>
            <View style={styles.flex}>
              <Text variant="bodyStrong" natural>
                {charge.description}
              </Text>
              <Text variant="caption" tone="muted">
                {f.money(charge.amount)}
              </Text>
            </View>
            <Badge
              label={
                charge.status === 'pending_approval'
                  ? t('job.awaiting')
                  : t(
                      charge.status === 'approved'
                        ? 'booking.extraApproved'
                        : 'booking.extraDeclined',
                    )
              }
              tone={
                charge.status === 'pending_approval'
                  ? 'warning'
                  : charge.status === 'approved'
                    ? 'success'
                    : 'neutral'
              }
            />
          </View>
        ))}
      </View>
      {canAdd ? (
        <Button
          label={t('job.extraAdd')}
          icon={CirclePlus}
          variant="secondary"
          size="sm"
          style={styles.sectionAction}
          onPress={() => setOpen(true)}
        />
      ) : null}
      <Sheet
        visible={open}
        title={t('job.extraSheet')}
        onClose={() => setOpen(false)}
        footer={
          <Button label={t('job.extraSend')} fullWidth loading={add.isPending} onPress={send} />
        }
      >
        <View style={styles.sheet}>
          <TextField
            label={t('job.extraDescription')}
            placeholder={t('job.extraDescriptionPlaceholder')}
            value={description}
            onChangeText={setDescription}
            maxLength={120}
          />
          <TextField
            label={t('job.extraAmount')}
            hint={t('job.extraAmountHint')}
            value={amount}
            onChangeText={setAmount}
            keyboardType="decimal-pad"
            ltr
            placeholder="0.000"
            error={tried && !valid ? t('job.extraInvalid') : undefined}
          />
        </View>
      </Sheet>
    </Card>
  );
}

/** Notes the professional records during the job (visible to the customer). */
export function WorkNotesSection({ job }: { job: JobView }) {
  const { t } = useLocale();
  const f = useFormat();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const add = useAddWorkNote();
  const [text, setText] = useState('');
  const [tried, setTried] = useState(false);
  const canAdd = ['on_the_way', 'arrived', 'in_progress', 'completed'].includes(job.status);
  const notes = job.workNotes ?? [];
  const valid = text.trim().length >= 3 && text.trim().length <= 500;

  if (job.status === 'pending' || job.status === 'cancelled') return null;

  return (
    <Card>
      <SectionTitle icon={NotebookPen} title={t('job.notes')} />
      <View style={styles.list}>
        {notes.length === 0 ? (
          <Text variant="callout" tone="muted">
            {canAdd ? t('job.noNotes') : t('job.notesLocked')}
          </Text>
        ) : (
          notes.map((note) => (
            <View key={note.id} style={styles.note}>
              <Text variant="callout" natural>
                {note.text}
              </Text>
              <Text variant="caption" tone="muted">
                {f.date(note.createdAt, 'dayMonth')} · {f.time(note.createdAt)}
              </Text>
            </View>
          ))
        )}
      </View>
      {canAdd ? (
        <View style={styles.noteForm}>
          <TextField
            label={t('job.notes')}
            placeholder={t('job.notePlaceholder')}
            value={text}
            onChangeText={setText}
            multiline
            maxLength={500}
            error={tried && !valid ? t('job.noteInvalid') : undefined}
          />
          <Button
            label={t('job.noteAdd')}
            size="sm"
            variant="secondary"
            loading={add.isPending}
            style={styles.sectionAction}
            onPress={() => {
              setTried(true);
              if (!valid) return;
              add.mutate(
                { id: job.id, text: text.trim() },
                {
                  onSuccess: () => {
                    show(t('job.noteAdded'), 'success');
                    setText('');
                    setTried(false);
                  },
                  onError: (e) => show(errorMessage(e)),
                },
              );
            }}
          />
        </View>
      ) : null}
    </Card>
  );
}

/** Before/after photos — chosen from bundled sample images in this demo. */
export function WorkPhotosSection({ job }: { job: JobView }) {
  const { t } = useLocale();
  const { colors } = useTheme();
  const { show } = useToast();
  const errorMessage = useErrorMessage();
  const add = useAddWorkPhoto();
  const services = useCategoryServices(job.category.id);
  const category = useCategory(job.category.id);
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<'before' | 'after'>(
    job.status === 'in_progress' ? 'after' : 'before',
  );
  const canAdd = ['arrived', 'in_progress', 'completed'].includes(job.status);
  const photos = job.workPhotos ?? [];
  const samples: MediaKey[] = [
    ...new Set([
      ...(category.data ? [category.data.image] : []),
      ...(services.data ?? []).map((s) => s.image),
    ]),
  ].slice(0, 6);

  if (job.status === 'pending' || job.status === 'cancelled') return null;

  return (
    <Card>
      <SectionTitle icon={Camera} title={t('job.photos')} />
      <View style={styles.grid}>
        {photos.length === 0 ? (
          <Text variant="callout" tone="muted">
            {canAdd ? t('job.noPhotos') : t('job.photosLocked')}
          </Text>
        ) : (
          photos.map((p) => (
            <View key={p.id} style={styles.thumbWrap}>
              <Photo media={p.media} style={styles.thumb} />
              <View style={[styles.stage, { backgroundColor: colors.midnight }]}>
                <Text variant="captionStrong" style={{ color: colors.champagne }}>
                  {t(p.stage === 'before' ? 'job.before' : 'job.after')}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
      {canAdd ? (
        <Button
          label={t('job.addPhoto')}
          icon={Camera}
          size="sm"
          variant="secondary"
          style={styles.sectionAction}
          onPress={() => setOpen(true)}
        />
      ) : null}
      <Sheet visible={open} title={t('job.photoSheet')} onClose={() => setOpen(false)}>
        <View style={styles.sheet}>
          <DemoNotice text={t('job.photosDemo')} />
          <SegmentedControl<'before' | 'after'>
            accessibilityLabel={t('job.photos')}
            value={stage}
            onChange={setStage}
            segments={[
              { value: 'before', label: t('job.before') },
              { value: 'after', label: t('job.after') },
            ]}
          />
          <View style={styles.grid}>
            {samples.map((media, index) => (
              <PressableScale
                key={media}
                accessibilityRole="button"
                accessibilityLabel={`${t('job.addPhoto')} ${index + 1}`}
                disabled={add.isPending}
                onPress={() =>
                  add.mutate(
                    { id: job.id, media, stage },
                    {
                      onSuccess: () => {
                        show(t('job.photoAdded'), 'success');
                        setOpen(false);
                      },
                      onError: (e) =>
                        show(isApiError(e) && e.code === 'CONFLICT' ? e.message : errorMessage(e)),
                    },
                  )
                }
              >
                <Photo media={media} style={styles.thumb} />
              </PressableScale>
            ))}
          </View>
        </View>
      </Sheet>
    </Card>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, gap: 2 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  sectionAction: { alignSelf: 'flex-start', marginTop: space.md },
  list: { gap: space.md, marginTop: space.md },
  extra: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  note: { gap: 2 },
  noteForm: { marginTop: space.md },
  sheet: { gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginTop: space.md },
  thumbWrap: { position: 'relative' },
  thumb: { width: 88, height: 88, borderRadius: radius.md },
  stage: {
    position: 'absolute',
    bottom: space.xs,
    start: space.xs,
    paddingHorizontal: space.xs,
    borderRadius: radius.sm,
  },
});
