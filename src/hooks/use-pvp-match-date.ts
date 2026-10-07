"use client";

import { Storage } from "@/lib/storage";
import { format, isValid, parseISO } from "date-fns";
import { useEffect, useState } from "react";

const lastDateStorage = new Storage<string>("pvp_last_match_date");
const dateModeStorage = new Storage<"today" | "last">("pvp_date_mode");

export function usePvpMatchDate(editing = false) {
  const [date, setDate] = useState(() => new Date());
  const [lastDate, setLastDate] = useState<Date>();
  const [dateMode, setDateMode] = useState<"today" | "last">("today");

  useEffect(() => {
    try {
      const saved = lastDateStorage.get();
      const mode = dateModeStorage.get();
      const parsed = saved ? parseISO(saved) : undefined;

      if (parsed && isValid(parsed)) {
        setLastDate(parsed);
        if (!editing && mode === "last") {
          setDateMode("last");
          setDate(parsed);
        }
      }
    } catch {
      // Date preferences are optional when browser storage is unavailable
    }
  }, [editing]);

  function rememberDate(savedDate: Date) {
    setLastDate(savedDate);

    try {
      lastDateStorage.set(format(savedDate, "yyyy-MM-dd"));
    } catch {
      // A storage failure must not prevent saving a match
    }
  }

  function setDateModeAndDefault(mode: "today" | "last") {
    if (mode === "last" && !lastDate) {
      return;
    }

    setDateMode(mode);
    setDate(mode === "last" ? (lastDate ?? new Date()) : new Date());

    try {
      dateModeStorage.set(mode);
    } catch {
      // Ignore unavailable browser storage
    }
  }

  function handleDateSelection(nextDate: Date | undefined) {
    const selected = nextDate ?? new Date();

    setDate(selected);

    if (dateMode === "last") {
      rememberDate(selected);
    }
  }

  return {
    date,
    setDate,
    lastDate,
    dateMode,
    rememberDate,
    setDateModeAndDefault,
    handleDateSelection,
  };
}
