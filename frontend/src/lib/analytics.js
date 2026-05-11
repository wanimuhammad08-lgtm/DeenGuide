import { supabase } from './supabase';

// Generate or retrieve anonymous session ID for guest journey tracking
let sessionId = sessionStorage.getItem('deenguide_session_id');
if (!sessionId) {
  // Use crypto.randomUUID if available, else fallback to a simpler approach
  sessionId = typeof crypto !== 'undefined' && crypto.randomUUID 
    ? crypto.randomUUID() 
    : Math.random().toString(36).substring(2, 15);
  sessionStorage.setItem('deenguide_session_id', sessionId);
}

// Soft rate limiting: Prevent duplicate exact events within 5 seconds
const RECENT_EVENTS = new Set();

export const trackEvent = async (eventType, feature, metadata = {}) => {
  try {
    const eventKey = `${eventType}_${feature}_${JSON.stringify(metadata)}`;
    
    if (RECENT_EVENTS.has(eventKey)) return;
    RECENT_EVENTS.add(eventKey);
    setTimeout(() => RECENT_EVENTS.delete(eventKey), 5000);

    // Fetch current user if available (don't block if not)
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id || null;

    // Fire and forget insert
    await supabase.from('analytics_events').insert({
      user_id: userId,
      session_id: sessionId,
      event_type: eventType,
      feature: feature,
      metadata: metadata,
    });
  } catch (error) {
    console.warn('Analytics tracking failed:', error);
  }
};
