import { createContext, useContext, useState, useCallback } from "react";
import { ai } from "@/lib/api";
import { toast } from "sonner";

const AIContext = createContext();

export function AIProvider({ children }) {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const ask = useCallback(async (text) => {
    if (!text || typeof text !== "string" || !text.trim() || loading) return;
    const trimmed = text.trim();
    setHistory((h) => [...h, { q: trimmed }]);
    setLoading(true);
    try {
      const data = await ai.ask({ question: trimmed });
      setHistory((h) => {
        const copy = [...h];
        if (copy.length > 0) {
          copy[copy.length - 1] = { q: trimmed, a: data };
        }
        return copy;
      });
    } catch (e) {
      const msg = e?.response?.data?.detail || e.message || "Something went wrong";
      setHistory((h) => {
        const copy = [...h];
        if (copy.length > 0) {
          copy[copy.length - 1] = { q: trimmed, error: msg };
        }
        return copy;
      });
      toast.error("Failed to get an answer", { description: msg });
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const clearHistory = () => setHistory([]);

  return (
    <AIContext.Provider value={{ history, loading, ask, clearHistory }}>
      {children}
    </AIContext.Provider>
  );
}

export const useAI = () => {
  const context = useContext(AIContext);
  if (!context) {
    throw new Error("useAI must be used within an AIProvider");
  }
  return context;
};
