import { SecretId, secretIds } from "../domain";
import { TFunction } from "../localization/interfaces";
import storage from "../storage";
import { LogNode } from "../store/console/interfaces";
import { withNode, withNodes } from "../store/console/logNodes";
import { secretCommands } from "./commands/secrets";

// how a found secret is listed: the command that found it (clickable) or a dictionary label
const getSecretLabel = (secret: SecretId, t: TFunction): LogNode => {
  const command = secretCommands.find((x) => x.secret === secret);
  return command ? { type: "command", command: command.name } : t({ key: "secretKonami" });
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

// marks the secret found; the first time returns the line announcing it
export const findSecret = (secret: SecretId, t: TFunction): LogNode[] | undefined => {
  const foundSecrets = storage.addFoundSecret(secret);
  if (!foundSecrets) return;
  const found = String(foundSecrets.length);
  const total = String(secretIds.length);
  return withNode((secrets) => t({ key: "secretFound", args: { found, total, secrets } }), {
    type: "command",
    command: "secrets",
  }).map((node): LogNode =>
    typeof node === "string" ? { type: "text", text: node, color: "accent" } : node,
  );
};
