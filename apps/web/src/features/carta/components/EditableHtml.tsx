import { forwardRef, useEffect, useRef, type CSSProperties } from 'react';

export interface EditableHtmlProps {
  value: string;
  onChange: (html: string) => void;
  className?: string;
  style?: CSSProperties;
  placeholder?: string;
}

/**
 * A contenteditable that syncs an outside value without moving the caret: it
 * rewrites innerHTML only when the value changed FROM OUTSIDE, never as a
 * result of the keystroke being typed. Without that guard every character
 * would send the cursor back to the start.
 *
 * Deliberately plain — no execCommand anywhere. The formatting commands live
 * in the editor, not here.
 */
export const EditableHtml = forwardRef<HTMLDivElement, EditableHtmlProps>(function EditableHtml(
  { value, onChange, className = '', style, placeholder },
  ref,
) {
  const innerRef = useRef<HTMLDivElement | null>(null);
  const isTyping = useRef(false);

  const setRefs = (el: HTMLDivElement | null) => {
    innerRef.current = el;
    if (typeof ref === 'function') ref(el);
    else if (ref) ref.current = el;
  };

  useEffect(() => {
    const el = innerRef.current;
    if (!el || isTyping.current) return;
    // An empty body still needs a paragraph, or the caret has nowhere to sit.
    const html = value && value.trim() ? value : '<p><br></p>';
    if (el.innerHTML !== html) el.innerHTML = html;
  }, [value]);

  const handleInput = () => {
    const el = innerRef.current;
    if (!el) return;
    isTyping.current = true;
    onChange(el.innerHTML);
    // Cleared on the next tick, once React has re-rendered with the new value.
    setTimeout(() => {
      isTyping.current = false;
    }, 0);
  };

  return (
    <div
      ref={setRefs}
      className={className}
      contentEditable
      suppressContentEditableWarning
      onInput={handleInput}
      data-placeholder={placeholder}
      style={style}
    />
  );
});
