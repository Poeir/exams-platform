// Exam gateway: ONE container / ONE port hosting both assessment engines.
//
//   /english/*     → english-test app (API + SPA), prefix stripped by mount
//   /mbti/*        → mbti app (API + SPA), prefix stripped by mount
//   /api/health    → combined health (pings the shared DB through both clients)
//   /              → tiny landing page linking to both exams
//
// Each app keeps its own node_modules (and its own Prisma client) — Node
// resolves imports relative to each app's files, so the two dependency trees
// coexist in one process. Apps export `app` from app.js and never listen here.
import express from 'express';

// Resolve the gateway port BEFORE importing the apps: importing them inits
// each Prisma client, which side-loads the app's own .env (schema-relative —
// e.g. apps/english/server/.env with the standalone-dev PORT=3002) into
// process.env. Static imports are hoisted above this line, so the apps are
// loaded dynamically below instead.
const PORT = Number(process.env.PORT) || 3000;

// Same reason: pin the engines' public URLs from PUBLIC_BASE_URL before the
// apps' side-loaded .env files (standalone-dev values like localhost:5175)
// can fill them in. Explicit ENGINE_PUBLIC_URL / FRONTEND_URL in the GATEWAY
// env still wins.
if (process.env.PUBLIC_BASE_URL) {
  const base = process.env.PUBLIC_BASE_URL.replace(/\/$/, '');
  process.env.ENGINE_PUBLIC_URL ||= `${base}/english`;
  process.env.FRONTEND_URL ||= `${base}/mbti`;
}

const [
  { app: englishApp },
  { prisma: englishPrisma },
  { app: mbtiApp },
  { prisma: mbtiPrisma },
  { logger },
] = await Promise.all([
  import('../apps/english/server/src/app.js'),
  import('../apps/english/server/src/db.js'),
  import('../apps/mbti/server/app.js'),
  import('../apps/mbti/server/db.js'),
  import('../apps/mbti/server/logger.js'),
]);

const gateway = express();
gateway.disable('x-powered-by');
gateway.set('trust proxy', true);

// Combined health for the platform's liveness/readiness probes. Each engine's
// own health stays reachable at /english/api/health and /mbti/api/health.
gateway.get('/api/health', async (_req, res) => {
  const ping = async (name, prisma) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return { name, ok: true };
    } catch (err) {
      return { name, ok: false, error: err.message };
    }
  };
  const checks = await Promise.all([
    ping('english', englishPrisma),
    ping('mbti', mbtiPrisma),
  ]);
  const ok = checks.every((c) => c.ok);
  res.status(ok ? 200 : 503).json({
    status: ok ? 'ok' : 'degraded',
    engines: Object.fromEntries(checks.map((c) => [c.name, c.ok])),
  });
});

gateway.use('/english', englishApp);
gateway.use('/mbti', mbtiApp);

// Minimal landing page. Candidates normally arrive on deep links minted by the
// parent system (launch_url / view_url) — this is just a human-friendly root.
gateway.get('/', (_req, res) => {
  res.type('html').send(`<!doctype html>
<html lang="th">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>examo by empeo</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Thai:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
<style>
  :root {
    --orange: #F05B2F;
    --orange-dark: #d8431a;
    --orange-soft: #FDEFE9;
    --ink: #1f2430;
    --muted: #6b7280;
    --line: #ececef;
    --card: #ffffff;
  }
  * { box-sizing: border-box; }
  body {
    font-family: 'Inter', 'IBM Plex Sans Thai', system-ui, sans-serif;
    margin: 0; min-height: 100vh; color: var(--ink);
    background: radial-gradient(1200px 600px at 80% -10%, #fff3ee 0%, transparent 60%),
                radial-gradient(900px 500px at -10% 110%, #fdeee8 0%, transparent 55%),
                #f7f7f8;
    display: flex; flex-direction: column;
  }
  .wrap { flex: 1; width: 100%; max-width: 980px; margin: 0 auto; padding: clamp(2rem, 6vw, 5rem) 1.5rem; }
  .brand { display: flex; align-items: center; gap: 0.7rem; margin-bottom: clamp(2rem, 5vw, 3.5rem); }
  .logo {
    width: 44px; height: 44px; border-radius: 12px; flex: none;
    background: linear-gradient(135deg, var(--orange) 0%, var(--orange-dark) 100%);
    display: grid; place-items: center; color: #fff; font-weight: 800; font-size: 1.35rem;
    box-shadow: 0 6px 16px rgba(240,91,47,0.32);
  }
  .brand .name { font-weight: 800; font-size: 1.25rem; letter-spacing: -0.02em; }
  .brand .name .o { color: var(--orange); }
  .brand .by { color: var(--muted); font-size: 0.82rem; font-weight: 500; margin-left: 0.1rem; }
  .hero h1 { font-size: clamp(1.8rem, 5vw, 2.9rem); font-weight: 800; letter-spacing: -0.03em; margin: 0 0 0.8rem; line-height: 1.1; }
  .hero h1 em { color: var(--orange); font-style: normal; }
  .hero p { color: var(--muted); font-size: clamp(1rem, 2.5vw, 1.15rem); max-width: 560px; margin: 0 0 clamp(2rem, 5vw, 3rem); line-height: 1.6; }
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.1rem; }
  .card {
    position: relative; display: flex; flex-direction: column;
    background: var(--card); border: 1px solid var(--line); border-radius: 18px;
    padding: 1.6rem 1.5rem; text-decoration: none; color: inherit; overflow: hidden;
    transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  }
  .card::before { content: ''; position: absolute; inset: 0 0 auto 0; height: 4px; background: var(--accent); }
  .card:hover { transform: translateY(-4px); box-shadow: 0 18px 40px rgba(31,36,48,0.12); border-color: transparent; }
  .card .icon {
    width: 46px; height: 46px; border-radius: 12px; display: grid; place-items: center;
    background: var(--accent-soft); color: var(--accent); margin-bottom: 1.1rem; flex: none;
  }
  .card .icon svg { width: 24px; height: 24px; }
  .card h2 { font-size: 1.18rem; font-weight: 700; margin: 0 0 0.35rem; letter-spacing: -0.01em; }
  .card .desc { color: var(--muted); font-size: 0.9rem; line-height: 1.55; margin: 0 0 1.2rem; flex: 1; }
  .card .meta { display: flex; align-items: center; gap: 0.4rem; font-size: 0.8rem; font-weight: 600; color: var(--accent); margin-top: auto; }
  .card .meta .arrow { transition: transform 0.18s ease; }
  .card:hover .meta .arrow { transform: translateX(4px); }
  .english { --accent: #2f6fed; --accent-soft: #eaf1fd; }
  .english-short { --accent: #1d9bf0; --accent-soft: #e7f5fe; }
  .mbti { --accent: #F05B2F; --accent-soft: var(--orange-soft); }
  footer { text-align: center; padding: 1.5rem; color: var(--muted); font-size: 0.8rem; }
  footer strong { color: var(--orange); }
</style>
</head>
<body>
  <div class="wrap">
    <div class="brand">
      <div class="logo">e</div>
      <div>
        <div class="name">exam<span class="o">o</span> <span class="by">by empeo</span></div>
      </div>
    </div>
    <div class="hero">
      <h1>เลือกแบบทดสอบ<br>เพื่อ<em>เริ่มต้น</em></h1>
      <p>แพลตฟอร์มประเมินทักษะและบุคลิกภาพสำหรับองค์กร — เลือกชุดข้อสอบที่ต้องการด้านล่างเพื่อเริ่มทำแบบทดสอบ</p>
    </div>
    <div class="grid">
      <a class="card english" href="/english/exam/full">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>
        </div>
        <h2>English Proficiency Test</h2>
        <p class="desc">ชุดเต็ม · Listening + Reading<br>วัดระดับภาษาอังกฤษแบบครบถ้วน</p>
        <span class="meta">50 นาที <span class="arrow">→</span></span>
      </a>
      <a class="card english-short" href="/english/exam/short">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
        </div>
        <h2>English Placement Test</h2>
        <p class="desc">ชุดสั้น · Grammar + Reading<br>วัดระดับเบื้องต้นแบบรวดเร็ว</p>
        <span class="meta">15 นาที <span class="arrow">→</span></span>
      </a>
      <a class="card mbti" href="/mbti/">
        <div class="icon">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 21v-1a6 6 0 0 1 6-6h4a6 6 0 0 1 6 6v1"/></svg>
        </div>
        <h2>MBTI Workplace Assessment</h2>
        <p class="desc">แบบประเมินบุคลิกภาพในการทำงาน<br>14 ข้อ · เข้าใจสไตล์การทำงาน</p>
        <span class="meta">14 ข้อ <span class="arrow">→</span></span>
      </a>
    </div>
  </div>
  <footer>powered by <strong>empeo</strong> · Gofive Assessments</footer>
</body>
</html>`);
});

const server = gateway.listen(PORT, () => {
  logger.info('gateway_started', { port: PORT, nodeEnv: process.env.NODE_ENV || 'development' });
});

process.on('unhandledRejection', (reason) => {
  logger.error('unhandled_rejection', {
    message: reason instanceof Error ? reason.message : String(reason),
    stack: reason instanceof Error ? reason.stack : undefined,
  });
});
process.on('uncaughtException', (error) => {
  logger.error('uncaught_exception', { message: error.message, stack: error.stack });
});

async function shutdown(signal) {
  logger.info('gateway_shutting_down', { signal });
  server.close();
  await Promise.allSettled([englishPrisma.$disconnect(), mbtiPrisma.$disconnect()]);
  logger.info('gateway_stopped');
}
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
