
const tabs = document.querySelectorAll(".tab-btn");
const contents = document.querySelectorAll(".tab-content");

document.addEventListener("DOMContentLoaded", () => {
    // Open tab from hash or default to overview
    let tabToOpen = window.location.hash.replace("#", "") || "overview";
    showTab(tabToOpen);

    // Setup tab switching
    tabs.forEach(tab => {
        tab.addEventListener("click", () => {
            showTab(tab.dataset.tab);
        });
    });

    // Quick Actions inside overview
    document.getElementById("goFacts").addEventListener("click", () => {
        showTab("facts");
    });

    document.getElementById("goQuiz").addEventListener("click", () => {
        showTab("quiz");
    });
});

// Reusable function
function showTab(tabId) {
    tabs.forEach(t => t.classList.remove("active"));
    contents.forEach(c => c.style.display = "none");

    const activeTab = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
    if (activeTab) activeTab.classList.add("active");

    const content = document.getElementById(tabId);
    if (content) content.style.display = "flex";
}

let session;
let facts = []; // store all generated facts

// Initialize Gemini Nano Prompt API session
async function initModel() {
    const availability = await LanguageModel.availability();
    if (availability === "unavailable") {
        document.getElementById("currentFact").textContent =
            "❌ AI not available on this device.";
        return null;
    }
    if (!session) {
        session = await LanguageModel.create(); // no initialPrompts to avoid intro text
    }
    return session;
}

// Get page context
async function getPageContext() {
    try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        const [{ result: text }] = await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => document.body.innerText.slice(0, 1500)
        });
        return text;
    } catch (err) {
        console.warn("Could not fetch page context:", err);
        return "";
    }
}

// Generate fun fact
async function generateFact() {
    const factEl = document.getElementById("currentFact");
    factEl.textContent = "✨ Generating fun fact…";

    try {
        const s = await initModel();
        if (!s) return;

        const prompt = `
You are a fun fact generator for kids under 12.

TASK:
Write exactly ONE short, real, safe fun fact.

OUTPUT RULES (must follow strictly):
- The text must START with ONLY one of these: "Did you know?", "Wow:", "Cool:" or "Amazing:".
- No introductions like "Okay, here's a fun fact".
- Keep it under 25 words.
- Use playful, kid-friendly language.
- Do not add emojis unless it is part of the fact itself.
- Output ONLY the fun fact. No explanations or extra sentences.
`;

        const fact = (await s.prompt(prompt)).trim();

        // Show in main card
        factEl.textContent = fact;

        // Save fact
        facts.unshift(fact);

        renderFactCollection();

    } catch (err) {
        console.error("AI fact generation failed:", err);
        factEl.textContent = "⚠️ Couldn't get a fun fact. Try again!";
    }
}

// Render preview facts (max 4)
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

// Render all facts
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

// Setup buttons
document.addEventListener("DOMContentLoaded", () => {
    generateFact(); // straight to first fact
    document.getElementById("newFact").addEventListener("click", generateFact);

    const viewAllBtn = document.getElementById("viewAllFacts"); 
    const backBtn = document.querySelector(".backToFacts");

    if (viewAllBtn) {
        viewAllBtn.addEventListener("click", () => {
            document.getElementById("factsNormalView").style.display = "none";
            document.getElementById("factsFullView").style.display = "flex";
            renderAllFacts();
        });
    }

    if (backBtn) {
        backBtn.addEventListener("click", () => {
            document.getElementById("factsFullView").style.display = "none";
            document.getElementById("factsNormalView").style.display = "flex"; // use flex, not block
            renderFactCollection();
        });
    }
});

// --- Global state ---
let questions = [];
let currentQ = 0;
let points = 0;
let totalPoints = 0;
let levelPoints = 0;
let level = 1;
const quizContent = document.getElementById("quizContent");


// Level Progress
function getSetsRequired(lvl) {
    if (lvl === 1) return 1;
    return 3 + (lvl - 2) * 2;       // level 2 = 3+0*2 = 3 sets, lvl 3 = 5 sets, lvl 4 = 7 sets
}

const badgeRewards = {
    1: { name: "🌱 Curious Explorer", desc: "Completed Level 1" },
    2: { name: "⚡ Quick Learner", desc: "Completed Level 2" },
    3: { name: "📘 Knowledge Seeker", desc: "Completed Level 3" },
    5: { name: "🌍 Global Thinker", desc: "Completed Level 5" },
    7: { name: "💡 Bright Mind", desc: "Completed Level 7" },
    10: { name: "🏆 Master Learner", desc: "Completed Level 10" }
};

let earnedBadges = [];

function updateProgress() {
    const setsRequired = getSetsRequired(level);
    const maxPoints = setsRequired * 30; // 30 pts per set
    let percent = Math.min((levelPoints / maxPoints) * 100, 100);

    // Update DOM
    document.getElementById("points-label").textContent = `${totalPoints} points`; 
    document.getElementById("level-label").textContent = `Level ${level}`;
    document.getElementById("progress-fill").style.width = percent + "%";
    document.getElementById("progress-label").textContent = Math.floor(percent) + "%";

    const remaining = maxPoints - levelPoints;
    document.getElementById("progress-remaining").textContent =
        remaining > 0 ? `${remaining} points to go` : "Level complete!";

    // Level up
    if (percent >= 100 && level < 10) {
        setTimeout(() => {
            // Award badge BEFORE leveling up
            if (badgeRewards[level]) {
                earnedBadges.push(badgeRewards[level]);
                renderBadges();
                alert(`🎉 You earned a new badge: ${badgeRewards[level].name}`);
            }

            // Move to next level
            level++;
            levelPoints = 0; // reset ONLY level progress, not total points
            updateProgress();
            alert(`🎉 Congrats! You leveled up to Level ${level}!`);
        }, 1000);
    }
}

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

let quizCollection = [];
// --- Generate quiz with AI ---
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
You are a quiz creator for kids under 12.
Make exactly 5 short multiple-choice questions about this webpage.

Rules:
- Respond ONLY with pure JSON, no extra text
- JSON format:
[
    {"q":"...","options":["a","b","c","d"],"correct":1,"pts":10},
    {"q":"...","options":["a","b","c","d"],"correct":0,"pts":10},
    {"q":"...","options":["a","b","c","d"],"correct":2,"pts":10}
]

Webpage text:
${pageText}
`;

    let response = await s.prompt(prompt);

    // --- Extract JSON safely ---
    const match = response.match(/\[.*\]/s); // look for [ ... ]
    if (!match) throw new Error("No JSON found in response");

    questions = JSON.parse(match[0]);

    // Reset progress
    currentQ = 0;
    points = 0;
    updateProgress();

    loadQuestion();

} catch (err) {
    console.error("AI quiz generation failed:", err);
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
// --- Render one question ---
function loadQuestion() {
if (currentQ >= questions.length) {
    quizContent.innerHTML = `
    <div class="card" style="text-align:center;">
        <div style="font-size:2rem;">🎉</div>
        <p>Quiz finished!</p>
        <p>You scored <b>${points}</b> points.</p>
    </div>
    `;
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
    ${q.options.map(
        (opt, i) => `<button class="opt-btn" data-i="${i}">${opt}</button>`
    ).join("")}
    </div>
    <button id="submitAnswer" disabled>Submit Answer &nbsp; > </button>
`;

let selected = null;
const optButtons = quizContent.querySelectorAll(".opt-btn");
const submitBtn = quizContent.querySelector("#submitAnswer");

// --- Option selection ---
optButtons.forEach(btn => {
    btn.addEventListener("click", () => {
    selected = parseInt(btn.dataset.i);

    // Reset all button styles
    optButtons.forEach(b => b.classList.remove("selected"));

    // Highlight chosen button
    btn.classList.add("selected");

    // Enable submit
    submitBtn.disabled = false;
    });
});

// --- Submit answer ---
submitBtn.addEventListener("click", () => {
    if (selected === null) return;

    if (selected === q.correct) {
        totalPoints += q.pts;
        levelPoints += q.pts;
        updateProgress();
        quizContent.innerHTML = `
            <div class="card" style="text-align:center;">
                <div style="font-size:2rem;">🎉</div>
                <p id="correctText"><b>Correct!</b></p>
                <p>+${q.pts} points</p>
            </div>
        `;
    } else {
        quizContent.innerHTML = `
            <div class="card" style="text-align:center;">
                <div style="font-size:2rem;">📖</div>
                <p id="keepLearningText"><b>Keep Learning!</b></p>
                <p>The correct answer was: <b>${q.options[q.correct]}</b></p>
            </div>
        `;
    }

    quizCollection.push({
        q: q.q,
        correct: q.options[q.correct]
    });
    renderQuizCollection();

    setTimeout(() => {
        currentQ++;
        loadQuestion();
    }, 2000);
});
}


// --- Run on load ---
generateQuiz();

const viewAllQuestionsBtn = document.getElementById("viewAllQuestions");
const backToQuizBtn = document.querySelector(".backToQuiz");

if (viewAllQuestionsBtn) {
    viewAllQuestionsBtn.addEventListener("click", () => {
        document.getElementById("quizNormalView").style.display = "none";
        document.getElementById("quizFullView").style.display = "flex";
        renderAllQuiz(); // function to render all stored quiz Q&A
    });
}

if (backToQuizBtn) {
    backToQuizBtn.addEventListener("click", () => {
        document.getElementById("quizFullView").style.display = "none";
        document.getElementById("quizNormalView").style.display = "block";
        renderQuizCollection(); 
    });
}