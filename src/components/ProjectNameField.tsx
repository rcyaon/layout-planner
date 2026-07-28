import { useEffect, useRef, useState } from 'react';
import { useStore } from '../store/useStore';

/**
 * The pill beside the title doubles as the project-name field. It reads as a
 * plain label until hovered or focused, so the header keeps its flat look.
 *
 * Edits are held in a local draft and only pushed to the store on commit —
 * otherwise every keystroke would land in the autosave subscription.
 */
export default function ProjectNameField() {
  const projectName = useStore((s) => s.projectName);
  const setProjectName = useStore((s) => s.setProjectName);
  const [draft, setDraft] = useState(projectName);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  /** Set by Escape so the blur that follows discards instead of commits. */
  const cancelling = useRef(false);

  // A first-run affordance: once the project has a real name the pill speaks
  // for itself, so the hint retires rather than sitting in the header forever.
  const showHint = projectName === 'Untitled' && !focused;

  // Follow the store when the name changes elsewhere (new project, opening a
  // file, undo) — but never while the user is mid-edit.
  useEffect(() => {
    if (document.activeElement !== inputRef.current) setDraft(projectName);
  }, [projectName]);

  const commit = () => {
    const next = draft.trim() || 'Untitled';
    setDraft(next);
    if (next !== projectName) setProjectName(next);
  };

  return (
    <span className="flex min-w-0 items-center gap-1.5">
      <input
        ref={inputRef}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          if (cancelling.current) {
            cancelling.current = false;
            setDraft(projectName);
            return;
          }
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') inputRef.current?.blur();
          else if (e.key === 'Escape') {
            cancelling.current = true;
            inputRef.current?.blur();
          }
        }}
        title="Project name — click to rename"
        aria-label="Project name"
        spellCheck={false}
        // Grow with the text so the pill hugs the name, with a ceiling so a long
        // one can't push the rest of the header around.
        style={{ width: `${Math.min(28, Math.max(6, draft.length + 1))}ch` }}
        className="min-w-0 rounded-full border border-transparent bg-panelalt px-2.5 py-0.5 text-xs font-medium text-muted outline-none transition-colors hover:border-edge hover:text-ink focus:border-accent focus:text-ink"
      />
      {showHint && (
        <span className="whitespace-nowrap text-[11px] text-muted/70" aria-hidden="true">
          ← click to edit project name
        </span>
      )}
    </span>
  );
}
