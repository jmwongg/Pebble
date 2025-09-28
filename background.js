chrome.runtime.onInstalled.addListener(() => {
    console.log("Kids' Curiosity Browser installed!");
});

// Listen for popup actions
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "rewritePage") {
    console.log("Rewrite requested with level:", request.level);
    // TODO: Hook Gemini Nano / Summarizer API here
    sendResponse({ status: "ok" });
    }

    if (request.action === "translatePage") {
    console.log("Translate requested to:", request.lang);
    // TODO: Hook Translator API here
    sendResponse({ status: "ok" });
    }

    if (request.action === "toggleKidsMode") {
    console.log("Kids Mode set to:", request.enabled);
    // Could inject/remove filtering logic
    sendResponse({ status: "ok" });
    }

    if (request.action === "openLearningPanel") {
    chrome.tabs.create({
        url: chrome.runtime.getURL("learning_panel.html")
    });
    sendResponse({ status: "ok" });
    }
});