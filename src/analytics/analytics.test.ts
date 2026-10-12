import { afterEach, expect, it, vi } from "vitest";
import { trackCommand, trackUnknownCommand } from ".";

afterEach(() => {
  delete window.umami;
  document.head.innerHTML = "";
});

// the deferred script as the build adds it; a new element per test, so queues don't leak
const addScript = () => {
  const script = document.createElement("script");
  script.dataset.websiteId = "id";
  document.head.append(script);
  return script;
};

it("does nothing without the analytics script", () => {
  expect(() => trackCommand("help")).not.toThrow();
  expect(() => trackUnknownCommand("halp")).not.toThrow();
});

it("sends commands and the first words of unknown input without personal data", () => {
  const track = vi.fn();
  window.umami = { track };

  trackCommand("about");
  trackUnknownCommand("  Mail   ME at John@Mail.com");
  trackUnknownCommand("John@Mail.com 8-800-555");
  trackUnknownCommand("x".repeat(100));

  expect(track.mock.calls).toEqual([
    ["command", { name: "about" }],
    ["unknown-command", { input: "mail me" }],
    ["unknown-command", { input: "<email> #-#-#" }],
    ["unknown-command", { input: "x".repeat(40) }],
  ]);
});

it("keeps events until the deferred script is loaded", () => {
  const script = addScript();

  trackCommand("projects");
  trackCommand("about");

  const track = vi.fn();
  window.umami = { track };
  script.dispatchEvent(new Event("load"));
  script.dispatchEvent(new Event("load"));

  expect(track.mock.calls).toEqual([
    ["command", { name: "projects" }],
    ["command", { name: "about" }],
  ]);
});

it("drops the events of a blocked script", () => {
  const script = addScript();
  trackCommand("projects");
  script.dispatchEvent(new Event("error"));
  trackCommand("about");

  const track = vi.fn();
  window.umami = { track };
  script.dispatchEvent(new Event("load"));
  expect(track).not.toHaveBeenCalled();
});

it("swallows errors of the analytics script", () => {
  window.umami = {
    track: () => {
      throw new Error("blocked");
    },
  };
  expect(() => trackCommand("help")).not.toThrow();
});
