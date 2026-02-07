"use client";

import { FlippableCard } from "@/components/common/flippable-card";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useStudents } from "@/hooks/use-students";
import { currentTimeJST, resetTimeForDateJST } from "@/lib/date";
import { buildStudentPortraitUrl } from "@/lib/url";
import { useUser } from "@clerk/nextjs";
import { RefreshCwIcon } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import seedrandom from "seedrandom";

type SOTDView = "global" | "user";

export function StudentOfTheDay() {
  const { students } = useStudents();
  const { user } = useUser();

  const [view, setView] = useState<SOTDView>("global");

  const dateTimestamp = useMemo(() => {
    const today = currentTimeJST();
    const resetDate = resetTimeForDateJST(today);
    return Math.floor(resetDate.getTime() / 1000);
  }, []);

  const globalSOTD = useMemo(() => {
    const globalSeed = Buffer.from(dateTimestamp.toString(), "utf-8")
      .toString("base64")
      .replace(/=/g, "");

    const rng = seedrandom(globalSeed);

    return students[Math.floor(rng() * students.length)];
  }, [dateTimestamp, students]);

  const globalSOTDPortrait = useMemo(() => {
    return buildStudentPortraitUrl(globalSOTD);
  }, [globalSOTD]);

  const userSOTD = useMemo(() => {
    if (!user) {
      return null;
    }

    const userSeed = Buffer.from(`${user.id}-${dateTimestamp}`, "utf-8")
      .toString("base64")
      .replace(/=/g, "");

    const rng = seedrandom(userSeed);

    return students[Math.floor(rng() * students.length)];
  }, [dateTimestamp, user, students]);

  const userSOTDPortrait = useMemo(() => {
    if (!userSOTD) {
      return null;
    }

    return buildStudentPortraitUrl(userSOTD);
  }, [userSOTD]);

  const toggleView = useCallback(() => {
    setView((prev) => (prev === "global" ? "user" : "global"));
  }, []);

  const userName = useMemo(() => {
    if (!user) {
      return null;
    }

    return user.fullName ?? user.username;
  }, [user]);

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-2xl">Student of the Day</h2>

      <div className="flex-1 relative">
        <FlippableCard
          isFlipped={view === "user"}
          front={
            <div className="relative h-full flex flex-col items-center justify-center gap-2 p-6 border rounded-md bg-card">
              <img
                src={globalSOTDPortrait}
                alt={globalSOTD.name}
                className="rounded-full object-cover w-36 h-36 border-4 border-white shadow-md"
              />

              <div className="font-bold text-xl">{globalSOTD.name}</div>

              <div className="absolute top-2 left-2 border bg-background rounded-md px-2 py-0.5 text-xs text-muted-foreground uppercase">
                Site-Wide Student
              </div>
            </div>
          }
          back={
            userSOTD && userSOTDPortrait ? (
              <div className="relative h-full flex flex-col items-center justify-center gap-2 p-6 border rounded-md bg-card overflow-hidden">
                <div className="bg-gradient-to-r from-transparent via-blue-400/15 dark:via-blue-400/35 to-transparent w-4/5 absolute left-1/5 -skew-x-[45deg] top-0 bottom-0" />

                <img
                  src={userSOTDPortrait}
                  alt={userSOTD.name}
                  className="relative rounded-full object-cover w-36 h-36 border-4 border-white shadow-md"
                />

                <div className="relative font-bold text-xl">
                  {userSOTD.name}
                </div>

                <div className="absolute top-2 left-2 border bg-background rounded-md px-2 py-0.5 text-xs text-muted-foreground font-medium uppercase">
                  {userName ? `${userName}'s` : "Your"} Student
                </div>
              </div>
            ) : null
          }
          className="h-full"
        />

        {user && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={toggleView}
                  className="absolute top-2 right-2"
                >
                  <RefreshCwIcon />
                </Button>
              </TooltipTrigger>

              <TooltipContent>
                {view === "global"
                  ? "View Your Student of the Day"
                  : "View Global Student of the Day"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    </section>
  );
}
