// The commits of the repo for the `changelog` command (TASK-69), read at build time. Parsing and
// filtering are in src/commandHandlers/changelog.ts; here only the raw log is taken.
const { execFileSync } = require("child_process");

// fields of a commit are separated by the unit separator, commits by the record separator:
// neither occurs in a commit subject
const FIELD = "\x1f";
const RECORD = "\x1e";

// [{ date, subject }], newest first; empty without git or outside a repo (a source archive):
// the site is still built, the command says the history is not available. In CI (the published
// build) the history must be there: any failure fails the build
const getGitLog = () => {
  const git = (args) =>
    execFileSync("git", args, {
      cwd: __dirname,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      // above the default 1 MB, which a long history would overflow
      maxBuffer: 64 * 1024 * 1024,
    });
  try {
    const log = git(["log", "--no-merges", `--pretty=format:%as${FIELD}%s${RECORD}`]);
    // a shallow clone (actions/checkout by default) has only the last commits
    if (git(["rev-parse", "--is-shallow-repository"]).trim() === "true") {
      console.warn("git-log: shallow clone, the changelog is incomplete (fetch-depth: 0)");
    }
    return log
      .split(RECORD)
      .map((record) => record.trim())
      .filter(Boolean)
      .map((record) => {
        const [date, subject] = record.split(FIELD);
        return { date, subject };
      });
  } catch (error) {
    if (process.env.CI) throw error;
    console.warn(`git-log: no git history, the changelog is empty (${error.message})`);
    return [];
  }
};

module.exports = { getGitLog };
