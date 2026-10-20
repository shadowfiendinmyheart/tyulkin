import React from "react";
import cn from "clsx";
import { Link } from "react-router";
import { useT } from "../../context/localizationContext";
import { ROUTES } from "../../router/const";
import styles from "./styles.module.scss";

interface ViewSwitchProps {
  // the view the link leads to
  to: "gui" | "terminal";
  // muted and without a frame until hovered or focused: doesn't distract from the console (TASK-81)
  quiet?: boolean;
}

// the terminal ⇄ gui switch in the top corner of a page
const ViewSwitch: React.FC<ViewSwitchProps> = ({ to, quiet = false }) => {
  const t = useT();

  return (
    <Link
      className={cn(styles.switch, quiet && styles.quiet)}
      to={to === "gui" ? ROUTES.GUI : ROUTES.MAIN}
    >
      {t({ key: to === "gui" ? "switchToGui" : "switchToTerminal" })}
    </Link>
  );
};

export default ViewSwitch;
