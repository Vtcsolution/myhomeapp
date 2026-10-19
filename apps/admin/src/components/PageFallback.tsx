import { Card, LoadingRows, Skeleton } from './ui';

/** Shown inside the layout while a screen's code loads (first visit only). */
export function PageFallback() {
  return (
    <div className="page" aria-busy="true">
      <div className="stack" style={{ gap: 10 }}>
        <Skeleton height={14} width={160} />
        <Skeleton height={32} width={280} />
      </div>
      <Card>
        <LoadingRows />
      </Card>
    </div>
  );
}
