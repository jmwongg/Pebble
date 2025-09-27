// Create progress UI (structure only)
function createProgressUI() {
    let box = document.getElementById("kids-progress-box");
    if (!box) {
    box = document.createElement("div");
    box.id = "kids-progress-box";
    box.innerHTML = `
        <div id="kids-progress-text">Preparing translation…</div>
        <div class="bar-container">
        <div id="kids-progress-bar"></div>
        </div>
    `;
    document.body.appendChild(box);
    }
}

// Update progress UI
function updateProgressUI(stage, pct) {
    const text = document.getElementById("kids-progress-text");
    const bar = document.getElementById("kids-progress-bar");
    if (text) text.textContent = stage;
    if (bar && pct !== null) bar.style.width = pct + "%";
}

// Remove progress UI
function removeProgressUI() {
    const box = document.getElementById("kids-progress-box");
    if (box) box.remove();
}


// === Collect text nodes ===
async function collectTranslationNodes() {
    const selectors = "p, h1, h2, h3, h4, h5, h6, li, figcaption, blockquote";
    const elements = document.querySelectorAll(selectors);

    const chunks = [];
    elements.forEach((el, idx) => {
    const text = el.innerText.trim();
    if (text) {
        chunks.push({ id: idx, el, text });
    }
    });
    return chunks;
}

// === Chunk-by-chunk Translation with Availability Check ===
async function translatePage(targetLanguage) {
    if (!("Translator" in self) || !("LanguageDetector" in self)) {
    console.error("Translator API not supported in this browser.");
    return;
    }

    createProgressUI();
    updateProgressUI("⏳ Detecting language…", 0);

    const chunks = await collectTranslationNodes();
    if (chunks.length === 0) {
    removeProgressUI();
    return;
    }

    // Detect source language from first chunk
    const detector = await LanguageDetector.create();
    const { detectedLanguage } = (await detector.detect(chunks[0].text))[0];
    console.log(`Detected language: ${detectedLanguage} → ${targetLanguage}`);

    // Step 1: Check availability before creating translator
    const availability = await Translator.availability({
    sourceLanguage: detectedLanguage,
    targetLanguage,
    });

    if (availability === "unavailable") {
    updateProgressUI("❌ Language pair not supported", 100);
    console.error(`Translation unavailable: ${detectedLanguage} → ${targetLanguage}`);
    return;
    }

    // Step 2: Create translator with download monitor
    const translator = await Translator.create({
    sourceLanguage: detectedLanguage,
    targetLanguage,
    monitor(m) {
        m.addEventListener("downloadprogress", (e) => {
        const pct = Math.round(e.loaded * 100);
        updateProgressUI(`⏳ Downloading model… ${pct}%`, pct);
        });
    },
    });

    updateProgressUI("✅ Model ready! Translating…", 0);

    // Step 3: Translate chunks sequentially
    for (let i = 0; i < chunks.length; i++) {
    try {
        const translated = await translator.translate(chunks[i].text);
        chunks[i].el.innerText = translated;
    } catch (err) {
        console.error("Translation failed for:", chunks[i].text, err);
    }
    const pct = Math.round(((i + 1) / chunks.length) * 100);
    updateProgressUI(`🔄 Translating… ${pct}%`, pct);
    }

    updateProgressUI("✅ Translation complete!", 100);
    setTimeout(removeProgressUI, 2000); // Auto-hide after 2s
}


// === Listen for popup.js messages ===
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "translateContent") {
    translatePage(msg.lang);
    }
});




// Rewriting Page
/// === Collect text nodes specifically for rewriting ===
async function collectRewriteNodes() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
    const text = node.nodeValue.trim();
    if (text && text.length > 30) { // Skip very short text
        nodes.push({ el: node, text });
    }
    }
    return nodes;
}

// === Rewrite API ===
async function collectRewriteNodes() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
    const text = node.nodeValue.trim();
    if (text && text.length > 30) { // Skip very short text
        nodes.push({ el: node, text });
    }
    }
    return nodes;
}

// === Rewrite API (Streaming, single rewriter instance reused) ===
async function rewritePage(level) {
    if (!("Rewriter" in self)) {
    console.error("❌ Rewriter API not supported in this browser.");
    return;
    }

    // Check availability
    const availability = await Rewriter.availability();
    if (availability === "unavailable") {
    console.error("❌ Rewriter API is unavailable.");
    return;
    }

    createProgressUI();
    updateProgressUI("🔄 Collecting text…", 5);

    const chunks = await collectRewriteNodes();
    if (chunks.length === 0) {
    updateProgressUI("⚠️ No text found.", 100);
    setTimeout(removeProgressUI, 2000);
    return;
    }

    // ✅ Age-specific contexts with SAFE MODE
    let sharedContext, perChunkContext;
    switch (parseInt(level)) {
        case 0: // Simple (7-9 yo)
            sharedContext = "Rewrite the text so it is very simple, short, and easy to read for kids aged 7-9. Use basic words and short sentences. Remove all violence, adult content, offensive language, or any inappropriate content. Make the text safe for children.";
            perChunkContext = "Rewrite this sentence to be short, simple, and completely safe for 7-9 year olds. Remove any violence, adult content, or inappropriate words.";
            break;
        case 1: // Intermediate (9-11 yo)
            sharedContext = "Rewrite the text so it is clear and easy to understand for kids aged 9-11. Use simple words but allow slightly longer sentences. Remove all violence, adult content, offensive language, or any inappropriate content. Make the text safe for children.";
            perChunkContext = "Rewrite this text for 9-11 year olds, making it clear, slightly detailed, and completely safe. Remove any violence, adult content, or inappropriate words.";
            break;
        case 2: // Advanced (11+)
            sharedContext = "Rewrite the text so it is understandable for kids 11 and older. Keep it clear, allow longer sentences, and richer vocabulary. Remove all violence, adult content, offensive language, or any inappropriate content. Ensure the text is safe for children.";
            perChunkContext = "Rewrite this text for 11+ year olds, making it clear and safe. Remove any violence, adult content, or inappropriate words.";
            break;
    }


    // ✅ Create ONE rewriter instance
    const rewriter = await Rewriter.create({
    tone: "more-casual",
    length : "shorter",
    format: "plain-text",
    sharedContext,
    monitor(m) {
        m.addEventListener("downloadprogress", e => {
        updateProgressUI(
            `📥 Downloading model… ${Math.round(e.loaded * 100)}%`,
            e.loaded * 100
        );
        });
    }
    });

    console.log(`✍️ Rewriting for age level ${level} (${sharedContext})`);

    let done = 0;
    for (let i = 0; i < chunks.length; i++) {
    try {
        const stream = rewriter.rewriteStreaming(chunks[i].text, {
        context: perChunkContext
        });

        let liveText = "";
        for await (const chunk of stream) {
        liveText += chunk;
        chunks[i].el.nodeValue = liveText; // Live update
        }
    } catch (err) {
        console.error("❌ Rewrite failed:", err);
    }

    done++;
    const pct = Math.round((done / chunks.length) * 100);
    updateProgressUI(`✍️ Rewriting… ${pct}%`, pct);
    }

    updateProgressUI("✅ Rewrite complete!", 100);
    setTimeout(removeProgressUI, 2000);

    rewriter.destroy?.();
}


// === Listen for messages ===
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "rewriteContent") {
    rewritePage(msg.level);
    }
});
