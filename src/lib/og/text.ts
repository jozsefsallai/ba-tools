export function boundedText(text: string, length: number) {
  const clean = text.replace(/\s+/g, " ").trim();

  return Array.from(clean).length > length
    ? `${Array.from(clean)
        .slice(0, length - 1)
        .join("")}…`
    : clean;
}

export function isJapaneseText(text: string) {
  return /[\u3000-\u9fff\uff00-\uffef]/.test(text);
}
