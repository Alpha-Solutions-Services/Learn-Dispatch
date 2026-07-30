import { COURSE } from "@/lib/course/curriculum";
import { getAppUrl } from "@/lib/supabase/env";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function certificateHtml(row: {
  certificate_no: string;
  student_name: string;
  student_email: string;
  batch_code: string | null;
  modules_completed: number;
  issued_at: string;
}) {
  const base = getAppUrl().replace(/\/$/, "");
  const logoUrl = `${base}/alpha-logo.png`;
  const verifyUrl = `${base}/student/certificates`;
  const issued = new Date(row.issued_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const name = escapeHtml(row.student_name);
  const email = escapeHtml(row.student_email);
  const batch = escapeHtml(row.batch_code || "—");
  const certNo = escapeHtml(row.certificate_no);

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Certificate ${certNo}</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<style>
  @page { size: landscape; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 24px;
    background: #05080f;
    color: #edf2f8;
    font-family: "Segoe UI", system-ui, sans-serif;
  }
  .frame {
    position: relative;
    width: min(960px, 100%);
    aspect-ratio: 1.414 / 1;
    max-height: 92vh;
    padding: 18px;
    background:
      radial-gradient(ellipse 80% 60% at 50% 0%, rgba(56,163,255,0.14), transparent 55%),
      linear-gradient(165deg, #0e1628 0%, #070b14 55%, #05080f 100%);
    border: 1px solid rgba(56,163,255,0.45);
    box-shadow: 0 24px 80px rgba(0,0,0,0.55);
  }
  .frame::before {
    content: "";
    position: absolute;
    inset: 8px;
    border: 1px solid rgba(91,200,255,0.28);
    pointer-events: none;
  }
  .frame::after {
    content: "";
    position: absolute;
    inset: 14px;
    border: 1px solid rgba(56,163,255,0.12);
    pointer-events: none;
  }
  .inner {
    position: relative;
    z-index: 1;
    height: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 28px 40px 24px;
    text-align: center;
  }
  .watermark {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.05;
    pointer-events: none;
    z-index: 0;
  }
  .watermark img { width: min(420px, 55%); }
  .brand {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 10px;
  }
  .brand img {
    width: 72px;
    height: 72px;
    border-radius: 14px;
    border: 1px solid rgba(56,163,255,0.35);
    background: #0a101c;
    object-fit: contain;
  }
  .eyebrow {
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: #5bc8ff;
    font-weight: 600;
  }
  h1 {
    margin: 8px 0 0;
    font-family: Georgia, "Times New Roman", serif;
    font-size: clamp(22px, 3.4vw, 34px);
    font-weight: 700;
    letter-spacing: 0.12em;
    text-transform: uppercase;
    color: #fff;
  }
  .course {
    margin: 6px 0 0;
    font-family: Georgia, serif;
    font-size: clamp(14px, 1.8vw, 18px);
    color: #8ec8ef;
  }
  .attest {
    margin: 18px 0 0;
    font-size: 13px;
    color: #6a8caf;
    letter-spacing: 0.04em;
  }
  .name {
    margin: 10px 0 4px;
    font-family: Georgia, serif;
    font-size: clamp(28px, 4.5vw, 44px);
    font-weight: 700;
    color: #5bc8ff;
    line-height: 1.15;
  }
  .completed {
    margin: 0;
    font-size: 14px;
    color: #a8c4dc;
    max-width: 520px;
    line-height: 1.5;
  }
  .meta {
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    gap: 16px;
    align-items: end;
    width: 100%;
    margin-top: 20px;
  }
  .sig {
    text-align: left;
    border-top: 1px solid rgba(91,200,255,0.35);
    padding-top: 10px;
    min-width: 0;
  }
  .sig .who {
    font-family: Georgia, serif;
    font-size: 14px;
    color: #cfe6f8;
  }
  .sig .role {
    font-size: 11px;
    color: #6a8caf;
    margin-top: 2px;
  }
  .seal {
    width: 88px;
    height: 88px;
    border-radius: 50%;
    border: 2px solid rgba(56,163,255,0.65);
    box-shadow: inset 0 0 0 4px rgba(11,18,32,0.9), 0 0 0 1px rgba(91,200,255,0.25);
    background:
      radial-gradient(circle at 35% 30%, rgba(91,200,255,0.25), transparent 50%),
      linear-gradient(145deg, #123056, #0a1528);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    justify-self: center;
  }
  .seal strong {
    font-size: 13px;
    letter-spacing: 0.12em;
    color: #5bc8ff;
  }
  .seal span {
    font-size: 9px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #8fb4d4;
    margin-top: 2px;
  }
  .ids {
    text-align: right;
    font-size: 11px;
    color: #8fb4d4;
    line-height: 1.65;
  }
  .ids strong { color: #edf2f8; }
  .verify {
    margin-top: 14px;
    font-size: 10px;
    color: #5a7a98;
    letter-spacing: 0.04em;
  }
  .verify a { color: #5bc8ff; text-decoration: none; }
  @media print {
    body { background: #fff; padding: 0; }
    .frame {
      box-shadow: none;
      background: #fff;
      border-color: #1a3a5c;
      max-height: none;
      width: 100%;
    }
    .frame::before { border-color: #2a5a8a; }
    h1, .name { color: #0b2440; }
    .name { color: #0b4a7a; }
    .eyebrow, .course, .seal strong { color: #1a6aa8; }
    .completed, .ids, .sig .who { color: #243447; }
    .attest, .sig .role, .verify { color: #5a6a7a; }
  }
</style>
</head>
<body>
  <div class="frame">
    <div class="watermark" aria-hidden="true">
      <img src="${logoUrl}" alt=""/>
    </div>
    <div class="inner">
      <div class="brand">
        <img src="${logoUrl}" alt="${escapeHtml(COURSE.brand)}"/>
        <p class="eyebrow">${escapeHtml(COURSE.brand)} · ${escapeHtml(COURSE.product)}</p>
        <h1>Certificate of Completion</h1>
        <p class="course">${escapeHtml(COURSE.title)}</p>
      </div>

      <div>
        <p class="attest">This is to certify that</p>
        <p class="name">${name}</p>
        <p class="completed">
          has successfully completed the ${escapeHtml(COURSE.title)} program
          (${row.modules_completed} module${row.modules_completed === 1 ? "" : "s"} recorded)
          under Alpha Freight Network · Learn Dispatch.
        </p>
      </div>

      <div style="width:100%">
        <div class="meta">
          <div class="sig">
            <p class="who">${escapeHtml(COURSE.author)}</p>
            <p class="role">Course Author · Instructor of Record</p>
          </div>
          <div class="seal" aria-hidden="true">
            <strong>AFN</strong>
            <span>Verified</span>
          </div>
          <div class="ids">
            <div>Recipient: <strong>${email}</strong></div>
            <div>Batch: <strong>${batch}</strong></div>
            <div>Certificate No. <strong>${certNo}</strong></div>
            <div>Issued <strong>${escapeHtml(issued)}</strong></div>
          </div>
        </div>
        <p class="verify">
          Authenticity · <a href="${verifyUrl}">${escapeHtml(verifyUrl.replace(/^https?:\/\//, ""))}</a>
          · ${escapeHtml(COURSE.supportEmail)}
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}
