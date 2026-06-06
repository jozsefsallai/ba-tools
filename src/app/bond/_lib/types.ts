import type { Gift, Student } from "~prisma";

export type StudentWithGifts = Student & {
  giftsAdored: Gift[];
  giftsLoved: Gift[];
  giftsLiked: Gift[];
};

export type GiftWithStudents = Gift & {
  adoredBy: Student[];
  lovedBy: Student[];
  likedBy: Student[];
};

export type BondViewProps = {
  students: StudentWithGifts[];
  gifts: GiftWithStudents[];
};
