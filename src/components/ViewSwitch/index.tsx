import React from "react";
import { Link } from "react-router";
import { useT } from "../../context/localizationContext";
import { ROUTES } from "../../router/const";
import styles from "./styles.module.scss";

interface ViewSwitchProps {
  // the view the link leads to
  to: "gui" | "terminal";
}

// the terminal ⇄ gui switch in the top corner of a page
const ViewSwitch: React.FC<ViewSwitchProps> = ({ to }) => {
  const t = useT();

  return (
    <Link className={styles.switch} to={to === "gui" ? ROUTES.GUI : ROUTES.MAIN}>
      {t({ key: to === "gui" ? "switchToGui" : "switchToTerminal" })}
    </Link>
  );
};

export default ViewSwitch;
