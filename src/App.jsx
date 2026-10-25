/* Maintaino · every screen, form and the app shell. Data and helpers live in ./lib.js */
import { useState, useMemo, useRef, useEffect, useCallback, Component } from "react";
import {
 Home, Bell, Wallet, MessageSquare, MoreHorizontal, Plus, Pin, Archive,
 Phone, ChevronRight, ChevronLeft, Check, X, Upload, FileText, FileSpreadsheet,
 FileJson, Download, Users, RefreshCw, History, ThumbsUp, ThumbsDown, ShieldCheck,
 Building2, Lock, Calendar, Search, Receipt, IndianRupee, CheckCircle2, Clock,
 AlertTriangle, Database, Pencil, Eye, Paperclip, Camera, ArrowRightLeft, Printer,
 Info, User,
} from "lucide-react";
import {
 AUDIT_TYPES, COMPLAINT_CATS, COMPLAINT_STATUS, Ctx, EXPENSE_CATS, MONTH_NAMES, NOTICE_TYPES, PAY_TONE,
 TODAY_ISO, TONE, VENDOR_CATS, VENDOR_ICON, activeHouses, adminTermFor, arrearsOf, buildReport,
 configured, confirmedPays, createApartment, currentTerm, cx, daysLeft, download, dueOf,
 errMsg, exportBackup, fileLabel, fmt, fmtY, houseName, initials, inr,
 isReviewedBy, loadAll, mLabel, makeActions, membersOf, monthStats, nextTermOf, openFile,
 owed, paidBy, parseD, periodKeyOf, periodLabel, periodOptions, reportCSV, reviewsOf,
 sum, supabase, termEnd, termsOf, uploadReceipt, useApp, votesOf, workStatus,
 ymAdd, ymIdx, ymOf,
} from "./lib";

/* ==================================================================
  COMPONENTS/UI
  ================================================================== */
const Card = ({ children, className = "", onClick }) => (
 <div onClick={onClick} className={cx("bg-white rounded-2xl border border-slate-200 p-4", onClick && "cursor-pointer active:bg-slate-50", className)}>{children}</div>
);

function Btn({ children, onClick, variant = "primary", size = "lg", icon: Icon, full, disabled, className, type = "button" }) {
 const sizes = { lg: "h-14 px-5 text-lg", md: "h-12 px-4 text-base", sm: "h-10 px-3 text-base" };
 const variants = {
   primary: "bg-blue-600 text-white", success: "bg-green-600 text-white", danger: "bg-red-600 text-white",
   secondary: "bg-white text-blue-700 border-2 border-blue-200", ghost: "bg-slate-100 text-slate-800",
   outlineDanger: "bg-white text-red-600 border-2 border-red-200", onBlue: "bg-white text-blue-700",
 };
 return (
   <button type={type} onClick={onClick} disabled={disabled}
     className={cx("inline-flex items-center justify-center gap-2 font-semibold rounded-2xl transition active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-200", sizes[size], variants[variant], full && "w-full", disabled && "opacity-40 pointer-events-none", className)}>
     {Icon && <Icon size={size === "sm" ? 18 : 22} />}{children}
   </button>
 );
}

const Badge = ({ tone = "slate", children, icon: Icon }) => (
 <span className={cx("inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-semibold whitespace-nowrap", TONE[tone].bg, TONE[tone].text)}>
   {Icon && <Icon size={14} />}{children}
 </span>
);

const ProgressBar = ({ value, tone = "blue", h = "h-3" }) => (
 <div className={cx("w-full rounded-full bg-slate-100 overflow-hidden", h)}>
   <div className={cx("h-full rounded-full transition-all", TONE[tone].bar)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
 </div>
);

const IconCircle = ({ icon: Icon, tone = "blue", size = "h-12 w-12" }) => (
 <div className={cx("rounded-full flex items-center justify-center shrink-0", size, TONE[tone].bg, TONE[tone].text)}><Icon size={22} /></div>
);

function Header({ title, subtitle, onBack, right }) {
 return (
   <div className="bg-slate-50 px-4 pt-4 pb-3 flex items-center gap-3">
     {onBack && <button onClick={onBack} aria-label="Go back" className="h-12 w-12 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0"><ChevronLeft size={26} /></button>}
     <div className="flex-1 min-w-0">
       <h1 className="text-2xl font-bold text-slate-800 truncate">{title}</h1>
       {subtitle && <p className="text-base text-slate-500 truncate">{subtitle}</p>}
     </div>
     {right}
   </div>
 );
}

const Page = ({ children }) => <div className="px-4 pb-32 space-y-4">{children}</div>;

function Sheet({ title, onClose, children }) {
 return (
   <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center md:p-6" style={{ background: "rgba(15,23,42,0.55)" }} onClick={onClose}>
     <div className="bg-white w-full max-w-xl md:max-w-lg rounded-t-3xl md:rounded-3xl flex flex-col" style={{ maxHeight: "92vh" }} onClick={(e) => e.stopPropagation()}>
       <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-slate-100">
         <h2 className="text-xl font-bold text-slate-800">{title}</h2>
         <button onClick={onClose} aria-label="Close" className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center"><X size={22} /></button>
       </div>
       <div className="overflow-y-auto px-5 pt-4 space-y-4" style={{ paddingBottom: "max(5rem, env(safe-area-inset-bottom))" }}>{children}</div>
     </div>
   </div>
 );
}

const inputCls = "w-full h-14 px-4 rounded-2xl border-2 border-slate-200 bg-white text-lg text-slate-800 focus:outline-none focus:border-blue-600";
const Field = ({ label, hint, children }) => (
 <div>
   <label className="block text-base font-semibold text-slate-700 mb-1.5">{label}</label>
   {children}
   {hint && <p className="text-sm text-slate-500 mt-1">{hint}</p>}
 </div>
);
const TextInput = (p) => <input {...p} className={inputCls} />;
const TextArea = (p) => <textarea rows={4} {...p} className={cx(inputCls, "h-auto py-3")} />;
const Select = ({ options, ...p }) => (
 <select {...p} className={inputCls}>{options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}</select>
);

function FileInput({ label = "Upload file", value, onChange, accept = "image/*,.pdf", icon: Icon = Upload }) {
 const ref = useRef(null);
 const [busy, setBusy] = useState(false);
 const [err, setErr] = useState("");
 const pick = async (e) => {
   const f = e.target.files && e.target.files[0];
   e.target.value = "";
   if (!f) return;
   setBusy(true); setErr("");
   try { onChange(await uploadReceipt(f)); } // stored privately on the server; we keep the path
   catch (x) { setErr(errMsg(x)); }
   finally { setBusy(false); }
 };
 return (
   <div>
     <input ref={ref} type="file" accept={accept} className="hidden" onChange={pick} />
     {value ? (
       <div className="flex items-center gap-3 p-3 rounded-2xl bg-green-50 border border-green-200">
         <Paperclip className="text-green-600 shrink-0" size={22} />
         <span className="flex-1 min-w-0 text-base font-medium text-slate-800 truncate">{fileLabel(value)}</span>
         <button onClick={() => onChange(null)} aria-label="Remove file" className="h-10 w-10 rounded-full bg-white flex items-center justify-center"><X size={18} /></button>
       </div>
     ) : (
       <button type="button" disabled={busy} onClick={() => ref.current && ref.current.click()} className="w-full h-14 rounded-2xl border-2 border-dashed border-slate-300 text-slate-600 text-lg font-semibold flex items-center justify-center gap-2 active:bg-slate-50">
         <Icon size={22} />{busy ? "Uploading…" : label}
       </button>
     )}
     {err && <p className="text-base text-red-600 mt-1">{err}</p>}
   </div>
 );
}

function Segments({ options, value, onChange }) {
 return (
   <div className="flex bg-slate-200 rounded-2xl p-1">
     {options.map((o) => (
       <button key={o.id} onClick={() => onChange(o.id)} className={cx("flex-1 h-12 rounded-xl text-base font-semibold", value === o.id ? "bg-white text-blue-700 shadow-sm" : "text-slate-600")}>{o.label}</button>
     ))}
   </div>
 );
}

function Chips({ options, value, onChange }) {
 return (
   <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
     {options.map((o) => {
       const id = o.id ?? o; const label = o.label ?? o;
       return (
         <button key={id} onClick={() => onChange(id)} className={cx("h-11 px-4 rounded-full text-base font-semibold whitespace-nowrap border-2", value === id ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-200 text-slate-700")}>{label}</button>
       );
     })}
   </div>
 );
}

const Empty = ({ icon: Icon = Info, title, text, action }) => (
 <div className="text-center py-10 px-6">
   <div className="mx-auto h-16 w-16 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 mb-3"><Icon size={28} /></div>
   <p className="text-lg font-semibold text-slate-800">{title}</p>
   {text && <p className="text-base text-slate-500 mt-1">{text}</p>}
   {action && <div className="mt-4">{action}</div>}
 </div>
);

const Checkbox = ({ checked, onChange, children }) => (
 <button type="button" onClick={() => onChange(!checked)} className="flex items-start gap-3 text-left w-full">
   <span className={cx("h-8 w-8 rounded-lg border-2 flex items-center justify-center shrink-0", checked ? "bg-blue-600 border-blue-600 text-white" : "bg-white border-slate-300")}>{checked && <Check size={20} />}</span>
   <span className="text-base text-slate-700">{children}</span>
 </button>
);

const CallButton = ({ phone, label = "Call", size = "md" }) => (
 <a href={`tel:${phone}`} className={cx("inline-flex items-center justify-center gap-2 rounded-2xl bg-green-600 text-white font-semibold active:scale-95", size === "md" ? "h-12 px-4 text-base" : "h-10 px-3 text-base")}>
   <Phone size={18} />{label}
 </a>
);

function SectionTitle({ children, right }) {
 return <div className="flex items-center justify-between pt-2"><h2 className="text-xl font-bold text-slate-800">{children}</h2>{right}</div>;
}

function MonthPicker({ months, value, onChange }) {
 const i = months.indexOf(value);
 return (
   <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-1.5">
     <button disabled={i <= 0} onClick={() => onChange(months[i - 1])} aria-label="Previous month" className={cx("h-12 w-12 rounded-xl flex items-center justify-center", i <= 0 ? "text-slate-300" : "text-slate-800 bg-slate-100")}><ChevronLeft /></button>
     <div className="text-lg font-bold text-slate-800">{mLabel(value)}</div>
     <button disabled={i >= months.length - 1} onClick={() => onChange(months[i + 1])} aria-label="Next month" className={cx("h-12 w-12 rounded-xl flex items-center justify-center", i >= months.length - 1 ? "text-slate-300" : "text-slate-800 bg-slate-100")}><ChevronRight /></button>
   </div>
 );
}

/* ==================================================================
  SCREENS/DASHBOARD
  ================================================================== */
function Dashboard() {
 const { data, stats, cur, viewer, isAdmin, myHouseId, go, tab, openSheet } = useApp();
 const adminHouse = data.houses.find((h) => h.id === data.adminHouseId);
 const term = currentTerm(data);
 const nextTerm = nextTermOf(data);
 const needsPlan = isAdmin && !nextTerm && (!term || ymIdx(termEnd(term)) <= ymIdx(cur));
 const adminOwner = membersOf(data, data.adminHouseId).find((m) => m.role === "Owner") || membersOf(data, data.adminHouseId)[0];
 const openC = data.complaints.filter((c) => ["Open", "In Progress"].includes(c.status) && c.state !== "Archived").length;
 const arrearsTotal = sum(activeHouses(data), (h) => arrearsOf(data, h.id, cur));
 const pendingTotal = stats.pending + arrearsTotal;
 const pendingHouses = activeHouses(data).filter((h) => owed(data, h.id, cur) > 0).length;
 const myOwed = owed(data, myHouseId, cur);
 const myAwaiting = data.payments.some((p) => p.houseId === myHouseId && p.status === "Awaiting" && p.state !== "Archived");
 const needVote = data.workRequests.filter((w) => w.state !== "Archived" && workStatus(data, w) === "Voting" && !votesOf(data, w.id).some((v) => v.houseId === myHouseId)).length;
 const reviewed = isReviewedBy(data, cur, myHouseId);
 const events = data.notices.filter((n) => n.state !== "Archived" && ["Festival Celebration", "Water Shutdown", "Maintenance Work"].includes(n.type) && n.start >= TODAY_ISO).sort((a, b) => a.start.localeCompare(b.start));
 const collectedPct = stats.expected ? (stats.collected / stats.expected) * 100 : 0;
 const todo = [];
 if (myOwed > 0 && !myAwaiting) todo.push({ k: "pay", tone: "red", icon: IndianRupee, title: `Your maintenance is due: ${inr(myOwed)}`, btn: "Pay now", act: () => openSheet("pay", { houseId: myHouseId }) });
 if (myAwaiting) todo.push({ k: "wait", tone: "amber", icon: Clock, title: "Your payment proof is waiting for Admin to confirm", btn: "View", act: () => tab("finance", { seg: "collection" }) });
 if (needVote > 0) todo.push({ k: "vote", tone: "blue", icon: ThumbsUp, title: `${needVote} work ${needVote > 1 ? "requests need" : "request needs"} your house's vote`, btn: "Vote", act: () => go("work") });
 if (!reviewed) todo.push({ k: "rev", tone: "green", icon: CheckCircle2, title: `Please review the ${mLabel(cur)} accounts`, btn: "Review", act: () => tab("finance", { seg: "summary" }) });

 return (
   <div>
     <div className="px-4 pt-5 pb-3">
       <p className="text-base text-slate-500">Namaste, {viewer.name.split(" ")[0]}</p>
       <h1 className="text-2xl font-bold text-slate-800 truncate">{data.settings.apartmentName}</h1>
       <p className="text-base text-slate-500">{houseName(data, myHouseId)}</p>
     </div>
     <Page>
       {/* Admin card */}
       <div className="rounded-3xl bg-blue-600 text-white p-5">
         <div className="flex items-start justify-between gap-3">
           <div>
             <p className="text-blue-100 text-base">Admin for {mLabel(cur)}</p>
             <p className="text-4xl font-bold mt-1">{adminHouse.name}</p>
             {adminOwner && <p className="text-blue-100 text-base mt-1">{adminOwner.name}</p>}
           </div>
           <div className="h-14 w-14 rounded-2xl bg-white flex items-center justify-center text-blue-600"><ShieldCheck size={30} /></div>
         </div>
         <div className="flex items-center justify-between mt-4 pt-4 border-t border-blue-400 gap-3">
           <div className="text-base text-blue-50">
             <p>{cur === ymOf(TODAY_ISO) ? `${daysLeft(cur)} days left this month` : cur < ymOf(TODAY_ISO) ? "Month end has passed. Please close the month" : "New month just started"}</p>
             {term && <p>Term ends {mLabel(termEnd(term))}</p>}
             <p className="font-semibold text-white">{nextTerm ? `Next Admin: ${houseName(data, nextTerm.houseId)} from ${mLabel(nextTerm.start)}` : "Next Admin: not planned yet"}</p>
           </div>
           {isAdmin ? <Btn size="md" variant="onBlue" onClick={() => go("rotation")}>Manage</Btn>
             : adminOwner && <a href={`tel:${adminOwner.mobile}`} className="h-12 px-4 rounded-2xl bg-white text-blue-700 font-semibold inline-flex items-center gap-2"><Phone size={18} />Call Admin</a>}
         </div>
       </div>

       {isAdmin && <div className="flex items-center gap-2 text-base text-blue-700 bg-blue-50 border border-blue-200 rounded-2xl px-4 py-3"><ShieldCheck size={20} className="shrink-0" />You are the Admin this month. You can add expenses, notices and manage complaints.</div>}

       {needsPlan && (
         <div className="flex items-center gap-3 text-base text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3">
           <AlertTriangle size={20} className="shrink-0" /><span className="flex-1">{term ? "Your term ends this month and no next Admin is planned." : "No Admin term is set."}</span>
           <Btn size="sm" onClick={() => go("rotation")}>Plan</Btn>
         </div>
       )}

       {/* Balance */}
       <Card>
         <p className="text-base text-slate-500">Current Balance</p>
         <p className="text-5xl font-bold text-slate-800 mt-1">{inr(stats.closing)}</p>
         <p className="text-base text-slate-500 mt-2">Opening balance on 1 {mLabel(cur).slice(0, 3)}: <span className="font-semibold text-slate-700">{inr(stats.opening)}</span></p>
         <Btn variant="secondary" size="md" full className="mt-4" onClick={() => tab("finance", { seg: "summary" })}>See every transaction</Btn>
       </Card>

       <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
         <Card onClick={() => tab("finance", { seg: "collection" })}>
           <IconCircle icon={ArrowRightLeft} tone="green" size="h-10 w-10" />
           <p className="text-sm text-slate-500 mt-3">Maintenance collected</p>
           <p className="text-2xl font-bold text-green-600">{inr(stats.collected)}</p>
         </Card>
         <Card onClick={() => tab("finance", { seg: "expenses" })}>
           <IconCircle icon={Receipt} tone="red" size="h-10 w-10" />
           <p className="text-sm text-slate-500 mt-3">Expenses this month</p>
           <p className="text-2xl font-bold text-slate-800">{inr(stats.expenses)}</p>
         </Card>
         <Card onClick={() => tab("finance", { seg: "collection" })}>
           <IconCircle icon={Clock} tone="amber" size="h-10 w-10" />
           <p className="text-sm text-slate-500 mt-3">Pending collections</p>
           <p className="text-2xl font-bold text-amber-600">{inr(pendingTotal)}</p>
           <p className="text-sm text-slate-500">{pendingHouses} {pendingHouses === 1 ? "house" : "houses"}</p>
         </Card>
         <Card onClick={() => tab("complaints")}>
           <IconCircle icon={MessageSquare} tone="red" size="h-10 w-10" />
           <p className="text-sm text-slate-500 mt-3">Open complaints</p>
           <p className="text-2xl font-bold text-slate-800">{openC}</p>
         </Card>
       </div>

       <Card>
         <div className="flex justify-between items-baseline mb-2">
           <p className="text-base font-semibold text-slate-800">Maintenance collection</p>
           <p className="text-base font-bold text-blue-700">{Math.round(collectedPct)}%</p>
         </div>
         <ProgressBar value={collectedPct} tone="green" h="h-4" />
         <p className="text-base text-slate-500 mt-2">{inr(stats.collected)} of {inr(stats.expected)} collected</p>
       </Card>

       {/* To do */}
       <SectionTitle>For you</SectionTitle>
       {todo.length === 0 ? (
         <Card className="flex items-center gap-3"><IconCircle icon={CheckCircle2} tone="green" /><p className="text-lg font-semibold text-slate-800">You are all caught up.</p></Card>
       ) : todo.map((t) => (
         <Card key={t.k} className="flex items-center gap-3">
           <IconCircle icon={t.icon} tone={t.tone} />
           <p className="flex-1 text-base font-semibold text-slate-800">{t.title}</p>
           <Btn size="sm" onClick={t.act}>{t.btn}</Btn>
         </Card>
       ))}

       {/* Quick actions */}
       <SectionTitle>Quick actions</SectionTitle>
       <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
         {[
           isAdmin ? { l: "Add Expense", i: Receipt, a: () => openSheet("expense") } : { l: "Pay Maintenance", i: IndianRupee, a: () => openSheet("pay", { houseId: myHouseId }) },
           isAdmin ? { l: "Add Notice", i: Bell, a: () => openSheet("notice") } : { l: "Work Approvals", i: ThumbsUp, a: () => go("work") },
           { l: "Raise Complaint", i: MessageSquare, a: () => openSheet("complaint") },
           { l: "View Accounts", i: Wallet, a: () => tab("finance", { seg: "summary" }) },
         ].map((q) => (
           <button key={q.l} onClick={q.a} className="h-28 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center gap-2 active:bg-slate-50">
             <span className="h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center"><q.i size={24} /></span>
             <span className="text-lg font-semibold text-slate-800">{q.l}</span>
           </button>
         ))}
       </div>

       {/* Events */}
       <SectionTitle right={<button onClick={() => tab("notices")} className="text-base font-semibold text-blue-600 h-10">All notices</button>}>Upcoming events</SectionTitle>
       {events.length === 0 ? <Card><p className="text-base text-slate-500">No upcoming events.</p></Card> : events.slice(0, 3).map((n) => {
         const T = NOTICE_TYPES[n.type];
         return (
           <Card key={n.id} onClick={() => tab("notices")} className="flex items-center gap-3">
             <div className={cx("h-14 w-14 rounded-2xl flex flex-col items-center justify-center shrink-0", TONE[T.tone].bg, TONE[T.tone].text)}>
               <span className="text-xl font-bold leading-none">{parseD(n.start).getDate()}</span>
               <span className="text-sm font-semibold">{MONTH_NAMES[parseD(n.start).getMonth()].slice(0, 3)}</span>
             </div>
             <div className="min-w-0 flex-1"><p className="text-base font-semibold text-slate-800">{n.title}</p><p className="text-sm text-slate-500">{n.type}</p></div>
             <ChevronRight className="text-slate-400" />
           </Card>
         );
       })}
     </Page>
   </div>
 );
}

/* ==================================================================
  SCREENS/NOTICES
  ================================================================== */
function Notices() {
 const { data, isAdmin, openSheet, A, toast } = useApp();
 const [view, setView] = useState("active");
 const [type, setType] = useState("All");
 const [open, setOpen] = useState(null);
 const list = data.notices
   .filter((n) => (view === "active" ? n.state !== "Archived" : n.state === "Archived") && (type === "All" || n.type === type))
   .sort((a, b) => (b.pinned - a.pinned) || b.start.localeCompare(a.start));
 return (
   <div>
     <Header title="Notices" subtitle="From your Admin" right={isAdmin && <Btn size="md" icon={Plus} onClick={() => openSheet("notice")}>New</Btn>} />
     <Page>
       <Segments value={view} onChange={setView} options={[{ id: "active", label: "Current" }, { id: "archived", label: "Archived" }]} />
       <Chips value={type} onChange={setType} options={["All", ...Object.keys(NOTICE_TYPES)]} />
       {list.length === 0 && <Empty icon={Bell} title="No notices here" text={view === "active" ? "New notices from the Admin will appear here." : "Archived notices are kept for reference."} />}
       {list.map((n) => {
         const T = NOTICE_TYPES[n.type]; const expired = n.expiry < TODAY_ISO && n.state !== "Archived"; const isOpen = open === n.id;
         return (
           <Card key={n.id} className={cx(n.type === "Emergency Alert" && "border-red-300", expired && "opacity-70")}>
             <div className="flex gap-3" onClick={() => setOpen(isOpen ? null : n.id)}>
               <IconCircle icon={T.icon} tone={T.tone} />
               <div className="flex-1 min-w-0">
                 <div className="flex flex-wrap gap-1.5 mb-1">
                   <Badge tone={T.tone}>{n.type}</Badge>
                   {n.pinned && <Badge tone="blue" icon={Pin}>Pinned</Badge>}
                   {expired && <Badge tone="slate">Expired</Badge>}
                   {n.state === "Edited" && <Badge tone="amber">Edited</Badge>}
                 </div>
                 <p className="text-lg font-bold text-slate-800">{n.title}</p>
                 <p className="text-base text-slate-600 mt-1">{isOpen || n.description.length < 90 ? n.description : n.description.slice(0, 90) + "…"}</p>
                 <div className="flex items-center gap-1.5 text-sm text-slate-500 mt-2"><Calendar size={14} />{fmt(n.start)}{n.expiry !== n.start && ` – ${fmt(n.expiry)}`}</div>
                 <p className="text-sm text-slate-500">Posted by {n.createdBy}</p>
               </div>
             </div>
             {isAdmin && (
               <div className="flex gap-2 mt-3 pt-3 border-t border-slate-100">
                 {n.state !== "Archived" ? (<>
                   <Btn size="sm" variant="ghost" icon={Pin} className="flex-1" onClick={() => { A.togglePin(n.id); toast(n.pinned ? "Notice unpinned" : "Notice pinned"); }}>{n.pinned ? "Unpin" : "Pin"}</Btn>
                   <Btn size="sm" variant="ghost" icon={Pencil} className="flex-1" onClick={() => openSheet("notice", { initial: n })}>Edit</Btn>
                   <Btn size="sm" variant="ghost" icon={Archive} className="flex-1" onClick={() => { A.archiveNotice(n.id, true); toast("Notice archived"); }}>Archive</Btn>
                 </>) : <Btn size="sm" variant="secondary" icon={RefreshCw} full onClick={() => { A.archiveNotice(n.id, false); toast("Notice restored"); }}>Restore notice</Btn>}
               </div>
             )}
           </Card>
         );
       })}
     </Page>
   </div>
 );
}

/* ==================================================================
  SCREENS/FINANCE
  ================================================================== */
function Finance({ seg: initialSeg = "summary" }) {
 const { data, cur, isAdmin, openSheet, go } = useApp();
 const [seg, setSeg] = useState(initialSeg);
 const months = Object.keys(data.months).sort();
 const [ym, setYm] = useState(cur);
 return (
   <div>
     <Header title="Finance" subtitle="Every rupee, visible to everyone" right={<button onClick={() => go("reports")} aria-label="Reports" className="h-12 w-12 rounded-full bg-white border border-slate-200 flex items-center justify-center"><FileText size={22} /></button>} />
     <Page>
       <Segments value={seg} onChange={setSeg} options={[{ id: "summary", label: "Summary" }, { id: "collection", label: "Collection" }, { id: "expenses", label: "Expenses" }]} />
       <MonthPicker months={months} value={ym} onChange={setYm} />
       {seg === "summary" && <FinanceSummary ym={ym} />}
       {seg === "collection" && <FinanceCollection ym={ym} />}
       {seg === "expenses" && <FinanceExpenses ym={ym} />}
     </Page>
   </div>
 );
}

function FinanceSummary({ ym }) {
 const { data, cur, viewer, myHouseId, go, A, toast } = useApp();
 const s = monthStats(data, ym);
 const hs = activeHouses(data);
 const revs = reviewsOf(data, ym);
 const done = isReviewedBy(data, ym, myHouseId);
 const isCur = ym === cur;
 const cats = Object.entries(s.byCat).sort((a, b) => b[1] - a[1]);
 return (<>
   <Card>
     <div className="space-y-3">
       <Row label="Opening Balance" value={inr(s.opening)} />
       <Row label="Maintenance collected" value={"+ " + inr(s.collected)} tone="text-green-600" />
       <Row label="Total expenses" value={"− " + inr(s.expenses)} tone="text-red-600" />
     </div>
     <div className="mt-4 pt-4 border-t-2 border-slate-100 flex items-baseline justify-between">
       <span className="text-lg font-semibold text-slate-800">{isCur ? "Current Balance" : "Closing Balance"}</span>
       <span className="text-3xl font-bold text-blue-700">{inr(s.closing)}</span>
     </div>
   </Card>

   <Card>
     <div className="flex items-center justify-between">
       <p className="text-lg font-bold text-slate-800">{revs.length} of {hs.length} Houses Reviewed</p>
       <Badge tone={revs.length === hs.length ? "green" : "amber"}>{revs.length === hs.length ? "Complete" : "In progress"}</Badge>
     </div>
     <div className="mt-3"><ProgressBar value={(revs.length / (hs.length || 1)) * 100} tone="green" h="h-4" /></div>
     <div className="flex flex-wrap gap-2 mt-3">
       {hs.map((h) => { const r = isReviewedBy(data, ym, h.id); return <Badge key={h.id} tone={r ? "green" : "slate"} icon={r ? Check : Clock}>{h.name}</Badge>; })}
     </div>
     {isCur && (done
       ? <div className="mt-4 flex items-center gap-2 text-base font-semibold text-green-700 bg-green-50 rounded-2xl p-3"><CheckCircle2 size={22} />Your house has reviewed this report</div>
       : <Btn variant="success" full className="mt-4" icon={CheckCircle2} onClick={() => { A.markReviewed(); toast("Thank you. Review saved"); }}>✅ Reviewed Financial Report</Btn>)}
     {!isCur && !done && <p className="text-base text-slate-500 mt-3">This month is closed.</p>}
   </Card>

   <SectionTitle>Where the money went</SectionTitle>
   <Card className="space-y-4">
     {cats.length === 0 && <p className="text-base text-slate-500">No expenses this month.</p>}
     {cats.map(([c, a]) => (
       <div key={c}>
         <div className="flex justify-between text-base mb-1"><span className="font-semibold text-slate-800">{c}</span><span className="text-slate-700">{inr(a)}</span></div>
         <ProgressBar value={(a / (s.expenses || 1)) * 100} h="h-2.5" />
       </div>
     ))}
   </Card>

   <SectionTitle>All transactions</SectionTitle>
   <div className="space-y-2">
     {s.txns.map((t) => (
       <Card key={t.id} onClick={t.kind === "out" ? () => go("expenseDetail", { id: t.id }) : undefined} className="flex items-center gap-3 py-3">
         <IconCircle icon={t.kind === "in" ? Plus : Receipt} tone={t.kind === "in" ? "green" : "red"} size="h-11 w-11" />
         <div className="flex-1 min-w-0"><p className="text-base font-semibold text-slate-800 truncate">{t.title}</p><p className="text-sm text-slate-500">{fmt(t.date)} · {t.sub}</p></div>
         <p className={cx("text-lg font-bold", t.kind === "in" ? "text-green-600" : "text-slate-800")}>{t.kind === "in" ? "+" : "−"}{inr(t.amount)}</p>
       </Card>
     ))}
   </div>
 </>);
}
const Row = ({ label, value, tone = "text-slate-800" }) => (
 <div className="flex items-baseline justify-between"><span className="text-lg text-slate-600">{label}</span><span className={cx("text-xl font-bold", tone)}>{value}</span></div>
);

function FinanceCollection({ ym }) {
 const { data, cur, isAdmin, myHouseId, openSheet, A, toast } = useApp();
 const s = monthStats(data, ym);
 const pct = s.expected ? (s.collected / s.expected) * 100 : 0;
 return (<>
   <Card>
     <div className="grid grid-cols-3 gap-2 text-center">
       <div><p className="text-sm text-slate-500">Expected</p><p className="text-xl font-bold text-slate-800">{inr(s.expected)}</p></div>
       <div><p className="text-sm text-slate-500">Collected</p><p className="text-xl font-bold text-green-600">{inr(s.collected)}</p></div>
       <div><p className="text-sm text-slate-500">Pending</p><p className="text-xl font-bold text-red-600">{inr(s.pending)}</p></div>
     </div>
     <div className="mt-4"><ProgressBar value={pct} tone="green" h="h-4" /></div>
     <p className="text-base text-slate-500 mt-2 text-center">{Math.round(pct)}% collected · {inr(dueOf(data, ym))} per house</p>
   </Card>
   {activeHouses(data).map((h) => {
     const due = dueOf(data, ym), paid = paidBy(data, h.id, ym), left = Math.max(0, due - paid);
     const status = paid >= due ? "Paid" : paid > 0 ? "Partial" : "Pending";
     const arr = arrearsOf(data, h.id, ym);
     const awaiting = data.payments.filter((p) => p.houseId === h.id && p.month === ym && p.status === "Awaiting" && p.state !== "Archived");
     const mine = confirmedPays(data, ym).filter((p) => p.houseId === h.id);
     const owner = membersOf(data, h.id).find((m) => m.role === "Owner");
     return (
       <Card key={h.id}>
         <div className="flex items-center justify-between gap-2">
           <div><p className="text-lg font-bold text-slate-800">{h.name}</p><p className="text-sm text-slate-500">{owner?.name}</p></div>
           <Badge tone={PAY_TONE[status]}>{status}</Badge>
         </div>
         <div className="flex justify-between text-base mt-3"><span className="text-slate-600">Paid</span><span className="font-semibold text-slate-800">{inr(paid)} of {inr(due)}</span></div>
         <div className="mt-1.5"><ProgressBar value={due ? (paid / due) * 100 : 0} tone={status === "Paid" ? "green" : "amber"} h="h-2.5" /></div>
         {arr > 0 && <p className="text-base font-semibold text-red-600 mt-2">Also pending from earlier months: {inr(arr)}</p>}
         {mine.length > 0 && (
           <div className="mt-3 space-y-1">
             {mine.map((p) => (
               <div key={p.id} className="flex items-center justify-between text-sm text-slate-600">
                 <span>{fmtY(p.date)} · {p.mode} · {inr(p.amount)}</span>
                 {p.receipt ? <button onClick={() => openFile(p.receipt)} className="flex items-center gap-1 text-blue-600 font-semibold h-8"><Paperclip size={14} />Receipt</button> : <span className="text-slate-400">No receipt</span>}
               </div>
             ))}
           </div>
         )}
         {awaiting.map((p) => (
           <div key={p.id} className="mt-3 p-3 rounded-2xl bg-amber-50 border border-amber-200">
             <p className="text-base font-semibold text-amber-800 flex items-center gap-2"><Clock size={18} />{inr(p.amount)} via {p.mode} · waiting for Admin to confirm</p>
             {p.receipt && <p className="text-sm text-slate-600 mt-1 flex items-center gap-1"><Paperclip size={14} />{fileLabel(p.receipt)}</p>}
             {isAdmin && <div className="flex gap-2 mt-3">
               <Btn size="md" variant="success" icon={Check} className="flex-1" onClick={() => { A.confirmPayment(p.id, true); toast("Payment confirmed"); }}>Confirm</Btn>
               <Btn size="md" variant="outlineDanger" icon={X} className="flex-1" onClick={() => { A.confirmPayment(p.id, false); toast("Payment marked as not received"); }}>Not received</Btn>
             </div>}
           </div>
         ))}
         {ym === cur && (left + arr > 0) && awaiting.length === 0 && (
           <div className="mt-3">
             {isAdmin ? <Btn size="md" variant="secondary" full icon={IndianRupee} onClick={() => openSheet("pay", { houseId: h.id, admin: true })}>Record payment</Btn>
               : h.id === myHouseId ? <Btn size="md" full icon={IndianRupee} onClick={() => openSheet("pay", { houseId: h.id })}>Pay now · {inr(left + arr)}</Btn> : null}
           </div>
         )}
       </Card>
     );
   })}
 </>);
}

function FinanceExpenses({ ym }) {
 const { data, isAdmin, openSheet, go } = useApp();
 const s = monthStats(data, ym);
 const [cat, setCat] = useState("All");
 const [showArch, setShowArch] = useState(false);
 const list = data.expenses.filter((e) => ymOf(e.date) === ym && (cat === "All" || e.category === cat) && (showArch || e.state !== "Archived")).sort((a, b) => b.date.localeCompare(a.date));
 return (<>
   {isAdmin && <Btn full icon={Plus} onClick={() => openSheet("expense")}>Add expense</Btn>}
   <Card>
     <p className="text-base text-slate-500">Total expenses in {mLabel(ym)}</p>
     <p className="text-4xl font-bold text-slate-800">{inr(s.expenses)}</p>
   </Card>
   <div className="grid grid-cols-2 gap-3">
     {Object.entries(EXPENSE_CATS).map(([c, I]) => (
       <button key={c} onClick={() => setCat(cat === c ? "All" : c)} className={cx("rounded-2xl p-3 text-left border-2 flex items-center gap-3", cat === c ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white")}>
         <I size={22} className="text-blue-600 shrink-0" />
         <span className="min-w-0"><span className="block text-base font-semibold text-slate-800 truncate">{c}</span><span className="block text-base text-slate-600">{inr(s.byCat[c] || 0)}</span></span>
       </button>
     ))}
   </div>
   <SectionTitle right={<button onClick={() => setShowArch(!showArch)} className="text-base font-semibold text-blue-600 h-10">{showArch ? "Hide archived" : "Show archived"}</button>}>{cat === "All" ? "Expense history" : cat}</SectionTitle>
   {list.length === 0 && <Empty icon={Receipt} title="No expenses found" text="Expenses added by the Admin will appear here." />}
   {list.map((e) => { const I = EXPENSE_CATS[e.category] || Receipt; return (
     <Card key={e.id} onClick={() => go("expenseDetail", { id: e.id })} className={cx("flex items-center gap-3", e.state === "Archived" && "opacity-60")}>
       <IconCircle icon={I} tone="blue" />
       <div className="flex-1 min-w-0">
         <p className={cx("text-base font-semibold text-slate-800 truncate", e.state === "Archived" && "line-through")}>{e.description}</p>
         <p className="text-sm text-slate-500">{fmt(e.date)} · {e.category}{e.state === "Edited" ? " · Edited" : ""}{e.state === "Archived" ? " · Archived" : ""}</p>
       </div>
       <p className="text-lg font-bold text-slate-800">{inr(e.amount)}</p>
     </Card>
   ); })}
 </>);
}

function ExpenseDetail({ id }) {
 const { data, isAdmin, back, openSheet, A, toast } = useApp();
 const e = data.expenses.find((x) => x.id === id);
 if (!e) return <><Header title="Expense" onBack={back} /><Page><Empty title="Expense not found" /></Page></>;
 const I = EXPENSE_CATS[e.category] || Receipt;
 return (
   <div>
     <Header title="Expense details" onBack={back} />
     <Page>
       <Card className="text-center">
         <div className="mx-auto"><IconCircle icon={I} tone="blue" size="h-16 w-16" /></div>
         <p className="text-4xl font-bold text-slate-800 mt-3">{inr(e.amount)}</p>
         <p className="text-lg text-slate-600 mt-1">{e.description}</p>
         <div className="mt-2"><Badge tone={e.state === "Active" ? "green" : e.state === "Edited" ? "amber" : "slate"}>{e.state}</Badge></div>
       </Card>
       <Card className="space-y-3">
         {[["Date", fmtY(e.date)], ["Category", e.category], ["Vendor", e.vendor || "—"], ["Added by", houseName(data, e.addedBy) + " (Admin)"]].map(([k, v]) => (
           <div key={k} className="flex justify-between text-lg"><span className="text-slate-500">{k}</span><span className="font-semibold text-slate-800 text-right">{v}</span></div>
         ))}
       </Card>
       <SectionTitle>Bill / receipt</SectionTitle>
       {e.receipt ? (
         <Card onClick={() => openFile(e.receipt)} className="flex items-center gap-3">
           <IconCircle icon={FileText} tone="blue" /><div className="flex-1 min-w-0"><p className="text-base font-semibold truncate">{fileLabel(e.receipt)}</p><p className="text-sm text-slate-500">Tap to view</p></div><Eye className="text-slate-400" />
         </Card>
       ) : <Card><p className="text-base text-slate-500">No bill attached.</p></Card>}
       {e.edits.length > 0 && (<>
         <SectionTitle>Edit history</SectionTitle>
         <Card className="space-y-3">{e.edits.map((x, i) => <div key={i} className="text-base"><p className="font-semibold text-slate-800">{fmtY(x.ts)} · {x.by}</p><p className="text-slate-600">{x.note}</p></div>)}</Card>
       </>)}
       {isAdmin && e.state !== "Archived" && (
         <div className="flex gap-3">
           <Btn variant="secondary" icon={Pencil} className="flex-1" onClick={() => openSheet("expense", { initial: e })}>Edit</Btn>
           <Btn variant="outlineDanger" icon={Archive} className="flex-1" onClick={() => { A.archiveExpense(e.id); toast("Expense archived. It stays in the audit log."); }}>Archive</Btn>
         </div>
       )}
       <p className="text-sm text-slate-500 text-center">Expenses are never deleted. Archived items are removed from totals but stay visible.</p>
     </Page>
   </div>
 );
}

/* ==================================================================
  SCREENS/COMPLAINTS
  ================================================================== */
function Complaints() {
 const { data, openSheet, go } = useApp();
 const [f, setF] = useState("All");
 const list = data.complaints.filter((c) => c.state !== "Archived" && (f === "All" || c.status === f)).sort((a, b) => b.date.localeCompare(a.date));
 return (
   <div>
     <Header title="Complaints" subtitle="Raise it once, track it here" right={<Btn size="md" icon={Plus} onClick={() => openSheet("complaint")}>New</Btn>} />
     <Page>
       <Chips value={f} onChange={setF} options={["All", "Open", "In Progress", "Resolved", "Closed"]} />
       {list.length === 0 && <Empty icon={MessageSquare} title="No complaints here" text="Tap New to raise a complaint." />}
       {list.map((c) => { const I = COMPLAINT_CATS[c.category] || Info; return (
         <Card key={c.id} onClick={() => go("complaintDetail", { id: c.id })} className="flex gap-3">
           <IconCircle icon={I} tone={COMPLAINT_STATUS[c.status]} />
           <div className="flex-1 min-w-0">
             <div className="flex items-center gap-2 mb-1"><Badge tone={COMPLAINT_STATUS[c.status]}>{c.status}</Badge><span className="text-sm text-slate-500">{c.category}</span></div>
             <p className="text-lg font-bold text-slate-800">{c.title}</p>
             <p className="text-sm text-slate-500 mt-1">{houseName(data, c.houseId)} · {fmt(c.date)} · {c.events.length} {c.events.length === 1 ? "update" : "updates"}</p>
           </div>
           <ChevronRight className="text-slate-400 self-center" />
         </Card>
       ); })}
     </Page>
   </div>
 );
}

function ComplaintDetail({ id }) {
 const { data, isAdmin, back, openSheet, myHouseId, toast } = useApp();
 const c = data.complaints.find((x) => x.id === id);
 if (!c) return <><Header title="Complaint" onBack={back} /><Page><Empty title="Complaint not found" /></Page></>;
 const I = COMPLAINT_CATS[c.category] || Info;
 return (
   <div>
     <Header title="Complaint" subtitle={c.category} onBack={back} />
     <Page>
       <Card>
         <div className="flex items-center gap-3"><IconCircle icon={I} tone={COMPLAINT_STATUS[c.status]} /><Badge tone={COMPLAINT_STATUS[c.status]}>{c.status}</Badge></div>
         <h2 className="text-2xl font-bold text-slate-800 mt-3">{c.title}</h2>
         <p className="text-lg text-slate-600 mt-2">{c.description}</p>
         <p className="text-base text-slate-500 mt-3">Raised by {c.by} · {houseName(data, c.houseId)} · {fmtY(c.date)}</p>
         {c.photo && <div onClick={() => openFile(c.photo)} className="mt-3 flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200"><Camera className="text-blue-600" /><span className="text-base font-medium truncate">{fileLabel(c.photo)}</span></div>}
       </Card>
       <SectionTitle>Timeline</SectionTitle>
       <Card>
         <div className="space-y-5">
           {c.events.map((e, i) => (
             <div key={i} className="flex gap-3">
               <div className="flex flex-col items-center">
                 <span className={cx("h-4 w-4 rounded-full mt-1.5", TONE[COMPLAINT_STATUS[e.status]].solid)} />
                 {i < c.events.length - 1 && <span className="w-0.5 flex-1 bg-slate-200 mt-1" />}
               </div>
               <div className="pb-1"><p className="text-lg font-bold text-slate-800">{e.status}</p><p className="text-base text-slate-600">{e.note}</p><p className="text-sm text-slate-500 mt-0.5">{fmtY(e.date)} · {e.by}</p></div>
             </div>
           ))}
         </div>
       </Card>
       {c.status !== "Closed" && (
         <div className="flex gap-3">
           {isAdmin && <Btn className="flex-1" onClick={() => openSheet("status", { id: c.id })}>Update status</Btn>}
           {!isAdmin && c.houseId === myHouseId && c.status === "Resolved" && <Btn variant="success" className="flex-1" icon={Check} onClick={() => openSheet("status", { id: c.id, closing: true })}>Confirm and close</Btn>}
           <Btn variant="secondary" className="flex-1" onClick={() => openSheet("status", { id: c.id, commentOnly: true })}>Add comment</Btn>
         </div>
       )}
     </Page>
   </div>
 );
}

/* ==================================================================
  SCREENS/MORE
  ================================================================== */
function More() {
 const { data, viewer, isAdmin, go, myHouseId, openSheet } = useApp();
 const needVote = data.workRequests.filter((w) => w.state !== "Archived" && workStatus(data, w) === "Voting" && !votesOf(data, w.id).some((v) => v.houseId === myHouseId)).length;
 const items = [
   { k: "work", l: "Work approvals", d: "Vote on major work", i: ThumbsUp, badge: needVote || null },
   { k: "houses", l: "Houses & members", d: "Families and phone numbers", i: Users },
   { k: "rotation", l: "Admin schedule", d: "Who is Admin and for how long", i: RefreshCw },
   { k: "vendors", l: "Vendor directory", d: "Plumber, electrician, hospital", i: Phone },
   { k: "audit", l: "Audit log", d: "Every action, kept forever", i: History },
   { k: "reports", l: "Report", d: "Month, quarter or year", i: FileText },
   { k: "backup", l: "Backup & restore", d: "Keep a copy of all data", i: Database },
 ];
 return (
   <div>
     <Header title="More" />
     <Page>
       <Card className="flex items-center gap-3" onClick={() => openSheet("account")}>
         <span className="h-14 w-14 rounded-full bg-blue-600 text-white text-xl font-bold flex items-center justify-center">{initials(viewer.name)}</span>
         <div className="flex-1 min-w-0">
           <p className="text-lg font-bold text-slate-800 truncate">{viewer.name}</p>
           <p className="text-base text-slate-500">{houseName(data, myHouseId)} · {viewer.role}</p>
           <div className="mt-1">{isAdmin ? <Badge tone="blue" icon={ShieldCheck}>Admin this month</Badge> : <Badge tone="slate">House member</Badge>}</div>
         </div>
         <ChevronRight className="text-slate-400" />
       </Card>
       <InstallCard />
       <div className="space-y-3">
         {items.map((it) => (
           <Card key={it.k} onClick={() => go(it.k)} className="flex items-center gap-3 py-4">
             <IconCircle icon={it.i} tone="blue" />
             <div className="flex-1 min-w-0"><p className="text-lg font-bold text-slate-800">{it.l}</p><p className="text-base text-slate-500">{it.d}</p></div>
             {it.badge && <span className="h-7 min-w-[1.75rem] px-2 rounded-full bg-red-600 text-white text-sm font-bold flex items-center justify-center">{it.badge}</span>}
             <ChevronRight className="text-slate-400" />
           </Card>
         ))}
       </div>
     </Page>
   </div>
 );
}


function InstallCard() {
 const [evt, setEvt] = useState(null);
 const [done, setDone] = useState(false);
 useEffect(() => {
   const onPrompt = (e) => { e.preventDefault(); setEvt(e); };
   const onInstalled = () => setDone(true);
   window.addEventListener("beforeinstallprompt", onPrompt);
   window.addEventListener("appinstalled", onInstalled);
   return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
 }, []);
 const standalone = (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) || window.navigator.standalone;
 if (standalone || done) return null;
 const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
 return (
   <Card className="flex items-start gap-3">
     <IconCircle icon={Download} tone="green" />
     <div className="flex-1">
       <p className="text-lg font-bold text-slate-800">Install on your phone</p>
       {evt ? (
         <>
           <p className="text-base text-slate-500">Open it from your home screen like any other app.</p>
           <Btn size="md" className="mt-3" onClick={async () => { evt.prompt(); try { await evt.userChoice; } catch (e) {} setEvt(null); }}>Install app</Btn>
         </>
       ) : ios ? (
         <p className="text-base text-slate-500">Tap the Share button in Safari, then choose "Add to Home Screen".</p>
       ) : (
         <p className="text-base text-slate-500">Open the browser menu (⋮) and choose "Install app" or "Add to Home screen".</p>
       )}
     </div>
   </Card>
 );
}

/* ==================================================================
  SCREENS/WORK
  ================================================================== */
const WORK_TONE = { Voting: "blue", Approved: "green", Rejected: "red" };
function WorkList() {
 const { data, back, go, isAdmin, openSheet, myHouseId } = useApp();
 const n = activeHouses(data).length;
 const list = data.workRequests.filter((w) => w.state !== "Archived").sort((a, b) => b.date.localeCompare(a.date));
 return (
   <div>
     <Header title="Work approvals" subtitle="Major work needs most houses to agree" onBack={back} right={isAdmin && <Btn size="md" icon={Plus} onClick={() => openSheet("work")}>New</Btn>} />
     <Page>
       {list.length === 0 && <Empty icon={ThumbsUp} title="No work requests" text="The Admin can create one when major work is needed." />}
       {list.map((w) => {
         const v = votesOf(data, w.id), a = v.filter((x) => x.vote === "Approve").length, r = v.filter((x) => x.vote === "Reject").length, st = workStatus(data, w);
         const mine = v.find((x) => x.houseId === myHouseId);
         return (
           <Card key={w.id} onClick={() => go("workDetail", { id: w.id })}>
             <div className="flex items-start justify-between gap-2"><p className="text-xl font-bold text-slate-800">{w.title}</p><Badge tone={WORK_TONE[st]}>{st}</Badge></div>
             <p className="text-2xl font-bold text-blue-700 mt-1">{inr(w.estimate)}</p>
             <p className="text-base text-slate-500">{w.vendor} · Due {fmt(w.due)}</p>
             <div className="mt-3"><ProgressBar value={(a / n) * 100} tone="green" h="h-3" /></div>
             <div className="flex justify-between text-base mt-2"><span className="text-green-700 font-semibold">{a} approved</span><span className="text-red-600 font-semibold">{r} rejected</span><span className="text-slate-500">{n - a - r} waiting</span></div>
             {st === "Voting" && !mine && <div className="mt-3 text-base font-semibold text-blue-700 bg-blue-50 rounded-xl px-3 py-2">Your house has not voted yet</div>}
           </Card>
         );
       })}
     </Page>
   </div>
 );
}

function WorkDetail({ id }) {
 const { data, back, isAdmin, myHouseId, viewer, A, toast, openSheet } = useApp();
 const w = data.workRequests.find((x) => x.id === id);
 const [comment, setComment] = useState("");
 const v = w ? votesOf(data, w.id) : [];
 const mine = v.find((x) => x.houseId === myHouseId);
 useEffect(() => { if (mine) setComment(mine.comment || ""); }, [mine?.id]);
 if (!w) return <><Header title="Work" onBack={back} /><Page><Empty title="Request not found" /></Page></>;
 const hs = activeHouses(data), n = hs.length;
 const ap = v.filter((x) => x.vote === "Approve"), rj = v.filter((x) => x.vote === "Reject");
 const waiting = hs.filter((h) => !v.some((x) => x.houseId === h.id));
 const st = workStatus(data, w);
 const pct = Math.round((ap.length / n) * 100);
 const cast = (vote) => { A.vote(w.id, vote, comment.trim()); toast(vote === "Approve" ? "You approved this work" : "You rejected this work"); };
 return (
   <div>
     <Header title="Work request" onBack={back} />
     <Page>
       <Card>
         <div className="flex items-start justify-between gap-2"><h2 className="text-2xl font-bold text-slate-800">{w.title}</h2><Badge tone={WORK_TONE[st]}>{st}</Badge></div>
         <p className="text-3xl font-bold text-blue-700 mt-2">{inr(w.estimate)}</p>
         <p className="text-lg text-slate-600 mt-2">{w.description}</p>
         <div className="mt-3 space-y-1 text-base text-slate-600">
           <p>Vendor: <span className="font-semibold text-slate-800">{w.vendor}</span></p>
           <p>Due date: <span className="font-semibold text-slate-800">{fmtY(w.due)}</span></p>
           <p>Requested by {w.createdBy} on {fmtY(w.date)}</p>
         </div>
         {w.quotation && <div onClick={() => openFile(w.quotation)} className="mt-3 flex items-center gap-3 p-3 rounded-2xl bg-slate-50 border border-slate-200"><FileText className="text-blue-600" /><span className="flex-1 truncate text-base font-medium">{fileLabel(w.quotation)}</span><Eye className="text-slate-400" /></div>}
       </Card>

       <Card>
         <div className="flex items-baseline justify-between"><p className="text-lg font-bold text-slate-800">Approval</p><p className="text-3xl font-bold text-green-600">{pct}%</p></div>
         <div className="mt-2"><ProgressBar value={pct} tone="green" h="h-4" /></div>
         <p className="text-sm text-slate-500 mt-2">More than half of all houses ({Math.floor(n / 2) + 1} of {n}) must approve.</p>
         <div className="mt-4 space-y-3">
           <div><p className="text-base font-semibold text-green-700 mb-1.5">Approved houses ({ap.length})</p><div className="flex flex-wrap gap-2">{ap.length ? ap.map((x) => <Badge key={x.id} tone="green" icon={Check}>{houseName(data, x.houseId)}</Badge>) : <span className="text-base text-slate-400">None yet</span>}</div></div>
           <div><p className="text-base font-semibold text-red-600 mb-1.5">Rejected houses ({rj.length})</p><div className="flex flex-wrap gap-2">{rj.length ? rj.map((x) => <Badge key={x.id} tone="red" icon={X}>{houseName(data, x.houseId)}</Badge>) : <span className="text-base text-slate-400">None</span>}</div></div>
           <div><p className="text-base font-semibold text-slate-600 mb-1.5">Waiting ({waiting.length})</p><div className="flex flex-wrap gap-2">{waiting.length ? waiting.map((h) => <Badge key={h.id} tone="slate" icon={Clock}>{h.name}</Badge>) : <span className="text-base text-slate-400">Everyone has voted</span>}</div></div>
         </div>
       </Card>

       <Card>
         <p className="text-lg font-bold text-slate-800">{mine ? `Your house voted: ${mine.vote}` : `Vote for ${houseName(data, myHouseId)}`}</p>
         <p className="text-base text-slate-500 mb-3">One vote per house. You can change it until the work is closed.</p>
         <TextArea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Add a comment (optional)" />
         <div className="grid grid-cols-2 gap-3 mt-3">
           <Btn variant={mine?.vote === "Approve" ? "success" : "secondary"} icon={ThumbsUp} onClick={() => cast("Approve")}>Approve</Btn>
           <Btn variant={mine?.vote === "Reject" ? "danger" : "outlineDanger"} icon={ThumbsDown} onClick={() => cast("Reject")}>Reject</Btn>
         </div>
       </Card>

       <SectionTitle>Comments</SectionTitle>
       {v.filter((x) => x.comment).length === 0 && <Card><p className="text-base text-slate-500">No comments yet.</p></Card>}
       {v.filter((x) => x.comment).map((x) => (
         <Card key={x.id}>
           <div className="flex items-center gap-2 mb-1"><Badge tone={x.vote === "Approve" ? "green" : "red"}>{x.vote}</Badge><span className="text-base font-semibold text-slate-800">{houseName(data, x.houseId)}</span></div>
           <p className="text-lg text-slate-700">{x.comment}</p><p className="text-sm text-slate-500 mt-1">{x.by} · {fmt(x.date)}</p>
         </Card>
       ))}
       {isAdmin && <Btn variant="outlineDanger" full icon={Archive} onClick={() => { A.archiveWork(w.id); toast("Request archived"); back(); }}>Archive this request</Btn>}
     </Page>
   </div>
 );
}

/* ==================================================================
  SCREENS/HOUSES
  ================================================================== */
function Houses() {
 const { data, back, isAdmin, openSheet, A, toast } = useApp();
 const [exp, setExp] = useState(data.adminHouseId);
 const [arch, setArch] = useState(false);
 return (
   <div>
     <Header title="Houses & members" subtitle={`${activeHouses(data).length} houses · ${data.members.filter((m) => m.state !== "Archived").length} people`} onBack={back} />
     <Page>
       {isAdmin && <div className="grid grid-cols-2 gap-3"><Btn variant="secondary" icon={Building2} onClick={() => openSheet("house")}>Add house</Btn><Btn variant="secondary" icon={User} onClick={() => openSheet("member", {})}>Add member</Btn></div>}
       {activeHouses(data).map((h) => {
         const ms = data.members.filter((m) => m.houseId === h.id && (arch || m.state !== "Archived"));
         const open = exp === h.id;
         return (
           <Card key={h.id}>
             <button onClick={() => setExp(open ? null : h.id)} className="w-full flex items-center gap-3 text-left">
               <IconCircle icon={Building2} tone={h.id === data.adminHouseId ? "blue" : "slate"} />
               <div className="flex-1 min-w-0"><p className="text-lg font-bold text-slate-800">{h.name}</p><p className="text-base text-slate-500">House no. {h.number} · {membersOf(data, h.id).length} members</p></div>
               {h.id === data.adminHouseId && <Badge tone="blue">Admin</Badge>}
               <ChevronRight className={cx("text-slate-400 transition", open && "rotate-90")} />
             </button>
             {open && (
               <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                 {ms.map((m) => (
                   <div key={m.id} className={cx("flex items-center gap-3", m.state === "Archived" && "opacity-50")}>
                     <span className="h-11 w-11 rounded-full bg-slate-100 text-slate-700 font-bold flex items-center justify-center shrink-0">{initials(m.name)}</span>
                     <div className="flex-1 min-w-0"><p className="text-base font-semibold text-slate-800 truncate">{m.name}</p><p className="text-sm text-slate-500">{m.role} · +91 {m.mobile}{m.state === "Archived" ? " · Archived" : ""}</p></div>
                     {m.state !== "Archived" && <a href={`tel:${m.mobile}`} aria-label={`Call ${m.name}`} className="h-11 w-11 rounded-full bg-green-600 text-white flex items-center justify-center"><Phone size={20} /></a>}
                     {isAdmin && m.state !== "Archived" && <button onClick={() => openSheet("member", { initial: m })} aria-label="Edit member" className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center"><Pencil size={18} /></button>}
                     {isAdmin && m.state !== "Archived" && <button onClick={() => { A.archiveMember(m.id); toast(`${m.name} archived`); }} aria-label="Archive member" className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center"><Archive size={18} /></button>}
                   </div>
                 ))}
                 {isAdmin && <Btn size="md" variant="ghost" icon={Plus} full onClick={() => openSheet("member", { houseId: h.id })}>Add member to {h.name}</Btn>}
               </div>
             )}
           </Card>
         );
       })}
       <button onClick={() => setArch(!arch)} className="w-full h-12 text-base font-semibold text-blue-600">{arch ? "Hide archived members" : "Show archived members"}</button>
     </Page>
   </div>
 );
}

/* ==================================================================
  SCREENS/ROTATION
  ================================================================== */
function Rotation() {
 const { data, back, isAdmin, openSheet, cur, A, toast } = useApp();
 const term = currentTerm(data);
 const nextTerm = nextTermOf(data);
 const adminHouse = data.houses.find((h) => h.id === data.adminHouseId);
 const terms = termsOf(data).slice().sort((a, b) => ymIdx(b.start) - ymIdx(a.start));
 const needsPlan = !nextTerm && (!term || ymIdx(termEnd(term)) <= ymIdx(cur));
 const statusOf = (t) => (ymIdx(t.start) > ymIdx(cur) ? "Planned" : ymIdx(termEnd(t)) < ymIdx(cur) ? "Done" : "Now");
 const plural = (n) => `${n} ${n === 1 ? "month" : "months"}`;
 return (
   <div>
     <Header title="Admin schedule" subtitle="Choose who is Admin and for how long" onBack={back} />
     <Page>
       <div className="grid grid-cols-2 gap-3">
         <div className="rounded-2xl bg-blue-600 text-white p-4">
           <p className="text-blue-100 text-base">Current Admin</p>
           <p className="text-3xl font-bold mt-1">{adminHouse ? adminHouse.name : "—"}</p>
           <p className="text-blue-100 text-base mt-1">{term ? `Until ${mLabel(termEnd(term))}` : "No end date set"}</p>
         </div>
         <Card>
           <p className="text-slate-500 text-base">Next Admin</p>
           <p className="text-3xl font-bold text-slate-800 mt-1">{nextTerm ? houseName(data, nextTerm.houseId) : "Not planned"}</p>
           <p className="text-slate-500 text-base mt-1">{nextTerm ? `From ${mLabel(nextTerm.start)} · ${plural(nextTerm.months)}` : "Plan one below"}</p>
         </Card>
       </div>
       {needsPlan && (
         <div className="flex gap-2 text-base text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl p-3">
           <AlertTriangle size={20} className="shrink-0" />
           <span>{term ? "The current term ends this month and no one is planned next." : "No Admin term is set."} The current Admin stays on until a new term is planned.</span>
         </div>
       )}
       {isAdmin ? (
         <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
           <Btn icon={Plus} onClick={() => openSheet("term")}>Plan next Admin</Btn>
           <Btn variant="secondary" icon={ArrowRightLeft} onClick={() => openSheet("closeMonth")}>Close {MONTH_NAMES[+cur.slice(5) - 1]}</Btn>
         </div>
       ) : (
         <div className="flex items-center gap-2 text-base text-slate-600 bg-slate-100 rounded-2xl px-4 py-3"><Lock size={18} className="shrink-0" />Only the current Admin can change the schedule or close the month.</div>
       )}
       <p className="text-base text-slate-500 px-1">Any house can be Admin for any number of months. Each month is closed with notes, and the balance carries forward.</p>

       <SectionTitle>Admin terms</SectionTitle>
       {terms.length === 0 && <Card><p className="text-base text-slate-500">No terms yet.</p></Card>}
       {terms.map((t) => {
         const st = statusOf(t);
         return (
           <Card key={t.id} className="flex items-center gap-3">
             <IconCircle icon={ShieldCheck} tone={st === "Now" ? "blue" : "slate"} />
             <div className="flex-1 min-w-0">
               <p className="text-lg font-bold text-slate-800">{houseName(data, t.houseId)}</p>
               <p className="text-base text-slate-500">{t.months === 1 ? mLabel(t.start) : `${mLabel(t.start)} – ${mLabel(termEnd(t))}`} · {plural(t.months)}</p>
             </div>
             <Badge tone={st === "Now" ? "blue" : st === "Planned" ? "amber" : "slate"}>{st}</Badge>
             {isAdmin && st === "Planned" && <button onClick={() => { A.archiveTerm(t.id); toast("Planned term removed"); }} aria-label="Remove planned term" className="h-11 w-11 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><Archive size={18} /></button>}
           </Card>
         );
       })}

       <SectionTitle>Month closing history</SectionTitle>
       {data.transfers.length === 0 && <Card><p className="text-base text-slate-500">No month has been closed yet.</p></Card>}
       {[...data.transfers].reverse().map((t) => (
         <Card key={t.id}>
           <div className="flex items-center justify-between gap-2">
             <p className="text-lg font-bold text-slate-800">{mLabel(t.month)} closed</p>
             <Badge tone={t.from === t.to ? "slate" : "blue"}>{t.from === t.to ? `${houseName(data, t.to)} continued` : `${houseName(data, t.from)} → ${houseName(data, t.to)}`}</Badge>
           </div>
           <p className="text-base text-slate-500">{fmtY(t.date)} · Closing balance <span className="font-semibold text-slate-700">{inr(t.closingBalance)}</span></p>
           <div className="mt-2 p-3 rounded-xl bg-slate-50"><p className="text-sm font-semibold text-slate-500">Monthly closing notes</p><p className="text-base text-slate-700 mt-0.5">{t.notes}</p></div>
         </Card>
       ))}
     </Page>
   </div>
 );
}
/* ==================================================================
  SCREENS/VENDORS
  ================================================================== */
function Vendors() {
 const { data, back, isAdmin, openSheet, A, toast } = useApp();
 const [q, setQ] = useState(""); const [cat, setCat] = useState("All");
 const list = data.vendors.filter((v) => v.state !== "Archived" && (cat === "All" || v.category === cat) && (v.name + v.category + v.notes).toLowerCase().includes(q.toLowerCase()));
 const emergency = list.filter((v) => ["Hospital", "Ambulance"].includes(v.category)), others = list.filter((v) => !emergency.includes(v));
 const Item = ({ v, urgent }) => { const I = VENDOR_ICON[v.category] || Phone; return (
   <Card className={cx(urgent && "border-red-200")}>
     <div className="flex items-center gap-3">
       <IconCircle icon={I} tone={urgent ? "red" : "blue"} />
       <div className="flex-1 min-w-0"><p className="text-lg font-bold text-slate-800">{v.name}</p><p className="text-base text-slate-500">{v.category} · {v.phone}</p>{v.notes && <p className="text-base text-slate-600 mt-1">{v.notes}</p>}</div>
     </div>
     <div className="flex gap-2 mt-3">
       <a href={`tel:${v.phone}`} className="flex-1 h-14 rounded-2xl bg-green-600 text-white text-lg font-semibold inline-flex items-center justify-center gap-2 active:scale-95"><Phone size={22} />Call now</a>
       {isAdmin && <button onClick={() => openSheet("vendor", { initial: v })} aria-label="Edit vendor" className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center"><Pencil size={20} /></button>}
       {isAdmin && <button onClick={() => { A.archiveVendor(v.id); toast("Vendor archived"); }} aria-label="Archive vendor" className="h-14 w-14 rounded-2xl bg-slate-100 flex items-center justify-center"><Archive size={20} /></button>}
     </div>
   </Card>
 ); };
 return (
   <div>
     <Header title="Vendor directory" subtitle="Tap to call" onBack={back} right={isAdmin && <Btn size="md" icon={Plus} onClick={() => openSheet("vendor")}>Add</Btn>} />
     <Page>
       <div className="relative"><Search size={20} className="absolute left-4 top-4 text-slate-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search plumber, hospital…" className={cx(inputCls, "pl-12")} /></div>
       <Chips value={cat} onChange={setCat} options={["All", ...VENDOR_CATS]} />
       {list.length === 0 && <Empty icon={Phone} title="No contacts found" />}
       {emergency.length > 0 && <SectionTitle>Emergency</SectionTitle>}
       {emergency.map((v) => <Item key={v.id} v={v} urgent />)}
       {others.length > 0 && emergency.length > 0 && <SectionTitle>Services</SectionTitle>}
       {others.map((v) => <Item key={v.id} v={v} />)}
     </Page>
   </div>
 );
}

/* ==================================================================
  SCREENS/AUDIT
  ================================================================== */
function Audit() {
 const { data, back } = useApp();
 const [f, setF] = useState("all"); const [limit, setLimit] = useState(30);
 const all = [...data.audit].filter((l) => f === "all" || l.type === f).sort((a, b) => b.ts.localeCompare(a.ts));
 const shown = all.slice(0, limit);
 const groups = []; shown.forEach((l) => { const d = l.ts.slice(0, 10); const g = groups[groups.length - 1]; if (g && g.d === d) g.items.push(l); else groups.push({ d, items: [l] }); });
 return (
   <div>
     <Header title="Audit log" subtitle={`${data.audit.length} records · cannot be deleted`} onBack={back} />
     <Page>
       <div className="flex items-center gap-2 text-base text-slate-600 bg-slate-100 rounded-2xl px-4 py-3"><Lock size={18} className="shrink-0" />Read-only. Items can only be Active, Edited or Archived. Nothing is ever hard-deleted.</div>
       <Chips value={f} onChange={setF} options={[{ id: "all", label: "All" }, ...Object.entries(AUDIT_TYPES).map(([id, t]) => ({ id, label: t.label }))]} />
       {groups.map((g) => (
         <div key={g.d}>
           <p className="text-base font-bold text-slate-500 mb-2">{fmtY(g.d)}</p>
           <Card className="space-y-4">
             {g.items.map((l, i) => (
               <div key={l.id} className="flex gap-3">
                 <div className="flex flex-col items-center"><span className={cx("h-3.5 w-3.5 rounded-full mt-2", TONE[AUDIT_TYPES[l.type]?.tone || "slate"].solid)} />{i < g.items.length - 1 && <span className="w-0.5 flex-1 bg-slate-200 mt-1" />}</div>
                 <div className="flex-1 min-w-0"><p className="text-base font-semibold text-slate-800">{l.text}</p><p className="text-sm text-slate-500">{l.ts.slice(11, 16)} · {l.by}</p></div>
               </div>
             ))}
           </Card>
         </div>
       ))}
       {all.length === 0 && <Empty icon={History} title="No records" />}
       {all.length > limit && <Btn variant="secondary" full onClick={() => setLimit(limit + 30)}>Show earlier records</Btn>}
     </Page>
   </div>
 );
}

/* ==================================================================
  SCREENS/REPORTS
  ================================================================== */
const REPORT_TYPES = [{ id: "month", label: "Month" }, { id: "quarter", label: "Quarter" }, { id: "year", label: "Year" }];

function ReportTable({ columns, rows }) {
 return (
   <div className="overflow-x-auto">
     <table className="w-full text-base">
       <thead><tr className="border-b-2 border-slate-200">{columns.map((c) => <th key={c} className="text-left py-2 pr-3 text-sm text-slate-500 font-semibold whitespace-nowrap">{c}</th>)}</tr></thead>
       <tbody>
         {rows.length === 0 && <tr><td colSpan={columns.length} className="py-3 text-slate-500">No records.</td></tr>}
         {rows.map((row, i) => <tr key={i} className="border-b border-slate-100">{row.map((c, j) => <td key={j} className="py-2 pr-3 text-slate-800 align-top">{typeof c === "number" ? c.toLocaleString("en-IN") : c}</td>)}</tr>)}
       </tbody>
     </table>
   </div>
 );
}

function Reports() {
 const { data, back, cur, isAdmin, toast } = useApp();
 const [type, setType] = useState("month");
 const [key, setKey] = useState(periodKeyOf("month", cur));
 const options = periodOptions(data, type);
 const r = useMemo(() => buildReport(data, type, key), [data, type, key]);
 const changeType = (t) => { setType(t); setKey(periodKeyOf(t, cur)); };
 const excel = () => { download(`maintaino_report_${key}.csv`, reportCSV(r), "text/csv;charset=utf-8"); toast("Excel file downloaded"); };
 const doPrint = () => { try { window.print(); } catch (e) { toast("Printing is not available on this device", "error"); } };
 return (
   <div>
     <Header title="Report" subtitle="Choose a month, quarter or year" onBack={back} />
     <Page>
       <Segments value={type} onChange={changeType} options={REPORT_TYPES} />
       <Select value={key} onChange={(e) => setKey(e.target.value)} options={options.map((k) => ({ value: k, label: periodLabel(type, k) }))} aria-label="Report period" />
       {isAdmin ? (
         <div className="grid grid-cols-2 gap-3">
           <Btn variant="secondary" icon={Printer} onClick={doPrint}>Print / PDF</Btn>
           <Btn variant="secondary" icon={FileSpreadsheet} onClick={excel}>Excel</Btn>
         </div>
       ) : (
         <div className="flex items-center gap-2 text-base text-slate-600 bg-slate-100 rounded-2xl px-4 py-3"><Lock size={18} className="shrink-0" />Everyone can view the report. Only the Admin can download it.</div>
       )}
       <div id="print-area" className="space-y-4">
         <Card>
           <h2 className="text-2xl font-bold text-slate-800">{r.title}</h2>
           <p className="text-base text-slate-500 mb-3">{r.label}</p>
           <div className="space-y-1.5">{r.summary.map(([k, v]) => <div key={k} className="flex justify-between gap-3 text-base"><span className="text-slate-500">{k}</span><span className="font-semibold text-slate-800 text-right">{v}</span></div>)}</div>
         </Card>
         {r.sections.map((sec) => (
           <Card key={sec.title}>
             <h3 className="text-lg font-bold text-slate-800 mb-2">{sec.title}</h3>
             <ReportTable columns={sec.columns} rows={sec.rows} />
           </Card>
         ))}
         <p className="text-sm text-slate-400 text-center">Generated on {fmtY(TODAY_ISO)} · Maintaino</p>
       </div>
     </Page>
   </div>
 );
}
/* ==================================================================
  SCREENS/BACKUP
  ================================================================== */
const REQUIRED = ["houses", "members", "payments", "expenses", "notices", "complaints", "votes", "audit_log", "vendors"];

function Backup() {
 const { data, back, cur, isAdmin, A, toast } = useApp();
 const fileRef = useRef(null);
 const [pending, setPending] = useState(null);
 const [err, setErr] = useState("");
 const [working, setWorking] = useState(false);

 const fname = `backup_${MONTH_NAMES[+cur.slice(5) - 1].slice(0, 3).toLowerCase()}_${cur.slice(0, 4)}.json`;
 const counts = [["Houses", data.houses.length], ["Members", data.members.length], ["Payments", data.payments.length], ["Expenses", data.expenses.length], ["Notices", data.notices.length], ["Complaints", data.complaints.length], ["Votes", data.votes.length], ["Audit logs", data.audit.length], ["Vendors", data.vendors.length]];
 const last = data.audit.filter((l) => l.type === "backup" && l.text.startsWith("Backup downloaded")).sort((a, b) => b.ts.localeCompare(a.ts))[0];

 const make = async () => {
   setWorking(true);
   try {
     const obj = await exportBackup();
     download(fname, JSON.stringify(obj, null, 2));
     A.logBackup(fname);
     toast("Backup downloaded");
   } catch (e) {
     toast(errMsg(e), "error");
   } finally { setWorking(false); }
 };

 const onFile = async (e) => {
   const f = e.target.files && e.target.files[0];
   e.target.value = "";
   if (!f) return;
   setErr("");
   try {
     const obj = JSON.parse(await f.text());
     if ((obj.app !== "maintaino" && obj.app !== "apartment-care") || !obj.tables || REQUIRED.some((k) => !Array.isArray(obj.tables[k]))) throw new Error("bad");
     setPending({ name: f.name, obj });
   } catch (x) {
     setPending(null);
     setErr(`This file is not a valid Maintaino backup. Please choose a file like ${fname}.`);
   }
 };

 return (
   <div>
     <Header title="Backup & restore" onBack={back} />
     <Page>
       {!isAdmin && <div className="flex items-center gap-2 text-base text-slate-600 bg-slate-100 rounded-2xl px-4 py-3"><Lock size={18} className="shrink-0" />Only the Admin can create or restore backups.</div>}
       <Card>
         <div className="flex items-center gap-3"><IconCircle icon={Download} tone="blue" /><div><p className="text-lg font-bold text-slate-800">Create backup</p><p className="text-base text-slate-500">{fname}</p></div></div>
         <div className="grid grid-cols-3 gap-2 mt-4">{counts.map(([k, v]) => <div key={k} className="rounded-xl bg-slate-50 p-2 text-center"><p className="text-xl font-bold text-slate-800">{v}</p><p className="text-sm text-slate-500">{k}</p></div>)}</div>
         <Btn full className="mt-4" icon={Download} disabled={!isAdmin || working} onClick={make}>{working ? "Preparing…" : "Download backup"}</Btn>
         <p className="text-sm text-slate-500 mt-2 text-center">{last ? `Last backup: ${fmtY(last.ts)} (${last.text.replace("Backup downloaded: ", "")})` : "No backup taken yet."}</p>
         <p className="text-sm text-slate-500 mt-1 text-center">Bills and receipts are stored safely on the server. The backup keeps their file names and links.</p>
       </Card>
       <Card>
         <div className="flex items-center gap-3"><IconCircle icon={Upload} tone="green" /><div><p className="text-lg font-bold text-slate-800">Restore from backup</p><p className="text-base text-slate-500">Brings back missing and edited records</p></div></div>
         <input ref={fileRef} type="file" accept=".json,application/json" className="hidden" onChange={onFile} />
         <Btn full variant="secondary" className="mt-4" icon={Upload} disabled={!isAdmin} onClick={() => fileRef.current && fileRef.current.click()}>Choose backup file</Btn>
         {err && <div className="mt-3 p-3 rounded-2xl bg-red-50 border border-red-200 text-base text-red-700 flex gap-2"><AlertTriangle size={20} className="shrink-0" />{err}</div>}
         {pending && (
           <div className="mt-4 p-4 rounded-2xl bg-green-50 border border-green-200">
             <p className="text-lg font-bold text-slate-800 flex items-center gap-2"><FileJson size={20} />{pending.name}</p>
             <p className="text-base text-slate-600 mt-1">Saved {pending.obj.exportedAt ? fmtY(pending.obj.exportedAt) : ""} · {pending.obj.tables.houses.length} houses, {pending.obj.tables.members.length} members, {pending.obj.tables.expenses.length} expenses, {pending.obj.tables.audit_log.length} audit records</p>
             <p className="text-base text-slate-600 mt-2">Missing records are added back and edited records return to the backed-up version. Newer records and the audit log are kept.</p>
             <div className="flex gap-3 mt-3"><Btn variant="success" className="flex-1" onClick={() => { A.restore(pending.obj.tables, pending.name); setPending(null); toast("Backup restored"); }}>Restore now</Btn><Btn variant="ghost" onClick={() => setPending(null)}>Cancel</Btn></div>
           </div>
         )}
       </Card>
     </Page>
   </div>
 );
}

/* ==================================================================
  SHEETS/SHEETS
  ================================================================== */
function ExpenseSheet({ initial }) {
 const { closeSheet, A, toast } = useApp();
 const [f, setF] = useState(initial ? { date: initial.date, category: initial.category, description: initial.description, amount: String(initial.amount), vendor: initial.vendor || "", receipt: initial.receipt || null } : { date: TODAY_ISO, category: "Security", description: "", amount: "", vendor: "", receipt: null });
 const set = (k) => (e) => setF({ ...f, [k]: e.target ? e.target.value : e });
 const ok = f.description.trim() && Number(f.amount) > 0 && f.date;
 return (
   <Sheet title={initial ? "Edit expense" : "Add expense"} onClose={closeSheet}>
     <Field label="Date"><TextInput type="date" value={f.date} onChange={set("date")} /></Field>
     <Field label="Category"><Select value={f.category} onChange={set("category")} options={Object.keys(EXPENSE_CATS)} /></Field>
     <Field label="What was it for?"><TextInput value={f.description} onChange={set("description")} placeholder="e.g. Water tanker ×2" /></Field>
     <Field label="Amount (₹)"><TextInput type="number" inputMode="numeric" value={f.amount} onChange={set("amount")} placeholder="0" /></Field>
     <Field label="Vendor"><TextInput value={f.vendor} onChange={set("vendor")} placeholder="Who was paid?" /></Field>
     <Field label="Bill or receipt"><FileInput label="Upload bill" value={f.receipt} onChange={set("receipt")} /></Field>
     <Btn full disabled={!ok} onClick={() => { initial ? A.editExpense(initial.id, f) : A.addExpense(f); toast(initial ? "Expense updated" : "Expense added"); closeSheet(); }}>{initial ? "Save changes" : "Add expense"}</Btn>
   </Sheet>
 );
}

function NoticeSheet({ initial }) {
 const { closeSheet, A, toast } = useApp();
 const [f, setF] = useState(initial ? { type: initial.type, title: initial.title, description: initial.description, start: initial.start, expiry: initial.expiry, pinned: initial.pinned } : { type: "General", title: "", description: "", start: TODAY_ISO, expiry: TODAY_ISO, pinned: false });
 const set = (k) => (e) => setF({ ...f, [k]: e.target ? e.target.value : e });
 const ok = f.title.trim() && f.description.trim() && f.expiry >= f.start;
 return (
   <Sheet title={initial ? "Edit notice" : "New notice"} onClose={closeSheet}>
     <Field label="Type"><Select value={f.type} onChange={set("type")} options={Object.keys(NOTICE_TYPES)} /></Field>
     <Field label="Title"><TextInput value={f.title} onChange={set("title")} placeholder="Short and clear" /></Field>
     <Field label="Details"><TextArea value={f.description} onChange={set("description")} placeholder="What should residents know or do?" /></Field>
     <div className="grid grid-cols-2 gap-3"><Field label="Start date"><TextInput type="date" value={f.start} onChange={set("start")} /></Field><Field label="Expiry date"><TextInput type="date" value={f.expiry} onChange={set("expiry")} /></Field></div>
     {f.expiry < f.start && <p className="text-base text-red-600">Expiry date must be on or after the start date.</p>}
     <Checkbox checked={f.pinned} onChange={(v) => setF({ ...f, pinned: v })}>Pin this notice at the top</Checkbox>
     <Btn full disabled={!ok} onClick={() => { initial ? A.editNotice(initial.id, f) : A.addNotice(f); toast(initial ? "Notice updated" : "Notice published"); closeSheet(); }}>{initial ? "Save changes" : "Publish notice"}</Btn>
   </Sheet>
 );
}

function ComplaintSheet() {
 const { closeSheet, A, toast } = useApp();
 const [f, setF] = useState({ category: "Water", title: "", description: "", photo: null });
 const set = (k) => (e) => setF({ ...f, [k]: e.target ? e.target.value : e });
 return (
   <Sheet title="Raise a complaint" onClose={closeSheet}>
     <Field label="Category"><Select value={f.category} onChange={set("category")} options={Object.keys(COMPLAINT_CATS)} /></Field>
     <Field label="Title"><TextInput value={f.title} onChange={set("title")} placeholder="e.g. Gate light not working" /></Field>
     <Field label="Describe the problem"><TextArea value={f.description} onChange={set("description")} /></Field>
     <Field label="Photo (optional)"><FileInput label="Add a photo" icon={Camera} accept="image/*" value={f.photo} onChange={set("photo")} /></Field>
     <Btn full disabled={!f.title.trim() || !f.description.trim()} onClick={() => { A.addComplaint(f); toast("Complaint raised"); closeSheet(); }}>Submit complaint</Btn>
   </Sheet>
 );
}

function StatusSheet({ id, closing, commentOnly }) {
 const { data, closeSheet, A, toast } = useApp();
 const c = data.complaints.find((x) => x.id === id);
 const [status, setStatus] = useState(closing ? "Closed" : c.status); const [note, setNote] = useState("");
 return (
   <Sheet title={closing ? "Confirm and close" : commentOnly ? "Add comment" : "Update status"} onClose={closeSheet}>
     {!closing && !commentOnly && <Field label="New status"><Select value={status} onChange={(e) => setStatus(e.target.value)} options={Object.keys(COMPLAINT_STATUS)} /></Field>}
     <Field label={closing ? "Message (optional)" : "Note"}><TextArea value={note} onChange={(e) => setNote(e.target.value)} placeholder={closing ? "Thank you, problem fixed." : "What was done or what is next?"} /></Field>
     <Btn full disabled={!closing && !note.trim() && (commentOnly || status === c.status)} onClick={() => { A.complaintEvent(id, commentOnly ? c.status : status, note.trim() || (closing ? "Confirmed and closed." : "Status updated"), commentOnly); toast(commentOnly ? "Comment added" : "Complaint updated"); closeSheet(); }}>{closing ? "Close complaint" : "Save"}</Btn>
   </Sheet>
 );
}

function PaySheet({ houseId, admin }) {
 const { data, cur, closeSheet, A, toast } = useApp();
 const due = owed(data, houseId, cur);
 const [f, setF] = useState({ amount: String(due), date: TODAY_ISO, mode: "UPI", receipt: null });
 const set = (k) => (e) => setF({ ...f, [k]: e.target ? e.target.value : e });
 return (
   <Sheet title={admin ? `Record payment · ${houseName(data, houseId)}` : "Pay maintenance"} onClose={closeSheet}>
     <div className="rounded-2xl bg-blue-50 p-4"><p className="text-base text-slate-600">Amount due for {houseName(data, houseId)}</p><p className="text-3xl font-bold text-blue-700">{inr(due)}</p></div>
     {!admin && <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4"><p className="text-base text-slate-500">Pay by UPI to</p><p className="text-xl font-bold text-slate-800">{data.settings.upi}</p><p className="text-sm text-slate-500 mt-1">After paying, upload the screenshot below. The Admin will confirm.</p></div>}
     <Field label="Amount paid (₹)"><TextInput type="number" inputMode="numeric" value={f.amount} onChange={set("amount")} /></Field>
     <div className="grid grid-cols-2 gap-3"><Field label="Date"><TextInput type="date" value={f.date} onChange={set("date")} /></Field><Field label="Paid by"><Select value={f.mode} onChange={set("mode")} options={["UPI", "Cash", "Bank Transfer", "Cheque"]} /></Field></div>
     <Field label={admin ? "Receipt" : "Payment proof"}><FileInput label={admin ? "Upload receipt" : "Upload payment screenshot"} value={f.receipt} onChange={set("receipt")} /></Field>
     <Btn full variant="success" disabled={!(Number(f.amount) > 0)} onClick={() => { A.recordPayment(houseId, f, !!admin); toast(admin ? "Payment recorded" : "Proof sent to Admin"); closeSheet(); }}>{admin ? "Save payment" : "Send payment proof"}</Btn>
   </Sheet>
 );
}

function WorkSheet() {
 const { closeSheet, A, toast } = useApp();
 const [f, setF] = useState({ title: "", description: "", estimate: "", vendor: "", quotation: null, due: "" });
 const set = (k) => (e) => setF({ ...f, [k]: e.target ? e.target.value : e });
 return (
   <Sheet title="New work request" onClose={closeSheet}>
     <Field label="Work title"><TextInput value={f.title} onChange={set("title")} placeholder="e.g. Lift repair" /></Field>
     <Field label="Description"><TextArea value={f.description} onChange={set("description")} /></Field>
     <Field label="Estimated cost (₹)"><TextInput type="number" inputMode="numeric" value={f.estimate} onChange={set("estimate")} /></Field>
     <Field label="Vendor"><TextInput value={f.vendor} onChange={set("vendor")} /></Field>
     <Field label="Quotation"><FileInput label="Upload quotation" accept=".pdf,image/*" value={f.quotation} onChange={set("quotation")} /></Field>
     <Field label="Work due date"><TextInput type="date" value={f.due} onChange={set("due")} /></Field>
     <Btn full disabled={!f.title.trim() || !(Number(f.estimate) > 0) || !f.due} onClick={() => { A.addWork(f); toast("Sent to all houses for voting"); closeSheet(); }}>Send for voting</Btn>
   </Sheet>
 );
}

function VendorSheet({ initial }) {
 const { closeSheet, A, toast } = useApp();
 const [f, setF] = useState(initial ? { name: initial.name, phone: initial.phone, category: initial.category, notes: initial.notes } : { name: "", phone: "", category: "Electrician", notes: "" });
 const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
 return (
   <Sheet title={initial ? "Edit contact" : "Add contact"} onClose={closeSheet}>
     <Field label="Name"><TextInput value={f.name} onChange={set("name")} /></Field>
     <Field label="Phone number"><TextInput type="tel" inputMode="tel" value={f.phone} onChange={set("phone")} /></Field>
     <Field label="Category"><Select value={f.category} onChange={set("category")} options={VENDOR_CATS} /></Field>
     <Field label="Notes"><TextArea value={f.notes} onChange={set("notes")} placeholder="Timings, charges, anything useful" /></Field>
     <Btn full disabled={!f.name.trim() || f.phone.replace(/\D/g, "").length < 3} onClick={() => { initial ? A.editVendor(initial.id, f) : A.addVendor(f); toast("Contact saved"); closeSheet(); }}>Save contact</Btn>
   </Sheet>
 );
}

function HouseSheet() {
 const { data, closeSheet, A, toast } = useApp();
 const [f, setF] = useState({ name: `House ${String.fromCharCode(65 + data.houses.length)}`, number: "" });
 return (
   <Sheet title="Add house" onClose={closeSheet}>
     <Field label="House name"><TextInput value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></Field>
     <Field label="House number"><TextInput value={f.number} onChange={(e) => setF({ ...f, number: e.target.value })} placeholder="e.g. G-107" /></Field>
     <p className="text-base text-slate-500">New houses pay the same monthly maintenance. You can plan them as Admin under Admin schedule.</p>
     <Btn full disabled={!f.name.trim() || !f.number.trim()} onClick={() => { A.addHouse(f); toast("House added"); closeSheet(); }}>Add house</Btn>
   </Sheet>
 );
}

function MemberSheet({ initial, houseId }) {
 const { data, closeSheet, A, toast } = useApp();
 const [f, setF] = useState(initial ? { houseId: initial.houseId, name: initial.name, mobile: initial.mobile, email: initial.email || "", role: initial.role } : { houseId: houseId || activeHouses(data)[0].id, name: "", mobile: "", email: "", role: "Family Member" });
 const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
 const h = data.houses.find((x) => x.id === f.houseId);
 return (
   <Sheet title={initial ? "Edit member" : "Add member"} onClose={closeSheet}>
     <Field label="House"><Select value={f.houseId} onChange={set("houseId")} options={activeHouses(data).map((x) => ({ value: x.id, label: `${x.name} (${x.number})` }))} /></Field>
     <p className="text-base text-slate-500 -mt-2">House number: {h?.number}</p>
     <Field label="Member name"><TextInput value={f.name} onChange={set("name")} /></Field>
     <Field label="Mobile number"><TextInput type="tel" inputMode="tel" value={f.mobile} onChange={set("mobile")} placeholder="10-digit number" /></Field>
     <Field label="Email (used to sign in)" hint="Optional. Without an email this person cannot sign in to the app."><TextInput type="email" inputMode="email" value={f.email} onChange={set("email")} /></Field>
     <Field label="Role"><Select value={f.role} onChange={set("role")} options={["Owner", "Family Member", "Tenant"]} /></Field>
     <Btn full disabled={!f.name.trim() || f.mobile.replace(/\D/g, "").length < 10} onClick={() => { initial ? A.editMember(initial.id, f) : A.addMember(f); toast("Member saved"); closeSheet(); }}>Save member</Btn>
   </Sheet>
 );
}

const TERM_OPTIONS = Array.from({ length: 12 }, (_, i) => ({ value: String(i + 1), label: i === 0 ? "1 month" : `${i + 1} months` }));

function CloseMonthSheet() {
 const { data, cur, stats, closeSheet, A, toast } = useApp();
 const next = ymAdd(cur, 1);
 const planned = adminTermFor(data, next);
 const others = activeHouses(data).filter((h) => h.id !== data.adminHouseId);
 const [notes, setNotes] = useState("");
 const [ok, setOk] = useState(false);
 const [handover, setHandover] = useState(false);
 const [to, setTo] = useState(others[0] ? others[0].id : "");
 const [months, setMonths] = useState("1");
 const openC = data.complaints.filter((c) => ["Open", "In Progress"].includes(c.status) && c.state !== "Archived").length;
 const awaiting = data.payments.filter((p) => p.status === "Awaiting" && p.state !== "Archived").length;
 const nextAdminId = handover ? to : planned ? planned.houseId : data.adminHouseId;
 const nextNote = handover ? `${houseName(data, to)} for ${months} ${months === "1" ? "month" : "months"}` : planned ? `${houseName(data, planned.houseId)} (planned)` : `${houseName(data, data.adminHouseId)} continues (nobody planned)`;
 return (
   <Sheet title={`Close ${MONTH_NAMES[+cur.slice(5) - 1]}`} onClose={closeSheet}>
     <div className="rounded-2xl bg-slate-50 border border-slate-200 p-4 space-y-2">
       <div className="flex justify-between text-base"><span className="text-slate-500">Month</span><span className="font-semibold">{mLabel(cur)}</span></div>
       <div className="flex justify-between text-base"><span className="text-slate-500">Closing balance</span><span className="font-bold text-blue-700 text-xl">{inr(stats.closing)}</span></div>
       <div className="flex justify-between text-base"><span className="text-slate-500">Pending collections</span><span className="font-semibold">{inr(stats.pending)}</span></div>
       <div className="flex justify-between text-base"><span className="text-slate-500">Open complaints</span><span className="font-semibold">{openC}</span></div>
       <div className="flex justify-between text-base gap-3"><span className="text-slate-500">Admin for {mLabel(next)}</span><span className="font-semibold text-right">{nextNote}</span></div>
     </div>
     {(awaiting > 0 || openC > 0 || stats.pending > 0) && (
       <div className="flex gap-2 text-base text-amber-800 bg-amber-50 border border-amber-200 rounded-2xl p-3"><AlertTriangle size={20} className="shrink-0" /><span>{awaiting > 0 && `${awaiting} payment proof is still waiting for confirmation. `}Pending dues and open complaints carry forward to next month.</span></div>
     )}
     <Checkbox checked={handover} onChange={setHandover}>Hand over to a different house now (ends the current term early)</Checkbox>
     {handover && (
       <div className="space-y-3 pl-1">
         <Field label="New Admin house"><Select value={to} onChange={(e) => setTo(e.target.value)} options={others.map((h) => ({ value: h.id, label: h.name }))} /></Field>
         <Field label="For how long"><Select value={months} onChange={(e) => setMonths(e.target.value)} options={TERM_OPTIONS} /></Field>
       </div>
     )}
     <Field label="Monthly closing notes" hint="Shared with all houses. Write what was done and what is pending."><TextArea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="e.g. Gate lock replaced. Terrace waterproofing vote is open." /></Field>
     <Checkbox checked={ok} onChange={setOk}>I confirm the accounts for {mLabel(cur)} are final. This is saved permanently.</Checkbox>
     <Btn full disabled={!ok || notes.trim().length < 10 || (handover && !to)} onClick={() => { A.closeMonth(notes.trim(), handover ? { houseId: to, months } : null); toast(`${mLabel(cur)} closed`); closeSheet(); }}>Close {MONTH_NAMES[+cur.slice(5) - 1]}</Btn>
   </Sheet>
 );
}

function TermSheet() {
 const { data, cur, closeSheet, A, toast } = useApp();
 const lastEnd = termsOf(data).reduce((m, t) => Math.max(m, ymIdx(termEnd(t))), ymIdx(cur));
 const defaultStart = ymAdd(cur, lastEnd - ymIdx(cur) + 1);
 const startOptions = [...new Set([defaultStart, ...Array.from({ length: 24 }, (_, i) => ymAdd(cur, i + 1))])].sort();
 const [f, setF] = useState({ houseId: (activeHouses(data).find((h) => h.id !== data.adminHouseId) || activeHouses(data)[0] || {}).id || "", start: defaultStart, months: "1" });
 const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
 const end = ymAdd(f.start, Number(f.months) - 1);
 const overlap = termsOf(data).some((t) => ymIdx(t.start) <= ymIdx(end) && ymIdx(f.start) <= ymIdx(termEnd(t)));
 return (
   <Sheet title="Plan next Admin" onClose={closeSheet}>
     <Field label="House"><Select value={f.houseId} onChange={set("houseId")} options={activeHouses(data).map((h) => ({ value: h.id, label: h.name }))} /></Field>
     <Field label="Starts in"><Select value={f.start} onChange={set("start")} options={startOptions.map((m) => ({ value: m, label: mLabel(m) }))} /></Field>
     <Field label="For how long"><Select value={f.months} onChange={set("months")} options={TERM_OPTIONS} /></Field>
     <div className="rounded-2xl bg-blue-50 p-4 text-base text-slate-700">
       {houseName(data, f.houseId)} will be Admin {f.months === "1" ? `in ${mLabel(f.start)}` : `from ${mLabel(f.start)} to ${mLabel(end)}`}.
     </div>
     {overlap && <p className="text-base text-red-600">This overlaps another Admin term. Remove that term first or choose a later month.</p>}
     <Btn full disabled={overlap || !f.houseId} onClick={() => { A.addTerm(f); toast("Admin planned"); closeSheet(); }}>Save plan</Btn>
   </Sheet>
 );
}

function AccountSheet() {
 const { data, viewer, myHouseId, isAdmin, closeSheet, signOut, session, refreshNow, toast } = useApp();
 const [busy, setBusy] = useState(false);
 return (
   <Sheet title="Your account" onClose={closeSheet}>
     <div className="flex items-center gap-3">
       <span className="h-16 w-16 rounded-full bg-blue-600 text-white text-2xl font-bold flex items-center justify-center">{initials(viewer.name)}</span>
       <div className="min-w-0">
         <p className="text-xl font-bold text-slate-800 truncate">{viewer.name}</p>
         <p className="text-base text-slate-500">{houseName(data, myHouseId)} · {viewer.role}</p>
         <p className="text-base text-slate-500 truncate">{session.user.email}</p>
       </div>
     </div>
     <div>{isAdmin ? <Badge tone="blue" icon={ShieldCheck}>You are the Admin this month</Badge> : <Badge tone="slate">House member</Badge>}</div>
     <Btn full variant="secondary" icon={RefreshCw} disabled={busy} onClick={async () => { setBusy(true); try { await refreshNow(); toast("Up to date"); } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(false); } }}>{busy ? "Refreshing…" : "Refresh data"}</Btn>
     <Btn full variant="outlineDanger" onClick={signOut}>Sign out</Btn>
     <p className="text-sm text-slate-500 text-center">{data.settings.apartmentName}{data.settings.city ? `, ${data.settings.city}` : ""}</p>
   </Sheet>
 );
}

/* ==================================================================
  SCREENS/AUTH
  ================================================================== */
const Shell = ({ children }) => (
 <div className="min-h-screen bg-slate-50 text-slate-800 flex items-center justify-center px-5 py-10" style={{ fontSize: "17px" }}>
   <div className="w-full max-w-md space-y-5">{children}</div>
 </div>
);

const Brand = ({ title, text }) => (
 <div className="text-center">
   <div className="mx-auto h-20 w-20 rounded-3xl bg-blue-600 text-white flex items-center justify-center"><Building2 size={40} /></div>
   <h1 className="text-3xl font-bold mt-4">{title}</h1>
   {text && <p className="text-lg text-slate-500 mt-1">{text}</p>}
 </div>
);

function Splash({ text = "Loading…" }) {
 return (
   <Shell>
     <Brand title="Maintaino" />
     <p className="text-center text-lg text-slate-500">{text}</p>
   </Shell>
 );
}

function SetupNeeded() {
 return (
   <Shell>
     <Brand title="Maintaino" />
     <Card className="space-y-3 text-center">
       <div className="mx-auto h-14 w-14 rounded-full bg-amber-50 text-amber-700 flex items-center justify-center"><AlertTriangle size={26} /></div>
       <p className="text-xl font-bold">Server not connected</p>
       <p className="text-base text-slate-600">We could not connect to the server. Please try again in a little while, or contact the person who set up this app.</p>
       <Btn full onClick={() => window.location.reload()}>Try again</Btn>
       {import.meta.env.DEV && <p className="text-sm text-slate-500 text-left">Developer note: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file (production: your host's environment variables), then restart.</p>}
     </Card>
   </Shell>
 );
}

function LoadError({ message, onRetry, onSignOut }) {
 return (
   <Shell>
     <Brand title="Could not connect" />
     <Card>
       <p className="text-base text-slate-700">{message}</p>
       <div className="flex gap-3 mt-4">
         <Btn className="flex-1" onClick={onRetry}>Try again</Btn>
         <Btn variant="ghost" onClick={onSignOut}>Sign out</Btn>
       </div>
     </Card>
   </Shell>
 );
}

function AuthScreen() {
 const [mode, setMode] = useState("signin"); // signin | signup | forgot
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [busy, setBusy] = useState(false);
 const [msg, setMsg] = useState(null);

 const valid = /^\S+@\S+\.\S+$/.test(email.trim()) && (mode === "forgot" || password.length >= 8);

 const submit = async () => {
   setBusy(true); setMsg(null);
   try {
     if (mode === "signin") {
       const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
       if (error) throw error;
     } else if (mode === "signup") {
       const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { emailRedirectTo: window.location.origin } });
       if (error) throw error;
       if (!data.session) setMsg({ kind: "ok", text: `We sent a confirmation link to ${email.trim()}. Open it, then come back and sign in.` });
     } else {
       const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: window.location.origin });
       if (error) throw error;
       setMsg({ kind: "ok", text: "If this email has an account, a reset link is on its way." });
     }
   } catch (e) {
     setMsg({ kind: "err", text: errMsg(e) });
   } finally { setBusy(false); }
 };

 return (
   <Shell>
     <Brand title="Maintaino" text="Maintenance, notices and accounts for your apartment" />
     <Card className="space-y-4">
       {mode !== "forgot" && <Segments value={mode} onChange={(m) => { setMode(m); setMsg(null); }} options={[{ id: "signin", label: "Sign in" }, { id: "signup", label: "Create account" }]} />}
       {mode === "forgot" && <p className="text-lg font-bold">Reset your password</p>}
       <Field label="Email"><TextInput type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></Field>
       {mode !== "forgot" && (
         <Field label="Password" hint={mode === "signup" ? "At least 8 characters" : undefined}>
           <TextInput type="password" autoComplete={mode === "signup" ? "new-password" : "current-password"} value={password} onChange={(e) => setPassword(e.target.value)} onKeyDown={(e) => e.key === "Enter" && valid && !busy && submit()} />
         </Field>
       )}
       {msg && <div className={cx("p-3 rounded-2xl text-base border", msg.kind === "ok" ? "bg-green-50 border-green-200 text-green-800" : "bg-red-50 border-red-200 text-red-700")}>{msg.text}</div>}
       <Btn full disabled={!valid || busy} onClick={submit}>{busy ? "Please wait…" : mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Send reset link"}</Btn>
       {mode === "signin" && <button onClick={() => { setMode("forgot"); setMsg(null); }} className="w-full h-12 text-base font-semibold text-blue-600">Forgot password?</button>}
       {mode === "forgot" && <button onClick={() => { setMode("signin"); setMsg(null); }} className="w-full h-12 text-base font-semibold text-blue-600">Back to sign in</button>}
     </Card>
     <p className="text-center text-base text-slate-500">Use the email your apartment Admin added for you.</p>
   </Shell>
 );
}

function ResetPassword({ onDone }) {
 const [pw, setPw] = useState(""); const [pw2, setPw2] = useState(""); const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
 const save = async () => {
   setBusy(true); setErr("");
   try { const { error } = await supabase.auth.updateUser({ password: pw }); if (error) throw error; onDone(); }
   catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
 };
 return (
   <Shell>
     <Brand title="Choose a new password" />
     <Card className="space-y-4">
       <Field label="New password" hint="At least 8 characters"><TextInput type="password" autoComplete="new-password" value={pw} onChange={(e) => setPw(e.target.value)} /></Field>
       <Field label="Type it again"><TextInput type="password" autoComplete="new-password" value={pw2} onChange={(e) => setPw2(e.target.value)} /></Field>
       {pw2 && pw !== pw2 && <p className="text-base text-red-600">The two passwords do not match.</p>}
       {err && <p className="text-base text-red-600">{err}</p>}
       <Btn full disabled={busy || pw.length < 8 || pw !== pw2} onClick={save}>Save password</Btn>
     </Card>
   </Shell>
 );
}

/* Shown when the signed-in email is not linked to any house yet. */
function Onboarding({ email, onDone, onRetry, onSignOut }) {
 const [mode, setMode] = useState("choose"); // choose | setup
 const [checking, setChecking] = useState(false);
 const [f, setF] = useState({
   name: "", city: "", upi: "", due: "2500", opening: "0",
   houses: "House A, A-101\nHouse B, A-102\nHouse C, A-103\nHouse D, A-104\nHouse E, A-105\nHouse F, A-106",
   myHouse: "1", myMonths: "1", myName: "", myMobile: "",
 });
 const [busy, setBusy] = useState(false); const [err, setErr] = useState("");
 const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

 const houses = f.houses.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
   const [n, ...rest] = l.split(",");
   return { name: n.trim(), number: rest.join(",").trim() || n.trim() };
 });
 const dupes = new Set(houses.map((h) => h.name.toLowerCase())).size !== houses.length;
 const valid = f.name.trim() && f.myName.trim() && Number(f.due) > 0 && houses.length >= 2 && houses.length <= 30 && !dupes && Number(f.myHouse) <= houses.length;

 const create = async () => {
   setBusy(true); setErr("");
   try {
     await createApartment({ name: f.name.trim(), city: f.city.trim(), upi: f.upi.trim(), due: f.due, opening: f.opening, houses, myHouse: Number(f.myHouse), myMonths: f.myMonths, myName: f.myName.trim(), myMobile: f.myMobile.replace(/\D/g, "").slice(-10) });
     await onDone();
   } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
 };
 const check = async () => { setChecking(true); try { await onRetry(); } finally { setChecking(false); } };

 if (mode === "choose") {
   return (
     <Shell>
       <Brand title="Welcome" text={email} />
       <Card className="space-y-3">
         <div className="flex items-center gap-3"><IconCircle icon={Users} tone="blue" /><p className="text-lg font-bold">Join your apartment</p></div>
         <p className="text-base text-slate-600">Ask this month's Admin to add <span className="font-semibold text-slate-800">{email}</span> under More → Houses & members. Then tap the button below.</p>
         <Btn full variant="secondary" disabled={checking} onClick={check}>{checking ? "Checking…" : "I have been added. Check again"}</Btn>
       </Card>
       <Card className="space-y-3">
         <div className="flex items-center gap-3"><IconCircle icon={Building2} tone="green" /><p className="text-lg font-bold">Set up a new apartment</p></div>
         <p className="text-base text-slate-600">Only one person per apartment does this. You become the first Admin.</p>
         <Btn full onClick={() => setMode("setup")}>Set up my apartment</Btn>
       </Card>
       <button onClick={onSignOut} className="w-full h-12 text-base font-semibold text-slate-500">Sign out</button>
     </Shell>
   );
 }

 return (
   <Shell>
     <div className="flex items-center gap-3">
       <button onClick={() => setMode("choose")} aria-label="Go back" className="h-12 w-12 rounded-full bg-white border border-slate-200 flex items-center justify-center"><ChevronLeft size={26} /></button>
       <h1 className="text-2xl font-bold">Set up your apartment</h1>
     </div>
     <Card className="space-y-4">
       <Field label="Apartment name"><TextInput value={f.name} onChange={set("name")} placeholder="e.g. Shanti Residency" /></Field>
       <Field label="City (optional)"><TextInput value={f.city} onChange={set("city")} /></Field>
       <Field label="Maintenance per house each month (₹)"><TextInput type="number" inputMode="numeric" value={f.due} onChange={set("due")} /></Field>
       <Field label="Money in the fund today (₹)" hint="The opening balance for this month"><TextInput type="number" inputMode="numeric" value={f.opening} onChange={set("opening")} /></Field>
       <Field label="UPI ID for maintenance (optional)" hint="Shown to residents when they pay"><TextInput value={f.upi} onChange={set("upi")} placeholder="name@bank" /></Field>
     </Card>
     <Card className="space-y-4">
       <Field label="Houses" hint="One per line: name, then house number (for example: House A, A-101).">
         <TextArea rows={7} value={f.houses} onChange={set("houses")} />
       </Field>
       <p className="text-base text-slate-500">{houses.length} {houses.length === 1 ? "house" : "houses"}</p>
       {dupes && <p className="text-base text-red-600">Two houses have the same name.</p>}
       {houses.length > 30 && <p className="text-base text-red-600">Please list at most 30 houses.</p>}
     </Card>
     <Card className="space-y-4">
       <Field label="Which house is yours?"><Select value={f.myHouse} onChange={set("myHouse")} options={houses.map((h, i) => ({ value: String(i + 1), label: h.name }))} /></Field>
       <Field label="Your name"><TextInput value={f.myName} onChange={set("myName")} /></Field>
       <Field label="Your mobile number (optional)"><TextInput type="tel" inputMode="tel" value={f.myMobile} onChange={set("myMobile")} /></Field>
       <Field label="How long will you be the first Admin?" hint="You can plan who is Admin next, and for how long, any time."><Select value={f.myMonths} onChange={set("myMonths")} options={TERM_OPTIONS} /></Field>
       
       {err && <div className="p-3 rounded-2xl text-base bg-red-50 border border-red-200 text-red-700">{err}</div>}
       <Btn full variant="success" disabled={!valid || busy} onClick={create}>{busy ? "Setting up…" : "Create apartment"}</Btn>
     </Card>
   </Shell>
 );
}

/* ==================================================================
  APP
  ================================================================== */
const SCREENS = { dashboard: Dashboard, notices: Notices, finance: Finance, complaints: Complaints, more: More, expenseDetail: ExpenseDetail, complaintDetail: ComplaintDetail, work: WorkList, workDetail: WorkDetail, houses: Houses, rotation: Rotation, vendors: Vendors, audit: Audit, reports: Reports, backup: Backup };
const SHEETS = { expense: ExpenseSheet, notice: NoticeSheet, complaint: ComplaintSheet, status: StatusSheet, pay: PaySheet, work: WorkSheet, vendor: VendorSheet, house: HouseSheet, member: MemberSheet, closeMonth: CloseMonthSheet, term: TermSheet, account: AccountSheet };
const TABS = [
 { id: "dashboard", label: "Dashboard", icon: Home }, { id: "notices", label: "Notices", icon: Bell }, { id: "finance", label: "Finance", icon: Wallet },
 { id: "complaints", label: "Complaints", icon: MessageSquare }, { id: "more", label: "More", icon: MoreHorizontal },
];

// Catches any unexpected crash so people never see a blank white screen.
class ErrorBoundary extends Component {
 constructor(props) { super(props); this.state = { failed: false }; }
 static getDerivedStateFromError() { return { failed: true }; }
 componentDidCatch(err) { console.error(err); }
 render() {
   if (!this.state.failed) return this.props.children;
   return (
     <div className="min-h-screen bg-slate-50 flex items-center justify-center px-5">
       <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-4">
         <div className="mx-auto h-16 w-16 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center"><AlertTriangle size={30} /></div>
         <h1 className="text-2xl font-bold text-slate-800">Something went wrong</h1>
         <p className="text-base text-slate-600">Please reload Maintaino. Your saved data is safe.</p>
         <button onClick={() => window.location.reload()} className="h-14 w-full rounded-2xl bg-blue-600 text-white text-lg font-semibold">Reload</button>
       </div>
     </div>
   );
 }
}

export default function App() {
 return <ErrorBoundary><Root /></ErrorBoundary>;
}

function Root() {
 const [session, setSession] = useState(undefined); // undefined = still checking
 const [recovery, setRecovery] = useState(false);

 useEffect(() => {
   if (!configured) return undefined;
   supabase.auth.getSession().then(({ data }) => setSession(data.session)).catch(() => setSession(null));
   const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
     setSession(sess);
     if (event === "PASSWORD_RECOVERY") setRecovery(true);
   });
   return () => sub.subscription.unsubscribe();
 }, []);

 if (!configured) return <SetupNeeded />;
 if (session === undefined) return <Splash />;
 if (!session) return <AuthScreen />;
 if (recovery) return <ResetPassword onDone={() => setRecovery(false)} />;
 return <Main key={session.user.id} session={session} />;
}

function Main({ session }) {
 const uid = session.user.id;
 const [phase, setPhase] = useState("loading"); // loading | error | onboarding | ready
 const [loadErr, setLoadErr] = useState("");
 const [data, setData] = useState(null);
 const [viewer, setViewer] = useState(null);
 const [stack, setStack] = useState([{ name: "dashboard", key: 1 }]);
 const [sheet, setSheet] = useState(null);
 const [toastMsg, setToastMsg] = useState(null);
 const [busy, setBusy] = useState(0);
 const [online, setOnline] = useState(typeof navigator === "undefined" ? true : navigator.onLine);
 const keyRef = useRef(1);
 const txRef = useRef(null);
 const savingRef = useRef(false);
 const afterRef = useRef([]); // navigation that must wait until the saved data has reloaded
 const lastLoad = useRef(0);
 const toastTimer = useRef(null);

 const refresh = useCallback(async (claim = false) => {
   const res = await loadAll(uid, claim);
   if (!res.me) { setPhase("onboarding"); return; }
   setData(res.data); setViewer(res.me); setPhase("ready");
   lastLoad.current = Date.now();
 }, [uid]);

 const load = useCallback((claim) => {
   setPhase("loading");
   refresh(claim).catch((e) => { console.error(e); setLoadErr(errMsg(e)); setPhase("error"); });
 }, [refresh]);

 useEffect(() => { load(true); }, [load]);

 // Refresh when the person comes back to the app, and track the connection.
 useEffect(() => {
   const onVisible = () => { if (document.visibilityState === "visible" && Date.now() - lastLoad.current > 30000) refresh().catch(() => {}); };
   const on = () => setOnline(true), off = () => setOnline(false);
   document.addEventListener("visibilitychange", onVisible);
   window.addEventListener("online", on); window.addEventListener("offline", off);
   return () => { document.removeEventListener("visibilitychange", onVisible); window.removeEventListener("online", on); window.removeEventListener("offline", off); };
 }, [refresh]);

 const route = stack[stack.length - 1];
 useEffect(() => { window.scrollTo(0, 0); }, [route.key]);

 const cur = data ? data.currentMonth : "";
 const stats = useMemo(() => (data ? monthStats(data, data.currentMonth) : null), [data]);
 const myHouseId = viewer ? viewer.houseId : null;
 const isAdmin = !!data && myHouseId === data.adminHouseId;

 /* ---- navigation and messages ---- */
 const showToast = (msg, kind = "ok") => {
   setToastMsg({ msg, kind });
   clearTimeout(toastTimer.current);
   toastTimer.current = setTimeout(() => setToastMsg(null), kind === "error" ? 5000 : 2600);
 };
 // While a save is running, toast / closeSheet / back wait for it. If the save fails the form stays
 // open so the person can try again, and only an error message is shown.
 const defer = (fn) => { if (txRef.current) txRef.current.queue.push(fn); else fn(); };
 const toast = (m, kind) => (kind === "error" ? showToast(m, kind) : defer(() => showToast(m)));
 const closeSheet = () => defer(() => setSheet(null));
 const back = () => defer(() => setStack((st) => (st.length > 1 ? st.slice(0, -1) : st)));
 const go = (name, params) => setStack((st) => [...st, { name, params, key: ++keyRef.current }]);
 const tab = (name, params) => setStack([{ name, params, key: ++keyRef.current }]);
 const openSheet = (name, props = {}) => setSheet({ name, props });
 const signOut = () => supabase.auth.signOut();

 /* ---- actions: save to the server, then reload ---- */
 const A = useMemo(() => {
   if (!data || !viewer) return {};
   const raw = makeActions({ data, viewer, myHouseId, isAdmin, cur, nav: { tab: (n, p) => afterRef.current.push(() => tab(n, p)) } });
   const wrap = (fn) => (...args) => {
     const tx = { queue: [] };
     txRef.current = tx;
     Promise.resolve().then(() => { if (txRef.current === tx) txRef.current = null; });
     if (savingRef.current) return; // a save is already running: ignore the extra tap
     savingRef.current = true;
     setBusy((b) => b + 1);
     (async () => {
       try {
         await fn(...args);
         await refresh();
         afterRef.current.splice(0).forEach((f) => f());
         tx.queue.forEach((f) => f());
       } catch (e) {
         console.error(e);
         afterRef.current = [];
         showToast(errMsg(e), "error");
       } finally { savingRef.current = false; setBusy((b) => b - 1); }
     })();
   };
   return Object.fromEntries(Object.entries(raw).map(([k, f]) => [k, wrap(f)]));
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [data, viewer, myHouseId, isAdmin, cur, refresh]);

 if (phase === "loading") return <Splash text="Loading your apartment…" />;
 if (phase === "error") return <LoadError message={loadErr} onRetry={() => load(true)} onSignOut={signOut} />;
 if (phase === "onboarding") return <Onboarding email={session.user.email} onDone={() => load(false)} onRetry={() => refresh(true)} onSignOut={signOut} />;

 const ctx = { data, stats, cur, viewer, isAdmin, myHouseId, session, go, back, tab, openSheet, closeSheet, toast, A, signOut, refreshNow: () => refresh() };
 const Screen = SCREENS[route.name] || Dashboard;
 const SheetC = sheet ? SHEETS[sheet.name] : null;
 const activeTab = stack[0].name;

 return (
   <Ctx.Provider value={ctx}>
     <div className="min-h-screen bg-slate-50 text-slate-800" style={{ fontSize: "17px" }}>
       {busy > 0 && <div className="fixed top-0 left-0 right-0 z-[70] h-1 bg-blue-600 animate-pulse" />}

       {/* Top bar: brand, account, and the five main sections */}
       <header className="sticky top-0 z-30 bg-white border-b border-slate-200" style={{ paddingTop: "env(safe-area-inset-top)" }}>
         <div className="mx-auto w-full max-w-xl md:max-w-3xl px-4">
           <div className="flex items-center justify-between h-14">
             <button onClick={() => tab("dashboard")} aria-label="Maintaino home" className="flex items-center gap-2 min-w-0">
               <span className="h-9 w-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0"><Building2 size={20} /></span>
               <span className="text-left min-w-0">
                 <span className="block text-lg font-bold text-slate-800 leading-tight">Maintaino</span>
                 <span className="block text-xs text-slate-500 truncate leading-tight">{data.settings.apartmentName}</span>
               </span>
             </button>
             <button onClick={() => openSheet("account")} aria-label="Your account" className="flex items-center gap-2 h-11 pl-1 pr-1 sm:pr-3 rounded-full bg-slate-100">
               <span className="h-9 w-9 rounded-full bg-blue-600 text-white text-sm font-bold flex items-center justify-center">{initials(viewer.name)}</span>
               <span className="text-sm font-semibold text-slate-800 hidden sm:inline">{houseName(data, myHouseId)}</span>
             </button>
           </div>
           <nav className="grid grid-cols-5 gap-1 pb-2" aria-label="Main sections">
             {TABS.map((t) => {
               const on = activeTab === t.id;
               return (
                 <button key={t.id} onClick={() => tab(t.id)} aria-current={on ? "page" : undefined} className={cx("flex flex-col items-center gap-0.5 py-1.5 rounded-xl", on ? "bg-blue-50 text-blue-700" : "text-slate-500")}>
                   <t.icon size={22} />
                   <span className="text-xs sm:text-sm font-semibold">{t.label}</span>
                 </button>
               );
             })}
           </nav>
         </div>
       </header>

       {!online && <div className="bg-amber-500 text-slate-900 text-center text-base font-semibold py-2 px-4">You are offline. Changes cannot be saved right now.</div>}
       <main className="mx-auto w-full max-w-xl md:max-w-3xl"><Screen key={route.key} {...(route.params || {})} /></main>

       {SheetC && <SheetC {...sheet.props} />}
       {toastMsg && (
         <div className="fixed left-0 right-0 z-[60] flex justify-center px-4 pointer-events-none" style={{ top: "calc(env(safe-area-inset-top) + 8.5rem)" }}>
           <div role="status" className="bg-slate-800 text-white text-base font-semibold px-5 py-3 rounded-2xl flex items-center gap-2 max-w-md">
             {toastMsg.kind === "error" ? <AlertTriangle size={20} className="text-amber-400 shrink-0" /> : <CheckCircle2 size={20} className="text-green-400 shrink-0" />}
             <span>{toastMsg.msg}</span>
           </div>
         </div>
       )}
     </div>
   </Ctx.Provider>
 );
}
 