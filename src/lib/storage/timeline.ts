import type {
  SeparatorItem,
  TextItem,
} from "@/app/timeline-visualizer/_components/timeline-preview";
import { Storage } from "@/lib/storage";

type RawBaseItem = {
  type: "student" | "separator" | "text";
};

type RawTimelineStudentItem = RawBaseItem & {
  type: "student";
  studentId: string;
  targetId?: string;
  trigger?: string;
  copy?: boolean;
  variantId?: string;
  notes?: string;
};

export type TimelineStorageData = {
  name?: string;
  description?: string;
  items: Array<
    RawTimelineStudentItem | Omit<SeparatorItem, "id"> | Omit<TextItem, "id">
  >;
  scale: number;
  itemSpacing: number;
  verticalSeparatorSize: number;
  horizontalSeparatorSize: number;
  exportWithTransparentBackground?: boolean;
  exportBackgroundColor?: string;
  exportBackgroundOpacity?: number;
};

export const DEFAULT_EXPORT_WITH_TRANSPARENT_BACKGROUND = true;
export const DEFAULT_EXPORT_BACKGROUND_COLOR = "#000000";
export const DEFAULT_EXPORT_BACKGROUND_OPACITY = 100;

class TimelineStorage extends Storage<TimelineStorageData> {
  constructor() {
    super("timeline");
  }
}

export const timelineStorage = new TimelineStorage();
