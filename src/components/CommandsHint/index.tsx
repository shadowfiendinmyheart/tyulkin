import React from "react";
import cn from "clsx";
import { useHandlerContext } from "../../context/handlerContext";
import { useT } from "../../context/localizationContext";

import styles from "./style.module.scss";

// the id of an option, for aria-activedescendant of the command line
export const getCommandsHintOptionId = (menuId: string, index: number) => `${menuId}-${index}`;

interface CommandsHintProps {
  id: string;
  options: string[];
  // index of the option in the line, -1: none
  selected: number;
  // a click or a tap on an option
  onPick: (index: number) => void;
}

// zsh-like completion menu (TASK-88): the options of Tab with the descriptions of their commands;
// the keys are handled by the command line, it keeps the focus and points at the selected option
const CommandsHint: React.FC<CommandsHintProps> = ({ id, options, selected, onPick }) => {
  const { describeCompletion } = useHandlerContext();
  const t = useT();
  // once per menu, not on every selection step
  const descriptionKeys = React.useMemo(
    () => options.map(describeCompletion),
    [options, describeCompletion],
  );
  // the menu and its selected option are scrolled into view by the command line, after itself

  return (
    <div className={cn([styles.commandsHint, options.length === 0 && styles.hide])}>
      {/* the names of the listed options are announced like logs, without the descriptions;
          empty, the region stays in the accessibility tree for the next list */}
      <span className={styles.announcement} aria-live="polite">
        {options.join(", ")}
      </span>
      {options.length > 0 && (
        <ul
          id={id}
          className={styles.menu}
          role="listbox"
          aria-label={t({ key: "completionsLabel" })}
          // the focus stays in the command line: a tap doesn't hide the virtual keyboard
          onMouseDown={(e) => e.preventDefault()}
        >
          {options.map((option, index) => {
            const descriptionKey = descriptionKeys[index];
            return (
              // the keys are on the command line (aria-activedescendant), a click is for the mouse
              <li
                key={option}
                id={getCommandsHintOptionId(id, index)}
                className={cn(styles.option, index === selected && styles.selected)}
                role="option"
                aria-selected={index === selected}
                onClick={() => onPick(index)}
              >
                <span className={styles.command}>{option}</span>
                {descriptionKey && (
                  <span className={styles.description}>
                    <span aria-hidden="true">-- </span>
                    {t({ key: descriptionKey })}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default CommandsHint;
