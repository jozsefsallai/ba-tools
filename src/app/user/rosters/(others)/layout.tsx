import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { PropsWithChildren } from "react";

export default async function MyRostersOthersLayout({
  children,
}: PropsWithChildren) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" asChild>
          <Link href="/user/rosters">
            <ChevronLeft />
            Back to Rosters
          </Link>
        </Button>
      </div>

      {children}
    </div>
  );
}
