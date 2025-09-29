// Send message to active tab
async function sendMessageToTab(message) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject content.js first if not already
    await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        files: ["content.js"]
    });

    chrome.tabs.sendMessage(tab.id, message);
}

function setupRewriteButton(sliderId, buttonId, labelId) {
    const slider = document.getElementById(sliderId);
    const label = document.getElementById(labelId);
    const levels = ["Simple", "Intermediate", "Advanced"];

    if (slider && label) {
        label.textContent = levels[slider.value];
        slider.addEventListener("input", () => {
            label.textContent = levels[slider.value];
        });
    }

    const btn = document.getElementById(buttonId);
    if (!btn) return;

    btn.addEventListener("click", () => {
        const level = slider ? slider.value : 0;
        sendMessageToTab({ action: "rewriteContent", level });
        window.close();
    });
}

function setupTranslationDropdown(dropdownId, buttonId) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;

    const selected = dropdown.querySelector(".selected");
    const options = dropdown.querySelector(".options");
    const btn = document.getElementById(buttonId);

    // Toggle dropdown
    dropdown.addEventListener("click", () => dropdown.classList.toggle("open"));

    // Select language
    options.querySelectorAll("li").forEach(option => {
        option.addEventListener("click", e => {
            e.stopPropagation();
            options.querySelectorAll("li").forEach(opt => opt.classList.remove("selected"));
            option.classList.add("selected");
            selected.textContent = option.textContent;
            dropdown.dataset.value = option.dataset.value;
            dropdown.classList.remove("open");
        });
    });

    // Translate button
    if (btn) {
        btn.addEventListener("click", () => {
            const lang = dropdown.dataset.value || "en"; // default English
            sendMessageToTab({ action: "translateContent", lang });
            window.close();
        });
    }

    // Close dropdown when clicking outside
    document.addEventListener("click", e => {
        if (!dropdown.contains(e.target)) dropdown.classList.remove("open");
    });
}

function setupSidePanelButton(buttonId, tabId = "overview") {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    btn.addEventListener("click", async () => {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!activeTab) return;

        // Open side panel with the tab hash
        const path = `learningPanel.html#${tabId}`;
        await chrome.sidePanel.setOptions({
            tabId: activeTab.id,
            path,
            enabled: true
        });

        await chrome.sidePanel.open({ tabId: activeTab.id });
        window.close();
    });
}


function setupRestoreButton(buttonClass) {
    const btn = document.querySelector(`.${buttonClass}`);
    if (!btn) return;
    btn.addEventListener("click", () => {
        sendMessageToTab({ action: "restorePage" });
        window.close();
    });
}

// DOMContentLoaded initialization
document.addEventListener("DOMContentLoaded", () => {
    // Rewrite
    setupRewriteButton("reading-level", "rewriteBtn", "level-label");

    // Translation
    setupTranslationDropdown("languageDropdown", "translateBtn");

    // Side panel
    setupSidePanelButton("openLearningPanel");
    setupSidePanelButton("funFactsBtn", "facts");
    setupSidePanelButton("quizBtn", "quiz");

    // Restore page
    setupRestoreButton("restoreToDefault");
});
