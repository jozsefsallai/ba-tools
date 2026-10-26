import { MemorialLobbyGrid } from "@/app/[locale]/debug/memorial-lobbies/_components/memorial-lobby-grid";
import { db } from "@/lib/db";
import { fetchMemorialLobby } from "@/lib/student-spine";
import { buildStudentPortraitUrlFromId } from "@/lib/url";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Memorial lobby debug",
  robots: { index: false },
};

export type DebugLobbyStudent = {
  id: string;
  name: string;
  posterUrl: string;
  lobbies: NonNullable<
    Awaited<ReturnType<typeof fetchMemorialLobby>>
  >["lobbies"];
};

// Checking every student for a lobby means fetching every manifest, so keep
// the result around for a while instead of redoing it on each visit.
const CACHE_TTL_MS = 10 * 60 * 1000;
const FETCH_BATCH_SIZE = 24;

let cache: { at: number; students: Promise<DebugLobbyStudent[]> } | null = null;

async function loadStudentsWithLobbies() {
  const students = await db.student.findMany({
    select: { id: true, name: true },
    orderBy: { defaultOrder: "asc" },
  });

  const result: DebugLobbyStudent[] = [];

  for (let i = 0; i < students.length; i += FETCH_BATCH_SIZE) {
    const batch = students.slice(i, i + FETCH_BATCH_SIZE);

    const manifests = await Promise.all(
      batch.map((student) => fetchMemorialLobby(student.id).catch(() => null)),
    );

    batch.forEach((student, idx) => {
      const lobbies = manifests[idx]?.lobbies ?? [];

      if (lobbies.length > 0) {
        result.push({
          ...student,
          posterUrl: buildStudentPortraitUrlFromId(student.id),
          lobbies,
        });
      }
    });
  }

  return result;
}

function getStudentsWithLobbies() {
  if (!cache || Date.now() - cache.at > CACHE_TTL_MS) {
    const students = loadStudentsWithLobbies();
    cache = { at: Date.now(), students };
    // Don't keep a failed lookup around.
    students.catch(() => {
      cache = null;
    });
  }

  return cache.students;
}

export default async function MemorialLobbyDebugPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const students = await getStudentsWithLobbies();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-bold">Memorial lobby debug</h1>
        <p className="text-muted-foreground text-sm">
          {students.length} students with memorial lobbies.
        </p>
      </div>

      <MemorialLobbyGrid students={students} />
    </div>
  );
}
