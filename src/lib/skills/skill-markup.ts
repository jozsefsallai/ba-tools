// Parses skill description templates (see `SkillTextData` in
// src/lib/game-data/contract.ts): `{p:N}` parameters, `{e:ID}…{/e}` effects,
// `{s:ID}…{/s}` stats, `{d:ID:N}` effect suffixes and `{{` for a literal `{`.

export type SkillMarkupNode =
  | {
      kind: "text";
      text: string;
    }
  | {
      kind: "param";
      index: number;
    }
  | {
      kind: "effect";
      id: string;
      children: SkillMarkupNode[];
    }
  | {
      kind: "stat";
      id: string;
      children: SkillMarkupNode[];
    }
  | {
      kind: "suffix";
      id: string;
      index: number;
    };

const TAG = /^\{(p|d|e|s|\/e|\/s)(?::([^}:]+))?(?::(\d+))?\}/;

export function parseSkillMarkup(template: string): SkillMarkupNode[] {
  const root: SkillMarkupNode[] = [];
  const stack: SkillMarkupNode[][] = [
    root,
  ];

  let text = "";

  const current = () => stack[stack.length - 1];

  const flush = () => {
    if (text) {
      current().push({
        kind: "text",
        text,
      });
    }

    text = "";
  };

  let i = 0;

  while (i < template.length) {
    if (template.startsWith("{{", i)) {
      text += "{";
      i += 2;
      continue;
    }

    const match = template[i] === "{" ? TAG.exec(template.slice(i)) : null;

    if (!match) {
      text += template[i];
      i++;
      continue;
    }

    flush();

    const [whole, tag, id, index] = match;

    i += whole.length;

    switch (tag) {
      case "p":
        current().push({
          kind: "param",
          index: Number(id),
        });
        break;
      case "d":
        current().push({
          kind: "suffix",
          id,
          index: Number(index),
        });
        break;
      case "e":
      case "s": {
        const children: SkillMarkupNode[] = [];
        current().push({
          kind: tag === "e" ? "effect" : "stat",
          id,
          children,
        });
        stack.push(children);
        break;
      }
      default:
        // A closing tag without an opening one is ignored.
        if (stack.length > 1) {
          stack.pop();
        }
    }
  }

  flush();
  return root;
}
