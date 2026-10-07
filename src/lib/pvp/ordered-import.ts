export async function runOrderedScreenshotImport<T>({
  count,
  signal,
  extract,
  save,
  onError,
}: {
  count: number;
  signal: AbortSignal;
  extract: (index: number, lane: number) => Promise<T>;
  save: (index: number, value: T) => Promise<void>;
  onError: (index: number, phase: "extract" | "save", error: unknown) => void;
}) {
  type Outcome = { value: T } | { error: unknown };

  const slots = Array.from({ length: count }, () => {
    let resolve!: (outcome: Outcome) => void;

    let release!: () => void;

    const promise = new Promise<Outcome>((settle) => {
      resolve = settle;
    });

    const consumed = new Promise<void>((settle) => {
      release = settle;
    });

    return { promise, resolve, consumed, release };
  });

  const cancel = () => {
    for (const slot of slots) {
      slot.resolve({ error: signal.reason });
      slot.release();
    }
  };

  signal.addEventListener("abort", cancel, { once: true });

  if (signal.aborted) {
    cancel();
  }

  let next = 0;

  const workers = Array.from(
    { length: Math.min(2, count) },
    async (_, lane) => {
      while (!signal.aborted && next < count) {
        const index = next++;

        try {
          slots[index].resolve({ value: await extract(index, lane) });
        } catch (error) {
          if (!signal.aborted) {
            onError(index, "extract", error);
          }

          slots[index].resolve({ error });
        }

        // Bound prepared screenshots as well as active OCR work
        await slots[index].consumed;
      }
    },
  );

  try {
    for (let index = 0; index < count; index++) {
      if (signal.aborted) {
        break;
      }

      const outcome = await slots[index].promise;

      if (signal.aborted) {
        break;
      }

      if ("error" in outcome) {
        slots[index].release();
        slots[index].promise = Promise.resolve({ error: undefined });
        continue;
      }

      try {
        await save(index, outcome.value);
      } catch (error) {
        if (!signal.aborted) {
          onError(index, "save", error);
        }
      } finally {
        slots[index].release();

        // Drop the resolved battle and its pixel crops after saving
        slots[index].promise = Promise.resolve({ error: undefined });
      }
    }
  } finally {
    // Release waiting lanes even if the consumer is interrupted
    cancel();
    await Promise.all(workers);
    signal.removeEventListener("abort", cancel);
  }
}
