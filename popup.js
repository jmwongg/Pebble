async function sendMessageToTab(message) {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // Inject content.js first if not already
    await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    files: ["content.js"]
    });

    // Now send message
    chrome.tabs.sendMessage(tab.id, message);
}

// Language Translation
document.addEventListener("DOMContentLoaded", () => {
    const dropdown = document.getElementById("languageDropdown");
    const selected = dropdown.querySelector(".selected");
    const options = dropdown.querySelector(".options");
    const translateBtn = document.getElementById("translateBtn");

    // Toggle dropdown open/close
    dropdown.addEventListener("click", () => {
        dropdown.classList.toggle("open");
    });

    // Pick a language
    options.querySelectorAll("li").forEach(option => {
        option.addEventListener("click", (e) => {
            e.stopPropagation(); // ✅ Prevent parent toggle from firing

            // Remove previous selection highlight
            options.querySelectorAll("li").forEach(opt => opt.classList.remove("selected"));

            // Mark this one as selected
            option.classList.add("selected");

            // Update visible selected text
            selected.textContent = option.textContent;

            // Save value
            dropdown.dataset.value = option.dataset.value;

            // Close dropdown
            dropdown.classList.remove("open");
        });
    });

    // Translate button click
    translateBtn.addEventListener("click", () => {
        const lang = dropdown.dataset.value || "en"; // default English
        sendMessageToTab({ action: "translateContent", lang });
        window.close();
    });

    // Close dropdown when clicking outside
    document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove("open");
        }
    });
});

 // === Rewrite Page ===
document.addEventListener("DOMContentLoaded", () => {
    const rewriteBtn = document.getElementById("rewriteBtn");
    const levelSlider = document.getElementById("reading-level");

    if (rewriteBtn && levelSlider) {
    rewriteBtn.addEventListener("click", () => {
        const level = document.getElementById("reading-level").value;
        sendMessageToTab({ action: "rewriteContent", level });
        window.close();

    });
    }

    const slider = document.getElementById("reading-level");
    const label = document.getElementById("level-label");

    if (slider && label) {
        const levels = ["Simple", "Intermediate", "Advanced"];

        // Set initial text
        label.textContent = levels[slider.value];

        // Update live
        slider.addEventListener("input", () => {
        label.textContent = levels[slider.value];
        });
    }
});

document.getElementById("openLearningPanel").addEventListener("click", async () => {
    // Get the active tab in the current window.
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });

    // If there's no active tab, stop the function.
    if (!activeTab) return;

    // Open and enable the side panel for the active tab.
    // The side panel will automatically close in other tabs.
    await chrome.sidePanel.setOptions({
    tabId: activeTab.id,
    path: "learningPanel.html",
    enabled: true
    });

    // Open the side panel.
    await chrome.sidePanel.open({ tabId: activeTab.id });
    window.close();
});

document.getElementById("funFactsBtn").addEventListener("click", async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) return;

    await chrome.sidePanel.setOptions({
        tabId: activeTab.id,
        path: "learningPanel.html#facts",
        enabled: true
    });

    await chrome.sidePanel.open({ tabId: activeTab.id });
    window.close();
});

document.getElementById("quizBtn").addEventListener("click", async () => {
    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab) return;

    await chrome.sidePanel.setOptions({
        tabId: activeTab.id,
        path: "learningPanel.html#quiz", 
        enabled: true
    });

    await chrome.sidePanel.open({ tabId: activeTab.id });
    window.close();
});

