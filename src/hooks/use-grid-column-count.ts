import { useEffect, useState } from "react";

const LG_BREAKPOINT = 1024;
const MD_BREAKPOINT = 768;

function getGridColumnCount(): number {
  if (typeof window === "undefined") {
    return 1;
  }

  if (window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`).matches) {
    return 3;
  }

  if (window.matchMedia(`(min-width: ${MD_BREAKPOINT}px)`).matches) {
    return 2;
  }

  return 1;
}

export function useGridColumnCount(): number {
  const [columnCount, setColumnCount] = useState(1);

  useEffect(() => {
    setColumnCount(getGridColumnCount());

    const lgMedia = window.matchMedia(`(min-width: ${LG_BREAKPOINT}px)`);
    const mdMedia = window.matchMedia(`(min-width: ${MD_BREAKPOINT}px)`);

    const onChange = () => {
      setColumnCount(getGridColumnCount());
    };

    lgMedia.addEventListener("change", onChange);
    mdMedia.addEventListener("change", onChange);

    return () => {
      lgMedia.removeEventListener("change", onChange);
      mdMedia.removeEventListener("change", onChange);
    };
  }, []);

  return columnCount;
}
