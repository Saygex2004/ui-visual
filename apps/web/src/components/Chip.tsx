// Removable active-filter chip (Execution Plan Phase 13): "key: value ×"
// pills under the filter toolbar. The × is a real button with its own
// accessible name so keyboard/AT users can clear a single filter.
import { X } from 'lucide-react';
import './chip.css';

export interface ChipProps {
  chipKey: string;
  value: string;
  removeLabel: string;
  onRemove: () => void;
}

export function Chip({ chipKey, value, removeLabel, onRemove }: ChipProps) {
  return (
    <span className="ui-chip">
      <span className="ui-chip-key">{chipKey}</span>
      <span className="ui-chip-value">{value}</span>
      <button type="button" className="ui-chip-remove" aria-label={removeLabel} onClick={onRemove}>
        <X aria-hidden="true" size={12} />
      </button>
    </span>
  );
}
