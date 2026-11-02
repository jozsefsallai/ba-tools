"use client";

import { useEffect, useState } from "react";
import { requestVirtualGridRestore } from "@/components/common/virtual-grid";

export const STUDENT_LIST_RESTORE_KEY = "students";

const LIST_QUERY_STORAGE_KEY = "students:list-query";

export function saveStudentListQuery(query: string) {
  try {
    sessionStorage.setItem(LIST_QUERY_STORAGE_KEY, query);
  } catch {
    // ¯\_(ツ)_/¯
  }
}

export function useStudentListLink() {
  const [query, setQuery] = useState("");

  useEffect(() => {
    try {
      setQuery(sessionStorage.getItem(LIST_QUERY_STORAGE_KEY) ?? "");
    } catch {
      // ¯\_(ツ)_/¯
    }
  }, []);

  return {
    href: query ? `/students?${query}` : "/students",
    scroll: false,
    onClick: () => requestVirtualGridRestore(STUDENT_LIST_RESTORE_KEY),
  };
}
