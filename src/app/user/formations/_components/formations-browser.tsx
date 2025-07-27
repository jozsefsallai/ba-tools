"use client";

import { FormationEntry } from "@/app/user/formations/_components/formation-entry";
import { MessageBox } from "@/components/common/message-box";
import { useQueryWithStatus } from "@/lib/convex";
import type { Student } from "@prisma/client";
import { api } from "~convex/api";

export type FormationsBrowserProps = {
  allStudents: Student[];
};

export function FormationsBrowser({ allStudents }: FormationsBrowserProps) {
  const query = useQueryWithStatus(api.formation.getOwn);

  if (query.status === "pending") {
    return <MessageBox>Loading...</MessageBox>;
  }

  if (query.status === "error") {
    return (
      <MessageBox className="border-destructive bg-destructive/10 text-xl text-foreground">
        Failed to load formations.
      </MessageBox>
    );
  }

  if (query.status === "success" && query.data.length === 0) {
    return (
      <MessageBox>
        <p>You have no formations saved.</p>
      </MessageBox>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {query.data.map((formation) => (
        <FormationEntry
          key={formation._id}
          allStudents={allStudents}
          entry={formation}
        />
      ))}
    </div>
  );
}
