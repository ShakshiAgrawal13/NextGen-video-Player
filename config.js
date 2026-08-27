/**
 * config.js
 * ---------------------------------------------------------------------------
 * Centralized configuration for the AI Browser Summarizer extension.
 *
 * SECURITY NOTE (read this before shipping to real users):
 * Chrome Extensions run entirely on the client. ANY value placed in this file
 * is bundled inside the .crx package and can be extracted by anyone who
 * downloads your extension (via chrome://extensions in Developer Mode, or by
 * unzipping the .crx). There is no way to make a key placed here 100% secret.
 *
 * For a portfolio / personal-use build, storing the key here (and never
 * committing it to a public repo) is an accepted, common pattern.
 *
 * For a PRODUCTION build distributed to third parties, the recommended
 * architecture is:
 *   Extension  --->  Your own backend proxy (Cloud Function / Node server)
 *                     which holds the real Gemini key server-side
 *                     and applies rate limiting / auth
 *              --->  Google Gemini API
 *
 * The background.js file in this project is already structured so that
 * swapping "call Gemini directly" for "call my backend proxy" only requires
 * changing GEMINI_ENDPOINT below and removing the key from the request.
 * See README.md → "Securing the API Key in Production" for full details.
 * ---------------------------------------------------------------------------
 */

// TODO: Replace with your own Gemini API key from https://aistudio.google.com/app/apikey
// NEVER commit a real key to a public GitHub repository.
export const GEMINI_API_KEY = "AQ.Ab8RN6IeVRqEpmk5cx1u81XPWqZApz95O3kKCh-Nl9WDZO0nLQ";

// Gemini model to use. "gemini-2.5-flash" is fast and cost-efficient for
// summarization tasks. Swap to "gemini-1.5-pro" for higher-quality output.
export const GEMINI_MODEL = "gemini-3.6-flash";

// Base REST endpoint for the Generative Language API.
export const GEMINI_ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`;

// Maximum characters of page text sent to Gemini in a single request.
// Keeps requests fast, controls token/cost usage, and stays comfortably
// under Gemini's input context window.
export const MAX_CONTENT_CHARS = 15000;

// Maximum number of past summaries kept in chrome.storage.local history.
export const MAX_HISTORY_ITEMS = 5;

// Request timeout (ms) — abort slow/hung network calls gracefully.
export const REQUEST_TIMEOUT_MS = 30000;
