"use client";

import { DetailSection } from "@/app/[locale]/students/[id]/_components/detail-section";
import { MemorialLobbyViewer } from "@/app/[locale]/students/[id]/_components/memorial-lobby-viewer";
import bondIcon from "@/assets/images/bond.png";
import {
  type ResolvedMemorialLobbyManifest,
  fetchMemorialLobby,
} from "@/lib/student-spine";
import { HeartIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function MemorialLobbySection({
  studentId,
  posterUrl,
  memorobiLevel,
}: {
  studentId: string;
  posterUrl: string;
  memorobiLevel: number;
}) {
  const t = useTranslations();

  const [manifest, setManifest] =
    useState<ResolvedMemorialLobbyManifest | null>(null);

  useEffect(() => {
    let cancelled = false;

    setManifest(null);

    fetchMemorialLobby(studentId)
      .then((loaded) => {
        if (!cancelled) {
          setManifest(loaded);
        }
      })
      .catch((err) => console.error("Failed to load memorial lobby", err));

    return () => {
      cancelled = true;
    };
  }, [studentId]);

  return (
    <DetailSection
      title={t("tools.students.detail.sections.memorialLobby")}
      icon={HeartIcon}
    >
      <div className="flex flex-col gap-3">
        {memorobiLevel > 0 && (
          <p className="text-muted-foreground inline-flex items-center gap-1.5 text-sm">
            <img src={bondIcon.src} alt="" aria-hidden className="size-4" />
            {t("tools.students.detail.fields.memorobiValue", {
              level: memorobiLevel,
            })}
          </p>
        )}

        {manifest && manifest.lobbies.length > 0 ? (
          <MemorialLobbyViewer
            lobbies={manifest.lobbies}
            posterUrl={posterUrl}
          />
        ) : (
          <div className="bg-muted aspect-[4/3] w-full animate-pulse rounded-lg border" />
        )}
      </div>
    </DetailSection>
  );
}
