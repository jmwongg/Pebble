// This runs inside every tab

// Example rewrite (placeholder)
function rewriteContent(level) {
    const bodyText = document.body.innerText;
    console.log("Original content:", bodyText.slice(0, 100)); // preview
    // TODO: Call AI rewrite API
}

// Example translation (placeholder)
function translateContent(lang) {
    const bodyText = document.body.innerText;
    console.log("Translate content to:", lang);
    // TODO: Call AI translation API
}

// Listen for messages from popup/background
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "rewriteContent") {
    rewriteContent(request.level);
    sendResponse({ status: "rewriting" });
    }

    if (request.action === "translateContent") {
    translateContent(request.lang);
    sendResponse({ status: "translating" });
    }
});
