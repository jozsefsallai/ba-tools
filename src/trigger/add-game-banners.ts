import { logger, type Task, task } from "@trigger.dev/sdk";
import { db } from "../lib/db";
import type { Student } from "../lib/db/client";
import {
  type AddGameBannersPayload,
  addGameBannersPayload,
  type RawGameBanner,
} from "./schemas";

export const addGameBannersTask: Task<
  "add-game-banners",
  AddGameBannersPayload,
  void
> = task({
  id: "add-game-banners",
  run: async (payload: AddGameBannersPayload) => {
    let banners: RawGameBanner[];

    try {
      const parsed = addGameBannersPayload.parse(payload);
      banners = parsed.banners;
    } catch (err) {
      logger.error("Invalid payload for addGameBannersTask", {
        error: err,
      });

      return;
    }

    const students = await db.student.findMany();

    for (const banner of banners) {
      const startDate = new Date(
        Date.UTC(
          banner.start[0],
          banner.start[1] - 1,
          banner.start[2],
          2,
          0,
          0,
        ),
      );

      const endDate = new Date(
        Date.UTC(banner.end[0], banner.end[1] - 1, banner.end[2], 1, 59, 59),
      );

      const studentsToAdd: Student[] = [];

      for (const studentId of banner.students) {
        const student = students.find((s) => s.id === studentId);

        if (student) {
          studentsToAdd.push(student);
        } else {
          console.warn(`Student not found: ${studentId}`);
        }
      }

      if (studentsToAdd.length === 0) {
        logger.warn(
          `No students found for banner ${startDate.toISOString()} to ${endDate.toISOString()}`,
        );
        continue;
      }

      await db.gameBanner.create({
        data: {
          name: banner.name,
          startDate,
          endDate,
          pickupStudents: {
            connect: studentsToAdd.map((s) => ({
              id: s.id,
            })),
          },
          freePulls: banner.freePulls,
          isSelectablePickup: banner.isSelectablePickup,
        },
      });

      const studentNames = studentsToAdd.map((s) => s.name).join(", ");

      logger.info(
        `Created game banner from ${startDate.toISOString()} to ${endDate.toISOString()} for students: ${studentNames}`,
      );
    }
  },
});
