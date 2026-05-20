# Requirements Document

## Introduction

This feature introduces a comprehensive conversational follow-up system for the DeenGuide AI chat. Currently, every response from the AI generates a full structured article regardless of conversational context. This feature adds intelligent topic continuity detection, a lightweight follow-up response format, adaptive UI styling, and context mode management so that conversations feel like a natural back-and-forth with a knowledgeable Islamic teacher rather than repeated article generation.

## Glossary

- **Context_Detector**: The backend module responsible for analyzing incoming questions against conversation history to determine whether a question is a follow-up or a new topic.
- **Context_Mode**: An enumerated field indicating the response style: `full`, `follow_up`, `clarification`, `comparison`, or `quick_answer`.
- **Conversation_History**: The ordered list of prior user questions and AI responses within the current session, used for context analysis. Limited to the last 6 turns (12 messages: 6 user + 6 assistant).
- **Follow_Up_Renderer**: The frontend component responsible for rendering follow-up responses with lighter, conversational styling distinct from full article cards.
- **Hadith_Matcher**: The backend module responsible for resolving hadith references to specific hadith records using a prioritized matching strategy.
- **Topic_Signature**: A set of extracted Islamic subject keywords (maximum 10 keywords) and semantic markers representing the current conversation topic.
- **DeenGuide_AI**: The AI assistant system that generates Islamic guidance responses using the Groq API with the llama-3.3-70b-versatile model.
- **Ask_Page**: The frontend page (`Ask.jsx`) where users interact with the AI chat interface.
- **Session**: A single continuous conversation between a user and the DeenGuide_AI within one browser session, persisting until the user clears history or closes the browser tab.

## Requirements

### Requirement 1: Semantic Follow-Up Detection

**User Story:** As a user, I want the AI to understand that my follow-up questions relate to the previous topic even when I do not explicitly mention it, so that I get contextual answers without repeating myself.

#### Acceptance Criteria

1. WHEN a user submits a question and Conversation_History contains at least one prior exchange (minimum 1 user message and 1 assistant response), THE Context_Detector SHALL analyze the new question against the Topic_Signature of the previous exchanges to determine semantic relatedness within 2 seconds of receiving the request.
2. WHEN the Context_Detector determines that the new question shares 2 or more keywords with the current Topic_Signature or addresses the same Islamic subject domain (e.g., prayer, fasting, zakat), THE Context_Detector SHALL classify the Context_Mode as `follow_up`.
3. WHEN the user's question contains anaphoric pronouns or demonstratives referencing prior context (e.g., "Can I do that?", "What about this?", "Is it required?", "Tell me more"), THE Context_Detector SHALL classify the Context_Mode as `follow_up`.
4. WHEN the user's question addresses a related Islamic subject within the same fiqh domain as the prior topic (e.g., "What if I miss Witr?" after discussing Tahajjud, both being night prayers), THE Context_Detector SHALL classify the Context_Mode as `follow_up`.
5. WHEN the user's question shares zero keywords with the current Topic_Signature and belongs to a different Islamic domain (e.g., "How to calculate Zakat?" after discussing Tahajjud), THE Context_Detector SHALL classify the Context_Mode as `full` and replace the current Topic_Signature with keywords extracted from the new question.
6. IF the Conversation_History is empty (no prior exchanges exist), THEN THE Context_Detector SHALL classify the Context_Mode as `full` regardless of question content.

### Requirement 2: Context Mode Classification

**User Story:** As a developer, I want a structured context mode system instead of a simple boolean, so that the AI can adapt its response format to different conversational patterns.

#### Acceptance Criteria

1. THE DeenGuide_AI SHALL support exactly the following Context_Mode values: `full`, `follow_up`, `clarification`, `comparison`, and `quick_answer`, rejecting any other value with a validation error.
2. WHEN Context_Mode is `full`, THE DeenGuide_AI SHALL generate a complete structured response containing all of the following sections: detailed_answer (150–300 words), quran_refs (1–2 references), hadith_refs (1–3 references), scholarly_notes (1 paragraph), and conclusion (1 paragraph).
3. WHEN Context_Mode is `follow_up`, THE DeenGuide_AI SHALL generate a concise conversational response (50–200 words) that assumes prior context is known and answers only the new aspect raised by the user.
4. WHEN Context_Mode is `quick_answer`, THE DeenGuide_AI SHALL generate a direct answer of 1–3 sentences (maximum 75 words) without quran_refs, hadith_refs, or scholarly_notes sections.
5. THE AskRequest model SHALL include a `context_mode` field of type string that accepts one of the five enumerated Context_Mode values, defaulting to `full` when not provided.
6. WHEN Context_Mode is `clarification`, THE DeenGuide_AI SHALL generate a response (75–150 words) that re-explains or elaborates on a specific point from the prior response without introducing new evidence.
7. WHEN Context_Mode is `comparison`, THE DeenGuide_AI SHALL generate a response (100–250 words) that contrasts two or more scholarly positions or rulings relevant to the conversation topic, including scholarly_notes.

### Requirement 3: Conversational Follow-Up Response Format

**User Story:** As a user, I want follow-up answers to feel like a natural continuation of the conversation rather than a new article, so that the interaction feels like talking to a knowledgeable teacher.

#### Acceptance Criteria

1. WHEN Context_Mode is `follow_up`, THE DeenGuide_AI SHALL omit the introductory greeting ("Assalamu Alaikum" or any Salam variant) from the response text.
2. WHEN Context_Mode is `follow_up`, THE DeenGuide_AI SHALL not repeat any ruling, hadith text, or Quran verse that was already provided in a prior response within the same Session's Conversation_History.
3. WHEN Context_Mode is `follow_up` and the question is a simple clarification (no fiqh evidence required), THE DeenGuide_AI SHALL produce a response between 50 and 150 words.
4. WHEN Context_Mode is `follow_up` and the question requires fiqh evidence (e.g., madhab-specific rulings, halal/haram determinations, or scholarly disagreements), THE DeenGuide_AI SHALL produce a response between 100 and 200 words and include a compact evidence section with at most 1 Quran reference and 1 Hadith reference.
5. WHEN Context_Mode is `follow_up`, THE DeenGuide_AI SHALL maintain scholarly accuracy by grounding claims in Quran and authentic Sunnah, even when evidence sections are omitted from the response structure.

### Requirement 4: Follow-Up UI Styling

**User Story:** As a user, I want follow-up messages to visually feel lighter than full answers, so that I can instantly recognize them as continuations rather than new articles.

#### Acceptance Criteria

1. WHEN the Ask_Page renders a response with Context_Mode `follow_up`, THE Follow_Up_Renderer SHALL display the response without the card header bar (the section containing the DeenGuide AI logo, label, and save button) and without section dividers (border-t elements between evidence sections).
2. WHEN the Ask_Page renders a response with Context_Mode `follow_up`, THE Follow_Up_Renderer SHALL use vertical padding of no more than 16px between content blocks, compared to the 24px spacing used in full response cards.
3. WHEN the Ask_Page renders a response with Context_Mode `follow_up` that includes evidence references, THE Follow_Up_Renderer SHALL display them inline as a single line per reference (e.g., "Surah Al-Baqarah 2:183 · Sahih Bukhari #1903") rather than as full bordered evidence cards with Arabic text and translation blocks.
4. WHEN the Ask_Page renders a response with Context_Mode `full`, THE Ask_Page SHALL display the existing complete structured card layout with the header bar, section dividers, full evidence cards, and all section labels.
5. WHEN the Ask_Page renders a response with Context_Mode `follow_up`, THE Follow_Up_Renderer SHALL render the response container with a border-radius and background consistent with chat bubble styling (rounded-2xl, no outer border) to visually distinguish it from full article cards (rounded-3xl with border).

### Requirement 5: Adaptive Evidence Inclusion

**User Story:** As a user, I want follow-up answers to include Quran and Hadith references only when they add value, so that simple answers remain concise while complex fiqh questions still have scholarly backing.

#### Acceptance Criteria

1. WHEN Context_Mode is `follow_up` and the question is a simple factual or yes/no question (e.g., "Is it mandatory?", "How many rakats?", "What time does it start?"), THE DeenGuide_AI SHALL respond with a direct answer containing no quran_refs and no hadith_refs in the response payload.
2. WHEN Context_Mode is `follow_up` and the question involves a fiqh ruling, madhab comparison, halal/haram determination, or scholarly disagreement, THE DeenGuide_AI SHALL include at least one evidence reference (either a Quran reference or a Hadith reference) in the response payload.
3. WHEN evidence is included in a follow-up response, THE DeenGuide_AI SHALL include a maximum of 1 Quran reference and a maximum of 1 Hadith reference (total maximum 2 evidence items).
4. IF the same evidence (identical surah:ayah or identical collection:number) was already cited in a prior response within the same Session, THEN THE DeenGuide_AI SHALL not repeat that evidence and SHALL either cite a different supporting reference or omit the evidence section.

### Requirement 6: Automatic Context Reset on Topic Change

**User Story:** As a user, I want the AI to automatically detect when I change topics and switch back to full response mode, so that I always get comprehensive answers for new subjects.

#### Acceptance Criteria

1. WHEN the Context_Detector determines that the user's new question shares zero keywords with the current Topic_Signature and does not contain anaphoric references to prior context, THE Context_Detector SHALL set Context_Mode to `full`.
2. WHEN Context_Mode is reset to `full` due to a topic change, THE Context_Detector SHALL replace the current Topic_Signature entirely with a new set of keywords (maximum 10) extracted from the new question.
3. WHEN the user explicitly starts a new topic after a series of follow-ups, THE DeenGuide_AI SHALL generate a complete structured response including the greeting, detailed_answer, quran_refs, hadith_refs, scholarly_notes, and conclusion sections.
4. WHEN Context_Mode is reset to `full`, THE Context_Detector SHALL retain the full Conversation_History (last 6 turns) for the backend but SHALL NOT use prior Topic_Signature for relatedness scoring of subsequent questions.

### Requirement 7: AI Prompting for Follow-Up Continuity

**User Story:** As a user, I want the AI to continue naturally from previous context without re-explaining everything, so that the conversation flows like a real discussion.

#### Acceptance Criteria

1. WHEN Context_Mode is `follow_up`, THE DeenGuide_AI SHALL prepend a system prompt instruction stating: "The user is asking a follow-up question. Assume they have read your previous responses. Do not repeat prior information. Answer only the new aspect concisely."
2. WHEN Context_Mode is `follow_up`, THE DeenGuide_AI SHALL use a simplified JSON response schema containing only the fields: `answer_text` (string, required), `evidence` (object with optional `quran_ref` and optional `hadith_ref`), and `context_mode` (string, required).
3. WHEN Context_Mode is `follow_up`, THE DeenGuide_AI SHALL NOT generate the full structured layout fields (detailed_answer, scholarly_notes, conclusion, related_duas) in the response JSON.
4. IF the DeenGuide_AI generates a follow-up response where more than 30% of sentences (rounded up) are semantically identical to sentences in the immediately preceding assistant response in the same Session, THEN THE DeenGuide_AI SHALL regenerate the response with an additional prompt constraint: "Your previous response was too repetitive. Provide only new information."
5. THE DeenGuide_AI SHALL attempt the regeneration described in criterion 4 at most 1 time; if the second attempt still exceeds 30% repetition, THE DeenGuide_AI SHALL return the second attempt as-is.

### Requirement 8: Hadith Number Matching Priority

**User Story:** As a developer, I want hadith references to be matched using a strict priority order, so that accidental mismatches between similar hadith numbers are prevented.

#### Acceptance Criteria

1. WHEN the Hadith_Matcher resolves a hadith reference from an AI response, THE Hadith_Matcher SHALL apply matching in this strict priority order: (1) exact hadith number string match against the `number` field, (2) exact Arabic numeral match against the `arabic_number` field if present, (3) match against the `reference.hadith` field, (4) decimal-normalized matching (treating "1.23" and "123" as equivalent).
2. WHEN a match is found at any priority level, THE Hadith_Matcher SHALL immediately return that match without checking lower priority levels.
3. IF no match is found after exhausting all four priority levels, THEN THE Hadith_Matcher SHALL return the AI-provided hadith text (english field) and collection name without a deep link URL, and SHALL set a `matched` flag to `false` in the hadith reference object.
4. THE Hadith_Matcher SHALL perform matching only against hadiths within the same collection (book slug) as specified in the AI response, and SHALL NOT cross-match across different collections.

### Requirement 9: Hadith Deep Linking with Auto-Scroll

**User Story:** As a user, I want clicking a hadith reference in an AI answer to take me directly to that hadith with it highlighted, so that I can quickly verify the source.

#### Acceptance Criteria

1. WHEN a user clicks a hadith "Read in App" link in an AI response, THE Ask_Page SHALL navigate to `/hadith?book={collection_slug}&number={hadith_number}` passing the collection slug and hadith number as URL query parameters.
2. WHEN the Hadith page loads with `book` and `number` query parameters, THE Hadith page SHALL auto-scroll the viewport so that the matched hadith element is visible within 500 milliseconds of page load completion.
3. WHEN the Hadith page scrolls to a matched hadith, THE Hadith page SHALL apply a highlight animation (background color transition) to the target hadith element that fades in over 300 milliseconds, remains visible for 2 seconds, and fades out over 300 milliseconds.
4. WHEN the Hadith page scrolls to a matched hadith that belongs to a chapter grouping, THE Hadith page SHALL ensure the parent chapter heading is visible by expanding any collapsed chapter accordion or scrolling to include the chapter heading above the target hadith.
5. IF the Hadith page receives `book` and `number` parameters but no matching hadith is found in the loaded data, THEN THE Hadith page SHALL display an inline notification indicating that the specific hadith could not be located in the local collection, and SHALL not scroll or highlight any element.

### Requirement 10: Follow-Up Response Data Model

**User Story:** As a developer, I want the API response model to support both full and follow-up response formats, so that the frontend can render the appropriate layout.

#### Acceptance Criteria

1. THE AskResponse model SHALL include a `context_mode` field of type string containing one of the five enumerated Context_Mode values, present in every response regardless of mode.
2. WHEN Context_Mode is `follow_up`, `clarification`, or `quick_answer`, THE AskResponse SHALL include an `answer_text` field of type string (minimum 1 character, maximum 1000 characters) containing the concise conversational response.
3. WHEN Context_Mode is `follow_up`, THE AskResponse SHALL include an optional `evidence` object containing at most one `quran_ref` field (QuranRef object) and at most one `hadith_ref` field (HadithRef object); both fields SHALL be null when no evidence is included.
4. WHEN Context_Mode is `full`, THE AskResponse SHALL include all existing fields (id, question, answer, detailed_answer, explanation, quran_refs, hadith_refs, scholarly_notes, conclusion, related_duas, evidence_type, created_at) maintaining backward compatibility with the current response structure.
5. THE AskResponse SHALL always include the `id` (string, UUID format) and `created_at` (string, ISO 8601 format) fields regardless of Context_Mode.

### Requirement 11: Conversation Session Management

**User Story:** As a user, I want my conversation context to persist throughout my chat session, so that the AI remembers what we discussed and can provide relevant follow-ups.

#### Acceptance Criteria

1. THE AIContext SHALL maintain the Topic_Signature (a list of up to 10 keyword strings) as React state for the duration of the current browser session.
2. WHEN the user invokes the `clearHistory` function (clears conversation), THE AIContext SHALL reset the Topic_Signature to an empty list and reset Context_Mode to `full`.
3. THE AIContext SHALL pass the last 6 conversation turns (up to 6 user messages and their corresponding 6 assistant responses, maximum 12 messages total) to the backend with each request in the `conversation_history` field of the AskRequest payload.
4. WHEN the browser tab is closed or navigated away from the Ask_Page, THE AIContext SHALL lose all session state (Topic_Signature, Conversation_History, Context_Mode) since state is held in React memory only.
5. IF the Conversation_History exceeds 6 turns, THEN THE AIContext SHALL include only the most recent 6 turns (oldest turns are dropped first) to keep the request payload under 12 messages.
