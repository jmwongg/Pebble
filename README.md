# Pebble - Turning Daily Browsing into Discovery For Kids  🌐✨

## 🌟 Inspiration
Kids spend a huge amount of time online — browsing videos, articles, and websites every day.
But most of this content is written for adults, filled with complex ideas, or sometimes even unsafe.

This creates two problems:
1. Children miss out on valuable knowledge
2. They risk encountering inappropriate content

Since kids are already spending so much time browsing, we should leverage today’s advanced technology such as AI to turn those moments into opportunities for safe learning. 

**Pebble**, the **Chrome Extension** was created to solve this problem. It turns everyday browsing into a **safe, kid-friendly learning experience**. 

By simplifying complex text, translating content, and adding interactive quizzes and fun facts, Pebble ensures that no browsing moment is wasted — every click becomes an opportunity to learn.  

---

## 📖 Key Features
- **Rewrite Content**  
  Simplifies complex text into kid-friendly language at three reading levels (simple, intermediate, advanced).  
  Sensitive ideas are softened but the original meaning is preserved.  

- **Translate Content**  
  Converts web content into a child’s preferred language, including rewritten passages, making it easier for bilingual learners.  

- **Gamified Learning Panel**  
  Auto-generates quizzes, fun facts, and summaries to support comprehension.  
  Kids earn **points, badges, and levels**, turning browsing into a fun learning experience.  
---

## ⚡ Prerequisites

Before installing Pebble, please ensure your system meets these requirements:

1. **Google Chrome Version**
   - Use Chrome Dev channel (or Canary channel)  
   - Version must be ≥ 128.0.6545.0  

2. **System Requirements**
   - At least 22 GB of free storage space  
   - If available storage drops below 10 GB after download, the model will be automatically deleted  
   - macOS users: Use **Disk Utility** to confirm free disk space  

3. **Policy Acknowledgment**
   - Review and acknowledge Google’s **Generative AI Prohibited Uses Policy**  

---

## 🚀 Installation

### Step 1: Enable Gemini Nano and Required APIs

1. Open Chrome and go to:  
   `chrome://flags/#optimization-guide-on-device-model`  
2. Set to **Enabled BypassPerfRequirement**  
   - This bypasses performance checks that may prevent Gemini Nano from downloading  

3. Enable the following flags:  
   - `chrome://flags/#prompt-api-for-gemini-nano` → **Enabled**  
   - `chrome://flags/#rewriter-api-for-gemini-nano` → **Enabled**  
   - `chrome://flags/#summarization-api-for-gemini-nano` → **Enabled**
4. Relaunch Chrome
5. Update On-Device Model Component:
   - Go to chrome://components and ensure the **"Optimization Guide On Device Model"** is up to date.
   - You might need to click "Check for update" if it's not. 

---

### Step 2: Install Pebble Extension

1. Clone the repository:
   ```bash
   git clone https://github.com/jmwongg/Pebble.git
   ```
2. Open Chrome Dev/Canary
3. Navigate to `chrome://extensions/`
4. Enable "Developer mode" (toggle in top right)
5. Click "Load unpacked"
6. Select the cloned `Pebble-main` directory
7. The extension should now appear in your Chrome toolbar

---

## 🧭 How They Work

#### Rewrite & Simplification
 - Three reading levels: **Simple, Intermediate, Advanced**  
 - Sensitive or complex ideas rewritten into **safe, age-appropriate language**  
 - Preserves original meaning while making content kid-friendly  

#### Translation
- Translate rewritten content into multiple languages  
- Supports bilingual learners by making pages easier to understand  

#### Gamified Learning Panel
- Generates **quizzes, fun facts, and summaries** from the page  
- Kids earn **points, badges, and levels** as they learn  
- Stores learning history locally so they can review anytime  
- Progress can be tracked in the **Overview** tab of the learning panel

---

### 🔒 Privacy & Security
Built on Chrome’s **Gemini Nano AI**, Pebble runs entirely offline to ensure privacy and smooth performance. All learning data stays in local device for **safety and accessibility**. There is **no tracking or collection** of personal information.

---

### 📝 License
Pebble is released under the MIT License.

---

### ⚠️ Troubleshooting
If you run into issues:
- Make sure you have at least 22 GB of free disk space
- Check that your Chrome version is compatible
- Confirm all required flags are enabled
- Try restarting Chrome after enabling the flags
