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

function abortError() {
  return new DOMException("Scan canceled", "AbortError");
}

/**
 * Only an unsupported source or a failed decode means the format is the
 * problem; other media errors (like running out of memory) are plain failures.
 */
function mediaError(video: HTMLVideoElement) {
  const code = video.error?.code;

  if (
    code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED ||
    code === MediaError.MEDIA_ERR_DECODE
  ) {
    return new UnsupportedVideoError();
  }

  return new Error(
    `The video couldn't be played: ${video.error?.message || `error ${code}`}`,
  );
}

/** Resolves on the event, rejects on a media error, a timeout or an abort. */
function waitFor(
  video: HTMLVideoElement,
  event: string,
  signal: AbortSignal,
  timeoutMessage: string,
) {
  return new Promise<void>((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timeout);
      video.removeEventListener(event, onEvent);
      video.removeEventListener("error", onError);
      signal.removeEventListener("abort", onAbort);
    };
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = () => {
      cleanup();
      reject(mediaError(video));
    };
    const onAbort = () => {
      cleanup();
      reject(abortError());
    };
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(timeoutMessage));
    }, LOAD_TIMEOUT);

    video.addEventListener(event, onEvent);
    video.addEventListener("error", onError);
    signal.addEventListener("abort", onAbort);
  });
}

/**
 * Waits for the video's size and length. iOS doesn't load any frames until the
 * video plays (it ignores preload), so waiting for the first frame here would
 * never end there.
 */
async function loadMetadata(video: HTMLVideoElement, signal: AbortSignal) {
  if (video.readyState < HTMLMediaElement.HAVE_METADATA) {
    await waitFor(
      video,
      "loadedmetadata",
      signal,
      "The video's details didn't load",
    );
  }

  // A video track the browser can't decode often has no size
  if (video.videoWidth === 0) {
    throw new UnsupportedVideoError();
  }
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
  video.disableRemotePlayback = true;
  // WebKit pauses muted videos that aren't on the page or on the screen, so
  // the video is kept on screen, too small and faint to notice
  Object.assign(video.style, {
    position: "fixed",
    left: "0",
    top: "0",
    width: "1px",
    height: "1px",
    opacity: "0.01",
    pointerEvents: "none",
  });
  video.setAttribute("aria-hidden", "true");
  document.body.append(video);
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

  // Playing until the end, then seeking (to fill in what playback skipped, or
  // throughout when it may not play), when it mustn't start playing again
  let seeking = false;

  const shouldPlay = () =>
    !seeking &&
    pending.size < MAX_PENDING &&
    !document.hidden &&
    !signal.aborted;

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

  // Steps through the video by seeking, for when it isn't allowed to play
  // (like in iOS Low Power Mode). Slower, but sees every sampled frame
  async function seekThrough() {
    for (let time = 0; time < video.duration; time += SAMPLE_INTERVAL) {
      while (pending.size >= MAX_PENDING) {
        await Promise.race(pending);
      }

      if (signal.aborted) {
        throw abortError();
      }

      video.currentTime = time;
      await waitFor(video, "seeked", signal, "The video stopped loading");
      consider(time);
    }
  }

  try {
    await loadMetadata(video, signal);
    document.addEventListener("visibilitychange", onVisibilityChange);
    video.playbackRate = PLAYBACK_RATE;

    const played = await new Promise<boolean>((resolve, reject) => {
      let started = false;
      // iOS only loads the video once it plays, so this is where a video that
      // won't load shows up
      const stalled = setTimeout(() => {
        if (!started) {
          reject(new Error("The video didn't start playing"));
        }
      }, LOAD_TIMEOUT);
      const finish = (result: boolean) => {
        clearTimeout(stalled);
        resolve(result);
      };

      const onVideoFrame = (
        _now: number,
        metadata: VideoFrameCallbackMetadata,
      ) => {
        // Seeks show frames too, which the seeking code reads itself
        if (signal.aborted || seeking) {
          return;
        }

        started = true;
        consider(metadata.mediaTime);
        video.requestVideoFrameCallback(onVideoFrame);
      };

      video.requestVideoFrameCallback(onVideoFrame);
      video.addEventListener("ended", () => finish(true), {
        once: true,
      });
      video.addEventListener(
        "error",
        () => {
          clearTimeout(stalled);
          reject(mediaError(video));
        },
        {
          once: true,
        },
      );
      signal.addEventListener("abort", () => {
        clearTimeout(stalled);
        reject(abortError());
      });

      video.play().catch((error: unknown) => {
        if (!(error instanceof DOMException)) {
          clearTimeout(stalled);
          reject(error);
        } else if (error.name === "NotAllowedError" && !started) {
          // Autoplay is blocked, even muted
          finish(false);
        }
        // A pause right after starting interrupts play() (AbortError), which
        // isn't an error
      });
    });

    seeking = true;
    document.removeEventListener("visibilitychange", onVisibilityChange);

    if (!played) {
      await seekThrough();
    }

    // Fill in what playback skipped, a frame every MAX_GAP
    for (const [from, to] of holes) {
      for (let time = from + MAX_GAP; time < to; time += MAX_GAP) {
        while (pending.size >= MAX_PENDING) {
          await Promise.race(pending);
        }

        if (signal.aborted) {
          throw abortError();
        }

        video.currentTime = time;
        await waitFor(video, "seeked", signal, "The video stopped loading");
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
    video.remove();
  }
}
