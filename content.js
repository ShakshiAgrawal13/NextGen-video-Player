/**
 * content.js
 * ---------------------------------------------------------------------------
 * This script is injected on-demand (NOT on every page load — see
 * background.js) into the active tab when the user requests a summary.
 * Injecting only when needed keeps the extension lightweight and avoids
 * slowing down every website the user visits.
 *
 * Responsibilities:
 *   1. Listen for a one-off "EXTRACT_CONTENT" message from background.js.
 *   2. Run the extraction heuristics defined in utils/extractContent.js
 *      (which is injected into the page immediately before this file, so
 *      window.__aiSummarizerExtract is already available).
 *   3. Return the extracted { title, text, wordCount, url } payload.
 * ---------------------------------------------------------------------------
 */

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === "EXTRACT_CONTENT") {
    try {
      if (typeof window.__aiSummarizerExtract !== "function") {
        sendResponse({
          success: false,
          error: "Extraction engine failed to load on this page.",
        });
        return true;
      }

      const result = window.__aiSummarizerExtract();
      sendResponse(result);
    } catch (err) {
      sendResponse({
        success: false,
        error: err.message || "Unexpected error extracting page content.",
      });
    }
  }
  // Return true to indicate we may respond asynchronously (defensive,
  // even though this handler responds synchronously).
  return true;
});
