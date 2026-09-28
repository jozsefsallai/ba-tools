import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "refresh public PVP statistics",
  { hours: 6 },
  internal.pvpStats.start,
);

export default crons;
