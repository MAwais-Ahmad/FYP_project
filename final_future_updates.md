# Final Future Updates & Project Roadmap

This document outlines the remaining features, polish, and critical additions required to take the FYP from a working prototype to a fully production-ready, academic-grade product.

---

## 1. Core Architecture & Backend
- **Proper Database (DB):** Move away from local memory/JSON arrays to a robust database (e.g., PostgreSQL, MongoDB). Must include clear relational mapping: `User -> Roles -> Quiz Results -> ML Predictions`.
- **Login / Signup (Auth):** Secure authentication endpoints. Include JWT (JSON Web Tokens) and password hashing (bcrypt) to ensure data is protected.
- **Security & API Protection:** 
  - Implement API Rate Limiting to prevent users from spamming the "Start Quiz" button and draining OpenAI credits.
  - Secure backend routes using middleware to ensure only authenticated users can submit or retrieve data.

## 2. Dashboards & Role Management
- **Role-Based Access Control (RBAC):** Distinct experiences for different user types.
- **Student Dashboard:** 
  - Take new quizzes.
  - View historical performance and ML categorization (e.g., "Reflective Thinker").
- **Teacher / Supervisor Dashboard:**
  - View aggregate class data and statistics.
  - Identify struggling students based on ML flags.
  - **Exporting / Reporting:** A one-click button to export class results to CSV/PDF (Highly requested by academic supervisors).

## 3. Advanced Features
- **Result Chatbot:** An AI tutor/bot embedded on the student dashboard that explains their Random Forest classification to them in natural language, providing personalized, actionable advice on how to improve their decision-making.
- **Progressive Web App (PWA):** Configure service workers and a web manifest so the app can be installed directly onto mobile devices, offering a native app-like experience.

## 4. UI / UX & Aesthetics
- **Premium Design Overhaul:** Move from standard functional components to a highly polished, Figma-inspired aesthetic.
- **Modern Web Practices:** Implement glassmorphism, smooth micro-animations, tailored color palettes, and modern typography (e.g., Inter or Outfit) to ensure the project looks state-of-the-art and visually "wows" the reviewers.

## 5. System Resilience & Polish
- **Global Error Handling:** Implement robust error boundaries and fallback UI states so that if the OpenAI API goes down or the DB disconnects, the app degrades gracefully rather than crashing.
- **Minor Tweaks:** Final polish on scenario generation timing, edge cases in question rendering, and ensuring the fallback interactive questions trigger seamlessly if needed.

## 6. Deployment
- **Frontend:** Deploy the React/Vite app to a static hosting platform (e.g., Vercel or Netlify) with automatic CI/CD on every push to `main`.
- **Backend:** Deploy the Express server (`server.cjs`) to a managed platform (e.g., Render, Railway, or Heroku) with environment variables for `OPENAI_API_KEY` and DB connection strings kept secure.
- **Database:** Host the database on a managed cloud provider (e.g., Supabase for PostgreSQL, or MongoDB Atlas) with proper access control and backups.
- **Domain & HTTPS:** Configure a custom domain with SSL/HTTPS to ensure secure data transmission in production.
