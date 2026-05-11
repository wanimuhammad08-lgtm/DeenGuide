import { useEffect, useState, useCallback } from "react";
import { deleteRemoteBookmark, upsertRemoteBookmark } from "./syncBookmarks";
import { useAuth } from "@/context/AuthContext";


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
  const { user } = useAuth();


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
    const exists = list.find((x) => String(x[idKey]) === String(item[idKey]));
    const next = {
      ...current,
      [kind]: exists ? list.filter((x) => String(x[idKey]) !== String(item[idKey])) : [...list, item],
    };
    write(next);

    // Optimistic background sync
    if (user) {
      if (exists) {
        deleteRemoteBookmark(user.id, kind, item[idKey]);
      } else {
        upsertRemoteBookmark(user.id, kind, item[idKey], item);
      }
    }
  }, [user]);


  const isBookmarked = useCallback(
    (kind, id, idKey = "id") => {
      return (data[kind] || []).some((x) => String(x[idKey]) === String(id));
    },
    [data]
  );


  const remove = useCallback((kind, id, idKey = "id") => {
    const current = read();
    write({ ...current, [kind]: (current[kind] || []).filter((x) => String(x[idKey]) !== String(id)) });
    
    if (user) {
      deleteRemoteBookmark(user.id, kind, id);
    }
  }, [user]);


  const clearAll = useCallback(() => {
    write({ ayahs: [], hadiths: [], duas: [], answers: [] });
  }, []);

  return { data, toggle, isBookmarked, remove, clearAll };
};
