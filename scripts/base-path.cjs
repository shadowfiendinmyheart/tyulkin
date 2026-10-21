// The base path of the site (GitHub Pages project site: "/tyulkin/"), shared by the webpack build,
// the e2e server (e2e/server.mjs) and playwright.config.ts. Git Bash (MSYS) on Windows rewrites
// arguments and environment variables that look like a POSIX path before the program sees them
// ("/tyulkin/" -> "C:/Program Files/Git/tyulkin/"), so the name without slashes ("tyulkin") is
// accepted too, and a rewritten one is an error, not a base path nothing is served under.

// "tyulkin", "/tyulkin" or "/tyulkin/" -> "/tyulkin/"; nothing -> "/"
const normalizeBasePath = (basePath) => {
  // `--env basePath` without a value gives `true`
  const value = typeof basePath === "string" ? basePath : "";
  // a drive letter or a backslash (a UNC path): a Windows path, MSYS rewrote "/tyulkin/" (or "/")
  if (/^[A-Za-z]:|\\/.test(value)) {
    throw new Error(
      `base path "${value}" is a Windows path: Git Bash rewrites arguments and environment ` +
        `variables starting with "/". Pass it without the leading slash ("tyulkin", or nothing ` +
        `for "/")`,
    );
  }
  const trimmed = value.replace(/^\/+|\/+$/g, "");
  return trimmed ? `/${trimmed}/` : "/";
};

module.exports = { normalizeBasePath };
