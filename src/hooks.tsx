import { useEffect, useState } from "react";
import { api } from "./api";
export function useRemote<T>(path: string, revision = 0, poll = 0) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true,
      running = false;
    setData(undefined);
    setError("");
    const load = async () => {
      if (running) return;
      running = true;
      try {
        const result = await api<T>(path);
        if (live) {
          setData(result);
          setError("");
        }
      } catch (e) {
        if (live) setError((e as Error).message);
      } finally {
        running = false;
      }
    };
    void load();
    const timer = poll ? setInterval(() => void load(), poll) : undefined;
    return () => {
      live = false;
      if (timer) clearInterval(timer);
    };
  }, [path, revision, poll]);
  return { data, error, setData };
}
