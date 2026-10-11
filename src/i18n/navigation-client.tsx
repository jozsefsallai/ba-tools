"use client";

import { useNavigationGuardController } from "@/hooks/use-navigation-guard";
import {
  Link as LocaleLink,
  getPathname,
  useRouter as useLocaleRouter,
} from "@/i18n/navigation-base";
import { isHashOnlyNavigation } from "@/lib/navigation-guard";
import { useLocale } from "next-intl";
import NextLink from "next/link";
import { useRouter as useNextRouter } from "next/navigation";
import {
  type ComponentPropsWithoutRef,
  forwardRef,
  useCallback,
  useMemo,
  useRef,
} from "react";

type LinkProps = ComponentPropsWithoutRef<typeof LocaleLink>;

function linkHref(href: LinkProps["href"]) {
  if (typeof href === "string") {
    return href;
  }

  const query = new URLSearchParams();

  if (href.query && typeof href.query === "object") {
    for (const [key, value] of Object.entries(href.query)) {
      for (const item of Array.isArray(value) ? value : [value]) {
        query.append(key, item == null ? "" : String(item));
      }
    }
  }

  const search =
    href.search ??
    (typeof href.query === "string" ? href.query : query.toString());

  const hash = href.hash ?? "";

  const searchSuffix =
    search && !search.startsWith("?") ? `?${search}` : search;

  const hashSuffix = hash && !hash.startsWith("#") ? `#${hash}` : hash;

  return `${href.pathname ?? ""}${searchSuffix}${hashSuffix}`;
}

function localizeLinkPathname(
  pathname: string,
  locale: NonNullable<LinkProps["locale"]>,
) {
  return pathname.startsWith("/") && !pathname.startsWith("//")
    ? getPathname({ href: pathname, locale, forcePrefix: true })
    : pathname;
}

export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { onNavigate, locale, href, replace, scroll, transitionTypes, ...props },
  ref,
) {
  const controller = useNavigationGuardController();
  const nextRouter = useNextRouter();
  const localeRouter = useLocaleRouter();

  const anchor = useRef<HTMLAnchorElement | null>(null);

  const setRef = useCallback(
    (element: HTMLAnchorElement | null) => {
      anchor.current = element;

      if (typeof ref === "function") {
        return ref(element);
      }

      if (ref) {
        ref.current = element;
      }
    },
    [ref],
  );

  const handleNavigate: NonNullable<LinkProps["onNavigate"]> = (event) => {
    let prevented = false;

    onNavigate?.({
      preventDefault() {
        prevented = true;
        event.preventDefault();
      },
    });

    if (prevented) {
      return;
    }

    const destination = anchor.current?.href;
    if (!destination) {
      return;
    }

    const needsGuard =
      controller &&
      !isHashOnlyNavigation(destination) &&
      (controller.isPending() || controller.hasEnabledGuards());

    if (!needsGuard && locale == null) {
      return;
    }

    event.preventDefault();

    const navigate = () => {
      const options = { scroll, transitionTypes };

      if (locale != null) {
        const method = replace ? localeRouter.replace : localeRouter.push;
        method(linkHref(href), { ...options, locale });
      } else {
        const method = replace ? nextRouter.replace : nextRouter.push;
        method(destination, options);
      }
    };

    if (needsGuard) {
      controller.request(navigate);
    } else {
      navigate();
    }
  };

  const common = {
    ...props,
    ref: setRef,
    replace,
    scroll,
    transitionTypes,
    onNavigate: handleNavigate,
  };

  if (locale == null) {
    return <LocaleLink {...common} href={href} />;
  }

  const localizedHref =
    typeof href === "string"
      ? localizeLinkPathname(href, locale)
      : {
          ...href,
          pathname: href.pathname
            ? localizeLinkPathname(href.pathname, locale)
            : href.pathname,
        };

  return (
    <NextLink
      {...common}
      href={localizedHref}
      hrefLang={locale}
      prefetch={false}
    />
  );
});

export function useRouter(): ReturnType<typeof useLocaleRouter> {
  const router = useLocaleRouter();
  const controller = useNavigationGuardController();
  const locale = useLocale();

  return useMemo(() => {
    function wrap(method: "push" | "replace") {
      return (...args: Parameters<typeof router.push>) => {
        const [href, options] = args;

        const destination = getPathname({
          href,
          locale: options?.locale ?? locale,
          forcePrefix: options?.locale != null || undefined,
        });

        const action = () => router[method](...args);

        if (!controller || isHashOnlyNavigation(destination)) {
          action();
        } else {
          controller.request(action);
        }
      };
    }

    return {
      ...router,
      push: wrap("push"),
      replace: wrap("replace"),
      refresh: () => {
        if (controller) {
          controller.request(() => router.refresh());
        } else {
          router.refresh();
        }
      },
    };
  }, [controller, locale, router]);
}
