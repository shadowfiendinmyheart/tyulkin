import React from "react";
import cn from "clsx";
import Char from "../Char";
import CommandButton from "../CommandButton";
import { useConsoleContext } from "../../context/consoleContext";
import { useHandlerContext } from "../../context/handlerContext";
import {
  addUserLog,
  clearLogs,
  countTypedCommand,
  setCommandsHint,
} from "../../store/console/actions";
import { usePrompt, usePromptSegments } from "../../hooks/usePrompt";
import { useCommandsHint } from "./hooks/useCommandsHint";
import { useHistoryCommands } from "./hooks/useHistoryCommands";
import { useReverseSearch } from "./hooks/useReverseSearch";
import { useT } from "../../context/localizationContext";
import { withNode } from "../../store/console/logNodes";
import { isClickingKey, playKeyClick } from "../../utils/keySound";
import { getAutosuggestion } from "../../commandHandlers/utils";
import { HighlightKind } from "../../commandHandlers/highlight";

import styles from "./styles.module.scss";

// selections are collapsed to selectionEnd (see noSelectEventHandler), so it is the real caret;
// the caret is drawn on the char before it
const readCaretPosition = (input: HTMLInputElement) =>
  (input.selectionEnd ?? input.value.length) - 1;

// terminal-style Ctrl+<letter>; Shift/Alt/Meta combos are left to the browser
// (Ctrl+Shift+C is DevTools, Ctrl+Alt is AltGr on Windows).
// On a non-Latin layout e.key is a local letter ("д"), so the physical key decides
const isCtrlShortcut = (e: React.KeyboardEvent, letter: string) => {
  if (!e.ctrlKey || e.shiftKey || e.altKey || e.metaKey) return false;
  if (e.nativeEvent.isComposing) return false; // IME composition owns the keys
  const key = e.key.toLowerCase();
  if (/^[a-z]$/.test(key)) return key === letter;
  return e.code === `Key${letter.toUpperCase()}`;
};

// text selected on the page (in logs); the input's own selection is always collapsed
const isTextSelected = () => Boolean(window.getSelection()?.toString());

// fish-like highlighting (TASK-86): the class of a char by its kind
const highlightClassName: Record<HighlightKind, string | undefined> = {
  command: styles.highlightCommand,
  unknown: styles.highlightUnknown,
  argument: styles.highlightArgument,
  path: styles.highlightPath,
  text: undefined,
};

// keys that end Ctrl+R search with the found entry in the line, to edit it
const SEARCH_ACCEPT_KEYS = [
  "Tab",
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
];

interface InputProps {
  // gets the native input, for the extra keys row (TASK-93)
  onInputElement?: (input: HTMLInputElement | null) => void;
}

const Input: React.FC<InputProps> = ({ onInputElement }) => {
  const { executeCommand, allCommands, highlight } = useHandlerContext();
  const { consoleDispatch, consoleState } = useConsoleContext();
  const { logs, history, soundMode } = consoleState;
  const [inputValue, setInputValue] = React.useState<string>("");
  // index of the char the caret is drawn on (-1 — before the first char), see readCaretPosition
  const [caretPosition, setCaretPosition] = React.useState<number>(-1);
  // bumped by replaceInputValue, so the caret moves to the end even if the value is unchanged
  const [caretToEndRequest, setCaretToEndRequest] = React.useState<number>(0);
  const inputRef = React.useRef<HTMLInputElement | null>(null);
  const setInputRef = React.useCallback(
    (input: HTMLInputElement | null) => {
      inputRef.current = input;
      onInputElement?.(input);
    },
    [onInputElement],
  );
  const consoleInputRef = React.useRef<HTMLDivElement>(null);
  const prompt = usePrompt();
  const promptSegments = usePromptSegments();
  const t = useT();
  const hintId = React.useId();
  const searchMatchId = React.useId();

  // programmatic line replacement (Tab autocomplete, history): the caret goes to the end
  const replaceInputValue = (value: string) => {
    setInputValue(value);
    setCaretToEndRequest((request) => request + 1);
  };

  const { commandsHintHandleKeyDownInput } = useCommandsHint(inputValue, replaceInputValue);
  const { historyCommandsHandleKeyDownInput, resetHistoryBrowsing } = useHistoryCommands(
    inputValue,
    replaceInputValue,
  );
  const reverseSearch = useReverseSearch(inputValue, replaceInputValue);
  // a newcomer sees how to start until the first command is executed
  const isHintShown = history.length === 0 && inputValue.length === 0 && !reverseSearch.isSearching;
  // fish-like autosuggestion (TASK-87): shown in grey after the caret at the line end only
  const isCaretAtEnd = caretPosition === inputValue.length - 1;
  const isAutosuggesting = isCaretAtEnd && !reverseSearch.isSearching;
  const autosuggestion = React.useMemo(
    () => (isAutosuggesting ? getAutosuggestion(history, allCommands, inputValue) : undefined),
    [isAutosuggesting, history, allCommands, inputValue],
  );
  // the typed part is drawn as typed; accepting takes the whole entry, case included
  const autosuggestionRest = autosuggestion?.slice(inputValue.length);
  // a Ctrl+R query is a text to find, not a command: it is not highlighted
  const highlightKinds = React.useMemo(
    () => (reverseSearch.isSearching ? [] : highlight(inputValue)),
    [reverseSearch.isSearching, highlight, inputValue],
  );

  // the native input is the single source of truth for the caret
  const syncCaretPosition = React.useCallback(() => {
    if (inputRef.current) setCaretPosition(readCaretPosition(inputRef.current));
  }, []);

  const handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.currentTarget.value);
    // batched with the value (virtual keyboards send key "Unidentified", so keys can't be relied on)
    syncCaretPosition();
    resetHistoryBrowsing();
  };

  // programmatic value changes (Enter, Tab autocomplete, history) and caret-to-end requests
  // resync the drawn caret; after typing this is a no-op, onChange has already synced it
  const handledCaretToEndRequest = React.useRef<number>(0);
  React.useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    if (handledCaretToEndRequest.current !== caretToEndRequest) {
      handledCaretToEndRequest.current = caretToEndRequest;
      input.setSelectionRange(input.value.length, input.value.length);
    }
    setCaretPosition(readCaretPosition(input));
  }, [inputValue, caretToEndRequest]);

  // Enter: the line runs and the input empties
  const submitLine = (line: string) => {
    setInputValue("");
    // the visitor got used to typing: the quick commands give way (clicks don't count)
    if (line.trim()) consoleDispatch(countTypedCommand());
    executeCommand(line);
  };

  // Ctrl+C drops the typed line as in bash: it is echoed with ^C and not added to history
  const dropLine = (line: string) => {
    consoleDispatch(addUserLog(`${line}^C`, prompt));
    consoleDispatch(setCommandsHint([]));
    setInputValue("");
    resetHistoryBrowsing();
  };

  // keys of Ctrl+R search (TASK-61), as in bash; false: the key edits the query as usual
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const { line, draft, searchOlder, stopSearch } = reverseSearch;
    if (isCtrlShortcut(e, "r")) {
      e.preventDefault(); // the browser would reload the page
      searchOlder();
    } else if (isCtrlShortcut(e, "g") || e.key === "Escape") {
      // cancel: back to the line the search started from
      e.preventDefault();
      stopSearch();
      replaceInputValue(draft);
    } else if (isCtrlShortcut(e, "c") && !isTextSelected()) {
      e.preventDefault();
      stopSearch();
      dropLine(line);
    } else if (e.key === "Enter") {
      stopSearch();
      resetHistoryBrowsing();
      submitLine(line);
    } else if (SEARCH_ACCEPT_KEYS.includes(e.key)) {
      e.preventDefault();
      stopSearch();
      resetHistoryBrowsing();
      replaceInputValue(line);
    } else {
      return false;
    }
    return true;
  };

  const handleKeyDownInput = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // `set sound on` (TASK-67)
    if (soundMode === "on" && isClickingKey(e.nativeEvent)) playKeyClick(e.key);

    if (reverseSearch.isSearching && handleSearchKeyDown(e)) return;

    const isContinue = commandsHintHandleKeyDownInput(e);
    if (!isContinue) {
      // Tab autocomplete replaced the line
      resetHistoryBrowsing();
      return;
    }

    // → and End accept the autosuggestion: an edit, so the line becomes the new draft
    const isPlainKey =
      !e.ctrlKey && !e.shiftKey && !e.altKey && !e.metaKey && !e.nativeEvent.isComposing;
    if (autosuggestion && isPlainKey && (e.key === "ArrowRight" || e.key === "End")) {
      e.preventDefault();
      consoleDispatch(setCommandsHint([])); // the listed Tab options no longer match the line
      resetHistoryBrowsing();
      replaceInputValue(autosuggestion);
      return;
    }

    historyCommandsHandleKeyDownInput(e);

    // Ctrl+L clears the screen like `clear`, the typed line stays
    if (isCtrlShortcut(e, "l")) {
      e.preventDefault(); // the browser would focus the address bar
      consoleDispatch(clearLogs());
      consoleDispatch(setCommandsHint([]));
      return;
    }

    // Ctrl+R searches the history backwards (TASK-61)
    if (isCtrlShortcut(e, "r")) {
      e.preventDefault(); // the browser would reload the page
      consoleDispatch(setCommandsHint([]));
      resetHistoryBrowsing();
      reverseSearch.searchOlder();
      return;
    }

    // with text selected on the page Ctrl+C stays a copy
    if (isCtrlShortcut(e, "c") && !isTextSelected()) {
      e.preventDefault();
      dropLine(inputValue);
      return;
    }

    // e.code is empty on virtual keyboards, e.key is reliable
    if (e.key === "Enter") submitLine(inputValue);
  };

  React.useEffect(() => {
    // https://stackoverflow.com/questions/29221991/prevent-select-on-input-text-field
    const noSelectEventHandler = () => {
      if (!inputRef.current) return;
      inputRef.current.selectionStart = inputRef.current.selectionEnd;
      syncCaretPosition();
    };

    const autoFocusEventHandler = () => {
      inputRef.current?.focus();
    };

    // focus on click/tap opens the virtual keyboard on mobile (it must happen inside a user gesture)
    const clickFocusEventHandler = (e: MouseEvent) => {
      if (isTextSelected()) return; // don't break copying text from logs
      // a link in logs opens a new tab, a command button prints its output: don't pop up
      // the virtual keyboard and scroll to the prompt
      if (e.target instanceof Element && e.target.closest("a, button")) return;
      autoFocusEventHandler();
    };

    // focusing the input drops the page selection: keep it for Ctrl/Cmd+C on selected logs
    const keyDownFocusEventHandler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && isTextSelected()) return;
      // Enter/Space on a focused command button press it, Enter on a link follows it
      if (e.target instanceof HTMLButtonElement && (e.key === "Enter" || e.key === " ")) return;
      if (e.target instanceof HTMLAnchorElement && e.key === "Enter") return;
      autoFocusEventHandler();
    };

    const input = inputRef.current;
    input?.addEventListener("select", noSelectEventHandler, false);
    // input-level selectionchange (Firefox) keeps the caret in sync while an arrow key is held;
    // React's onSelect covers the rest
    input?.addEventListener("selectionchange", syncCaretPosition, false);
    document.addEventListener("keydown", keyDownFocusEventHandler, false);
    document.addEventListener("click", clickFocusEventHandler, false);
    return () => {
      input?.removeEventListener("select", noSelectEventHandler, false);
      input?.removeEventListener("selectionchange", syncCaretPosition, false);
      document.removeEventListener("keydown", keyDownFocusEventHandler, false);
      document.removeEventListener("click", clickFocusEventHandler, false);
    };
  }, [syncCaretPosition]);

  React.useEffect(() => {
    if (consoleInputRef.current) {
      consoleInputRef.current.scrollIntoView({ block: "end" });
    }
  }, [inputValue, logs]);

  return (
    <div className={styles.wrapper} ref={consoleInputRef}>
      <span className={styles.locator}>
        {reverseSearch.isSearching ? (
          t({ key: reverseSearch.isFailing ? "reverseSearchFailing" : "reverseSearch" })
        ) : (
          <>
            <span className={styles.promptUser}>{promptSegments.user}</span>{" "}
            <span className={styles.promptDirectory}>{promptSegments.directory}</span>{" "}
            <span className={styles.promptSymbol}>{promptSegments.symbol}</span>
          </>
        )}
      </span>
      <input
        className={styles.nativeInput}
        type="text"
        aria-label={t({ key: reverseSearch.isSearching ? "reverseSearchLabel" : "inputLabel" })}
        aria-describedby={
          isHintShown ? hintId : reverseSearch.isSearching ? searchMatchId : undefined
        }
        value={inputValue}
        onChange={handleChangeInput}
        onKeyDown={handleKeyDownInput}
        // React fires onSelect on any selection change: arrows, Home/End, Delete, click, paste
        onSelect={syncCaretPosition}
        autoFocus
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="send"
        ref={setInputRef}
      />
      <div className={cn(styles.chars, autosuggestionRest && styles.charsAutosuggesting)}>
        {caretPosition === -1 || inputValue.length === 0 ? (
          <Char isCaret={true} className={styles.zeroChar} />
        ) : undefined}
        {inputValue.split("").map((char, index) => (
          <Char
            // characters repeat and have no identity of their own: the position is the key
            // eslint-disable-next-line @eslint-react/no-array-index-key
            key={index}
            isCaret={caretPosition === index}
            className={highlightClassName[highlightKinds[index] ?? "text"]}
          >
            {char}
          </Char>
        ))}
        {autosuggestionRest && (
          // the native input holds the line for screen readers, the suggestion is visual only;
          // its first char is a Char: the block caret over it inverts it like a typed one
          <>
            <Char isCaret={false} className={styles.autosuggestion} aria-hidden="true">
              {autosuggestionRest[0]}
            </Char>
            {autosuggestionRest.length > 1 && (
              <span
                className={cn(styles.autosuggestion, styles.autosuggestionRest)}
                aria-hidden="true"
              >
                {autosuggestionRest.slice(1)}
              </span>
            )}
          </>
        )}
      </div>
      {reverseSearch.isSearching && (
        <span id={searchMatchId} className={styles.searchMatch}>
          {`': ${reverseSearch.match ?? ""}`}
        </span>
      )}
      {isHintShown && (
        <span id={hintId} className={styles.hint}>
          {withNode((help) => t({ key: "inputHint", args: { help } }), {
            type: "command",
            command: "help",
          }).map((node, index) => (
            // eslint-disable-next-line @eslint-react/no-array-index-key -- the hint never reorders
            <React.Fragment key={index}>
              {typeof node === "string"
                ? node
                : node.type === "command" && <CommandButton command={node.command} />}
            </React.Fragment>
          ))}
        </span>
      )}
    </div>
  );
};

export default Input;
