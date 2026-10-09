"use client";

import { useBreadcrumbs } from "@/components/providers/breadcrumbs-provider";
import {
  Breadcrumb,
  BreadcrumbEllipsis,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { useTranslations } from "next-intl";
import { Fragment } from "react";

export function InsetHeader() {
  const t = useTranslations();
  const breadcrumbs = useBreadcrumbs();
  const collapsed = breadcrumbs.slice(0, -2);

  return (
    <header className="flex min-h-12 shrink-0 items-center gap-2 border-b px-4 py-2">
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 !h-4" />
      <Breadcrumb className="min-w-0">
        <BreadcrumbList className="flex-nowrap">
          {collapsed.length > 0 && (
            <>
              <BreadcrumbItem className="md:hidden">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={t("common.breadcrumbs.ancestorMenu")}
                    >
                      <BreadcrumbEllipsis />
                    </Button>
                  </DropdownMenuTrigger>

                  <DropdownMenuContent align="start">
                    <DropdownMenuGroup>
                      {collapsed.map((crumb) => (
                        <DropdownMenuItem
                          key={crumb.href ?? crumb.label}
                          asChild
                        >
                          <Link href={crumb.href ?? "/"}>{crumb.label}</Link>
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuGroup>
                  </DropdownMenuContent>
                </DropdownMenu>
              </BreadcrumbItem>

              <BreadcrumbSeparator className="md:hidden" />
            </>
          )}

          {breadcrumbs.map((crumb, index) => {
            const hidden =
              index < breadcrumbs.length - 2 ? "hidden md:flex" : "";

            return (
              <Fragment key={crumb.href ?? `${index}:${crumb.label}`}>
                {index > 0 && (
                  <BreadcrumbSeparator
                    className={
                      index <= breadcrumbs.length - 2 && collapsed.length > 0
                        ? "hidden md:block"
                        : ""
                    }
                  />
                )}

                <BreadcrumbItem className={cn("min-w-0", hidden)}>
                  {crumb.href ? (
                    <BreadcrumbLink asChild>
                      <Link
                        className="max-w-40 truncate"
                        title={crumb.label}
                        href={crumb.href}
                      >
                        {crumb.label}
                      </Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage
                      className="max-w-64 truncate"
                      title={crumb.label}
                    >
                      {crumb.label}
                    </BreadcrumbPage>
                  )}
                </BreadcrumbItem>
              </Fragment>
            );
          })}
        </BreadcrumbList>
      </Breadcrumb>
    </header>
  );
}
