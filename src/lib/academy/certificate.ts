import { createHash } from "crypto";
import QRCode from "qrcode";
import { COURSE } from "@/lib/course/curriculum";
import { getAppUrl } from "@/lib/supabase/env";

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Stable timestamp for hashing — Postgres/Supabase return formats differ from Date.toISOString(). */
export function normalizeCertIssuedAt(issuedAt: string): string {
  const d = new Date(issuedAt);
  if (Number.isNaN(d.getTime())) return issuedAt.trim();
  return d.toISOString();
}

export function computeCertificateHash(input: {
  certificate_no: string;
  student_email: string;
  student_name: string;
  modules_completed: number;
  issued_at: string;
}): string {
  const secret =
    process.env.CERTIFICATE_SIGNING_SECRET?.trim() ||
    process.env.CRON_SECRET?.trim() ||
    "learn-dispatch-afn-cert";
  const payload = [
    input.certificate_no.trim().toUpperCase(),
    input.student_email.trim().toLowerCase(),
    input.student_name.trim(),
    String(Number(input.modules_completed) || 0),
    normalizeCertIssuedAt(input.issued_at),
  ].join("|");
  return createHash("sha256")
    .update(`${secret}:${payload}`)
    .digest("hex")
    .slice(0, 32)
    .toUpperCase();
}

export async function certificateHtml(
  row: {
    certificate_no: string;
    student_name: string;
    student_email: string;
    batch_code: string | null;
    modules_completed: number;
    issued_at: string;
    integrity_hash?: string | null;
  },
  opts?: { autoPrint?: boolean },
) {
  const base = getAppUrl().replace(/\/$/, "");
  const logoUrl = `${base}/alpha-logo.png`;
  const signatureUrl = `${base}/signatures/author-signature.svg`;
  const verifyUrl = `${base}/verify/${encodeURIComponent(row.certificate_no)}`;
  let qrUrl = "";
  try {
    qrUrl = await QRCode.toDataURL(verifyUrl, {
      width: 148,
      margin: 2,
      color: { dark: "#5bc8ff", light: "#0b1220" },
      errorCorrectionLevel: "M",
    });
  } catch {
    qrUrl = "";
  }
  const issued = new Date(row.issued_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const hash =
    row.integrity_hash ||
    computeCertificateHash({
      certificate_no: row.certificate_no,
      student_email: row.student_email,
      student_name: row.student_name,
      modules_completed: row.modules_completed,
      issued_at: row.issued_at,
    });
  const name = escapeHtml(row.student_name);
  const email = escapeHtml(row.student_email);
  const batch = escapeHtml(row.batch_code || "—");
  const certNo = escapeHtml(row.certificate_no);
  const hashDisp = escapeHtml(hash);
  const hoursLine = escapeHtml(COURSE.credentialLine);
  const autoPrint = opts?.autoPrint
    ? `<script>window.addEventListener('load',function(){setTimeout(function(){window.print()},400)});</script>`
    : "";
  const qrBlock = qrUrl
    ? `<img src="${qrUrl}" alt="Verification QR"/>`
    : `<a href="${escapeHtml(verifyUrl)}" style="font-size:10px;color:#5bc8ff;word-break:break-all">${escapeHtml(verifyUrl)}</a>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Certificate ${certNo}</title>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<link rel="preconnect" href="https://fonts.googleapis.com"/>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;700&family=DM+Sans:wght@400;500;600&display=swap" rel="stylesheet"/>
<style>
  @page { size: A4 landscape; margin: 10mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    min-height: 100vh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    padding-top: 64px;
    background: #05080f;
    color: #edf2f8;
    font-family: "DM Sans", system-ui, sans-serif;
  }
  .toolbar {
    position: fixed;
    top: 12px;
    right: 12px;
    left: 12px;
    z-index: 20;
    display: flex;
    flex-wrap: wrap;
    justify-content: flex-end;
    gap: 8px;
  }
  .toolbar button, .toolbar a {
    border: 0;
    border-radius: 10px;
    padding: 10px 14px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    text-decoration: none;
    background: #38a3ff;
    color: #05080f;
  }
  .toolbar a.secondary { background: #1a2438; color: #cfe6f8; }
  .sheet {
    position: relative;
    width: min(1120px, 100%);
    aspect-ratio: 297 / 210;
    max-height: 92vh;
    overflow: hidden;
    background:
      radial-gradient(ellipse 70% 50% at 50% -10%, rgba(56,163,255,0.16), transparent 55%),
      repeating-linear-gradient(0deg, rgba(56,163,255,0.035) 0 1px, transparent 1px 7px),
      repeating-linear-gradient(90deg, rgba(56,163,255,0.03) 0 1px, transparent 1px 7px),
      linear-gradient(165deg, #0e1628 0%, #070b14 60%, #05080f 100%);
    border: 1px solid rgba(56,163,255,0.5);
    box-shadow: 0 24px 80px rgba(0,0,0,0.55);
  }
  .corner {
    position: absolute;
    width: 42px;
    height: 42px;
    border-color: rgba(91,200,255,0.55);
    border-style: solid;
    z-index: 2;
  }
  .corner.tl { top: 10px; left: 10px; border-width: 2px 0 0 2px; }
  .corner.tr { top: 10px; right: 10px; border-width: 2px 2px 0 0; }
  .corner.bl { bottom: 10px; left: 10px; border-width: 0 0 2px 2px; }
  .corner.br { bottom: 10px; right: 10px; border-width: 0 2px 2px 0; }
  .inner-frame {
    position: absolute;
    inset: 16px;
    border: 1px solid rgba(91,200,255,0.28);
    pointer-events: none;
  }
  .inner-frame-2 {
    position: absolute;
    inset: 22px;
    border: 1px solid rgba(56,163,255,0.12);
    pointer-events: none;
  }
  .watermark {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    opacity: 0.045;
    pointer-events: none;
  }
  .watermark img { width: min(460px, 48%); }
  .content {
    position: relative;
    z-index: 3;
    height: 100%;
    display: grid;
    grid-template-rows: auto 1fr auto;
    padding: 36px 48px 28px;
    text-align: center;
  }
  .brand img {
    width: 68px;
    height: 68px;
    border-radius: 14px;
    border: 1px solid rgba(56,163,255,0.4);
    background: #0a101c;
    object-fit: contain;
  }
  .eyebrow {
    margin: 10px 0 0;
    font-size: 11px;
    letter-spacing: 0.28em;
    text-transform: uppercase;
    color: #5bc8ff;
    font-weight: 600;
  }
  h1 {
    margin: 10px 0 0;
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: clamp(26px, 3.6vw, 40px);
    font-weight: 700;
    letter-spacing: 0.14em;
    text-transform: uppercase;
    color: #fff;
  }
  .course {
    margin: 6px 0 0;
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: clamp(15px, 2vw, 20px);
    color: #8ec8ef;
  }
  .hours {
    margin: 8px 0 0;
    display: inline-block;
    padding: 5px 12px;
    border-radius: 999px;
    border: 1px solid rgba(56,163,255,0.35);
    background: rgba(56,163,255,0.08);
    font-size: 11px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #a8d4f5;
  }
  .attest { margin: 18px 0 0; font-size: 13px; color: #6a8caf; letter-spacing: 0.04em; }
  .name {
    margin: 8px 0 6px;
    font-family: "Cormorant Garamond", Georgia, serif;
    font-size: clamp(30px, 4.8vw, 48px);
    font-weight: 700;
    color: #5bc8ff;
    line-height: 1.1;
    overflow-wrap: anywhere;
  }
  .completed {
    margin: 0 auto;
    max-width: 620px;
    font-size: 14px;
    color: #a8c4dc;
    line-height: 1.55;
  }
  .footer {
    display: grid;
    grid-template-columns: 1.1fr auto 1.1fr;
    gap: 18px;
    align-items: end;
    width: 100%;
    margin-top: 18px;
  }
  .sig { text-align: left; border-top: 1px solid rgba(91,200,255,0.35); padding-top: 8px; }
  .sig img { height: 42px; width: auto; margin-bottom: 2px; filter: brightness(1.15); }
  .sig .who { font-family: "Cormorant Garamond", Georgia, serif; font-size: 15px; color: #cfe6f8; }
  .sig .role { font-size: 11px; color: #6a8caf; margin-top: 2px; }
  .qr-wrap { display: flex; flex-direction: column; align-items: center; gap: 6px; }
  .qr-wrap img {
    width: 96px;
    height: 96px;
    border-radius: 10px;
    border: 1px solid rgba(56,163,255,0.35);
    background: #0b1220;
  }
  .qr-wrap span { font-size: 9px; letter-spacing: 0.12em; text-transform: uppercase; color: #6a8caf; }
  .ids { text-align: right; font-size: 11px; color: #8fb4d4; line-height: 1.65; }
  .ids strong { color: #edf2f8; word-break: break-word; }
  .hash {
    margin-top: 4px;
    font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 9px;
    letter-spacing: 0.04em;
    color: #5a7a98;
    word-break: break-all;
  }
  .legal {
    margin-top: 12px;
    font-size: 10px;
    color: #5a7a98;
    letter-spacing: 0.06em;
    overflow-wrap: anywhere;
  }
  .legal a { color: #5bc8ff; text-decoration: none; }

  /* Mobile / narrow: portrait card, no clipped landscape sheet */
  @media (max-width: 820px) {
    body {
      align-items: flex-start;
      padding: 72px 12px 28px;
      min-height: 100dvh;
    }
    .toolbar {
      justify-content: stretch;
    }
    .toolbar button, .toolbar a {
      flex: 1 1 auto;
      text-align: center;
      padding: 11px 12px;
      font-size: 13px;
    }
    .sheet {
      aspect-ratio: auto;
      max-height: none;
      width: 100%;
      overflow: visible;
      border-radius: 16px;
    }
    .corner { width: 28px; height: 28px; }
    .corner.tl { top: 8px; left: 8px; }
    .corner.tr { top: 8px; right: 8px; }
    .corner.bl { bottom: 8px; left: 8px; }
    .corner.br { bottom: 8px; right: 8px; }
    .inner-frame { inset: 10px; }
    .inner-frame-2 { inset: 14px; }
    .watermark img { width: min(280px, 70%); }
    .content {
      height: auto;
      grid-template-rows: auto auto auto;
      gap: 20px;
      padding: 28px 18px 20px;
    }
    .brand img {
      width: 56px;
      height: 56px;
      border-radius: 12px;
    }
    .eyebrow {
      font-size: 9px;
      letter-spacing: 0.16em;
      padding: 0 4px;
      line-height: 1.45;
    }
    h1 {
      font-size: clamp(22px, 7vw, 28px);
      letter-spacing: 0.08em;
      line-height: 1.15;
    }
    .course { font-size: 15px; }
    .hours {
      font-size: 10px;
      padding: 5px 10px;
      letter-spacing: 0.05em;
      max-width: 100%;
      line-height: 1.35;
      white-space: normal;
      border-radius: 999px;
    }
    .attest { margin-top: 4px; font-size: 12px; }
    .name {
      font-size: clamp(28px, 9vw, 36px);
      margin: 6px 0;
    }
    .completed {
      font-size: 13px;
      max-width: none;
      padding: 0 2px;
    }
    .footer {
      grid-template-columns: 1fr;
      gap: 16px;
      align-items: stretch;
      margin-top: 8px;
    }
    .sig {
      text-align: center;
      order: 2;
    }
    .sig img { margin-left: auto; margin-right: auto; }
    .qr-wrap { order: 1; }
    .qr-wrap img { width: 112px; height: 112px; }
    .ids {
      text-align: left;
      order: 3;
      font-size: 12px;
      padding: 10px 12px;
      border-radius: 12px;
      border: 1px solid rgba(56,163,255,0.2);
      background: rgba(8,14,24,0.55);
    }
    .hash { font-size: 10px; }
    .legal {
      margin-top: 14px;
      font-size: 10px;
      line-height: 1.5;
      letter-spacing: 0.02em;
    }
  }

  @media print {
    .toolbar { display: none !important; }
    body { background: #fff; padding: 0; align-items: center; }
    .sheet {
      box-shadow: none;
      max-height: none;
      width: 100%;
      aspect-ratio: 297 / 210;
      overflow: hidden;
      border-radius: 0;
      border-color: #1a3a5c;
      background:
        repeating-linear-gradient(0deg, rgba(20,60,100,0.04) 0 1px, transparent 1px 7px),
        repeating-linear-gradient(90deg, rgba(20,60,100,0.03) 0 1px, transparent 1px 7px),
        #fff;
    }
    .content {
      height: 100%;
      grid-template-rows: auto 1fr auto;
      gap: 0;
      padding: 36px 48px 28px;
    }
    .footer {
      grid-template-columns: 1.1fr auto 1.1fr;
      gap: 18px;
      align-items: end;
    }
    .sig, .qr-wrap, .ids { order: unset; text-align: inherit; }
    .sig { text-align: left; }
    .ids {
      text-align: right;
      border: 0;
      background: transparent;
      padding: 0;
    }
    h1, .name { color: #0b2440; }
    .name { color: #0b4a7a; }
    .eyebrow, .course, .hours { color: #1a6aa8; }
    .completed, .ids, .sig .who { color: #243447; }
    .attest, .sig .role, .legal, .hash, .qr-wrap span { color: #5a6a7a; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button type="button" onclick="window.print()">Save / Print PDF</button>
    <a class="secondary" href="${verifyUrl}">Verify online</a>
  </div>
  <div class="sheet">
    <div class="corner tl"></div><div class="corner tr"></div>
    <div class="corner bl"></div><div class="corner br"></div>
    <div class="inner-frame"></div>
    <div class="inner-frame-2"></div>
    <div class="watermark" aria-hidden="true"><img src="${logoUrl}" alt=""/></div>
    <div class="content">
      <div class="brand">
        <img src="${logoUrl}" alt="${escapeHtml(COURSE.brand)}"/>
        <p class="eyebrow">${escapeHtml(COURSE.brand)} · ${escapeHtml(COURSE.product)}</p>
        <h1>Certificate of Completion</h1>
        <p class="course">${escapeHtml(COURSE.title)}</p>
        <p class="hours">${hoursLine}</p>
      </div>

      <div>
        <p class="attest">This is to certify that</p>
        <p class="name">${name}</p>
        <p class="completed">
          has successfully completed the ${escapeHtml(COURSE.title)} program
          (${row.modules_completed} module${row.modules_completed === 1 ? "" : "s"} recorded)
          through Alpha Freight Network · Learn Dispatch.
        </p>
      </div>

      <div>
        <div class="footer">
          <div class="sig">
            <img src="${signatureUrl}" alt="Signature"/>
            <p class="who">${escapeHtml(COURSE.author)}</p>
            <p class="role">Course Author · Instructor of Record</p>
          </div>
          <div class="qr-wrap">
            ${qrBlock}
            <span>Scan to verify</span>
          </div>
          <div class="ids">
            <div>Recipient: <strong>${email}</strong></div>
            <div>Batch: <strong>${batch}</strong></div>
            <div>Certificate No. <strong>${certNo}</strong></div>
            <div>Issued <strong>${escapeHtml(issued)}</strong></div>
            <div class="hash">Audit hash · ${hashDisp}</div>
          </div>
        </div>
        <p class="legal">
          Issued by Alpha Solutions Services LLC · Alpha Freight Network ·
          Verify at <a href="${verifyUrl}">${escapeHtml(verifyUrl.replace(/^https?:\/\//, ""))}</a>
          · ${escapeHtml(COURSE.supportEmail)}
        </p>
      </div>
    </div>
  </div>
  ${autoPrint}
</body>
</html>`;
}
