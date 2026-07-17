require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = 'gpt-4o-mini';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const prisma = new PrismaClient();

let isDbConnected = false;
prisma.$connect()
  .then(() => {
    isDbConnected = true;
    console.log('✅ PostgreSQL Database connected successfully via Prisma');
  })
  .catch((err) => {
    console.error('⚠️ Database connection failed. Running in Offline/Local Fallback mode.', err.message);
  });

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

let totalTokensUsed = 0;

// ─── AUTH HELPERS ────────────────────────────────────────────────────────────
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = stored.split(':');
  const computed = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === computed;
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

function generateSessionCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // No confusing I/1/O/0
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

// In-memory token store (keyed by token → userId)
const tokenStore = new Map();

// Auth middleware — attaches req.user if valid token present, else null
async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }
  const token = authHeader.slice(7);
  const userId = tokenStore.get(token);
  if (!userId) {
    req.user = null;
    return next();
  }
  try {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    req.user = user;
  } catch {
    req.user = null;
  }
  next();
}

// Require auth — returns 401 if not logged in
function requireAuth(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }
  next();
}

app.use(authMiddleware);

// ─── AUTH ENDPOINTS ──────────────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  if (!isDbConnected) {
    return res.status(503).json({ success: false, error: 'Database is currently offline' });
  }
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({ success: false, error: 'Email, password, and name are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists' });
    }
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        passwordHash: hashPassword(password),
        name: name.trim(),
        role: 'USER'
      }
    });
    const token = generateToken();
    tokenStore.set(token, user.id);
    console.log(`✅ User registered: ${user.email}`);
    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('❌ Registration error:', error.message);
    res.status(500).json({ success: false, error: 'Registration failed', message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  if (!isDbConnected) {
    return res.status(503).json({ success: false, error: 'Database is currently offline' });
  }
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user || !verifyPassword(password, user.passwordHash)) {
      return res.status(401).json({ success: false, error: 'Invalid email or password' });
    }
    const token = generateToken();
    tokenStore.set(token, user.id);
    console.log(`✅ User logged in: ${user.email}`);
    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, name: user.name, role: user.role }
    });
  } catch (error) {
    console.error('❌ Login error:', error.message);
    res.status(500).json({ success: false, error: 'Login failed', message: error.message });
  }
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    tokenStore.delete(authHeader.slice(7));
  }
  res.json({ success: true });
});

app.get('/api/auth/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: { id: req.user.id, email: req.user.email, name: req.user.name, role: req.user.role }
  });
});

// ─── EMAIL TRANSPORTER SETUP ────────────────────────────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER || 'mock_user',
    pass: process.env.SMTP_PASS || 'mock_pass',
  },
});

async function sendResetPasswordEmail(email, token) {
  const resetLink = `http://localhost:5173/?resetToken=${token}`;
  console.log(`\n🔑 [PASSWORD RESET LINK GENERATED FOR ${email}]:\n👉 ${resetLink}\n`);

  if (process.env.SMTP_USER && process.env.SMTP_HOST && process.env.SMTP_USER !== 'mock_user') {
    try {
      await transporter.sendMail({
        from: `"AITA Support" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
        to: email,
        subject: 'Reset Your AITA Password',
        text: `You requested to reset your password. Click the link below to set a new password:\n\n${resetLink}\n\nThis link is valid for 1 hour.`,
        html: `<div style="font-family: sans-serif; padding: 20px; color: #333; max-width: 500px; margin: 0 auto; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #0b0f19; color: #ffffff;">
          <h2 style="color: #6366f1; text-align: center;">AITA Password Reset</h2>
          <p>You requested to reset your password. Click the button below to set a new password:</p>
          <div style="text-align: center; margin: 25px 0;">
            <a href="${resetLink}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Reset Password</a>
          </div>
          <p style="color: #9ca3af; font-size: 14px;">Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #818cf8;"><a href="${resetLink}" style="color: #818cf8;">${resetLink}</a></p>
          <hr style="border: 0; border-top: 1px solid #1f2937; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af; text-align: center;">This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.</p>
        </div>`,
      });
      console.log(`🟢 Reset email sent successfully to ${email}`);
    } catch (err) {
      console.error(`🔴 Failed to send reset email to ${email}:`, err.message);
    }
  } else {
    console.log(`ℹ️ SMTP not configured. Reset link printed to console above.`);
  }
}

app.post('/api/auth/forgot-password', async (req, res) => {
  if (!isDbConnected) {
    return res.status(503).json({ success: false, error: 'Database is currently offline' });
  }
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email is required' });
    }
    const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (!user) {
      // Prevents email enumeration
      return res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 3600000); // 1 hour expiry

    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetToken: token,
        resetTokenExpires: expires
      }
    });

    await sendResetPasswordEmail(user.email, token);

    res.json({ success: true, message: 'If the email exists, a reset link has been sent' });
  } catch (error) {
    console.error('❌ Forgot password error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to request password reset' });
  }
});

app.post('/api/auth/reset-password', async (req, res) => {
  if (!isDbConnected) {
    return res.status(503).json({ success: false, error: 'Database is currently offline' });
  }
  try {
    const { token, password } = req.body;
    if (!token || !password) {
      return res.status(400).json({ success: false, error: 'Token and new password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
    }
    const user = await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date()
        }
      }
    });
    if (!user) {
      return res.status(400).json({ success: false, error: 'Invalid or expired password reset token' });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: hashPassword(password),
        resetToken: null,
        resetTokenExpires: null
      }
    });

    console.log(`🔒 Password reset successfully for user: ${user.email}`);
    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (error) {
    console.error('❌ Reset password error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to reset password' });
  }
});

// ─── SESSION ENDPOINTS ───────────────────────────────────────────────────────
app.post('/api/sessions', requireAuth, async (req, res) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, error: 'Session title is required' });
    }
    // Generate unique 6-char code (retry if collision)
    let code;
    let attempts = 0;
    do {
      code = generateSessionCode();
      attempts++;
    } while (await prisma.session.findUnique({ where: { code } }) && attempts < 10);

    const session = await prisma.session.create({
      data: {
        code,
        title: title.trim(),
        hostId: req.user.id,
      }
    });
    console.log(`📋 Session created: ${session.code} — "${session.title}" by ${req.user.name}`);
    res.json({ success: true, session });
  } catch (error) {
    console.error('❌ Session creation error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to create session' });
  }
});

app.get('/api/sessions', requireAuth, async (req, res) => {
  try {
    // Get sessions the user hosts
    const hosted = await prisma.session.findMany({
      where: { hostId: req.user.id },
      include: { members: { include: { user: { select: { id: true, name: true, email: true } } } } },
      orderBy: { createdAt: 'desc' }
    });
    // Get sessions the user joined
    const joined = await prisma.sessionMember.findMany({
      where: { userId: req.user.id },
      include: {
        session: {
          include: {
            host: { select: { id: true, name: true } },
            members: { include: { user: { select: { id: true, name: true } } } }
          }
        }
      },
      orderBy: { joinedAt: 'desc' }
    });
    res.json({
      success: true,
      hosted,
      joined: joined.map(m => ({ ...m.session, myMembership: { id: m.id, recordId: m.recordId, joinedAt: m.joinedAt } }))
    });
  } catch (error) {
    console.error('❌ Sessions list error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch sessions' });
  }
});

app.get('/api/sessions/code/:code', async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { code: req.params.code.toUpperCase() },
      include: {
        host: { select: { id: true, name: true } },
        members: { select: { id: true, userId: true } }
      }
    });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    res.json({ success: true, session });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to find session' });
  }
});

app.post('/api/sessions/code/:code/join', requireAuth, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { code: req.params.code.toUpperCase() }
    });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    if (!session.isActive) {
      return res.status(400).json({ success: false, error: 'This session is no longer active' });
    }
    if (session.hostId === req.user.id) {
      return res.status(400).json({ success: false, error: 'You are the host of this session' });
    }
    // Check if already joined
    const existing = await prisma.sessionMember.findUnique({
      where: { sessionId_userId: { sessionId: session.id, userId: req.user.id } }
    });
    if (existing) {
      return res.json({ success: true, membership: existing, message: 'Already joined' });
    }
    const membership = await prisma.sessionMember.create({
      data: {
        sessionId: session.id,
        userId: req.user.id,
      }
    });
    console.log(`🔗 ${req.user.name} joined session ${session.code}`);
    res.json({ success: true, membership });
  } catch (error) {
    console.error('❌ Session join error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to join session' });
  }
});

app.get('/api/sessions/:id/results', requireAuth, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        host: { select: { id: true, name: true } },
        members: {
          include: {
            user: { select: { id: true, name: true, email: true } }
          }
        }
      }
    });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    if (session.hostId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only the host can view session results' });
    }
    // Fetch records for members that have completed
    const memberRecordIds = session.members
      .filter(m => m.recordId)
      .map(m => m.recordId);
    const records = await prisma.record.findMany({
      where: { id: { in: memberRecordIds } },
      include: { user: { select: { id: true, name: true } } }
    });
    const recordMap = {};
    records.forEach(r => { recordMap[r.id] = r; });

    const membersWithResults = session.members.map(m => ({
      id: m.id,
      user: m.user,
      joinedAt: m.joinedAt,
      recordId: m.recordId,
      record: m.recordId ? recordMap[m.recordId] || null : null,
      status: m.recordId ? 'completed' : 'in-progress'
    }));

    res.json({
      success: true,
      session: {
        id: session.id,
        code: session.code,
        title: session.title,
        isActive: session.isActive,
        createdAt: session.createdAt,
        host: session.host,
      },
      members: membersWithResults
    });
  } catch (error) {
    console.error('❌ Session results error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch session results' });
  }
});

app.patch('/api/sessions/:id', requireAuth, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    if (session.hostId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only the host can modify this session' });
    }
    const updated = await prisma.session.update({
      where: { id: req.params.id },
      data: { isActive: req.body.isActive ?? !session.isActive }
    });
    res.json({ success: true, session: updated });
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to update session' });
  }
});

// ─── SCENARIO FORMATS (11 formats — far beyond just budget allocation!) ───────
const scenarioFormats = [
  {
    format: 'budget_allocation',
    prompt: 'A situation where limited money/resources must be split among competing needs. Include specific amounts in PKR, stakeholders with names, and requests that total 25-40% more than the budget.',
  },
  {
    format: 'ethical_dilemma',
    prompt: 'A moral/ethical situation with no clear right answer — e.g., catching a friend cheating, a workplace honesty issue, choosing between loyalty and integrity. Present 2-3 conflicting values the student must weigh.',
  },
  {
    format: 'crisis_management',
    prompt: 'An event or project going wrong mid-way — e.g., a college event falling apart, a group project teammate disappearing before deadline, a tech failure during a presentation. Student must make rapid recovery decisions.',
  },
  {
    format: 'team_conflict',
    prompt: 'A disagreement between people the student cares about — e.g., two friends in a fight asking them to pick a side, teammates with opposing ideas, family members disagreeing on an important decision. Focus on diplomacy and relationship management.',
  },
  {
    format: 'tradeoff_analysis',
    prompt: 'A situation with 4-5 options where each has clear pros and cons — e.g., choosing between internship offers, picking a university, deciding how to spend a gap year. No money involved, just competing priorities and values.',
  },
  {
    format: 'time_management',
    prompt: 'An overwhelming week where too many commitments overlap — exams, family event, friend needs help, personal project deadline, health issue. Student must prioritize and some things WILL be dropped. Focus on what they sacrifice and why.',
  },
  // ─── NEW FORMATS (Improvement #1) ───────────────────────────────────────────
  {
    format: 'resource_constraint',
    prompt: 'Managing scarce equipment/facilities rather than money — e.g., one functional lab PC for a whole group, a single projector double-booked between two societies, limited hostel study rooms during exams. Student must allocate physical/time resources and justify trade-offs.',
  },
  {
    format: 'peer_review_feedback',
    prompt: 'Handling critical academic evaluation — e.g., a supervisor tears apart their FYP proposal, a peer review round where their code/design is harshly criticised, or they must deliver tough feedback to a friend. Focus on how they receive, process, and respond to criticism.',
  },
  {
    format: 'uncertainty_incomplete_data',
    prompt: 'Decision-making when half the information is missing — e.g., choosing a final-year specialisation with no clear job data, committing to an event vendor whose reviews are unavailable, picking a teammate whose skills are unverified. Student must reason under genuine uncertainty and state assumptions.',
  },
  {
    format: 'innovation_ideation',
    prompt: 'Proposing a high-risk / high-reward solution — e.g., pitching an untested startup idea at a campus competition, redesigning a broken society process from scratch, choosing an ambitious vs safe FYP topic. Reward originality but force them to confront real failure risk.',
  },
  {
    format: 'cross_cultural_communication',
    prompt: 'Managing international or cross-cultural team dynamics — e.g., coordinating a remote hackathon team across time zones and languages, mediating a misunderstanding between local and foreign exchange students, working with an overseas freelancing client with different norms. Focus on empathy, clarity, and adaptation.',
  },
];

// ─── DYNAMIC QUESTION PHASES (12 per scenario) ────────────────────────────────
// Scenario 1 & 2: 10 Interactive questions (mcq, ranking, slider, mcq-urgent) + 2 VARK questions.
// Scenario 3: 7 interactive, 2 VARK, 3 text/reflection.

const INTERACTIVE_TYPES = [
  { phaseName: 'Information Filtering', type: 'mcq', desc: 'Decide which piece of data/file/resource/person to trust MOST before acting.', timeRange: '30-60s' },
  { phaseName: 'Planning', type: 'ranking', desc: 'Rank these 3-4 strategies from most effective to least effective for THIS situation.', timeRange: '45-90s' },
  { phaseName: 'Risk Mitigation', type: 'mcq', desc: 'Identify the biggest failure point or the smartest Plan B for this story.', timeRange: '40-70s' },
  { phaseName: 'Resource Allocation', type: 'slider', desc: 'Distribute a limited budget, time, or personnel across 2-4 competing priorities. (Output slider min/max/unit)', timeRange: '60-120s' },
  { phaseName: 'Execution Twist', type: 'mcq-urgent', desc: 'React under pressure to a SUDDEN change/crisis unique to this story.', timeRange: '20-40s' },
  { phaseName: 'Ethical Dilemma', type: 'mcq', desc: 'Make a tough choice between doing the right thing vs the popular/easy thing.', timeRange: '40-70s' }
];

const VARK_PHASE = {
  phaseName: 'Learning Modality',
  type: 'vark',
  desc: 'Provide a contextual scenario choice where the student decides how they prefer to study, review, or verify critical details of the situation. Provide 4 options mapping to Visual, Auditory, Read-Write, and Kinesthetic methods.',
  timeRange: '30-50s'
};

const TEXT_TYPES = [
  { phaseName: 'Understanding', type: 'text', desc: 'Identify the CORE tension / underlying problem in this specific story.', timeRange: '60s' },
  { phaseName: 'Collaboration', type: 'text', desc: 'Write exactly what you would say to persuade, delegate, or manage a specific person in the story.', timeRange: '60s' },
  { phaseName: 'Reflection', type: 'reflection', desc: 'Hindsight, calibration and honest self-grading.', timeRange: '0 (unlimited)' }
];

const COGNITIVE_PHASES = [...INTERACTIVE_TYPES, ...TEXT_TYPES, VARK_PHASE];

// Fixed, challenge-tuned per-question time limits (seconds) by question type.
// The student never sees a per-question timer, but these still power the
// overtime/behavioural metrics AND the tight overall scenario limit.
const TIME_BY_TYPE = {
  text: 60,
  mcq: 40,          // normal MCQ
  'mcq-urgent': 30, // urgent twist — high pressure
  ranking: 60,
  slider: 45,
  'multi-text': 90,
  reflection: 0,    // unlimited
  vark: 40,
};

// Fisher–Yates shuffle
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Build a dynamic phase order of 12 questions based on scenario number
function buildPhaseOrder(scenarioNumber) {
  let selected = [];
  
  if (scenarioNumber <= 2) {
    // 10 Interactive Questions + 2 VARK Questions = 12 total
    let interactivePool = [];
    for (let i = 0; i < 2; i++) {
      interactivePool.push(...INTERACTIVE_TYPES);
    }
    interactivePool = shuffle(interactivePool).slice(0, 10);
    
    selected = [...interactivePool, VARK_PHASE, VARK_PHASE];
    selected = shuffle(selected);
  } else {
    // Scenario 3: 7 Interactive, 2 VARK, 3 Text (including Reflection) = 12 total
    let interactivePool = [];
    for (let i = 0; i < 2; i++) {
      interactivePool.push(...INTERACTIVE_TYPES);
    }
    interactivePool = shuffle(interactivePool).slice(0, 7);
    
    selected = [...interactivePool, VARK_PHASE, VARK_PHASE];
    selected = shuffle(selected);
    
    // Add 3 text types at the end (Reflection is always absolute last)
    selected.push(TEXT_TYPES[0]); // Understanding
    selected.push(TEXT_TYPES[1]); // Collaboration
    selected.push(TEXT_TYPES[2]); // Reflection
  }

  // Assign IDs and Phases sequentially
  return selected.map((item, index) => ({
    id: index + 1,
    phase: index + 1,
    ...item
  }));
}


// ─── 50+ LOCALISED PAKISTANI SCENARIO SEEDS (Improvement #8) ──────────────────
const SCENARIO_SEEDS = [
  'University spring fest budget split between competing societies',
  'A freelancing Fiverr client demands a refund after the deadline passed',
  'Hostel warden dispute over a late-night noise complaint',
  'Group FYP teammate vanishes two weeks before the final demo',
  'Choosing between a paid internship and a family wedding in another city',
  'Society treasurer caught between the president and the faculty advisor',
  'Loadshedding wipes out work the night before a submission',
  'A junior on your team is being bullied in the WhatsApp group',
  'Splitting a shared flat rent when one roommate loses their stipend',
  'Cricket tournament clashes with a make-up exam on the same day',
  'A classmate offers to sell you last year’s paper before the midterm',
  'Daewoo bus breaks down on the way to a scholarship interview',
  'Two close friends in a fight both ask you to pick a side',
  'Managing a campaign for the student council elections on a tiny budget',
  'A professor mistakenly gives you extra marks you did not earn',
  'Your startup idea is praised but a senior says it will never work',
  'Coordinating a remote hackathon team across Karachi, Lahore and Dubai',
  'Family pressures you to switch from CS to medicine in your final year',
  'A donor pledges fest sponsorship but wants their brand everywhere',
  'Limited lab PCs and three groups need them for the same deadline',
  'Your code broke production during a live society app demo',
  'A teammate uses AI to write a report you all must defend',
  'Choosing a final-year specialisation with no clear job-market data',
  'A vendor for the convocation dinner cancels 24 hours before',
  'Mediating between a local student and a foreign exchange student',
  'You must deliver harsh peer-review feedback to a sensitive friend',
  'Eid plans collide with a mandatory FYP supervisor meeting',
  'A society event permit gets revoked the morning of the event',
  'Your scholarship requires a GPA you might miss by 0.1',
  'A senior asks you to inflate attendance for a society event report',
  'Picking a teammate whose claimed skills are completely unverified',
  'A viral tweet about your society starts a small controversy',
  'The MUN delegation budget cannot cover all selected delegates',
  'A group member wants credit for work they did not do',
  'Your part-time tuition job clashes with lab timings',
  'A campus startup competition: pitch a safe idea or an ambitious one',
  'A friend asks to copy your assignment the night before it is due',
  'Organising iftar for a hostel when the mess budget is cut',
  'A guest speaker cancels an hour before a packed seminar hall',
  'Deciding how to spend a surprise Rs.100,000 society grant',
  'A teammate’s laptop with all the shared work gets stolen',
  'Choosing between two internship offers with very different cultures',
  'A WhatsApp rumour threatens to derail your event registrations',
  'You overcommitted to three societies and all need you this week',
  'A foreign client expects replies during your sleeping hours',
  'A juniors’ orientation goes over budget on day one',
  'Your research data looks promising but the sample is too small',
  'A society co-lead keeps overruling you in front of the team',
  'Allocating one projector double-booked by two societies',
  'A classmate threatens to report a harmless prank to the DSA',
  'Balancing a sick parent at home with finals week on campus',
  'A sponsor’s payment is delayed but vendors demand advance money',
];

// ─── DIFFICULTY LEVEL DESCRIPTIONS ───────────────────────────────────────────
function getDifficultyPrompt(level) {
  if (level <= 3) {
    return `DIFFICULTY: EASY (Level ${level}/10)
    - 3-4 stakeholders/options (fewer decisions)
    - Clear information, no hidden details
    - One option is subtly better than others
    - Familiar everyday situations (college, friends, family)
    - Generous time context, low pressure`;
  }
  if (level <= 6) {
    return `DIFFICULTY: MEDIUM (Level ${level}/10)
    - 4-5 stakeholders/options
    - Some ambiguous information
    - No obviously correct answer
    - Moderate time pressure
    - Requires balancing multiple factors`;
  }
  if (level <= 8) {
    return `DIFFICULTY: HARD (Level ${level}/10)
    - 5-6 stakeholders/options with competing needs
    - Conflicting or incomplete information
    - Hidden constraints that emerge mid-scenario
    - Real time pressure
    - Requires creative thinking and trade-offs`;
  }
  return `DIFFICULTY: EXPERT (Level ${level}/10)
    - 6-7 stakeholders/options with layered conflicts
    - Deliberately misleading or contradictory information
    - Multiple hidden constraints
    - High-stakes consequences for wrong decisions
    - Requires systems thinking and strong justification`;
}

// ─── ADAPTIVE DIFFICULTY CONTEXT ─────────────────────────────────────────────
function getAdaptiveContext(difficultySignal, scenarioNumber) {
  if (!difficultySignal || scenarioNumber === 1) return '';

  const map = {
    harder: `\nADAPTIVE NOTE: Student performed WELL in Scenario ${scenarioNumber - 1}. Push harder — more variables, more ambiguity, tighter time pressure.`,
    easier: `\nADAPTIVE NOTE: Student STRUGGLED in Scenario ${scenarioNumber - 1}. Make this more structured — clearer options, less ambiguity, more guidance in hints.`,
    consistency_test: `\nADAPTIVE NOTE: Student showed MIXED patterns. Use a completely different domain to test if they apply consistent decision-making principles.`,
  };

  return map[difficultySignal] || '';
}

// ─── GENERATE SCENARIO + QUESTIONS ───────────────────────────────────────────
app.post('/api/generate-scenario', async (req, res) => {
  try {
    const { difficultySignal, scenarioNumber = 1, difficultyLevel = 5, previousThemes = [] } = req.body;

    const randomFormat = scenarioFormats[Math.floor(Math.random() * scenarioFormats.length)];
    const difficultyPrompt = getDifficultyPrompt(difficultyLevel);
    const adaptiveContext = getAdaptiveContext(difficultySignal, scenarioNumber);

    // Anti-predictability: pick a random localised seed + dynamically generate 12 phases
    const randomSeed = SCENARIO_SEEDS[Math.floor(Math.random() * SCENARIO_SEEDS.length)];
    const phaseOrder = buildPhaseOrder(scenarioNumber);

    // Describe the exact 12 questions (in their display order) for the LLM.
    const phaseSpec = phaseOrder
      .map((p, idx) => `  ${idx + 1}. id=${p.id} | phase=${p.phase} | phaseName="${p.phaseName}" | type=${p.type} | timeLimit≈${p.timeRange} | TASK: ${p.desc}`)
      .join('\n');

    const diversityPrompt = previousThemes.length > 0
      ? `\nCRITICAL DIVERSITY RULE: Do NOT use any of these previous themes or contexts: [${previousThemes.join(', ')}]. Pick a completely different industry, setting, or context to keep the user engaged.`
      : '';

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are a creative educational assessment designer for Pakistani university students (age 18-25).
You design real-world decision-making scenarios that reveal HOW students think — not what they know.
Every scenario must feel like something a real uni student in Pakistan could face TODAY.
Use names, places, and situations familiar to Pakistani culture (e.g., chai dhabas, semester exams, hostel life, family expectations, freelancing on Fiverr/Upwork, cricket matches, Daewoo bus trips).
Return ONLY valid JSON — no markdown, no backticks, no extra text.`,
        },
        {
          role: 'user',
          content: `Generate Scenario ${scenarioNumber} for a behavioral learning assessment.

FORMAT: ${randomFormat.format}
DESCRIPTION: ${randomFormat.prompt}
STORY SEED (use as loose inspiration, reinvent the specifics with fresh names/numbers): "${randomSeed}"

${difficultyPrompt}
${adaptiveContext}
${diversityPrompt}

TARGET AUDIENCE: Pakistani university students aged 18-25. Use relatable contexts — hostel life, group projects, family pressure, career decisions, social media, freelancing, campus politics, relationships, financial stress.

IMPORTANT RULES:
1. Create a SPECIFIC, vivid story with names, details, and emotional stakes.
2. ALL questions must reference THIS specific story — no generic questions.
3. The scenario should test decision-making ability, NOT academic knowledge.
4. Make it feel REAL, not like a textbook exercise.
5. Use Pakistani Rupees (Rs.) for any money amounts.
6. Include cultural nuances where relevant (family expectations, social pressure, izzat/reputation).
7. SHUFFLE STRUCTURAL DETAILS: invent fresh stakeholder names, resource values, deadlines and numbers every time — never reuse a template.
8. You may include a "timeLimit" per question, but it is optional — the server assigns fixed challenge timings by question type, so do not agonise over it.
9. "totalTimeLimit" is computed automatically by the server; you may omit it.

CRITICAL — QUESTION STRUCTURE (anti-predictability):
You MUST output EXACTLY 12 questions, in the EXACT order, ids, phases, phaseNames and types listed below.
This order is RANDOMISED for this session — honour it precisely so the experience is never repetitive:
${phaseSpec}

Type-specific requirements:
- type "text": include a helpful "hint". May include "context" describing an aftermath/situation.
- type "mcq": include exactly 4 plausible, scenario-specific "options" (no obvious throwaway answers).
- type "ranking": include exactly 3-4 plausible, scenario-specific "options" to be ranked.
- type "slider": must include "min", "max", and "unit" (e.g. "Rs.", "Days", "Hours") for budget/resource allocation.
- type "mcq-urgent": include "urgentUpdate" (a surprising twist/alert) and 4 options reacting to it.
- type "multi-text": ask for 3 distinct approaches; include a "hint". (The UI shows 3 input boxes.)
- type "vark": include exactly 4 options mapping directly to Visual, Auditory, Read-Write, and Kinesthetic learning preferences respectively. You MUST include a "varkMapping" array which contains exactly ["V", "A", "R", "K"] mapping to each of these options in their exact index order (e.g. if Option 1 is Visual, varkMapping[0] is 'V').
- type "mcq-urgent": include a vivid "urgentUpdate" (a sudden twist UNIQUE to this story, prefixed with 🚨) AND exactly 4 "options". Keep it tight and high-pressure. The twist must be freshly generated, never a stock template.
- type "reflection": timeLimit MUST be 0. Ask ONLY: "Looking back, what would you do differently and why?" (Do NOT ask the student to self-rate a confidence number — confidence is measured automatically.)

Return ONLY this JSON structure (questions array must follow the shuffled order above):
{
  "scenario": {
    "title": "[emoji] [Creative 4-6 word title]",
    "description": "[3-4 vivid sentences setting the scene. Make it feel urgent and personal.]",
    "context_details": "[Key facts: names, numbers, deadlines — bullet-point style]",
    "constraint": "[The core tension or impossible choice in one sentence]",
    "urgency": "[Why this can't wait — specific deadline or consequence]",
    "totalTimeLimit": [number of seconds]
  },
  "questions": [
    { "id": <n>, "phase": <cognitivePhaseNumber>, "phaseName": "<exact name>", "type": "<exact type>", "timeLimit": <seconds>, "question": "...", "hint": "...(text/multi-text)", "context": "...(optional, text only)", "options": ["...","...","...","..."], "varkMapping": ["V", "A", "R", "K"], "urgentUpdate": "🚨 ...(mcq-urgent only)" }
  ]
}`,
        },
      ],
      temperature: 0.92,
      max_tokens: 2500,
      response_format: { type: 'json_object' },
    });

    const data = JSON.parse(completion.choices[0].message.content);

    // Ensure totalTimeLimit is a number
    if (data.scenario && typeof data.scenario.totalTimeLimit === 'string') {
      data.scenario.totalTimeLimit = parseInt(data.scenario.totalTimeLimit) || 600;
    }

    // ── Normalise questions to the shuffled phase contract ──────────────────
    // Defends against LLM drift so the frontend always renders valid types/order.
    const allowedTypes = new Set(['text', 'mcq', 'mcq-urgent', 'multi-text', 'ranking', 'reflection', 'slider', 'vark']);
    if (Array.isArray(data.questions)) {
      data.questions = data.questions.slice(0, 12).map((q, i) => {

        const spec = phaseOrder[i] || phaseOrder[phaseOrder.length - 1];
        const type = allowedTypes.has(q.type) ? q.type : spec.type;
        return {
          ...q,
          id: i + 1,
          phase: q.phase || spec.phase,
          phaseName: q.phaseName || spec.phaseName,
          type,
          // Fixed per-type limit (ignore whatever the model returned) so timing
          // is a consistent challenge. Still recorded for behavioural metrics.
          timeLimit: TIME_BY_TYPE[type] ?? 40,
        };
      });
    }
    // Always derive a TIGHT overall limit from the fixed per-question times
    // (no fat buffer) so the scenario timer is a genuine challenge.
    if (data.scenario) {
      const sum = (data.questions || []).reduce((s, q) => s + (q.timeLimit || 0), 0);
      data.scenario.totalTimeLimit = Math.max(180, Math.round(sum / 30) * 30);
    }

    totalTokensUsed += completion.usage.total_tokens;
    const estimatedCost = (completion.usage.prompt_tokens * 0.00000015) + (completion.usage.completion_tokens * 0.0000006);

    console.log(
      `✅ S${scenarioNumber} | ${randomFormat.format} | seed:"${randomSeed.slice(0, 30)}…" | order:[${phaseOrder.map(p => p.phase).join('')}] | Lvl ${difficultyLevel} | ${difficultySignal || 'standard'} | ${completion.usage.total_tokens} tokens | ~$${estimatedCost.toFixed(4)}`
    );

    res.json({
      success: true,
      scenario: data.scenario,
      questions: data.questions,
      format: randomFormat.format,
      usage: { tokens: completion.usage.total_tokens, estimatedCost },
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to generate scenario', message: error.message });
  }
});

// ─── EVALUATE SCENARIO (Accuracy & Cognitive Features) ─────────────────────────
app.post('/api/evaluate-scenario', async (req, res) => {
  try {
    const { scenario, questions, answers } = req.body;

    console.log('📬 [API] Received scenario title:', scenario?.title);
    console.log('📬 [API] Received answers:', JSON.stringify(answers));

    // Fast-fail for empty or severely incomplete answers
    const answeredCount = Object.keys(answers || {}).filter(k => {
      const ans = answers[k];
      if (Array.isArray(ans)) return ans.length > 0;
      return ans && ans.trim().length > 0;
    }).length;

    console.log('📬 [API] Calculated answeredCount:', answeredCount);

    if (!answers || answeredCount < 2) {
      console.log('⚠️ Insufficient answers for evaluation. Using penalty defaults.');
      return res.json({
        success: true,
        evaluation: {
          accuracy_score: 0.1,
          cognitive_features: {
            reflection_depth: 0.1,
            self_awareness: 0.1,
            learning_orientation: 0.1,
            creativity_score: 0.1,
            insights: ['Student skipped most questions or provided empty answers.'],
          }
        },
        usage: { tokens: 0, estimatedCost: 0 },
      });
    }

    // Format the inputs cleanly for GPT
    const formattedQuestionsAndAnswers = questions.map(q => {
      let studentAnswer = answers[q.id];
      if (Array.isArray(studentAnswer)) studentAnswer = studentAnswer.join(' | ');
      if (!studentAnswer || studentAnswer.trim() === '') studentAnswer = '[NO ANSWER PROVIDED]';
      return `Q${q.id} (${q.type}): ${q.question}\nStudent Answer: ${studentAnswer}`;
    }).join('\n\n');

    const completion = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an expert behavioral assessor. You evaluate a student's performance on a decision-making scenario.
You will receive the scenario context, the questions asked, and the student's answers (which are mostly interactive choices like MCQs, sliders, and rankings, plus a final written reflection).

Score every field on a continuous 0.0–1.0 scale. DO NOT default to 0.5 — discriminate based on their actions and responses. Use the full range.

1. "accuracy_score": How pragmatic, logical and effective were their decisions given the scenario constraints (budget, time, relationships)?
   - 0.8-1.0: choices directly resolve the core tension and respect constraints.
   - 0.4-0.7: reasonable but partial or with notable trade-off blind spots.
   - 0.0-0.3: ignores constraints, contradictory, or off-topic.

2. "cognitive_features" — apply these EXPLICIT DECISION-BASED RUBRICS:
   - reflection_depth: Evaluate how carefully the student weighed options. Check their written answers (type: reflection/text) for causal reasoning and connectives (e.g. "because", "due to"). Assess if their interactive choices show a deliberate, balanced approach to complex tradeoffs. Deliberate decisions and structured written reflection -> >=0.75; superficial written reflection and impulsive/rushed choices -> <=0.3.
   - self_awareness: Evaluate if their choices (especially in crisis/urgent situations) show risk-awareness, caution, and a realization of role boundaries versus overconfident/reckless behavior. In the written reflection, check if they explicitly acknowledge mistakes, limits, or adjustments ("I should have", "my mistake"). High self-reflection and risk-aware choices -> >=0.75; reckless decisions and defensive/shallow reflection -> <=0.25.
   - learning_orientation: Check if they select choices that prioritize information-seeking, advice, or testing over blind assumptions. In the written reflection, check for an explicit desire or plan to improve next time. High learning-oriented choices and growth mindset -> >=0.75; passive, defensive, or assumption-heavy choices -> <=0.35.
   - creativity_score: Analyze if their decisions (such as budget slider allocations, risk-mitigation plans, and planning rankings) represent clever, resourceful, or unconventional solutions rather than standard, safe, or generic paths. High-ingenuity trade-offs -> >=0.75; generic, middle-of-the-road, or risk-averse choices -> <=0.4.

3. "insights": 2-3 brief, specific observations about their decision-making style (reference what they actually chose and wrote).

Gibberish, empty, or nonsensical answers -> assign very low scores (≤0.1) and say so in insights.
Return ONLY valid JSON.`
        },
        {
          role: 'user',
          content: `SCENARIO:
Title: ${scenario.title}
Description: ${scenario.description}
Constraint: ${scenario.constraint}

QUESTIONS & STUDENT ANSWERS:
${formattedQuestionsAndAnswers}

Return JSON format:
{
  "accuracy_score": 0.0-1.0,
  "cognitive_features": {
    "reflection_depth": 0.0-1.0,
    "self_awareness": 0.0-1.0,
    "learning_orientation": 0.0-1.0,
    "creativity_score": 0.0-1.0,
    "insights": ["obs 1", "obs 2"]
  }
}`
        }
      ],
      temperature: 0.3,
      max_tokens: 400,
      response_format: { type: 'json_object' },
    });

    const evaluation = JSON.parse(completion.choices[0].message.content);
    totalTokensUsed += completion.usage.total_tokens;
    const estimatedCost = (completion.usage.prompt_tokens * 0.00000015) + (completion.usage.completion_tokens * 0.0000006);

    // Extract vark score if vark questions exist
    let varkSummary = { V: 0, A: 0, R: 0, K: 0 };
    let varkCount = 0;
    
    questions.forEach(q => {
      if (q.type === 'vark' && q.varkMapping) {
        const studentAnswer = answers[q.id];
        const selectedIndex = (q.options || []).indexOf(studentAnswer);
        if (selectedIndex !== -1) {
          const mapping = q.varkMapping[selectedIndex];
          if (mapping && varkSummary[mapping] !== undefined) {
            varkSummary[mapping]++;
            varkCount++;
          }
        }
      }
    });

    const varkScores = {
      visual: varkCount > 0 ? varkSummary.V / varkCount : 0.25,
      auditory: varkCount > 0 ? varkSummary.A / varkCount : 0.25,
      readWrite: varkCount > 0 ? varkSummary.R / varkCount : 0.25,
      kinesthetic: varkCount > 0 ? varkSummary.K / varkCount : 0.25,
    };
    
    evaluation.vark = varkScores;

    console.log(`🧠 Evaluation | Acc: ${evaluation.accuracy_score} | VARK: V:${(varkScores.visual*100).toFixed(0)}% A:${(varkScores.auditory*100).toFixed(0)}% | ${completion.usage.total_tokens} tokens | ~$${estimatedCost.toFixed(4)}`);
    res.json({ success: true, evaluation, usage: { tokens: completion.usage.total_tokens, estimatedCost } });

  } catch (error) {
    console.error('❌ Evaluation error:', error.message);
    
    let varkSummary = { V: 0, A: 0, R: 0, K: 0 };
    let varkCount = 0;
    try {
      (questions || []).forEach(q => {
        if (q.type === 'vark' && q.varkMapping) {
          const studentAnswer = (answers || {})[q.id];
          const selectedIndex = (q.options || []).indexOf(studentAnswer);
          if (selectedIndex !== -1) {
            const mapping = q.varkMapping[selectedIndex];
            if (mapping && varkSummary[mapping] !== undefined) {
              varkSummary[mapping]++;
              varkCount++;
            }
          }
        }
      });
    } catch {}

    const varkScores = {
      visual: varkCount > 0 ? varkSummary.V / varkCount : 0.25,
      auditory: varkCount > 0 ? varkSummary.A / varkCount : 0.25,
      readWrite: varkCount > 0 ? varkSummary.R / varkCount : 0.25,
      kinesthetic: varkCount > 0 ? varkSummary.K / varkCount : 0.25,
    };

    res.json({
      success: true,
      evaluation: {
        accuracy_score: 0.3,
        cognitive_features: {
          reflection_depth: 0.3, self_awareness: 0.3,
          learning_orientation: 0.3, creativity_score: 0.3,
          insights: ['Analysis unavailable due to an error — default penalty applied'],
        },
        vark: varkScores
      },
      usage: { tokens: 0, estimatedCost: 0 },
    });
  }
});

// ─── STUDENT RECORDS DATABASE ENDPOINTS ──────────────────────────────────────
app.post('/api/records', async (req, res) => {
  if (!isDbConnected) {
    return res.status(503).json({ success: false, error: 'Database is currently offline' });
  }

  try {
    const recordData = req.body;
    const name = recordData.name || 'Anonymous';
    
    // Use logged-in user if available, otherwise auto-create/find by name (guest mode)
    let user = req.user;
    if (!user) {
      user = await prisma.user.findFirst({ where: { name: name } });
      if (!user) {
        user = await prisma.user.create({
          data: {
            name: name,
            email: `${name.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now()}@aita.edu`,
            passwordHash: hashPassword(crypto.randomBytes(16).toString('hex')),
            role: 'USER'
          }
        });
      }
    }

    // Save record linked to user
    const savedRecord = await prisma.record.create({
      data: {
        userId: user.id,
        scenariosCompleted: recordData.scenariosCompleted || 0,
        primaryCategory: recordData.primaryCategory,
        primaryName: recordData.primaryName,
        primaryEmoji: recordData.primaryEmoji,
        primaryConfidence: recordData.primaryConfidence || 0,
        secondaryCategory: recordData.secondaryCategory || null,
        secondaryName: recordData.secondaryName || null,
        confidence: recordData.confidence || 0,
        performanceScore: recordData.performanceScore || 0,
        avgPerformanceScore: recordData.avgPerformanceScore || 0,
        accuracyScore: recordData.accuracyScore || 0,
        avgResponseTime: recordData.avgResponseTime || 0,
        decisionStyle: recordData.decisionStyle || 'unknown',
        cognitive: recordData.cognitive || {},
        overall: recordData.overall || {},
        scenarioResults: recordData.scenarioResults || [],
        vark: recordData.vark || null
      }
    });

    // If there's a sessionId, link this record to the session membership
    if (recordData.sessionId && req.user) {
      try {
        await prisma.sessionMember.updateMany({
          where: {
            sessionId: recordData.sessionId,
            userId: req.user.id
          },
          data: { recordId: savedRecord.id }
        });
      } catch (linkErr) {
        console.warn('⚠️ Could not link record to session:', linkErr.message);
      }
    }

    res.json({ success: true, id: savedRecord.id });
  } catch (error) {
    console.error('❌ Failed to save record:', error.message);
    res.status(500).json({ success: false, error: 'Failed to save record', message: error.message });
  }
});

app.get('/api/records', async (req, res) => {
  if (!isDbConnected) {
    return res.status(503).json({ success: false, error: 'Database is currently offline' });
  }

  try {
    const records = await prisma.record.findMany({
      include: {
        user: true
      },
      orderBy: {
        date: 'desc'
      }
    });
    res.json(records);
  } catch (error) {
    console.error('❌ Failed to fetch records:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch records' });
  }
});

app.get('/api/records/student/:name', async (req, res) => {
  if (!isDbConnected) {
    return res.status(503).json({ success: false, error: 'Database is currently offline' });
  }

  try {
    const { name } = req.params;
    const records = await prisma.record.findMany({
      where: {
        user: {
          name: {
            equals: name,
            mode: 'insensitive'
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    });
    res.json(records);
  } catch (error) {
    console.error(`❌ Failed to fetch records for student ${req.params.name}:`, error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch records' });
  }
});

// ─── HEALTH CHECK ────────────────────────────────────────────────────────────

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    model: MODEL,
    totalTokensUsed,
    scenarioFormats: scenarioFormats.map(f => f.format),
    cognitivePhases: COGNITIVE_PHASES.map(p => p.phaseName),
    scenarioSeeds: SCENARIO_SEEDS.length,
    features: [
      'gpt-4o-mini',
      `${scenarioFormats.length}-scenario-formats`,
      '7-cognitive-phases',
      'shuffled-question-order',
      `${SCENARIO_SEEDS.length}-localised-seeds`,
      'rubric-based-evaluation',
      'difficulty-1-10',
      'adaptive',
      'age-18-25',
    ],
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AITA Server on http://localhost:${PORT}`);
  console.log(`🤖 Model: ${MODEL}`);
  console.log(`🎲 ${scenarioFormats.length} scenario formats: ${scenarioFormats.map(f => f.format).join(', ')}`);
  console.log(`🧩 7 cognitive phases (shuffled per session) | 📚 ${SCENARIO_SEEDS.length} localised seeds`);
  console.log(`🔑 API key: ${process.env.OPENAI_API_KEY ? '✅' : '❌ MISSING'}`);
});
