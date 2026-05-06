import axios from "axios";

// Using the open API for now until the exact OAuth token URL is provided
const quranApi = axios.create({ baseURL: "https://api.quran.com/api/v4" });

export const qurancom = {
  // Get list of all chapters (Surahs)
  chapters: () => quranApi.get("/chapters?language=en").then((r) => r.data.chapters.map(c => ({
    number: c.id,
    name: c.name_arabic,
    englishName: c.name_simple,
    englishNameTranslation: c.translated_name.name,
    revelationType: c.revelation_place === "makkah" ? "Meccan" : "Medinan"
  }))),

  // Get chapter info
  chapter: (id) => quranApi.get(`/chapters/${id}?language=en`).then((r) => {
    const c = r.data.chapter;
    return {
      number: c.id,
      name: c.name_arabic,
      englishName: c.name_simple,
      englishNameTranslation: c.translated_name.name,
      revelationType: c.revelation_place === "makkah" ? "Meccan" : "Medinan",
      bismillah_pre: c.bismillah_pre
    };
  }),

  // Get chapter info (Themes and Purpose / Tafsir Summary)
  chapterInfo: (id) => quranApi.get(`/chapters/${id}/info?language=en`).then((r) => r.data.chapter_info),

  // Get translations
  translations: () => quranApi.get("/resources/translations?language=en").then((r) => r.data.translations),

  // Get reciters
  reciters: () => quranApi.get("/resources/recitations?language=en").then((r) => r.data.recitations),

  // Fetch all verses for a chapter with word-by-word data, tajweed, and a specific translation
  verses: async (chapterId, translationIds = [131], reciterId = 7) => {
    let allVerses = [];
    let page = 1;
    let totalPages = 1;
    while (page <= totalPages) {
      const res = await quranApi.get(`/verses/by_chapter/${chapterId}`, {
        params: {
          language: "en",
          words: true,
          translations: Array.isArray(translationIds) ? translationIds.join(',') : translationIds,
          audio: reciterId,
          fields: "text_uthmani,text_uthmani_tajweed,text_indopak,v1_page",
          word_fields: "text_uthmani,text_uthmani_tajweed,translation,transliteration,audio_url",
          page: page,
          per_page: 50,
        },
      });
      allVerses = allVerses.concat(res.data.verses);
      totalPages = res.data.pagination.total_pages;
      page++;
    }
    return allVerses;
  },

  // Get all Juzs metadata
  juzs: () => quranApi.get("/juzs").then((r) => r.data.juzs),

  // Get first verse of a specific page
  pageStart: (page) => quranApi.get(`/verses/by_page/${page}`, { params: { per_page: 1 } }).then((r) => r.data.verses[0]),
};
