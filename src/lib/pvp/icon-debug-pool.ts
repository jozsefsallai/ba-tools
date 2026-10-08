export async function runIconDebugPool<T>(
  items: readonly T[],
  concurrency: number,
  signal: AbortSignal,
  process: (item: T, index: number, lane: number) => Promise<void>,
) {
  if (!Number.isInteger(concurrency) || concurrency < 1) {
    throw new Error("Icon test concurrency must be a positive integer.");
  }

  signal.throwIfAborted();

  let next = 0;
  let failed = false;

  const outcomes = await Promise.allSettled(
    Array.from(
      { length: Math.min(concurrency, items.length) },
      async (_, lane) => {
        while (!signal.aborted && !failed) {
          const index = next++;

          if (index >= items.length) {
            return;
          }

          try {
            await process(items[index], index, lane);
          } catch (cause) {
            failed = true;
            throw cause;
          }
        }
      },
    ),
  );

  const rejection = outcomes.find((outcome) => outcome.status === "rejected");

  if (rejection?.status === "rejected") {
    throw rejection.reason;
  }

  signal.throwIfAborted();
}
