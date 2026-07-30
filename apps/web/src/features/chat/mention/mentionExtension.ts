// @-mention suggestion for the chat composer (Execution Plan Phase 13,
// UI §6.2 redesign): typing `@` in the rich-text editor opens a colleague
// picker; choosing one inserts a bold-marked plain-text mention
// (`@username `) and — when the colleague isn't yet a participant — adds
// them to the thread via the existing add-participant API. Plain bold text
// on purpose: the rich-text allowlist (SPECIFICATIONS.md §11) has no
// mention node, and the server sanitizer would strip one; this flow needs
// no schema or backend change (owner decision, Phase 13 planning).
//
// Built on `@tiptap/suggestion`'s plugin, bridged to React through a
// controller object the editor component owns: the plugin pushes open/
// update/exit state and keystrokes through it, the component renders the
// popup from that state (anchored above the composer, per the reference —
// no cursor-rect math needed).
import { Extension } from '@tiptap/react';
import { Suggestion, type SuggestionProps } from '@tiptap/suggestion';

export interface MentionCandidate {
  id: string;
  username: string;
  isParticipant: boolean;
}

export interface MentionState {
  items: MentionCandidate[];
  query: string;
  activeIndex: number;
}

export interface MentionController {
  getItems: (query: string) => MentionCandidate[];
  onPick: (item: MentionCandidate) => void;
  setState: (state: MentionState | null) => void;
  getState: () => MentionState | null;
  /** Lets the popup (mouse path) execute the same insert+add command the
   *  keyboard path uses. Wired by the extension while a suggestion is open. */
  pick: (item: MentionCandidate) => void;
}

export function createMentionExtension(controller: MentionController) {
  return Extension.create({
    name: 'mentionSuggestion',
    addProseMirrorPlugins() {
      let latest: SuggestionProps<MentionCandidate, MentionCandidate> | null = null;
      controller.pick = (item) => {
        latest?.command(item);
      };
      return [
        Suggestion<MentionCandidate, MentionCandidate>({
          editor: this.editor,
          char: '@',
          allowSpaces: false,
          items: ({ query }) => controller.getItems(query),
          command: ({ editor, range, props }) => {
            editor
              .chain()
              .focus()
              .deleteRange(range)
              .insertContent([
                { type: 'text', text: `@${props.username}`, marks: [{ type: 'bold' }] },
                { type: 'text', text: ' ' },
              ])
              .run();
            controller.onPick(props);
          },
          render: () => ({
            onStart: (props) => {
              latest = props;
              controller.setState({ items: props.items, query: props.query, activeIndex: 0 });
            },
            onUpdate: (props) => {
              latest = props;
              controller.setState({ items: props.items, query: props.query, activeIndex: 0 });
            },
            onExit: () => {
              latest = null;
              controller.setState(null);
            },
            onKeyDown: ({ event }) => {
              const state = controller.getState();
              if (!state) return false;
              if (event.key === 'Escape') {
                controller.setState(null);
                return true;
              }
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                const count = state.items.length;
                if (count === 0) return true;
                const delta = event.key === 'ArrowDown' ? 1 : -1;
                controller.setState({
                  ...state,
                  activeIndex: (state.activeIndex + delta + count) % count,
                });
                return true;
              }
              if (event.key === 'Enter') {
                const item = state.items[state.activeIndex];
                if (item && latest) latest.command(item);
                return true;
              }
              return false;
            },
          }),
        }),
      ];
    },
  });
}
