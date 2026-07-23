require('dotenv').config();
const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const OpenAI = require('openai');
const { PrismaClient } = require('@prisma/client');

const app = express();
const PORT = process.env.PORT || 3000;

const OPENROUTER_MODEL = 'openrouter/auto';
const OPENAI_MODEL = 'gpt-4o-mini';

const openrouterClient = process.env.OPENROUTER_API_KEY
  ? new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: process.env.OPENROUTER_API_KEY,
      defaultHeaders: {
        'HTTP-Referer': 'https://aita-platform.local',
        'X-Title': 'AITA Platform',
      }
    })
  : null;

const openaiClient = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// ─── HIGH-PRECISION ENGINE: Primary = OpenAI (gpt-4o-mini), Fallback = OpenRouter
// Powers Exam Generation, Scenario Generation, Paper Parsing, & Cognitive Auto-Grading
async function callHighPrecisionAI(params) {
  if (openaiClient) {
    try {
      return await openaiClient.chat.completions.create({
        ...params,
        model: OPENAI_MODEL,
      });
    } catch (err) {
      console.warn(`⚠️ Primary OpenAI (${OPENAI_MODEL}) failed: ${err.message}. Trying OpenRouter fallback...`);
    }
  }

  if (openrouterClient) {
    return await openrouterClient.chat.completions.create({
      ...params,
      model: OPENROUTER_MODEL,
    });
  }

  throw new Error('No working AI API key available for high-precision tasks');
}

// ─── CHATBOT ENGINE: Primary = OpenRouter Free Tier ($0 cost), Fallback = OpenAI
async function callChatbotAI(params) {
  if (openrouterClient) {
    try {
      return await openrouterClient.chat.completions.create({
        ...params,
        model: OPENROUTER_MODEL,
      });
    } catch (err) {
      console.warn(`⚠️ Primary OpenRouter (${OPENROUTER_MODEL}) failed: ${err.message}. Falling back to OpenAI (${OPENAI_MODEL})...`);
    }
  }

  if (openaiClient) {
    return await openaiClient.chat.completions.create({
      ...params,
      model: OPENAI_MODEL,
    });
  }

  throw new Error('No working AI API key available for Chatbot');
}

const MODEL = OPENAI_MODEL;
const openai = { chat: { completions: { create: callHighPrecisionAI } } };

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

// Sessions are NEVER hard-deleted server-side. "Deleting" a session is a per-user,
// client-side hide (see src/utils/userHiddenItems.ts): it disappears only from that
// user's dashboard while the row — and every participant's result — is retained in
// the DB for the host and analytics. This endpoint is intentionally a no-op so the
// "nothing is ever deleted from the database" guarantee holds even if it is called.
app.delete('/api/sessions/:id', requireAuth, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    // Deliberately do NOT delete. Removal is a client-side per-user hide only.
    console.log(`ℹ️ Hard-delete disabled for session ${session.code} — soft-delete (client hide) only.`);
    res.json({ success: true, softDeleteOnly: true });
  } catch (error) {
    console.error('❌ Session delete (no-op) error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to process request' });
  }
});

// ─── SESSION ASSESSMENT (host-authored paper every participant takes) ─────────

// Remove answer keys from a stored session assessment before sending to a client
// (participants must never see correct answers before submitting). AI-scenario
// questions have no answer key, so they pass through unchanged.
function stripSessionAssessment(assessment) {
  if (!assessment) return null;
  if (assessment.kind === 'custom-exam' && assessment.exam) {
    return {
      kind: 'custom-exam',
      exam: {
        examTitle: assessment.exam.examTitle,
        totalMarks: assessment.exam.totalMarks,
        questions: (assessment.exam.questions || []).map(q => ({
          id: q.id,
          type: q.type,
          marks: q.marks,
          question: q.question,
          options: q.options || [],
        })),
      },
    };
  }
  if (assessment.kind === 'ai-scenario') {
    return { kind: 'ai-scenario', scenario: assessment.scenario, questions: assessment.questions };
  }
  return null;
}

// Host creates (or replaces) the single assessment every participant will take.
app.post('/api/sessions/:id/assessment', requireAuth, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({ where: { id: req.params.id } });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    if (session.hostId !== req.user.id) {
      return res.status(403).json({ success: false, error: 'Only the host can set the assessment' });
    }

    const { kind } = req.body;
    let assessment = null;

    if (kind === 'custom-exam') {
      // Resolve the FULL exam (with answer key): from the server-side exam store
      // (AI-generated / parsed) or from an inline manually-authored exam.
      const { examId, exam: inlineExam } = req.body;
      let fullExam = null;
      if (examId && examStore.has(examId)) {
        fullExam = examStore.get(examId).exam;
      } else if (inlineExam && Array.isArray(inlineExam.questions)) {
        fullExam = {
          examTitle: inlineExam.examTitle || session.title,
          questions: normalizeExamQuestions(inlineExam.questions, { reorder: false }),
          totalMarks: 0,
        };
      }
      if (!fullExam || !fullExam.questions || fullExam.questions.length === 0) {
        return res.status(400).json({ success: false, error: 'No valid exam was provided to attach.' });
      }
      fullExam.totalMarks = fullExam.questions.reduce((s, q) => s + q.marks, 0);
      assessment = { kind: 'custom-exam', exam: fullExam, createdAt: new Date().toISOString() };
    } else if (kind === 'ai-scenario') {
      const { scenario, questions, difficultyLevel } = req.body;
      if (!scenario || !Array.isArray(questions) || questions.length === 0) {
        return res.status(400).json({ success: false, error: 'A generated scenario with questions is required.' });
      }
      assessment = { kind: 'ai-scenario', scenario, questions, difficultyLevel: difficultyLevel || 5, createdAt: new Date().toISOString() };
    } else {
      return res.status(400).json({ success: false, error: 'Unknown assessment kind.' });
    }

    await prisma.session.update({ where: { id: session.id }, data: { assessment } });
    console.log(`📝 Session ${session.code} assessment set (${kind}) by ${req.user.name}`);
    res.json({ success: true, kind, assessment: stripSessionAssessment(assessment) });
  } catch (error) {
    console.error('❌ Set session assessment error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to save the session assessment' });
  }
});

// Host OR a joined member fetches the (answer-key-stripped) assessment to take or
// preview. 404 while the host hasn't created it yet (participants "wait").
app.get('/api/sessions/:id/assessment', requireAuth, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: { members: { select: { userId: true } } },
    });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    const isHost = session.hostId === req.user.id;
    const isMember = session.members.some(m => m.userId === req.user.id);
    if (!isHost && !isMember) {
      return res.status(403).json({ success: false, error: 'You are not part of this session' });
    }
    if (!session.assessment) {
      return res.status(404).json({ success: false, error: 'No assessment has been created for this session yet.' });
    }
    res.json({ success: true, assessment: stripSessionAssessment(session.assessment) });
  } catch (error) {
    console.error('❌ Get session assessment error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load the session assessment' });
  }
});

// Role-aware session view for host AND members: status, whether an assessment
// exists, the caller's own progress, and (host only) the full participant list.
app.get('/api/sessions/:id/view', requireAuth, async (req, res) => {
  try {
    const session = await prisma.session.findUnique({
      where: { id: req.params.id },
      include: {
        host: { select: { id: true, name: true } },
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!session) {
      return res.status(404).json({ success: false, error: 'Session not found' });
    }
    const isHost = session.hostId === req.user.id;
    const myMembership = session.members.find(m => m.userId === req.user.id);
    if (!isHost && !myMembership) {
      return res.status(403).json({ success: false, error: 'You are not part of this session' });
    }

    const payload = {
      success: true,
      isHost,
      hasAssessment: !!session.assessment,
      assessmentKind: session.assessment ? session.assessment.kind : null,
      session: {
        id: session.id,
        code: session.code,
        title: session.title,
        isActive: session.isActive,
        createdAt: session.createdAt,
        host: session.host,
      },
      me: {
        joined: !!myMembership,
        completed: !!(myMembership && myMembership.recordId),
        recordId: myMembership ? myMembership.recordId : null,
        record: null,
      },
    };

    // Include the caller's OWN record so a participant can re-view their result
    // (participants only ever see their own, never the whole session).
    if (myMembership && myMembership.recordId) {
      payload.me.record = await prisma.record.findUnique({ where: { id: myMembership.recordId } });
    }

    if (isHost) {
      const memberRecordIds = session.members.filter(m => m.recordId).map(m => m.recordId);
      const records = await prisma.record.findMany({
        where: { id: { in: memberRecordIds } },
        include: { user: { select: { id: true, name: true } } },
      });
      const recordMap = {};
      records.forEach(r => { recordMap[r.id] = r; });
      payload.members = session.members.map(m => ({
        id: m.id,
        user: m.user,
        joinedAt: m.joinedAt,
        recordId: m.recordId,
        record: m.recordId ? recordMap[m.recordId] || null : null,
        status: m.recordId ? 'completed' : 'in-progress',
      }));
    }

    res.json(payload);
  } catch (error) {
    console.error('❌ Session view error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to load session' });
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
// Scenario 1 & 2: 12 Interactive questions (mcq, ranking, slider, mcq-urgent).
// Scenario 3: 9 interactive, 3 text/reflection.

const INTERACTIVE_TYPES = [
  { phaseName: 'Information Filtering', type: 'mcq', desc: 'Decide which piece of data/file/resource/person to trust MOST before acting.', timeRange: '30-60s' },
  { phaseName: 'Planning', type: 'ranking', desc: 'Rank these 3-4 strategies from most effective to least effective for THIS situation.', timeRange: '45-90s' },
  { phaseName: 'Risk Mitigation', type: 'mcq', desc: 'Identify the biggest failure point or the smartest Plan B for this story.', timeRange: '40-70s' },
  { phaseName: 'Resource Allocation', type: 'slider', desc: 'Distribute a limited budget, time, or personnel across 2-4 competing priorities. (Output slider min/max/unit)', timeRange: '60-120s' },
  { phaseName: 'Execution Twist', type: 'mcq-urgent', desc: 'React under pressure to a SUDDEN change/crisis unique to this story.', timeRange: '20-40s' },
  { phaseName: 'Ethical Dilemma', type: 'mcq', desc: 'Make a tough choice between doing the right thing vs the popular/easy thing.', timeRange: '40-70s' }
];

const TEXT_TYPES = [
  { phaseName: 'Understanding', type: 'text', desc: 'Identify the CORE tension / underlying problem in this specific story.', timeRange: '60s' },
  { phaseName: 'Collaboration', type: 'text', desc: 'Write exactly what you would say to persuade, delegate, or manage a specific person in the story.', timeRange: '60s' },
  { phaseName: 'Reflection', type: 'reflection', desc: 'Hindsight, calibration and honest self-grading.', timeRange: '0 (unlimited)' }
];

const COGNITIVE_PHASES = [...INTERACTIVE_TYPES, ...TEXT_TYPES];

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

// ─── FIXED 15-QUESTION BLUEPRINT (General AI Scenario) ────────────────────────
// The STRUCTURE is fixed (parallel-forms psychometrics); only the story/content
// is randomised per run. This keeps timeVariance comparable across runs and —
// crucially — implements the 3-tier transfer spine (L1 direct → L2 near → L3 far)
// that separates a true Fast Learner from a Superficial Mimic.
//   level : 0 = supporting/cognitive, 1/2/3 = transfer tier, 'R' = late re-probe.
//   scored: whether the item carries a correctness answerKey.
const SCENARIO_BLUEPRINT = [
  { phaseName: 'Understanding',           type: 'text',       level: 0,   scored: false, desc: 'Identify the CORE tension / underlying problem in this specific story.', timeRange: '60s' },
  { phaseName: 'Information Filtering',    type: 'mcq',        level: 1,   scored: true,  desc: 'LEVEL 1 (DIRECT): apply the hidden LOGIC_RULE directly — which data/person/resource to trust MOST.', timeRange: '40s' },
  { phaseName: 'Planning',                type: 'ranking',    level: 1,   scored: true,  desc: 'LEVEL 1 (DIRECT): rank 3-4 strategies by how well they follow the LOGIC_RULE in the main story.', timeRange: '60s' },
  { phaseName: 'Risk Mitigation',         type: 'mcq',        level: 2,   scored: true,  desc: 'LEVEL 2 (NEAR TRANSFER): SAME LOGIC_RULE, brand-new sub-context/characters — pick the smartest safeguard.', timeRange: '40s' },
  { phaseName: 'Resource Allocation',     type: 'slider',     level: 2,   scored: true,  desc: 'LEVEL 2 (NEAR TRANSFER): apply the SAME rule to a re-skinned allocation problem. (Output slider min/max/unit.)', timeRange: '45s' },
  { phaseName: 'Execution Twist',         type: 'mcq-urgent', level: 3,   scored: true,  desc: 'LEVEL 3 (FAR TRANSFER): SAME rule + a SUDDEN hidden variable/crisis that changes what the rule implies.', timeRange: '30s' },
  { phaseName: 'Complex Dilemma',         type: 'mcq',        level: 3,   scored: true,  desc: 'LEVEL 3 (FAR TRANSFER): the rule under noise + a misleading option — naive pattern-matching must FAIL here.', timeRange: '50s' },
  { phaseName: 'Information Seeking',      type: 'mcq',        level: 0,   scored: false, desc: 'ORIENTATION: one option must be to gather more data / test / ask a mentor, vs. guessing or assuming.', timeRange: '40s' },
  { phaseName: 'Three Approaches',        type: 'multi-text', level: 0,   scored: false, desc: 'CREATIVITY: ask for 3 DISTINCT approaches to a knotty part of the story; include a "hint". (UI shows 3 boxes.)', timeRange: '90s' },
  { phaseName: 'Resourceful Constraint',  type: 'slider',     level: 0,   scored: true,  desc: 'CREATIVITY under scarcity: allocate a very tight resource cleverly. (Output slider min/max/unit.)', timeRange: '45s' },
  { phaseName: 'Collaboration',           type: 'text',       level: 0,   scored: false, desc: 'Write exactly what you would say to persuade, delegate, or manage a specific person in the story.', timeRange: '60s' },
  { phaseName: 'Ethical Dilemma',         type: 'mcq',        level: 0,   scored: true,  desc: 'A tough choice between the right thing vs the popular/easy thing, specific to this story.', timeRange: '40s' },
  { phaseName: 'Information Filtering II', type: 'mcq',        level: 'R', scored: true,  desc: 'CONSISTENCY RE-PROBE: another trust/priority judgement (like the Level-1 item) LATE in the test to measure pacing & focus drift.', timeRange: '40s' },
  { phaseName: 'Risk Recognition',        type: 'text',       level: 0,   scored: false, desc: 'SELF-AWARENESS: which of your own earlier decisions was riskiest, and why?', timeRange: '60s' },
  { phaseName: 'Reflection',              type: 'reflection', level: 0,   scored: false, desc: 'Hindsight & calibration. Ask ONLY: "Looking back, what would you do differently and why?"', timeRange: '0 (unlimited)' },
];

// Build the fixed 15-question phase order. The skeleton is deterministic; only
// the scenario CONTENT varies per run. `scenarioNumber` is kept for signature
// compatibility but no longer alters the structure.
function buildPhaseOrder(scenarioNumber) {
  return SCENARIO_BLUEPRINT.map((item, index) => ({
    id: index + 1,
    phase: index + 1,
    ...item,
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

// ─── DYNAMIC ASSESSMENT ENDPOINTS ────────────────────────────────────────────
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const officeParser = require('officeparser');
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } }); // 15MB max

// Below this many characters of extracted text, treat the page/slide as image-only
// (scanned PDF, slide screenshots, etc.) and retry extraction with OCR.
const MIN_USABLE_TEXT_LENGTH = 40;

// Extensions officeparser can be told about explicitly (bypasses its magic-byte
// sniffing, which can misidentify a PPTX/DOCX — both are zip containers — as a
// plain "zip" file when the exporter didn't lay out the archive the way the
// sniffer expects).
const OFFICEPARSER_FILE_TYPES = new Set(['docx', 'pptx', 'xlsx', 'odt', 'odp', 'ods', 'pdf', 'rtf', 'md', 'html', 'csv', 'epub']);

function officeParserFileTypeHint(filename) {
  const ext = filename.slice(filename.lastIndexOf('.') + 1);
  return OFFICEPARSER_FILE_TYPES.has(ext) ? ext : undefined;
}

// Unified extractor for PPTX/DOCX/PDF via officeparser's AST parser.
// ocr:true rasterizes each page/slide and runs Tesseract OCR on it — much slower,
// so it's only used as a fallback when the fast text-layer extraction comes up empty.
async function extractWithOfficeParser(buffer, { ocr, fileType } = {}) {
  try {
    const ast = await officeParser.parseOffice(buffer, { ocr: !!ocr, fileType: fileType || null });
    return {
      text: ast ? ast.toText() : '',
      pageCount: ast && Array.isArray(ast.content) && ast.content.length > 0 ? ast.content.length : 1,
    };
  } catch (err) {
    console.warn('⚠️ officeParser error:', err.message || err);
    return { text: '', pageCount: 1 };
  }
}

// OCR text extractor using OpenAI Vision for raw images (PNG, JPG, WEBP)
async function extractImageTextWithVision(buffer, mimeType = 'image/png') {
  try {
    const base64 = buffer.toString('base64');
    const dataUrl = `data:${mimeType};base64,${base64}`;
    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: 'Transcribe all text from this exam paper or study document accurately. Retain all question headers, numbers, options, marks, time limits, and answer keys.' },
            { type: 'image_url', image_url: { url: dataUrl } }
          ]
        }
      ],
      max_tokens: 4000,
    });
    return response.choices[0]?.message?.content || '';
  } catch (err) {
    console.warn('⚠️ Vision OCR failed:', err.message);
    return '';
  }
}

// Extract text from a single uploaded file buffer (PDF/PPTX/DOCX/TXT/PNG/JPG/WEBP), with
// Vision AI OCR fallback for images and scanned pages. Returns { text, pageCount }.
async function extractDocumentText(originalname, buffer) {
  const filename = (originalname || '').toLowerCase();

  if (filename.endsWith('.txt')) {
    return { text: buffer.toString('utf8'), pageCount: 1 };
  }

  // Direct raw image support (camera photos, PNG/JPG scans, phone camera shots)
  if (/\.(png|jpe?g|webp|gif|bmp)$/i.test(filename)) {
    const ext = filename.slice(filename.lastIndexOf('.') + 1).toLowerCase();
    const mimeMap = { png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', bmp: 'image/bmp', gif: 'image/gif' };
    const text = await extractImageTextWithVision(buffer, mimeMap[ext] || 'image/png');
    return { text, pageCount: 1 };
  }

  if (filename.endsWith('.pdf')) {
    // Fast path: read the PDF's embedded text layer directly (no rendering/OCR).
    let extractedText = '';
    let pageCount = 1;
    let parser;
    try {
      parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      extractedText = data.text || '';
      pageCount = data.total || 1;
    } catch (err) {
      console.warn('⚠️ pdf-parse failed, will retry with OCR:', err.message);
    } finally {
      if (parser) await parser.destroy();
    }

    // Fallback for scanned/image-only PDFs: re-extract with OCR.
    if (extractedText.trim().length < MIN_USABLE_TEXT_LENGTH) {
      const ocrResult = await extractWithOfficeParser(buffer, { ocr: true, fileType: 'pdf' });
      extractedText = ocrResult.text;
      pageCount = ocrResult.pageCount;
    }
    return { text: extractedText, pageCount };
  }

  // PPTX/PPT/DOCX: try the fast text-layer path first.
  const fileType = officeParserFileTypeHint(filename);
  const result = await extractWithOfficeParser(buffer, { ocr: false, fileType });

  // Fallback for slides/pages that are just embedded images (screenshots, scans).
  if (result.text.trim().length < MIN_USABLE_TEXT_LENGTH) {
    return extractWithOfficeParser(buffer, { ocr: true, fileType });
  }
  return result;
}

// Upload one OR MORE documents (PDF, PPTX Slides, DOCX, TXT) → Extract text
// locally ($0 cost) and concatenate. Accepts multiple files under the "pdf" field.
app.post('/api/upload-pdf', upload.array('pdf', 10), async (req, res) => {
  try {
    const files = req.files || [];
    if (files.length === 0) {
      return res.status(400).json({ success: false, error: 'No document file uploaded' });
    }

    const parts = [];
    let totalPageCount = 0;
    const failed = [];

    for (const file of files) {
      try {
        const { text, pageCount } = await extractDocumentText(file.originalname, file.buffer);
        if (text && text.trim().length > 0) {
          // Label each document so the AI can tell multi-file material apart.
          const header = files.length > 1 ? `\n\n===== SOURCE: ${file.originalname} =====\n\n` : '';
          parts.push(header + text.trim());
          totalPageCount += pageCount || 1;
        } else {
          failed.push(file.originalname);
        }
      } catch (err) {
        console.warn(`⚠️ Failed to extract "${file.originalname}":`, err.message);
        failed.push(file.originalname);
      }
    }

    const combinedText = parts.join('\n\n');
    if (!combinedText || combinedText.trim().length === 0) {
      return res.status(422).json({
        success: false,
        error: '🤖 AITA AI Assistant: No readable text detected in the uploaded file(s). If a photo is blurry or dim, use CamScanner or Adobe Scan for a sharp shot, or upload a digital PDF, DOCX, PPTX, or TXT file.',
      });
    }

    res.json({
      success: true,
      text: combinedText,
      pageCount: totalPageCount || 1,
      fileCount: parts.length,
      failedFiles: failed,
    });
  } catch (err) {
    console.error('Document parse error:', err.message);
    res.status(422).json({
      success: false,
      error: '🤖 AITA AI Assistant: Unable to process these files. If a picture is blurry or dim, try capturing it with CamScanner for a crisp shot, or upload a digital PDF/Word document.',
    });
  }
});

// ─── EXAM STORE (leak-free grading) ───────────────────────────────────────────
// Full exams (WITH answer key) are kept server-side, keyed by examId. The client
// only ever receives a stripped copy, so the correct answers cannot be read
// before the student submits.
const examStore = new Map();
const EXAM_STORE_MAX = 500;

function storeExam(fullExam) {
  const examId = crypto.randomUUID();
  if (examStore.size >= EXAM_STORE_MAX) {
    const oldest = examStore.keys().next().value; // Map preserves insertion order
    examStore.delete(oldest);
  }
  examStore.set(examId, { exam: fullExam, createdAt: Date.now() });
  return examId;
}

// Question types and their default marks. 'short' and 'long' are both written
// answers graded by AI; 'long' expects a fuller, multi-point response.
const DEFAULT_MARKS = { mcq: 1, short: 3, long: 6 };
const WRITTEN_TYPES = new Set(['short', 'long']);
const TYPE_ORDER = { mcq: 0, short: 1, long: 2 }; // display grouping order

// Normalize raw AI/parser question objects into a consistent, validated shape.
// - reorder=true  → group by type (MCQ → short → long) and renumber ids 1..N.
//   Used at generation/parse time (no student answers exist yet, so it's safe).
// - reorder=false → preserve each question's original id and order. Used for
//   inline grading of manually-authored exams, where answers are already keyed
//   by the client's ids and must not be remapped.
function normalizeExamQuestions(rawQuestions, { reorder = false } = {}) {
  if (!Array.isArray(rawQuestions)) return [];

  let items = rawQuestions
    .map((q) => {
      const type = WRITTEN_TYPES.has(q.type) ? q.type : 'mcq';
      const marks = Math.max(1, parseInt(q.marks, 10) || DEFAULT_MARKS[type]);
      const question = String(q.question || '').trim();
      const origId = q.id;
      if (WRITTEN_TYPES.has(type)) {
        return {
          origId,
          type,
          marks,
          question,
          options: [],
          keyPoints: Array.isArray(q.keyPoints) ? q.keyPoints.map(String) : [],
          explanation: q.explanation ? String(q.explanation) : '',
        };
      }
      return {
        origId,
        type: 'mcq',
        marks,
        question,
        options: Array.isArray(q.options) ? q.options.map(String) : [],
        correctAnswer: (q.correctAnswer || '').toString().trim().charAt(0).toUpperCase(),
        explanation: q.explanation ? String(q.explanation) : '',
      };
    })
    .filter(q => q.question.length > 0 && (q.type !== 'mcq' || q.options.length >= 2));

  if (reorder) {
    // Stable sort by type group (keeps generation order within each group).
    items = items
      .map((q, i) => ({ q, i }))
      .sort((a, b) => (TYPE_ORDER[a.q.type] - TYPE_ORDER[b.q.type]) || (a.i - b.i))
      .map(x => x.q);
  }

  return items.map((q, i) => {
    const { origId, ...rest } = q;
    return { id: reorder ? i + 1 : (origId != null ? origId : i + 1), ...rest };
  });
}

// Strip answer-key fields before sending an exam to the client.
function stripExamForClient(fullExam, examId) {
  return {
    examId,
    examTitle: fullExam.examTitle,
    totalMarks: fullExam.totalMarks,
    questions: fullExam.questions.map(q => ({
      id: q.id,
      type: q.type,
      marks: q.marks,
      question: q.question,
      options: q.options || [],
      // Preserve the profiling-probe flag so the client can render/exclude it.
      ...(q.probe ? { probe: true } : {}),
    })),
  };
}

// ─── COGNITIVE PROFILING PROBES ───────────────────────────────────────────────
// Marks-free written questions appended to every stored exam so the four cognitive
// features can always be measured by the AI grader, even for a pure-MCQ paper.
// Mirrored client-side in src/utils/cognitiveProbes.ts — keep the two in sync.
const COGNITIVE_PROBES = [
  { type: 'long', marks: 0, probe: true, options: [], question: 'Reflection: Looking back over this exam, which question challenged you the most and how did you work through it? What would you do differently next time?' },
  { type: 'short', marks: 0, probe: true, options: [], question: 'When you were unsure of an answer, what did you actually do — guess, eliminate options, reason it out, or something else? How do you usually close a gap in your knowledge?' },
  { type: 'short', marks: 0, probe: true, options: [], question: 'Pick one idea from this exam and explain how you would teach it to a friend in a clear, memorable way.' },
];

// Append probes AFTER the real questions (idempotent). Probes carry marks:0 so
// they never affect totalMarks or the score.
function appendCognitiveProbes(questions) {
  if (questions.some(q => q.probe)) return questions;
  const maxId = questions.reduce((m, q) => Math.max(m, q.id || 0), 0);
  const probes = COGNITIVE_PROBES.map((p, i) => ({ ...p, id: maxId + 1 + i }));
  return [...questions, ...probes];
}

const DIFFICULTY_INSTRUCTIONS = {
  easy: 'Focus 80% on direct recall, definitions, and basic facts. 20% on simple application. Questions should test surface-level understanding.',
  normal: 'Balance 50% core concept questions with 50% application/scenario-based questions. Test both understanding and ability to apply knowledge.',
  hard: 'Focus 20% on foundational constraints and 80% on critical analysis, multi-step reasoning, edge cases, and synthesis across topics. Questions should challenge deep understanding.',
};

const MAX_TOTAL_QUESTIONS = 40;

// Per-type instructions injected into the single-type generation prompt.
const TYPE_SPEC = {
  mcq: (marks) => `type "mcq": each with exactly 4 options labeled "A) ...","B) ...","C) ...","D) ...", a "correctAnswer" letter (A/B/C/D), a brief "explanation", marks = ${marks}.`,
  short: (marks) => `type "short": NO options, marks = ${marks}, a concise prompt answerable in 2-3 sentences, plus 2-3 "keyPoints" (the ideal answer's key points, used for grading).`,
  long: (marks) => `type "long": NO options, marks = ${marks}, an open-ended question needing an extended, multi-point explanation, plus 4-6 "keyPoints" — the distinct valid points a full-mark answer must cover.`,
};

// Generate exactly `count` questions of a single type. Because gpt-4o-mini can
// under-deliver on large single-batch requests, we retry (with an avoid-list to
// prevent duplicates) until we hit the count or run out of attempts. Returns
// { questions, tokens }. Generating one type per call keeps the model on-count.
async function generateQuestionsForType(materialText, type, count, difficulty, marksOverride) {
  if (count < 1) return { questions: [], tokens: 0 };
  const marks = Number.isFinite(marksOverride) ? marksOverride : DEFAULT_MARKS[type];
  const collected = [];
  let tokens = 0;

  for (let attempt = 0; attempt < 3 && collected.length < count; attempt++) {
    const need = count - collected.length;
    const avoid = collected.map(q => q.question);
    const avoidNote = avoid.length
      ? `\nDo NOT repeat or paraphrase any of these already-created questions:\n- ${avoid.join('\n- ')}`
      : '';

    const prompt = `You are an expert exam generator. Based ONLY on the study material below, generate EXACTLY ${need} question(s), all of ${TYPE_SPEC[type](marks)}
Produce the full count of ${need}. Every question must be derived from the material and be distinct from the others.

DIFFICULTY LEVEL: ${String(difficulty).toUpperCase()}
${DIFFICULTY_INSTRUCTIONS[difficulty] || DIFFICULTY_INSTRUCTIONS.normal}${avoidNote}

Respond ONLY with valid JSON: { "questions": [ { "type": "${type}", "marks": ${marks}, "question": "…", ${type === 'mcq' ? '"options": ["A) …","B) …","C) …","D) …"], "correctAnswer": "A", "explanation": "…"' : '"keyPoints": ["point 1","point 2"]'} } ] }

STUDY MATERIAL:
${materialText.substring(0, 12000)}`;

    const resp = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: Math.min(16000, 600 + need * 300),
      response_format: { type: 'json_object' },
    });
    tokens += resp.usage?.total_tokens || 0;

    let got = [];
    try {
      const raw = JSON.parse(resp.choices[0]?.message?.content || '{}');
      got = Array.isArray(raw.questions) ? raw.questions : [];
    } catch { got = []; }

    for (const q of got) {
      const text = String(q.question || '').trim();
      if (!text) continue;
      const dup = collected.some(c => c.question.trim().toLowerCase() === text.toLowerCase());
      if (!dup) collected.push({ ...q, type, marks }); // force teacher-set marks
    }

    if (got.length === 0) break; // model produced nothing usable — stop retrying
  }

  return { questions: collected.slice(0, count), tokens };
}

// Generate exam from material text using AI — supports a mix of MCQ + short +
// long questions. Each type is generated in its own call (and retried to hit the
// requested count), then all are grouped MCQ → short → long and renumbered.
app.post('/api/generate-exam', async (req, res) => {
  try {
    let { materialText, mcqCount, shortCount, longCount, questionCount, difficulty = 'normal',
          mcqMarks, shortMarks, longMarks, manualQuestions } = req.body;

    // Backward-compat: an old client sending only questionCount → treat as all MCQ.
    mcqCount = Number.isFinite(mcqCount) ? mcqCount : (Number.isFinite(questionCount) ? questionCount : 10);
    shortCount = Number.isFinite(shortCount) ? shortCount : 0;
    longCount = Number.isFinite(longCount) ? longCount : 0;
    mcqCount = Math.max(0, Math.min(MAX_TOTAL_QUESTIONS, Math.round(mcqCount)));
    shortCount = Math.max(0, Math.min(MAX_TOTAL_QUESTIONS, Math.round(shortCount)));
    longCount = Math.max(0, Math.min(MAX_TOTAL_QUESTIONS, Math.round(longCount)));

    // Editable per-type marks (clamped; default to the standard values).
    const clampMarks = (v, d) => (Number.isFinite(v) ? Math.max(1, Math.min(20, Math.round(v))) : d);
    const mMarks = clampMarks(mcqMarks, DEFAULT_MARKS.mcq);
    const sMarks = clampMarks(shortMarks, DEFAULT_MARKS.short);
    const lMarks = clampMarks(longMarks, DEFAULT_MARKS.long);

    // Teacher's own hand-written questions (full, with answer keys). Marks already
    // set client-side per type, but re-clamped here for safety.
    const manual = Array.isArray(manualQuestions)
      ? normalizeExamQuestions(manualQuestions, { reorder: false }).map(q => ({
          ...q,
          marks: q.type === 'mcq' ? mMarks : q.type === 'long' ? lMarks : sMarks,
        }))
      : [];

    const totalRequested = mcqCount + shortCount + longCount;
    if (totalRequested + manual.length < 1) {
      return res.status(400).json({ success: false, error: 'Please add at least one question.' });
    }
    if (totalRequested > MAX_TOTAL_QUESTIONS) {
      return res.status(400).json({ success: false, error: `Please request at most ${MAX_TOTAL_QUESTIONS} AI questions in total.` });
    }
    // Material is only required when the AI must generate questions.
    if (totalRequested > 0 && (!materialText || materialText.trim().length < 20)) {
      return res.status(400).json({ success: false, error: 'Please provide study material text (at least 20 characters).' });
    }

    // Generate all three types concurrently, each guaranteed to its count.
    const [mcqRes, shortRes, longRes] = await Promise.all([
      generateQuestionsForType(materialText, 'mcq', mcqCount, difficulty, mMarks),
      generateQuestionsForType(materialText, 'short', shortCount, difficulty, sMarks),
      generateQuestionsForType(materialText, 'long', longCount, difficulty, lMarks),
    ]);

    // Merge AI-generated with the teacher's own, then group MCQ→short→long + renumber.
    const rawCombined = [...mcqRes.questions, ...shortRes.questions, ...longRes.questions, ...manual];
    const graded = normalizeExamQuestions(rawCombined, { reorder: true });
    if (graded.length === 0) {
      return res.status(500).json({ success: false, error: 'No usable questions were produced. Please try again.' });
    }
    // Append marks-free cognitive probes so the profile always has written text to score.
    const questions = appendCognitiveProbes(graded);

    const fullExam = {
      examTitle: 'Generated Exam',
      totalMarks: graded.reduce((s, q) => s + q.marks, 0),
      questions,
    };
    const examId = storeExam(fullExam);

    totalTokensUsed += mcqRes.tokens + shortRes.tokens + longRes.tokens;
    const mcqN = graded.filter(q => q.type === 'mcq').length;
    const shortN = graded.filter(q => q.type === 'short').length;
    const longN = graded.filter(q => q.type === 'long').length;
    console.log(`✅ Generated exam (${mcqN} MCQ + ${shortN} short + ${longN} long incl ${manual.length} manual, ${fullExam.totalMarks} marks, ${difficulty})`);

    res.json({ success: true, exam: stripExamForClient(fullExam, examId) });
  } catch (err) {
    console.error('Generate exam error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to generate exam. Please try again.' });
  }
});

// Parse an existing exam paper text into structured JSON (MCQ + written).
app.post('/api/parse-paper', async (req, res) => {
  try {
    const { text } = req.body;
    if (!text || text.trim().length < 20) {
      return res.status(400).json({ success: false, error: 'Please provide exam paper text (at least 20 characters).' });
    }

    const prompt = `You are an expert exam parser. The following text is an exam paper. Extract every question.

RULES:
- A question with multiple choices → type "mcq" with options ["A) …","B) …","C) …","D) …"]. Include "correctAnswer" letter if an answer key is present, else "".
- A question asking for a brief written/explanatory answer (no choices) → type "short" with NO options. Add 2-3 "keyPoints" capturing what a correct answer should mention (infer them if not stated).
- A question asking for an extended, essay-style, or multi-part explanation → type "long" with NO options. Add 4-6 "keyPoints" — the distinct valid points a full answer should cover (infer them if not stated).
- If marks are specified per question (e.g. "[2 marks]"), use that value. Otherwise default to 1 for MCQ, 3 for short, 6 for long.
- Calculate totalMarks from all questions.

Respond ONLY with valid JSON in this exact shape:
{
  "examTitle": "Parsed Exam Paper",
  "totalMarks": <number>,
  "questions": [
    { "id": 1, "type": "mcq", "marks": 1, "question": "…?", "options": ["A) …","B) …","C) …","D) …"], "correctAnswer": "A", "explanation": "" },
    { "id": 2, "type": "short", "marks": 3, "question": "Explain …", "keyPoints": ["point 1","point 2"] },
    { "id": 3, "type": "long", "marks": 6, "question": "Discuss …", "keyPoints": ["point 1","point 2","point 3","point 4"] }
  ]
}

EXAM PAPER TEXT:
${text.substring(0, 12000)}`;

    const response = await openai.chat.completions.create({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      max_tokens: 12000,
      response_format: { type: 'json_object' },
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return res.status(500).json({ success: false, error: 'AI did not return a response.' });
    }

    const raw = JSON.parse(content);
    const graded = normalizeExamQuestions(raw.questions, { reorder: true });
    if (graded.length === 0) {
      return res.status(500).json({ success: false, error: 'No questions could be extracted from this paper. Please check the document.' });
    }
    // Append marks-free cognitive probes so the profile always has written text to score.
    const questions = appendCognitiveProbes(graded);

    const fullExam = {
      examTitle: raw.examTitle || 'Parsed Exam Paper',
      totalMarks: graded.reduce((s, q) => s + q.marks, 0),
      questions,
    };
    const examId = storeExam(fullExam);

    totalTokensUsed += response.usage?.total_tokens || 0;
    console.log(`✅ Parsed paper: ${fullExam.examTitle} (${questions.length} questions extracted)`);

    res.json({ success: true, exam: stripExamForClient(fullExam, examId) });
  } catch (err) {
    console.error('Parse paper error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to parse paper. Please try again.' });
  }
});

// ─── GRADE CUSTOM EXAM ────────────────────────────────────────────────────────
// Grades MCQs by the stored answer key and grades ALL written answers together in
// one cumulative AI call, which also yields cognitive features for the profile.
app.post('/api/grade-exam', async (req, res) => {
  try {
    const { examId, exam: inlineExam, answers = {}, sessionId } = req.body;

    // Resolve the FULL exam (with answer key):
    //  1. A session paper (persisted on the Session) when grading a session exam,
    //  2. the server-side stored exam (leak-free AI-generated path),
    //  3. an inline manually-authored exam the client created itself.
    let fullExam = null;
    if (sessionId) {
      const s = await prisma.session.findUnique({ where: { id: sessionId } });
      if (s && s.assessment && s.assessment.kind === 'custom-exam') {
        fullExam = s.assessment.exam;
      }
    }
    if (!fullExam && examId && examStore.has(examId)) {
      fullExam = examStore.get(examId).exam;
    } else if (!fullExam && inlineExam && Array.isArray(inlineExam.questions)) {
      // Inline (manual) exam: preserve the client's question ids so they keep
      // matching the answers keyed by those ids.
      fullExam = { ...inlineExam, questions: normalizeExamQuestions(inlineExam.questions, { reorder: false }) };
    }
    if (!fullExam) {
      return res.status(404).json({ success: false, error: 'Exam session not found or expired. Please regenerate the exam.' });
    }

    const questions = fullExam.questions;
    const graded = [];
    let mcqMarks = 0;

    // 1) Auto-grade MCQs against the key.
    for (const q of questions) {
      if (q.type !== 'mcq') continue;
      const sel = (answers[q.id] || '').toString().trim().charAt(0).toUpperCase();
      const correct = !!sel && sel === q.correctAnswer;
      const awarded = correct ? q.marks : 0;
      mcqMarks += awarded;
      graded.push({ id: q.id, awardedMarks: awarded, correct });
    }

    // 2) Grade written answers (short + long) cumulatively via AI (also produces
    //    cognitive features). Long answers are scored by how many distinct valid
    //    points they cover vs the expected key points.
    const shortQs = questions.filter(q => WRITTEN_TYPES.has(q.type));
    let shortMarks = 0;
    let cognitive = null;
    let usage = { tokens: 0 };

    if (shortQs.length > 0) {
      const formatted = shortQs.map(q => {
        let a = answers[q.id];
        if (Array.isArray(a)) a = a.join(' ');
        a = (a || '').toString().trim() || '[NO ANSWER PROVIDED]';
        const kp = (q.keyPoints || []).length ? `\nExpected valid points (${q.keyPoints.length}): ${q.keyPoints.join('; ')}` : '';
        const kind = q.type === 'long' ? 'LONG-ANSWER' : 'SHORT-ANSWER';
        return `Q${q.id} [${kind}, worth ${q.marks} marks]: ${q.question}${kp}\nStudent answer: ${a}`;
      }).join('\n\n');

      const gradePrompt = `You are a fair, rigorous exam grader. Grade each written answer below on a 0..maxMarks scale for that question.

SCORING METHOD:
- SHORT-ANSWER: judge correctness, completeness and relevance to the expected points; award partial credit.
- LONG-ANSWER: count how many of the DISTINCT expected valid points the student genuinely addresses, then award marks proportionally to the question's max marks (e.g. covering 3 of 4 expected points ≈ 75% of the marks). Give a small bonus for depth, correct reasoning and coherence; do not reward padding or repetition. A student may earn credit for a valid point not in the list if it is clearly correct and relevant.
- Empty, irrelevant, or gibberish answers get 0.
- awardedMarks must never exceed the question's max marks.

Also assess the student's overall cognitive profile FROM THEIR WRITTEN ANSWERS on a 0.0–1.0 scale (do not default to 0.5 — discriminate):
- reflection_depth: depth of reasoning, use of causal connectives ("because", "therefore").
- self_awareness: acknowledging limits, assumptions, or trade-offs.
- learning_orientation: curiosity, information-seeking, growth mindset.
- creativity_score: originality and resourcefulness vs generic answers.

WRITTEN QUESTIONS & ANSWERS:
${formatted}

Respond ONLY with valid JSON:
{
  "grades": [ { "id": <questionId>, "awardedMarks": <number>, "pointsCovered": <integer>, "feedback": "one concise sentence noting points hit/missed" } ],
  "cognitive": { "reflection_depth": 0.0, "self_awareness": 0.0, "learning_orientation": 0.0, "creativity_score": 0.0, "insights": ["obs 1","obs 2"] }
}`;

      const completion = await openai.chat.completions.create({
        model: MODEL,
        messages: [{ role: 'user', content: gradePrompt }],
        temperature: 0.2,
        // Scale to the number of written answers so grades JSON isn't truncated.
        max_tokens: Math.min(6000, 500 + shortQs.length * 160),
        response_format: { type: 'json_object' },
      });

      const parsed = JSON.parse(completion.choices[0].message.content);
      totalTokensUsed += completion.usage?.total_tokens || 0;
      usage = { tokens: completion.usage?.total_tokens || 0 };

      // Match model grades to questions robustly: prefer id match (string-coerced,
      // since the model may return ids as numbers or strings), then fall back to
      // positional order so a valid answer never silently scores 0 on a mismatch.
      const rawGrades = Array.isArray(parsed.grades) ? parsed.grades : [];
      const gradeById = {};
      rawGrades.forEach(g => { if (g && g.id !== undefined && g.id !== null) gradeById[String(g.id)] = g; });

      shortQs.forEach((q, idx) => {
        const g = gradeById[String(q.id)] || rawGrades[idx] || {};
        const awarded = Math.max(0, Math.min(q.marks, Number(g.awardedMarks) || 0));
        shortMarks += awarded;
        const entry = { id: q.id, awardedMarks: Math.round(awarded * 100) / 100, feedback: g.feedback || '' };
        if (q.type === 'long') {
          entry.pointsCovered = Number.isFinite(g.pointsCovered) ? g.pointsCovered : undefined;
          entry.totalPoints = (q.keyPoints || []).length || undefined;
        }
        graded.push(entry);
      });

      cognitive = parsed.cognitive || null;
    }

    const obtainedMarks = Math.round((mcqMarks + shortMarks) * 100) / 100;

    console.log(`🧮 Graded exam "${fullExam.examTitle}": ${obtainedMarks}/${fullExam.totalMarks} (MCQ ${mcqMarks} + written ${shortMarks})`);

    res.json({
      success: true,
      result: {
        questions,        // full questions WITH answer key, for post-submit review
        graded,
        obtainedMarks,
        totalMarks: fullExam.totalMarks,
        mcqMarks,
        shortMarks,
        cognitive,
      },
      usage,
    });
  } catch (err) {
    console.error('Grade exam error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to grade exam. Please try again.' });
  }
});

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
      .map((p, idx) => `  ${idx + 1}. id=${p.id} | level=${p.level} | phaseName="${p.phaseName}" | type=${p.type} | scored=${p.scored} | timeLimit≈${p.timeRange} | TASK: ${p.desc}`)
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

CRITICAL — HIDDEN LOGIC RULE (this powers the whole diagnosis):
First, silently invent ONE hidden LOGIC_RULE for this scenario — a single decision principle
(e.g. "prioritise the option that reduces the highest-probability irreversible loss").
NEVER state the rule to the student. Instead INSTANTIATE the SAME rule across three transfer tiers:
- LEVEL 1 (DIRECT): the rule applies plainly in the MAIN story; the correct answer follows it directly.
- LEVEL 2 (NEAR TRANSFER): the SAME rule, re-skinned into a COMPLETELY different sub-context (new names/domain). Surface changes; the underlying rule does NOT.
- LEVEL 3 (FAR TRANSFER): the SAME rule PLUS a hidden variable / twist / misleading option, so naive pattern-matching FAILS but the rule still gives the right call.
The re-probe item (level="R") must test the SAME kind of judgement as the Level-1 items.

CRITICAL — QUESTION STRUCTURE:
You MUST output EXACTLY 15 questions, in the EXACT order, ids, phaseNames, levels and types listed below.
Honour each line precisely:
${phaseSpec}

Type-specific requirements:
- type "text": include a helpful "hint". May include "context" describing an aftermath/situation.
- type "mcq": include exactly 4 plausible, scenario-specific "options" (no obvious throwaway answers).
- type "ranking": include exactly 3-4 plausible, scenario-specific "options" to be ranked.
- type "slider": must include "min", "max", and "unit" (e.g. "Rs.", "Days", "Hours") for budget/resource allocation.
- type "multi-text": ask for 3 distinct approaches; include a "hint". (The UI shows 3 input boxes.)
- type "mcq-urgent": you MUST include a SEPARATE "urgentUpdate" field — a vivid sudden twist UNIQUE to this story, prefixed with 🚨. Do NOT put the twist inside "question"; keep "question" as the decision prompt itself. Also include exactly 4 "options" reacting to the twist. Keep it tight and high-pressure; never a stock template.
- type "reflection": timeLimit MUST be 0. Ask ONLY: "Looking back, what would you do differently and why?" (Do NOT ask the student to self-rate a confidence number — confidence is measured automatically.)

SCORING KEYS (required — the classifier needs these):
- For EVERY item with scored=true, include an "answerKey": for mcq/mcq-urgent the 0-based index of the best option; for ranking the correct ordered array of the option strings; for slider the optimal numeric value (or a band {"min":x,"max":y}).
- Echo the "level" of every question (1, 2, 3, "R" or 0) EXACTLY as listed above.
- For the "Information Seeking" item, set "answerKey" to the 0-based index of the information-seeking option.

Return ONLY this JSON structure (questions array MUST follow the order above):
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
    { "id": <n>, "level": <1|2|3|"R"|0>, "phaseName": "<exact name>", "type": "<exact type>", "timeLimit": <seconds>, "question": "...", "hint": "...(text/multi-text)", "context": "...(optional, text only)", "options": ["...","...","...","..."], "urgentUpdate": "🚨 ...(mcq-urgent only)", "answerKey": <index | ordered array | number (scored items ONLY)> }
  ]
}`,
        },
      ],
      temperature: 0.92,
      max_tokens: 4000,
      response_format: { type: 'json_object' },
    });

    const data = JSON.parse(completion.choices[0].message.content);

    // Ensure totalTimeLimit is a number
    if (data.scenario && typeof data.scenario.totalTimeLimit === 'string') {
      data.scenario.totalTimeLimit = parseInt(data.scenario.totalTimeLimit) || 600;
    }

    // ── Normalise questions to the shuffled phase contract ──────────────────
    // Defends against LLM drift so the frontend always renders valid types/order.
    const allowedTypes = new Set(['text', 'mcq', 'mcq-urgent', 'multi-text', 'ranking', 'reflection', 'slider']);
    if (Array.isArray(data.questions)) {
      data.questions = data.questions.slice(0, 15).map((q, i) => {

        const spec = phaseOrder[i] || phaseOrder[phaseOrder.length - 1];
        const type = allowedTypes.has(q.type) ? q.type : spec.type;
        const normalized = {
          ...q,
          id: i + 1,
          phase: q.phase || spec.phase,
          phaseName: q.phaseName || spec.phaseName,
          // Preserve the fixed transfer tier from the blueprint even if the model drifts.
          level: q.level ?? spec.level,
          type,
          // Fixed per-type limit (ignore whatever the model returned) so timing
          // is a consistent challenge. Still recorded for behavioural metrics.
          timeLimit: TIME_BY_TYPE[type] ?? 40,
        };
        // Safety net: mcq-urgent MUST carry an urgentUpdate for the UI alert banner.
        // The model sometimes folds the twist into the question text — recover it so
        // the render never silently loses the crisis element.
        if (type === 'mcq-urgent' && !normalized.urgentUpdate) {
          const m = (normalized.question || '').match(/🚨[^.!?\n]*[.!?]/);
          normalized.urgentUpdate = m ? m[0].trim() : '🚨 A sudden twist just changed everything — decide fast.';
        }
        return normalized;
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

    console.log(`🧠 Evaluation | Acc: ${evaluation.accuracy_score} | ${completion.usage.total_tokens} tokens | ~$${estimatedCost.toFixed(4)}`);
    res.json({ success: true, evaluation, usage: { tokens: completion.usage.total_tokens, estimatedCost } });

  } catch (error) {
    console.error('❌ Evaluation error:', error.message);

    res.json({
      success: true,
      evaluation: {
        accuracy_score: 0.3,
        cognitive_features: {
          reflection_depth: 0.3, self_awareness: 0.3,
          learning_orientation: 0.3, creativity_score: 0.3,
          insights: ['Analysis unavailable due to an error — default penalty applied'],
        },
      },
      usage: { tokens: 0, estimatedCost: 0 },
    });
  }
});

// ─── AI TUTOR & INTELLIGENCE CHATBOT ENDPOINT ────────────────────────────────
app.post('/api/chat', async (req, res) => {
  try {
    const { messages = [], recordContext = null } = req.body;
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';

    // Search database for student or exam queries (e.g. "Physics Test 1 Haris")
    let databaseContextStr = '';
    if (isDbConnected && lastUserMsg.length > 3) {
      try {
        const keywords = lastUserMsg.split(/\s+/).filter(w => w.length > 2);
        if (keywords.length > 0) {
          const dbRecords = await prisma.record.findMany({
            take: 10,
            orderBy: { date: 'desc' },
            include: { user: true },
          });

          // Filter relevant records
          const matching = dbRecords.filter(r => {
            const studentName = (r.user?.name || '').toLowerCase();
            const examTitle = (r.primaryName || '').toLowerCase();
            const queryLower = lastUserMsg.toLowerCase();
            return (
              (studentName && queryLower.includes(studentName)) ||
              (examTitle && queryLower.includes(examTitle)) ||
              queryLower.includes('student') ||
              queryLower.includes('class') ||
              queryLower.includes('test') ||
              queryLower.includes('result')
            );
          });

          if (matching.length > 0) {
            databaseContextStr = '\n\nDATABASE STUDENT RECORDS SUMMARY:\n' + matching.map(r => {
              const name = r.user?.name || 'Anonymous Student';
              const date = new Date(r.date).toLocaleDateString();
              return `- Student: ${name} | Date: ${date} | Score: ${r.performanceScore}% | Category: ${r.primaryName} | Decision Style: ${r.decisionStyle} | Avg Time: ${r.avgResponseTime}s`;
            }).join('\n');
          }
        }
      } catch (err) {
        console.log('Chat DB search error:', err.message);
      }
    }

    let formattedActiveContext = '';
    if (recordContext) {
      let itemizedItems = [];

      // Priority 1: Check scenarioResults array (e.g. multi-scenario or wrapper object)
      const scenarioList = recordContext.scenarioResults || recordContext.scenario_results || (Array.isArray(recordContext) ? recordContext : []);
      if (Array.isArray(scenarioList) && scenarioList.length > 0) {
        itemizedItems = scenarioList.flatMap(s => s?.itemizedDetails || s?.itemized_details || []);
      }

      // Priority 2: Check itemizedDetails directly on recordContext
      if (itemizedItems.length === 0 && Array.isArray(recordContext.itemizedDetails)) {
        itemizedItems = recordContext.itemizedDetails;
      }

      // Priority 3: Dynamically construct from questions, selectedAnswers, and graded
      if (itemizedItems.length === 0) {
        const questionsList = recordContext.questions || [];
        const gradedList = recordContext.graded || [];
        const gradedMap = {};
        if (Array.isArray(gradedList)) {
          gradedList.forEach(g => { if (g && g.id != null) gradedMap[g.id] = g; });
        }
        const answersObj = recordContext.selectedAnswers || recordContext.answers || {};

        if (Array.isArray(questionsList) && questionsList.length > 0) {
          itemizedItems = questionsList.filter(q => !q.probe).map((q, idx) => {
            const given = answersObj[q.id];
            const gradedInfo = gradedMap[q.id];
            const isMcq = q.type === 'mcq';
            const expected = isMcq 
              ? q.correctAnswer 
              : (Array.isArray(q.keyPoints) ? q.keyPoints.join(', ') : (q.correctAnswer || ''));
            
            let isCorrect = undefined;
            if (gradedInfo && gradedInfo.correct !== undefined) {
              isCorrect = gradedInfo.correct;
            } else if (isMcq && given && q.correctAnswer) {
              isCorrect = String(given).trim().toUpperCase() === String(q.correctAnswer).trim().toUpperCase();
            }

            return {
              id: q.id || (idx + 1),
              q: q.question,
              type: q.type,
              ans: given != null ? (Array.isArray(given) ? given.join(' | ') : String(given)) : '[No Answer]',
              correct: expected || undefined,
              isCorrect: isCorrect,
              feedback: gradedInfo?.feedback || undefined
            };
          });
        }
      }

      let itemizedSummary = '';
      if (itemizedItems.length > 0) {
        itemizedSummary = '\n- Itemized Question Diagnostic Log:\n' + itemizedItems.map((item, idx) => {
          let statusStr = item.isCorrect === true ? '✅ Correct' : item.isCorrect === false ? '❌ Incorrect' : '📝 Answered';
          let correctStr = item.correct ? ` (Expected/Correct Answer: "${item.correct}")` : '';
          let timeStr = item.time ? ` [Time: ${item.time}s]` : '';
          let feedbackStr = item.feedback ? ` [Feedback: "${item.feedback}"]` : '';
          const qNum = item.id || (idx + 1);
          return `  * Q${qNum} (${item.type || 'MCQ'}): "${item.q || ''}" -> Student Answer: "${item.ans}" | ${statusStr}${correctStr}${timeStr}${feedbackStr}`;
        }).join('\n');
      }

      const studentName = recordContext.name || recordContext.studentName || recordContext.student_name || 'Student';
      const primaryCat = recordContext.primaryName || recordContext.primaryCategory || recordContext.primary_name || 'N/A';
      const primaryEmoji = recordContext.primaryEmoji || recordContext.primary_emoji || '';
      const confidence = recordContext.primaryConfidence !== undefined ? Math.round(recordContext.primaryConfidence * 100) + '%' : (recordContext.confidence !== undefined ? recordContext.confidence + '/10' : 'N/A');
      
      let scoreStr = 'N/A';
      if (recordContext.obtainedMarks !== undefined && recordContext.totalMarks !== undefined) {
        scoreStr = `${recordContext.obtainedMarks}/${recordContext.totalMarks} (${Math.round((recordContext.obtainedMarks/recordContext.totalMarks)*100)}%)`;
      } else if (recordContext.percentage !== undefined) {
        scoreStr = `${Math.round(recordContext.percentage)}%`;
      } else if (recordContext.performanceScore !== undefined) {
        scoreStr = `${Math.round(recordContext.performanceScore * 100)}%`;
      } else if (recordContext.accuracyScore !== undefined) {
        scoreStr = `${Math.round(recordContext.accuracyScore * 100)}%`;
      }

      const avgSpeed = recordContext.avgResponseTime || recordContext.avgTimePerQuestion || recordContext.overall?.avgResponseTime ? `${recordContext.avgResponseTime || recordContext.avgTimePerQuestion || recordContext.overall?.avgResponseTime}s avg` : 'N/A';
      const decisionStyle = recordContext.decisionStyle || recordContext.overall?.decisionStyle || 'N/A';
      const totalRevisions = recordContext.totalAnswerChanges ?? recordContext.totalRevisions ?? recordContext.overall?.totalAnswerChanges ?? 0;
      const backtrackCount = recordContext.backtrackCount ?? recordContext.overall?.backtrackCount ?? 0;

      // Extract cognitive sub-scores (0.0 to 1.0)
      const cog = recordContext.cognitive || recordContext.scenarioResults?.[0]?.cognitive || recordContext.scenario_results?.[0]?.cognitive || recordContext.overall?.cognitive || {};
      const reflectionDepthStr = cog.reflection_depth !== undefined ? `${Math.round(cog.reflection_depth * 100)}%` : 'N/A';
      const selfAwarenessStr = cog.self_awareness !== undefined ? `${Math.round(cog.self_awareness * 100)}%` : 'N/A';
      const learningOrientStr = cog.learning_orientation !== undefined ? `${Math.round(cog.learning_orientation * 100)}%` : 'N/A';
      const creativityStr = cog.creativity_score !== undefined ? `${Math.round(cog.creativity_score * 100)}%` : 'N/A';

      formattedActiveContext = `

ACTIVE ASSESSMENT CONTEXT:
- Student Name: ${studentName}
- Learner Profile Category: ${primaryCat} ${primaryEmoji}
- Category Confidence: ${confidence}
- Score / Task Accuracy: ${scoreStr}
- Decision Speed: ${avgSpeed}
- Decision Style: ${decisionStyle}
- Answer Changes / Revisions: ${totalRevisions}
- Backtracks: ${backtrackCount}
- Cognitive Sub-Scores Breakdown:
  * Reflection Depth: ${reflectionDepthStr}
  * Self-Awareness & Caution: ${selfAwarenessStr}
  * Learning Orientation (Growth Mindset): ${learningOrientStr}
  * Creativity & Resourcefulness: ${creativityStr}${itemizedSummary}`;
    }

    const systemPrompt = `You are AITA Core AI — the premier Intelligent Academic & Diagnostic Assistant for the AITA Platform (Adaptive Diagnostic & Cognitive Profiler).

🎯 YOUR PERSONA & EXECUTIVE TONE:
1. Speak with the precision, intelligence, authority, and sharp structure of modern top-tier LLMs (like ChatGPT / Claude).
2. DIRECT & EXECUTIVE: Provide clear, well-structured, executive responses. Use bold key terms, clean bullet points, bold section headers, and direct logical reasoning. Avoid generic fluff or repetitive boilerplate recommendations unless specifically requested.
3. RESILIENT TO TYPOS & IMPLICIT INTENT: Never repeat, hallucinate, or define fake concepts based on user typos (e.g., if user types "yfixed value", "tets", or "self awareness is low here are the yfixed value", recognize they mean "metric values" or their actual profile sub-scores). Map user queries directly to AITA's 17 telemetry features, cognitive dimensions, and exact test records.

🗄️ AITA SYSTEM ARCHITECTURE & DATABASE SCHEMA KNOWLEDGE BASE:
- **PostgreSQL Database Models (Prisma ORM)**:
  * User: User accounts with roles (\`USER\`, \`STUDENT\`, \`TEACHER\`, \`SUPERVISOR\`, \`ADMIN\`), email, passwordHash, resetToken, and relations (\`records\`, \`sessions\`, \`memberships\`).
  * Session: Test sessions created by teachers/hosts with a unique 6-character join code (e.g. "A3X7K2"), \`hostId\`, \`isActive\` status, and \`assessment\` JSONB (authored AI scenario or custom PDF exam).
  * SessionMember: Student enrollment per session (unique \`[sessionId, userId]\`), linking student membership to their generated \`recordId\`.
  * Record: Complete diagnostic assessment result storing student score, \`primaryCategory\`, \`primaryConfidence\`, \`confidence\` (1-10), \`decisionStyle\`, and JSONB fields: \`cognitive\` (\`reflection_depth\`, \`self_awareness\`, \`learning_orientation\`, \`creativity_score\`), \`overall\` (17 raw telemetry metrics), \`scenarioResults\` (itemized question/answer logs), and \`vark\` (visual, auditory, readWrite, kinesthetic).
- **Core System Innovations & Solved Bottlenecks**:
  * Prior-Knowledge / Familiarity Trap Solution: Generated scenarios use novel, fictional logic grids so students cannot rely on memorized facts, isolating pure cognitive processing.
  * Interface Barrier / Slow Reader Trap Solution: Calibrates timing thresholds against a 10-second baseline interaction check to normalize reading speed differences.
  * 3-Step Trojan Horse Progression: Step A (10s Baseline Latency Calibration), Step B (Multimodal Presentation Symmetry), Step C (3-Tier Context Shift: Level 1 Direct Concept, Level 2 Near Transfer, Level 3 Far Transfer).

🧠 AITA PLATFORM & MEASUREMENT KNOWLEDGE BASE:
- **17 Telemetry & Cognitive Features**:
  * avgResponseTime: Mean active decision time (s) per question.
  * avgTimeToStart: Planning/hesitation latency (s) before first click or keypress.
  * timeVariance: Pacing stability ratio (std dev / mean time).
  * rushedDecisions: Count of questions submitted in < 15s (impulsivity signal).
  * overthinkingCount: Count of questions deliberated for > 60s.
  * totalAnswerChanges: Option revisions before finalizing an answer.
  * backtrackCount: Backward navigations to review/re-edit previous questions.
  * accuracyScore: Overall correctness ratio (0.0 to 1.0 or obtained/total marks).
  * decisionStyle: Categorical archetype (impulsive [<25s avg], balanced [25-60s], deliberate [>60s]).
  * confidence: Implicit behavioral confidence score (1-10 scale) derived automatically: Baseline 6.0 + Pacing Bonus + Low Revision Bonus + (Accuracy - 0.5)*4 + Reflection Bonus.
  * reflection_depth (0-100%): Metacognitive depth evaluated via linguistic density on typed responses + pacing (45-90s sweet spot) + reviewing backtracks.
  * self_awareness (0-100%): Risk caution under pressure and mistake recognition evaluated during scenario twists & reflection responses.
  * learning_orientation (0-100%): Preference for information seeking, advice absorption, and growth mindset vs snap assumptions.
  * creativity_score (0-100%): Resourcefulness, non-generic problem solving, and novel trade-off allocations.

- **8 Diagnostic Learner Categories**:
  * ⚡ Quick & Careless: Fast (<35s), low accuracy (<60%), rushed decisions (>1), low reflection depth (<55%).
  * 🐢 Slow & Thorough: Deep (>80s), high accuracy, high revisions (>=3), high reflection (>50%), overthinking count.
  * 😰 Concept Struggler: Low accuracy (<40%), low confidence (<4/10), low learning orientation (<35%), high backtracks/revisions.
  * 🚀 Fast Learner: High accuracy (>70%), fast (<45s), high confidence (>=7/10), low revisions (<=4).
  * 🎲 Inconsistent Performer: High pacing variance (>0.45), high revisions (>=6), accuracy fluctuating across phases.
  * 📈 Steady Achiever: Reliable pace (35-65s), balanced accuracy (60-80%), stable pacing (<0.30 variance).
  * 🎯 Strategic Thinker: High accuracy (>75%), high reflection (>65%), high self-awareness (>60%), high creativity (>60%).
  * 🙈 Ignorant / Avoider: Skipped questions (>=2) or extremely fast (<20s) with low score (<25%), zero confidence penalty.

RULES FOR ANSWERING USER QUESTIONS:
1. **Explaining Scores/Metrics**: When asked why a metric (like Self-Awareness, Learning Orientation, Reflection Depth, Decision Speed, Confidence) is low or high, reference the student's EXACT numerical value from ACTIVE ASSESSMENT CONTEXT below, explain the telemetry factors that influenced it, and explain the AITA measurement formula accurately.
2. **Explaining Database & System Architecture**: If asked about the system design, Prisma database models (\`User\`, \`Session\`, \`SessionMember\`, \`Record\`), backend telemetry extraction, or how AITA works, explain clearly and authoritatively with technical precision.
3. **Explaining Questions (Q1, Q3, Q9, etc.)**: Always use the EXACT question text, student's submitted answer, and expected correct answer from the "Itemized Question Diagnostic Log". NEVER output placeholder brackets like "[Insert your answer]".
4. **Teacher / Supervisor Queries**: If asked to summarize student results or compare students (e.g. "Tell me about Haris in Physics Test 1"), summarize student performance, decision style, and key behavioral telemetry clearly.
5. **Tone & Formatting**: Start with a direct 1-2 sentence executive answer, followed by clear section headers (### Executive Summary, ### Diagnostic Breakdown, ### How AITA Measures This). Use clean markdown with bold keys.${formattedActiveContext}${databaseContextStr}`;

    const apiMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
    ];

    let reply = '';

    try {
      const response = await callChatbotAI({
        messages: apiMessages,
        temperature: 0.7,
      });
      reply = response.choices?.[0]?.message?.content || '';
      totalTokensUsed += response.usage?.total_tokens || 0;
    } catch (err) {
      console.error('Chat AI call error:', err.message);
    }

    if (!reply) {
      reply = 'I am your AITA AI Tutor. I can help analyze your cognitive profile, explain specific question concepts, or summarize student results for teachers!';
    }

    res.json({ success: true, message: reply });
  } catch (err) {
    console.error('Chat endpoint error:', err.message);
    res.status(500).json({ success: false, error: 'Failed to process chat message.' });
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

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception trapped:', err.message || err);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ Unhandled Rejection trapped:', reason?.message || reason);
});

app.listen(PORT, () => {
  console.log(`🚀 AITA Server on http://localhost:${PORT}`);
  console.log(`🤖 Model: ${MODEL}`);
  console.log(`🎲 ${scenarioFormats.length} scenario formats: ${scenarioFormats.map(f => f.format).join(', ')}`);
  console.log(`🧩 7 cognitive phases (shuffled per session) | 📚 ${SCENARIO_SEEDS.length} localised seeds`);
  console.log(`🔑 API key: ${process.env.OPENAI_API_KEY ? '✅' : '❌ MISSING'}`);
});
