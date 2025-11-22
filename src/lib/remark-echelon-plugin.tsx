import { EmptyCard } from "@/components/common/empty-card";
import { StudentCard } from "@/components/common/student-card";
import { useStudents } from "@/hooks/use-students";
import { parseEchelon } from "@/lib/echelon-parser";
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

  return (
    <div
      className="flex items-center gap-3 prose-img:my-0"
      style={{ zoom: 0.8 }}
    >
      <div className="flex items-center gap-[2px]">
        {parsedData.strikers.map((item, idx) =>
          item ? (
            <StudentCard
              key={idx}
              student={item.student}
              level={item.level}
              starLevel={item.starLevel}
              ueLevel={item.ueLevel}
              starter={item.starter}
              borrowed={item.borrowed}
            />
          ) : (
            <EmptyCard key={idx} />
          ),
        )}
      </div>

      <div className="flex items-center gap-[2px]">
        {parsedData.specials.map((item, idx) =>
          item ? (
            <StudentCard
              key={idx}
              student={item.student}
              level={item.level}
              starLevel={item.starLevel}
              ueLevel={item.ueLevel}
              starter={item.starter}
              borrowed={item.borrowed}
            />
          ) : (
            <EmptyCard key={idx} />
          ),
        )}
      </div>
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
