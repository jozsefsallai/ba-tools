import type {
  MemorialLobbyManifest,
  MemorialLobbySkeleton,
  StudentSpriteManifest,
} from "@/lib/game-data/contract";
import {
  buildMemorialLobbyFileUrl,
  buildMemorialLobbyManifestUrl,
  buildStudentSpriteManifestUrl,
  buildStudentSpriteUrl,
} from "@/lib/url";

export type {
  MemorialLobbyManifest,
  StudentSpriteManifest,
} from "@/lib/game-data/contract";

async function fetchManifest<T>(url: string): Promise<T | null> {
  const res = await fetch(url);

  if (res.status === 404 || res.status === 403) {
    return null;
  }

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status}`);
  }

  return (await res.json()) as T;
}

export type StudentSprites = StudentSpriteManifest & {
  urls: Record<string, string>;
};

export async function fetchStudentSprites(
  studentId: string,
): Promise<StudentSprites | null> {
  const manifest = await fetchManifest<StudentSpriteManifest>(
    buildStudentSpriteManifestUrl(studentId),
  );

  if (!manifest) {
    return null;
  }

  return {
    ...manifest,
    urls: Object.fromEntries(
      manifest.sprites.map((s) => [s, buildStudentSpriteUrl(studentId, s)]),
    ),
  };
}

export type MemorialLobbySkeletonUrls = MemorialLobbySkeleton & {
  skelUrl: string;
  atlasUrl: string;
  textureUrls: Record<string, string>;
};

export type ResolvedMemorialLobbyManifest = Omit<
  MemorialLobbyManifest,
  "lobbies"
> & {
  lobbies: (MemorialLobbyManifest["lobbies"][number] & {
    skeletons: MemorialLobbySkeletonUrls[];
    effectsUrl: string | null;
    fileBaseUrl: string;
  })[];
};

export async function fetchMemorialLobby(
  studentId: string,
): Promise<ResolvedMemorialLobbyManifest | null> {
  const manifest = await fetchManifest<MemorialLobbyManifest>(
    buildMemorialLobbyManifestUrl(studentId),
  );

  if (!manifest) {
    return null;
  }

  const url = (file: string) => buildMemorialLobbyFileUrl(studentId, file);

  return {
    ...manifest,
    lobbies: manifest.lobbies.map((lobby) => ({
      ...lobby,
      skeletons: lobby.skeletons.map((skeleton) => ({
        ...skeleton,
        skelUrl: url(skeleton.skel),
        atlasUrl: url(skeleton.atlas),
        textureUrls: Object.fromEntries(
          skeleton.textures.map((t) => [t, url(t)]),
        ),
      })),
      effectsUrl: lobby.scene?.effects ? url(lobby.scene.effects) : null,
      fileBaseUrl: url(""),
    })),
  };
}
