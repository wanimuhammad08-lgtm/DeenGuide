import axios from "axios";

// Zero-config: Automatically use live backend when not on localhost
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 
  (window.location.hostname === "localhost" ? "http://localhost:8001" : "https://deenguide.onrender.com");
export const API = `${BACKEND_URL}/api`;

const http = axios.create({ baseURL: API, timeout: 60000 });

export const ai = {
  ask: (payload) => http.post("/ai/ask", payload).then((r) => r.data),
};

export const quran = {
  surahs: () => http.get("/quran/surahs").then((r) => r.data),
  surah: (n, edition = "en.sahih", reciter = "ar.alafasy") =>
    http.get(`/quran/surah/${n}`, { params: { edition, reciter } }).then((r) => r.data),
  search: (q) => http.get("/quran/search", { params: { q } }).then((r) => r.data),
  reciters: () => http.get("/quran/reciters").then((r) => r.data),
  editions: () => http.get("/quran/editions").then((r) => r.data),
  tafsirs: () => http.get("/quran/tafsirs").then((r) => r.data),
  tafsir: (surah, ayah, edition = "en-tafisr-ibn-kathir") =>
    http.get(`/quran/tafsir/${surah}/${ayah}`, { params: { edition } }).then((r) => r.data),
};

export const hadith = {
  collections: () => http.get("/hadith/collections").then((r) => r.data),
  search: (params) => http.get("/hadith/search", { params }).then((r) => r.data),
  books: () => http.get("/hadith/v2/books").then((r) => r.data),
  searchV2: (params) => http.get("/hadith/v2/search", { params }).then((r) => r.data),
  detail: (book, number) => http.get(`/hadith/v2/${book}/${number}`).then((r) => r.data),
  chapters: (book) => http.get(`/hadith/v2/${book}/chapters`).then((r) => r.data),
  chapter: (book, n, params) =>
    http.get(`/hadith/v2/${book}/chapter/${n}`, { params }).then((r) => r.data),
};

export const duas = {
  categories: () => http.get("/duas/categories").then((r) => r.data),
  category: (id) => http.get(`/duas/category/${id}`).then((r) => r.data),
  topic: (id) => http.get(`/duas/topic/${id}`).then((r) => r.data),
  search: (q) => http.get("/duas/search", { params: { q } }).then((r) => r.data),
  detail: (id) => http.get(`/duas/${id}`).then((r) => r.data),
  bookmarks: () => http.get("/duas/bookmarks").then((r) => r.data),
};
