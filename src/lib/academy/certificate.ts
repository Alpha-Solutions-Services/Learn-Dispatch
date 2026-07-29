export function certificateHtml(row: {
  certificate_no: string;
  student_name: string;
  student_email: string;
  batch_code: string | null;
  modules_completed: number;
  issued_at: string;
}) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"/><title>Certificate ${row.certificate_no}</title>
<style>
body{font-family:Georgia,serif;background:#0b1220;color:#edf2f8;padding:40px}
.card{max-width:800px;margin:0 auto;border:2px solid #38a3ff;padding:48px;background:linear-gradient(180deg,#0f1829,#05080f);text-align:center}
h1{font-size:28px;letter-spacing:.08em;margin:0}
.sub{color:#6a8caf;margin-top:8px}
.name{font-size:34px;margin:28px 0 8px;color:#5bc8ff}
.meta{font-size:14px;color:#8fb4d4;line-height:1.6}
@media print{body{background:#fff;color:#111}.card{border-color:#222;background:#fff}.name{color:#0b4a7a}}
</style></head>
<body>
<div class="card">
  <p class="sub">ALPHA FREIGHT NETWORK · LEARN DISPATCH</p>
  <h1>CERTIFICATE OF COMPLETION</h1>
  <p class="sub">Professional Truck Dispatcher Training</p>
  <p class="name">${row.student_name}</p>
  <p class="meta">
    Email: ${row.student_email}<br/>
    Batch: ${row.batch_code || "—"} · Modules completed: ${row.modules_completed}<br/>
    Certificate No. <strong>${row.certificate_no}</strong><br/>
    Issued ${new Date(row.issued_at).toLocaleDateString()}
  </p>
  <p class="sub" style="margin-top:32px">Muhammad Mikran Sandhu · Course Author</p>
</div>
</body></html>`;
}
