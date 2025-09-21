document.addEventListener("DOMContentLoaded", () => {
    const rewriteBtn = document.getElementById("rewriteBtn");
    const translateBtn = document.getElementById("translateBtn");
    const languageSelect = document.getElementById("languageSelect");
    const kidsModeToggle = document.getElementById("kidsMode");
    const openLearningPanel = document.getElementById("openLearningPanel");

    // Handle rewrite
    rewriteBtn.addEventListener("click", () => {
    const level = document.getElementById("reading-level").value;
    console.log("Rewrite page at level:", level);
    // TODO: send message to background.js for AI rewrite
    });

    // Handle translate
    translateBtn.addEventListener("click", () => {
    const lang = languageSelect.value;
    console.log("Translate page to:", lang);
    // TODO: call Chrome AI Translator API here
    });

    // Handle kids mode toggle
    kidsModeToggle.addEventListener("change", () => {
    if (kidsModeToggle.checked) {
        console.log("Kids Mode Enabled");
        // TODO: inject filtering rules
    } else {
        console.log("Kids Mode Disabled");
    }
    });

    // Open learning panel
    openLearningPanel.addEventListener("click", () => {
    console.log("Open learning panel");
    // TODO: open a sidebar or new tab for gamified features
    });
});

document.addEventListener("DOMContentLoaded", () => {
    const rewriteBtn = document.getElementById("rewriteBtn");
    const translateBtn = document.getElementById("translateBtn");
    const languageSelect = document.getElementById("languageSelect");
    const kidsModeToggle = document.getElementById("kidsMode");
    const openLearningPanel = document.getElementById("openLearningPanel");

    // Rewrite page
    rewriteBtn.addEventListener("click", async () => {
    const level = document.getElementById("reading-level").value;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: "rewriteContent", level });
    });

    // Translate page
    translateBtn.addEventListener("click", async () => {
    const lang = languageSelect.value;
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    chrome.tabs.sendMessage(tab.id, { action: "translateContent", lang });
    });

    // Kids mode toggle
    kidsModeToggle.addEventListener("change", () => {
    chrome.runtime.sendMessage({
        action: "toggleKidsMode",
        enabled: kidsModeToggle.checked
    });
    });

    // Open learning panel
    openLearningPanel.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "openLearningPanel" });
    });
});
