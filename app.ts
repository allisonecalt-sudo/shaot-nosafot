type EntryStatus = "done" | "confirmed" | "requested" | "send" | "tbd";

interface HoursEntry {
  date: string;
  time: string;
  location: string;
  status: EntryStatus;
  hours: number;
  generated?: boolean;
}

// Notice period per location (days + label)
const NOTICE_INFO: Record<string, { days: number; label: string }> = {
  תלפיות: { days: 21, label: "3 שבועות מראש" },
  "נווה יעקב (אבישג)": { days: 14, label: "2 שבועות מראש" },
};

function getNoticeLabel(entry: HoursEntry): string | null {
  if (entry.status !== "tbd" || !entry.generated) return null;
  const info = NOTICE_INFO[entry.location];
  if (!info) return null;
  const deadline = new Date(entry.date);
  deadline.setDate(deadline.getDate() - info.days);
  const deadlineStr = `${deadline.getDate()}/${deadline.getMonth() + 1}`;
  return `להחליט עד ${deadlineStr}`;
}

// Recurring TBD slots — auto-generated for every Monday and Friday
const RECURRING_SLOTS: {
  dayOfWeek: number;
  time: string;
  location: string;
  hours: number;
}[] = [
  { dayOfWeek: 1, time: "3:15-7:15", location: "נווה יעקב (אבישג)", hours: 4 }, // Monday
  { dayOfWeek: 5, time: "8:00-12:00", location: "תלפיות", hours: 4 }, // Friday
];

function generateTbdEntries(year: number, month: number): HoursEntry[] {
  const generated: HoursEntry[] = [];
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, month, d);
    const dow = date.getDay();
    const slot = RECURRING_SLOTS.find((s) => s.dayOfWeek === dow);
    if (!slot) continue;
    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    // Only generate if no manual entry exists for this date
    if (manualEntries.some((e) => e.date === dateStr)) continue;
    generated.push({
      date: dateStr,
      time: slot.time,
      location: slot.location,
      status: "tbd",
      hours: slot.hours,
      generated: true,
    });
  }
  return generated;
}

// ===== MANUAL DATA — confirmed/requested/done entries override TBD =====
const manualEntries: HoursEntry[] = [
  // April 2026
  {
    date: "2026-04-10",
    time: "—",
    location: "תלפיות",
    status: "done",
    hours: 4,
  },
  {
    date: "2026-04-13",
    time: "3:30pm",
    location: "תלפיות",
    status: "done",
    hours: 2,
  },
  {
    date: "2026-04-24",
    time: "—",
    location: "תלפיות",
    status: "confirmed",
    hours: 4,
  },
  {
    date: "2026-04-23",
    time: "4pm",
    location: "תלפיות",
    status: "confirmed",
    hours: 2,
  },

  {
    date: "2026-04-27",
    time: "—",
    location: "תלפיות",
    status: "send",
    hours: 4,
  },

  // May 2026
  {
    date: "2026-05-01",
    time: "8:00-12:00",
    location: "תלפיות",
    status: "requested",
    hours: 4,
  },
  {
    date: "2026-05-08",
    time: "8:00-12:00",
    location: "תלפיות",
    status: "requested",
    hours: 4,
  },
];

const hebrewMonths: string[] = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
];
const dayHeaders: string[] = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"];
const statusLabels: Record<EntryStatus, string> = {
  done: "בוצע",
  confirmed: "מאושר",
  requested: "נשלח",
  send: "לשלוח",
  tbd: "TBD",
};

let currentYear = 2026;
let currentMonth = 3; // April (0-indexed)

function isExpired(entry: HoursEntry): boolean {
  if (entry.status !== "tbd") return false;
  const info = NOTICE_INFO[entry.location];
  if (!info) return false;
  const deadline = new Date(entry.date);
  deadline.setDate(deadline.getDate() - info.days);
  // Keep visible through the entire deadline day
  deadline.setHours(23, 59, 59, 999);
  return new Date() > deadline;
}

function getEntries(year: number, month: number): HoursEntry[] {
  const manual = manualEntries.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month;
  });
  const generated = generateTbdEntries(year, month).filter(
    (e) => !isExpired(e),
  );
  return [...manual, ...generated];
}

function render(): void {
  const label = `${hebrewMonths[currentMonth]} ${currentYear}`;
  (document.getElementById("monthLabel") as HTMLElement).textContent = label;

  const monthEntries = getEntries(currentYear, currentMonth);
  const entryMap: Record<number, HoursEntry> = {};
  monthEntries.forEach((e) => {
    const day = new Date(e.date).getDate();
    entryMap[day] = e;
  });

  // Totals
  const totals: Record<EntryStatus, number> = {
    done: 0,
    confirmed: 0,
    requested: 0,
    send: 0,
    tbd: 0,
  };
  monthEntries.forEach((e) => {
    totals[e.status] = (totals[e.status] || 0) + e.hours;
  });
  const totalAll =
    totals.done +
    totals.confirmed +
    totals.requested +
    totals.send +
    totals.tbd;

  let totalsHtml = "";
  if (totals.done)
    totalsHtml += `<span class="chip done">בוצע: ${totals.done} שע׳</span>`;
  if (totals.confirmed)
    totalsHtml += `<span class="chip confirmed">מאושר: ${totals.confirmed} שע׳</span>`;
  if (totals.requested)
    totalsHtml += `<span class="chip requested">נשלח: ${totals.requested} שע׳</span>`;
  if (totals.send)
    totalsHtml += `<span class="chip send">לשלוח: ${totals.send} שע׳</span>`;
  if (totals.tbd)
    totalsHtml += `<span class="chip total">TBD: ${totals.tbd} שע׳</span>`;
  if (totalAll)
    totalsHtml += `<span class="chip total">סה״כ: ${totalAll} שע׳</span>`;
  (document.getElementById("totals") as HTMLElement).innerHTML = totalsHtml;

  // Calendar grid
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const today = new Date();

  let html = dayHeaders
    .map((d) => `<div class="day-header">${d}</div>`)
    .join("");

  for (let i = 0; i < firstDay; i++) {
    html += '<div class="day empty"></div>';
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const entry = entryMap[d];
    const isToday =
      today.getFullYear() === currentYear &&
      today.getMonth() === currentMonth &&
      today.getDate() === d;
    let cls = "day";
    if (isToday) cls += " today";
    if (entry) cls += ` status-${entry.status}`;

    let inner = `<span class="num">${d}</span>`;
    if (entry) {
      inner += `<span class="hours-badge">${entry.hours} שע׳</span>`;
      inner += `<span class="cal-status ${entry.status}">${statusLabels[entry.status]}</span>`;
      const notice = getNoticeLabel(entry);
      const noticeText = notice ? `<br>${notice}` : "";
      inner += `<div class="tooltip">${entry.time} · ${entry.location}${noticeText}</div>`;
    }
    html += `<div class="${cls}">${inner}</div>`;
  }

  (document.getElementById("calendar") as HTMLElement).innerHTML = html;

  // Details list
  let detailsHtml = "";
  if (monthEntries.length) {
    detailsHtml = `<h3>פירוט החודש</h3>`;
    monthEntries
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((e) => {
        const d = new Date(e.date);
        const dayStr = `${d.getDate()}/${d.getMonth() + 1}`;
        const notice = getNoticeLabel(e);
        const noticeLine = notice
          ? `<div class="location">${notice}</div>`
          : "";
        detailsHtml += `
        <div class="detail-card">
          <div class="info">
            <div>${dayStr} · ${e.time}</div>
            <div class="location">${e.location} · ${e.hours} שעות</div>
            ${noticeLine}
          </div>
          <span class="status-tag ${e.status}">${statusLabels[e.status]}</span>
        </div>`;
      });
  }
  (document.getElementById("details") as HTMLElement).innerHTML = detailsHtml;
}

(document.getElementById("prev") as HTMLElement).addEventListener(
  "click",
  () => {
    currentMonth--;
    if (currentMonth < 0) {
      currentMonth = 11;
      currentYear--;
    }
    render();
  },
);

(document.getElementById("next") as HTMLElement).addEventListener(
  "click",
  () => {
    currentMonth++;
    if (currentMonth > 11) {
      currentMonth = 0;
      currentYear++;
    }
    render();
  },
);

render();
