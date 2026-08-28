// The proposal quoted inside a letter of acceptance.
//
// It comes from a file in practice — the proposal was sent as Word, and the
// acceptance quotes it back verbatim. Retyping it would be both tedious and
// the one place where a transcription slip would matter, so the file is read
// directly and its formatting kept. The text area stays underneath for
// corrections, and works on its own if there is no file to hand.
import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Upload } from 'lucide-react';
import { Field } from '../../../components/Field.js';
import { StatusDisplay } from '../../../components/StatusDisplay.js';
import { leggiFileCitazione } from '../utils/docxToHtml.js';

export interface CitazionePropostaProps {
  value: string;
  onChange: (html: string) => void;
}

export function CitazioneProposta({ value, onChange }: CitazionePropostaProps) {
  const { t } = useTranslation('carta');
  const inputRef = useRef<HTMLInputElement>(null);
  const [errore, setErrore] = useState<string | null>(null);
  const [caricando, setCaricando] = useState(false);

  async function apri(file: File) {
    setErrore(null);
    setCaricando(true);
    try {
      onChange(await leggiFileCitazione(file));
    } catch {
      // The reason a .docx fails to parse is never something the user can act
      // on, so the message says what to do instead: check it opens in Word,
      // or paste the text.
      setErrore(t('errors.fileNonLetto'));
    } finally {
      setCaricando(false);
    }
  }

  return (
    <>
      <Field label={t('fields.propostaOriginale')} htmlFor="c-proposta-orig">
        <div className="carta-citazione-azioni">
          <button
            type="button"
            className="carta-citazione-carica"
            onClick={() => inputRef.current?.click()}
            disabled={caricando}
          >
            <Upload aria-hidden="true" size={14} />
            {caricando
              ? t('actions.fileInLettura')
              : value
                ? t('actions.fileCambia')
                : t('actions.fileCarica')}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept=".docx,.txt"
            className="ui-visually-hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void apri(file);
              // Cleared so choosing the same file twice fires again — after a
              // correction in Word, reloading the same name is the normal move.
              e.target.value = '';
            }}
          />
        </div>
        {errore ? <StatusDisplay variant="error" message={errore} /> : null}
        {/* The imported text, shown as it will be quoted: formatting is the
            whole reason the file is read this way rather than as plain text,
            so it has to be visible before the letter is signed. */}
        {value ? (
          <div
            className="carta-citazione-anteprima"
            // The HTML is built by our own serialiser from the document model
            // mammoth parsed (see utils/docxToHtml.ts): a fixed set of tags
            // with escaped text, never markup carried over from the file.
            dangerouslySetInnerHTML={{ __html: value }}
          />
        ) : null}
        <textarea
          id="c-proposta-orig"
          className="carta-textarea"
          rows={6}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
      </Field>
    </>
  );
}
