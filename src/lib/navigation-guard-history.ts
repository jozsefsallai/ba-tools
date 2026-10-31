import {
  type NavigationGuardController,
  isHashOnlyNavigation,
} from "@/lib/navigation-guard";
import { v4 as uuid } from "uuid";

const STATE_KEY = "__baNavigationGuard";

type Position = { session: string; index: number };

function readPosition(state: unknown): Position | null {
  if (!state || typeof state !== "object" || !(STATE_KEY in state)) {
    return null;
  }

  const position = state[STATE_KEY];

  if (
    !position ||
    typeof position !== "object" ||
    !("session" in position) ||
    typeof position.session !== "string" ||
    !("index" in position) ||
    !Number.isSafeInteger(position.index)
  ) {
    return null;
  }

  return position as Position;
}

export function installNavigationGuardHistory(
  controller: NavigationGuardController,
) {
  const history = window.history;
  const originalPush = history.pushState;
  const originalReplace = history.replaceState;

  let installed = true;

  let position = readPosition(history.state) ?? {
    session: uuid(),
    index: 0,
  };

  let currentUrl = window.location.href;
  let currentState = history.state;

  let traversal: {
    origin: Position;
    target: Position;
    phase: "restoring" | "confirming" | "replaying";
    confirmStarted: boolean;
    decision?: boolean;
  } | null = null;

  function stamp(state: unknown, next: Position) {
    return { ...(state as Record<string, unknown>), [STATE_KEY]: next };
  }

  originalReplace.call(history, stamp(history.state, position), "");
  currentState = history.state;

  const push: History["pushState"] = function (
    this: History,
    state,
    unused,
    url,
  ) {
    if (!installed) {
      return originalPush.call(this, state, unused, url);
    }

    const current = readPosition(this.state) ?? position;
    const next = { session: current.session, index: current.index + 1 };

    originalPush.call(this, stamp(state, next), unused, url);

    position = next;
    currentUrl = window.location.href;
    currentState = history.state;
  };

  const replace: History["replaceState"] = function (
    this: History,
    state,
    unused,
    url,
  ) {
    if (!installed) {
      return originalReplace.call(this, state, unused, url);
    }

    const next = readPosition(this.state) ?? position;
    originalReplace.call(this, stamp(state, next), unused, url);

    position = next;
    currentUrl = window.location.href;
    currentState = history.state;
  };

  history.pushState = push;
  history.replaceState = replace;

  function atOrigin() {
    const request = traversal;
    if (!request) {
      return;
    }

    if (request.decision === false) {
      traversal = null;
    } else if (request.decision === true) {
      request.phase = "replaying";
      history.go(request.target.index - request.origin.index);
    } else if (!request.confirmStarted) {
      request.confirmStarted = true;
      request.phase = "confirming";

      void controller.confirm().then((accepted) => {
        if (!installed || traversal !== request) {
          return;
        }

        request.decision = accepted;

        const current = readPosition(history.state);
        if (current?.index === request.origin.index) {
          atOrigin();
        } else if (current?.session === request.origin.session) {
          request.phase = "restoring";
          history.go(request.origin.index - current.index);
        }
      });
    }
  }

  function onPopState(event: PopStateEvent) {
    const next = readPosition(event.state);

    if (!next || next.session !== position.session) {
      if (traversal) {
        controller.cancel();
      }

      traversal = null;

      if (next) {
        position = next;
      } else if (!isHashOnlyNavigation(currentUrl)) {
        position = { session: uuid(), index: 0 };
        originalReplace.call(history, stamp(history.state, position), "");
      }

      currentUrl = window.location.href;

      if (next) {
        currentState = event.state;
      }

      return;
    }

    if (traversal) {
      if (
        traversal.phase === "replaying" &&
        next.index === traversal.target.index
      ) {
        traversal = null;
        position = next;
        currentUrl = window.location.href;
        currentState = event.state;
        return;
      }

      event.stopImmediatePropagation();

      if (next.index === traversal.origin.index) {
        position = next;
        currentUrl = window.location.href;
        currentState = event.state;
        atOrigin();
      } else {
        const destination =
          traversal.phase === "replaying"
            ? traversal.target.index
            : traversal.origin.index;

        history.go(destination - next.index);
      }

      return;
    }

    if (
      next.index === position.index ||
      isHashOnlyNavigation(currentUrl) ||
      (!controller.hasEnabledGuards() && !controller.isPending())
    ) {
      position = next;
      currentUrl = window.location.href;
      currentState = event.state;
      return;
    }

    event.stopImmediatePropagation();

    traversal = {
      origin: position,
      target: next,
      phase: "restoring",
      confirmStarted: false,
    };

    history.go(position.index - next.index);
  }

  function onHashChange() {
    if (traversal) {
      return;
    }

    const next = readPosition(history.state);

    if (next?.session === position.session) {
      position = next;
    } else {
      position = { session: position.session, index: position.index + 1 };

      originalReplace.call(
        history,
        stamp({ ...currentState, ...history.state }, position),
        "",
      );
    }

    currentUrl = window.location.href;
    currentState = history.state;
  }

  window.addEventListener("popstate", onPopState, true);
  window.addEventListener("hashchange", onHashChange);

  return () => {
    installed = false;
    traversal = null;

    window.removeEventListener("popstate", onPopState, true);
    window.removeEventListener("hashchange", onHashChange);

    if (history.pushState === push) {
      history.pushState = originalPush;
    }

    if (history.replaceState === replace) {
      history.replaceState = originalReplace;
    }
  };
}
