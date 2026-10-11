export type NavigationGuardRegistration = {
  isEnabled: () => boolean;
  setActive: (active: boolean) => void;
};

export function createNavigationGuardController() {
  const registrations = new Map<string, NavigationGuardRegistration>();

  const listeners = new Set<() => void>();

  let pending: {
    guards: [string, NavigationGuardRegistration][];
    index: number;
    resolve: (accepted: boolean) => void;
  } | null = null;

  function notify() {
    for (const listener of listeners) {
      listener();
    }
  }

  function finish(accepted: boolean) {
    if (!pending) {
      return;
    }

    const request = pending;
    pending = null;
    request.guards[request.index]?.[1].setActive(false);

    notify();

    request.resolve(accepted);
  }

  function advance() {
    if (!pending) {
      return;
    }

    while (pending.index < pending.guards.length) {
      const [id, guard] = pending.guards[pending.index];

      if (registrations.get(id) === guard && guard.isEnabled()) {
        guard.setActive(true);
        return;
      }

      pending.index++;
    }

    finish(true);
  }

  function hasEnabledGuards() {
    return Array.from(registrations.values()).some((guard) =>
      guard.isEnabled(),
    );
  }

  function confirm() {
    if (pending) {
      return Promise.resolve(false);
    }

    const guards = Array.from(registrations).filter(([, guard]) =>
      guard.isEnabled(),
    );

    if (guards.length === 0) {
      return Promise.resolve(true);
    }

    return new Promise<boolean>((resolve) => {
      pending = { guards, index: 0, resolve };
      advance();
      notify();
    });
  }

  return {
    hasEnabledGuards,
    isPending: () => pending !== null,
    notify,
    confirm,
    cancel: () => finish(false),
    request(action: () => void) {
      if (pending) {
        return;
      }

      if (!hasEnabledGuards()) {
        action();
        return;
      }

      void confirm().then((accepted) => {
        if (accepted) {
          action();
        }
      });
    },
    register(id: string, guard: NavigationGuardRegistration) {
      registrations.set(id, guard);

      notify();

      return () => {
        if (pending?.guards.slice(pending.index).some(([key]) => key === id)) {
          finish(false);
        }

        registrations.delete(id);
        notify();
      };
    },
    accept(id: string) {
      if (!pending || pending.guards[pending.index]?.[0] !== id) {
        return;
      }

      pending.guards[pending.index][1].setActive(false);
      pending.index++;

      advance();
    },
    reject(id: string) {
      if (pending?.guards[pending.index]?.[0] === id) {
        finish(false);
      }
    },
    subscribe(listener: () => void) {
      listeners.add(listener);

      return () => {
        listeners.delete(listener);
      };
    },
  };
}

export type NavigationGuardController = ReturnType<
  typeof createNavigationGuardController
>;

export function isHashOnlyNavigation(href: string) {
  const destination = new URL(href, window.location.href);

  return (
    destination.origin === window.location.origin &&
    destination.pathname === window.location.pathname &&
    destination.search === window.location.search &&
    destination.hash !== window.location.hash
  );
}
