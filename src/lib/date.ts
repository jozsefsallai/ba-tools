export const JST_OFFSET = 9; // JST is UTC+9, in hours

export function dateToJST(date: Date): Date {
  return new Date(date.getTime() + JST_OFFSET * 60 * 60 * 1000);
}

export function currentTimeJST(): Date {
  return dateToJST(new Date());
}

function getStartOfInterval(
  jstNow: Date,
  intervalHours: number,
  anchorHour: number,
): Date {
  const year = jstNow.getUTCFullYear();
  const month = jstNow.getUTCMonth();
  const date = jstNow.getUTCDate();
  const hour = jstNow.getUTCHours();

  const hoursSinceAnchor = (hour - anchorHour + 24) % 24;

  const snappedHoursSinceAnchor =
    Math.floor(hoursSinceAnchor / intervalHours) * intervalHours;

  const targetJstHour = anchorHour + snappedHoursSinceAnchor;
  let targetDate = date;

  if (hour < anchorHour && targetJstHour >= anchorHour) {
    targetDate -= 1;
  }

  return new Date(
    Date.UTC(year, month, targetDate, targetJstHour - JST_OFFSET, 0, 0),
  );
}

// updates every 3 hours
export function currentClosestCafeHeadpatBreakpointJST(): Date {
  return getStartOfInterval(currentTimeJST(), 3, 1);
}

// updates every 12 hours
export function currentClosestCafeBreakpointJST(): Date {
  return getStartOfInterval(currentTimeJST(), 12, 4);
}

// updates every 24 hours
export function resetTimeForDateJST(jstDate: Date): Date {
  return getStartOfInterval(jstDate, 24, 4);
}

export function currentResetJST() {
  const jstNow = currentTimeJST();
  return resetTimeForDateJST(jstNow);
}
