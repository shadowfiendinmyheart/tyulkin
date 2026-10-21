import React from "react";
import cn from "clsx";
import { useHandlerContext } from "../../context/handlerContext";
import { ThemeMode } from "../../domain";
import { ConsoleRouteValues } from "../../router/interfaces";
import styles from "./styles.module.scss";

// the colors of a theme strip, theme tokens (see styles/themes.scss): the text, the accent and
// the main ANSI colors, on the background of the theme
const SWATCH_COLORS = [
  "text-color",
  "accent-color",
  "ansi-red",
  "ansi-green",
  "ansi-yellow",
  "ansi-blue",
  "ansi-magenta",
  "ansi-cyan",
];

interface CommandButtonProps {
  command: string;
  // shown instead of the command: a file name of `ls`
  label?: string;
  // more styles: the echoed input of a block keeps the color of the text (TASK-82)
  className?: string;
  // the colors of the theme are shown before the label (`show themes`, TASK-84)
  theme?: ThemeMode;
  // the page the command was printed on: a click on another page opens it and runs there
  // (TASK-103); none: runs on the open page
  route?: ConsoleRouteValues;
}

// a highlighted command name; a click runs it as if it was typed (for mouse and touch users)
const CommandButton: React.FC<CommandButtonProps> = ({
  command,
  label = command,
  className,
  theme,
  route,
}) => {
  const { executeCommand } = useHandlerContext();

  return (
    <button
      type="button"
      className={cn(styles.command, className)}
      // what a click runs, when the label doesn't say it
      title={label === command ? undefined : command}
      onClick={() => executeCommand(command, { route })}
    >
      {theme && (
        // the tokens of the theme apply inside it: its selectors are [data-theme="…"]
        <span className={styles.swatch} data-theme={theme} aria-hidden="true">
          {SWATCH_COLORS.map((color) => (
            <span key={color} style={{ backgroundColor: `var(--${color})` }} />
          ))}
        </span>
      )}
      {label}
    </button>
  );
};

export default CommandButton;
