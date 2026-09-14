# 🧠 AI Teacher Assistant (AITA) — Multimodal Cognitive Profiling Engine

[![React](https://img.shields.io/badge/React-18.2-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.js.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Embedded-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com/)

> **An intelligent, automated diagnostic assessment engine that profiles students' true cognitive learning patterns, decision-making styles, and problem-solving behaviors in real time using 17 high-resolution behavioral telemetry features.**

---

## 📌 Project Overview & Description

**Short Description (For GitHub About Section):**
> *AI Teacher Assistant (AITA) is an adaptive assessment platform powered by AI & Machine Learning. It tracks 17 real-time micro-behavioral telemetry metrics during diagnostic testing to classify students into 8 cognitive learning archetypes—eliminating prior-knowledge bias and typing speed friction.*

### 🎯 The Core Problem & Solution

Traditional testing platforms only measure **WHAT** score a student achieved ($Accuracy$). They fail to capture **HOW** the student arrived at their answer, completely ignoring hesitation, cognitive friction, second-guessing, and stress regulation. Furthermore, standard text-based assessments introduce severe typing latency and language fluency biases.

**AITA (AI Teacher Assistant)** solves this by creating a **Trojan Horse diagnostic testing environment**. By capturing **17 high-resolution behavioral telemetry signals** across interactive elements (MCQs, interactive sliders, drag-and-drop rankings) and running a **Random Forest ML Classifier**, AITA accurately classifies students into **8 cognitive learning archetypes** without penalizing slow readers or non-native English speakers.

---

## ✨ Key Features

- 🧠 **17 Behavioral Telemetry Features**: Tracks timing, hesitation gap, pacing variance, option switching, backtracks, and metacognitive reflection.
- 🎭 **8 Cognitive Learning Archetypes**: Automatically profiles learners into distinct archetypes (`Fast Learner`, `Strategic Thinker`, `Slow & Thorough`, `Concept Struggler`, `Quick & Careless`, `Inconsistent Performer`, `Steady Achiever`, `Ignorant / Avoider`).
- 🐴 **3-Step Trojan Horse Context Transfer**: Evaluates true conceptual comprehension through 3 progressive levels (Recall $\rightarrow$ Near Transfer $\rightarrow$ Far Transfer under structural noise).
- ⚡ **Personalized Speed Normalization**: Establishes a 10-second interaction baseline to eliminate slow reading speed / interface barrier bias.
- 📄 **Multimodal Paper & OCR Scanner**: Processes physical test papers, PDFs, and Word documents via Vision OCR (Tesseract / multimodal LLM processing) into digital adaptive tests.
- 📊 **Interactive Analytics Dashboard**: Visualizes class performance, cognitive radar graphs, individual student trajectories, and actionable AI remedial recommendations.
- 🤖 **AI Test & Question Generator**: Powered by OpenAI GPT-4 to dynamically generate novel, abstract, and un-googleable assessment scenarios tailored to any curriculum.

---

## 🧠 Behavioral Telemetry & Cognitive Archetypes

### The 17 Telemetry Signals

| Metric Category | Telemetry Signal | Description |
| :--- | :--- | :--- |
| **Timing & Pacing** (6) | `avgResponseTime` | Mean active decision time (seconds) per question |
| | `avgTimeToStart` | Initial hesitation latency before first click/keystroke |
| | `timeVariance` | Coefficient of variation ($\text{CV} = \frac{\sigma}{\mu}$) measuring pacing consistency |
| | `rushedDecisions` | Count of questions submitted in $< 15$ seconds |
| | `overthinkingCount` | Count of questions with excessive hesitation ($> 60\text{s}$) |
| | `overtimeCount` | Questions exceeding recommended challenge time |
| **Behavioral Dynamics** (7) | `totalAnswerChanges` | Frequency of option switches or mind-changes before submission |
| | `backtrackCount` | Count of backward navigations to alter previous answers |
| | `confidence` | Implicit confidence rating ($1.0 - 10.0$) based on speed & accuracy |
| | `totalResponseLength` | Character count across open-ended written responses |
| | `skippedQuestions` | Count of unattempted / skipped questions |
| | `decisionStyle` | Classification: `Impulsive`, `Balanced`, or `Deliberate` |
| | `accuracyScore` | Overall accuracy ratio ($0.0 - 1.0$) |
| **Cognitive Extraction** (4) | `reflection_depth` | Metacognitive evaluation score ($0.0 - 1.0$) |
| | `self_awareness` | Risk awareness and mistake recognition ($0.0 - 1.0$) |
| | `learning_orientation` | Preference for info-seeking vs. blind guessing ($0.0 - 1.0$) |
| | `creativity_score` | Resourcefulness and non-generic problem-solving ($0.0 - 1.0$) |

### The 8 Cognitive Learning Archetypes

1. ⚡ **Quick & Careless (`quick_careless`)**: High speed, low response time, high rushed decisions, moderate/low accuracy.
2. 🐢 **Slow & Thorough (`slow_thorough`)**: Extended hesitation, low time variance, low answer changes, high accuracy.
3. 😰 **Concept Struggler (`concept_struggler`)**: High hesitation, frequent option switching, backtrack loops, low accuracy.
4. 🚀 **Fast Learner (`fast_learner`)**: Fast response time, high accuracy, low cognitive friction.
5. 🎲 **Inconsistent Performer (`inconsistent_performer`)**: High time variance, irregular accuracy spikes.
6. 📈 **Steady Achiever (`steady_achiever`)**: Balanced pacing, consistent accuracy, low rushed decisions.
7. 🎯 **Strategic Thinker (`strategic_thinker`)**: High initial hesitation (`avgTimeToStart`), zero rushed decisions, high accuracy under Far Transfer.
8. 🙈 **Ignorant / Avoider (`ignorant_avoider`)**: High skipped questions, minimal interaction time, random choices.

---

## 🏗 System Architecture & Delivery Logic

```mermaid
graph TD
    User[Student / User] --> Baseline[Step 1: 10-Sec Interaction Baseline]
    Baseline -->|Calibrates Reading Speed| Symmetry[Step 2: Multimodal Presentation]
    Symmetry -->|Presents Parallel Sensory Channels| Transfer[Step 3: 3-Tier Context Shift]
    
    subgraph Context Shift Progression
        Transfer --> L1[Level 1: Direct Concept / Recall]
        Transfer --> L2[Level 2: Near Transfer / Scenario Swap]
        Transfer --> L3[Level 3: Far Transfer / Structural Noise]
    end
    
    L1 & L2 & L3 --> Telemetry[17-Feature Telemetry Collector]
    Telemetry --> ML[Random Forest / ML Classification Engine]
    ML --> Archetype[Cognitive Archetype Profile]
    Archetype --> Dashboard[Teacher & Student Analytics Dashboard]
```

---

## 🛠 Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS, DnD Kit (Drag & Drop), Lucide Icons
- **Backend**: Node.js, Express.js, CORS, Multer (File Uploads), Nodemailer
- **Database & ORM**: PostgreSQL / Embedded Postgres, Prisma ORM
- **AI & Document Processing**: OpenAI GPT-4 API, `pdf-parse`, `officeparser` (DOCX), Vision OCR / Tesseract

---

## 📁 Project Structure

```text
FYP_project/
├── ml/                         # Machine learning model scripts & datasets
├── prisma/                     # Prisma schema, migrations & database configuration
├── public/                     # Static assets and public resources
├── sample_test_papers/         # Test paper benchmarks & sample OCR inputs
├── server/                     # Express API backend server & API routes
│   └── start-local.cjs         # Local server startup script
├── src/                        # React Frontend Source Code
│   ├── components/             # Reusable UI components & screen views
│   ├── context/                # React state context providers
│   ├── types/                  # TypeScript interface definitions
│   └── utils/                  # Utility functions & API clients
├── flex_banner/                # Presentation flex banner HTML source
├── index.html                  # Vite HTML entry point
├── package.json                # Project dependencies and npm scripts
├── tailwind.config.js          # Tailwind CSS design system configuration
├── tsconfig.json               # TypeScript configuration
└── vite.config.ts              # Vite bundling configuration
```

---

## 🚀 Quick Start Guide

### Prerequisites

- **Node.js** (v18.x or higher)
- **npm** (v9.x or higher)
- **PostgreSQL** (or leverage embedded PostgreSQL provided in dependencies)
- **OpenAI API Key** (optional, required for AI test generation features)

### 1. Clone & Install Dependencies

```bash
git clone https://github.com/MAwais-Ahmad/FYP_project.git
cd FYP_project
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
PORT=5000
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/aita_db?schema=public"
OPENAI_API_KEY="your_openai_api_key_here"
JWT_SECRET="your_jwt_secret_key"
```

### 3. Database Migration

```bash
npx prisma db push
```

### 4. Run the Application

Start both the backend server and Vite frontend development server:

```bash
# Terminal 1: Run Backend Express Server
npm run server

# Terminal 2: Run Frontend Vite Dev Server
npm run dev
```

Open your browser and navigate to `http://localhost:5173`.

---

## 🎓 Academic Defense & Innovations

If presenting or defending this project:
1. **Micro-Behaviors Over Pure Scores**: Explains *how* students arrive at answers rather than just tracking final right/wrong choices.
2. **Zero Typing-Friction Bias**: Converts open-ended cognitive stress tests into standardized interactive sliders and drag-and-drop components, eliminating typing latency and ESL language penalties.
3. **Speed Normalization**: Uses an interaction baseline to differentiate slow readers from slow thinkers.
4. **Resilience to Guessing**: Abstract, fictional scenarios prevent students from relying on prior memorized answers or external searching.

---

## 📜 License & Acknowledgments

Developed as a Final Year Project (FYP) at the **Department of Software Engineering, University of Management and Technology (UMT SST)**.

Distributed under the MIT License. See `LICENSE` for more information.
