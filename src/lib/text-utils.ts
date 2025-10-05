export function truncateText(str: string, length: number): string {
  if (str.length <= length) {
    return str;
  }

  return `${str.slice(0, length - 3)}...`;
}
