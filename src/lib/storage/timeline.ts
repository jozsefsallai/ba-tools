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
};

export type TimelineStorageData = {
  name?: string;
  items: Array<
    RawTimelineStudentItem | Omit<SeparatorItem, "id"> | Omit<TextItem, "id">
  >;
  scale: number;
  itemSpacing: number;
  verticalSeparatorSize: number;
  horizontalSeparatorSize: number;
};

class TimelineStorage extends Storage<TimelineStorageData> {
  constructor() {
    super("timeline");
  }
}

export const timelineStorage = new TimelineStorage();
