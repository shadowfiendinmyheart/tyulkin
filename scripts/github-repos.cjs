// The owner's GitHub repositories for the `projects` command (TASK-68), fetched at build time: the
// GitHub API is not called from the browser (rate limits, speed). Which repositories are shown is
// the owner's choice: GITHUB_REPOS="owner/repo, owner/other" (the published build: a repository
// variable in ci.yml). Rendering is in src/commandHandlers/projects.ts.

const REPO_REGEXP = /^[\w.-]+\/[\w.-]+$/;
const TIMEOUT_MS = 10_000;

// a mistake in GITHUB_REPOS, not an outage: fails the build instead of quietly dropping the list
class RepoListError extends Error {}

// "owner/repo, owner/other" -> ["owner/repo", "owner/other"]
const parseRepoList = (value) => {
  const repos = (value || "").split(/[\s,]+/).filter(Boolean);
  const invalid = repos.filter((repo) => !REPO_REGEXP.test(repo));
  if (invalid.length) {
    throw new RepoListError(`GITHUB_REPOS: expected "owner/repo", got ${invalid.join(", ")}`);
  }
  return [...new Set(repos)];
};

const fetchRepo = async (repo) => {
  const headers = { Accept: "application/vnd.github+json", "User-Agent": "tyulkin-build" };
  // optional: lifts the rate limit (60 requests an hour per IP without it, shared on CI runners)
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const response = await fetch(`https://api.github.com/repos/${repo}`, {
    headers,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  // a typo, a deleted or a private repository
  if (response.status === 404) {
    throw new RepoListError(`GITHUB_REPOS: ${repo} is not a public repository on GitHub`);
  }
  if (!response.ok) throw new Error(`${repo}: ${response.status} ${response.statusText}`);
  const data = await response.json();
  return {
    name: data.name,
    // made here, not taken from the response: the link always leads to github.com
    url: `https://github.com/${data.full_name}`,
    description: data.description || "",
    language: data.language || "",
    stars: data.stargazers_count || 0,
  };
};

// [{ name, url, description, language, stars }] in the order of GITHUB_REPOS. Empty without the
// setting (no network at all) or when GitHub can't be reached (network, rate limit, 5xx): then
// `projects` shows the text from the dictionaries, as before, and the build goes on. A wrong entry
// in the setting fails the build
const getGithubRepos = async () => {
  const repos = parseRepoList(process.env.GITHUB_REPOS);
  if (!repos.length) return [];
  try {
    return await Promise.all(repos.map(fetchRepo));
  } catch (error) {
    if (error instanceof RepoListError) throw error;
    console.warn(
      `github-repos: GitHub API unavailable, projects use the dictionary text (${error.message})`,
    );
    return [];
  }
};

module.exports = { getGithubRepos, parseRepoList };
