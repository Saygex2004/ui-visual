// Searchable single-select combobox (Execution Plan Phase 13) — the
// space-efficient selection pattern the redesign uses for clusters, regions
// and chat participants, replacing pill/chip rows and native selects where
// the option rows need rich content (dots, counts, avatars).
//
// Built on the shared Popover primitive. ARIA follows the WAI-ARIA combobox
// pattern: the trigger is a button with role="combobox"/aria-expanded, the
// panel holds an optional filter input and a role="listbox" of
// role="option" rows; keyboard support is ArrowUp/Down + Enter + Escape
// with aria-activedescendant tracking. Option rows are caller-composed
// (`label` ReactNode); `textValue` drives filtering and screen-reader
// naming stays the row's own text content.
import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from 'react';
import { ChevronDown } from 'lucide-react';
import { PopoverContent, PopoverRoot, PopoverTrigger } from './Popover';
import './searchSelect.css';

export interface SearchSelectOption {
  id: string;
  label: ReactNode;
  textValue: string;
  selected?: boolean;
}

export interface SearchSelectProps {
  trigger: ReactNode;
  onSelect: (id: string) => void;
  options: SearchSelectOption[];
  /** Rendered after a separator, exempt from filtering (e.g. Archivio). */
  pinned?: SearchSelectOption[];
  emptyMessage: string;
  searchable?: boolean;
  searchPlaceholder?: string;
  searchLabel?: string;
  triggerAriaLabel?: string;
  triggerClassName?: string;
  contentClassName?: string;
  /** Size the panel to the trigger (default true — selector-toolbar use). */
  matchTriggerWidth?: boolean;
}

export function SearchSelect({
  trigger,
  onSelect,
  options,
  pinned,
  emptyMessage,
  searchable = true,
  searchPlaceholder,
  searchLabel,
  triggerAriaLabel,
  triggerClassName,
  contentClassName,
  matchTriggerWidth = true,
}: SearchSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const listboxId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((o) => o.textValue.toLowerCase().includes(q));
  }, [options, query]);
  const visible = useMemo(() => [...filtered, ...(pinned ?? [])], [filtered, pinned]);

  const visibleRef = useRef(visible);
  visibleRef.current = visible;
  useEffect(() => {
    // Reset the active row on open and whenever the filter changes; reads
    // the option list through a ref so option-array identity churn from
    // parent re-renders doesn't clobber keyboard position.
    if (!open) return;
    const selectedIdx = visibleRef.current.findIndex((o) => o.selected);
    setActiveIndex(selectedIdx >= 0 ? selectedIdx : 0);
  }, [open, query]);

  const pick = (id: string) => {
    onSelect(id);
    setOpen(false);
    setQuery('');
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (visible.length === 0) return;
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const next = (activeIndex + delta + visible.length) % visible.length;
      setActiveIndex(next);
      listRef.current
        ?.querySelector(`[data-index="${next}"]`)
        ?.scrollIntoView({ block: 'nearest' });
    } else if (event.key === 'Enter') {
      event.preventDefault();
      const active = visible[activeIndex];
      if (active) pick(active.id);
    }
  };

  const renderOption = (option: SearchSelectOption, index: number) => (
    <div
      key={option.id}
      id={`${listboxId}-${index}`}
      data-index={index}
      role="option"
      aria-selected={option.selected ?? false}
      className={[
        'ui-search-select-option',
        option.selected ? 'ui-search-select-option-selected' : '',
        index === activeIndex ? 'ui-search-select-option-active' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      onClick={() => pick(option.id)}
      onMouseMove={() => setActiveIndex(index)}
    >
      {option.label}
    </div>
  );

  return (
    <PopoverRoot
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery('');
      }}
    >
      <PopoverTrigger
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={open ? listboxId : undefined}
        aria-label={triggerAriaLabel}
        className={
          triggerClassName
            ? `ui-search-select-trigger ${triggerClassName}`
            : 'ui-search-select-trigger'
        }
      >
        {trigger}
        <ChevronDown aria-hidden="true" size={14} className="ui-search-select-chevron" />
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className={[matchTriggerWidth ? 'ui-search-select-panel-match' : '', contentClassName ?? '']
          .filter(Boolean)
          .join(' ')}
        onOpenAutoFocus={(event) => {
          if (searchable) {
            event.preventDefault();
            inputRef.current?.focus();
          }
        }}
      >
        {searchable ? (
          <input
            ref={inputRef}
            type="text"
            className="ui-search-select-input"
            value={query}
            placeholder={searchPlaceholder}
            aria-label={searchLabel ?? searchPlaceholder}
            aria-controls={listboxId}
            aria-activedescendant={visible[activeIndex] ? `${listboxId}-${activeIndex}` : undefined}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
          />
        ) : null}
        <div
          ref={listRef}
          id={listboxId}
          role="listbox"
          className="ui-search-select-list"
          tabIndex={searchable ? -1 : 0}
          aria-activedescendant={
            !searchable && visible[activeIndex] ? `${listboxId}-${activeIndex}` : undefined
          }
          onKeyDown={searchable ? undefined : onKeyDown}
        >
          {filtered.map((option, index) => renderOption(option, index))}
          {filtered.length === 0 ? (
            <div className="ui-search-select-empty">{emptyMessage}</div>
          ) : null}
          {pinned && pinned.length > 0 ? (
            <>
              <div className="ui-search-select-separator" role="presentation" />
              {pinned.map((option, index) => renderOption(option, filtered.length + index))}
            </>
          ) : null}
        </div>
      </PopoverContent>
    </PopoverRoot>
  );
}
