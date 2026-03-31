import { useState, useRef, useEffect } from "react";
import QRCode from "qrcode";

function toLocalISODate(d = new Date()) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function startOfMonthISO(ref = new Date()) {
  return toLocalISODate(new Date(ref.getFullYear(), ref.getMonth(), 1));
}

function isInMonth(isoDate, ref = new Date()) {
  if (!isoDate || isoDate.length < 7) return false;
  return isoDate.slice(0, 7) === toLocalISODate(ref).slice(0, 7);
}

function yesterdayISODate(ref = new Date()) {
  const d = new Date(ref);
  d.setDate(d.getDate() - 1);
  return toLocalISODate(d);
}

/** Patient list display date e.g. "Mar 26, 2025" */
function formatPatientDisplayDate(d = new Date()) {
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(d);
}

function parseLooseDate(displayStr) {
  const t = Date.parse(displayStr);
  if (Number.isNaN(t)) return null;
  return new Date(t);
}

function displayDateInMonth(displayStr, ref = new Date()) {
  const dt = parseLooseDate(displayStr);
  if (!dt) return false;
  return dt.getFullYear() === ref.getFullYear() && dt.getMonth() === ref.getMonth();
}

function parseInvoiceDateToISO(display) {
  const dt = parseLooseDate(display);
  return dt ? toLocalISODate(dt) : null;
}

function makeSeedPatients() {
  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth();
  const iso = (yy, mmIdx, dd) => toLocalISODate(new Date(yy, mmIdx, dd));
  return [
    { id: 1, name: "James Whitfield", age: 34, phone: "(312) 555-0182", email: "j.whitfield@email.com", lastVisit: "Jan 14, 2025", nextAppt: "Mar 22, 2025", status: "Active", source: "Online", joinedAt: iso(y - 2, 5, 10) },
    { id: 2, name: "Sandra Okonkwo", age: 52, phone: "(312) 555-0247", email: "s.okonkwo@email.com", lastVisit: "Feb 3, 2025", nextAppt: "—", status: "Overdue", source: "Referral", joinedAt: iso(y - 1, 8, 1) },
    { id: 3, name: "Tyler Marsh", age: 28, phone: "(312) 555-0391", email: "t.marsh@email.com", lastVisit: "Mar 1, 2025", nextAppt: "Sep 1, 2025", status: "Active", source: "Word of mouth", joinedAt: iso(y, mo, 2) },
    { id: 4, name: "Maria Delgado", age: 41, phone: "(312) 555-0504", email: "m.delgado@email.com", lastVisit: "Dec 10, 2024", nextAppt: "—", status: "Overdue", source: "Online", joinedAt: iso(y - 1, 11, 5) },
    { id: 5, name: "Kevin Brooks", age: 19, phone: "(312) 555-0618", email: "k.brooks@email.com", lastVisit: "Mar 10, 2025", nextAppt: "Mar 25, 2025", status: "Active", source: "Word of mouth", joinedAt: iso(y, mo, 5) },
    { id: 6, name: "Priya Nair", age: 45, phone: "(312) 555-0733", email: "p.nair@email.com", lastVisit: formatPatientDisplayDate(now), nextAppt: "Aug 20, 2025", status: "Active", source: "Referral", joinedAt: iso(y - 3, 2, 20) },
    { id: 7, name: "Daniel Fox", age: 60, phone: "(312) 555-0856", email: "d.fox@email.com", lastVisit: "Nov 5, 2024", nextAppt: "—", status: "Inactive", source: "Online", joinedAt: iso(y - 4, 4, 1) },
  ];
}

const initialAppointmentsBare = [
  { id: "appt-1", time: "8:00 AM", patient: "Kevin Brooks", type: "Cleaning", status: "confirmed" },
  { id: "appt-2", time: "9:30 AM", patient: "Priya Nair", type: "Check-up", status: "confirmed" },
  { id: "appt-3", time: "11:00 AM", patient: "James Whitfield", type: "Filling", status: "no-show" },
  { id: "appt-4", time: "1:00 PM", patient: "Sandra Okonkwo", type: "X-Ray", status: "confirmed" },
  { id: "appt-5", time: "2:30 PM", patient: "Tyler Marsh", type: "Whitening", status: "confirmed" },
  { id: "appt-6", time: "4:00 PM", patient: "Maria Delgado", type: "Cleaning", status: "pending" },
];

function makeSeedAppointments() {
  const today = toLocalISODate();
  return initialAppointmentsBare.map((a) => ({ ...a, date: today }));
}

const apptTimeOptions = ["8:00 AM","9:00 AM","9:30 AM","10:00 AM","11:00 AM","12:00 PM","1:00 PM","2:00 PM","2:30 PM","3:00 PM","4:00 PM","4:30 PM","5:00 PM"];
const apptTypes = ["Cleaning","Check-up","Filling","X-Ray","Whitening","Consult","Crown","Root canal","Other"];
const apptStatuses = ["confirmed", "pending", "no-show"];
const patientSources = ["Word of mouth", "Online", "Referral", "Walk-in", "Other"];
const patientStatuses = ["Active", "Overdue", "Inactive"];
const invoicePaymentStatuses = ["pending", "paid", "overdue"];
/** How payment reminders are delivered for this invoice. */
const invoiceReminderViaOptions = [
  { value: "sms", label: "Phone (SMS)" },
  { value: "email", label: "Email" },
];

const initialReminders = [
  { id: 1, patient: "Sandra Okonkwo", phone: "(312) 555-0247", message: "Hi Sandra! You're overdue for your 6-month check-up at Ivory Insight. Book your spot: ivoryinsight.com/book", sent: "Today, 9:02 AM", status: "delivered" },
  { id: 2, patient: "Maria Delgado", phone: "(312) 555-0504", message: "Hey Maria! Don't forget your appointment tomorrow at 4:00 PM. Reply CONFIRM to confirm or CANCEL to reschedule.", sent: "Today, 9:00 AM", status: "delivered" },
  { id: 3, patient: "Kevin Brooks", phone: "(312) 555-0618", message: "Hi Kevin! Reminder: you have a cleaning tomorrow at 8:00 AM at Ivory Insight. See you then!", sent: "Yesterday, 5:00 PM", status: "delivered" },
  { id: 4, patient: "Daniel Fox", phone: "(312) 555-0856", message: "Hi Daniel! We miss you — it's been over 4 months. Ready to book your next visit? ivoryinsight.com/book", sent: "Yesterday, 3:30 PM", status: "read" },
  { id: 5, patient: "Priya Nair", phone: "(312) 555-0733", message: "Hi Priya! Your check-up is confirmed for tomorrow at 9:30 AM. See you at Ivory Insight!", sent: "Yesterday, 5:01 PM", status: "delivered" },
];

function makeSeedInvoices() {
  const thisMo = formatPatientDisplayDate(new Date());
  return [
    { id: "INV-0041", patient: "Kevin Brooks", service: "Routine Cleaning", date: thisMo, amount: 180, status: "paid", remindVia: "sms" },
    { id: "INV-0040", patient: "Priya Nair", service: "Check-up & X-Ray", date: "Feb 20, 2025", amount: 320, status: "paid", remindVia: "sms" },
    { id: "INV-0039", patient: "James Whitfield", service: "Tooth Filling", date: "Jan 14, 2025", amount: 450, status: "overdue", remindVia: "sms" },
    { id: "INV-0038", patient: "Sandra Okonkwo", service: "X-Ray", date: "Feb 3, 2025", amount: 210, status: "pending", remindVia: "email" },
    { id: "INV-0037", patient: "Tyler Marsh", service: "Teeth Whitening", date: thisMo, amount: 550, status: "paid", remindVia: "sms" },
    { id: "INV-0036", patient: "Maria Delgado", service: "Crown Fitting", date: "Dec 10, 2024", amount: 1200, status: "overdue", remindVia: "email" },
    { id: "INV-0035", patient: "Daniel Fox", service: "Root Canal", date: "Nov 5, 2024", amount: 890, status: "paid", remindVia: "sms" },
  ];
}

/** Sample notifications for the header bell (can be wired to real events later). */
const headerNotifications = [
  { id: 1, title: "Today’s schedule", body: "You have 6 appointments on the books for today. First slot: 8:00 AM.", time: "Just now", accent: "blue" },
  { id: 2, title: "Overdue recall", body: "Sandra Okonkwo and Maria Delgado are overdue for a 6-month visit.", time: "32 min ago", accent: "amber" },
  { id: 3, title: "SMS delivered", body: "Reminder to Kevin Brooks for tomorrow’s cleaning was delivered.", time: "1 hr ago", accent: "green" },
  { id: 4, title: "Invoice pending", body: "INV-0038 ($210) is still pending payment.", time: "3 hr ago", accent: "amber" },
];

function makeSeedReviews() {
  const now = new Date();
  const y = now.getFullYear();
  const mo = now.getMonth();
  const isoD = (yy, mmIdx, dd) => toLocalISODate(new Date(yy, mmIdx, dd));
  const lab = (isoStr) => formatPatientDisplayDate(new Date(`${isoStr}T12:00:00`));
  const t1 = isoD(y, mo, 2);
  const t2 = isoD(y, mo, 5);
  const t3 = isoD(y, mo, 18);
  const t4 = isoD(y, mo - 1, 4);
  const t5 = isoD(y - 1, 10, 6);
  return [
    {
      id: 1,
      patient: "Tyler Marsh",
      phone: "(312) 555-0391",
      sentISO: t1,
      sentDate: lab(t1),
      status: "reviewed",
      rating: 5,
      snippet:
        "Best dental experience I've had. Super clean office and Dr. Sushma was amazing.",
      ownerReply: null,
      repliedAt: null,
    },
    {
      id: 2,
      patient: "Kevin Brooks",
      phone: "(312) 555-0618",
      sentISO: t2,
      sentDate: lab(t2),
      status: "reviewed",
      rating: 5,
      snippet:
        "Quick and painless. The online booking made it so easy. Highly recommend!",
      ownerReply: null,
      repliedAt: null,
    },
    {
      id: 3,
      patient: "Priya Nair",
      phone: "(312) 555-0733",
      sentISO: t3,
      sentDate: lab(t3),
      status: "pending",
      rating: null,
      snippet: null,
      ownerReply: null,
      repliedAt: null,
    },
    {
      id: 4,
      patient: "Sandra Okonkwo",
      phone: "(312) 555-0247",
      sentISO: t4,
      sentDate: lab(t4),
      status: "reviewed",
      rating: 4,
      snippet: "Great staff, very professional. Would definitely come back.",
      ownerReply: null,
      repliedAt: null,
    },
    {
      id: 5,
      patient: "Daniel Fox",
      phone: "(312) 555-0856",
      sentISO: t5,
      sentDate: lab(t5),
      status: "pending",
      rating: null,
      snippet: null,
      ownerReply: null,
      repliedAt: null,
    },
  ];
}

function initialsFromName(name) {
  const cleaned = name.trim().replace(/^Dr\.?\s+/i, "");
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** Top bar date: matches live clock (e.g. "Thu, Mar 26 2025"). */
function formatTopbarDate(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")}, ${get("month")} ${get("day")} ${get("year")}`;
}

/** Split "Jane Marie Smith" → firstName "Jane", lastName "Marie Smith". */
function parseFirstLastName(fullName) {
  const parts = String(fullName || "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
}

function phoneForPatientName(patientsList, fullName) {
  const needle = String(fullName || "").trim().toLowerCase();
  const row = patientsList.find((p) => p.name.trim().toLowerCase() === needle);
  return row?.phone ?? "";
}

function emailForPatientName(patientsList, fullName) {
  const needle = String(fullName || "").trim().toLowerCase();
  const row = patientsList.find((p) => p.name.trim().toLowerCase() === needle);
  const e = row?.email?.trim();
  if (!e || e === "—") return "";
  return e;
}

/** Same rule as “This Month → Returning”: active, joined before current month. */
function isReturningPatientForSchedule(patientsList, appointmentPatientName, startOfMonthISO) {
  const needle = String(appointmentPatientName || "").trim().toLowerCase();
  const p = patientsList.find((x) => x.name.trim().toLowerCase() === needle);
  if (!p) return false;
  return Boolean(
    p.status === "Active" && p.joinedAt && p.joinedAt < startOfMonthISO
  );
}

/**
 * Opens Gmail’s compose window in the browser (new tab). Uses the web app, not the system mail handler,
 * so Outlook is not launched. Guest must be signed into Gmail in that browser.
 */
function openGmailCompose({ to, subject, body, bcc }) {
  const maxLen = bcc ? 1650 : 1800;
  let bodyForMail = body;
  if (bodyForMail.length > maxLen) {
    bodyForMail =
      bodyForMail.slice(0, maxLen) +
      "\n\n…[Message trimmed for Gmail. Full text is still saved in Ivory Insight.]";
  }
  const u = new URL("https://mail.google.com/mail/u/0/");
  u.searchParams.set("view", "cm");
  u.searchParams.set("fs", "1");
  u.searchParams.set("to", to);
  u.searchParams.set("su", subject);
  u.searchParams.set("body", bodyForMail);
  if (bcc?.trim()) u.searchParams.set("bcc", bcc.trim());
  window.open(u.toString(), "_blank", "noopener,noreferrer");
}

function appendReminderCallbackToSms(text, practiceDisplayName, callbackPhone) {
  const phone = callbackPhone?.trim();
  if (!phone) return text;
  const practice = practiceDisplayName?.trim() || "Our office";
  const tail = `\n\n— ${practice}: ${phone}`;
  if (text.includes(phone)) return text;
  return text + tail;
}

function isMobileDevice() {
  return (
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
  );
}

function openSmsComposer(digits, body) {
  if (!digits || digits.replace(/\D/g, "").length < 10) return;
  const d = digits.replace(/\D/g, "");
  const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
  const sep = isIOS ? "&" : "?";
  window.location.href = `sms:${d}${sep}body=${encodeURIComponent(body)}`;
}

function isValidEmailFormat(s) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || "").trim());
}

/**
 * Default reminder body for unpaid / overdue invoices (SMS or email). Uses profile dentist & practice names.
 * @param {"sms"|"email"} channel
 * @param {string[]} [patientReplyEmails] — verified profile emails; shown in message / BCC
 * @param {string} [patientCallbackPhone] — from profile; shown for calls/texts back
 */
function buildDefaultInvoiceReminderMessage(
  firstName,
  lastName,
  practiceDisplayName,
  dentistDisplayName,
  inv,
  channel,
  patientReplyEmails = [],
  patientCallbackPhone = ""
) {
  const practice = practiceDisplayName?.trim() || "our practice";
  const dentist = dentistDisplayName?.trim() || "your dental team";
  const emails = [
    ...new Set(
      (patientReplyEmails || []).map((e) => String(e || "").trim()).filter(Boolean)
    ),
  ];
  const replyEmail = emails[0] || "";
  const emailListStr = emails.join(", ");
  const callbackPhone = patientCallbackPhone?.trim();
  const greeting =
    firstName || lastName
      ? `Hi ${[firstName, lastName].filter(Boolean).join(" ")}`.trim()
      : "Hello";
  const amt = typeof inv.amount === "number" ? inv.amount : Number(inv.amount);
  const amountStr = Number.isFinite(amt) ? amt.toLocaleString() : String(inv.amount);
  let contactHelp =
    channel === "email"
      ? `If anything doesn't look right, or you'd like to discuss a payment plan, reply to this email or call ${practice} — we're glad to help.`
      : `If anything doesn't look right, or you'd like to discuss a payment plan, just reply to this text or call ${practice} — we're glad to help.`;
  if (channel === "email" && emails.length) {
    contactHelp =
      emails.length === 1
        ? `If anything doesn't look right, or you'd like to discuss a payment plan, please reply directly to ${replyEmail} or call ${callbackPhone || practice} — we're glad to help.`
        : `If anything doesn't look right, or you'd like to discuss a payment plan, please reply to one of: ${emailListStr}. Or call ${callbackPhone || practice} — we're glad to help.`;
  } else if (channel === "sms" && callbackPhone) {
    contactHelp = `If anything doesn't look right, or you'd like to discuss a payment plan, call or text ${callbackPhone} or reach ${practice} — we're glad to help.`;
  }

  const reachBits = [];
  if (emails.length)
    reachBits.push(emails.length === 1 ? `Email: ${emails[0]}` : `Email: ${emailListStr}`);
  if (callbackPhone) reachBits.push(`Phone: ${callbackPhone}`);
  const reachFooter = reachBits.length ? `\n\n${reachBits.join(" · ")}` : "";

  return `${greeting}, thank you for choosing ${practice} for your dental care.

${dentist} and the team at ${practice} are reaching out with a courteous reminder that your account still shows an unpaid balance. If you've already submitted payment, please disregard this message — our records can take a short time to catch up. If the balance is still outstanding, we would be grateful if you could take care of it when you're able.

Invoice: ${inv.id} · ${inv.service} · $${amountStr} · ${inv.date}

${contactHelp}

With appreciation,
${dentist}
${practice}${reachFooter}`;
}

const style = `
  @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap');

  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #f8f8f6;
    --surface: #ffffff;
    --border: #e8e8e4;
    --border-light: #f0f0ec;
    --text: #0f0f0e;
    --muted: #8a8a84;
    --accent: #1a1a18;
    --green: #1a7a4a;
    --green-bg: #edf7f2;
    --red: #c0392b;
    --red-bg: #fdf1ef;
    --amber: #b45309;
    --amber-bg: #fef9ee;
    --blue: #1d4ed8;
    --blue-bg: #eff4ff;
  }

  body { font-family: 'DM Sans', sans-serif; background: var(--bg); color: var(--text); font-size: 14px; line-height: 1.5; }

  .app { display: flex; min-height: 100vh; }

  /* SIDEBAR */
  .sidebar {
    width: 220px; min-width: 220px; background: var(--surface); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; padding: 24px 0; position: sticky; top: 0; height: 100vh;
  }
  .logo { padding: 0 20px 28px; border-bottom: 1px solid var(--border-light); }
  .logo-mark { display: flex; align-items: center; gap: 8px; }
  .logo-icon { width: 28px; height: 30px; background: var(--text); border-radius: 7px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden; }
  .logo-icon svg { width: 16px; height: 16px; color: white; }
  .logo-icon img { width: 100%; height: 100%; object-fit: cover; }
  .logo-name { font-size: 13px; font-weight: 600; letter-spacing: -0.02em; }
  .logo-sub { font-size: 10px; color: var(--muted); font-family: 'DM Mono', monospace; margin-top: 1px; }

  .nav { padding: 16px 12px; flex: 1; }
  .nav-label { font-size: 10px; font-weight: 500; color: var(--muted); letter-spacing: 0.08em; text-transform: uppercase; padding: 0 8px; margin-bottom: 6px; margin-top: 16px; }
  .nav-item {
    display: flex; align-items: center; gap: 9px; padding: 8px 10px; border-radius: 7px;
    cursor: pointer; color: var(--muted); font-size: 13.5px; font-weight: 400; transition: all 0.12s; margin-bottom: 1px;
  }
  .nav-item:hover { background: var(--bg); color: var(--text); }
  .nav-item.active { background: var(--bg); color: var(--text); font-weight: 500; }
  .nav-item svg { width: 15px; height: 15px; flex-shrink: 0; }

  .sidebar-footer { padding: 16px 20px 0; border-top: 1px solid var(--border-light); }
  .doctor-info { display: flex; align-items: center; gap: 10px; }
  .doctor-avatar {
    width: 36px; height: 36px; border-radius: 50%; background: var(--text); color: white;
    display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600;
    flex-shrink: 0; overflow: hidden; object-fit: cover;
  }
  .doctor-avatar img { width: 100%; height: 100%; object-fit: cover; }
  .doctor-name { font-size: 12.5px; font-weight: 500; }
  .doctor-role { font-size: 11px; color: var(--muted); }

  /* MAIN */
  .main { flex: 1; overflow-x: hidden; min-width: 0; }

  .topbar {
    background: var(--surface); border-bottom: 1px solid var(--border);
    padding: 0 32px; height: 56px; display: flex; align-items: center; justify-content: space-between; gap: 12px;
    position: sticky; top: 0; z-index: 10;
  }
  .topbar-left { display: flex; align-items: center; gap: 10px; min-width: 0; flex: 1; }
  .page-title { font-size: 15px; font-weight: 600; letter-spacing: -0.02em; min-width: 0; }
  .topbar-right { display: flex; align-items: center; gap: 12px; flex-shrink: 0; }
  .date-badge { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); background: var(--bg); padding: 4px 10px; border-radius: 5px; border: 1px solid var(--border); }
  .notif-wrap { position: relative; }
  .notif-btn { width: 32px; height: 32px; border-radius: 7px; border: 1px solid var(--border); background: var(--surface); cursor: pointer; display: flex; align-items: center; justify-content: center; position: relative; color: var(--text); transition: background 0.12s, border-color 0.12s; }
  .notif-btn:hover { background: var(--bg); border-color: var(--text); }
  .notif-btn[aria-expanded="true"] { background: var(--bg); border-color: var(--text); }
  .notif-dot { width: 6px; height: 6px; background: var(--red); border-radius: 50%; position: absolute; top: 6px; right: 6px; pointer-events: none; }
  .notif-panel {
    position: absolute; top: calc(100% + 8px); right: 0; width: min(360px, calc(100vw - 48px));
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    box-shadow: 0 16px 40px rgba(15, 15, 14, 0.12), 0 0 1px rgba(15, 15, 14, 0.08);
    z-index: 100; overflow: hidden; animation: notifIn 0.16s ease-out;
  }
  @keyframes notifIn {
    from { opacity: 0; transform: translateY(-6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes notifInMobile {
    from { opacity: 0; transform: translateY(-8px); }
    to { opacity: 1; transform: translateY(0); }
  }
  .notif-panel-header { padding: 14px 16px 10px; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; gap: 10px; }
  .notif-panel-title { font-size: 13.5px; font-weight: 600; letter-spacing: -0.01em; }
  .notif-panel-sub { font-size: 10.5px; color: var(--muted); font-family: 'DM Mono', monospace; margin-top: 2px; }
  .notif-list { max-height: min(340px, 52vh); overflow-y: auto; }
  .notif-row {
    display: flex; gap: 12px; padding: 12px 16px; border-bottom: 1px solid var(--border-light);
    cursor: default; transition: background 0.1s;
  }
  .notif-row:last-child { border-bottom: none; }
  .notif-row:hover { background: var(--bg); }
  .notif-row-accent { width: 3px; border-radius: 2px; flex-shrink: 0; margin-top: 2px; align-self: stretch; min-height: 36px; }
  .notif-row-accent.blue { background: var(--blue); }
  .notif-row-accent.amber { background: var(--amber); }
  .notif-row-accent.green { background: var(--green); }
  .notif-row-body { flex: 1; min-width: 0; }
  .notif-row-title { font-size: 13px; font-weight: 600; margin-bottom: 4px; letter-spacing: -0.01em; }
  .notif-row-text { font-size: 12.5px; color: var(--muted); line-height: 1.45; }
  .notif-row-time { font-size: 10.5px; color: var(--muted); font-family: 'DM Mono', monospace; margin-top: 6px; }
  .notif-panel-footer { padding: 10px 16px; border-top: 1px solid var(--border-light); background: var(--bg); font-size: 11.5px; color: var(--muted); }

  .content { padding: 28px 32px; }

  /* STAT CARDS */
  .stats-row { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; margin-bottom: 28px; }
  .stat-card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 18px 20px; }
  .stat-label { font-size: 11.5px; color: var(--muted); font-weight: 500; margin-bottom: 8px; }
  .stat-value { font-size: 26px; font-weight: 600; letter-spacing: -0.03em; line-height: 1; margin-bottom: 6px; }
  .stat-sub { font-size: 11.5px; color: var(--muted); }
  .stat-sub span { font-weight: 500; }
  .stat-sub .up { color: var(--green); }
  .stat-sub .down { color: var(--red); }

  /* TWO COL */
  .two-col { display: grid; grid-template-columns: 1fr 340px; gap: 16px; }

  /* CARDS */
  .card { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
  .card-header { padding: 16px 20px; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .card-title { font-size: 13.5px; font-weight: 600; letter-spacing: -0.01em; }
  .card-action { font-size: 12px; color: var(--muted); cursor: pointer; background: none; border: none; font-family: inherit; padding: 0; }
  .card-action:hover { color: var(--text); }

  /* APPT LIST */
  .appt-item { display: flex; align-items: center; gap: 14px; padding: 12px 20px; border-bottom: 1px solid var(--border-light); transition: background 0.1s; }
  .appt-item:last-child { border-bottom: none; }
  .appt-item:hover { background: var(--bg); }
  .appt-time { font-family: 'DM Mono', monospace; font-size: 11.5px; color: var(--muted); width: 58px; flex-shrink: 0; }
  .appt-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
  .appt-info { flex: 1; min-width: 0; }
  .appt-name-row { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
  .appt-name { font-size: 13px; font-weight: 500; }
  .appt-returning-badge {
    font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em;
    color: #14532d; background: #ecfdf3; border: 1px solid #bbf7d0;
    padding: 2px 8px; border-radius: 999px; line-height: 1.2;
  }
  .appt-type { font-size: 11.5px; color: var(--muted); }
  .badge { font-size: 10.5px; font-weight: 500; padding: 3px 8px; border-radius: 5px; font-family: 'DM Mono', monospace; }
  .badge-green { background: var(--green-bg); color: var(--green); }
  .badge-red { background: var(--red-bg); color: var(--red); }
  .badge-amber { background: var(--amber-bg); color: var(--amber); }
  .badge-blue { background: var(--blue-bg); color: var(--blue); }

  .appt-actions { display: flex; align-items: center; gap: 8px; flex-shrink: 0; }
  .icon-btn {
    width: 30px; height: 30px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface);
    cursor: pointer; display: flex; align-items: center; justify-content: center; color: var(--muted);
    font-size: 16px; line-height: 1; transition: all 0.12s;
  }
  .icon-btn:hover { border-color: var(--red); color: var(--red); background: var(--red-bg); }

  /* PATIENT TABLE */
  .table-wrap { overflow-x: auto; }
  table { width: 100%; border-collapse: collapse; }
  thead th { font-size: 11px; font-weight: 500; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; padding: 10px 16px; text-align: left; border-bottom: 1px solid var(--border); background: var(--bg); }
  tbody tr { border-bottom: 1px solid var(--border-light); transition: background 0.1s; cursor: default; }
  tbody tr:last-child { border-bottom: none; }
  tbody tr:hover { background: var(--bg); }
  tbody td { padding: 12px 16px; font-size: 13px; vertical-align: middle; }
  .patient-name { font-weight: 500; }
  .mono { font-family: 'DM Mono', monospace; font-size: 12px; color: var(--muted); }

  /* SEARCH BAR */
  .search-row { display: flex; align-items: center; gap: 10px; margin-bottom: 16px; }
  .search-input { flex: 1; height: 36px; border: 1px solid var(--border); border-radius: 7px; padding: 0 12px 0 34px; font-size: 13px; font-family: 'DM Sans', sans-serif; background: var(--surface); color: var(--text); outline: none; }
  .search-input:focus { border-color: var(--text); }
  .search-wrap { position: relative; flex: 1; }
  .search-icon { position: absolute; left: 10px; top: 50%; transform: translateY(-50%); color: var(--muted); }
  .filter-btn { height: 36px; padding: 0 14px; border: 1px solid var(--border); border-radius: 7px; background: var(--surface); font-size: 13px; font-family: 'DM Sans', sans-serif; cursor: pointer; color: var(--muted); }
  .filter-btn:hover { color: var(--text); border-color: var(--text); }
  .filter-btn.active { color: var(--text); border-color: var(--text); background: var(--bg); font-weight: 500; }

  .patient-toolbar { padding: 0 16px; margin-top: 20px; margin-bottom: 16px; }
  .patient-toolbar .search-row { margin-bottom: 0; }
  .filter-panel {
    margin-top: 12px; padding: 14px 16px; background: var(--bg); border: 1px solid var(--border);
    border-radius: 8px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px 16px; align-items: end;
  }
  .filter-panel-actions { grid-column: 1 / -1; display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .filter-hint { font-size: 11.5px; color: var(--muted); }

  /* FORMS */
  .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .form-group { display: flex; flex-direction: column; gap: 5px; }
  .form-group label { font-size: 11.5px; font-weight: 500; color: var(--muted); }
  .form-input, .form-select {
    height: 36px; border: 1px solid var(--border); border-radius: 7px; padding: 0 12px; font-size: 13px;
    font-family: 'DM Sans', sans-serif; color: var(--text); background: var(--surface); outline: none;
  }
  .form-input:focus, .form-select:focus { border-color: var(--text); }
  .form-select { cursor: pointer; }
  .panel-form {
    padding: 16px 20px; background: var(--bg); border-bottom: 1px solid var(--border-light);
    display: flex; flex-direction: column; gap: 12px;
  }
  .panel-form-title { font-size: 12px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; }
  .btn-primary {
    height: 36px; padding: 0 16px; background: var(--text); color: white; border: none; border-radius: 7px;
    font-size: 13px; font-weight: 500; font-family: 'DM Sans', sans-serif; cursor: pointer; transition: opacity 0.15s;
  }
  .btn-primary:hover { opacity: 0.88; }
  .btn-ghost {
    height: 36px; padding: 0 14px; border: 1px solid var(--border); border-radius: 7px; background: var(--surface);
    font-size: 13px; font-family: 'DM Sans', sans-serif; cursor: pointer; color: var(--muted);
  }
  .btn-ghost:hover { color: var(--text); border-color: var(--text); }
  .btn-text-danger { font-size: 12px; color: var(--red); background: none; border: none; cursor: pointer; font-family: inherit; padding: 0; }
  .btn-text-danger:hover { text-decoration: underline; }

  /* CONFIRM MODAL */
  .modal-backdrop {
    position: fixed; inset: 0; background: rgba(15, 15, 14, 0.4); z-index: 200;
    display: flex; align-items: center; justify-content: center; padding: 24px;
  }
  .modal {
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
    width: 100%; max-width: 400px; padding: 24px 24px 20px;
    box-shadow: 0 20px 50px rgba(0,0,0,0.12);
  }
  .modal-title { font-size: 16px; font-weight: 600; letter-spacing: -0.02em; margin-bottom: 8px; }
  .modal-body { font-size: 14px; color: var(--muted); line-height: 1.5; margin-bottom: 22px; }
  .modal-actions { display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap; }
  .btn-modal-cancel {
    height: 38px; padding: 0 16px; border: 1px solid var(--border); border-radius: 8px;
    background: var(--surface); font-size: 13px; font-family: 'DM Sans', sans-serif; cursor: pointer; color: var(--text);
  }
  .btn-modal-cancel:hover { background: var(--bg); }
  .btn-modal-confirm {
    height: 38px; padding: 0 16px; border: none; border-radius: 8px;
    background: var(--text); color: white; font-size: 13px; font-weight: 500; font-family: 'DM Sans', sans-serif; cursor: pointer;
  }
  .btn-modal-confirm:hover { opacity: 0.9; }
  .btn-modal-confirm.danger { background: var(--red); }
  .btn-modal-confirm.danger:hover { opacity: 0.92; }

  .modal-textarea {
    width: 100%; min-height: 140px; resize: vertical; padding: 12px 14px; margin-bottom: 8px;
    border: 1px solid var(--border); border-radius: 8px; font-size: 13px; font-family: 'DM Sans', sans-serif;
    color: var(--text); background: var(--surface); line-height: 1.5; outline: none;
  }
  .modal.modal-reminder-composer {
    max-width: min(92vw, 720px);
    padding: 28px 28px 22px;
  }
  .modal.modal-reminder-composer .modal-textarea {
    min-height: 240px;
    font-size: 14px;
    line-height: 1.55;
  }
  .modal-textarea:focus { border-color: var(--text); }
  .modal-meta-line { font-size: 12.5px; color: var(--muted); margin-bottom: 12px; line-height: 1.45; }
  .modal-meta-line strong { color: var(--text); font-weight: 500; }

  /* REMINDERS */
  .reminder-item { padding: 16px 20px; border-bottom: 1px solid var(--border-light); }
  .reminder-item:last-child { border-bottom: none; }
  .reminder-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px; }
  .reminder-name { font-size: 13px; font-weight: 500; }
  .reminder-phone { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); }
  .reminder-msg { font-size: 12.5px; color: var(--muted); line-height: 1.5; background: var(--bg); border-radius: 6px; padding: 8px 10px; margin: 8px 0; border-left: 2px solid var(--border); }
  .reminder-meta { display: flex; align-items: center; justify-content: space-between; gap: 12px; flex-wrap: wrap; }
  .reminder-time { font-size: 11px; color: var(--muted); font-family: 'DM Mono', monospace; }
  .reminder-reply-toggle {
    font-size: 12px; font-weight: 500; color: var(--muted); background: var(--surface); border: 1px solid var(--border);
    border-radius: 6px; padding: 5px 10px; cursor: pointer; font-family: inherit;
    display: inline-flex; align-items: center; gap: 6px; transition: color 0.12s, border-color 0.12s, background 0.12s;
  }
  .reminder-reply-toggle:hover { color: var(--text); border-color: var(--text); background: var(--bg); }
  .reminder-reply-toggle[aria-expanded="true"] { color: var(--text); border-color: var(--text); background: var(--bg); }
  .reminder-chevron { width: 12px; height: 12px; flex-shrink: 0; transition: transform 0.18s ease; }
  .reminder-reply-toggle[aria-expanded="true"] .reminder-chevron { transform: rotate(180deg); }

  .reminder-compose-panel { margin-top: 12px; padding: 14px 14px 12px; background: var(--bg); border: 1px solid var(--border); border-radius: 8px; }
  .reminder-compose-label { font-size: 11px; font-weight: 600; color: var(--muted); text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 8px; }
  .reminder-textarea {
    width: 100%; min-height: 72px; resize: vertical; padding: 10px 12px; border: 1px solid var(--border); border-radius: 7px;
    font-size: 13px; font-family: 'DM Sans', sans-serif; color: var(--text); background: var(--surface); line-height: 1.45; outline: none; margin-bottom: 10px;
  }
  .reminder-textarea:focus { border-color: var(--text); }
  .reminder-compose-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
  .reminder-send-hint { font-size: 11px; color: var(--muted); }

  /* PROFILE */
  .profile-wrap { width: 100%; max-width: min(96vw, 920px); margin: 0 auto; }
  .profile-card { background: var(--surface); border: 1px solid var(--border); border-radius: 12px; overflow: hidden; }
  .reminder-email-row { display: flex; gap: 10px; align-items: center; margin-bottom: 10px; flex-wrap: wrap; }
  .reminder-email-row .form-input { flex: 1; min-width: 200px; max-width: none; }
  .verified-pill {
    font-size: 11px; font-weight: 500; color: var(--text); background: var(--bg); border: 1px solid var(--border);
    padding: 2px 8px; border-radius: 999px; white-space: nowrap;
  }
  .profile-section { padding: 22px 24px; border-bottom: 1px solid var(--border-light); }
  .profile-section:last-child { border-bottom: none; }
  .profile-photo-row { display: flex; align-items: flex-start; gap: 20px; flex-wrap: wrap; }
  .profile-avatar-lg {
    width: 88px; height: 88px; border-radius: 50%; background: var(--text); color: white;
    display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 600; overflow: hidden; flex-shrink: 0;
  }
  .profile-avatar-lg img { width: 100%; height: 100%; object-fit: cover; }
  .profile-photo-actions { display: flex; flex-direction: column; gap: 8px; flex: 1; min-width: 200px; }
  .file-input-hidden { position: absolute; width: 0; height: 0; opacity: 0; pointer-events: none; }

  /* INVOICES */
  .inv-amount { font-family: 'DM Mono', monospace; font-size: 13px; font-weight: 500; }
  .inv-id { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); }
  .send-btn { font-size: 11.5px; padding: 4px 10px; border: 1px solid var(--border); border-radius: 5px; background: var(--surface); cursor: pointer; font-family: 'DM Sans', sans-serif; color: var(--muted); transition: all 0.12s; }
  .send-btn:hover { border-color: var(--text); color: var(--text); }
  .inv-actions-cell { display: flex; align-items: center; justify-content: flex-end; gap: 8px; flex-wrap: wrap; }
  .inv-trash {
    width: 32px; height: 32px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface);
    cursor: pointer; display: inline-flex; align-items: center; justify-content: center; color: var(--muted);
    transition: all 0.12s; flex-shrink: 0;
  }
  .inv-trash:hover { border-color: var(--red); color: var(--red); background: var(--red-bg); }
  .inv-trash svg { width: 15px; height: 15px; }

  /* REVIEWS */
  .review-item { padding: 16px 20px; border-bottom: 1px solid var(--border-light); }
  .review-item:last-child { border-bottom: none; }
  .review-top { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 8px; }
  .review-name { font-size: 13px; font-weight: 500; }
  .review-date { font-family: 'DM Mono', monospace; font-size: 11px; color: var(--muted); margin-top: 2px; }
  .stars { display: flex; gap: 2px; }
  .star { font-size: 13px; }
  .review-snippet { font-size: 12.5px; color: var(--muted); line-height: 1.5; font-style: italic; background: var(--bg); padding: 8px 10px; border-radius: 6px; border-left: 2px solid var(--border); }
  .review-pending-msg { font-size: 12px; color: var(--amber); background: var(--amber-bg); padding: 6px 10px; border-radius: 6px; }
  .review-owner-reply {
    margin-top: 10px;
    padding: 10px 12px;
    background: linear-gradient(135deg, #f0f7ff 0%, #e8f4fc 100%);
    border-left: 3px solid #3b82f6;
    border-radius: 8px;
    font-size: 12.5px;
    line-height: 1.5;
    color: var(--text);
  }
  .review-owner-reply-label { font-size: 11px; font-weight: 600; color: #2563eb; text-transform: uppercase; letter-spacing: 0.04em; margin-bottom: 6px; }
  .review-reply-meta { font-size: 11px; color: var(--muted); margin-top: 8px; font-family: 'DM Mono', monospace; }
  .review-respond-panel { margin-top: 12px; padding-top: 12px; border-top: 1px solid var(--border-light); }
  .review-respond-toggle-wrap { margin-top: 4px; }
  .review-respond-expand { margin-top: 12px; padding-top: 4px; }
  .review-respond-label { font-size: 12px; font-weight: 500; color: var(--text); margin-bottom: 6px; }
  .review-respond-hint { font-size: 11px; color: var(--muted); margin-top: 6px; line-height: 1.4; }
  .review-textarea {
    width: 100%; min-height: 72px; resize: vertical; padding: 10px 12px;
    border: 1px solid var(--border); border-radius: 8px; font-size: 13px; font-family: 'DM Sans', sans-serif;
    color: var(--text); background: var(--surface); line-height: 1.45; outline: none;
  }
  .review-textarea:focus { border-color: var(--text); }
  .review-respond-actions { display: flex; gap: 8px; flex-wrap: wrap; margin-top: 10px; align-items: center; }
  .rating-summary { display: flex; align-items: center; gap: 16px; padding: 16px 20px; border-bottom: 1px solid var(--border-light); background: var(--bg); }
  .big-rating { font-size: 36px; font-weight: 600; letter-spacing: -0.04em; line-height: 1; }
  .rating-label { font-size: 11.5px; color: var(--muted); margin-top: 2px; }
  .rating-bars { flex: 1; display: flex; flex-direction: column; gap: 4px; }
  .rating-bar-row { display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--muted); font-family: 'DM Mono', monospace; }
  .rbar-track { flex: 1; height: 4px; background: var(--border); border-radius: 2px; }
  .rbar-fill { height: 100%; border-radius: 2px; background: #f59e0b; }

  /* MINI CHART */
  .mini-stats { padding: 16px 20px; }
  .mini-stat-row { display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid var(--border-light); }
  .mini-stat-row:last-child { border-bottom: none; }
  .mini-stat-label { font-size: 12.5px; color: var(--muted); }
  .mini-stat-val { font-size: 13px; font-weight: 500; }
  .bar-wrap { width: 80px; height: 4px; background: var(--border); border-radius: 2px; margin-left: 12px; }
  .bar-fill { height: 100%; border-radius: 2px; background: var(--text); }
  .mini-right { display: flex; align-items: center; gap: 10px; }

  /* Mobile / phone layout: narrow screens or ?view=mobile (same theme, touch-first) */
  /* Drawer sidebar: remove from flex row so main uses full viewport width */
  .app.mobile-layout .sidebar {
    position: fixed;
    left: 0;
    top: 0;
    height: 100vh;
    height: 100dvh;
    width: min(288px, 88vw);
    max-width: min(288px, 88vw);
    z-index: 150;
    flex: 0 0 0;
    min-width: 0;
    overflow-x: hidden;
    overflow-y: auto;
    -webkit-overflow-scrolling: touch;
    transform: translateX(-100%);
    transition: transform 0.22s ease;
    box-shadow: none;
    border-right: 1px solid var(--border);
  }
  .app.mobile-layout .sidebar.mobile-drawer-open {
    transform: translateX(0);
    box-shadow: 8px 0 40px rgba(15, 15, 14, 0.12);
  }
  .mobile-drawer-backdrop {
    position: fixed;
    inset: 0;
    z-index: 140;
    background: rgba(15, 15, 14, 0.38);
    border: none;
    padding: 0;
    margin: 0;
    cursor: pointer;
    animation: drawerBackdropIn 0.2s ease;
  }
  @keyframes drawerBackdropIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  .mobile-menu-btn {
    width: 40px;
    height: 40px;
    flex-shrink: 0;
    border-radius: 9px;
    border: 1px solid var(--border);
    background: var(--surface);
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--text);
    transition: background 0.12s, border-color 0.12s;
  }
  .mobile-menu-btn:hover { background: var(--bg); border-color: var(--text); }
  .mobile-menu-btn svg { width: 20px; height: 20px; }
  .app.mobile-layout .main {
    flex: 1;
    width: 100%;
    max-width: 100vw;
    min-width: 0;
  }
  .app.mobile-layout .two-col { grid-template-columns: 1fr; gap: 12px; }
  .app.mobile-layout .stats-row { grid-template-columns: 1fr !important; gap: 10px; }
  .app.mobile-layout .content { padding: 14px 14px calc(88px + env(safe-area-inset-bottom, 0)); }
  .app.mobile-layout .topbar { padding: 0 12px 0 14px; height: 52px; }
  .app.mobile-layout .page-title {
    font-size: 15px;
    flex: 1;
    min-width: 0;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .app.mobile-layout .date-badge { font-size: 10px; padding: 3px 8px; max-width: 36vw; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .app.mobile-layout .card { border-radius: 10px; }
  .app.mobile-layout .appt-item { padding: 12px 14px; flex-wrap: wrap; }
  .app.mobile-layout .appt-actions { margin-left: auto; }
  .app.mobile-layout .rating-summary { flex-direction: column; align-items: flex-start; gap: 12px; }
  .app.mobile-layout .big-rating { font-size: 30px; }
  .app.mobile-layout .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .app.mobile-layout .panel-form { padding: 14px; }
  .app.mobile-layout .form-row { grid-template-columns: 1fr !important; }
  .app.mobile-layout .stat-value { font-size: 22px; }
  .app.mobile-layout .profile-wrap { max-width: 100%; padding: 0 0 8px; }
  .app.mobile-layout .patient-toolbar { flex-wrap: wrap; }
  /*
   * Notifications: panel is absolutely positioned relative to .notif-wrap (narrow).
   * left+right+width:auto on absolute shrinks to ~0px — use fixed + viewport insets on mobile.
   */
  .app.mobile-layout .notif-panel {
    position: fixed;
    left: 12px;
    right: 12px;
    top: calc(52px + env(safe-area-inset-top, 0px) + 6px);
    width: auto;
    max-width: none;
    max-height: min(480px, calc(100dvh - 52px - 76px - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px)));
    z-index: 200;
    display: flex;
    flex-direction: column;
    animation: notifInMobile 0.18s ease-out;
  }
  .app.mobile-layout .notif-list {
    flex: 1;
    min-height: 0;
    max-height: min(360px, calc(100dvh - 220px));
  }
  .mobile-tabbar {
    position: fixed; bottom: 0; left: 0; right: 0; z-index: 100;
    display: flex; justify-content: space-around; align-items: stretch;
    min-height: 56px; padding: 6px 2px calc(6px + env(safe-area-inset-bottom, 0));
    background: var(--surface); border-top: 1px solid var(--border);
    box-shadow: 0 -6px 28px rgba(0,0,0,0.07);
  }
  .mobile-tab {
    flex: 1; max-width: 72px; display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 2px; border: none; background: none; cursor: pointer; font-family: inherit;
    color: var(--muted); font-size: 9.5px; font-weight: 500; padding: 4px 2px; min-width: 0;
  }
  .mobile-tab svg { width: 22px; height: 22px; flex-shrink: 0; }
  .mobile-tab.active { color: var(--text); font-weight: 600; }
  .qr-box {
    display: inline-block; padding: 10px; background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; margin-top: 10px; line-height: 0;
  }
  .qr-box img { width: min(220px, 72vw); height: auto; display: block; border-radius: 6px; }
  .mobile-link-row { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; margin-top: 10px; }
  .mobile-link-input {
    flex: 1; min-width: 180px; font-size: 12px; font-family: 'DM Mono', monospace;
    padding: 8px 10px; border: 1px solid var(--border); border-radius: 8px; background: var(--bg); color: var(--text);
  }
  .profile-phone-auth-demo {
    font-size: 12px; color: var(--muted); background: var(--bg); border: 1px solid var(--border);
    border-radius: 8px; padding: 10px 12px; margin-top: 10px; line-height: 1.45;
  }
`;

function sumPaidInvoicesInMonth(invoiceList, refDate) {
  return invoiceList
    .filter((inv) => inv.status === "paid")
    .filter((inv) => {
      const iso = parseInvoiceDateToISO(inv.date);
      return iso && isInMonth(iso, refDate);
    })
    .reduce((s, inv) => s + inv.amount, 0);
}

function sumBilledInMonth(invoiceList, refDate) {
  return invoiceList
    .filter((inv) => {
      const iso = parseInvoiceDateToISO(inv.date);
      return iso && isInMonth(iso, refDate);
    })
    .reduce((s, inv) => s + inv.amount, 0);
}

function sumOutstandingAmount(invoiceList) {
  return invoiceList
    .filter((inv) => inv.status !== "paid")
    .reduce((s, inv) => s + inv.amount, 0);
}

function nextInvoiceId(invoiceList) {
  let max = 0;
  for (const inv of invoiceList) {
    const m = /^INV-(\d+)$/i.exec(String(inv.id));
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `INV-${String(max + 1).padStart(4, "0")}`;
}

export default function ClearViewDental() {
  const now = new Date();

  const [tab, setTab] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [patients, setPatients] = useState(() => makeSeedPatients());
  const [appointments, setAppointments] = useState(() => makeSeedAppointments());
  const [cancellationsThisMonth, setCancellationsThisMonth] = useState(0);

  const [dentistName, setDentistName] = useState("Dr. Sushma");
  const [dentistTitle, setDentistTitle] = useState("Lead Dentist");
  const [dentistPhoto, setDentistPhoto] = useState("");
  /** Verified reminder reply addresses (after Save + code step). Used in templates & BCC. */
  const [verifiedReminderEmails, setVerifiedReminderEmails] = useState([]);
  const [reminderEmailRows, setReminderEmailRows] = useState([""]);
  const [reminderPhoneDraft, setReminderPhoneDraft] = useState("");
  /** Committed callback phone applied when reminder contacts save successfully. */
  const [reminderContactPhone, setReminderContactPhone] = useState("");
  const [reminderEmailVerifyModal, setReminderEmailVerifyModal] = useState(null);
  const [reminderContactSaveError, setReminderContactSaveError] = useState("");

  useEffect(() => {
    if (tab !== "profile") return;
    setReminderPhoneDraft(reminderContactPhone);
  }, [tab, reminderContactPhone]);

  useEffect(() => {
    if (tab !== "profile") return;
    setReminderEmailRows((prev) => {
      const has = prev.some((r) => r.trim());
      if (has) return prev;
      return verifiedReminderEmails.length ? [...verifiedReminderEmails, ""] : [""];
    });
  }, [tab, verifiedReminderEmails]);
  const [practiceName, setPracticeName] = useState("Ivory Insight");
  const [practiceTagline, setPracticeTagline] = useState("Practice Portal");
  const [practiceLogo, setPracticeLogo] = useState("");
  const photoInputRef = useRef(null);
  const practiceLogoInputRef = useRef(null);

  const [confirmDialog, setConfirmDialog] = useState(null);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifWrapRef = useRef(null);

  const [reminderList, setReminderList] = useState(() => initialReminders.map((r) => ({ ...r })));
  const [reminderDrafts, setReminderDrafts] = useState({});
  /** Which reminder row has the follow-up composer open (one at a time). */
  const [reminderComposeOpenId, setReminderComposeOpenId] = useState(null);

  const [reviewList, setReviewList] = useState(() => makeSeedReviews().map((r) => ({ ...r })));
  const [reviewReplyDrafts, setReviewReplyDrafts] = useState({});
  /** Which review row has the Google-style response composer open. */
  const [reviewRespondOpenId, setReviewRespondOpenId] = useState(null);

  const [isMobileLayout, setIsMobileLayout] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [mobileShareUrl, setMobileShareUrl] = useState("");
  const [mobileQrDataUrl, setMobileQrDataUrl] = useState("");
  const [mobileLinkCopied, setMobileLinkCopied] = useState(false);
  const [emailAuthInput, setEmailAuthInput] = useState("");
  const [emailAuthCodeInput, setEmailAuthCodeInput] = useState("");
  const [emailAuthExpected, setEmailAuthExpected] = useState(null);
  const [emailAuthError, setEmailAuthError] = useState("");
  const [signedInEmail, setSignedInEmail] = useState("");

  const [invoiceList, setInvoiceList] = useState(() => makeSeedInvoices());
  const [showNewInvoice, setShowNewInvoice] = useState(false);
  const [newInvoice, setNewInvoice] = useState({
    patient: "",
    service: "",
    date: toLocalISODate(),
    amount: "",
    status: "pending",
    remindVia: "sms",
    remindContact: "",
  });

  /** Invoice payment reminder composer (SMS or email). */
  const [invoiceReminderModal, setInvoiceReminderModal] = useState(null);

  useEffect(() => {
    if (!notifOpen) return;
    function handlePointerDown(e) {
      if (notifWrapRef.current && !notifWrapRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    function handleKey(e) {
      if (e.key === "Escape") setNotifOpen(false);
    }
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKey);
    };
  }, [notifOpen]);

  useEffect(() => {
    if (!invoiceReminderModal) return;
    function onKey(e) {
      if (e.key === "Escape") setInvoiceReminderModal(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [invoiceReminderModal]);

  const [showAddPatient, setShowAddPatient] = useState(false);
  const [newPatient, setNewPatient] = useState({
    name: "",
    age: "",
    phone: "",
    email: "",
    lastVisit: "",
    nextAppt: "—",
    status: "Active",
    source: "Word of mouth",
  });

  const [showAddAppt, setShowAddAppt] = useState(false);
  const [newAppt, setNewAppt] = useState({
    date: toLocalISODate(),
    time: "9:00 AM",
    patient: "",
    type: "Cleaning",
    status: "confirmed",
  });

  const [patientFiltersOpen, setPatientFiltersOpen] = useState(false);
  const [patientFilterStatus, setPatientFilterStatus] = useState("all");
  const [patientFilterSource, setPatientFilterSource] = useState("all");

  const patientFiltersActive =
    patientFilterStatus !== "all" || patientFilterSource !== "all";

  const filteredPatients = patients.filter((p) => {
    const q = search.toLowerCase().trim();
    const matchesSearch =
      !q ||
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q);
    if (!matchesSearch) return false;
    if (patientFilterStatus !== "all" && p.status !== patientFilterStatus) return false;
    if (patientFilterSource !== "all" && (p.source || "") !== patientFilterSource)
      return false;
    return true;
  });

  const todayISO = toLocalISODate(now);
  const apptsToday = appointments.filter((a) => a.date === todayISO);
  const apptsYesterday = appointments.filter((a) => a.date === yesterdayISODate(now));
  const apptCount = apptsToday.length;
  const confirmed = apptsToday.filter((a) => a.status === "confirmed").length;
  const noShows = apptsToday.filter((a) => a.status === "no-show").length;
  const showRatePct = apptCount ? Math.round((confirmed / apptCount) * 100) : 0;
  const apptDiffVsYesterday = apptCount - apptsYesterday.length;

  const paidOnly = invoiceList.filter((i) => i.status === "paid");
  const avgVisitValue = paidOnly.length
    ? paidOnly.reduce((s, i) => s + i.amount, 0) / paidOnly.length
    : 150;
  const noShowLostEst = Math.round(noShows * avgVisitValue);

  const revenueThisMonth = sumPaidInvoicesInMonth(invoiceList, now);
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15);
  const revenueLastMonth = sumPaidInvoicesInMonth(invoiceList, prevMonth);
  const revenuePctVsLast =
    revenueLastMonth > 0
      ? Math.round(((revenueThisMonth - revenueLastMonth) / revenueLastMonth) * 100)
      : null;

  const invoiceMonthLabel = new Intl.DateTimeFormat("en-US", { month: "short", year: "numeric" }).format(now);
  const totalBilledThisMonth = sumBilledInMonth(invoiceList, now);
  const totalBilledLastMonth = sumBilledInMonth(invoiceList, prevMonth);
  const billedPctVsLastMonth =
    totalBilledLastMonth > 0
      ? Math.round(((totalBilledThisMonth - totalBilledLastMonth) / totalBilledLastMonth) * 100)
      : null;
  const outstandingTotal = sumOutstandingAmount(invoiceList);
  const overdueCount = invoiceList.filter((i) => i.status === "overdue").length;
  const openInvoiceCount = invoiceList.filter((i) => i.status !== "paid").length;
  const collectedThisMonth = sumPaidInvoicesInMonth(invoiceList, now);
  const invoicesThisMonthCount = invoiceList.filter((inv) => {
    const iso = parseInvoiceDateToISO(inv.date);
    return iso && isInMonth(iso, now);
  }).length;

  const som = startOfMonthISO(now);
  const newPatientsMonth = patients.filter((p) => isInMonth(p.joinedAt, now)).length;
  const returningPatients = patients.filter(
    (p) => p.status === "Active" && p.joinedAt && p.joinedAt < som
  ).length;
  const reactivatedPatients = patients.filter(
    (p) =>
      p.status === "Active" &&
      p.joinedAt &&
      p.joinedAt < som &&
      displayDateInMonth(p.lastVisit, now)
  ).length;
  const noShowsMonth = appointments.filter(
    (a) => a.status === "no-show" && isInMonth(a.date, now)
  ).length;
  const pendingMonth = appointments.filter(
    (a) => a.status === "pending" && isInMonth(a.date, now)
  ).length;

  const miniRows = [
    { label: "New Patients", val: newPatientsMonth },
    { label: "Returning", val: returningPatients },
    { label: "Reactivated", val: reactivatedPatients },
    { label: "Cancellations", val: cancellationsThisMonth },
    { label: "No-shows", val: noShowsMonth },
    { label: "Pending", val: pendingMonth },
  ];
  const miniMax = Math.max(...miniRows.map((r) => r.val), 1);
  const miniWithPct = miniRows.map((r) => ({
    ...r,
    pct: r.val > 0 ? Math.max(8, Math.round((r.val / miniMax) * 100)) : 0,
  }));

  const scheduleAppointments = appointments.filter((a) => a.date === todayISO);

  const reviewedWithRating = reviewList.filter(
    (r) => r.status === "reviewed" && typeof r.rating === "number"
  );
  const googleAvgRating =
    reviewedWithRating.length > 0
      ? reviewedWithRating.reduce((s, r) => s + r.rating, 0) / reviewedWithRating.length
      : null;
  const googleReviewCount = reviewedWithRating.length;
  const reviewRequestsThisMonth = reviewList.filter(
    (r) => r.sentISO && isInMonth(r.sentISO, now)
  );
  const reviewRequestsSentMonthCount = reviewRequestsThisMonth.length;
  const reviewConvertedThisMonth = reviewRequestsThisMonth.filter(
    (r) => r.status === "reviewed"
  ).length;
  const reviewConversionPct =
    reviewRequestsSentMonthCount > 0
      ? Math.round((reviewConvertedThisMonth / reviewRequestsSentMonthCount) * 100)
      : null;
  const ratingDist = [5, 4, 3, 2, 1].map((stars) => {
    const n = reviewedWithRating.filter((r) => r.rating === stars).length;
    const pct =
      googleReviewCount > 0 ? Math.round((n / googleReviewCount) * 100) : 0;
    return [stars, pct, n];
  });

  function saveOwnerReviewReply(reviewId) {
    const row = reviewList.find((x) => x.id === reviewId);
    const draft = (
      reviewReplyDrafts[reviewId] !== undefined
        ? reviewReplyDrafts[reviewId]
        : row?.ownerReply || ""
    ).trim();
    if (!draft) return;
    setReviewList((prev) =>
      prev.map((r) =>
        r.id === reviewId
          ? {
              ...r,
              ownerReply: draft,
              repliedAt: formatPatientDisplayDate(new Date()),
            }
          : r
      )
    );
    setReviewReplyDrafts((d) => {
      const next = { ...d };
      delete next[reviewId];
      return next;
    });
    setReviewRespondOpenId((open) => (open === reviewId ? null : open));
  }

  function openGoogleBusinessReviews() {
    window.open("https://business.google.com/", "_blank", "noopener,noreferrer");
  }

  function addInvoice(e) {
    e.preventDefault();
    if (!newInvoice.patient.trim() || !newInvoice.service.trim()) return;
    const amt = Number(String(newInvoice.amount).replace(/,/g, ""));
    if (!Number.isFinite(amt) || amt <= 0) return;
    let displayDate;
    try {
      displayDate = formatPatientDisplayDate(new Date(`${newInvoice.date}T12:00:00`));
    } catch {
      displayDate = formatPatientDisplayDate(new Date());
    }
    setInvoiceList((prev) => [
      {
        id: nextInvoiceId(prev),
        patient: newInvoice.patient.trim(),
        service: newInvoice.service.trim(),
        date: displayDate,
        amount: Math.round(amt * 100) / 100,
        status: newInvoice.status,
        remindVia: newInvoice.remindVia === "email" ? "email" : "sms",
        remindContact: newInvoice.remindContact.trim(),
      },
      ...prev,
    ]);
    setNewInvoice({
      patient: "",
      service: "",
      date: toLocalISODate(),
      amount: "",
      status: "pending",
      remindVia: "sms",
      remindContact: "",
    });
    setShowNewInvoice(false);
  }

  function requestDeleteInvoice(inv) {
    setConfirmDialog({
      title: "Delete invoice?",
      message: `Are you sure you want to delete ${inv.id} for ${inv.patient} ($${inv.amount.toLocaleString()})?`,
      confirmLabel: "Yes, delete",
      danger: true,
      onConfirm: () => {
        setInvoiceList((prev) => prev.filter((x) => x.id !== inv.id));
        setConfirmDialog(null);
      },
    });
  }

  function openInvoiceReminderModal(inv) {
    const { firstName, lastName } = parseFirstLastName(inv.patient);
    const remindVia = inv.remindVia === "email" ? "email" : "sms";
    const custom = String(inv.remindContact || "").trim();
    const patientPhone = phoneForPatientName(patients, inv.patient);
    const patientEmail = emailForPatientName(patients, inv.patient);
    const phone = remindVia === "sms" && custom ? custom : patientPhone;
    const email = remindVia === "email" && custom ? custom : patientEmail;
    const messageDraft = buildDefaultInvoiceReminderMessage(
      firstName,
      lastName,
      practiceName,
      dentistName,
      inv,
      remindVia,
      verifiedReminderEmails,
      reminderContactPhone
    );
    setInvoiceReminderModal({
      invoice: inv,
      remindVia,
      phone,
      email,
      firstName,
      lastName,
      messageDraft,
    });
  }

  function confirmSendInvoiceReminder() {
    if (!invoiceReminderModal) return;
    const text = invoiceReminderModal.messageDraft.trim();
    if (!text) return;
    const inv = invoiceReminderModal.invoice;
    const remindVia = invoiceReminderModal.remindVia === "email" ? "email" : "sms";
    const destination =
      remindVia === "email"
        ? invoiceReminderModal.email?.trim() || "—"
        : invoiceReminderModal.phone?.trim() || "—";
    setReminderList((prev) => [
      {
        id: Date.now(),
        patient: inv.patient,
        phone: destination,
        channel: remindVia,
        message: text,
        sent: "Just now",
        status: "delivered",
      },
      ...prev,
    ]);
    setInvoiceReminderModal(null);
    if (remindVia === "email" && destination && destination !== "—") {
      const subj = `Payment reminder — ${practiceName.trim() || "Dental practice"} (${inv.id})`;
      const bcc =
        verifiedReminderEmails.length > 0
          ? verifiedReminderEmails.join(",")
          : undefined;
      openGmailCompose({ to: destination, subject: subj, body: text, bcc });
    }
    if (remindVia === "sms" && destination && destination !== "—" && isMobileDevice()) {
      const smsBody = appendReminderCallbackToSms(text, practiceName, reminderContactPhone);
      openSmsComposer(destination, smsBody);
    }
  }

  function sendReminderFollowUp(reminderId) {
    const text = (reminderDrafts[reminderId] || "").trim();
    if (!text) return;
    const parent = reminderList.find((x) => x.id === reminderId);
    if (!parent) return;
    const channel = parent.channel ?? "sms";
    let outgoing = text;
    if (channel === "sms") {
      outgoing = appendReminderCallbackToSms(text, practiceName, reminderContactPhone);
    } else if (channel === "email" && verifiedReminderEmails.length) {
      const joined = verifiedReminderEmails.join(", ");
      const hint = `\n\n—\nReply to: ${joined}`;
      if (!verifiedReminderEmails.some((e) => text.includes(e))) outgoing = text + hint;
    }
    const dest = parent.phone?.trim() || "";
    const newItem = {
      id: Date.now(),
      patient: parent.patient,
      phone: parent.phone,
      channel,
      message: outgoing,
      sent: "Just now",
      status: "delivered",
    };
    setReminderList((prev) => [newItem, ...prev]);
    setReminderDrafts((d) => ({ ...d, [reminderId]: "" }));
    setReminderComposeOpenId(null);
    if (channel === "email" && dest && dest !== "—") {
      const subj = `Message from ${practiceName.trim() || "your dental office"}`;
      openGmailCompose({
        to: dest,
        subject: subj,
        body: outgoing,
        bcc:
          verifiedReminderEmails.length > 0
            ? verifiedReminderEmails.join(",")
            : undefined,
      });
    } else if (channel === "sms" && isMobileDevice()) {
      openSmsComposer(dest, outgoing);
    }
  }

  function saveReminderContacts() {
    setReminderContactSaveError("");
    const deduped = [
      ...new Set(reminderEmailRows.map((e) => e.trim()).filter(Boolean)),
    ];
    for (const e of deduped) {
      if (!isValidEmailFormat(e)) {
        setReminderContactSaveError("Enter a valid email in each row, or remove empty rows.");
        return;
      }
    }
    const needVerify = deduped.filter((e) => !verifiedReminderEmails.includes(e));
    if (needVerify.length === 0) {
      setVerifiedReminderEmails(
        deduped.filter((e) => verifiedReminderEmails.includes(e))
      );
      setReminderContactPhone(reminderPhoneDraft.trim());
      setReminderEmailRows(deduped.length ? [...deduped, ""] : [""]);
      return;
    }
    const expectedByEmail = {};
    needVerify.forEach((e) => {
      expectedByEmail[e] = String(Math.floor(100000 + Math.random() * 900000));
    });
    setReminderEmailVerifyModal({
      queue: needVerify,
      idx: 0,
      expectedByEmail,
      codeInput: "",
      error: "",
      dedupedSnapshot: deduped,
      phoneSnapshot: reminderPhoneDraft.trim(),
    });
  }

  function submitReminderEmailVerification() {
    const m = reminderEmailVerifyModal;
    if (!m) return;
    const email = m.queue[m.idx];
    const expected = m.expectedByEmail[email];
    if (m.codeInput.trim() !== expected) {
      setReminderEmailVerifyModal({ ...m, error: "That code doesn’t match. Try again." });
      return;
    }
    if (m.idx + 1 < m.queue.length) {
      setReminderEmailVerifyModal({
        ...m,
        idx: m.idx + 1,
        codeInput: "",
        error: "",
      });
      return;
    }
    setVerifiedReminderEmails(m.dedupedSnapshot);
    setReminderContactPhone(m.phoneSnapshot);
    setReminderEmailRows(
      m.dedupedSnapshot.length ? [...m.dedupedSnapshot, ""] : [""]
    );
    setReminderEmailVerifyModal(null);
  }

  useEffect(() => {
    if (!reminderEmailVerifyModal) return;
    function onKey(e) {
      if (e.key === "Escape") setReminderEmailVerifyModal(null);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [reminderEmailVerifyModal]);

  useEffect(() => {
    try {
      const e =
        localStorage.getItem("cv-signed-email") || localStorage.getItem("cv-signed-phone");
      if (e) {
        setSignedInEmail(e);
        if (!localStorage.getItem("cv-signed-email") && localStorage.getItem("cv-signed-phone")) {
          try {
            localStorage.setItem("cv-signed-email", e);
            localStorage.removeItem("cv-signed-phone");
          } catch {
            /* ignore */
          }
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const syncMobile = () => {
      try {
        const force = new URLSearchParams(window.location.search).get("view") === "mobile";
        const narrow = window.matchMedia("(max-width: 720px)").matches;
        setIsMobileLayout(force || narrow);
      } catch {
        setIsMobileLayout(false);
      }
    };
    syncMobile();
    const mq = window.matchMedia("(max-width: 720px)");
    mq.addEventListener("change", syncMobile);
    return () => mq.removeEventListener("change", syncMobile);
  }, []);

  useEffect(() => {
    if (!isMobileLayout) setMobileDrawerOpen(false);
  }, [isMobileLayout]);

  useEffect(() => {
    if (!isMobileLayout || !mobileDrawerOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") setMobileDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isMobileLayout, mobileDrawerOpen]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (!isMobileLayout || !mobileDrawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isMobileLayout, mobileDrawerOpen]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL("?view=mobile", window.location.href).href;
    setMobileShareUrl(url);
    QRCode.toDataURL(url, {
      margin: 2,
      width: 240,
      color: { dark: "#1a1a18", light: "#f8f8f6" },
    })
      .then(setMobileQrDataUrl)
      .catch(() => setMobileQrDataUrl(""));
  }, []);

  function sendEmailSignInCode() {
    setEmailAuthError("");
    const addr = emailAuthInput.trim();
    if (!isValidEmailFormat(addr)) {
      setEmailAuthError("Enter a valid email address.");
      return;
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    setEmailAuthExpected(code);
    setEmailAuthCodeInput("");
  }

  function verifyEmailSignInCode() {
    setEmailAuthError("");
    if (!emailAuthExpected || emailAuthCodeInput.trim() !== emailAuthExpected) {
      setEmailAuthError("That code doesn’t match. Try again.");
      return;
    }
    const display = emailAuthInput.trim();
    try {
      localStorage.setItem("cv-signed-email", display);
      localStorage.removeItem("cv-signed-phone");
    } catch {
      /* ignore */
    }
    setSignedInEmail(display);
    setEmailAuthExpected(null);
    setEmailAuthCodeInput("");
  }

  function signOutEmailSession() {
    try {
      localStorage.removeItem("cv-signed-email");
      localStorage.removeItem("cv-signed-phone");
    } catch {
      /* ignore */
    }
    setSignedInEmail("");
    setEmailAuthExpected(null);
    setEmailAuthCodeInput("");
    setEmailAuthInput("");
  }

  function copyMobilePortalLink() {
    if (!mobileShareUrl) return;
    navigator.clipboard.writeText(mobileShareUrl).then(() => {
      setMobileLinkCopied(true);
      window.setTimeout(() => setMobileLinkCopied(false), 2000);
    });
  }

  function handlePhotoChange(e) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setDentistPhoto(String(reader.result || ""));
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function handlePracticeLogoChange(e) {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => setPracticeLogo(String(reader.result || ""));
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  function addPatient(e) {
    e.preventDefault();
    if (!newPatient.name.trim() || !newPatient.phone.trim()) return;
    const id = Math.max(0, ...patients.map(p => p.id)) + 1;
    setPatients(prev => [...prev, {
      id,
      name: newPatient.name.trim(),
      age: newPatient.age === "" ? null : Number(newPatient.age),
      phone: newPatient.phone.trim(),
      email: newPatient.email.trim() || "—",
      lastVisit: newPatient.lastVisit.trim() || "—",
      nextAppt: newPatient.nextAppt.trim() || "—",
      status: newPatient.status,
      source: newPatient.source,
      joinedAt: toLocalISODate(),
    }]);
    setNewPatient({
      name: "",
      age: "",
      phone: "",
      email: "",
      lastVisit: "",
      nextAppt: "—",
      status: "Active",
      source: "Word of mouth",
    });
    setShowAddPatient(false);
  }

  function requestDeletePatient(id) {
    const p = patients.find((x) => x.id === id);
    setConfirmDialog({
      title: "Remove patient?",
      message: p
        ? `Are you sure you want to remove "${p.name}" from your list? You can add them again later.`
        : "Are you sure you want to remove this patient from your list?",
      confirmLabel: "Yes, remove",
      danger: true,
      onConfirm: () => {
        setPatients((prev) => prev.filter((x) => x.id !== id));
        setConfirmDialog(null);
      },
    });
  }

  function addAppointment(e) {
    e.preventDefault();
    if (!newAppt.patient.trim()) return;
    const id = `appt-${Date.now()}`;
    setAppointments((prev) => [
      ...prev,
      {
        id,
        date: newAppt.date || toLocalISODate(),
        time: newAppt.time,
        patient: newAppt.patient.trim(),
        type: newAppt.type,
        status: newAppt.status,
      },
    ]);
    setNewAppt({
      date: toLocalISODate(),
      time: "9:00 AM",
      patient: "",
      type: "Cleaning",
      status: "confirmed",
    });
    setShowAddAppt(false);
  }

  function requestDeleteAppointment(id) {
    const appt = appointments.find((x) => x.id === id);
    setConfirmDialog({
      title: "Remove appointment?",
      message: appt
        ? `Are you sure you want to delete ${appt.time} — ${appt.patient} (${appt.type})?`
        : "Are you sure you want to remove this appointment?",
      confirmLabel: "Yes, delete",
      danger: true,
      onConfirm: () => {
        if (appt && isInMonth(appt.date, new Date())) {
          setCancellationsThisMonth((c) => c + 1);
        }
        setAppointments((prev) => prev.filter((x) => x.id !== id));
        setConfirmDialog(null);
      },
    });
  }

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg> },
    { id: "patients", label: "Patients", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
    { id: "reminders", label: "Reminders", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
    { id: "invoices", label: "Invoices", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg> },
    { id: "reviews", label: "Reviews", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg> },
    { id: "profile", label: "My profile", icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg> },
    {
      id: "phonePortal",
      label: "Phone & QR",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
          <rect x="5" y="2" width="14" height="20" rx="2" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      ),
    },
  ];

  const mobileTabLabels = {
    dashboard: "Home",
    patients: "Patients",
    reminders: "SMS",
    invoices: "Bills",
    reviews: "Reviews",
    profile: "Profile",
    phonePortal: "Mobile",
  };

  const pageTitles = {
    dashboard: "Dashboard",
    patients: "Patient List",
    reminders: "SMS Reminders",
    invoices: "Invoices",
    reviews: "Reviews",
    profile: "My profile",
    phonePortal: "Phone & QR",
  };

  const avatarLabel = initialsFromName(dentistName);
  const verifyModalEmail =
    reminderEmailVerifyModal?.queue[reminderEmailVerifyModal.idx] ?? "";
  const verifyModalDemoCode =
    reminderEmailVerifyModal && verifyModalEmail
      ? reminderEmailVerifyModal.expectedByEmail[verifyModalEmail]
      : "";

  return (
    <>
      <style>{style}</style>
      <div className={`app${isMobileLayout ? " mobile-layout" : ""}`}>
        {isMobileLayout && mobileDrawerOpen && (
          <button
            type="button"
            className="mobile-drawer-backdrop"
            aria-label="Close menu"
            onClick={() => setMobileDrawerOpen(false)}
          />
        )}
        <aside
          className={`sidebar${isMobileLayout && mobileDrawerOpen ? " mobile-drawer-open" : ""}`}
          aria-hidden={isMobileLayout ? !mobileDrawerOpen : undefined}
        >
          <div className="logo">
            <div className="logo-mark">
              <div className="logo-icon" style={practiceLogo ? { background: "transparent" } : undefined}>
                {practiceLogo ? (
                  <img src={practiceLogo} alt="" />
                ) : (
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/><path d="M8 12s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>
                )}
              </div>
              <div>
                <div className="logo-name">{practiceName || "Practice"}</div>
                <div className="logo-sub">{practiceTagline || "Portal"}</div>
              </div>
            </div>
          </div>

          <nav className="nav">
            <div className="nav-label">Main</div>
            {navItems.map(item => (
              <div
                key={item.id}
                className={`nav-item ${tab === item.id ? "active" : ""}`}
                onClick={() => {
                  setTab(item.id);
                  if (isMobileLayout) setMobileDrawerOpen(false);
                }}
              >
                {item.icon} {item.label}
              </div>
            ))}
          </nav>

          <div className="sidebar-footer">
            <button
              type="button"
              className="doctor-info"
              onClick={() => {
                setTab("profile");
                if (isMobileLayout) setMobileDrawerOpen(false);
              }}
              style={{ cursor: "pointer", background: "none", border: "none", padding: 0, width: "100%", textAlign: "left" }}
            >
              <div className="doctor-avatar">
                {dentistPhoto ? <img src={dentistPhoto} alt="" /> : avatarLabel}
              </div>
              <div>
                <div className="doctor-name">{dentistName}</div>
                <div className="doctor-role">{dentistTitle}</div>
              </div>
            </button>
          </div>
        </aside>

        <main className="main">
          <div className="topbar">
            <div className="topbar-left">
              {isMobileLayout && (
                <button
                  type="button"
                  className="mobile-menu-btn"
                  aria-label={mobileDrawerOpen ? "Close menu" : "Open menu"}
                  aria-expanded={mobileDrawerOpen}
                  onClick={() => setMobileDrawerOpen((o) => !o)}
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                    <line x1="4" y1="7" x2="20" y2="7" />
                    <line x1="4" y1="12" x2="20" y2="12" />
                    <line x1="4" y1="17" x2="20" y2="17" />
                  </svg>
                </button>
              )}
              <div className="page-title">{pageTitles[tab]}</div>
            </div>
            <div className="topbar-right">
              <div className="date-badge">{formatTopbarDate()}</div>
              <div className="notif-wrap" ref={notifWrapRef}>
                <button
                  type="button"
                  className="notif-btn"
                  aria-label="Notifications"
                  aria-expanded={notifOpen}
                  aria-haspopup="true"
                  onClick={() => setNotifOpen((o) => !o)}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
                  <span className="notif-dot" aria-hidden />
                </button>
                {notifOpen && (
                  <div className="notif-panel" role="dialog" aria-label="Notifications">
                    <div className="notif-panel-header">
                      <div>
                        <div className="notif-panel-title">Notifications</div>
                        <div className="notif-panel-sub">{headerNotifications.length} updates</div>
                      </div>
                    </div>
                    <div className="notif-list">
                      {headerNotifications.map((n) => (
                        <div className="notif-row" key={n.id}>
                          <div className={`notif-row-accent ${n.accent}`} aria-hidden />
                          <div className="notif-row-body">
                            <div className="notif-row-title">{n.title}</div>
                            <div className="notif-row-text">{n.body}</div>
                            <div className="notif-row-time">{n.time}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="notif-panel-footer">
                      Practice alerts and reminders appear here. Hook this to your backend when ready.
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="content">

            {tab === "dashboard" && (
              <>
                <div className="stats-row">
                  {[
                    {
                      label: "Today's Appointments",
                      value: apptCount,
                      sub:
                        apptsYesterday.length === 0 && apptCount === 0 ? (
                          <>No appointments today or yesterday</>
                        ) : (
                          <>
                            {apptDiffVsYesterday >= 0 ? (
                              <span className="up">↑ {apptDiffVsYesterday}</span>
                            ) : (
                              <span className="down">↓ {Math.abs(apptDiffVsYesterday)}</span>
                            )}{" "}
                            vs yesterday ({apptsYesterday.length} scheduled)
                          </>
                        ),
                    },
                    {
                      label: "Confirmed (today)",
                      value: confirmed,
                      sub: (
                        <>
                          <span className="up">{showRatePct}%</span> of today&apos;s visits
                        </>
                      ),
                    },
                    {
                      label: "No-Shows (today)",
                      value: noShows,
                      sub: (
                        <>
                          <span className="down">~${noShowLostEst.toLocaleString()}</span> est. lost (avg paid visit)
                        </>
                      ),
                    },
                    {
                      label: "Monthly Revenue",
                      value: `$${revenueThisMonth.toLocaleString()}`,
                      sub:
                        revenuePctVsLast == null ? (
                          <>No paid invoices in prior month to compare</>
                        ) : (
                          <>
                            <span className={revenuePctVsLast >= 0 ? "up" : "down"}>
                              {revenuePctVsLast >= 0 ? "↑" : "↓"} {Math.abs(revenuePctVsLast)}%
                            </span>{" "}
                            vs last month (paid)
                          </>
                        ),
                    },
                  ].map((s, i) => (
                    <div className="stat-card" key={i}>
                      <div className="stat-label">{s.label}</div>
                      <div className="stat-value">{s.value}</div>
                      <div className="stat-sub">{s.sub}</div>
                    </div>
                  ))}
                </div>

                <div className="two-col">
                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">Today's Schedule</div>
                      <button type="button" className="card-action" onClick={() => setShowAddAppt(v => !v)}>
                        {showAddAppt ? "Cancel" : "+ Add appointment"}
                      </button>
                    </div>
                    {showAddAppt && (
                      <form className="panel-form" onSubmit={addAppointment}>
                        <div className="panel-form-title">Add appointment (e.g. word-of-mouth walk-in)</div>
                        <div className="form-row" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                          <div className="form-group">
                            <label>Date</label>
                            <input
                              className="form-input"
                              type="date"
                              value={newAppt.date}
                              onChange={(e) => setNewAppt((a) => ({ ...a, date: e.target.value }))}
                            />
                          </div>
                          <div className="form-group">
                            <label>Time</label>
                            <select className="form-select" value={newAppt.time} onChange={e => setNewAppt(a => ({ ...a, time: e.target.value }))}>
                              {apptTimeOptions.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                          </div>
                          <div className="form-group">
                            <label>Status</label>
                            <select className="form-select" value={newAppt.status} onChange={e => setNewAppt(a => ({ ...a, status: e.target.value }))}>
                              {apptStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                          </div>
                        </div>
                        <div className="form-group">
                          <label>Patient name</label>
                          <input className="form-input" placeholder="Full name" value={newAppt.patient} onChange={e => setNewAppt(a => ({ ...a, patient: e.target.value }))} />
                        </div>
                        <div className="form-group">
                          <label>Visit type</label>
                          <select className="form-select" value={newAppt.type} onChange={e => setNewAppt(a => ({ ...a, type: e.target.value }))}>
                            {apptTypes.map(t => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </div>
                        <div style={{ display: "flex", gap: 8 }}>
                          <button type="submit" className="btn-primary">Save appointment</button>
                          <button type="button" className="btn-ghost" onClick={() => setShowAddAppt(false)}>Close</button>
                        </div>
                      </form>
                    )}
                    {scheduleAppointments.length === 0 && (
                      <div style={{ padding: "20px", color: "var(--muted)", fontSize: 13 }}>No appointments scheduled for today. Add one above or pick another date when adding.</div>
                    )}
                    {scheduleAppointments.map(a => (
                      <div className="appt-item" key={a.id}>
                        <div className="appt-time">{a.time}</div>
                        <div className="appt-dot" style={{ background: a.status === "confirmed" ? "#1a7a4a" : a.status === "no-show" ? "#c0392b" : "#b45309" }}/>
                        <div className="appt-info">
                          <div className="appt-name-row">
                            <span className="appt-name">{a.patient}</span>
                            {isReturningPatientForSchedule(patients, a.patient, som) && (
                              <span className="appt-returning-badge">Returning</span>
                            )}
                          </div>
                          <div className="appt-type">{a.type}</div>
                        </div>
                        <div className="appt-actions">
                          <span className={`badge ${a.status === "confirmed" ? "badge-green" : a.status === "no-show" ? "badge-red" : "badge-amber"}`}>
                            {a.status}
                          </span>
                          <button type="button" className="icon-btn" title="Remove" aria-label="Remove appointment" onClick={() => requestDeleteAppointment(a.id)}>×</button>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="card">
                    <div className="card-header">
                      <div className="card-title">This Month</div>
                    </div>
                    <div className="mini-stats">
                      {miniWithPct.map((s, i) => (
                        <div className="mini-stat-row" key={i}>
                          <div className="mini-stat-label">{s.label}</div>
                          <div className="mini-right">
                            <div className="bar-wrap"><div className="bar-fill" style={{ width: `${s.pct}%` }}/></div>
                            <div className="mini-stat-val">{s.val}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </>
            )}

            {tab === "patients" && (
              <div className="card">
                <div className="card-header">
                  <div className="card-title">{patients.length} Patients</div>
                  <button type="button" className="card-action" onClick={() => setShowAddPatient(v => !v)}>
                    {showAddPatient ? "Cancel" : "+ Add Patient"}
                  </button>
                </div>
                {showAddPatient && (
                  <form className="panel-form" onSubmit={addPatient}>
                    <div className="panel-form-title">New patient</div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Full name</label>
                        <input className="form-input" required value={newPatient.name} onChange={e => setNewPatient(p => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Age</label>
                        <input className="form-input" type="number" min="0" placeholder="Optional" value={newPatient.age} onChange={e => setNewPatient(p => ({ ...p, age: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Phone</label>
                        <input className="form-input" required placeholder="(555) 000-0000" value={newPatient.phone} onChange={e => setNewPatient(p => ({ ...p, phone: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Email</label>
                        <input className="form-input" type="email" placeholder="Optional" value={newPatient.email} onChange={e => setNewPatient(p => ({ ...p, email: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Last visit</label>
                        <input className="form-input" placeholder="e.g. Mar 18, 2025" value={newPatient.lastVisit} onChange={e => setNewPatient(p => ({ ...p, lastVisit: e.target.value }))} />
                      </div>
                      <div className="form-group">
                        <label>Next appointment</label>
                        <input className="form-input" placeholder="— or date" value={newPatient.nextAppt} onChange={e => setNewPatient(p => ({ ...p, nextAppt: e.target.value }))} />
                      </div>
                    </div>
                    <div className="form-row">
                      <div className="form-group">
                        <label>Status</label>
                        <select className="form-select" value={newPatient.status} onChange={e => setNewPatient(p => ({ ...p, status: e.target.value }))}>
                          {patientStatuses.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>How they found you</label>
                        <select className="form-select" value={newPatient.source} onChange={e => setNewPatient(p => ({ ...p, source: e.target.value }))}>
                          {patientSources.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </div>
                    </div>
                    <button type="submit" className="btn-primary" style={{ alignSelf: "flex-start" }}>Save patient</button>
                  </form>
                )}
                <div className="patient-toolbar">
                  <div className="search-row">
                    <div className="search-wrap">
                      <span className="search-icon">
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                      </span>
                      <input className="search-input" placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    <button
                      type="button"
                      className={`filter-btn ${patientFiltersOpen || patientFiltersActive ? "active" : ""}`}
                      onClick={() => setPatientFiltersOpen((o) => !o)}
                      aria-expanded={patientFiltersOpen}
                    >
                      Filter{patientFiltersActive ? " •" : ""}
                    </button>
                  </div>
                  {patientFiltersOpen && (
                    <div className="filter-panel">
                      <div className="form-group">
                        <label>Status</label>
                        <select
                          className="form-select"
                          value={patientFilterStatus}
                          onChange={(e) => setPatientFilterStatus(e.target.value)}
                        >
                          <option value="all">All statuses</option>
                          {patientStatuses.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="form-group">
                        <label>Source</label>
                        <select
                          className="form-select"
                          value={patientFilterSource}
                          onChange={(e) => setPatientFilterSource(e.target.value)}
                        >
                          <option value="all">All sources</option>
                          {patientSources.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div className="filter-panel-actions">
                        <span className="filter-hint">
                          {filteredPatients.length} patient{filteredPatients.length !== 1 ? "s" : ""} match
                        </span>
                        <button
                          type="button"
                          className="btn-ghost"
                          onClick={() => {
                            setPatientFilterStatus("all");
                            setPatientFilterSource("all");
                          }}
                        >
                          Clear filters
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Patient</th>
                        <th>Phone</th>
                        <th>Source</th>
                        <th>Last Visit</th>
                        <th>Next Appt</th>
                        <th>Status</th>
                        <th style={{ width: 72 }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map(p => (
                        <tr key={p.id}>
                          <td>
                            <div className="patient-name">{p.name}</div>
                            <div className="mono">{p.email}</div>
                          </td>
                          <td className="mono">{p.phone}</td>
                          <td style={{ fontSize: 12.5, color: "var(--muted)" }}>{p.source || "—"}</td>
                          <td className="mono">{p.lastVisit}</td>
                          <td className="mono">{p.nextAppt}</td>
                          <td>
                            <span className={`badge ${p.status === "Active" ? "badge-green" : p.status === "Overdue" ? "badge-amber" : "badge-red"}`}>
                              {p.status}
                            </span>
                          </td>
                          <td>
                            <button type="button" className="btn-text-danger" onClick={() => requestDeletePatient(p.id)}>Delete</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {tab === "reminders" && (
              <>
                <div className="stats-row" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 20 }}>
                  {[
                    { label: "Sent Today", value: "5", sub: "automated" },
                    { label: "Delivery Rate", value: "100%", sub: "all delivered" },
                    { label: "Reactivations", value: "2", sub: "this week" },
                  ].map((s, i) => (
                    <div className="stat-card" key={i}>
                      <div className="stat-label">{s.label}</div>
                      <div className="stat-value">{s.value}</div>
                      <div className="stat-sub">{s.sub}</div>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">Recent SMS Activity</div>
                    <div className="card-action" style={{ cursor: "default" }}>Send reminder</div>
                  </div>
                  {reminderList.map(r => (
                    <div className="reminder-item" key={r.id}>
                      <div className="reminder-top">
                        <div>
                          <div className="reminder-name">{r.patient}</div>
                          <div className="reminder-phone">
                            {(r.channel ?? "sms") === "email" ? "Email" : "SMS"} · {r.phone}
                          </div>
                        </div>
                        <span className={`badge ${r.status === "read" ? "badge-blue" : "badge-green"}`}>{r.status}</span>
                      </div>
                      <div className="reminder-msg">{r.message}</div>
                      <div className="reminder-meta">
                        <div className="reminder-time">{r.sent}</div>
                        <button
                          type="button"
                          className="reminder-reply-toggle"
                          aria-expanded={reminderComposeOpenId === r.id}
                          aria-controls={`reminder-compose-${r.id}`}
                          id={`reminder-toggle-${r.id}`}
                          onClick={() =>
                            setReminderComposeOpenId((open) => (open === r.id ? null : r.id))
                          }
                        >
                          <svg className="reminder-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M6 9l6 6 6-6"/></svg>
                          {reminderComposeOpenId === r.id ? "Hide message" : "Write follow-up"}
                        </button>
                      </div>
                      {reminderComposeOpenId === r.id && (
                        <div className="reminder-compose-panel" id={`reminder-compose-${r.id}`} role="region" aria-labelledby={`reminder-toggle-${r.id}`}>
                          <div className="reminder-compose-label">
                            Send another {(r.channel ?? "sms") === "email" ? "email" : "SMS"}
                          </div>
                          <textarea
                            className="reminder-textarea"
                            placeholder={
                              (r.channel ?? "sms") === "email"
                                ? `Write a follow-up email to ${r.patient.split(" ")[0] || "this patient"}…`
                                : `Write a follow-up SMS to ${r.patient.split(" ")[0] || "this patient"}…`
                            }
                            maxLength={(r.channel ?? "sms") === "email" ? 4000 : 480}
                            value={reminderDrafts[r.id] ?? ""}
                            onChange={(e) => setReminderDrafts((d) => ({ ...d, [r.id]: e.target.value }))}
                            aria-label={`Follow-up message to ${r.patient}`}
                          />
                          <div className="reminder-compose-row">
                            <span className="reminder-send-hint">Goes to {r.phone}</span>
                            <button
                              type="button"
                              className="btn-primary"
                              style={{ height: 34, fontSize: 12.5 }}
                              onClick={() => sendReminderFollowUp(r.id)}
                            >
                              {(r.channel ?? "sms") === "email" ? "Send email" : "Send SMS"}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === "invoices" && (
              <>
                <div className="stats-row" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 20 }}>
                  {[
                    {
                      label: `Total billed (${invoiceMonthLabel})`,
                      value: `$${totalBilledThisMonth.toLocaleString()}`,
                      sub:
                        billedPctVsLastMonth == null ? (
                          <>{invoicesThisMonthCount} invoice{invoicesThisMonthCount !== 1 ? "s" : ""} this month</>
                        ) : (
                          <>
                            <span className={billedPctVsLastMonth >= 0 ? "up" : "down"}>
                              {billedPctVsLastMonth >= 0 ? "↑" : "↓"} {Math.abs(billedPctVsLastMonth)}%
                            </span>{" "}
                            vs prior month · {invoicesThisMonthCount} invoice{invoicesThisMonthCount !== 1 ? "s" : ""}
                          </>
                        ),
                    },
                    {
                      label: "Outstanding",
                      value: `$${outstandingTotal.toLocaleString()}`,
                      sub: (
                        <>
                          <span className="down">{openInvoiceCount} open</span>
                          {overdueCount > 0 && (
                            <> · {overdueCount} overdue</>
                          )}
                        </>
                      ),
                    },
                    {
                      label: `Collected (${invoiceMonthLabel})`,
                      value: `$${collectedThisMonth.toLocaleString()}`,
                      sub: (
                        <>
                          paid invoices in{" "}
                          {new Intl.DateTimeFormat("en-US", { month: "long" }).format(now)}
                        </>
                      ),
                    },
                  ].map((s, i) => (
                    <div className="stat-card" key={i}>
                      <div className="stat-label">{s.label}</div>
                      <div className="stat-value">{s.value}</div>
                      <div className="stat-sub">{s.sub}</div>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="card-header">
                    <div className="card-title">All Invoices</div>
                    <button
                      type="button"
                      className="card-action"
                      onClick={() => setShowNewInvoice((v) => !v)}
                    >
                      {showNewInvoice ? "Cancel" : "+ New Invoice"}
                    </button>
                  </div>
                  {showNewInvoice && (
                    <form className="panel-form" onSubmit={addInvoice}>
                      <div className="panel-form-title">New invoice</div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Patient name</label>
                          <input
                            className="form-input"
                            required
                            placeholder="e.g. Jane Smith"
                            value={newInvoice.patient}
                            onChange={(e) => setNewInvoice((x) => ({ ...x, patient: e.target.value }))}
                          />
                        </div>
                        <div className="form-group">
                          <label>Service</label>
                          <input
                            className="form-input"
                            required
                            placeholder="e.g. Cleaning"
                            value={newInvoice.service}
                            onChange={(e) => setNewInvoice((x) => ({ ...x, service: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group">
                          <label>Date</label>
                          <input
                            className="form-input"
                            type="date"
                            required
                            value={newInvoice.date}
                            onChange={(e) => setNewInvoice((x) => ({ ...x, date: e.target.value }))}
                          />
                        </div>
                        <div className="form-group">
                          <label>Amount (USD)</label>
                          <input
                            className="form-input"
                            type="number"
                            min="0.01"
                            step="0.01"
                            required
                            placeholder="0.00"
                            value={newInvoice.amount}
                            onChange={(e) => setNewInvoice((x) => ({ ...x, amount: e.target.value }))}
                          />
                        </div>
                      </div>
                      <div className="form-row">
                        <div className="form-group" style={{ maxWidth: 220 }}>
                          <label>Status</label>
                          <select
                            className="form-select"
                            value={newInvoice.status}
                            onChange={(e) => setNewInvoice((x) => ({ ...x, status: e.target.value }))}
                          >
                            {invoicePaymentStatuses.map((st) => (
                              <option key={st} value={st}>{st}</option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ maxWidth: 260 }}>
                          <label>Reminder via</label>
                          <select
                            className="form-select"
                            value={newInvoice.remindVia}
                            onChange={(e) =>
                              setNewInvoice((x) => ({ ...x, remindVia: e.target.value }))
                            }
                            aria-label="Send invoice reminders by SMS or email"
                          >
                            {invoiceReminderViaOptions.map((opt) => (
                              <option key={opt.value} value={opt.value}>
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="form-group" style={{ flex: 1, minWidth: 200 }}>
                          <label>
                            {newInvoice.remindVia === "email" ? "Email address" : "Phone number"}
                          </label>
                          <input
                            className="form-input"
                            type={newInvoice.remindVia === "email" ? "email" : "tel"}
                            autoComplete={newInvoice.remindVia === "email" ? "email" : "tel"}
                            placeholder={
                              newInvoice.remindVia === "email"
                                ? "e.g. patient@email.com"
                                : "e.g. (312) 555-0100"
                            }
                            value={newInvoice.remindContact}
                            onChange={(e) =>
                              setNewInvoice((x) => ({ ...x, remindContact: e.target.value }))
                            }
                            aria-label={
                              newInvoice.remindVia === "email"
                                ? "Email address for invoice reminders"
                                : "Phone number for invoice reminders"
                            }
                          />
                        </div>
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button type="submit" className="btn-primary">Save invoice</button>
                        <button type="button" className="btn-ghost" onClick={() => setShowNewInvoice(false)}>Close</button>
                      </div>
                    </form>
                  )}
                  <div className="table-wrap">
                    <table>
                      <thead>
                        <tr>
                          <th>Invoice</th>
                          <th>Patient</th>
                          <th>Service</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Status</th>
                          <th style={{ width: 140 }}></th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoiceList.map(inv => (
                          <tr key={inv.id}>
                            <td><div className="inv-id">{inv.id}</div></td>
                            <td><div className="patient-name">{inv.patient}</div></td>
                            <td style={{ fontSize: 12.5, color: "var(--muted)" }}>{inv.service}</td>
                            <td className="mono">{inv.date}</td>
                            <td><div className="inv-amount">${inv.amount.toLocaleString()}</div></td>
                            <td>
                              <span className={`badge ${inv.status === "paid" ? "badge-green" : inv.status === "overdue" ? "badge-red" : "badge-amber"}`}>
                                {inv.status}
                              </span>
                            </td>
                            <td>
                              <div className="inv-actions-cell">
                                {inv.status !== "paid" && (
                                  <button
                                    type="button"
                                    className="send-btn"
                                    onClick={() => openInvoiceReminderModal(inv)}
                                  >
                                    Send reminder
                                  </button>
                                )}
                                <button
                                  type="button"
                                  className="inv-trash"
                                  title="Delete invoice"
                                  aria-label={`Delete invoice ${inv.id}`}
                                  onClick={() => requestDeleteInvoice(inv)}
                                >
                                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {tab === "reviews" && (
              <>
                <div className="stats-row" style={{ gridTemplateColumns: "repeat(3,1fr)", marginBottom: 20 }}>
                  {[
                    {
                      label: "Avg Google Rating",
                      value:
                        googleAvgRating != null ? `${googleAvgRating.toFixed(1)} ★` : "—",
                      sub: (
                        <>
                          based on {googleReviewCount} published review
                          {googleReviewCount !== 1 ? "s" : ""} tracked here
                        </>
                      ),
                    },
                    {
                      label: "Requests Sent",
                      value:
                        reviewRequestsSentMonthCount > 0
                          ? String(reviewRequestsSentMonthCount)
                          : "0",
                      sub: (
                        <>
                          this month ·{" "}
                          {new Intl.DateTimeFormat("en-US", {
                            month: "long",
                            year: "numeric",
                          }).format(now)}
                        </>
                      ),
                    },
                    {
                      label: "Conversion Rate",
                      value:
                        reviewRequestsSentMonthCount > 0 && reviewConversionPct != null
                          ? `${reviewConversionPct}%`
                          : reviewRequestsSentMonthCount === 0
                            ? "—"
                            : "0%",
                      sub:
                        reviewRequestsSentMonthCount > 0 ? (
                          <>
                            <span className="up">
                              {reviewConvertedThisMonth} of {reviewRequestsSentMonthCount}
                            </span>{" "}
                            left a review (this month)
                          </>
                        ) : (
                          <>No review requests sent this month</>
                        ),
                    },
                  ].map((s, i) => (
                    <div className="stat-card" key={i}>
                      <div className="stat-label">{s.label}</div>
                      <div className="stat-value">{s.value}</div>
                      <div className="stat-sub">{s.sub}</div>
                    </div>
                  ))}
                </div>
                <div className="card">
                  <div className="rating-summary">
                    <div>
                      <div className="big-rating">
                        {googleAvgRating != null ? googleAvgRating.toFixed(1) : "—"}
                      </div>
                      <div className="stars" style={{ margin: "4px 0" }}>
                        {"★★★★★".split("").map((s, i) => (
                          <span
                            key={i}
                            className="star"
                            style={{
                              color:
                                googleAvgRating != null && i < Math.round(googleAvgRating)
                                  ? "#f59e0b"
                                  : "#e0e0dc",
                            }}
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                      <div className="rating-label">Google Reviews (from your list)</div>
                    </div>
                    <div className="rating-bars">
                      {ratingDist.map(([stars, pct, n]) => (
                        <div className="rating-bar-row" key={stars}>
                          <span>{stars}★</span>
                          <div className="rbar-track">
                            <div className="rbar-fill" style={{ width: `${pct}%` }} />
                          </div>
                          <span style={{ width: 34, textAlign: "right" }} title={`${n} review(s)`}>
                            {pct}%
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="card-header" style={{ background: "transparent" }}>
                    <div className="card-title">Review Requests</div>
                    <button
                      type="button"
                      className="card-action"
                      style={{
                        background: "none",
                        border: "none",
                        font: "inherit",
                        cursor: "pointer",
                        padding: 0,
                      }}
                      onClick={openGoogleBusinessReviews}
                    >
                      Google Business Profile ↗
                    </button>
                  </div>
                  {reviewList.map((r) => (
                    <div className="review-item" key={r.id}>
                      <div className="review-top">
                        <div>
                          <div className="review-name">{r.patient}</div>
                          <div className="review-date">Request sent {r.sentDate}</div>
                        </div>
                        <span
                          className={`badge ${r.status === "reviewed" ? "badge-green" : "badge-amber"}`}
                        >
                          {r.status}
                        </span>
                      </div>
                      {r.status === "reviewed" && r.snippet && (
                        <>
                          <div className="stars" style={{ marginBottom: 6 }}>
                            {"★★★★★".split("").map((s, i) => (
                              <span
                                key={i}
                                className="star"
                                style={{ color: i < r.rating ? "#f59e0b" : "#e0e0dc" }}
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                          <div className="review-snippet">"{r.snippet}"</div>
                          {r.ownerReply && (
                            <div className="review-owner-reply">
                              <div className="review-owner-reply-label">Your public reply</div>
                              {r.ownerReply}
                              {r.repliedAt && (
                                <div className="review-reply-meta">Saved in Ivory Insight · {r.repliedAt}</div>
                              )}
                            </div>
                          )}
                          <div className="review-respond-panel">
                            <div className="review-respond-toggle-wrap">
                              <button
                                type="button"
                                className="reminder-reply-toggle"
                                aria-expanded={reviewRespondOpenId === r.id}
                                aria-controls={`review-respond-compose-${r.id}`}
                                id={`review-respond-toggle-${r.id}`}
                                onClick={() =>
                                  setReviewRespondOpenId((open) =>
                                    open === r.id ? null : r.id
                                  )
                                }
                              >
                                <svg
                                  className="reminder-chevron"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                >
                                  <path d="M6 9l6 6 6-6" />
                                </svg>
                                {reviewRespondOpenId === r.id
                                  ? "Hide response"
                                  : r.ownerReply
                                    ? "Update response"
                                    : "Write a response"}
                              </button>
                            </div>
                            {reviewRespondOpenId === r.id && (
                              <div
                                className="review-respond-expand"
                                id={`review-respond-compose-${r.id}`}
                                role="region"
                                aria-labelledby={`review-respond-toggle-${r.id}`}
                              >
                                <div className="review-respond-label">
                                  Public reply (for Google Business)
                                </div>
                                <textarea
                                  className="review-textarea"
                                  placeholder={`Thank ${r.patient.split(" ")[0] || "them"} and invite them back…`}
                                  value={
                                    reviewReplyDrafts[r.id] !== undefined
                                      ? reviewReplyDrafts[r.id]
                                      : r.ownerReply || ""
                                  }
                                  onChange={(e) =>
                                    setReviewReplyDrafts((d) => ({
                                      ...d,
                                      [r.id]: e.target.value,
                                    }))
                                  }
                                  aria-label={`Reply to ${r.patient}`}
                                />
                                <div className="review-respond-hint">
                                  Draft your public reply here, then paste it in{" "}
                                  <button
                                    type="button"
                                    style={{
                                      display: "inline",
                                      padding: 0,
                                      border: "none",
                                      background: "none",
                                      font: "inherit",
                                      color: "#2563eb",
                                      cursor: "pointer",
                                      textDecoration: "underline",
                                    }}
                                    onClick={openGoogleBusinessReviews}
                                  >
                                    Google Business Profile
                                  </button>{" "}
                                  to publish. Ratings, request counts, and conversion here follow the
                                  patients on this list.
                                </div>
                                <div className="review-respond-actions">
                                  <button
                                    type="button"
                                    className="btn-primary"
                                    style={{ height: 34, fontSize: 12.5 }}
                                    onClick={() => saveOwnerReviewReply(r.id)}
                                    disabled={
                                      !(
                                        (
                                          reviewReplyDrafts[r.id] !== undefined
                                            ? reviewReplyDrafts[r.id]
                                            : r.ownerReply || ""
                                        ).trim()
                                      )
                                    }
                                  >
                                    {r.ownerReply ? "Save update" : "Save reply"}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn-ghost"
                                    style={{ height: 34, fontSize: 12.5 }}
                                    onClick={openGoogleBusinessReviews}
                                  >
                                    Open Google to post
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </>
                      )}
                      {r.status === "pending" && (
                        <div className="review-pending-msg">
                          ⏳ Waiting for patient to leave a review
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}

            {tab === "profile" && (
              <div className="profile-wrap">
                <div className="profile-card">
                  <div className="profile-section">
                    <div className="panel-form-title" style={{ marginBottom: 16 }}>Practice branding</div>
                    <div className="profile-photo-row">
                      <div className="profile-avatar-lg" style={{ borderRadius: 10 }}>
                        {practiceLogo ? (
                          <img src={practiceLogo} alt="" style={{ objectFit: "contain", background: "var(--bg)" }} />
                        ) : (
                          <span style={{ fontSize: 14, padding: 8, textAlign: "center", lineHeight: 1.3 }}>Logo</span>
                        )}
                      </div>
                      <div className="profile-photo-actions">
                        <input ref={practiceLogoInputRef} type="file" accept="image/*" className="file-input-hidden" onChange={handlePracticeLogoChange} />
                        <button type="button" className="btn-primary" style={{ maxWidth: 220 }} onClick={() => practiceLogoInputRef.current?.click()}>
                          Upload practice logo
                        </button>
                        {practiceLogo && (
                          <button type="button" className="btn-text-danger" style={{ alignSelf: "flex-start" }} onClick={() => setPracticeLogo("")}>
                            Remove logo
                          </button>
                        )}
                        <p style={{ fontSize: 12, color: "var(--muted)" }}>Shown next to the practice name in the sidebar.</p>
                      </div>
                    </div>
                    <div className="form-group" style={{ marginTop: 18 }}>
                      <label>Practice name</label>
                      <input className="form-input" style={{ width: "100%", maxWidth: 400 }} value={practiceName} onChange={(e) => setPracticeName(e.target.value)} placeholder="Ivory Insight" />
                    </div>
                    <div className="form-group">
                      <label>Tagline (under name)</label>
                      <input className="form-input" style={{ width: "100%", maxWidth: 400 }} value={practiceTagline} onChange={(e) => setPracticeTagline(e.target.value)} placeholder="Practice Portal" />
                    </div>
                  </div>
                  <div className="profile-section">
                    <div className="panel-form-title" style={{ marginBottom: 16 }}>Your photo</div>
                    <div className="profile-photo-row">
                      <div className="profile-avatar-lg">
                        {dentistPhoto ? <img src={dentistPhoto} alt="" /> : avatarLabel}
                      </div>
                      <div className="profile-photo-actions">
                        <input ref={photoInputRef} type="file" accept="image/*" className="file-input-hidden" onChange={handlePhotoChange} />
                        <button type="button" className="btn-primary" style={{ maxWidth: 220 }} onClick={() => photoInputRef.current?.click()}>
                          Upload photo
                        </button>
                        {dentistPhoto && (
                          <button type="button" className="btn-text-danger" style={{ alignSelf: "flex-start" }} onClick={() => setDentistPhoto("")}>
                            Remove photo
                          </button>
                        )}
                        <p style={{ fontSize: 12, color: "var(--muted)" }}>JPG or PNG. Shown in the sidebar and here.</p>
                      </div>
                    </div>
                  </div>
                  <div className="profile-section">
                    <div className="panel-form-title" style={{ marginBottom: 14 }}>Name & title</div>
                    <div className="form-group" style={{ marginBottom: 12 }}>
                      <label>Display name</label>
                      <input className="form-input" style={{ width: "100%", maxWidth: 400 }} value={dentistName} onChange={e => setDentistName(e.target.value)} placeholder="Dr. Sushma" />
                    </div>
                    <div className="form-group">
                      <label>Title / role</label>
                      <input className="form-input" style={{ width: "100%", maxWidth: 400 }} value={dentistTitle} onChange={e => setDentistTitle(e.target.value)} placeholder="Lead Dentist" />
                    </div>
                  </div>
                  <div className="profile-section">
                    <div className="panel-form-title" style={{ marginBottom: 14 }}>Reminder contact</div>
                    <p style={{ fontSize: 12, color: "var(--muted)", marginBottom: 14, lineHeight: 1.55 }}>
                      Add one or more reply addresses. Click <strong>Save reminder contacts</strong> — new addresses need a verification code before they go live on invoice reminders. All saved emails are BCC’d when you send from your desktop. Your callback phone is saved with the same button (no code).{" "}
                      <em style={{ color: "var(--text)" }}>
                        This build simulates email delivery: the code appears in the dialog so you can test the flow.
                      </em>
                    </p>
                    {reminderContactSaveError && (
                      <p style={{ fontSize: 13, color: "var(--red)", marginBottom: 10 }}>{reminderContactSaveError}</p>
                    )}
                    <div className="form-group" style={{ marginBottom: 14 }}>
                      <label>Reply emails</label>
                      {reminderEmailRows.map((row, i) => (
                        <div className="reminder-email-row" key={i}>
                          <input
                            className="form-input"
                            type="email"
                            placeholder="e.g. billing@yourpractice.com"
                            autoComplete="email"
                            value={row}
                            onChange={(e) => {
                              const v = e.target.value;
                              setReminderEmailRows((rows) =>
                                rows.map((r, j) => (j === i ? v : r))
                              );
                            }}
                            aria-label={`Reminder email ${i + 1}`}
                          />
                          {row.trim() && verifiedReminderEmails.includes(row.trim()) && (
                            <span className="verified-pill">Verified</span>
                          )}
                          <button
                            type="button"
                            className="btn-ghost"
                            style={{ height: 36, flexShrink: 0 }}
                            disabled={reminderEmailRows.length <= 1}
                            onClick={() =>
                              setReminderEmailRows((rows) => rows.filter((_, j) => j !== i))
                            }
                            aria-label="Remove email row"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        className="btn-ghost"
                        style={{ marginTop: 4 }}
                        onClick={() => setReminderEmailRows((rows) => [...rows, ""])}
                      >
                        + Add another email
                      </button>
                    </div>
                    <div className="form-group" style={{ marginBottom: 16 }}>
                      <label>Callback phone (SMS / calls)</label>
                      <input
                        className="form-input"
                        type="tel"
                        style={{ width: "100%", maxWidth: "none" }}
                        value={reminderPhoneDraft}
                        onChange={(e) => setReminderPhoneDraft(e.target.value)}
                        placeholder="e.g. (312) 555-0100"
                        autoComplete="tel"
                      />
                    </div>
                    <button type="button" className="btn-primary" onClick={saveReminderContacts}>
                      Save reminder contacts
                    </button>
                    <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 18, lineHeight: 1.5 }}>
                      Email sign-in, QR code, and mobile link are on{" "}
                      <button
                        type="button"
                        onClick={() => setTab("phonePortal")}
                        style={{
                          background: "none",
                          border: "none",
                          padding: 0,
                          font: "inherit",
                          color: "#2563eb",
                          cursor: "pointer",
                          textDecoration: "underline",
                          fontWeight: 500,
                        }}
                      >
                        Phone &amp; QR
                      </button>{" "}
                      in the sidebar (right under My profile).
                    </p>
                  </div>
                </div>
              </div>
            )}

            {tab === "phonePortal" && (
              <div className="profile-wrap">
                <div className="profile-card">
                  <div className="profile-section">
                    <div className="panel-form-title" style={{ marginBottom: 14 }}>Sign in with email</div>
                    <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, marginBottom: 14 }}>
                      Optional: remember this browser with your work email. Verification codes are simulated (no
                      mail server in this build). You can still use the portal without signing in.
                    </p>
                    {signedInEmail ? (
                      <div>
                        <p style={{ fontSize: 14, marginBottom: 10 }}>
                          Signed in as <strong>{signedInEmail}</strong>
                        </p>
                        <button type="button" className="btn-ghost" onClick={signOutEmailSession}>
                          Sign out
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="form-group" style={{ marginBottom: 12 }}>
                          <label>Email</label>
                          <input
                            className="form-input"
                            type="email"
                            autoComplete="email"
                            placeholder="e.g. dr.name@yourpractice.com"
                            style={{ maxWidth: "none" }}
                            value={emailAuthInput}
                            onChange={(e) => {
                              setEmailAuthInput(e.target.value);
                              setEmailAuthError("");
                            }}
                          />
                        </div>
                        {!emailAuthExpected ? (
                          <button type="button" className="btn-primary" onClick={sendEmailSignInCode}>
                            Send sign-in code
                          </button>
                        ) : (
                          <>
                            <div className="profile-phone-auth-demo">
                              <strong>Demo:</strong> No email is sent from this app. Your code is{" "}
                              <span className="mono" style={{ fontWeight: 600 }}>{emailAuthExpected}</span> —
                              enter it below. After you deploy to a real URL, the QR on this page will point at that
                              site—not <code style={{ fontSize: 11 }}>localhost</code>, which only works on this
                              computer.
                            </div>
                            <div className="form-group" style={{ marginTop: 12 }}>
                              <label>6-digit code</label>
                              <input
                                className="form-input"
                                type="text"
                                inputMode="numeric"
                                autoComplete="one-time-code"
                                placeholder="000000"
                                style={{ maxWidth: 200 }}
                                value={emailAuthCodeInput}
                                onChange={(e) =>
                                  setEmailAuthCodeInput(
                                    e.target.value.replace(/\D/g, "").slice(0, 6)
                                  )
                                }
                              />
                            </div>
                            {emailAuthError && (
                              <p style={{ fontSize: 13, color: "var(--red)", marginTop: 8 }}>
                                {emailAuthError}
                              </p>
                            )}
                            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
                              <button
                                type="button"
                                className="btn-primary"
                                onClick={verifyEmailSignInCode}
                                disabled={emailAuthCodeInput.trim().length < 6}
                              >
                                Verify & sign in
                              </button>
                              <button type="button" className="btn-ghost" onClick={sendEmailSignInCode}>
                                Resend code
                              </button>
                            </div>
                          </>
                        )}
                        {emailAuthError && !emailAuthExpected && (
                          <p style={{ fontSize: 13, color: "var(--red)", marginTop: 8 }}>{emailAuthError}</p>
                        )}
                      </>
                    )}
                  </div>
                  <div className="profile-section">
                    <div className="panel-form-title" style={{ marginBottom: 14 }}>Phone &amp; QR portal</div>
                    <p style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.55, marginBottom: 12 }}>
                      Scan the QR code with your phone camera to open <strong>Ivory Insight</strong> in a{" "}
                      <strong>mobile layout</strong> (same colors, full-width tabs, bottom navigation). Or copy
                      the link and save it to your home screen (Share → Add to Home Screen / bookmark).
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text)", marginBottom: 12, lineHeight: 1.55 }}>
                      <strong>Why localhost fails on your phone:</strong> During development the link often looks
                      like <code style={{ fontSize: 11 }}>http://localhost:5173</code> — that URL only exists on
                      your laptop, so your phone can’t open it. After you host the app (for example{" "}
                      <strong>GitHub Pages</strong>, Vercel, or Netlify), open the deployed site, come back here, and
                      the QR / copy link will use your <strong>public https://…</strong> address — then scanning on
                      your phone works.
                    </p>
                    <p style={{ fontSize: 12, color: "var(--text)", marginBottom: 4 }}>
                      <strong>Tip:</strong> The QR uses your current browser address plus{" "}
                      <code style={{ fontSize: 11 }}>?view=mobile</code>. Small screens use the phone layout
                      automatically.
                    </p>
                    {mobileQrDataUrl ? (
                      <div className="qr-box">
                        <img src={mobileQrDataUrl} alt="QR code to open Ivory Insight mobile layout" width={240} height={240} />
                      </div>
                    ) : (
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Generating QR…</div>
                    )}
                    <div className="mobile-link-row">
                      <input
                        className="mobile-link-input"
                        readOnly
                        value={mobileShareUrl}
                        aria-label="Mobile portal URL"
                        onFocus={(e) => e.target.select()}
                      />
                      <button type="button" className="btn-primary" onClick={copyMobilePortalLink}>
                        {mobileLinkCopied ? "Copied!" : "Copy link"}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        </main>
        {isMobileLayout && (
          <nav className="mobile-tabbar" aria-label="Main navigation">
            {navItems.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`mobile-tab ${tab === item.id ? "active" : ""}`}
                onClick={() => {
                  setTab(item.id);
                  setMobileDrawerOpen(false);
                }}
                aria-current={tab === item.id ? "page" : undefined}
              >
                {item.icon}
                <span>{mobileTabLabels[item.id] ?? item.label}</span>
              </button>
            ))}
          </nav>
        )}
      </div>

      {confirmDialog && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setConfirmDialog(null)}
          onKeyDown={(e) => e.key === "Escape" && setConfirmDialog(null)}
        >
          <div
            className="modal"
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div id="confirm-title" className="modal-title">{confirmDialog.title}</div>
            <div className="modal-body">{confirmDialog.message}</div>
            <div className="modal-actions">
              <button type="button" className="btn-modal-cancel" onClick={() => setConfirmDialog(null)}>
                Cancel
              </button>
              <button
                type="button"
                className={`btn-modal-confirm ${confirmDialog.danger ? "danger" : ""}`}
                onClick={() => confirmDialog.onConfirm()}
              >
                {confirmDialog.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {invoiceReminderModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setInvoiceReminderModal(null)}
        >
          <div
            className="modal modal-reminder-composer"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inv-reminder-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div id="inv-reminder-title" className="modal-title">
              {invoiceReminderModal.remindVia === "email"
                ? "Payment reminder — Email"
                : "Payment reminder — SMS"}
            </div>
            <div className="modal-meta-line">
              <strong>{invoiceReminderModal.invoice.patient}</strong>
              {invoiceReminderModal.remindVia === "email" ? (
                invoiceReminderModal.email ? (
                  <> · {invoiceReminderModal.email}</>
                ) : (
                  <> · no email on file — enter it on the invoice or under Patients</>
                )
              ) : invoiceReminderModal.phone ? (
                <> · {invoiceReminderModal.phone}</>
              ) : (
                <> · no phone on file — enter it on the invoice or under Patients</>
              )}
              <br />
              Greeting uses <strong>first name</strong> and <strong>last name</strong> from the invoice:{" "}
              <strong>{invoiceReminderModal.firstName || "—"}</strong> /{" "}
              <strong>{invoiceReminderModal.lastName || "(add a last name on the invoice patient field)"}</strong>
            </div>
            <textarea
              className="modal-textarea"
              value={invoiceReminderModal.messageDraft}
              onChange={(e) =>
                setInvoiceReminderModal((m) =>
                  m ? { ...m, messageDraft: e.target.value } : null
                )
              }
              aria-label={
                invoiceReminderModal.remindVia === "email"
                  ? "Reminder email body"
                  : "Reminder SMS text"
              }
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setInvoiceReminderModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-confirm"
                onClick={confirmSendInvoiceReminder}
                disabled={
                  !invoiceReminderModal.messageDraft.trim() ||
                  (invoiceReminderModal.remindVia === "email"
                    ? !invoiceReminderModal.email?.trim()
                    : !invoiceReminderModal.phone?.trim())
                }
              >
                {invoiceReminderModal.remindVia === "email" ? "Send email" : "Send SMS"}
              </button>
            </div>
          </div>
        </div>
      )}

      {reminderEmailVerifyModal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onClick={() => setReminderEmailVerifyModal(null)}
        >
          <div
            className="modal"
            style={{ maxWidth: 460 }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="verify-email-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div id="verify-email-title" className="modal-title">
              Verify email
              {reminderEmailVerifyModal.queue.length > 1 ? (
                <span style={{ fontWeight: 400, color: "var(--muted)", fontSize: 13 }}>
                  {" "}
                  ({reminderEmailVerifyModal.idx + 1} of {reminderEmailVerifyModal.queue.length})
                </span>
              ) : null}
            </div>
            <div className="modal-body">
              We sent a verification code to{" "}
              <strong>{verifyModalEmail}</strong>. Enter it below to finish saving.
              <div
                style={{
                  marginTop: 14,
                  padding: "12px 14px",
                  background: "var(--bg)",
                  borderRadius: 8,
                  border: "1px solid var(--border)",
                  fontSize: 13,
                  lineHeight: 1.5,
                }}
              >
                <strong>Demo:</strong> there is no mail server in this app. Your code for this address is{" "}
                <span className="mono" style={{ fontWeight: 600 }}>{verifyModalDemoCode}</span> — in production this would arrive by email only.
              </div>
            </div>
            {reminderEmailVerifyModal.error && (
              <p style={{ fontSize: 13, color: "var(--red)", marginBottom: 10 }}>
                {reminderEmailVerifyModal.error}
              </p>
            )}
            <input
              className="form-input"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={reminderEmailVerifyModal.codeInput}
              onChange={(e) =>
                setReminderEmailVerifyModal({
                  ...reminderEmailVerifyModal,
                  codeInput: e.target.value.replace(/\D/g, "").slice(0, 6),
                  error: "",
                })
              }
              onKeyDown={(e) => e.key === "Enter" && submitReminderEmailVerification()}
              style={{ marginBottom: 14 }}
              aria-label="Verification code"
            />
            <div className="modal-actions">
              <button
                type="button"
                className="btn-modal-cancel"
                onClick={() => setReminderEmailVerifyModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-modal-confirm"
                onClick={submitReminderEmailVerification}
                disabled={reminderEmailVerifyModal.codeInput.trim().length < 6}
              >
                Verify & continue
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
