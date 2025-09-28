// === Cached model instances ===
let cachedTranslators = new Map();
let cachedRewriters = new Map();

// === Create progress UI (unchanged) ===
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

function updateProgressUI(stage, pct) {
    const text = document.getElementById("kids-progress-text");
    const bar = document.getElementById("kids-progress-bar");
    if (text) text.textContent = stage;
    if (bar && pct !== null) bar.style.width = pct + "%";
}

function removeProgressUI() {
    const box = document.getElementById("kids-progress-box");
    if (box) box.remove();
}

function shouldSkipElement(el) {
    if (!el) return false;
    const tag = el.tagName?.toLowerCase() || "";
    const id = el.id?.toLowerCase() || "";
    const cls = el.className?.toLowerCase() || "";

    return (
        tag === "footer" ||
        id.includes("footer") ||
        cls.includes("footer") ||
        id.includes("banner") ||
        cls.includes("banner") ||
        id.includes("ad") ||
        cls.includes("ad") ||
        id.includes("advert") ||
        cls.includes("advert") ||
        id.includes("sponsored") ||
        cls.includes("sponsored")
    );
}


// === Collect translation nodes (unchanged) ===
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
// === Translate page with caching + batching ===
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

    // Detect language once
    const detector = await LanguageDetector.create();
    const { detectedLanguage } = (await detector.detect(chunks[0].text))[0];
    console.log(`Detected language: ${detectedLanguage} → ${targetLanguage}`);

    // Reuse cached translator if available
    const key = `${detectedLanguage}-${targetLanguage}`;

    if (!cachedTranslators.has(key)) {
        const availability = await Translator.availability({
            sourceLanguage: detectedLanguage,
            targetLanguage,
        });

        if (availability === "unavailable") {
            updateProgressUI("❌ Language pair not supported", 100);
            return;
        }

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

        cachedTranslators.set(key, translator);
    }

    const translator = cachedTranslators.get(key);
    updateProgressUI("✅ Model ready! Translating…", 0);

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
        updateProgressUI(`🔄 Translating… ${pct}%`, pct);
    }

    updateProgressUI("✅ Translation complete!", 100);
    setTimeout(removeProgressUI, 2000);
}


// === Collect rewrite nodes (unchanged) ===
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

// === Rewrite with caching + batching ===
async function rewritePage(level) {
    if (!("Rewriter" in self)) {
        console.error("❌ Rewriter API not supported in this browser.");
        return;
    }

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

    // Pick contexts based on level (unchanged)
    let sharedContext, perChunkContext;
    switch (parseInt(level)) {
        case 0:
            sharedContext = "Rewrite text for 7-9 year olds: simple, short, safe.";
            perChunkContext = "Rewrite this text short and safe for 7-9 year olds.";
            break;
        case 1:
            sharedContext = "Rewrite text for 9-11 year olds: clear, simple, safe.";
            perChunkContext = "Rewrite this text clear and safe for 9-11 year olds.";
            break;
        case 2:
            sharedContext = "Rewrite text for 11+ year olds: clear, slightly detailed, safe.";
            perChunkContext = "Rewrite this text clear and safe for 11+ year olds.";
            break;
    }

   // Reuse cached rewriter per level
    if (!cachedRewriters.has(level)) {
        const rewriter = await Rewriter.create({
            tone: "more-casual",
            length: "shorter",
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
        cachedRewriters.set(level, rewriter);
    }
    const rewriter = cachedRewriters.get(level);

    console.log(`✍️ Rewriting for reading level ${level}`);

    // Process in batches but stream inside each batch
    const batchSize = 5;
    for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);

        await Promise.all(batch.map(async (c) => {
            try {
                const stream = rewriter.rewriteStreaming(c.text, {
                    context: perChunkContext
                });

                let liveText = "";
                for await (const piece of stream) {
                    liveText += piece;
                    c.el.nodeValue = liveText; // progressive update
                }
            } catch (err) {
                console.error("Rewrite failed:", err);
            }
        }));

        const pct = Math.round(((i + batchSize) / chunks.length) * 100);
        updateProgressUI(`✍️ Rewriting… ${pct}%`, pct);
    }

    updateProgressUI("✅ Rewrite complete!", 100);
    setTimeout(removeProgressUI, 2000);
}  

// === Listen for messages ===
chrome.runtime.onMessage.addListener((msg) => {
    if (msg.action === "translateContent") {
        translatePage(msg.lang);
    }
    if (msg.action === "rewriteContent") {
        rewritePage(msg.level);
    }
});
