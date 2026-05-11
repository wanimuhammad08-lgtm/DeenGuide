import { supabase } from './supabase';

const KEY = "deenguide:bookmarks:v1";

let isSyncing = false;

const readLocal = () => {
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

const writeLocal = (data) => {
  localStorage.setItem(KEY, JSON.stringify(data));
  window.dispatchEvent(new Event("deenguide:bookmarks-update"));
};

export const syncBookmarks = async (userId) => {
  if (isSyncing || !userId) return;
  isSyncing = true;
  
  try {
    const local = readLocal();
    const toUpload = [];
    
    // 1. Prepare Upload Payload
    for (const [kind, items] of Object.entries(local)) {
      for (const item of items) {
        // Find best id, default to stringified object
        let itemId = item.id || item.number || item.slug || item.title;
        if (!itemId) itemId = JSON.stringify(item).slice(0, 50); 
        
        toUpload.push({
          user_id: userId,
          kind,
          item_id: String(itemId),
          item_data: item,
          last_synced_at: new Date().toISOString()
        });
      }
    }

    // 2. Upload local to Supabase
    if (toUpload.length > 0) {
      const { error } = await supabase
        .from('bookmarks')
        .upsert(toUpload, { onConflict: 'user_id, kind, item_id' });
        
      if (error) console.error("Sync Upload Error:", error);
    }

    // 3. Download from Supabase
    const { data: remoteBookmarks, error: fetchError } = await supabase
      .from('bookmarks')
      .select('*')
      .eq('user_id', userId);

    if (fetchError) {
       console.error("Sync Download Error:", fetchError);
       return;
    }

    // 4. Merge Phase
    const merged = { ayahs: [], hadiths: [], duas: [], answers: [] };
    
    // Add remote items into merged categories
    if (remoteBookmarks) {
        remoteBookmarks.forEach(row => {
           if (merged[row.kind]) {
              // Ensure we don't duplicate
              const itemId = String(row.item_data.id || row.item_data.number || row.item_data.slug || row.item_data.title);
              const exists = merged[row.kind].some(x => 
                 String(x.id || x.number || x.slug || x.title) === itemId
              );
              if (!exists) {
                 merged[row.kind].push(row.item_data);
              }
           }
        });
    }

    // Also ensure all local ones are in merged
    for (const [kind, items] of Object.entries(local)) {
       for (const item of items) {
          const itemId = String(item.id || item.number || item.slug || item.title);
          const exists = merged[kind].some(x => String(x.id || x.number || x.slug || x.title) === itemId);
          if (!exists) {
             merged[kind].push(item);
          }
       }
    }

    // Final local cache overwrite with merged data
    writeLocal(merged);

  } finally {
    isSyncing = false;
  }
};

export const deleteRemoteBookmark = async (userId, kind, itemId) => {
    if (!userId) return;
    await supabase.from('bookmarks').delete().match({ user_id: userId, kind, item_id: String(itemId) });
};

export const upsertRemoteBookmark = async (userId, kind, itemId, itemData) => {
    if (!userId) return;
    await supabase.from('bookmarks').upsert({
       user_id: userId,
       kind,
       item_id: String(itemId),
       item_data: itemData,
       last_synced_at: new Date().toISOString()
    }, { onConflict: 'user_id, kind, item_id' });
};
