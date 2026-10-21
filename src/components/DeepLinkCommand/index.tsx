import React from "react";
import { useLocation, useNavigate } from "react-router";
import { useHandlerContext } from "../../context/handlerContext";
import { COMMAND_PARAM } from "../../router/const";
import { ConsoleLocationState } from "../../router/interfaces";

interface PendingCommand {
  command: string;
  fromLink: boolean;
}

// a command clicked in the output of another page (TASK-103), see executeCommand
const getClickedCommand = (state: unknown) => {
  const command = (state as ConsoleLocationState | null)?.command;
  return typeof command === "string" ? command : undefined;
};

// runs the command of a deep link (/?cmd=projects, see `share`) as if it was typed, and the one
// clicked in the output of another page, which opened this one (TASK-103) as if it was typed by
// the visitor; the command is dropped from the address (or its state) first and runs once that
// is done: reloading or coming back doesn't run it again, and a command that navigates itself
// (settings, gui) doesn't race with the replace, which would leave the link in the history
const DeepLinkCommand: React.FC = () => {
  const { executeCommand } = useHandlerContext();
  const { pathname, search, hash, state } = useLocation();
  const navigate = useNavigate();
  // a ref survives the StrictMode remount, so the command runs once
  const pendingCommandRef = React.useRef<PendingCommand | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(search);
    const linked = params.get(COMMAND_PARAM);
    const clicked = getClickedCommand(state);
    if (linked !== null || clicked !== undefined) {
      const command = (linked ?? clicked ?? "").trim();
      pendingCommandRef.current = command ? { command, fromLink: linked !== null } : null;
      params.delete(COMMAND_PARAM);
      const rest = params.toString();
      // the state of a click is the command alone
      navigate(
        { pathname, search: rest && `?${rest}`, hash },
        { replace: true, state: clicked === undefined ? state : null },
      );
      return;
    }

    const pendingCommand = pendingCommandRef.current;
    if (pendingCommand === null) return;
    pendingCommandRef.current = null;
    executeCommand(pendingCommand.command, { fromLink: pendingCommand.fromLink });
  }, [pathname, search, hash, state, navigate, executeCommand]);

  return null;
};

export default DeepLinkCommand;
