import type { NameOverrides, SeedStudentInput } from "../../trigger/lib/common";

export interface SyncLogger {
  info(message: string, meta?: Record<string, unknown>): void;
  warn(message: string, meta?: Record<string, unknown>): void;
  error(message: string, meta?: Record<string, unknown>): void;
}

export type {
  NameOverride,
  NameOverrides,
  StudentLocale,
} from "../../trigger/lib/common";

export type NewStudent = Omit<
  SeedStudentInput,
  "LinkedCharacterId" | "__nameOverrides"
> & {
  __nameOverrides: NameOverrides;
  baseVariantId: string | null;
};

export interface ExistingStudents {
  devNames: string[];
  characterIds: number[];
  maxDefaultOrder: number;
}

export interface ListNewStudentsOptions {
  sqlcipherKey: string;
  existing: ExistingStudents;
  cacheDir: string;
  logger?: SyncLogger;
}

export interface ListNewStudentsResult {
  gameVersion: string;
  students: NewStudent[];
}

export interface ImageStudent {
  devName: string;
  characterId: number;
  pathName: string;
}

export interface ExtractImageAssetsOptions {
  sqlcipherKey: string;
  students: ImageStudent[];
  outDir: string;
  cacheDir: string;
  logger?: SyncLogger;
}

export interface ExtractedImage {
  key: string;
  path: string;
}

export interface ExtractImageAssetsResult {
  gameVersion: string;
  files: ExtractedImage[];
  missing: string[];
  warnings: string[];
}

export interface DataSyncModule {
  listNewStudents(
    options: ListNewStudentsOptions,
  ): Promise<ListNewStudentsResult>;

  extractImageAssets(
    options: ExtractImageAssetsOptions,
  ): Promise<ExtractImageAssetsResult>;
}
