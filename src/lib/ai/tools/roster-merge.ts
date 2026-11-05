type RosterStudent = {
  studentId: string;
};

export function mergeRosterStudents<T extends RosterStudent>(
  current: T[],
  upsert: T[] = [],
  removeIds: string[] = [],
) {
  const changes = new Map(
    upsert.map((student) => [
      student.studentId,
      student,
    ]),
  );
  const removed = new Set(removeIds);
  const existing = new Set(current.map(({ studentId }) => studentId));

  return [
    ...current
      .filter(({ studentId }) => !removed.has(studentId))
      .map((student) => changes.get(student.studentId) ?? student),
    ...[
      ...changes.values(),
    ].filter(
      ({ studentId }) => !existing.has(studentId) && !removed.has(studentId),
    ),
  ];
}
