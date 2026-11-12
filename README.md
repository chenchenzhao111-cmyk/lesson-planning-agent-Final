# Lesson Planning Agent V4 — Gemini Live LLM (Netlify)

This is the existing V4 site with the live model provider changed from OpenAI to **Google Gemini**. It preserves the 3-way server routing (`CLARIFY`, `GENERATE`, `HUMAN_REVIEW`), the four-phase lesson format, exact phase time totals, resource-limit validation, and teacher review warnings. The Gemini API key stays on the Netlify server, NOT in the browser.

## Quick start

1. You already created a **Gemini API Key** in https://aistudio.google.com/api-keys . Do not share it or include it in any HTML, ZIP, GitHub commit, or chat.
2. In your Netlify project: **Project configuration > Environment variables > Add a variable**:
   - Key: `GEMINI_API_KEY`
   - Value: paste YOUR secret Gemini API key
   - Scope: Functions (or All, if the site UI does not offer scope choices)
   - If there is a **Contains secret values** option, enable it.
   - Optional `GEMINI_MODEL`: defaults to `gemini-2.5-flash`. If that model is unavailable for your project, pick an accessible model listed under Google AI Studio's model availability; do not enter the model's display name, but the actual API model identifier.
3. Netlify's normal manual HTML drag-and-drop does NOT deploy serverless functions. Use the **Netlify CLI** or a Git-connected deployment. For a Mac, install Node.js (https://nodejs.org), then use Terminal:

   ```bash
   npm install -g netlify-cli
   cd /path/to/Lesson_Planning_Agent_V4_Gemini
   netlify login
   netlify link
   netlify deploy --prod
   ```

   With `netlify link` select the **existing Netlify site** if you want to keep the original URL. For safety, create a separate Netlify site instead if the original V2/V3 deployment needs to remain available for comparison.

4. Open your site, enter a teaching request, click **Generate with Gemini**. A valid request calls Gemini live; an incomplete request gets CLARIFY; impossible constraints get HUMAN_REVIEW. If an API key isn't configured, you will see a clear error.

## Verify it with this example

- Topic: Evaluating Online Information
- Learners: First-year college students
- Duration: 40
- Setting: Online
- Objective: Compare the credibility of two online sources and support a choice with evidence.
- Materials: Online chat only; no breakout rooms or slides

The expected behavior is a four-phase lesson with total 40 minutes, concrete source comparison, and no required slides or breakout rooms. A second test with Duration blank should return CLARIFY. A third test with six 15-minute activities and only 20 total minutes should return HUMAN_REVIEW.

## Test without API charges

From the project root (Node.js 22+):

```bash
node tests/test-handler.mjs
```

This mocks Gemini, checks decision routing and output validation, and does **not** call any external provider. Actual live output requires deployed code + a real Gemini key; it has NOT been tested here with a real secret key.

## Privacy, free tier & limits

- Gemini free tier has usage limits. Availability and limits can change; verify on https://ai.google.dev/gemini-api/docs/pricing and https://aistudio.google.com .
- Google's Gemini API free tier may use requests to improve products; do not input student names, grades or private educational records.
- Protect public websites against abuse; this starter has request size validation but no authentication or persistent rate limiting. An exposed app can exhaust free quota (or incur charges if billing is later enabled).
- Teachers must verify alignment, pedagogy, factual claims, accessibility, and all constraints. Do not use the model to grade learners or guarantee mastery.
- Environment variables must be set in the Netlify UI/CLI, not `netlify.toml`. Redeploy after changing them.
- Standard `generateContent` is used to obtain a new answer for each generation. This is *live API generation*, not a real-time voice/video stream.

## Project contents

- `site/index.html` — frontend
- `netlify/functions/generate-plan.mjs` — rule validation + Gemini API generation
- `netlify.toml` — Netlify deployment settings
- `tests/test-handler.mjs` — mocked integration tests
- `tests/frontend-check.js` — browser-side test helper

## EDUC 6192 version naming

V2 is rule-based. This project is a **separate V4 Gemini Live LLM version**. Keep V2 accessible if it is the evaluation baseline or target, and update your assignment to clearly identify the actual version being tested.
