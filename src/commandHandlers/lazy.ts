import { CommandContext } from "./interfaces";

// a rarely run command whose code (or content) is a chunk of its own (TASK-105), loaded on its
// first run: it is not in the script of the first screen (`qr` with its generator too). `clear` and
// `exit` (stopLazyCommands) drop the output of one still loading, it would print into the cleared
// console
let clearsCount = 0;
export const stopLazyCommands = () => {
  clearsCount += 1;
};

// loads the chunk, then runs the command with it; a failed load (offline before the chunk was
// cached) is logged (failedKey: what didn't load) and marks the command failed, the next run
// tries again
export const runLazy = async <Chunk>(
  load: () => Promise<Chunk>,
  { log, fail, t }: Pick<CommandContext, "log" | "fail" | "t">,
  run: (chunk: Chunk) => void,
  failedKey: "commandLoadFailed" | "qrLoadFailed" = "commandLoadFailed",
) => {
  const clearsAtStart = clearsCount;
  let chunk: Chunk;
  try {
    chunk = await load();
  } catch {
    if (clearsCount !== clearsAtStart) return;
    log({ type: "text", text: t({ key: failedKey }), color: "error" });
    fail();
    return;
  }
  if (clearsCount !== clearsAtStart) return;
  run(chunk);
};
