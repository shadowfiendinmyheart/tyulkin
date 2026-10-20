import { SecretId, secretIds } from "../domain";
import { TFunction } from "../localization/interfaces";
import storage from "../storage";
import { showAchievement } from "../store/console/actions";
import { Achievement, ActionShowAchievement, LogNode } from "../store/console/interfaces";
import { withNodes } from "../store/console/logNodes";
import { secretCommands } from "./commands/secrets";

// the command that finds the secret; none for the Konami code
const getSecretCommand = (secret: SecretId) =>
  secretCommands.find((x) => x.secret === secret)?.name;

// how a found secret is listed: the command that found it (clickable) or a dictionary label
const getSecretLabel = (secret: SecretId, t: TFunction): LogNode => {
  const command = getSecretCommand(secret);
  return command ? { type: "command", command } : t({ key: "secretKonami" });
};

// the output of `secrets`: progress and the secrets found so far
export const getSecretsLog = (t: TFunction): LogNode[] => {
  const found = storage.getFoundSecrets();
  const total = String(secretIds.length);
  const progress =
    found.length === secretIds.length
      ? t({ key: "secretsAll", args: { total } })
      : t({ key: "secretsProgress", args: { found: String(found.length), total } });
  if (!found.length) return [progress];
  const list = withNodes(
    (placeholders) => t({ key: "secretsList", args: { list: placeholders.join(", ") } }),
    found.map((secret) => getSecretLabel(secret, t)),
  );
  return [progress, "\n", ...list];
};

// marks the secret found; the first time returns its toast (TASK-97)
export const findSecret = (secret: SecretId): ActionShowAchievement | undefined => {
  const foundSecrets = storage.addFoundSecret(secret);
  return foundSecrets && showAchievement(secret, foundSecrets.length);
};

// the toast text: "Achievement unlocked: vim (3/10)"
export const getAchievementText = ({ secret, found }: Achievement, t: TFunction): string => {
  const name = getSecretCommand(secret) ?? t({ key: "secretKonami" });
  return t({
    key: "achievementUnlocked",
    args: { name, found: String(found), total: String(secretIds.length) },
  });
};
