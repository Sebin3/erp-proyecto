import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import { today } from "./model";

const nextSixAm = () => {
  const now = new Date();
  const next = new Date(now);
  next.setHours(6, 0, 0, 0);
  if (next <= now) next.setDate(next.getDate() + 1);
  return next.getTime() - now.getTime();
};

export function useDailyDateFilter(): [
  string,
  Dispatch<SetStateAction<string>>,
] {
  const [date, setDate] = useState(today);

  useEffect(() => {
    let timer = 0;
    const scheduleReset = () => {
      timer = window.setTimeout(() => {
        setDate(today());
        scheduleReset();
      }, nextSixAm());
    };
    scheduleReset();
    return () => window.clearTimeout(timer);
  }, []);

  return [date, setDate];
}
