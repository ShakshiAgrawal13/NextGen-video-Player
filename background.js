/**
 * background.js  (Manifest V3 service worker, type: "module")
 * ---------------------------------------------------------------------------
 * Central orchestrator for the extension. The popup never talks to the
 * Gemini API or the page DOM directly — it only messages this service
 * worker, which:
 *
 *   1. Injects the content-extraction scripts into the ACTIVE TAB ONLY,
 *      and only when the user actually requests a summary (performance +
 *      least-privilege security — we never run on pages the user hasn't
 *      asked us to touch).
 *   2. Asks content.js to extract the readable article text.
 *   3. Sends that text to Gemini via utils/api.js.
 *   4. Returns the result (or a friendly error) back to the popup.
 * ---------------------------------------------------------------------------
 */

import { summarizeWithGemini } from "./utils/api.js";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.action === "SUMMARIZE_PAGE") {
    handleSummarizeRequest(message.mode)
      .then((result) => sendResponse(result))
      .catch((err) =>
        sendResponse({ success: false, error: err.message || "Unknown error." })
      );
    // Required: keep the message channel open for the async response above.
    return true;
  }
});

/**
 * Full pipeline: find active tab -> inject extractor -> extract text ->
 * call Gemini -> return summary.
 */
async function handleSummarizeRequest(mode) {
  const tab = await getActiveTab();

  if (!tab || !tab.id) {
    throw new Error("Could not find an active tab to summarize.");
  }

  if (isRestrictedUrl(tab.url)) {
    throw new Error(
      "This page can't be summarized (browser-internal or restricted page)."
    );
  }

  // Inject the extraction engine + content script listener into the page.
  // Both are injected fresh each time — cheap, and guarantees we never run
  // stale code on a page that's already been navigated.
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["utils/extractContent.js", "content.js"],
  });

  const extraction = await sendMessageToTab(tab.id, { action: "EXTRACT_CONTENT" });

  if (!extraction || extraction.success === false) {
    throw new Error(extraction?.error || "Failed to read content from this page.");
  }

  if (!extraction.text || extraction.text.trim().length < 50) {
    throw new Error(
      "Couldn't find enough readable article text on this page to summarize."
    );
  }

  const summary = await summarizeWithGemini(extraction.text, extraction.title, mode);

  return {
    success: true,
    summary,
    title: extraction.title,
    url: extraction.url,
    sourceWordCount: extraction.wordCount,
    mode,
  };
}

/** Resolves the currently active tab in the current window. */
async function getActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

/** Wraps chrome.tabs.sendMessage in a Promise for async/await use. */
function sendMessageToTab(tabId, message) {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }
      resolve(response);
    });
  });
}

/** Blocks pages where content scripts cannot / should not be injected. */
function isRestrictedUrl(url = "") {
  return (
    url.startsWith("chrome://") ||
    url.startsWith("chrome-extension://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("https://chrome.google.com/webstore")
  );
}
