import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
  type MessageFormatElement,
  parse,
  TYPE,
} from "@formatjs/icu-messageformat-parser";
import { DEFAULT_LOCALE } from "../src/i18n/constants";

const TRANSLATIONS_DIR = "src/i18n/translations";

const MAX_KEY_LOSS = 0.2;

type FlatMessages = Map<string, unknown>;

function flatten(value: unknown, prefix = "", out: FlatMessages = new Map()) {
  if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      flatten(child, prefix ? `${prefix}.${key}` : key, out);
    }
  } else {
    out.set(prefix, value);
  }

  return out;
}

function collectArguments(
  elements: MessageFormatElement[],
  out = new Set<string>(),
) {
  for (const element of elements) {
    switch (element.type) {
      case TYPE.argument:
      case TYPE.number:
      case TYPE.date:
      case TYPE.time:
        out.add(`{${element.value}}`);
        break;
      case TYPE.select:
      case TYPE.plural:
        out.add(`{${element.value}}`);
        for (const option of Object.values(element.options)) {
          collectArguments(option.value, out);
        }
        break;
      case TYPE.tag:
        out.add(`<${element.value}>`);
        collectArguments(element.children, out);
        break;
    }
  }

  return out;
}

function parseArguments(message: string) {
  return [
    ...collectArguments(parse(message)),
  ].sort();
}

function readKeysFromHead(path: string) {
  try {
    const contents = execFileSync(
      "git",
      [
        "show",
        `HEAD:${path}`,
      ],
      {
        encoding: "utf8",
        maxBuffer: 64 * 1024 * 1024,
        stdio: [
          "ignore",
          "pipe",
          "ignore",
        ],
      },
    );

    return flatten(JSON.parse(contents)).size;
  } catch {
    return null;
  }
}

function checkFile(locale: string, file: string) {
  const path = join(TRANSLATIONS_DIR, locale, file);
  const errors: string[] = [];

  let messages: FlatMessages;

  try {
    messages = flatten(JSON.parse(readFileSync(path, "utf8")));
  } catch (error) {
    return [
      `${path}: invalid JSON: ${(error as Error).message}`,
    ];
  }

  const source = flatten(
    JSON.parse(
      readFileSync(join(TRANSLATIONS_DIR, DEFAULT_LOCALE, file), "utf8"),
    ),
  );

  for (const [key, message] of messages) {
    const sourceMessage = source.get(key);

    if (sourceMessage === undefined) {
      errors.push(`${path}: "${key}" doesn't exist in ${DEFAULT_LOCALE}`);
      continue;
    }

    if (typeof message !== "string" || typeof sourceMessage !== "string") {
      if (typeof message !== typeof sourceMessage) {
        errors.push(`${path}: "${key}" has the wrong type`);
      }

      continue;
    }

    if (message === "") {
      errors.push(`${path}: "${key}" is empty`);
      continue;
    }

    let actual: string[];

    try {
      actual = parseArguments(message);
    } catch (error) {
      errors.push(`${path}: "${key}" is invalid: ${(error as Error).message}`);
      continue;
    }

    const expected = parseArguments(sourceMessage);
    const unknown = actual.filter((name) => !expected.includes(name));
    const missing = expected.filter(
      (name) => name.startsWith("{") && !actual.includes(name),
    );

    if (unknown.length > 0) {
      errors.push(`${path}: "${key}" adds ${unknown.join(", ")}`);
    }

    if (missing.length > 0) {
      errors.push(`${path}: "${key}" is missing ${missing.join(", ")}`);
    }
  }

  const previousSize = readKeysFromHead(path);

  if (
    previousSize !== null &&
    messages.size < previousSize * (1 - MAX_KEY_LOSS)
  ) {
    errors.push(
      `${path}: has ${messages.size} keys, down from ${previousSize} in HEAD`,
    );
  }

  return errors;
}

const sourceFiles = readdirSync(join(TRANSLATIONS_DIR, DEFAULT_LOCALE));
const locales = readdirSync(TRANSLATIONS_DIR).filter(
  (locale) => locale !== DEFAULT_LOCALE,
);

const errors = locales.flatMap((locale) => {
  const files = readdirSync(join(TRANSLATIONS_DIR, locale));

  const unknownFiles = files
    .filter((file) => !sourceFiles.includes(file))
    .map((file) => `${join(TRANSLATIONS_DIR, locale, file)}: no source file`);

  return [
    ...unknownFiles,
    ...files
      .filter((file) => sourceFiles.includes(file))
      .flatMap((file) => checkFile(locale, file)),
  ];
});

if (errors.length > 0) {
  console.error(errors.join("\n"));
  console.error(`\n${errors.length} translation problem(s) found.`);
  process.exit(1);
}

console.log(`Translations OK (${locales.join(", ")}).`);
