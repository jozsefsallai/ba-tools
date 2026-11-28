import type {
  MemorialLobbyManifest,
  MemorialLobbySkeleton,
  StudentSpriteManifest,
} from "@/lib/game-data/contract";
import {
  buildMemorialLobbyFileUrl,
  buildMemorialLobbyManifestUrl,
  buildOtherSpriteManifestUrl,
  buildOtherSpriteThumbnailUrl,
  buildOtherSpriteUrl,
  buildStudentSpriteManifestUrl,
  buildStudentSpriteThumbnailUrl,
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
  thumbnailUrls: Record<string, string>;
};

function spriteUrls(
  manifest: StudentSpriteManifest,
  url: (sprite: string) => string,
  thumbnailUrl: (sprite: string) => string,
) {
  return {
    urls: Object.fromEntries(
      manifest.sprites.map((s) => [
        s,
        url(s),
      ]),
    ),
    thumbnailUrls: Object.fromEntries(
      manifest.sprites.map((s) => [
        s,
        manifest.thumbnails ? thumbnailUrl(s) : url(s),
      ]),
    ),
  };
}

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
    ...spriteUrls(
      manifest,
      (s) => buildStudentSpriteUrl(studentId, s),
      (s) => buildStudentSpriteThumbnailUrl(studentId, s),
    ),
  };
}

export type SpriteSet = StudentSprites & {
  id: string;
};

export type SpriteGroup =
  | {
      kind: "student";
      studentId: string;
      sets: [
        SpriteSet,
      ];
    }
  | {
      kind: "others";
      sets: SpriteSet[];
    };

async function fetchOtherSprites(variantId: string): Promise<SpriteSet | null> {
  const manifest = await fetchManifest<StudentSpriteManifest>(
    buildOtherSpriteManifestUrl(variantId),
  );

  if (!manifest || manifest.sprites.length === 0) {
    return null;
  }

  return {
    ...manifest,
    id: variantId,
    ...spriteUrls(
      manifest,
      (s) => buildOtherSpriteUrl(variantId, s),
      (s) => buildOtherSpriteThumbnailUrl(variantId, s),
    ),
  };
}

export async function fetchRelatedSpriteGroups(
  related: NonNullable<StudentSpriteManifest["related"]>,
): Promise<SpriteGroup[]> {
  const settle = <T>(promise: Promise<T>) =>
    promise.catch((err) => {
      console.error("Failed to load a sprite manifest", err);
      return null;
    });

  const [students, others] = await Promise.all([
    Promise.all(
      related.students.map(async (studentId) => {
        const sprites = await settle(fetchStudentSprites(studentId));
        return sprites && sprites.sprites.length > 0
          ? {
              ...sprites,
              id: studentId,
            }
          : null;
      }),
    ),
    Promise.all(related.others.map((id) => settle(fetchOtherSprites(id)))),
  ]);

  const groups: SpriteGroup[] = students
    .filter((set) => set !== null)
    .map((set) => ({
      kind: "student",
      studentId: set.id,
      sets: [
        set,
      ],
    }));

  const otherSets = others.filter((set) => set !== null);
  if (otherSets.length > 0) {
    groups.push({
      kind: "others",
      sets: otherSets,
    });
  }

  return groups;
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
          skeleton.textures.map((t) => [
            t,
            url(t),
          ]),
        ),
      })),
      effectsUrl: lobby.scene?.effects ? url(lobby.scene.effects) : null,
      fileBaseUrl: url(""),
    })),
  };
}
