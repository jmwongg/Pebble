// --- Global State ---
let session;
let facts = [];
let questions = [];
let currentQ = 0;
let points = 0;
let totalPoints = 0;
let levelPoints = 0;
let level = 1;
let earnedBadges = [];
let quizCollection = [];

const quizContent = document.getElementById("quizContent");
const tabs = document.querySelectorAll(".tab-btn");
const contents = document.querySelectorAll(".tab-content");


// --- Chrome Storage Helpers ---
function saveState() {
    chrome.storage.sync.set({
        facts,
        questions,
        currentQ,
        points,
        totalPoints,
        levelPoints,
        level,
        earnedBadges,
        quizCollection
    });
}

function loadState(callback) {
    chrome.storage.sync.get([
        "facts",
        "questions",
        "currentQ",
        "points",
        "totalPoints",
        "levelPoints",
        "level",
        "earnedBadges",
        "quizCollection"
    ], (result) => {
        if (result.facts) facts = result.facts;
        questions = result.questions || [];
        currentQ = result.currentQ || 0;
        points = result.points || 0;
        totalPoints = result.totalPoints || 0;
        levelPoints = result.levelPoints || 0;
        level = result.level || 1;
        earnedBadges = result.earnedBadges || [];
        quizCollection = result.quizCollection || [];
        if (callback) callback();
    });
}

// --- Tabs ---
document.addEventListener("DOMContentLoaded", () => {
    let tabToOpen = window.location.hash.replace("#", "") || "overview";
    showTab(tabToOpen);

    tabs.forEach(tab => {
        tab.addEventListener("click", () => showTab(tab.dataset.tab));
    });

    document.getElementById("goFacts")?.addEventListener("click", () => showTab("facts"));
    document.getElementById("goQuiz")?.addEventListener("click", () => showTab("quiz"));

    // Load saved state and render UI
    loadState(() => {
        renderFactCollection();
        renderAllFacts();
        renderQuizCollection();
        renderAllQuiz();
        updateProgress();
        renderBadges();
    });

    document.getElementById("newFact")?.addEventListener("click", generateFact);

    document.getElementById("viewAllFacts")?.addEventListener("click", () => {
        document.getElementById("factsNormalView").style.display = "none";
        document.getElementById("factsFullView").style.display = "flex";
        renderAllFacts();
    });

    document.querySelector(".backToFacts")?.addEventListener("click", () => {
        document.getElementById("factsFullView").style.display = "none";
        document.getElementById("factsNormalView").style.display = "flex";
        renderFactCollection();
    });

    document.getElementById("viewAllQuestions")?.addEventListener("click", () => {
        document.getElementById("quizNormalView").style.display = "none";
        document.getElementById("quizFullView").style.display = "flex";
        renderAllQuiz();
    });

    document.querySelector(".backToQuiz")?.addEventListener("click", () => {
        document.getElementById("quizFullView").style.display = "none";
        document.getElementById("quizNormalView").style.display = "flex";
        renderQuizCollection();
    });

    // Generate first fact and quiz if empty
    if (facts.length === 0) generateFact();
    if (questions.length === 0) generateQuiz();
});

// --- Tab Switching ---
function showTab(tabId) {
    tabs.forEach(t => t.classList.remove("active"));
    contents.forEach(c => c.style.display = "none");

    document.querySelector(`.tab-btn[data-tab="${tabId}"]`)?.classList.add("active");
    const el = document.getElementById(tabId);
    if (el) el.style.display = "flex";
}

// --- AI Model ---
async function initModel() {
    const availability = await LanguageModel.availability();
    if (availability === "unavailable") {
        document.getElementById("currentFact").textContent = "❌ AI not available on this device.";
        return null;
    }
    if (!session) session = await LanguageModel.create();
    return session;
}

// --- Page Context ---
async function getPageContext() {
    try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    const [{ result: text }] = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
        const article = document.querySelector("article");
        const main = document.querySelector("main");

        let content = "";
        if (article) {
            content = article.innerText.trim();
        } else if (main) {
            content = main.innerText.trim();
        } else {
            // fallback: pick the largest block of visible text
            const all = Array.from(document.querySelectorAll("p, div"))
            .map(el => el.innerText.trim())
            .filter(t => t.length > 50);
            content = all.sort((a, b) => b.length - a.length)[0] || "";
        }

        // Return full content, no hard slicing
        return content;
        }
    });

    return text;
    } catch {
    return "";
    }
}


// --- Facts ---
async function generateFact() {
    const factEl = document.getElementById("currentFact");
    factEl.textContent = "✨ Generating fun fact…";

    try {
        const s = await initModel();
        if (!s) return;

        const prompt = `
You are a fact generator for kids under 12.

TASK:
Generate ONE short, real, safe fun fact that kids will enjoy learning. It should feel fresh and not something found in a textbook.

OUTPUT RULES:
- Start with ONLY one of these: "Did you know?", "Wow:", "Cool:" or "Amazing:".
- Max 25 words.
- Use playful, kid-friendly language.
- Output ONLY the fun fact. No extra text or explanations.

`;

        const fact = (await s.prompt(prompt)).trim();
        factEl.textContent = fact;

        facts.unshift(fact);
        saveState();
        renderFactCollection();

    } catch {
        factEl.textContent = "⚠️ Couldn't get a fun fact. Try again!";
    }
}

function renderFactCollection() {
    const container = document.getElementById("factCollection");
    container.innerHTML = "";
    facts.slice(0, 4).forEach(fact => {
        const card = document.createElement("div");
        card.className = "fact-card";
        card.textContent = fact;
        container.appendChild(card);
    });
}

function renderAllFacts() {
    const container = document.getElementById("allFactsList");
    container.innerHTML = "";
    facts.forEach(fact => {
        const card = document.createElement("div");
        card.className = "fact-card";
        card.textContent = fact;
        container.appendChild(card);
    });
}

// --- Progress & Badges ---
const badgeRewards = {
    1: { name: "🌱 Curious Explorer", desc: "Completed Level 1" },
    2: { name: "⚡ Quick Learner", desc: "Completed Level 2" },
    3: { name: "📘 Knowledge Seeker", desc: "Completed Level 3" },
    5: { name: "🌍 Global Thinker", desc: "Completed Level 5" },
    7: { name: "💡 Bright Mind", desc: "Completed Level 7" },
    10:{ name: "🏆 Master Learner", desc: "Completed Level 10" }
};

function getSetsRequired(lvl) {
    return lvl === 1 ? 1 : 3 + (lvl - 2) * 2;
}

// --- Update user progress ---
function updateProgress(save = true) {
    // Make sure all necessary variables exist
    level = level || 1;
    levelPoints = levelPoints || 0;
    totalPoints = totalPoints || 0;

    const setsRequired = getSetsRequired(level);
    const maxPoints = setsRequired * 30; // 30 points per set
    const percent = Math.min((levelPoints / maxPoints) * 100, 100);
    const remaining = maxPoints - levelPoints;

    // Update DOM
    document.getElementById("points-label").textContent = `${totalPoints} points`;
    document.getElementById("level-label").textContent = `Level ${level}`;
    document.getElementById("progress-fill").style.width = percent + "%";
    document.getElementById("progress-label").textContent = Math.floor(percent) + "%";
    document.getElementById("progress-remaining").textContent =
        remaining > 0 ? `${remaining} points to go` : "Level complete!";

    // Level up
    if (percent >= 100 && level < 10) {
        setTimeout(() => {
            // Award badge before leveling up
            if (badgeRewards[level]) {
                earnedBadges.push(badgeRewards[level]);
                renderBadges();
                alert(`🎉 You earned a new badge: ${badgeRewards[level].name}`);
            }

            // Move to next level
            level++;
            levelPoints = 0; // reset only level progress
            updateProgress(save);
        }, 500);
    }

    // Save state to chrome.storage
    if (save && chrome?.storage?.sync) {
        chrome.storage.sync.set({
            level,
            levelPoints,
            totalPoints,
            earnedBadges
        }, () => {
            console.log("Progress saved to storage");
        });
    }
}

// --- Load progress from storage ---
function loadProgress() {
    if (!chrome?.storage?.sync) return;

    chrome.storage.sync.get(
        ["level", "levelPoints", "totalPoints", "earnedBadges"],
        (result) => {
            level = result.level || 1;
            levelPoints = result.levelPoints || 0;
            totalPoints = result.totalPoints || 0;
            earnedBadges = result.earnedBadges || [];
            renderBadges();
            updateProgress(false);
        }
    );
}

// --- Call loadProgress on extension/popup load ---
document.addEventListener("DOMContentLoaded", () => {
    loadProgress();
});

function renderBadges() {
    const container = document.getElementById("earnedBadges");
    container.innerHTML = "";
    earnedBadges.forEach(badge => {
        const el = document.createElement("div");
        el.className = "badge-item";
        el.textContent = badge.name;
        container.appendChild(el);
    });
}

// --- Quiz ---
async function generateQuiz() {
    quizContent.textContent = "✨ Creating your quiz…";

    try {
        const s = await initModel();
        if (!s) {
            quizContent.textContent = "⚠️ Quiz unavailable (AI not ready).";
            return;
        }

        const pageText = await getPageContext();

        const prompt = `
You are a quiz creator for kids under 12. Make exactly 3 short multiple-choice questions about this webpage. Strictly adhere to the rules below.
Rules:
- Respond ONLY with pure JSON, no extra text.
- Questions must provide real, useful knowledge for kids, not trivial or off-topic content.
- Each question must have 4 options.
- JSON format: [ 
{"q":"...","options":["a","b","c","d"],"correct":1,"pts":10},
{"q":"...","options":["a","b","c","d"],"correct":0,"pts":10},
{"q":"...","options":["a","b","c","d"],"correct":2,"pts":10} ]
Webpage text:
${pageText}
`;

        let response = await s.prompt(prompt);
        const match = response.match(/\[.*\]/s);
        if (!match) throw new Error("No JSON found");
        questions = JSON.parse(match[0]);

        currentQ = 0;
        points = 0;
        updateProgress();
        saveState();

        loadQuestion();

    } catch {
        quizContent.textContent = "⚠️ Couldn't load quiz. Try again later!";
    }
}

function renderQuizCollection() {
    const container = document.getElementById("quizCollection");
    container.innerHTML = "";
    quizCollection.slice(0, 4).forEach(item => {
        const card = document.createElement("div");
        card.className = "quiz-card";
        card.innerHTML = `<strong>Q:</strong> ${item.q}<br><em>Answer:</em> ${item.correct}`;
        container.appendChild(card);
    });
}

function renderAllQuiz() {
    const container = document.getElementById("allQuizList");
    container.innerHTML = "";
    quizCollection.forEach(item => {
        const card = document.createElement("div");
        card.className = "quiz-card";
        card.innerHTML = `<strong>Q:</strong> ${item.q}<br><em>Answer:</em> ${item.correct}`;
        container.appendChild(card);
    });
}

// --- Load & Answer Question ---
function loadQuestion() {
    if (currentQ >= questions.length) {
        // Cap the quiz set points at 30
        const quizSetPoints = Math.min(points, 30);

        quizContent.innerHTML = `<div class="card" style="text-align:center;">
            <div style="font-size:2rem;">🎉</div>
            <p>Quiz finished!</p>
            <p>You scored <b>${quizSetPoints}</b> points for this set.</p>
        </div>`;

        // Reset points for the next quiz set (optional)
        points = 0;
        saveState();
        return;
    }

    const q = questions[currentQ];
    quizContent.innerHTML = `
        <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong>Question ${currentQ + 1}</strong>
            <span class="badge">${q.pts} pts</span>
        </div>
        <p>${q.q}</p>
        ${q.options.map((opt,i) => `<button class="opt-btn" data-i="${i}">${opt}</button>`).join("")}
        </div>
        <button id="submitAnswer" disabled>Submit Answer &nbsp; > </button>
    `;

    let selected = null;
    const optButtons = quizContent.querySelectorAll(".opt-btn");
    const submitBtn = quizContent.querySelector("#submitAnswer");

    optButtons.forEach(btn => {
        btn.addEventListener("click", () => {
            selected = parseInt(btn.dataset.i);
            optButtons.forEach(b => b.classList.remove("selected"));
            btn.classList.add("selected");
            submitBtn.disabled = false;
        });
    });

    submitBtn.addEventListener("click", () => {
        if (selected === null) return;

        if (selected === q.correct) {
            totalPoints += q.pts;
            levelPoints += q.pts;
            points += q.pts; // accumulate for this quiz set
            updateProgress();
            quizContent.innerHTML = `<div class="card" style="text-align:center;">
                <div style="font-size:2rem;">🎉</div>
                <p id="correctText"><b>Correct!</b></p>
                <p>+${q.pts} points</p>
            </div>`;
        } else {
            quizContent.innerHTML = `<div class="card" style="text-align:center;">
                <div style="font-size:2rem;">📖</div>
                <p id="keepLearningText"><b>Keep Learning!</b></p>
                <p>The correct answer was: <b>${q.options[q.correct]}</b></p>
            </div>`;
        }

        quizCollection.unshift({
            q: q.q,
            correct: q.options[q.correct]
        });

        saveState();
        renderQuizCollection();

        setTimeout(() => {
            currentQ++;
            saveState();
            loadQuestion();
        }, 2000);
    });
}

async function summarizePage() {
    const summaryEl = document.getElementById("pageSummary");
    summaryEl.textContent = "✨ Generating page summary…";

    try {
    const longText = await getPageContext();
    if (!longText) {
        summaryEl.textContent = "⚠️ No text found to summarize.";
        return;
    }

    if (!("Summarizer" in self)) {
        summaryEl.textContent = "⚠️ Summarizer not supported in this browser.";
        return;
    }

    const summarizer = await Summarizer.create({
        type: "tldr",
        format: "plain-text",
        length: "short"
    });

    const summary = await summarizer.summarize(longText, {
        context: "Summarize this page in simple, kid-friendly language."
    });

    summaryEl.textContent = summary.trim();
    } catch (err) {
    console.error("Summarization failed:", err);
    summaryEl.textContent = "⚠️ Couldn't get a summary. Try again!";
    }
}
document.getElementById("summarizeBtn")
    .addEventListener("click", summarizePage);