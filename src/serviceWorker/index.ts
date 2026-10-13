// The service worker (scripts/service-worker.js) makes the published site work offline and
// installable. Only the production build has one (__SERVICE_WORKER__ is its file name there, empty
// on the dev server); the dev server instead drops a worker left on its origin by a production build
// served there before, so it never answers with stale files.
export const registerServiceWorker = (fileName: string = __SERVICE_WORKER__) => {
  if (!("serviceWorker" in navigator)) return;
  if (!fileName) {
    navigator.serviceWorker
      .getRegistrations()
      .then((registrations) => registrations.forEach((registration) => registration.unregister()))
      .catch(() => {});
    return;
  }
  // after the page has loaded: precaching doesn't compete with the first render
  window.addEventListener("load", () => {
    // the whole site is its scope, deep links included; failing to register only loses offline mode
    navigator.serviceWorker
      .register(__BASE_PATH__ + fileName, { scope: __BASE_PATH__ })
      .catch(() => {});
  });
};
