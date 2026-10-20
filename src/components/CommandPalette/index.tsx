import React from "react";
import cn from "clsx";
import { useHandlerContext } from "../../context/handlerContext";
import { useT } from "../../context/localizationContext";
import { searchPalette } from "../../commandHandlers/palette";
import { isCtrlLetter } from "../../utils";

import styles from "./styles.module.scss";

// Ctrl+K, or ⌘K on a Mac, as the button tells
const isMac = () => /Mac|iPhone|iPad/.test(navigator.platform);

// calls onToggle on Ctrl+K or ⌘K anywhere on the page; the matrix rain and the games take the
// keys before it
export const usePaletteShortcut = (onToggle: () => void) => {
  const onToggleRef = React.useRef(onToggle);
  React.useLayoutEffect(() => {
    onToggleRef.current = onToggle;
  }, [onToggle]);

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isCtrlLetter(e, "k", { orMeta: true })) return;
      e.preventDefault(); // the browser would focus its search field
      if (!e.repeat) onToggleRef.current();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
};

interface PaletteButtonProps {
  onClick: () => void;
  // the matrix rain or a game is shown: they take the keys
  disabled?: boolean;
}

// the magnifier in the toolbar: the palette for a phone and for a visitor who doesn't know Ctrl+K
export const PaletteButton: React.FC<PaletteButtonProps> = ({ onClick, disabled }) => {
  const t = useT();
  const shortcut = isMac() ? "⌘K" : "Ctrl+K";

  return (
    <button
      type="button"
      className={styles.button}
      aria-label={t({ key: "paletteOpen" })}
      aria-haspopup="dialog"
      aria-keyshortcuts="Control+K Meta+K"
      title={t({ key: "paletteOpenTitle", args: { shortcut } })}
      disabled={disabled}
      onClick={onClick}
    >
      <svg className={styles.icon} viewBox="0 0 16 16" aria-hidden="true">
        <circle cx="6.5" cy="6.5" r="4.5" />
        <path d="M10 10l4.5 4.5" />
      </svg>
    </button>
  );
};

// the command with its matched chars highlighted
const renderCommand = (command: string, indices: number[]) => {
  if (!indices.length) return command;
  const matched = new Set(indices);
  const parts: React.ReactNode[] = [];
  let start = 0;
  while (start < command.length) {
    const isMatched = matched.has(start);
    let end = start + 1;
    while (end < command.length && matched.has(end) === isMatched) end++;
    const text = command.slice(start, end);
    parts.push(
      isMatched ? (
        <mark key={start} className={styles.match}>
          {text}
        </mark>
      ) : (
        text
      ),
    );
    start = end;
  }
  return parts;
};

interface CommandPaletteProps {
  onClose: () => void;
}

// the command palette (TASK-90): a fuzzy search over the commands of the page and the files with
// their descriptions; the chosen one runs as if it was typed and gets into the history.
// The keys stay in the search field, it points at the selected option as the completion menu does
const CommandPalette: React.FC<CommandPaletteProps> = ({ onClose }) => {
  const { paletteEntries, executeCommand } = useHandlerContext();
  const t = useT();
  const [query, setQuery] = React.useState("");
  // -1: none; the best match is selected once something is typed
  const [selected, setSelected] = React.useState(-1);
  const listId = React.useId();
  const getOptionId = React.useCallback((index: number) => `${listId}-${index}`, [listId]);

  const entries = React.useMemo(
    () =>
      paletteEntries.map((entry) => ({ ...entry, description: t({ key: entry.descriptionKey }) })),
    [paletteEntries, t],
  );
  const results = React.useMemo(() => searchPalette(entries, query), [entries, query]);

  // read while rendering: by the effects the search field has the focus
  const [previousFocus] = React.useState(() => document.activeElement);
  const inputRef = React.useRef<HTMLInputElement>(null);
  // the focus goes back where it was: the command line, or the button on a phone (no keyboard)
  React.useEffect(() => {
    inputRef.current?.focus();
    return () => {
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
  }, [previousFocus]);

  React.useEffect(() => {
    if (selected === -1) return;
    document.getElementById(getOptionId(selected))?.scrollIntoView({ block: "nearest" });
  }, [selected, results, getOptionId]);

  const run = (index: number) => {
    const result = results[index];
    if (!result) return;
    onClose();
    executeCommand(result.entry.command);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value } = e.currentTarget;
    setQuery(value);
    setSelected(value.trim() ? 0 : -1);
  };

  // ↑/↓ and Tab/Shift+Tab move the selection round, Enter runs it, Esc closes the palette
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.nativeEvent.isComposing) return;
    const step = (delta: number) => {
      e.preventDefault();
      if (!results.length) return;
      setSelected((current) =>
        current === -1 && delta < 0
          ? results.length - 1
          : (current + delta + results.length) % results.length,
      );
    };
    if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) step(1);
    else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) step(-1);
    else if (e.key === "Enter") {
      e.preventDefault();
      run(selected);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    }
  };

  return (
    <div
      className={styles.backdrop}
      // a click beside the palette closes it
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={styles.palette}
        role="dialog"
        aria-modal="true"
        aria-label={t({ key: "paletteLabel" })}
        // the focus stays in the search field, whatever is clicked in the palette: the keys don't
        // go to the command line beneath, a tap doesn't hide the virtual keyboard
        onMouseDown={(e) => {
          if (e.target !== inputRef.current) e.preventDefault();
        }}
      >
        <input
          className={styles.search}
          type="text"
          role="combobox"
          aria-label={t({ key: "paletteLabel" })}
          aria-expanded={results.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={selected === -1 ? undefined : getOptionId(selected)}
          placeholder={t({ key: "palettePlaceholder" })}
          value={query}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          ref={inputRef}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="go"
        />
        <ul
          id={listId}
          className={styles.list}
          role="listbox"
          aria-label={t({ key: "paletteResultsLabel" })}
        >
          {results.map(({ entry, indices }, index) => (
            // the keys are on the search field (aria-activedescendant), a click is for the mouse
            <li
              key={entry.command}
              id={getOptionId(index)}
              className={cn(styles.option, index === selected && styles.selected)}
              role="option"
              aria-selected={index === selected}
              onClick={() => run(index)}
            >
              <span className={styles.command}>{renderCommand(entry.command, indices)}</span>
              <span className={styles.description}>{entry.description}</span>
            </li>
          ))}
        </ul>
        <p className={styles.empty} aria-live="polite">
          {results.length === 0 && t({ key: "paletteEmpty" })}
        </p>
      </div>
    </div>
  );
};

export default CommandPalette;
