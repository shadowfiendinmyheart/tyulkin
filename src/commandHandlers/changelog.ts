import { TFunction } from "../localization/interfaces";
import { LogColor, LogNode } from "../store/console/interfaces";
import { withNode } from "../store/console/logNodes";

// commit subjects are "[add] description TASK-N" (see CLAUDE.md); other commits are left out
const CHANGE_TYPES = ["add", "fix", "refactor"] as const;
type ChangeType = (typeof CHANGE_TYPES)[number];

const SUBJECT_REGEXP = new RegExp(`^\\[(${CHANGE_TYPES.join("|")})\\]\\s+(\\S.*)$`);

const typeColors: Record<ChangeType, LogColor> = {
  add: "accent",
  fix: "error",
  refactor: "text",
};

// date is YYYY-MM-DD
export type GitCommit = (typeof __GIT_LOG__)[number];

export interface Change {
  date: string;
  type: ChangeType;
  description: string;
}

// how many of the latest changes `changelog` shows without --all
export const CHANGELOG_LIMIT = 10;

export const parseChanges = (commits: GitCommit[]): Change[] =>
  commits.flatMap(({ date, subject }) => {
    const match = SUBJECT_REGEXP.exec(subject.trim());
    return match ? [{ date, type: match[1] as ChangeType, description: match[2] }] : [];
  });

// the site's own history, from the commits at build time (scripts/git-log.cjs), newest first
export const changes = parseChanges(__GIT_LOG__);

// a header and a table "date  [type]  description" of the latest changes, or of all of them
export const getChangelog = (t: TFunction, allChanges: Change[], showAll: boolean): LogNode[][] => {
  if (!allChanges.length) return [[t({ key: "changelogEmpty" })]];

  const total = String(allChanges.length);
  const isCut = !showAll && allChanges.length > CHANGELOG_LIMIT;
  const shown = isCut ? allChanges.slice(0, CHANGELOG_LIMIT) : allChanges;
  const header = isCut
    ? withNode(
        (all) => t({ key: "changelog", args: { total, shown: String(shown.length), all } }),
        { type: "command", command: "changelog --all" },
      )
    : [t({ key: "changelogAll", args: { total } })];

  const rows = shown.map(({ date, type, description }): LogNode[][] => [
    [{ type: "text", text: date, color: "muted" }],
    [{ type: "text", text: `[${type}]`, color: typeColors[type] }],
    [description],
  ]);
  return [header, [{ type: "table", rows }]];
};
