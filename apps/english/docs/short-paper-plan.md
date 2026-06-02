# แผนเพิ่ม Paper เวอร์ชั่นสั้น 15 นาที (short15)

> สถานะ: ทำ routing/selection แล้ว (2026-06-02) — เหลือ content (Phase B) + CEFR
> ข้อสมมติ: เวอร์ชั่นสั้นเป็น **reading-only** (Part 5–7) ตาม scaffold `VERSIONS.short` เดิม — ถ้าจะมี listening ต้องเพิ่มงาน audio (ดูหมายเหตุท้ายไฟล์)

> **Decision update (2026-06-02):** ไม่เพิ่มคอลัมน์ `variant` ใน schema — ระบุ paper สั้น**จากชื่อ paper** แทน (convention เดียวกับ section ที่ใช้ชื่อ "Part N"): ชื่อที่มีคำว่า "short" หรือ "สั้น" = ชุดสั้น ผ่าน `paperVariant()` ใน `server/src/shape.js`; `GET /api/papers` ส่ง field `variant: 'full' | 'short'` ให้ client/เว็บแม่ใช้เลือกชุด **ข้อระวัง: rename paper = เปลี่ยนชุด**. Entry link คือ `/exam/full` กับ `/exam/short` — แต่ละอันเปิดมาเจอ landing ของฉบับนั้น (`/` เป็น alias ของฉบับเต็ม) ส่วน **flow ที่รันจริง** (ข้ามหน้า audio ไหม) ยัง derive จากเนื้อหา paper ที่โหลดมาเสมอ — แยกกัน: ชื่อบอก "ชุดไหน", เนื้อหาบอก "ต้องมีจอฟังไหม" (รองรับ launch token ของเว็บแม่อัตโนมัติ)

## บริบท / สิ่งที่ค้นพบ

ระบบเป็น multi-paper อยู่แล้วเกือบทั้งสาย แต่มี 3 จุดที่ assume ว่ามี paper เดียว:

| จุด | ที่อยู่ | ปัญหา |
|---|---|---|
| Default paper = ใบล่าสุด | `server/src/routes/attempts.js:138` (anonymous fallback), `src/state/ExamContext.jsx:117` (`papers[0]`) | seed paper ใหม่ → หน้า public สลับไปใช้ paper สั้นทันที |
| เกณฑ์ CEFR absolute /50 | `server/src/cefr.js` (`levelFor(correctTotal)`) | paper 15–20 ข้อ ทำเต็มก็ได้แค่ Elementary |
| Frontend ไม่ผูก version → paper | `ExamContext.jsx` (`VERSIONS`, `loadExam`) | `short` scaffold มีอยู่แต่ปิด (`SHORT_ENABLED=false`), minutes hardcode |

ของที่ใช้ได้เลยไม่ต้องแตะ:
- `POST /api/sessions` บังคับ `paper_id` อยู่แล้ว → เว็บแม่ชี้ paper สั้นได้ทันที, `time_limit_min` fallback ของ paper
- `seedBundle` upsert ราย paper ไม่กระทบใบเดิม
- `scoreAnswers` ทำงานต่อ-paper, paper ไม่มี listening ก็ผ่าน (0/0)
- Webhook payload มี `paper_id` → เว็บแม่แยกได้ว่าผลมาจากชุดไหน
- `Results.jsx` normalize คะแนนเป็น % แล้ว (band 0–100) → ไม่ขึ้นกับจำนวนข้อ

---

## Phase A — Server: paper selection + CEFR (ต้อง deploy ก่อน seed paper ใหม่)

- [x] ~~**Schema:** เพิ่ม `variant` บน `Paper`~~ → **ยกเลิก** ใช้ชื่อ paper แทน: `paperVariant(name)` ใน `shape.js` + `GET /api/papers` ส่ง `variant: 'full' | 'short'`
- [x] ~~`seedCore.js`: รับ `paper.variant`~~ → ไม่ต้องทำ (ไม่มีคอลัมน์ใหม่ — แค่ตั้งชื่อ paper สั้นให้มีคำว่า "Short")
- [x] **Default selection:** `/attempts/anonymous` ไม่มี `paper_id` → เลือกใบล่าสุดที่ `variant = 'full'` ก่อน, fallback ใบล่าสุด — seed paper สั้นแล้วหน้า public ไม่สลับ
- [x] ~~Backfill `variant = 'full'`~~ → ไม่ต้องทำ (paper เดิมชื่อ "English Competency Test" → full อยู่แล้ว)
- [ ] **CEFR เป็น %:** `levelFor(correct, max)` → คิด `round(correct/max*100)` เทียบ band 0–30 / 31–48 / 49–66 / 67–82 / 83–100 (mirror `LEVEL_GUIDE` ใน `Results.jsx:9`) + จูน label ให้ตรงกัน (server ว่า Beginner, Results ว่า Novice — เลือกชุดเดียว)
- [ ] อัปเดตจุดเรียกใน `attempts.js` → `levelFor(correctTotal, maxTotal)`
- [ ] ~~`/api/sessions` รับ `variant`~~ → เว็บแม่หา id ของชุดสั้นได้จาก `GET /api/papers` (ใบที่ `variant: 'short'`) หรือ hardcode `paper_id` ตรง ๆ
- [ ] (เผื่ออยากได้) webhook payload เพิ่ม `paper_variant` ข้าง `paper_id`

## Phase B — Content: สร้าง paper สั้น

- [ ] เขียน bundle JSON ชุดสั้น (`{ papers: [{ paper, sections }] }`): `id` คงที่เช่น `paper_short15_v1`, `time_limit_min: 15`, **ชื่อ paper ต้องมีคำว่า "Short"** (ตัวกำหนด `variant`) และเป็น reading-only คือ**ไม่มี section Part 1–4** (ตัวกำหนดว่า flow ข้ามหน้า audio)
- [ ] **ชื่อ section ต้องเป็น `Part 5` / `Part 6` / `Part 7`** — ทั้ง `scoreAnswers` (`scoring.js:30`) และ `buildExam` parse part number จากชื่อ ไม่ match = ข้ามข้อเงียบ ๆ
- [ ] ขนาดแนะนำ: ~15–20 ข้อ (Vocab ~6, Grammar ~6, Reading 1–2 passage) กระจาย `cefr_level` ให้ครบช่วงที่อยากแยก
- [ ] Seed ผ่าน admin "Seed from JSON" → verify ใน admin SPA + ยิง `GET /api/papers` เช็คว่า 2 ใบอยู่ครบ
- [ ] Sanity check: เข้า public landing แล้วยังได้ชุดเต็ม (ยืนยันว่า Phase A กันไว้สำเร็จ)

## Phase C — Frontend: เปิด short version

- [x] เปิด `SHORT_ENABLED = true` (`VERSIONS.minutes` กลายเป็นแค่ fallback เมื่อ paper ไม่มี `time_limit_min`)
- [x] `loadExam`: anonymous mode เลือก paper จาก `listPapers()` ตาม `variant` ของ version ที่ขอ (แทน `papers[0]`) + re-load เมื่อ version เปลี่ยน (Tweaks panel)
- [x] **Session mode (เว็บแม่ launch): derive version จาก paper ที่ consume มา** — ทุกการโหลด derive จาก `partsBySection(exam, 'listening')` → ว่าง = `short` → `buildFlow` ข้าม audio check/listening อัตโนมัติ
- [x] `examTotalSeconds` (และ duration บน Landing) อ่านจาก `paper.time_limit_min` ก่อน, fallback `VERSIONS`
- [x] Routing: `/exam/full` + `/exam/short` เปิดมาเจอ landing ของฉบับนั้น (`/` = alias ฉบับเต็ม); refresh ใน exam กลับมาที่ overview
- [ ] Copy หน้า Landing + Results ให้สื่อว่าเป็น screening สั้น
- [x] เช็ค `src/data/exam.test.js` — เพิ่มเคส bundle ที่ไม่มี Part 1–4 (+ `paperVariant` ใน `shape.test.js`)

## Phase D — สัญญากับเว็บแม่ (contract)

ฝั่งเว็บแม่เปลี่ยนแค่ค่าใน body เดียว — flow เดิมทั้งหมด:

```
POST /api/sessions            (X-Api-Key: PARENT_API_KEY เดิม)
{ "paper_id": "paper_short15_v1",   ← id ชุดสั้น (หาได้จาก GET /api/papers: ใบที่ variant='short')
  "user_ref": "...",
  "callback_url": "...",
  "time_limit_min": 15 }      ← ไม่ส่งก็ได้ fallback เป็นของ paper
→ { launch_url, attempt, ... }  เปิด launch_url เหมือนเดิม
   (launch_url ไม่มี segment version — engine ดูจากเนื้อหา paper เองว่า flow สั้นหรือเต็ม)
```

- Webhook กลับมา shape เดิมเป๊ะ — แยกชุดจาก `paper_id`
- หมายเหตุให้เว็บแม่: `max_total` ของชุดสั้นจะน้อยกว่า (≈15–20 ไม่ใช่ 50) และ `cefr_level/label` คิดจาก % แล้ว เทียบข้ามชุดได้
- [ ] อัปเดต README ส่วน session flow + `openapi.js` (`/sessions` รับ `variant`)

## ลำดับ deploy (สำคัญ)

1. Phase A ขึ้นก่อน (กัน default paper เพี้ยน + CEFR ใหม่)
2. ค่อย seed paper สั้น (Phase B)
3. Frontend Phase C
4. แจ้ง contract เว็บแม่ (Phase D) — ฝั่งแม่เริ่มยิงได้ตั้งแต่จบข้อ 2 เลยถ้าใช้ `paper_id` ตรง ๆ

## ความเสี่ยง / หมายเหตุ

1. **เปลี่ยน `levelFor` กระทบชุดเต็มด้วย** — boundary เดิม (เช่น 16/50) กับ % (32%) คลาดกันเล็กน้อยที่ขอบ band; attempt เก่าที่ snapshot แล้วไม่ recompute (ผลอยู่ใน row แล้ว)
2. ถ้าอนาคตจะมี listening ในชุดสั้น: `PART_AUDIO` ใน `src/data/exam.js:4` hardcode mp3 ราย part → ต้องย้าย audio path ลง DB (column บน section) ก่อน
3. อย่ารัน seed ชุดสั้นก่อน Phase A ขึ้น production — หน้า public จะสลับเป็นชุดสั้นทันที
