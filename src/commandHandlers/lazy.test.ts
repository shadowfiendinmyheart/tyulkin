import { describe, expect, it, vi } from "vitest";
import { createT } from "../localization";
import eng from "../localization/dictionaries/eng.json";
import { LogContent } from "../store/console/interfaces";
import { runLazy, stopLazyCommands } from "./lazy";

const t = createT(eng);

const setup = () => {
  const logs: LogContent[] = [];
  const fail = vi.fn();
  return { logs, fail, ctx: { log: (content: LogContent) => logs.push(content), fail, t } };
};

describe("runLazy (TASK-105)", () => {
  it("runs the command with the loaded chunk", async () => {
    const { logs, fail, ctx } = setup();
    await runLazy(
      () => Promise.resolve({ text: "loaded" }),
      ctx,
      ({ text }) => ctx.log(text),
    );
    expect(logs).toEqual(["loaded"]);
    expect(fail).not.toHaveBeenCalled();
  });

  it("tells a failed load and marks the command failed", async () => {
    const { logs, fail, ctx } = setup();
    const run = vi.fn();
    await runLazy(() => Promise.reject(new Error("offline")), ctx, run);
    expect(logs).toEqual([{ type: "text", text: eng.commandLoadFailed, color: "error" }]);
    expect(fail).toHaveBeenCalledOnce();
    expect(run).not.toHaveBeenCalled();
  });

  it("drops the output of a command still loading when the console is cleared", async () => {
    const { logs, fail, ctx } = setup();
    const run = vi.fn();
    const loaded = runLazy(() => Promise.resolve({}), ctx, run);
    const failed = runLazy(() => Promise.reject(new Error("offline")), ctx, run);
    stopLazyCommands();
    await Promise.all([loaded, failed]);
    expect(run).not.toHaveBeenCalled();
    expect(logs).toEqual([]);
    expect(fail).not.toHaveBeenCalled();
  });
});
