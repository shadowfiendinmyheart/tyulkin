import React from "react";
import cn from "clsx";
import Char from "../Char";
import CommandButton from "../CommandButton";
import CommandsHint, { getCommandsHintOptionId } from "../CommandsHint";
import { useConsoleContext } from "../../context/consoleContext";
import { useHandlerContext } from "../../context/handlerContext";
import {
  addUserLog,
  clearLogs,
  countTypedCommand,
  setCommandsHint,
} from "../../store/console/actions";
import { usePrompt, usePromptSegments } from "../../hooks/usePrompt";
import { useCaretBlinkSync } from "./hooks/useCaretBlinkSync";
import { useCommandsHint } from "./hooks/useCommandsHint";
import { useHistoryCommands } from "./hooks/useHistoryCommands";
import { usePromptSwipe } from "./hooks/usePromptSwipe";
import { useReverseSearch } from "./hooks/useReverseSearch";
import { useThemePreview } from "./hooks/useThemePreview";
import { useT } from "../../context/localizationContext";
import { withNode } from "../../store/console/logNodes";
import { isClickingKey, playKeyClick } from "../../utils/keySound";
import { isAltLetter, isCtrlLetter, isPlainKey } from "../../utils";
import { getAutosuggestion } from "../../commandHandlers/utils";
import { HighlightKind } from "../../commandHandlers/highlight";
import { THEME_ORIGIN_ATTRIBUTE } from "../../utils/themeTransition";
import { applyReadline, LineState, ReadlineAction } from "./readline";

import styles from "./styles.module.scss";

// selections are collapsed to selectionEnd (see noSelectEventHandler), so it is the real caret;
// the caret is drawn on the char before it
const readCaretPosition = (input: HTMLInputElement) =>
  (input.selectionEnd ?? input.value.length) - 1;

// terminal-style Ctrl+<letter>, Meta combos are left to the browser too
const isCtrlShortcut = (e: React.KeyboardEvent, letter: string) =>
  isCtrlLetter(e.nativeEvent, letter);

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

// readline keys (TASK-91); Ctrl+D on an empty line is `exit`
const READLINE_KEYS: { letter: string; isAlt?: boolean; action: ReadlineAction }[] = [
  { letter: "a", action: "lineStart" },
  { letter: "e", action: "lineEnd" },
  { letter: "u", action: "killToStart" },
  { letter: "k", action: "killToEnd" },
  { letter: "w", action: "killWordBack" },
  { letter: "d", action: "deleteChar" },
  { letter: "b", isAlt: true, action: "wordBack" },
  { letter: "f", isAlt: true, action: "wordForward" },
];

const getReadlineAction = (e: React.KeyboardEvent) =>
  READLINE_KEYS.find(({ letter, isAlt }) =>
    isAlt ? isAltLetter(e.nativeEvent, letter) : isCtrlShortcut(e, letter),
  )?.action;

interface InputProps {
  // gets the native input, for the extra keys row (TASK-93)
  onInputElement?: (input: HTMLInputElement | null) => void;
}

const Input: React.FC<InputProps> = ({ onInputElement }) => {
  const { executeCommand, allCommands, highlight } = useHandlerContext();
  const { consoleDispatch, consoleState } = useConsoleContext();
  const { logs, history, soundMode, caretMode } = consoleState;
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
  const charsRef = React.useRef<HTMLDivElement>(null);
  const prompt = usePrompt();
  const promptSegments = usePromptSegments();
  const t = useT();
  const hintId = React.useId();
  const searchMatchId = React.useId();
  const commandsHintId = React.useId();

  // programmatic line replacement (Tab autocomplete, history): the caret goes to the end
  const replaceInputValue = (value: string) => {
    setInputValue(value);
    setCaretToEndRequest((request) => request + 1);
  };

  const {
    commandsHintHandleKeyDownInput,
    commandsHintOptions,
    commandsHintSelected,
    commandsHintShownOption,
    pickCommandsHintOption,
    closeCommandsHint,
  } = useCommandsHint(inputValue, replaceInputValue);
  useThemePreview(commandsHintShownOption);
  const {
    historyCommandsHandleKeyDownInput,
    resetHistoryBrowsing,
    showOlderCommand,
    showNewerCommand,
  } = useHistoryCommands(inputValue, replaceInputValue);
  const reverseSearch = useReverseSearch(inputValue, replaceInputValue);
  // a swipe over the prompt browses the history as ↑ and ↓ do (TASK-94); not in Ctrl+R search,
  // which browses its own matches
  const promptSwipeHandlers = usePromptSwipe((direction) => {
    if (reverseSearch.isSearching) return;
    closeCommandsHint();
    if (direction === "up") showOlderCommand();
    else showNewerCommand();
  });
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
  // the block caret and the char it inverts blink in step (TASK-100)
  useCaretBlinkSync(charsRef, caretMode, caretPosition, inputValue, autosuggestionRest);

  // the native input is the single source of truth for the caret
  const syncCaretPosition = React.useCallback(() => {
    if (inputRef.current) setCaretPosition(readCaretPosition(inputRef.current));
  }, []);

  const handleChangeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.currentTarget.value);
    // batched with the value (virtual keyboards send key "Unidentified", so keys can't be relied on)
    syncCaretPosition();
    resetHistoryBrowsing();
    closeCommandsHint();
  };

  // a click on a completion is an edit of the line, as a key handled by the menu is
  const pickCompletion = (index: number) => {
    resetHistoryBrowsing();
    pickCommandsHintOption(index);
  };

  // programmatic value changes (Enter, Tab autocomplete, history) and caret-to-end requests
  // resync the drawn caret; after typing this is a no-op, onChange has already synced it
  const handledCaretToEndRequest = React.useRef<number>(0);
  // where a readline edit puts the caret once the edited line is rendered
  const pendingCaret = React.useRef<number | null>(null);
  React.useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;
    if (handledCaretToEndRequest.current !== caretToEndRequest) {
      handledCaretToEndRequest.current = caretToEndRequest;
      input.setSelectionRange(input.value.length, input.value.length);
    }
    if (pendingCaret.current !== null) {
      input.setSelectionRange(pendingCaret.current, pendingCaret.current);
      pendingCaret.current = null;
    }
    setCaretPosition(readCaretPosition(input));
  }, [inputValue, caretToEndRequest]);

  // a readline key (TASK-91): a move only puts the caret, an edit changes the line as typing does
  const applyLine = ({ value, caret }: LineState) => {
    closeCommandsHint();
    if (value === inputValue) {
      inputRef.current?.setSelectionRange(caret, caret);
      syncCaretPosition();
      return;
    }
    pendingCaret.current = caret;
    setInputValue(value);
    resetHistoryBrowsing();
  };

  // readline keys, as in bash; false: not one of them, or Ctrl+K with nothing after the caret,
  // which is left to the command palette (TASK-90)
  const handleReadlineKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const action = getReadlineAction(e);
    if (!action) return false;
    const line = { value: inputValue, caret: e.currentTarget.selectionEnd ?? inputValue.length };
    const next = applyReadline(action, line);
    if (!next && action === "killToEnd") return false;
    // the browser would select all, open its search, view the source, bookmark the page or go to
    // its menu; a prevented Ctrl+K doesn't toggle the palette
    e.preventDefault();
    // Ctrl+D on an empty line ends the session (TASK-98); in a Ctrl+R search it is an empty query
    if (action === "deleteChar" && !inputValue && !reverseSearch.isSearching) {
      if (e.repeat) return true;
      resetHistoryBrowsing();
      executeCommand("exit");
      return true;
    }
    if (next) applyLine(next);
    return true;
  };

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
    } else if (
      SEARCH_ACCEPT_KEYS.includes(e.key) ||
      isCtrlShortcut(e, "a") ||
      isCtrlShortcut(e, "e")
    ) {
      // as in bash, Ctrl+A and Ctrl+E accept the found entry too, the caret at its start or end
      e.preventDefault();
      stopSearch();
      resetHistoryBrowsing();
      replaceInputValue(line);
      if (isCtrlShortcut(e, "a")) pendingCaret.current = 0;
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
      // the completion menu handled the key: the line may be replaced
      resetHistoryBrowsing();
      return;
    }

    // →, End and Ctrl+E (TASK-91) accept the autosuggestion: an edit, so the line becomes the new
    // draft
    const isLineEndKey =
      (isPlainKey(e) && (e.key === "ArrowRight" || e.key === "End")) || isCtrlShortcut(e, "e");
    if (autosuggestion && isLineEndKey) {
      e.preventDefault();
      resetHistoryBrowsing();
      replaceInputValue(autosuggestion);
      return;
    }

    historyCommandsHandleKeyDownInput(e);

    if (handleReadlineKeyDown(e)) return;

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
      // a dialog (the command palette, TASK-90) keeps the focus
      if (e.target instanceof Element && e.target.closest("a, button, [role='dialog']")) return;
      autoFocusEventHandler();
    };

    // focusing the input drops the page selection: keep it for Ctrl/Cmd+C on selected logs
    const keyDownFocusEventHandler = (e: KeyboardEvent) => {
      if (e.target instanceof Element && e.target.closest("[role='dialog']")) return;
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

  // the command line stays in view, and an open completion menu under it with its selected option
  React.useEffect(() => {
    if (consoleInputRef.current) {
      consoleInputRef.current.scrollIntoView({ block: "end" });
    }
    if (commandsHintOptions.length === 0) return;
    document.getElementById(commandsHintId)?.scrollIntoView({ block: "end" });
    if (commandsHintSelected !== -1) {
      document
        .getElementById(getCommandsHintOptionId(commandsHintId, commandsHintSelected))
        ?.scrollIntoView({ block: "nearest" });
    }
  }, [inputValue, logs, commandsHintOptions, commandsHintSelected, commandsHintId]);

  return (
    <>
      <div className={styles.wrapper} ref={consoleInputRef} {...promptSwipeHandlers}>
        <span className={styles.locator}>
          {reverseSearch.isSearching ? (
            t({ key: reverseSearch.isFailing ? "reverseSearchFailing" : "reverseSearch" })
          ) : (
            <>
              <span className={styles.promptUser}>{promptSegments.user}</span>{" "}
              <span className={styles.promptDirectory}>{promptSegments.directory}</span>{" "}
              {/* a set theme spreads from here (TASK-84) */}
              <span className={styles.promptSymbol} {...{ [THEME_ORIGIN_ATTRIBUTE]: "" }}>
                {promptSegments.symbol}
              </span>
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
          // the completion menu (TASK-88): the keys stay here, the selected option is pointed at
          aria-controls={commandsHintOptions.length > 0 ? commandsHintId : undefined}
          aria-activedescendant={
            commandsHintSelected === -1
              ? undefined
              : getCommandsHintOptionId(commandsHintId, commandsHintSelected)
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
        <div
          className={cn(styles.chars, autosuggestionRest && styles.charsAutosuggesting)}
          ref={charsRef}
        >
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
      <CommandsHint
        id={commandsHintId}
        options={commandsHintOptions}
        selected={commandsHintSelected}
        onPick={pickCompletion}
      />
    </>
  );
};

export default Input;
