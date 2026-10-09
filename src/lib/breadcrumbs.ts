export type PageBreadcrumb = { label: string; href?: string };

export type BreadcrumbRegistration = {
  pathname: string;
  depth: number;
  items: PageBreadcrumb[];
};

export function resolveBreadcrumbs(
  registrations: Iterable<BreadcrumbRegistration>,
  pathname: string,
  fallback: PageBreadcrumb[],
) {
  let selected: BreadcrumbRegistration | undefined;

  for (const registration of registrations) {
    if (
      registration.pathname === pathname &&
      (!selected || registration.depth >= selected.depth)
    ) {
      selected = registration;
    }
  }

  return selected?.items ?? fallback;
}
