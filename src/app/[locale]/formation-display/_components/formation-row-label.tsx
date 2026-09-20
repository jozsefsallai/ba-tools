import {
  DEFAULT_FORMATIONATION_ROW_LABEL,
  type FormationRowLabel,
  formationRowLabelTextShadow,
} from "@/lib/formation-display-utils";
import { cn } from "@/lib/utils";
import type { CSSProperties, ReactNode, Ref } from "react";

export type FormationRowLabelViewProps = {
  label: FormationRowLabel;
};

export function FormationRowLabelView({ label }: FormationRowLabelViewProps) {
  if (!label.text) {
    return null;
  }

  const fontSize = label.fontSize ?? DEFAULT_FORMATIONATION_ROW_LABEL.fontSize;
  const color = label.color ?? DEFAULT_FORMATIONATION_ROW_LABEL.color;
  const shadowEnabled =
    label.shadowEnabled ?? DEFAULT_FORMATIONATION_ROW_LABEL.shadowEnabled;

  return (
    <div
      className="font-nexon-football-gothic font-bold whitespace-pre-wrap text-center shrink-0"
      style={{
        fontSize,
        color,
        textShadow: shadowEnabled
          ? formationRowLabelTextShadow(label)
          : undefined,
      }}
    >
      {label.text}
    </div>
  );
}

export type FormationRowsStackItem = {
  key: string;
  label?: FormationRowLabel;
  children: ReactNode;
};

export type FormationRowsStackProps = {
  items: FormationRowsStackItem[];
  rowGap?: number;
  className?: string;
  style?: CSSProperties;
  ref?: Ref<HTMLDivElement>;
};

export function FormationRowsStack({
  items,
  rowGap = 8,
  className,
  style,
  ref,
}: FormationRowsStackProps) {
  return (
    <div
      ref={ref}
      className={cn("inline-grid w-fit max-w-full py-2", className)}
      style={{
        gridTemplateColumns: "auto auto auto",
        alignItems: "center",
        rowGap,
        ...style,
      }}
    >
      {items.map((item) => {
        const label = item.label?.text ? item.label : undefined;
        const distance =
          label?.distance ?? DEFAULT_FORMATIONATION_ROW_LABEL.distance;
        const leftLabel = label?.side === "left" ? label : undefined;
        const rightLabel = label?.side === "right" ? label : undefined;

        return (
          <div key={item.key} className="contents">
            <div
              className="justify-self-end"
              style={{ marginRight: leftLabel ? distance : 0 }}
            >
              {leftLabel ? <FormationRowLabelView label={leftLabel} /> : null}
            </div>

            <div className="min-w-0 justify-self-start">{item.children}</div>

            <div
              className="justify-self-start"
              style={{ marginLeft: rightLabel ? distance : 0 }}
            >
              {rightLabel ? <FormationRowLabelView label={rightLabel} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
