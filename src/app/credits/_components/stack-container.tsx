import ClerkLogo from "@/app/credits/_components/stack/clerk";
import ConvexLogo from "@/app/credits/_components/stack/convex";
import GoLogo from "@/app/credits/_components/stack/go";
import NextJSLogo from "@/app/credits/_components/stack/next";
import PixiJSLogo from "@/app/credits/_components/stack/pixi";
import PlanetScaleLogo from "@/app/credits/_components/stack/planetscale";
import PostgreSQLLogo from "@/app/credits/_components/stack/postgres";
import PrismaLogo from "@/app/credits/_components/stack/prisma";
import ShadcnUILogo from "@/app/credits/_components/stack/shadcn";
import SpineLogo from "@/app/credits/_components/stack/spine";
import TailwindCSSLogo from "@/app/credits/_components/stack/tailwind";
import VercelLogo from "@/app/credits/_components/stack/vercel";
import type { ReactNode, SVGProps } from "react";

type StackItem = {
  role: string;
  name: string;
  component: (props: SVGProps<SVGSVGElement>) => ReactNode;
  url: string;
};

const STACK_ITEMS: StackItem[] = [
  {
    role: "Web Framework",
    name: "Next.js",
    component: NextJSLogo,
    url: "https://nextjs.org/",
  },
  {
    role: "Styling",
    name: "TailwindCSS",
    component: TailwindCSSLogo,
    url: "https://tailwindcss.com/",
  },
  {
    role: "UI Library",
    name: "shadcn/ui",
    component: ShadcnUILogo,
    url: "https://ui.shadcn.com/",
  },
  {
    role: "Hosting",
    name: "Vercel",
    component: VercelLogo,
    url: "https://vercel.com/",
  },
  {
    role: "Database Provider (game data)",
    name: "PlanetScale",
    component: PlanetScaleLogo,
    url: "https://planetscale.com/",
  },
  {
    role: "Database (game data)",
    name: "PostgreSQL",
    component: PostgreSQLLogo,
    url: "https://www.postgresql.org/",
  },
  {
    role: "ORM",
    name: "Prisma",
    component: PrismaLogo,
    url: "https://www.prisma.io/",
  },
  {
    role: "Database (user data)",
    name: "Convex",
    component: ConvexLogo,
    url: "https://convex.dev/referral/JOZSEF7939",
  },
  {
    role: "Authentication",
    name: "Clerk",
    component: ClerkLogo,
    url: "https://clerk.com/",
  },
  {
    role: "Native Modules",
    name: "Go",
    component: GoLogo,
    url: "https://go.dev/",
  },
  {
    role: "Scenario UI & Spine Rendering",
    name: "PixiJS",
    component: PixiJSLogo,
    url: "https://pixijs.com/",
  },
  {
    role: "Plana Rendering",
    name: "Spine",
    component: SpineLogo,
    url: "https://esotericsoftware.com/",
  },
];

export function StackContainer() {
  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
      {STACK_ITEMS.map((item) => (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          key={item.name}
        >
          <div
            key={item.name}
            className="flex items-center space-x-4 border rounded-md p-4 hover:bg-accent"
          >
            <item.component className="size-14 text-foreground" />

            <div>
              <h3 className="text-lg font-semibold">{item.name}</h3>
              <p className="text-sm text-muted-foreground">{item.role}</p>
            </div>
          </div>
        </a>
      ))}
    </div>
  );
}
