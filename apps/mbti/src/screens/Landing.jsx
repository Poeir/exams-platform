import { useState } from 'react';
import { Icon, PrimaryButton } from '../components.jsx';
import { withBase } from '../lib/base.js';

export function Landing({ onStart }) {
  const [showAbout, setShowAbout] = useState(false);

  return (
    <div>
      <section className="start-wrap">
        <div className="start-bg"></div>
        <div className="start-floaters" aria-hidden="true">
          <span className="start-floater f1"><Icon name="chat" size={22} /></span>
          <span className="start-floater f2"><Icon name="sparkles" size={26} /></span>
          <span className="start-floater f3"><Icon name="target" size={20} /></span>
          <span className="start-floater f4"><Icon name="bolt" size={22} /></span>
        </div>

        <div className="start-card">
          <div className="start-mascot start-mascot--team">
            <img src={withBase('/mascots/gon_team.png')} alt="" />
          </div>

          <h1 className="start-title">
            เข้าใจวิธีทำงาน<br />
            ของคนในทีม<em>ให้ชัดขึ้น</em>
          </h1>
          <p className="start-sub">
            ตอบสถานการณ์ทำงานทั่วไป เพื่อได้ผลสรุปสั้น ๆ สำหรับเข้าใจสไตล์การทำงาน การสื่อสาร และการให้ feedback ได้ตรงขึ้น
          </p>

          <div className="start-cta">
            <PrimaryButton onClick={onStart}>
              เริ่มเลย
              <Icon name="arrow-right" size={18} />
            </PrimaryButton>
          </div>

        </div>
      </section>

      {showAbout && (
        <div className="start-about">
          <div className="start-about-card">
            <div className="start-about-steps">
              <AboutStep num="01" mascot="clipboard" title="Quiz" desc="ตอบสถานการณ์ทำงาน" />
              <AboutStep num="02" mascot="cards" title="สถานการณ์งาน" desc="ประชุม, เส้นตาย, คำติชม" />
              <AboutStep num="03" mascot="chart" title="ผลลัพธ์" desc="คำอธิบายและแนวทางทำงานร่วมกัน" />
            </div>
            <div className="start-about-diff">
              <div className="start-about-diff-col">
                <strong>แบบทดสอบบุคลิกทั่วไป</strong>
                "คุณเป็นคนชอบวางแผนไหม?" - ตอบตามภาพลักษณ์ที่อยากเป็น แล้วได้ผลยาวแต่ใช้ต่อยาก
              </div>
              <div className="start-about-diff-col is-good">
                <strong>Workplace Behavior Profile</strong>
                "งานสำคัญมีข้อมูลไม่ครบ คุณจะจัดการอย่างไร" - ตอบจาก tradeoff ที่เจอจริงในการทำงาน
              </div>
            </div>

            <div className="start-about-trust">
              <div className="start-about-trust-eyebrow">ทำไมเราเชื่อในผลลัพธ์นี้</div>
              <p>
                แบบทดสอบบุคลิกในอินเทอร์เน็ตส่วนใหญ่ให้คุณเลือกว่า "เป็นคนแบบ A หรือ B"
                ซึ่งทำให้คนมักตอบตามภาพที่อยากให้คนอื่นเห็น มากกว่าพฤติกรรมจริงในที่ทำงาน
                เราจึงออกแบบต่างไป — ทุกข้อในแบบประเมินคือสถานการณ์งานที่คุณน่าจะเคยเจอ
                เช่น ประชุมที่ทุกคนเงียบ คำติชมที่ฟังแล้วยังไม่แน่ใจ หรือคำขอด่วนก่อนเส้นตาย
                แล้วเราถามว่าในจังหวะแบบนั้นคุณจะทำอะไร เพราะวิธีที่คนเลือกตอบเวลาต้องตัดสินใจจริง
                สะท้อนสไตล์การทำงานได้ตรงกว่าการเดาภาพรวมของตัวเอง
              </p>
              <p>
                เราไม่ได้คิดคะแนนทุกข้อเท่ากันด้วย — ข้อที่แยกประเภทคนได้ชัดกว่ามีน้ำหนักในผลรวมมากกว่า
                และถ้าผลของคุณในแกนไหนอยู่ใกล้กลาง ระบบจะบอกตรง ๆ ว่า <em>"คุณยืดหยุ่นทั้งสองสไตล์"</em>
                ไม่บังคับให้คุณเป็นฝั่งใดฝั่งหนึ่ง
              </p>
              <div className="start-about-trust-refs">
                อ้างอิงแนวทางออกแบบจากมาตรฐาน APA ด้านการประเมินทางจิตวิทยา
                และงานวิจัยด้านการประเมินพฤติกรรมในที่ทำงาน
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AboutStep({ num, mascot, title, desc }) {
  return (
    <div className="start-about-step">
      <div className="start-about-step-img"><img src={withBase(`/mascots/${mascot}.png`)} alt="" /></div>
      <div className="start-about-step-num">STEP {num}</div>
      <div className="start-about-step-title">{title}</div>
      <div className="start-about-step-desc">{desc}</div>
    </div>
  );
}

export function Purpose({ onContinue, onBack }) {
  return (
    <div className="purpose-wrap">
      <div className="purpose-panel">
        <div className="purpose-mascot">
          <img src={withBase('/mascots/chart.png')} alt="" />
        </div>
        <div className="purpose-eyebrow">ก่อนเริ่ม</div>
        <h1>แบบประเมินนี้ใช้เพื่อเข้าใจวิธีทำงาน ไม่ใช่ตัดสินคน</h1>
        <p className="purpose-lead">
          ผลลัพธ์เป็นแนวโน้มจากสถานการณ์จำลอง ใช้เป็นจุดเริ่มต้นสำหรับคุยเรื่องการมอบหมายงาน การสื่อสาร feedback และการทำงานร่วมกัน โปรดตัดสินใจจากประสบการณ์จริงในการทำงาน ไม่ใช่ภาพลักษณ์ที่อยากเป็น หรือวิธีที่คิดว่าน่าจะถูกต้องที่สุดในสถานการณ์นั้น ๆ
        </p>


        <div className="purpose-actions">
          <button className="btn-link" onClick={onBack}>
            <Icon name="arrow-left" size={16} /> กลับ
          </button>
          <PrimaryButton onClick={onContinue}>
            รับทราบและเริ่มต่อ
            <Icon name="arrow-right" size={16} />
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function PurposeItem({ icon, title, body }) {
  return (
    <div className="purpose-item">
      <div className="purpose-item-icon">
        <Icon name={icon} size={20} />
      </div>
      <div>
        <h3>{title}</h3>
        <p>{body}</p>
      </div>
    </div>
  );
}
