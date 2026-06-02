import { useMemo } from 'react';
import { Icon, Mascot } from '../components.jsx';
import { getResultType } from '../lib/resultCatalog.js';
import { AXIS_POLES, CONFIDENCE_LABELS, overrideScoreCode, scoreAnswers } from '../lib/scoring.js';

const TYPE_COLOR_THEMES = {
  purple: { types: ['INTJ', 'INTP', 'ENTJ', 'ENTP'] },
  green: { types: ['INFJ', 'INFP', 'ENFJ', 'ENFP'] },
  blue: { types: ['ISTJ', 'ISFJ', 'ESTJ', 'ESFJ'] },
  yellow: { types: ['ISTP', 'ISFP', 'ESTP', 'ESFP'] },
};

export function Result({ user = {}, answers = {}, resultRecord, resultCodeOverride, onRestart }) {
  const localScore = useMemo(() => {
    const scored = scoreAnswers(answers);
    return resultCodeOverride ? overrideScoreCode(scored, resultCodeOverride) : scored;
  }, [answers, resultCodeOverride]);

  const score = resultRecord?.result || localScore;
  const { code, axes, midzones } = score;
  const type = getResultType(code);
  const colorTheme = getTypeColorTheme(type.code);
  const userName = user.name || 'คุณ';
  return (
    <div className={`result-wrap result-longform result-theme-${colorTheme.key}`}>
      <ResultReportHero type={type} />

      <div className="result-report-shell">
        <aside className="result-report-sidebar">
          <ResultQuickCard type={type} />
          <nav className="result-report-nav" aria-label="Result sections">
            <a href="#snapshot">ภาพรวม</a>
            <a href="#axes">สมดุลบุคลิกภาพ</a>
            <a href="#manager-guide">แนวทางทำงานร่วมกัน</a>
            <a href="#growth">การเติบโต</a>
          </nav>
        </aside>

        <main className="result-report-main">
          <ResultStorySection id="snapshot" userName={userName} type={type} />
          <ResultAxesSection id="axes" axes={axes} midzones={midzones} />
          <ResultManagerSection id="manager-guide" userName={userName} type={type} />
          <ResultGrowthSection id="growth" type={type} />
        </main>
      </div>

      {/* <Disclaimer /> */}

    </div>
  );
}

function ResultReportHero({ type }) {
  const highlights = type.highlights || type.strengths?.slice(0, 3) || [];
  const kicker = type.roleTh ? `กลุ่ม${type.roleTh}` : 'ประเภทบุคลิกภาพ';
  const codeLine = [type.styleEn, type.typeNameEn].filter(Boolean).join(' · ');

  return (
    <header className="result-report-hero">
      <div className="result-report-hero-copy">
        <div className="result-report-kicker">{kicker}</div>
        <h1>{type.style}</h1>
        <div className="result-report-code">{codeLine}</div>
        <p>{type.tagline}</p>
        <div className="result-report-hero-meta">
          {highlights.map((highlight) => (
            <span key={highlight}>{highlight}</span>
          ))}
        </div>
      </div>
      <div className="result-report-hero-art">
        <Mascot name={type.mascot} size={220} />
      </div>
    </header>
  );
}

function ResultQuickCard({ type }) {
  return (
    <section className="result-quick-card">
      <div className="result-quick-mascot">
        <Mascot name={type.mascot} size={86} />
      </div>
      <h2>{type.code}</h2>
      <p>{type.style}</p>
    </section>
  );
}

function getTypeColorTheme(code) {
  const key = Object.keys(TYPE_COLOR_THEMES).find((themeKey) =>
    TYPE_COLOR_THEMES[themeKey].types.includes(code)
  ) || 'purple';

  return { key, ...TYPE_COLOR_THEMES[key] };
}

function ResultStorySection({ id, userName, type }) {
  return (
    <ResultReportSection id={id} number="01" title={`ภาพรวมของ${userName} ...`} kicker="Personality snapshot">
      <div className="result-profile-story">
        <div>
          <p className="result-lead">{type.summary}</p>
        </div>
        <div className="result-profile-highlight">
          <Icon name="sparkles" size={22} />
          <strong>{type.bestWhen}</strong>
        </div>
      </div>
      <ResultInfoList title="จุดแข็งที่เห็นได้ชัด" items={type.strengths.slice(0, 4)} icon="check" />
    </ResultReportSection>
  );
}

function ResultAxesSection({ id, axes, midzones }) {
  return (
    <ResultReportSection id={id} number="02" title="สมดุลบุคลิกภาพ" kicker="Personality scales">
      <div className="result-axis-panel">
        {Object.entries(axes).map(([axisKey, axisResult], i) => (
          <ResultAxisRow key={axisKey} axisKey={axisKey} axisResult={axisResult} pos={i} />
        ))}
      </div>
      {midzones.length > 0 && (
        <div className="result-midzone-note">
          <Icon name="shield" size={18} />
          <div>
            <strong>ผลบางแกนยังไม่ชัดมาก</strong>
            <p>{midzones.map(a => `${a[0]}/${a[1]}`).join(', ')} อยู่ใกล้กลาง แปลว่าคุณอาจใช้ได้ทั้งสองฝั่งตามสถานการณ์</p>
          </div>
        </div>
      )}
    </ResultReportSection>
  );
}

function ResultAxisRow({ axisKey, axisResult, pos }) {
  const poles = AXIS_POLES[axisKey] || {};
  const leftCode = axisKey[0];
  const rightCode = axisKey[1];
  const leftPct = axisResult.leftPercent;
  const rightPct = axisResult.rightPercent;
  const dominantLeft = leftPct >= rightPct;
  const dominantCode = dominantLeft ? leftCode : rightCode;
  const dominantPct = dominantLeft ? leftPct : rightPct;
  const dominantPole = poles[dominantCode] || {};
  const confidence = CONFIDENCE_LABELS[axisResult.confidence] || {};

  return (
    <article className={`result-axis-row pos-${pos}`}>
      <div className="result-axis-row-head">
        <span className={dominantLeft ? 'is-dominant' : 'is-subdued'}><strong className={`mbti-letter pos-${pos}`}>{leftCode}</strong>{poles[leftCode]?.th}</span>
        <span className={dominantLeft ? 'is-subdued' : 'is-dominant'}><strong className={`mbti-letter pos-${pos}`}>{rightCode}</strong>{poles[rightCode]?.th}</span>
      </div>
      <div className="result-axis-track" aria-hidden="true">
        <span className="result-axis-mid"></span>
        <span
          className="result-axis-fill"
          style={dominantLeft ? { left: 0, width: `${leftPct}%` } : { right: 0, width: `${rightPct}%` }}
        ></span>
      </div>
      <div className="result-axis-caption">
        <strong>{dominantCode} เอน {dominantPct}%</strong>
        {confidence.th && <span className="result-axis-confidence">{confidence.th}</span>}
      </div>
      {dominantPole.hint && <p className="result-axis-hint">{dominantPole.hint}</p>}
    </article>
  );
}

function ResultManagerSection({ id, userName, type }) {
  const watchOut = type.blindspots?.[0] || '';
  return (
    <ResultReportSection id={id} number="03" title={`แนวทางทำงาน`} kicker="Manager operating guide">
      <div className="manager-guide-grid result-guide-grid">
        <ManagerGuideCard icon="target" title="มอบหมายงาน" body={type.bestWhen} />
        <ManagerGuideCard icon="chat" title="สื่อสาร" body={type.comm} />
        <ManagerGuideCard icon="wave" title="ให้คำติชม" body={type.feedback} />
        <ManagerGuideCard icon="shield" title="จุดที่ควรระวัง" body={watchOut} />
      </div>
    </ResultReportSection>
  );
}

function ManagerGuideCard({ icon, title, body }) {
  return (
    <article className="manager-guide-card">
      <div className="manager-guide-icon">
        <Icon name={icon} size={20} />
      </div>
      <h3>{title}</h3>
      <p>{body}</p>
    </article>
  );
}

function ResultGrowthSection({ id, type }) {
  return (
    <ResultReportSection id={id} number="04" title="การเติบโตในมุมของคุณ" kicker="Growth notes">
      <div className="result-growth-grid">
        <ResultInfoList title="จุดที่ควรระวัง" items={type.blindspots.slice(0, 3)} icon="shield" />
        <ResultInfoList title="วิธีทำงานกับฉัน" items={type.workWithMe.slice(0, 4)} icon="users" />
        <ResultInfoList title="แนวทางพัฒนา" items={type.growthTips.slice(0, 3)} icon="compass" />
      </div>
      <div className="result-reminder">
        <Icon name="star" size={22} />
        <p>{type.reminder}</p>
      </div>
    </ResultReportSection>
  );
}

function ResultReportSection({ id, number, title, kicker, children }) {
  return (
    <section className="result-report-section" id={id}>
      <div className="result-report-section-head">
        <span>{number}</span>
        <div>
          <div className="result-section-intro-eyebrow">{kicker}</div>
          <h2>{title}</h2>
        </div>
      </div>
      {children}
    </section>
  );
}

function ResultInfoList({ title, items, icon }) {
  return (
    <div className="result-info-list">
      <h3><Icon name={icon} size={18} /> {title}</h3>
      <ul>
        {items.map((item, i) => <li key={i}>{item}</li>)}
      </ul>
    </div>
  );
}

function Disclaimer() {
  return (
    <div className="disclaimer-block">
      <div className="disclaimer-label">หมายเหตุ</div>
      <p>ผลนี้สะท้อนแนวโน้มจากสถานการณ์จำลอง ใช้เพื่อทำความเข้าใจสไตล์การทำงานเท่านั้น ไม่ควรใช้ตัดสินใจจ้างงาน เลื่อนตำแหน่ง หรือคัดออก</p>
    </div>
  );
}
