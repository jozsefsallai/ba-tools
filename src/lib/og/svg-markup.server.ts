import "server-only";

import { Fragment, isValidElement, type ReactNode } from "react";

const CAMEL_CASE = new Set([
  "viewBox",
  "preserveAspectRatio",
  "patternUnits",
  "patternContentUnits",
  "patternTransform",
  "markerWidth",
  "markerHeight",
  "markerUnits",
  "refX",
  "refY",
  "gradientUnits",
  "gradientTransform",
  "clipPathUnits",
  "maskUnits",
  "maskContentUnits",
  "stdDeviation",
  "textLength",
  "lengthAdjust",
]);

const SKIPPED = new Set([
  "children",
  "key",
  "ref",
  "dangerouslySetInnerHTML",
]);

const escapeXml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const kebab = (name: string) =>
  name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

function attributeName(name: string) {
  if (name === "className") {
    return "class";
  }

  if (name === "xlinkHref") {
    return "xlink:href";
  }

  return CAMEL_CASE.has(name) || name.startsWith("aria-") ? name : kebab(name);
}

function styleValue(style: Record<string, unknown>) {
  return Object.entries(style)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== "",
    )
    .map(([name, value]) => `${kebab(name)}:${value}`)
    .join(";");
}

export function svgMarkup(node: ReactNode): string {
  if (node === null || node === undefined || typeof node === "boolean") {
    return "";
  }

  if (typeof node === "string" || typeof node === "number") {
    return escapeXml(String(node));
  }

  if (Array.isArray(node)) {
    return node.map(svgMarkup).join("");
  }

  if (!isValidElement(node)) {
    throw new Error("Unsupported node in SVG markup");
  }

  const { type } = node;
  const props = node.props as Record<string, unknown>;

  if (type === Fragment) {
    return svgMarkup(props.children as ReactNode);
  }

  if (typeof type === "function") {
    return svgMarkup((type as (p: unknown) => ReactNode)(props));
  }

  if (typeof type !== "string") {
    throw new Error("Unsupported component in SVG markup");
  }

  let attributes = "";

  for (const [name, value] of Object.entries(props)) {
    if (
      SKIPPED.has(name) ||
      value === undefined ||
      value === null ||
      value === false ||
      typeof value === "function"
    ) {
      continue;
    }

    const text =
      name === "style"
        ? styleValue(value as Record<string, unknown>)
        : String(value);

    attributes += ` ${attributeName(name)}="${escapeXml(text)}"`;
  }

  const children = svgMarkup(props.children as ReactNode);

  return `<${type}${attributes}>${children}</${type}>`;
}
