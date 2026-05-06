import { useEffect, useState, useCallback } from "react";

const KEY = "deenguide:bookmarks:v1";

const read = () => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ayahs: [], hadiths: [], duas: [], answers: [] };
    const parsed = JSON.parse(raw);
    return {
      ayahs: parsed.ayahs || [],
      hadiths: parsed.hadiths || [],
      duas: parsed.duas || [],
      answers: parsed.answers || [],
    };
  } catch {
    return { ayahs: [], hadiths: [], duas: [], answers: [] };
  }
};

const write = (data) => {
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("deenguide:bookmarks-update"));
};

export const useBookmarks = () => {
  const [data, setData] = useState(read);

  useEffect(() => {
    const sync = () => setData(read());
    window.addEventListener("deenguide:bookmarks-update", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("deenguide:bookmarks-update", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const toggle = useCallback((kind, item, idKey = "id") => {
    const current = read();
    const list = current[kind] || [];
    const exists = list.find((x) => x[idKey] === item[idKey]);
    const next = {
      ...current,
      [kind]: exists ? list.filter((x) => x[idKey] !== item[idKey]) : [...list, item],
    };
    write(next);
  }, []);

  const isBookmarked = useCallback(
    (kind, id, idKey = "id") => {
      return (data[kind] || []).some((x) => x[idKey] === id);
    },
    [data]
  );

  const remove = useCallback((kind, id, idKey = "id") => {
    const current = read();
    write({ ...current, [kind]: (current[kind] || []).filter((x) => x[idKey] !== id) });
  }, []);

  const clearAll = useCallback(() => {
    write({ ayahs: [], hadiths: [], duas: [], answers: [] });
  }, []);

  return { data, toggle, isBookmarked, remove, clearAll };
};
