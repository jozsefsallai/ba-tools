import { Button } from "@/components/ui/button";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { PropsWithChildren } from "react";

export default async function MyTimelinesOthersLayout({
  children,
}: PropsWithChildren) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <Button variant="ghost" asChild>
          <Link href="/user/timelines">
            <ChevronLeft />
            Back to Timeline Groups
          </Link>
        </Button>
      </div>

      {children}
    </div>
  );
}
