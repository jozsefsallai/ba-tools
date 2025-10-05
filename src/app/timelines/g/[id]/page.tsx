import { TimelineGroupView } from "@/app/timelines/g/_components/timeline-group-view";
import { db } from "@/lib/db";
import { fetchQuery } from "convex/nextjs";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { api } from "~convex/api";
import type { Id } from "~convex/dataModel";
import removeMD from "remove-markdown";
import { truncateText } from "@/lib/text-utils";

type PageParams = {
  id: Id<"timelineGroup">;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  try {
    const { id } = await params;

    const timelineGroup = await fetchQuery(api.timelineGroup.getById, {
      id,
    });

    const description = timelineGroup.description
      ? truncateText(
          removeMD(timelineGroup.description)
            .split("\n")
            .map((l) => l.trim())
            .filter((l) => l.length > 0)
            .join(" "),
          160,
        )
      : "A group of visual EX skill rotation timelines.";

    return {
      title: `${timelineGroup.name ?? "Untitled Timeline Group"} - Joe's Blue Archive Tools`,
      description,
      twitter: {
        card: "summary",
      },
    };
  } catch (err) {
    return redirect("/404");
  }
}

export default async function TimelineGroupPage({
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

  return <TimelineGroupView id={id} allStudents={allStudents} />;
}
