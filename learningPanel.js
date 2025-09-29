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

// Save learning progress
function saveState() {
    chrome.storage.sync.set({ facts, questions, currentQ, points, totalPoints, levelPoints, level, earnedBadges, quizCollection });
}

function loadState(callback) {
    chrome.storage.sync.get(
        ["facts","questions","currentQ","points","totalPoints","levelPoints","level","earnedBadges","quizCollection"],
        result => {
            facts = result.facts || [];
            questions = result.questions || [];
            currentQ = result.currentQ || 0;
            points = result.points || 0;
            totalPoints = result.totalPoints || 0;
            levelPoints = result.levelPoints || 0;
            level = result.level || 1;
            earnedBadges = result.earnedBadges || [];
            quizCollection = result.quizCollection || [];
            if (callback) callback();
        }
    );
}

function renderCardList(containerId, list, createContent) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = "";
    list.forEach(item => {
        const card = document.createElement("div");
        const content = createContent(item);
        card.className = content.className || "card";
        card.innerHTML = content.innerHTML || "";
        container.appendChild(card);
    });
}

// Setup tab navigation
function setupTabs(tabsSelector, contentsSelector, defaultTab="overview") {
    const tabs = document.querySelectorAll(tabsSelector);
    const contents = document.querySelectorAll(contentsSelector);
    
    function showTab(tabId) {
        tabs.forEach(t => t.classList.remove("active"));
        contents.forEach(c => c.style.display = "none");
        document.querySelector(`${tabsSelector}[data-tab="${tabId}"]`)?.classList.add("active");
        const el = document.getElementById(tabId);
        if (el) el.style.display = "flex";

        // Update URL hash without scrolling
        if (history.replaceState) {
            history.replaceState(null, null, `#${tabId}`);
        } else {
            location.hash = `#${tabId}`;
        }
    }

    tabs.forEach(tab => tab.addEventListener("click", () => showTab(tab.dataset.tab)));

    // Auto-open tab from hash if present
    const hashTab = window.location.hash.replace("#", "");
    showTab(hashTab || defaultTab);

    return showTab;
}


function renderFactCollection() {
    renderCardList("factCollection",
        facts.slice(0,4),
        fact => ({
            className: "fact-card",
            innerHTML: fact
    }));
}
function renderAllFacts() {
    renderCardList("allFactsList",
        facts,
        fact => ({
            className: "fact-card",
            innerHTML: fact
    }));
}

function renderQuizCollection() {
    renderCardList("quizCollection",
        quizCollection.slice(0,4),
        item => ({
            className: "quiz-card",
            innerHTML: `<strong>Q:</strong> ${item.q}<br><em>Answer:</em> ${item.correct}`
        }));
}
function renderAllQuiz() {
    renderCardList("allQuizList",
        quizCollection,
        item => ({
            className: "quiz-card",
            innerHTML: `<strong>Q:</strong> ${item.q}<br><em>Answer:</em> ${item.correct}`
        }));
}
function renderBadges() {
    renderCardList("earnedBadges",
        earnedBadges,
        badge => ({
            className: "badge-item",
            innerHTML: badge.name
        }));
}

// Initialize AI Model
async function initModel() {
    const availability = await LanguageModel.availability();
    if (availability === "unavailable") {
        document.getElementById("currentFact").textContent = "AI not available on this device.";
        return null;
    }
    if (!session) session = await LanguageModel.create();
    return session;
}

// Get webpage content
async function getPageContext() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const [{ result: text }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                const article = document.querySelector("article");
                const main = document.querySelector("main");

                let content = "";
                if (article) content = article.innerText.trim();
                else if (main) content = main.innerText.trim();
                else {
                    const all = Array.from(document.querySelectorAll("p, div"))
                        .map(el => el.innerText.trim())
                        .filter(t => t.length > 50);
                    content = all.sort((a,b)=>b.length - a.length)[0] || "";
                }
                return content;
            }
        });
        return text;
    } catch { return ""; }
}

// Overview Tab
const badgeRewards = {
    1: { name: "🌱 Curious Explorer", desc: "Completed Level 1" },
    2: { name: "⚡ Quick Learner", desc: "Completed Level 2" },
    3: { name: "📘 Knowledge Seeker", desc: "Completed Level 3" },
    5: { name: "🌍 Global Thinker", desc: "Completed Level 5" },
    7: { name: "💡 Bright Mind", desc: "Completed Level 7" },
    10:{ name: "🏆 Master Learner", desc: "Completed Level 10" }
};

function getSetsRequired(lvl) { return lvl === 1 ? 1 : 3 + (lvl - 2) * 2; }

function updateProgress(save = true) {
    level = level || 1;
    levelPoints = levelPoints || 0;
    totalPoints = totalPoints || 0;

    const setsRequired = getSetsRequired(level);
    const maxPoints = setsRequired * 30;
    const percent = Math.min((levelPoints / maxPoints) * 100, 100);
    const remaining = maxPoints - levelPoints;

    document.getElementById("points-label").textContent = `${totalPoints} points`;
    document.getElementById("level-label").textContent = `Level ${level}`;
    document.getElementById("progress-fill").style.width = percent + "%";
    document.getElementById("progress-label").textContent = Math.floor(percent) + "%";
    document.getElementById("progress-remaining").textContent =
        remaining > 0 ? `${remaining} points to go` : "Level complete!";

    if (percent >= 100 && level < 10) {
        setTimeout(() => {
            if (badgeRewards[level]) {
                earnedBadges.push(badgeRewards[level]);
                renderBadges();
                alert(`🎉 You earned a new badge: ${badgeRewards[level].name}`);
            }
            level++;
            levelPoints = 0;
            updateProgress(save);
        }, 500);
    }

    if (save && chrome?.storage?.sync) {
        chrome.storage.sync.set({ level, levelPoints, totalPoints, earnedBadges });
    }
}

function loadProgress() {
    if (!chrome?.storage?.sync) return;

    chrome.storage.sync.get(
        ["level", "levelPoints", "totalPoints", "earnedBadges"],
        result => {
            level = result.level || 1;
            levelPoints = result.levelPoints || 0;
            totalPoints = result.totalPoints || 0;
            earnedBadges = result.earnedBadges || [];
            renderBadges();
            updateProgress(false);
        }
    );
}

document.addEventListener("DOMContentLoaded", loadProgress);

async function summarizePage() {
    const summaryEl = document.getElementById("pageSummary");
    summaryEl.textContent = "Generating page summary…";

    try {
        const longText = await getPageContext();
        if (!longText) {
            summaryEl.textContent = "No text found to summarize.";
            return;
        }
        if (!("Summarizer" in self)) {
            summaryEl.textContent = "Summarizer not supported in this browser.";
            return;
        }

        const summarizer = await Summarizer.create({ type:"tldr", format:"plain-text", length:"short" });
        const summary = await summarizer.summarize(longText, {
            context:
            `
            Summarize this page in simple, kid-friendly language.
            Rules:
            - Start with: "This page is about..."
            - Use everyday vocabulary that kids under 12 understand.
            - Focus on the main idea, skip unimportant details.
            `
        });
        summaryEl.textContent = summary.trim();

    } catch (err) {
        console.error("Summarization failed:", err);
        summaryEl.textContent = "Couldn't get a summary. Try again!";
    }
}

document.getElementById("summarizeBtn")?.addEventListener("click", summarizePage);

// Facts Tab
async function generateFact() {
    const factEl = document.getElementById("currentFact");
    factEl.textContent = "Generating fun fact…";

    try {
        const s = await initModel();
        if (!s) return;

        // Combine existing facts to avoid repeats
        const existingFacts = facts.join("\n");

        const prompt = `
You are a fact generator for kids under 12.

TASK:
Generate ONE short, real, safe fun fact that kids will enjoy learning. It should feel fresh and not something found in a textbook.

RULES:
- Do NOT repeat any of these facts that were already generated:
${existingFacts}

OUTPUT RULES:
- Start with ONLY one of these: "Did you know?", "Wow:", "Cool:" or "Amazing:".
- Max 25 words.
- Use playful, kid-friendly language.
- Output ONLY the fun fact. No extra text or explanations.
`;

        let fact = (await s.prompt(prompt)).trim();

        // If the AI still repeats (sometimes it may), try generating again
        if (facts.includes(fact)) {
            fact = "Hmm… let's try a new fact next time!";
        }

        factEl.textContent = fact;

        facts.unshift(fact);
        saveState();
        renderFactCollection();

    } catch {
        factEl.textContent = "Couldn't get a fun fact. Try again!";
    }
}


// Quiz Tab
async function generateQuiz() {
    quizContent.textContent = "Creating your quiz…";
    try {
        const s = await initModel();
        if (!s) {
            quizContent.textContent = "Quiz unavailable (AI not ready).";
            return;
        }
        const pageText = await getPageContext();
        const prompt = `
You are a quiz creator for kids under 12. Make exactly 5 short multiple-choice questions about this webpage. Respond ONLY with pure JSON.
JSON format: [
{"q":"...","options":["a","b","c","d"],"correct":1,"pts":10},
{"q":"...","options":["a","b","c","d"],"correct":0,"pts":10},
{"q":"...","options":["a","b","c","d"],"correct":2,"pts":10},
{"q":"...","options":["a","b","c","d"],"correct":0,"pts":10},
{"q":"...","options":["a","b","c","d"],"correct":1,"pts":10} ]
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
        quizContent.textContent = "Couldn't load quiz. Try again later!";
    }
}

function displayQuestion(qObj, index) {
    quizContent.innerHTML = `
        <div class="card">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong>Question ${index+1}</strong>
            <span class="badge">${qObj.pts} pts</span>
        </div>
        <p>${qObj.q}</p>
        ${qObj.options.map((opt,i) => `<button class="opt-btn" data-i="${i}">${opt}</button>`).join("")}
        </div>
        <button id="submitAnswer" disabled>Submit Answer &nbsp; > </button>
    `;
    let selected = null;
    const optButtons = quizContent.querySelectorAll(".opt-btn");
    const submitBtn = quizContent.querySelector("#submitAnswer");

    optButtons.forEach(btn => btn.addEventListener("click", () => {
        selected = parseInt(btn.dataset.i);
        optButtons.forEach(b=>b.classList.remove("selected"));
        btn.classList.add("selected");
        submitBtn.disabled = false;
    }));

    submitBtn.addEventListener("click", () => handleAnswer(selected, qObj));
}

function handleAnswer(selected, qObj) {
    if (selected === null) return;
    if (selected === qObj.correct) {
        totalPoints += qObj.pts;
        levelPoints += qObj.pts;
        points += qObj.pts;
        updateProgress();
        quizContent.innerHTML = `<div class="card" style="text-align:center;"><div style="font-size:2rem;">🎉</div><p id="correctText"><b>Correct!</b></p><p>+${qObj.pts} points</p></div>`;
    } else {
        quizContent.innerHTML = `<div class="card" style="text-align:center;"><div style="font-size:2rem;">📖</div><p id="keepLearningText"><b>Keep Learning!</b></p><p>The correct answer was: <b>${qObj.options[qObj.correct]}</b></p></div>`;
    }

    quizCollection.unshift({ q: qObj.q, correct: qObj.options[qObj.correct] });
    saveState();
    renderQuizCollection();

    setTimeout(() => {
        currentQ++;
        saveState();
        loadQuestion();
    }, 2000);
}

function loadQuestion() {
    if (currentQ >= questions.length) {
        const quizSetPoints = Math.min(points, 30);
        quizContent.innerHTML = `<div class="card" style="text-align:center;"><div style="font-size:2rem;">🎉</div><p>Quiz finished!</p><p>You scored <b>${quizSetPoints}</b> points for this set.</p></div>`;
        points = 0;
        saveState();
        return;
    }
    displayQuestion(questions[currentQ], currentQ);
}


// --- Initialize Tabs ---
document.addEventListener("DOMContentLoaded", () => {
    const initialTab = window.location.hash.replace("#", "") || "overview";
    const showTab = setupTabs(".tab-btn", ".tab-content", initialTab);

    // Load saved state first
    loadState(() => {
        // Render everything only after DOM + state is ready
        renderFactCollection();
        renderAllFacts();
        renderQuizCollection();
        renderAllQuiz();
        updateProgress();
        renderBadges();

        // If the initial tab is facts or quiz, show content
        if (initialTab === "facts") {
            document.getElementById("factsNormalView").style.display = "flex";
            renderFactCollection();
        } else if (initialTab === "quiz") {
            document.getElementById("quizNormalView").style.display = "flex";
            renderQuizCollection();
        }
    });

    // Setup buttons
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

    document.getElementById("goFacts")?.addEventListener("click", () => showTab("facts"));
    document.getElementById("goQuiz")?.addEventListener("click", () => showTab("quiz"));

    // Generate first fact/quiz if empty
    if (facts.length === 0) generateFact();
    if (questions.length === 0) generateQuiz();
});