import { cn } from "@/lib/utils";

export type MaskIconProps = {
  src: string;
  label?: string;
} & React.HTMLAttributes<HTMLSpanElement>;

/**
 * Draws a single-color image as a mask filled with the current text color,
 * so it can be tinted with `text-*` classes and follows the theme.
 */
export function MaskIcon({
  src,
  label,
  className,
  style,
  ...props
}: MaskIconProps) {
  const mask = `url(${src}) center / contain no-repeat`;

  return (
    <span
      {...props}
      {...(label
        ? {
            role: "img",
            "aria-label": label,
          }
        : {
            "aria-hidden": true,
          })}
      className={cn("inline-block shrink-0 bg-current", className)}
      style={{
        mask,
        WebkitMask: mask,
        ...style,
      }}
    />
  );
}
