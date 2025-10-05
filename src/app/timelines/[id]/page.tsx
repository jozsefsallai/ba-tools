import type { Metadata } from "next";
import { fetchQuery } from "convex/nextjs";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { TimelineView } from "@/app/timelines/[id]/_components/timeline-view";

type PageParams = {
  id: string;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  try {
    const { id } = await params;

    const timeline = await fetchQuery(api.timeline.getById, {
      id: id as Id<"timeline">,
    });

    return {
      title: `${timeline.name ?? "Untitled Timeline"} - Joe's Blue Archive Tools`,
      description: "Create a visual rotation timeline.",
      twitter: {
        card: "summary",
      },
    };
  } catch (err) {
    return redirect("/404");
  }
}

export default async function TimelinePage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { id } = await params;

  const allStudents = await db.student.findMany({
    orderBy: {
      name: "asc",
    },
  });

  return <TimelineView id={id} allStudents={allStudents} />;
}
