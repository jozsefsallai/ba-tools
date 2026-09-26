export function getTeamKey(team: Array<{ studentId?: string }>) {
  const input = team
    .map((item) => {
      const studentId = item.studentId ?? "";
      return `${studentId.length}:${studentId}`;
    })
    .join("");

  let first = 0x811c9dc5;
  let second = 0x9e3779b9;

  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index);
    first = Math.imul(first ^ code, 0x01000193);
    second = Math.imul(second ^ (code + index), 0x85ebca6b);
  }

  return `${(first >>> 0).toString(16).padStart(8, "0")}${(second >>> 0)
    .toString(16)
    .padStart(8, "0")}`;
}
