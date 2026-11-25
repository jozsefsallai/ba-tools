/**
 * Picks the frames of a screen recording worth scanning: one whenever the list
 * has come to rest somewhere new, and one every so often while it keeps moving,
 * so that each frame overlaps the one before.
 *
 * The video is played, which is much faster than seeking frame by frame. The
 * browser skips frames when it's busy, though, so stretches it skipped are
 * gone back to afterwards by seeking.
 */

// How often frames are looked at, in seconds of the video
const SAMPLE_INTERVAL = 1 / 8;

// Longest time between scanned frames while the list keeps moving. A fast
// swipe on a phone moves the list by more than a screen in half a second
const MAX_GAP = 0.25;

// Mean difference of the small grey frames, in levels out of 255
const STILL = 1.5;
const CHANGED = 3;

const THUMB_WIDTH = 64;
const THUMB_HEIGHT = 40;

// Larger frames are shrunk, as screenshots are
const MAX_WIDTH = 2400;

// Frames waiting to be scanned before the video is paused
const MAX_PENDING = 8;

const PLAYBACK_RATE = 4;

// How long a video may take to show its first frame before it's given up on
const LOAD_TIMEOUT = 15_000;

/** The browser can't decode the video (HEVC and AV1 aren't supported everywhere). */
export class UnsupportedVideoError extends Error {
  constructor() {
    super("The browser can't play this video");
    this.name = "UnsupportedVideoError";
  }
}

function difference(a: Uint8Array, b: Uint8Array) {
  let total = 0;

  for (let i = 0; i < a.length; i++) {
    total += Math.abs(a[i] - b[i]);
  }

  return total / a.length;
}

function loadVideo(video: HTMLVideoElement, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new UnsupportedVideoError()),
      LOAD_TIMEOUT,
    );
    const done = () => clearTimeout(timeout);

    video.addEventListener(
      "loadeddata",
      () => {
        done();

        if (video.videoWidth === 0) {
          reject(new UnsupportedVideoError());
        } else {
          resolve();
        }
      },
      {
        once: true,
      },
    );
    video.addEventListener(
      "error",
      () => {
        done();
        reject(new UnsupportedVideoError());
      },
      {
        once: true,
      },
    );
    signal.addEventListener("abort", () => {
      done();
      reject(new DOMException("Scan canceled", "AbortError"));
    });
  });
}

export async function readVideoFrames(
  file: Blob,
  {
    onFrame,
    onProgress,
    signal,
  }: {
    /** Takes over the frame; scanning it is what the returned promise waits for */
    onFrame: (frame: ImageBitmap, time: number) => Promise<void>;
    onProgress: (fraction: number) => void;
    signal: AbortSignal;
  },
) {
  const video = document.createElement("video");

  if (!("requestVideoFrameCallback" in video)) {
    throw new UnsupportedVideoError();
  }

  const url = URL.createObjectURL(file);
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  video.src = url;

  const thumbCanvas = document.createElement("canvas");
  thumbCanvas.width = THUMB_WIDTH;
  thumbCanvas.height = THUMB_HEIGHT;
  const thumbContext = thumbCanvas.getContext("2d", {
    willReadFrequently: true,
  });

  if (!thumbContext) {
    throw new Error("Canvas rendering unavailable");
  }

  const pending = new Set<Promise<void>>();
  // Stretches of the video that playback skipped
  const holes: [
    number,
    number,
  ][] = [];
  let lastSample = Number.NEGATIVE_INFINITY;
  let lastRead = Number.NEGATIVE_INFINITY;
  let previous: Uint8Array | null = null;
  let read: Uint8Array | null = null;
  let failure: unknown = null;
  let reportedPercent = -1;

  const shouldPlay = () =>
    pending.size < MAX_PENDING && !document.hidden && !signal.aborted;

  const resume = () => {
    if (shouldPlay() && video.paused && !video.ended) {
      video.play().catch(() => {});
    }
  };

  const onVisibilityChange = () => {
    if (document.hidden) {
      video.pause();
    } else {
      resume();
    }
  };

  function thumbnail() {
    thumbContext?.drawImage(video, 0, 0, THUMB_WIDTH, THUMB_HEIGHT);
    const { data } = (thumbContext as CanvasRenderingContext2D).getImageData(
      0,
      0,
      THUMB_WIDTH,
      THUMB_HEIGHT,
    );
    const grey = new Uint8Array(THUMB_WIDTH * THUMB_HEIGHT);

    for (let i = 0; i < grey.length; i++) {
      grey[i] = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3;
    }

    return grey;
  }

  function consider(time: number) {
    if (time - lastSample < SAMPLE_INTERVAL) {
      return;
    }

    if (time - lastSample > MAX_GAP + SAMPLE_INTERVAL && lastSample >= 0) {
      holes.push([
        lastSample,
        time,
      ]);
    }

    lastSample = time;

    // Whole percents only, so the page isn't redrawn for every frame
    const percent =
      video.duration > 0 ? Math.floor((time / video.duration) * 100) : 0;

    if (percent !== reportedPercent) {
      reportedPercent = percent;
      onProgress(percent / 100);
    }

    const grey = thumbnail();
    const motion = previous ? difference(grey, previous) : 0;
    const change = read ? difference(grey, read) : Number.POSITIVE_INFINITY;
    previous = grey;

    if (change < CHANGED || (motion >= STILL && time - lastRead < MAX_GAP)) {
      return;
    }

    lastRead = time;
    read = grey;
    readFrame(time);
  }

  function readFrame(time: number) {
    const scale = Math.min(1, MAX_WIDTH / video.videoWidth);
    const job = createImageBitmap(video, {
      resizeWidth: Math.round(video.videoWidth * scale),
      resizeHeight: Math.round(video.videoHeight * scale),
      resizeQuality: "high",
    })
      .then((frame) => onFrame(frame, time))
      .catch((error) => {
        failure ??= error;
      })
      .finally(() => {
        pending.delete(job);
        resume();
      });

    pending.add(job);

    if (!shouldPlay()) {
      video.pause();
    }
  }

  try {
    await loadVideo(video, signal);
    document.addEventListener("visibilitychange", onVisibilityChange);
    video.playbackRate = PLAYBACK_RATE;

    await new Promise<void>((resolve, reject) => {
      const onVideoFrame = (
        _now: number,
        metadata: VideoFrameCallbackMetadata,
      ) => {
        if (signal.aborted) {
          return;
        }

        consider(metadata.mediaTime);
        video.requestVideoFrameCallback(onVideoFrame);
      };

      video.requestVideoFrameCallback(onVideoFrame);
      video.addEventListener("ended", () => resolve(), {
        once: true,
      });
      video.addEventListener(
        "error",
        () => reject(new UnsupportedVideoError()),
        {
          once: true,
        },
      );
      signal.addEventListener("abort", () =>
        reject(new DOMException("Scan canceled", "AbortError")),
      );

      // A pause right after starting interrupts play(), which isn't an error
      video.play().catch((error: unknown) => {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          reject(error);
        }
      });
    });

    // Fill in what playback skipped, a frame every MAX_GAP
    for (const [from, to] of holes) {
      for (let time = from + MAX_GAP; time < to; time += MAX_GAP) {
        while (pending.size >= MAX_PENDING) {
          await Promise.race(pending);
        }

        if (signal.aborted) {
          throw new DOMException("Scan canceled", "AbortError");
        }

        video.currentTime = time;
        await new Promise((resolve) =>
          video.addEventListener("seeked", resolve, {
            once: true,
          }),
        );
        readFrame(time);
      }
    }

    await Promise.all(pending);
    onProgress(1);

    if (failure) {
      throw failure;
    }
  } finally {
    document.removeEventListener("visibilitychange", onVisibilityChange);
    video.pause();
    video.removeAttribute("src");
    video.load();
    URL.revokeObjectURL(url);
  }
}
