/* Maintaino · data layer and helpers (no screens here).

   Sections: SUPABASE · UTILS · CONFIG · DERIVED · FILES · DB · CONTEXT */

import { createContext, useContext } from "react";

import {

  Phone, Check, ShieldCheck, Droplets, Wrench, Zap, Leaf, Sparkles,

  Car, Building2, Receipt, AlertTriangle, PartyPopper, Hammer, Stethoscope, HeartPulse,

  Truck, Info,

} from "lucide-react";

import { createClient } from "@supabase/supabase-js";


 

/* ==================================================================

   SUPABASE

   ================================================================== */

const url = import.meta.env.VITE_SUPABASE_URL;

const key = import.meta.env.VITE_SUPABASE_ANON_KEY;


 

// False when the two environment variables are missing (shows a setup screen instead of crashing).

export const configured = Boolean(url && key);


 

export const supabase = createClient(url || "https://placeholder.supabase.co", key || "placeholder", {

  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },

});


 

/* ==================================================================

   UTILS

   ================================================================== */

export const localISO = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export const TODAY_ISO = localISO();

export const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export const pad = (n) => String(n).padStart(2, "0");

export const inr = (n) => "₹" + Math.round(Number(n) || 0).toLocaleString("en-IN");

export const parseD = (iso) => new Date((iso || "").slice(0, 10) + "T00:00:00");

export const fmt = (iso) => (iso ? `${pad(parseD(iso).getDate())} ${MONTH_NAMES[parseD(iso).getMonth()].slice(0, 3)}` : "—");

export const fmtY = (iso) => (iso ? `${fmt(iso)} ${parseD(iso).getFullYear()}` : "—");

export const ymOf = (iso) => iso.slice(0, 7);

export const mLabel = (ym) => `${MONTH_NAMES[+ym.slice(5, 7) - 1]} ${ym.slice(0, 4)}`;

export const nextYM = (ym) => { let y = +ym.slice(0, 4), m = +ym.slice(5, 7) + 1; if (m > 12) { m = 1; y++; } return `${y}-${pad(m)}`; };

export const monthsBetween = (a, b) => (+b.slice(0, 4) - +a.slice(0, 4)) * 12 + (+b.slice(5, 7) - +a.slice(5, 7));

export const daysLeft = (ym) => { const [y, m] = ym.split("-").map(Number); return Math.max(0, Math.round((new Date(y, m, 0) - parseD(TODAY_ISO)) / 86400000)); };

export let idCounter = 0;

export const newId = (p) => `${p}_${Date.now().toString(36)}${(idCounter++).toString(36)}`;

export const nowTs = () => `${TODAY_ISO}T${new Date().toTimeString().slice(0, 8)}`;

export const cx = (...a) => a.filter(Boolean).join(" ");

export const sum = (arr, f) => arr.reduce((s, x) => s + f(x), 0);

export const initials = (name) => name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();


 

export function download(name, content, type = "application/json") {

  try {

    const blob = new Blob([content], { type });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");

    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1500);

  } catch (e) { console.error(e); }

}

export const csvEscape = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export const toCSV = (columns, rows) => "\ufeff" + [columns, ...rows].map((r) => r.map(csvEscape).join(",")).join("\r\n");



 

// "2026-10-24T09:15:00+00:00" (from the database) -> local "2026-10-24T14:45:00"

export const localTs = (iso) => {

  const d = new Date(iso);

  const p = (n) => String(n).padStart(2, "0");

  return `${localISO(d)}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;

};


 

// Turns technical errors into short messages a resident can act on.

export const errMsg = (e) => {

  const m = String((e && (e.message || e.error_description)) || e || "");

  if (/Failed to fetch|NetworkError|Load failed|network request failed/i.test(m)) return "Cannot reach the server. Check your internet and try again.";

  if (/^Only the /i.test(m) || /^(Please|Choose|A term|The new term|This overlaps|Add between|Monthly maintenance|Apartment name|You cannot|You already|Complaint not found|Term not found|Only a planned)/i.test(m)) return m;

  if (/row-level security|permission denied|not allowed/i.test(m)) return "You do not have permission to do that.";

  if (/duplicate key|already exists/i.test(m)) return "This already exists. Check the email, name or number and try again.";

  if (/Invalid login credentials/i.test(m)) return "Email or password is not correct.";

  if (/Email not confirmed/i.test(m)) return "Please open the confirmation link we emailed you, then sign in.";

  if (/already registered/i.test(m)) return "This email already has an account. Please sign in.";

  if (/rate limit|too many/i.test(m)) return "Too many attempts. Please wait a few minutes and try again.";

  if (/JWT|session|refresh token/i.test(m)) return "Your session has ended. Please sign in again.";

  if (/file is larger|smaller file/i.test(m)) return m;

  // Anything technical (database or provider wording) is logged for the developer, not shown to residents.

  return "Something went wrong on the server. Please try again in a moment.";

};


 

/* ==================================================================

   CONFIG

   ================================================================== */

export const TONE = {

  slate: { bg: "bg-slate-100", text: "text-slate-700", solid: "bg-slate-600", border: "border-slate-300", bar: "bg-slate-500" },

  blue: { bg: "bg-blue-50", text: "text-blue-700", solid: "bg-blue-600", border: "border-blue-200", bar: "bg-blue-600" },

  green: { bg: "bg-green-50", text: "text-green-700", solid: "bg-green-600", border: "border-green-200", bar: "bg-green-600" },

  amber: { bg: "bg-amber-50", text: "text-amber-700", solid: "bg-amber-500", border: "border-amber-200", bar: "bg-amber-500" },

  red: { bg: "bg-red-50", text: "text-red-700", solid: "bg-red-600", border: "border-red-200", bar: "bg-red-600" },

};

export const EXPENSE_CATS = {

  Security: ShieldCheck, Housekeeping: Sparkles, Plumbing: Wrench, Electricity: Zap,

  Water: Droplets, Gardening: Leaf, Repairs: Hammer, Miscellaneous: Receipt,

};

export const NOTICE_TYPES = {

  "General": { icon: Info, tone: "slate" },

  "Water Shutdown": { icon: Droplets, tone: "blue" },

  "Maintenance Work": { icon: Wrench, tone: "amber" },

  "Festival Celebration": { icon: PartyPopper, tone: "green" },

  "Emergency Alert": { icon: AlertTriangle, tone: "red" },

};

export const COMPLAINT_CATS = {

  Water: Droplets, Plumbing: Wrench, Electricity: Zap, Security: ShieldCheck,

  Parking: Car, Cleaning: Sparkles, Lift: Building2, Other: Info,

};

export const COMPLAINT_STATUS = { "Open": "red", "In Progress": "amber", "Resolved": "green", "Closed": "slate" };

export const PAY_TONE = { Paid: "green", Partial: "amber", Pending: "red" };

export const VENDOR_CATS = ["Electrician", "Plumber", "Carpenter", "Generator Service", "Water Supplier", "Hospital", "Ambulance", "Other"];

export const VENDOR_ICON = { Electrician: Zap, Plumber: Wrench, Carpenter: Hammer, "Generator Service": Zap, "Water Supplier": Truck, Hospital: Stethoscope, Ambulance: HeartPulse, Other: Phone };

export const AUDIT_TYPES = {

  admin: { label: "Admin", tone: "blue" }, expense: { label: "Expense", tone: "red" },

  payment: { label: "Payment", tone: "green" }, notice: { label: "Notice", tone: "amber" },

  complaint: { label: "Complaint", tone: "red" }, work: { label: "Work", tone: "blue" },

  review: { label: "Review", tone: "green" }, vendor: { label: "Vendor", tone: "slate" },

  house: { label: "Houses", tone: "slate" }, backup: { label: "Backup", tone: "slate" },

};


 

/* ==================================================================

   DERIVED

   ================================================================== */

export const activeHouses = (d) => d.houses.filter((h) => h.state !== "Archived");

export const houseName = (d, id) => d.houses.find((h) => h.id === id)?.name || `House ${id}`;

export const dueOf = (d, ym) => d.months[ym]?.due ?? 0;

export const confirmedPays = (d, ym) => d.payments.filter((p) => p.month === ym && p.status === "Confirmed" && p.state !== "Archived");

export const paidBy = (d, houseId, ym) => sum(confirmedPays(d, ym).filter((p) => p.houseId === houseId), (p) => p.amount);

export const owed = (d, houseId, upto) => Object.keys(d.months).filter((m) => m <= upto).reduce((s, m) => s + Math.max(0, dueOf(d, m) - paidBy(d, houseId, m)), 0);

export const arrearsOf = (d, houseId, ym) => Object.keys(d.months).filter((m) => m < ym).reduce((s, m) => s + Math.max(0, dueOf(d, m) - paidBy(d, houseId, m)), 0);

// ----- Admin schedule: any house, any number of months (no fixed order) -----

export const ymIdx = (ym) => +ym.slice(0, 4) * 12 + (+ym.slice(5, 7) - 1);

export const ymAdd = (ym, n) => { const i = ymIdx(ym) + n; return `${Math.floor(i / 12)}-${String((i % 12) + 1).padStart(2, "0")}`; };

export const termsOf = (d) => (d.terms || []).filter((t) => t.state !== "Archived");

export const termEnd = (t) => ymAdd(t.start, t.months - 1);

export const adminTermFor = (d, ym) => termsOf(d)

  .filter((t) => ymIdx(t.start) <= ymIdx(ym) && ymIdx(ym) <= ymIdx(termEnd(t)))

  .sort((a, b) => ymIdx(b.start) - ymIdx(a.start))[0] || null;

export const adminFor = (d, ym) => { const t = adminTermFor(d, ym); return t ? t.houseId : (ymIdx(ym) >= ymIdx(d.currentMonth) ? d.adminHouseId : null); };

export const currentTerm = (d) => adminTermFor(d, d.currentMonth);

export const nextTermOf = (d) => termsOf(d).filter((t) => ymIdx(t.start) > ymIdx(d.currentMonth)).sort((a, b) => ymIdx(a.start) - ymIdx(b.start))[0] || null;

export const membersOf = (d, houseId) => d.members.filter((m) => m.houseId === houseId && m.state !== "Archived");

export const votesOf = (d, workId) => d.votes.filter((v) => v.workId === workId && v.state !== "Archived");

export const workStatus = (d, w) => {

  const v = votesOf(d, w.id), n = activeHouses(d).length;

  const a = v.filter((x) => x.vote === "Approve").length, r = v.filter((x) => x.vote === "Reject").length;

  if (a * 2 > n) return "Approved"; if (r * 2 >= n) return "Rejected"; return "Voting";

};

export const reviewsOf = (d, ym) => d.reviews[ym] || [];

export const isReviewedBy = (d, ym, houseId) => reviewsOf(d, ym).some((r) => r.houseId === houseId);


 

export function monthStats(d, ym) {

  const hs = activeHouses(d);

  const expected = hs.length * dueOf(d, ym);

  const pays = confirmedPays(d, ym);

  const collected = sum(pays, (p) => p.amount);

  const exps = d.expenses.filter((e) => ymOf(e.date) === ym && e.state !== "Archived");

  const expenses = sum(exps, (e) => e.amount);

  const opening = d.months[ym]?.opening ?? 0;

  const byCat = {};

  exps.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });

  const txns = [

    ...pays.map((p) => ({ kind: "in", id: p.id, date: p.date, title: `${houseName(d, p.houseId)} maintenance`, amount: p.amount, sub: p.mode })),

    ...exps.map((e) => ({ kind: "out", id: e.id, date: e.date, title: e.description, amount: e.amount, sub: e.category })),

  ].sort((a, b) => b.date.localeCompare(a.date));

  return { opening, collected, expenses, closing: opening + collected - expenses, expected, pending: Math.max(0, expected - collected), byCat, txns };

}


 

// ----- One report for a month, a quarter or a year -----

export const periodKeyOf = (type, ym) => (type === "month" ? ym : type === "quarter" ? `${ym.slice(0, 4)}-Q${Math.ceil(+ym.slice(5, 7) / 3)}` : ym.slice(0, 4));

export const periodRange = (type, key) => {

  if (type === "month") return [key, key];

  if (type === "quarter") { const s0 = `${key.slice(0, 4)}-${String((+key.slice(6) - 1) * 3 + 1).padStart(2, "0")}`; return [s0, ymAdd(s0, 2)]; }

  return [`${key}-01`, `${key}-12`];

};

export const periodLabel = (type, key) => {

  if (type === "month") return mLabel(key);

  if (type === "quarter") { const q = +key.slice(6) - 1; return `${MONTH_NAMES[q * 3].slice(0, 3)} – ${MONTH_NAMES[q * 3 + 2].slice(0, 3)} ${key.slice(0, 4)}`; }

  return key;

};

export const periodOptions = (d, type) => {

  const yms = [...Object.keys(d.months), d.currentMonth];

  return [...new Set(yms.map((m) => periodKeyOf(type, m)))].sort().reverse();

};


 

export function buildReport(d, type, key) {

  const [start, end] = periodRange(type, key);

  const inRange = (ym) => ymIdx(ym) >= ymIdx(start) && ymIdx(ym) <= ymIdx(end);

  const have = Object.keys(d.months).filter(inRange).sort();

  const hs = activeHouses(d);

  const pays = d.payments.filter((p) => p.status === "Confirmed" && p.state !== "Archived" && inRange(p.month));

  const exps = d.expenses.filter((e) => e.state !== "Archived" && inRange(ymOf(e.date))).sort((a, b) => a.date.localeCompare(b.date));

  const comps = d.complaints.filter((c) => c.state !== "Archived" && inRange(ymOf(c.date))).sort((a, b) => a.date.localeCompare(b.date));

  const collected = sum(pays, (p) => p.amount);

  const spent = sum(exps, (e) => e.amount);

  const opening = have.length ? d.months[have[0]].opening : 0;

  const toDate = ymIdx(d.currentMonth) >= ymIdx(start) && ymIdx(d.currentMonth) <= ymIdx(end);

  const admins = [...new Set(have.map((m) => adminFor(d, m)).filter(Boolean))].map((id) => houseName(d, id)).join(", ") || "—";

  const byCat = {};

  exps.forEach((e) => { byCat[e.category] = (byCat[e.category] || 0) + e.amount; });

  const summary = [

    ["Apartment", d.settings.apartmentName],

    ["Period", periodLabel(type, key)],

    ["Admin", admins],

    ["Opening balance", inr(opening)],

    ["Maintenance collected", inr(collected)],

    ["Total expenses", inr(spent)],

    [toDate ? "Balance to date" : "Closing balance", inr(opening + collected - spent)],

  ];

  if (type === "month") summary.push(["Houses reviewed", `${reviewsOf(d, key).length} of ${hs.length}`]);

  summary.push(["Complaints raised", String(comps.length)]);

  const sections = [

    { title: "Maintenance by house", columns: ["House", "Due (₹)", "Paid (₹)", "Pending (₹)", "Status"],

      rows: hs.map((h) => { const due = sum(have, (m) => d.months[m].due); const paid = sum(pays.filter((p) => p.houseId === h.id), (p) => p.amount); return [h.name, due, paid, Math.max(0, due - paid), paid >= due && due > 0 ? "Paid" : paid > 0 ? "Partial" : "Pending"]; }) },

    { title: "Expenses by category", columns: ["Category", "Amount (₹)", "Share"],

      rows: Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([c, a]) => [c, a, `${Math.round((a / (spent || 1)) * 100)}%`]) },

    { title: "Expense details", columns: ["Date", "Category", "Description", "Vendor", "Amount (₹)"],

      rows: exps.map((e) => [fmtY(e.date), e.category, e.description + (e.state === "Edited" ? " (edited)" : ""), e.vendor || "—", e.amount]) },

    { title: "Complaints", columns: ["Date", "House", "Category", "Title", "Status"],

      rows: comps.map((c) => [fmtY(c.date), houseName(d, c.houseId), c.category, c.title, c.status]) },

  ];

  return { title: "Maintaino report", label: periodLabel(type, key), summary, sections };

}


 

export function reportCSV(r) {

  const lines = [[r.title], ...r.summary];

  r.sections.forEach((sec) => { lines.push([]); lines.push([sec.title]); lines.push(sec.columns); sec.rows.forEach((row) => lines.push(row)); });

  return "\ufeff" + lines.map((row) => row.map(csvEscape).join(",")).join("\r\n");

}


 

/* ==================================================================

   FILES

   ================================================================== */

// Receipts, bills, quotations and photos live in the private "receipts" bucket under <apartment_id>/.

let apartmentId = null;

export const setApartmentId = (id) => { apartmentId = id; };


 

// "9f1c…-bescom_oct.pdf" -> "bescom_oct.pdf"

export const fileLabel = (path) => (path ? String(path).split("/").pop().replace(/^[0-9a-f]{8}-[0-9a-f-]{27}-/i, "") : "");


 

// Phone photos are 3-8 MB. Shrink them so the free 1 GB storage lasts for years.

async function shrinkImage(file, maxSide = 1600, quality = 0.8) {

  if (!file.type.startsWith("image/")) return file;

  try {

    const bmp = await createImageBitmap(file);

    const scale = Math.min(1, maxSide / Math.max(bmp.width, bmp.height));

    const canvas = document.createElement("canvas");

    canvas.width = Math.round(bmp.width * scale);

    canvas.height = Math.round(bmp.height * scale);

    canvas.getContext("2d").drawImage(bmp, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((res) => canvas.toBlob(res, "image/jpeg", quality));

    if (!blob) return file;

    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });

  } catch (e) {

    return file;

  }

}


 

export async function uploadReceipt(file) {

  if (!apartmentId) throw new Error("Not signed in to an apartment");

  const f = await shrinkImage(file);

  if (f.size > 5 * 1024 * 1024) throw new Error("This file is larger than 5 MB. Please choose a smaller file.");

  const safe = f.name.replace(/[^\w.\-]+/g, "_").slice(-60);

  const path = `${apartmentId}/${crypto.randomUUID()}-${safe}`;

  const { error } = await supabase.storage.from("receipts").upload(path, f, { contentType: f.type, upsert: false });

  if (error) throw error;

  return path;

}


 

// Opens a stored file in a new tab using a short-lived private link.

export async function openFile(path) {

  if (!path) return;

  const w = window.open("", "_blank"); // open first so phone browsers do not block it

  try {

    const { data, error } = await supabase.storage.from("receipts").createSignedUrl(path, 120);

    if (error) throw error;

    if (w) w.location.href = data.signedUrl; else window.location.href = data.signedUrl;

  } catch (e) {

    if (w) w.close();

    alert("Could not open this file. Check your internet connection and try again.");

  }

}


 

/* ==================================================================

   DB

   ================================================================== */

const ok = async (promise) => {

  const res = await promise;

  if (res.error) throw res.error;

  return res.data;

};


 

// Reads every row, 1000 at a time (Supabase returns at most 1000 per request).

async function fetchAll(table, orderCol = "created_at", ascending = true) {

  const out = [];

  const size = 1000;

  for (let from = 0; ; from += size) {

    const rows = await ok(supabase.from(table).select("*").order(orderCol, { ascending }).order("id").range(from, from + size - 1));

    out.push(...rows);

    if (rows.length < size) break;

  }

  return out;

}


 

export const BACKUP_TABLES = ["houses", "admin_terms", "members", "months", "payments", "expenses", "notices", "complaints", "work_requests", "votes", "vendors", "reviews", "transfers", "audit_log"];


 

const d10 = (v) => (v ? String(v).slice(0, 10) : null);

const num = (v) => Number(v) || 0;


 

/* ---------- database rows -> the shape the screens already use ---------- */

export async function loadAll(userId, claim = false) {

  if (claim) {

    const r = await supabase.rpc("claim_member"); // links this login to the member the Admin added

    if (r.error) console.warn("claim_member", r.error.message);

  }

  const meRow = await ok(supabase.from("members").select("*").eq("user_id", userId).neq("state", "Archived").maybeSingle());

  if (!meRow) return { me: null, data: null };


 

  const [apt, ...tables] = await Promise.all([

    ok(supabase.from("apartments").select("*").eq("id", meRow.apartment_id).single()),

    ...BACKUP_TABLES.filter((t) => t !== "audit_log").map((t) => fetchAll(t)),

    fetchAll("audit_log", "ts", true),

  ]);

  const T = {};

  [...BACKUP_TABLES.filter((t) => t !== "audit_log"), "audit_log"].forEach((t, i) => { T[t] = tables[i]; });

  setApartmentId(apt.id);


 

  const houses = T.houses

    .map((r) => ({ id: r.id, name: r.name, number: r.number, state: r.state }))

    .sort((a, b) => a.name.localeCompare(b.name, undefined, { numeric: true }));


 

  const months = {};

  T.months.forEach((r) => { months[r.ym] = { opening: num(r.opening), due: num(r.due) }; });


 

  const reviews = {};

  T.reviews.forEach((r) => { (reviews[r.ym] = reviews[r.ym] || []).push({ houseId: r.house_id, name: r.member_name, date: r.reviewed_on }); });


 

  const mapMember = (r) => ({ id: r.id, houseId: r.house_id, name: r.name, role: r.role, mobile: r.mobile || "", email: r.email || "", state: r.state, userId: r.user_id });


 

  const data = {

    apartmentId: apt.id,

    settings: { apartmentName: apt.name, city: apt.city || "", upi: apt.upi || "" },

    adminHouseId: apt.admin_house_id,

    currentMonth: apt.current_month,

    terms: T.admin_terms.map((r) => ({ id: r.id, houseId: r.house_id, start: r.start_ym, months: r.months, state: r.state })),

    houses,

    members: T.members.map(mapMember),

    months,

    payments: T.payments.map((r) => ({ id: r.id, houseId: r.house_id, month: r.ym, amount: num(r.amount), date: d10(r.paid_on), mode: r.mode, receipt: r.receipt, status: r.status, state: r.state })),

    expenses: T.expenses.map((r) => ({ id: r.id, date: d10(r.spent_on), category: r.category, description: r.description, amount: num(r.amount), vendor: r.vendor || "", receipt: r.receipt, addedBy: r.house_id, state: r.state, edits: r.edits || [] })),

    notices: T.notices.map((r) => ({ id: r.id, type: r.type, title: r.title, description: r.description, start: d10(r.start_date), expiry: d10(r.expiry_date), createdBy: r.created_by_name || "", pinned: r.pinned, state: r.state })),

    complaints: T.complaints.map((r) => ({ id: r.id, category: r.category, title: r.title, description: r.description, photo: r.photo, houseId: r.house_id, by: r.by_name || "", date: d10(r.created_on), status: r.status, state: r.state, events: r.events || [] })),

    workRequests: T.work_requests.map((r) => ({ id: r.id, title: r.title, description: r.description || "", estimate: num(r.estimate), vendor: r.vendor || "", quotation: r.quotation, due: d10(r.due_date), createdBy: r.created_by_house || "", date: d10(r.created_on), state: r.state })),

    votes: T.votes.map((r) => ({ id: r.id, workId: r.work_id, houseId: r.house_id, vote: r.vote, comment: r.comment || "", date: d10(r.voted_on), by: r.by_name || "", state: r.state })),

    vendors: T.vendors.map((r) => ({ id: r.id, name: r.name, phone: r.phone, category: r.category, notes: r.notes || "", state: r.state })),

    reviews,

    transfers: T.transfers

      .map((r) => ({ id: r.id, date: d10(r.transferred_on), from: r.from_house, to: r.to_house, month: r.ym, closingBalance: num(r.closing_balance), notes: r.notes || "", at: r.created_at }))

      .sort((a, b) => (a.date + a.at).localeCompare(b.date + b.at)),

    audit: T.audit_log.map((r) => ({ id: r.id, ts: localTs(r.ts), type: r.kind, text: r.message, by: r.by_name })),

  };

  return { me: mapMember(meRow), data };

}


 

/* ---------- first-time setup ---------- */

export async function createApartment(f) {

  return ok(supabase.rpc("create_apartment", {

    p_name: f.name, p_city: f.city, p_upi: f.upi, p_due: Number(f.due), p_opening: Number(f.opening || 0),

    p_houses: f.houses, p_my_house: f.myHouse, p_my_months: Number(f.myMonths || 1), p_my_name: f.myName, p_my_mobile: f.myMobile,

  }));

}


 

/* ---------- backup (raw rows, so a restore is exact) ---------- */

export async function exportBackup() {

  const tables = {};

  for (const t of BACKUP_TABLES) tables[t] = await fetchAll(t, t === "audit_log" ? "ts" : "created_at");

  const apartment = await ok(supabase.from("apartments").select("*").limit(1).maybeSingle());

  return { app: "maintaino", version: 3, exportedAt: new Date().toISOString(), apartment, tables };

}


 

/* ---------- every change the screens can make ---------- */

// Each function writes to Supabase and adds a line to the audit log. App.jsx wraps them so the

// screen refreshes afterwards and a toast/close only happens when the save really worked.

export function makeActions({ data, viewer, myHouseId, isAdmin, cur, nav }) {

  const hn = (id) => houseName(data, id);

  const who = `${viewer.name} · ${hn(myHouseId)}`;

  const log = (kind, message) => ok(supabase.from("audit_log").insert({ kind, message }));

  const digits = (s) => String(s || "").replace(/\D/g, "").slice(-10);

  const email = (s) => (String(s || "").trim().toLowerCase() || null);

  const patch = (table, id, p) => ok(supabase.from(table).update(p).eq("id", id));


 

  return {

    /* expenses */

    async addExpense(f) {

      await ok(supabase.from("expenses").insert({ spent_on: f.date, category: f.category, description: f.description.trim(), amount: Number(f.amount), vendor: f.vendor.trim() || null, receipt: f.receipt, house_id: myHouseId }));

      await log("expense", `Expense added: ${f.category} ${inr(f.amount)} (${f.description.trim()})`);

    },

    async editExpense(id, f) {

      const e = data.expenses.find((x) => x.id === id);

      await patch("expenses", id, {

        spent_on: f.date, category: f.category, description: f.description.trim(), amount: Number(f.amount), vendor: f.vendor.trim() || null, receipt: f.receipt, state: "Edited",

        edits: [...e.edits, { ts: nowTs(), by: who, note: `Changed from ${inr(e.amount)} (${e.category}) to ${inr(f.amount)} (${f.category})` }],

      });

      await log("expense", `Expense edited: ${f.description.trim()} now ${inr(f.amount)}`);

    },

    async archiveExpense(id) {

      const e = data.expenses.find((x) => x.id === id);

      await patch("expenses", id, { state: "Archived", edits: [...e.edits, { ts: nowTs(), by: who, note: "Archived" }] });

      await log("expense", `Expense archived: ${e.description} ${inr(e.amount)}`);

    },


 

    /* notices */

    async addNotice(f) {

      await ok(supabase.from("notices").insert({ type: f.type, title: f.title.trim(), description: f.description.trim(), start_date: f.start, expiry_date: f.expiry, pinned: !!f.pinned, created_by_name: `${hn(myHouseId)} · ${viewer.name}` }));

      await log("notice", `Notice published: ${f.title.trim()}`);

    },

    async editNotice(id, f) {

      await patch("notices", id, { type: f.type, title: f.title.trim(), description: f.description.trim(), start_date: f.start, expiry_date: f.expiry, pinned: !!f.pinned, state: "Edited" });

      await log("notice", `Notice edited: ${f.title.trim()}`);

    },

    async togglePin(id) {

      const n = data.notices.find((x) => x.id === id);

      await patch("notices", id, { pinned: !n.pinned });

      await log("notice", `Notice ${n.pinned ? "unpinned" : "pinned"}: ${n.title}`);

    },

    async archiveNotice(id, on) {

      const n = data.notices.find((x) => x.id === id);

      await patch("notices", id, { state: on ? "Archived" : "Active", pinned: on ? false : n.pinned });

      await log("notice", `Notice ${on ? "archived" : "restored"}: ${n.title}`);

    },


 

    /* complaints */

    async addComplaint(f) {

      await ok(supabase.from("complaints").insert({

        category: f.category, title: f.title.trim(), description: f.description.trim(), photo: f.photo, house_id: myHouseId, by_name: viewer.name, created_on: TODAY_ISO, status: "Open",

        events: [{ status: "Open", date: TODAY_ISO, by: who, note: "Complaint raised" }],

      }));

      await log("complaint", `Complaint raised: ${f.title.trim()} (${hn(myHouseId)})`);

    },

    async complaintEvent(id, status, note, commentOnly) {

      const c = data.complaints.find((x) => x.id === id);

      await ok(supabase.rpc("add_complaint_event", { p_id: id, p_status: status, p_note: note }));

      await log("complaint", commentOnly ? `Comment added on complaint: ${c.title}` : `Complaint ${status.toLowerCase()}: ${c.title}`);

    },


 

    /* maintenance payments */

    async recordPayment(houseId, f, asAdmin) {

      await ok(supabase.from("payments").insert({ house_id: houseId, ym: cur, amount: Number(f.amount), paid_on: f.date, mode: f.mode, receipt: f.receipt, status: asAdmin ? "Confirmed" : "Awaiting" }));

      await log("payment", asAdmin

        ? `Maintenance received from ${hn(houseId)} ${inr(f.amount)} (${f.mode})`

        : `Payment proof uploaded by ${hn(houseId)} ${inr(f.amount)} (waiting for Admin to confirm)`);

    },

    async confirmPayment(id, yes) {

      const p = data.payments.find((x) => x.id === id);

      await patch("payments", id, yes ? { status: "Confirmed" } : { status: "Rejected", state: "Archived" });

      await log("payment", yes ? `Payment confirmed: ${hn(p.houseId)} ${inr(p.amount)}` : `Payment not received: ${hn(p.houseId)} ${inr(p.amount)}`);

    },


 

    /* financial report acknowledgement */

    async markReviewed() {

      await ok(supabase.from("reviews").upsert({ ym: cur, house_id: myHouseId, member_name: viewer.name, reviewed_on: TODAY_ISO }, { onConflict: "apartment_id,ym,house_id", ignoreDuplicates: true }));

      await log("review", `${hn(myHouseId)} reviewed the ${mLabel(cur)} financial report`);

    },


 

    /* work approvals */

    async addWork(f) {

      await ok(supabase.from("work_requests").insert({ title: f.title.trim(), description: f.description.trim(), estimate: Number(f.estimate), vendor: f.vendor.trim() || null, quotation: f.quotation, due_date: f.due, created_by_house: hn(myHouseId), created_on: TODAY_ISO }));

      await log("work", `Work request created: ${f.title.trim()} (estimate ${inr(f.estimate)})`);

    },

    async vote(workId, vote, comment) {

      const w = data.workRequests.find((x) => x.id === workId);

      const had = data.votes.some((v) => v.workId === workId && v.houseId === myHouseId);

      await ok(supabase.from("votes").upsert({ work_id: workId, house_id: myHouseId, vote, comment, voted_on: TODAY_ISO, by_name: viewer.name, state: had ? "Edited" : "Active" }, { onConflict: "work_id,house_id" }));

      await log("work", `${hn(myHouseId)} ${vote === "Approve" ? "approved" : "rejected"}: ${w.title}`);

    },

    async archiveWork(id) {

      const w = data.workRequests.find((x) => x.id === id);

      await patch("work_requests", id, { state: "Archived" });

      await log("work", `Work request archived: ${w.title}`);

    },


 

    /* vendors */

    async addVendor(f) {

      await ok(supabase.from("vendors").insert({ name: f.name.trim(), phone: f.phone.trim(), category: f.category, notes: f.notes.trim() || null }));

      await log("vendor", `Vendor added: ${f.name.trim()} (${f.category})`);

    },

    async editVendor(id, f) {

      await patch("vendors", id, { name: f.name.trim(), phone: f.phone.trim(), category: f.category, notes: f.notes.trim() || null, state: "Edited" });

      await log("vendor", `Vendor edited: ${f.name.trim()}`);

    },

    async archiveVendor(id) {

      const v = data.vendors.find((x) => x.id === id);

      await patch("vendors", id, { state: "Archived" });

      await log("vendor", `Vendor archived: ${v.name}`);

    },


 

    /* houses and members */

    async addHouse(f) {

      await ok(supabase.from("houses").insert({ name: f.name.trim(), number: f.number.trim() }));

      await log("house", `House added: ${f.name.trim()} (${f.number.trim()})`);

    },

    async addMember(f) {

      await ok(supabase.from("members").insert({ house_id: f.houseId, name: f.name.trim(), role: f.role, mobile: digits(f.mobile), email: email(f.email) }));

      await log("house", `Member added: ${f.name.trim()} to ${hn(f.houseId)}`);

    },

    async editMember(id, f) {

      await patch("members", id, { house_id: f.houseId, name: f.name.trim(), role: f.role, mobile: digits(f.mobile), email: email(f.email), state: "Edited" });

      await log("house", `Member edited: ${f.name.trim()}`);

    },

    async archiveMember(id) {

      const m = data.members.find((x) => x.id === id);

      await patch("members", id, { state: "Archived" });

      await log("house", `Member archived: ${m.name}`);

    },


 

    /* admin schedule and month closing (the database does the maths and writes its own audit lines) */

    async addTerm(f) {

      await ok(supabase.rpc("add_admin_term", { p_house: f.houseId, p_start: f.start, p_months: Number(f.months) }));

    },

    async archiveTerm(id) {

      await ok(supabase.rpc("archive_admin_term", { p_id: id }));

    },

    async closeMonth(notes, handover) {

      await ok(supabase.rpc("close_month", { p_notes: notes, p_next_house: handover ? handover.houseId : null, p_next_months: handover ? Number(handover.months) : null }));

      nav.tab("dashboard");

    },


 

    /* backup */

    async logBackup(name) { await log("backup", `Backup downloaded: ${name}`); },

    async restore(tables, name) {

      await ok(supabase.rpc("restore_backup", { p: tables }));

      await log("backup", `Data restored from ${name}`);

      nav.tab("dashboard");

    },

  };

}


 

/* ==================================================================

   CONTEXT

   ================================================================== */

export const Ctx = createContext(null);

export const useApp = () => useContext(Ctx);


 