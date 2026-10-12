import React from "react";
import { useLocation, useNavigate } from "react-router";
import { useHandlerContext } from "../../context/handlerContext";
import { COMMAND_PARAM } from "../../router/const";

// runs the command of a deep link (/?cmd=projects, see `share`) as if it was typed;
// the parameter is dropped from the address first and the command runs once that is done:
// reloading or coming back doesn't run it again, and a command that navigates itself
// (settings, gui) doesn't race with the replace, which would leave the link in the history
const DeepLinkCommand: React.FC = () => {
  const { executeCommand } = useHandlerContext();
  const { pathname, search, hash, state } = useLocation();
  const navigate = useNavigate();
  // a ref survives the StrictMode remount, so the command runs once
  const pendingCommandRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    const params = new URLSearchParams(search);
    const command = params.get(COMMAND_PARAM);
    if (command !== null) {
      pendingCommandRef.current = command.trim() || null;
      params.delete(COMMAND_PARAM);
      const rest = params.toString();
      navigate({ pathname, search: rest && `?${rest}`, hash }, { replace: true, state });
      return;
    }

    const pendingCommand = pendingCommandRef.current;
    if (pendingCommand === null) return;
    pendingCommandRef.current = null;
    executeCommand(pendingCommand, { fromLink: true });
  }, [pathname, search, hash, state, navigate, executeCommand]);

  return null;
};

export default DeepLinkCommand;
