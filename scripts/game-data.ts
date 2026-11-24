export {};

const commands = new Map([
  [
    "new-students",
    {
      description: "List the JP students the database doesn't have yet",
      run: () => import("./list-new-students"),
    },
  ],
  [
    "images",
    {
      description: "Extract image assets and upload them to the CDN",
      run: () => import("./sync-image-assets"),
    },
  ],
  [
    "bond-stories",
    {
      description: "Sync the students' relationship stories",
      run: () => import("./sync-bond-stories"),
    },
  ],
  [
    "items",
    {
      description: "Sync all items, equipment and currencies",
      run: () => import("./sync-game-items"),
    },
  ],
  [
    "missions",
    {
      description: "Sync the main story missions and their drops",
      run: () => import("./sync-missions"),
    },
  ],
  [
    "skills",
    {
      description: "Sync the students' skills",
      run: () => import("./sync-student-skills"),
    },
  ],
  [
    "stories",
    {
      description: "Sync the stories",
      run: () => import("./sync-stories"),
    },
  ],
  [
    "upcoming",
    {
      description: "Sync the upcoming content for roadmap suggestions",
      run: () => import("./sync-upcoming-content"),
    },
  ],
]);

const name: string | undefined = process.argv[2];
const command = commands.get(name ?? "");

if (!command) {
  const help = name === undefined || name === "--help" || name === "-h";
  const width = Math.max(
    ...[
      ...commands.keys(),
    ].map((key) => key.length),
  );
  const usage = [
    "Usage: pnpm game-data <command> [options]",
    "",
    ...[
      ...commands,
    ].map(([key, { description }]) => `  ${key.padEnd(width)}  ${description}`),
  ].join("\n");

  if (help) {
    console.log(usage);
  } else {
    console.error(`Unknown command: ${name}\n\n${usage}`);
  }
  process.exit(help ? 0 : 1);
}

process.argv.splice(2, 1);

await command.run();
