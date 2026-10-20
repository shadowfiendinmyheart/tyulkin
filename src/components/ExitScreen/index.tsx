import React from "react";
import { useT } from "../../context/localizationContext";

import styles from "./styles.module.scss";

interface ExitScreenProps {
  onRestart: () => void;
}

// what stays after `exit` (TASK-98): the screen is out, "[Process completed]" and a button that
// turns the terminal on again; the button takes the focus, so Enter restarts
const ExitScreen: React.FC<ExitScreenProps> = ({ onRestart }) => {
  const t = useT();
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    buttonRef.current?.focus();
  }, []);

  return (
    <div className={styles.screen}>
      <p className={styles.status} role="status">
        {t({ key: "processCompleted" })}
      </p>
      <button
        ref={buttonRef}
        type="button"
        className={styles.restart}
        onClick={onRestart}
        // a held Enter that ran `exit` must not restart at once
        onKeyDown={(e) => {
          if (e.repeat) e.preventDefault();
        }}
      >
        {t({ key: "processRestart" })}
      </button>
    </div>
  );
};

export default ExitScreen;
