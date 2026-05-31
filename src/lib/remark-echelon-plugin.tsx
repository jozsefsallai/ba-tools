import { FormationPreview } from "@/app/formation-display/_components/formation-preview";
import { useStudents } from "@/hooks/use-students";
import { parseEchelon } from "@/lib/echelon-parser";
import { inferFormationType } from "@/lib/formation-type";
import type { Root } from "mdast";
import { createElement, useMemo } from "react";
import { visit } from "unist-util-visit";

type EchelonComponentProps = {
  data: string;
};

function EchelonComponent({ data }: EchelonComponentProps) {
  const { students } = useStudents();

  const parsedData = useMemo(() => {
    return parseEchelon(students, data);
  }, [data]);

  const strikers = useMemo(
    () =>
      parsedData.strikers.map((item, idx) =>
        item
          ? {
              id: `striker-${idx}`,
              student: item.student,
              level: item.level,
              starLevel: item.starLevel,
              ueLevel: item.ueLevel,
              starter: item.starter,
              starterOrder: item.starterOrder,
              borrowed: item.borrowed,
            }
          : { id: `striker-empty-${idx}` },
      ),
    [parsedData],
  );

  const specials = useMemo(
    () =>
      parsedData.specials.map((item, idx) =>
        item
          ? {
              id: `special-${idx}`,
              student: item.student,
              level: item.level,
              starLevel: item.starLevel,
              ueLevel: item.ueLevel,
              starter: item.starter,
              starterOrder: item.starterOrder,
              borrowed: item.borrowed,
            }
          : { id: `special-empty-${idx}` },
      ),
    [parsedData],
  );

  const formationType = useMemo(
    () =>
      inferFormationType([
        {
          strikers,
          specials,
        },
      ]),
    [strikers, specials],
  );

  return (
    <div
      className="flex items-center gap-3 prose-img:my-0"
      style={{ zoom: 0.8 }}
    >
      <FormationPreview
        strikers={strikers}
        specials={specials}
        formationType={formationType}
      />
    </div>
  );
}

export default function remarkEchelonPlugin() {
  return (tree: Root) => {
    visit(tree, (node) => {
      if (node.type === "code" && node.lang === "formation") {
        const data = node.value;

        (node as any).type = "element";
        (node as any).value = createElement(EchelonComponent, { data });
      }
    });
  };
}
