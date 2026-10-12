import { configure } from "@testing-library/react";

// findBy*/waitFor wait 1 s by default. The app renders its pages outside act (after the
// dictionary import, after a route change), and a cold first render of the console takes over
// a second when the full suite loads the CPU (TASK-79); a passing test doesn't wait any longer
configure({ asyncUtilTimeout: 5000 });
