// a short buzz on a failed command (TASK-94), with `set sound on` only: the visitor asked for
// feedback; there is no vibration in desktop browsers and in Safari, so it is just skipped
const ERROR_VIBRATION_MS = [40, 60, 40];

export const vibrateError = () => {
  try {
    if (typeof navigator.vibrate === "function") navigator.vibrate(ERROR_VIBRATION_MS);
  } catch {
    // ignore: vibration is decoration, as the key sound is
  }
};
