# แผนรวม Database: mbti-personality + english-test บน Azure SQL ก้อนเดียว

> สถานะ: Phase 1 ✅ + Phase 2 ✅ ทำงานจริงบน localhost แล้ว (2026-06-02) — Phase 2 ครบ 100% (user_ref ถูก drop แล้ว) — เหลือ Phase 4 hardening และ replay ทั้งหมดบน Azure SQL จริง
> Engine ปลายทางที่เลือก: **SQL Server / Azure SQL** (mbti อยู่กับที่, ย้าย english มา)

## บริบท / สิ่งที่ค้นพบ

ทั้งสอง service ใช้ **Prisma Client** เหมือนกัน (query layer เป็น provider-agnostic) แต่ปัจจุบันยิงคนละ engine:

| | mbti-personality | english-test |
|---|---|---|
| Query layer | Prisma | Prisma |
| Engine | **SQL Server / Azure SQL** (`sqlserver`) | **PostgreSQL** (`postgresql`) |
| ID type | `UniqueIdentifier` (GUID) | `String` (text id จากไฟล์ export) |
| JSON | `NVARCHAR(MAX)` + `JSON.stringify`/`parse` ใน app | native `Json` |
| Timestamp | `DateTimeOffset` | `Timestamptz` |

> ไฟล์ `migrations/*.sql` (Postgres dialect) และ `pg.Pool` db.js ที่เคยเห็นเป็นของเก่าค้าง — runtime จริงคือ Prisma ทั้งคู่

## เป้าหมายปลายทาง

- Azure SQL database **1 ก้อน** — ทั้งสอง service ตั้ง `DATABASE_URL` ชี้ที่เดียวกัน
- ทั้งคู่ใช้ Prisma `provider = "sqlserver"`
- ตาราง `subjects` เป็นแกนกลางร่วม (identity); ที่เหลือแยกตามโดเมน
  - mbti: `assessment_subjects` → `subjects`, `assessment_attempts`, `assessment_results`
  - english: `papers`, `sections`, `items`, `attempts`

## 3 Blocker (เรียงตามความหนัก)

1. **Prisma `Json` ไม่รองรับ SQL Server** — english ใช้ native `Json` 5 ฟิลด์ (`tags`, `options`, `extras`, `answers`, `result`) ต้องแปลงเป็น `String @db.NVarChar(Max)` + stringify/parse ใน app (งานหลัก)
2. **สอง Prisma project ชี้ DB เดียว** — แต่ละ project มี `_prisma_migrations` + คิดว่าเป็นเจ้าของทั้ง DB → ต้องตัดสิน ownership
3. **SQL Server cascade-path** — ห้ามหลาย cascade path ชนตารางเดียว → ใช้ `onDelete: NoAction` เมื่อชน (mbti เจอมาแล้ว)

---

## Phase 0 — เตรียม + ตัดสิน schema ownership

1. Provision Azure SQL database เดียว (เช่น `gofive_assessments`)
2. โมเดล ownership (เลือก **A**):
   - **A. Owner เดียว (แนะนำ):** repo หนึ่งเป็นเจ้าของ migration ของตารางร่วม รัน `prisma migrate` ที่เดียว; อีก service ใช้ `prisma db pull` + `generate` แล้ว query อย่างเดียว → ได้ ledger `_prisma_migrations` ฟรี
   - B. แยก SQL Server schema (`mbti.*`/`english.*`/`shared.*`) + Prisma multiSchema (ไว้ทำตอนทีมโต)

---

## Phase 1 — ย้าย english ขึ้น SQL Server (ยังแยกตารางเดิม)  ← "รวม DB" สำเร็จที่เฟสนี้

ไฟล์ที่แตะ: `server/prisma/schema.prisma`, `server/src/json.js` (ใหม่), `src/shape.js`, `src/webhook.js`, `src/seedCore.js`, `src/routes/items.js`, `src/routes/attempts.js`

- [x] สลับ provider `postgresql` → `sqlserver`
- [x] แปลง native types: `@db.Timestamptz(6)` → `@db.DateTimeOffset`
- [x] **String PK/FK/unique ต้อง bound length** (`@db.VarChar(n)`) — ไม่งั้นชน index key limit ของ SQL Server (900 bytes); ข้อความยาวใช้ `@db.NVarChar(Max)`
- [x] `Json` 5 ฟิลด์ → `String @db.NVarChar(Max)` + helper `toDbJson`/`fromDbJson` (`server/src/json.js`)
- [x] ย้าย CHECK (`status IN (...)`) + partial index → SQL Server filtered index ใน migration SQL
- [x] ตั้ง migration ตามโมเดล A
- [x] Re-seed content จาก `papers_export_1_full.json` (ไม่ต้อง migrate ข้อมูล content)
- [ ] Migrate ข้อมูล live เฉพาะ `attempts` (ถ้ามีของจริง)
- [x] ชี้ `DATABASE_URL` ของ english ไปก้อนเดียวกับ mbti → verify (`npm run server` + mbti `npm run api:smoke`)

---

## Phase 2 — รวม identity เป็น `subjects` + แยก SQL Schema namespaces (เป้าหมาย C1)

**ตัดสินใจแล้ว (2026-06-02):** แยกความเป็นเจ้าของตารางด้วย **SQL Server schema** แทน prefix ชื่อตาราง:

```
shared.subjects                          ← ตารางกลาง (ยกมาจาก assessment_subjects)
mbti.attempts, mbti.results              ← ของ mbti (เดิม assessment_attempts/_results ใน dbo)
english.papers/sections/items/attempts   ← ของ english (เดิมอยู่ dbo)
dbo._prisma_migrations                   ← ledger
```

เหตุผล: ชื่อสั้นไม่ต้อง prefix ซ้ำ และ Prisma multiSchema (GA แล้ว) จัดการเฉพาะ schema ที่ประกาศใน `schemas = [...]` → **ปิดความเสี่ยง `db push` ของ repo หนึ่งลบตารางของอีก repo ถาวร**

- [x] ทั้งสอง repo: เปิด multiSchema — datasource เพิ่ม `schemas`, ทุก model ใส่ `@@schema(...)`
  - english: `schemas = ["english", "shared"]`
  - mbti: `schemas = ["mbti", "shared"]`
- [x] ย้ายตารางเดิมด้วย `ALTER SCHEMA ... TRANSFER dbo.xxx` (ข้อมูลอยู่ครบ — **ห้ามปล่อย Prisma generate rename เอง** เพราะมันจะ drop/create) + `sp_rename` ตัด prefix `assessment_`
- [x] Ownership: **english เป็นเจ้าของ migration ledger ของ `english` + `shared`** (มี `_prisma_migrations` อยู่แล้ว); mbti จัดการ schema `mbti` ผ่าน diff-script (`prisma migrate diff` + `db execute`) และประกาศ `shared.subjects` ใน schema.prisma แบบ read-declare (ห้าม push)
- [x] english: เพิ่ม `subject_id` FK → `shared.subjects` ใน `english.attempts`
- [x] Backfill: `attempts.user_ref` → row ใน `subjects` (`source_system='english'`, `external_user_id=user_ref`) แล้วเซ็ต `subject_id`; row ที่ `user_ref` null = anonymous
- [x] เช็ก cascade-path (`onDelete: NoAction` ถ้าชน)
- [x] Deprecate `user_ref` — **drop แล้ว (2026-06-02)**: identity ใช้ `subject_id` ทางเดียว; parent ส่ง `external_user_id`+`source_system`(+`email`,`display_name` snapshot) แบบเดียวกับ mbti, `user_ref` เหลือเป็น legacy alias ใน request เท่านั้น; webhook ส่ง `subject_id`+`source_system`+`external_user_id`; `sqlserver-constraints.sql` ถูกยุบเข้า migration `20260602050000` (รวม filtered launch_token index — `@unique` ถูกถอดออกจาก schema, โค้ดใช้ `findFirst`) → DB ใหม่ใช้แค่ `migrate deploy`

---

## Phase 3 (ถ้าต้องการ) — รวม `attempts` เป็นตารางเดียว hybrid

> ✅ ก้าวแรกทำแล้ว (2026-06-02): **ยุบ `mbti.results` เข้า `mbti.attempts`** (เดิม 1:1 ผ่าน
> `attempt_id` unique) — mbti ใช้ single-table shape เดียวกับ `english.attempts` แล้ว
> ผ่าน `mbti-personality/prisma/merge-results.sql`; ฝั่งโค้ด completion เหลือ UPDATE เดียว
> มี `status='started'` filter กัน double-complete แทน unique constraint เดิม; result อ้างด้วย
> attempt id; API shape เดิม เหลือของ Phase 3 จริง ๆ แค่รวมสองตาราง attempts ข้าม service

- คอลัมน์จริง: `subject_id`, `test_type`, `status`, `token_hash`, `paper_id`(FK), `mbti_code`/`cefr_level`, timestamps
- JSON (NVARCHAR(MAX)): `detail`, `result`
- normalize status (`started→in_progress`, `submitted→completed`), token เป็น hash ทั้งคู่
- refactor query ทั้งสอง service

---

## Phase 4 — Hardening

- เขียนกฎ ownership ของ `subjects` ลง CLAUDE.md ทั้งสอง repo
- รัน smoke test ทั้งสอง service ชี้ DB เดียว
- Backup ก่อน drop `user_ref`

---

## ความเสี่ยงที่ต้องระวัง

1. งานหนักสุด = Phase 1 (Json → NVARCHAR(MAX)) เพราะกระทบ shape/webhook/seed/routes
2. อย่าให้สอง Prisma project รัน `migrate dev` ใส่ DB เดียวพร้อมกัน → ใช้ ownership A
3. Content ของ english ไม่ต้อง migrate (re-seed จากไฟล์) — เฉพาะ `attempts` ที่ต้องย้ายของจริง
4. ตอนเปลี่ยน engine: prisma migrations เดิม (postgres) ใช้กับ sqlserver ไม่ได้ → baseline ใหม่
