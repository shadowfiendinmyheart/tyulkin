import React from "react";
import { getAchievementText } from "../../commandHandlers/secrets";
import { useConsoleContext } from "../../context/consoleContext";
import { useLocalization } from "../../context/localizationContext";

import styles from "./styles.module.scss";

// "Achievement unlocked: vim (3/10)" in the corner when a secret is found the first time (TASK-97);
// hidden by ConsoleSessionLayout after a while: the page may change meanwhile (`cd`, `gui`)
const AchievementToast: React.FC = () => {
  const { consoleState } = useConsoleContext();
  const { achievement } = consoleState;
  const { t } = useLocalization();

  return (
    // always in the accessibility tree: a live region added together with its text isn't announced
    <div className={styles.region} role="status" aria-live="polite">
      {achievement && (
        // keyed: a newer toast replaces the shown one and slides in again
        <p key={achievement.id} className={styles.toast}>
          {getAchievementText(achievement, t)}
        </p>
      )}
    </div>
  );
};

export default AchievementToast;
