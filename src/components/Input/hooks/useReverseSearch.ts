import React from "react";
import { findHistoryMatch } from "../../../commandHandlers/shell";
import { useConsoleContext } from "../../../context/consoleContext";

interface Search {
  // historyAdded when the search started: entries added during the search (a command clicked
  // in logs) are newer than its start, they are skipped and don't shift it
  addedAtStart: number;
  // the index the search goes on from, as of its start
  from: number;
  // the line the search started from: back on cancel, and the line while nothing is found
  draft: string;
}

// Ctrl+R (TASK-61): while searching, the typed line is the query and the newest history entry
// that contains it is shown next to it; the input itself never holds the found entry
export const useReverseSearch = (
  inputValue: string,
  // replaces the line and moves the caret to its end
  replaceInputValue: (value: string) => void,
) => {
  const { consoleState } = useConsoleContext();
  const { history, historyAdded } = consoleState;
  const [search, setSearch] = React.useState<Search | null>(null);

  const addedSinceStart = search ? historyAdded - search.addedAtStart : 0;
  const matchIndex = search
    ? findHistoryMatch(history, inputValue, addedSinceStart + search.from)
    : -1;
  const match = matchIndex === -1 ? undefined : history[matchIndex];

  // Ctrl+R: the search starts from the newest entry, or goes on to an older match
  const searchOlder = () => {
    if (!search) {
      setSearch({ addedAtStart: historyAdded, from: 0, draft: inputValue });
      replaceInputValue("");
      return;
    }
    const olderIndex = findHistoryMatch(history, inputValue, matchIndex + 1);
    if (matchIndex === -1 || olderIndex === -1) return;
    setSearch({ ...search, from: olderIndex - addedSinceStart });
  };

  const stopSearch = () => setSearch(null);

  return {
    isSearching: search !== null,
    match,
    // a query that nothing contains
    isFailing: search !== null && inputValue !== "" && match === undefined,
    // what Enter runs and accepting puts into the line
    line: match ?? search?.draft ?? inputValue,
    draft: search?.draft ?? "",
    searchOlder,
    stopSearch,
  };
};
