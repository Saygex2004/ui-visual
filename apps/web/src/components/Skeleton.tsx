// Shimmer skeleton primitive (Execution Plan Phase 13): loading
// placeholders that mirror the shape of the content they stand in for
// (design.md motion stance — `pvp-shimmer`). `SkeletonRows` is the table
// variant used while a snapshot loads.
import './skeleton.css';

export function Skeleton({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={className ? `ui-skeleton ${className}` : 'ui-skeleton'} />
  );
}

export interface SkeletonRowsProps {
  rows?: number;
  label: string;
}

export function SkeletonRows({ rows = 6, label }: SkeletonRowsProps) {
  return (
    <div role="status" aria-label={label} className="ui-skeleton-rows">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="ui-skeleton-row">
          <Skeleton className="ui-skeleton-cell-sm" />
          <Skeleton className="ui-skeleton-cell-fill" />
          <Skeleton className="ui-skeleton-cell-md" />
          <Skeleton className="ui-skeleton-cell-action" />
        </div>
      ))}
    </div>
  );
}
