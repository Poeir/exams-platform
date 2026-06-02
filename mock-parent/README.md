# mock-parent — เครื่องมือเล่นบทระบบแม่ (empeo)

ใช้ทดสอบ integration ฝั่ง parent โดยไม่ต้องมีระบบ empeo จริง คู่กับเอกสาร
`../empeo-integration.html`

| ไฟล์ | คืออะไร |
|---|---|
| `gofive-parent-system.postman_collection.json` | Postman collection ครบทุก endpoint ฝั่ง parent ของทั้งสอง engine — import แล้วรันข้อ 1 (Get Papers) ก่อนเสมอ เพื่อให้ `paper_id_full` / `paper_id_short` ถูกเซฟอัตโนมัติ |
| `webhook-listener.mjs` | ตัวรับ webhook ตัวอย่าง รันที่ `:4000/callback` — ตรวจลายเซ็น `X-Signature` ด้วย `PARENT_API_KEY` แล้ว log payload ที่ได้รับ |

## วิธีใช้

```bash
# 1. รัน gateway (จาก repo root)
npm start                                   # :3000

# 2. รัน webhook listener (อีก terminal)
PARENT_API_KEY=dev-parent-key node mock-parent/webhook-listener.mjs   # :4000

# 3. import Postman collection แล้วยิงตามลำดับเลขข้อ
#    (ค่า default ของตัวแปร {{base}} = http://localhost:3000,
#     {{parent_api_key}} = dev-parent-key — แก้ในแท็บ Variables ได้)
```

Webhook จาก engine จะเด้งเข้า listener ตอน submit/complete — ดู payload
และผลตรวจลายเซ็นได้ใน console ของ listener
