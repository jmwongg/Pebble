// Cached model instances
let cachedTranslators = new Map();
let cachedRewriters = new Map();

// Create progress UI
function createProgressUI() {
    let box = document.getElementById("kids-progress-box");
    if (!box) {
        box = document.createElement("div");
        box.id = "kids-progress-box";
        box.innerHTML = `
            <div class="progress-header">
                <span id="kids-progress-stage">Preparing translation…</span>
                <span id="kids-progress-pct">0%</span>
            </div>
            <div class="bar-container">
                <div id="kids-progress-bar"></div>
            </div>
        `;
        document.body.appendChild(box);
    }
}
function updateProgressUI(stage, pct) {
    const text = document.getElementById("kids-progress-stage");
    const bar = document.getElementById("kids-progress-bar");
    const pctEl = document.getElementById("kids-progress-pct");
    if (text) text.textContent = stage;
    if (bar && pct !== null) bar.style.width = pct + "%";
    if (pctEl && pct !== null) pctEl.textContent = pct + "%";
}

function removeProgressUI() {
    const box = document.getElementById("kids-progress-box");
    if (box) box.remove();
}

// Skip translating or rewriting some elements
function shouldSkipElement(el) {
    if (!el) return false;

    const tag = (el.tagName || "").toString().toLowerCase();
    const id = (el.id || "").toString().toLowerCase();

    let cls = "";
    if (typeof el.className === "string") {
        cls = el.className.toLowerCase();
    } else if (el.className?.baseVal) {
        cls = el.className.baseVal.toLowerCase();
    }

    // Common sections to skip
    const skipKeywords = [
        "footer", "banner", "ad", "advert", "sponsored",
        "sidebar", "comments", "related", "newsletter",
        "popup", "modal", "cookie", "consent", "nav"
    ];

    // Direct tag skip
    if (["footer", "nav", "aside"].includes(tag)) return true;

    // Keyword match on id/class
    return skipKeywords.some(kw => id.includes(kw) || cls.includes(kw));
}


// Collect translation nodes
async function collectTranslationNodes() {
    const selectors = "p, h1, h2, h3, h4, h5, h6, li, figcaption, blockquote";
    const elements = document.querySelectorAll(selectors);

    const chunks = [];
    elements.forEach((el, idx) => {
        if (shouldSkipElement(el)) return;
        const text = el.innerText.trim();
        if (text) {
            chunks.push({ id: idx, el, text });
        }
    });
    return chunks;
}
// Translate page with caching + batching
async function translatePage(targetLanguage) {
    saveOriginalContent();
    if (!("Translator" in self) || !("LanguageDetector" in self)) {
        console.error("Translator API not supported in this browser.");
        return;
    }

    createProgressUI();
    updateProgressUI("Detecting language…", 0);

    const chunks = await collectTranslationNodes();
    if (chunks.length === 0) {
        removeProgressUI();
        return;
    }

    // Detect language once
    const detector = await LanguageDetector.create();
    const { detectedLanguage } = (await detector.detect(chunks[0].text))[0];
    console.log(`Detected language: ${detectedLanguage} → ${targetLanguage}`);

    if (detectedLanguage === targetLanguage) {
        updateProgressUI("Page already in target language", 100);
        setTimeout(removeProgressUI, 2000);
        return;
    }

    // Reuse cached translator if available
    const key = `${detectedLanguage}-${targetLanguage}`;

    if (!cachedTranslators.has(key)) {
        const availability = await Translator.availability({
            sourceLanguage: detectedLanguage,
            targetLanguage,
        });

        if (availability === "unavailable") {
            updateProgressUI("Language pair not supported", 100);
            return;
        }

        const translator = await Translator.create({
            sourceLanguage: detectedLanguage,
            targetLanguage,
            monitor(m) {
                m.addEventListener("downloadprogress", (e) => {
                    const pct = Math.round(e.loaded * 100);
                    updateProgressUI(`Downloading model…`, pct);
                });
            },
        });

        cachedTranslators.set(key, translator);
    }

    const translator = cachedTranslators.get(key);
    updateProgressUI("Model ready! Translating…", 0);

    // Batch translation (5 at a time)
    const batchSize = 5;
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);
        try {
            const texts = batch.map(c => c.text);
            const results = await Promise.all(texts.map(t => translator.translate(t)));


            results.forEach((translated, idx) => {
                batch[idx].el.innerText = translated;
            });
        } catch (err) {
            console.error("Translation batch failed:", err);
        }

        const pct = Math.round(((i + batchSize) / chunks.length) * 100);
        updateProgressUI(`Translating…`, pct);
    }

    updateProgressUI("Translation complete!", 100);
    setTimeout(removeProgressUI, 2000);
}

// Collect rewrite nodes
async function collectRewriteNodes() {
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    const nodes = [];
    let node;

    while ((node = walker.nextNode())) {
        const text = node.nodeValue.trim();
        if (!text || text.length < 30) continue;

        // skip if inside footer/ads/banners
        let parent = node.parentNode;
        let skip = false;
        while (parent) {
            if (shouldSkipElement(parent)) {
                skip = true;
                break;
            }
            parent = parent.parentNode;
        }
        if (!skip) {
            nodes.push({ el: node, text });
        }
    }
    return nodes;
}

async function rewritePage(level) {
    saveOriginalContent();

    if (!("Rewriter" in self) || !("Summarizer" in self)) {
        console.error("Required APIs not supported in this browser.");
        return;
    }

    createProgressUI();
    updateProgressUI("Collecting text…", 0);

    const chunks = await collectRewriteNodes();

    // Filter out tiny/invisible nodes
    const filteredChunks = chunks.filter(c => {
        if (!c.text || c.text.length < 50) return false;
        const style = window.getComputedStyle(c.el.parentNode);
        if (style.display === "none" || style.visibility === "hidden") return false;
        return true;
    });

    if (filteredChunks.length === 0) {
        updateProgressUI("No text found.", 100);
        setTimeout(removeProgressUI, 2000);
        return;
    }

    // Pick context
    let sharedContext;
    switch (parseInt(level)) {
        case 0:
            sharedContext = "Rewrite text for 7-9 year olds: simple, short, safe, and kid-friendly. Rephrase content naturally so that any violent, sexual, or adult ideas are expressed in a safe, age-appropriate way without losing the main meaning. Remove explicit details from harmful or sensitive content. Replace strong words with gentler ones.";
            break;
        case 1:
            sharedContext = "Rewrite text for 9-11 year olds: clear, simple, safe, and kid-friendly. Express any sensitive content in an age-appropriate way while preserving the main meaning of the text. Remove explicit details from harmful or sensitive content. Replace strong words with gentler ones.";
            break;
        case 2:
            sharedContext = "Rewrite text for 11+ year olds: clear, slightly detailed, safe, and kid-friendly. Rephrase content naturally so violent, sexual, or adult ideas are expressed in a way that is safe but informative.";
            break;
    }

    // Initialize summarizer
    const summarizer = await Summarizer.create({ type: "tldr", format: "plain-text", length: "short" });
    
    // Initialize rewriter
    if (!cachedRewriters.has(level)) {
        const rewriter = await Rewriter.create({
            tone: "more-casual",
            length: "shorter",
            format: "plain-text",
            sharedContext,
        });
        cachedRewriters.set(level, rewriter);
    }
    const rewriter = cachedRewriters.get(level);

    let processed = 0;

    for (const c of filteredChunks) {
        try {
            // Summarize each chunk first
            const summary = await summarizer.summarize(c.text, { context: "Summarize this text in plain, clear language, keeping all main points, without simplifying for kids yet."
            });

            // Rewrite the summarized text
            const stream = rewriter.rewriteStreaming(summary, { context: sharedContext });
            let liveText = "";
            for await (const piece of stream) {
                liveText += piece;
                c.el.nodeValue = liveText; // progressive update
            }
        } catch (err) {
            console.warn("Skipping chunk due to error:", err.message);
        } finally {
            processed++;
            updateProgressUI(`Processing…`, Math.round((processed / filteredChunks.length) * 100));
        }
    }

    updateProgressUI("Rewrite + summary complete!", 100);
    setTimeout(removeProgressUI, 2000);
}



function saveOriginalContent() {
    const selectors = "p, h1, h2, h3, h4, h5, h6, li, figcaption, blockquote";
    const elements = document.querySelectorAll(selectors);

    elements.forEach(el => {
    if (!el.hasAttribute("data-original-html")) {
        el.setAttribute("data-original-html", el.innerHTML);
    }
    });

    // Also for text nodes (rewrite case)
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null, false);
    let node;
    while ((node = walker.nextNode())) {
    if (node.nodeValue.trim().length > 0 && !node.parentNode.hasAttribute("data-original-html")) {
        node.parentNode.setAttribute("data-original-html", node.parentNode.innerHTML);
    }
    }
    console.log("Original content saved.")
}

function restoreOriginalContent() {
    const elements = document.querySelectorAll("[data-original-html]");
    elements.forEach(el => {
    el.innerHTML = el.getAttribute("data-original-html");
    el.removeAttribute("data-original-html");
    });
    console.log("Original content restored.")
    
}

// Listen for messages
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "translateContent") {
        translatePage(msg.lang);
    }
    if (msg.action === "rewriteContent") {
        rewritePage(msg.level);
    }
    if (msg.action === "restorePage") {
        restoreOriginalContent();
    }
});

