type EntryStatus = "done" | "confirmed" | "requested" | "tbd";

interface HoursEntry {
  date: string;
  time: string;
  location: string;
  status: EntryStatus;
  hours: number;
}

// Notice rules: how many weeks before the date you need to decide
const NOTICE_WEEKS: Record<string, number> = {
  תלפיות: 3,
  "נווה יעקב": 2,
};

function getDecideByDate(entry: HoursEntry): string | null {
  const weeks = NOTICE_WEEKS[entry.location];
  if (!weeks) return null;
  if (entry.status !== "tbd" && entry.status !== "requested") return null;
  const d = new Date(entry.date);
  d.setDate(d.getDate() - weeks * 7);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

// ===== DATA — edit here to add/update entries =====
const entries: HoursEntry[] = [
  // April 2026
  { date: "2026-04-10", time: "—", location: "תלפיות", status: "done", hours: 4 },
  {
    date: "2026-04-13",
    time: "3:30pm",
    location: "תלפיות",
    status: "confirmed",
    hours: 2,
  },
  {
    date: "2026-04-17",
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
  // Neve Yaakov Mondays — TBD, decide by Apr 19
  {
    date: "2026-05-04",
    time: "3:15-7:15",
    location: "נווה יעקב",
    status: "tbd",
    hours: 4,
  },
  {
    date: "2026-05-11",
    time: "3:15-7:15",
    location: "נווה יעקב",
    status: "tbd",
    hours: 4,
  },
  {
    date: "2026-05-18",
    time: "3:15-7:15",
    location: "נווה יעקב",
    status: "tbd",
    hours: 4,
  },
  {
    date: "2026-05-25",
    time: "3:15-7:15",
    location: "נווה יעקב",
    status: "tbd",
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
  tbd: "TBD",
};

let currentYear = 2026;
let currentMonth = 3; // April (0-indexed)

function isExpired(entry: HoursEntry): boolean {
  if (entry.status !== "tbd") return false;
  const weeks = NOTICE_WEEKS[entry.location];
  if (!weeks) return false;
  const deadline = new Date(entry.date);
  deadline.setDate(deadline.getDate() - weeks * 7);
  return new Date() > deadline;
}

function getEntries(year: number, month: number): HoursEntry[] {
  return entries.filter((e) => {
    const d = new Date(e.date);
    return d.getFullYear() === year && d.getMonth() === month && !isExpired(e);
  });
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
    tbd: 0,
  };
  monthEntries.forEach((e) => {
    totals[e.status] = (totals[e.status] || 0) + e.hours;
  });
  const totalAll =
    totals.done + totals.confirmed + totals.requested + totals.tbd;

  let totalsHtml = "";
  if (totals.done)
    totalsHtml += `<span class="chip done">בוצע: ${totals.done} שע׳</span>`;
  if (totals.confirmed)
    totalsHtml += `<span class="chip confirmed">מאושר: ${totals.confirmed} שע׳</span>`;
  if (totals.requested)
    totalsHtml += `<span class="chip requested">נשלח: ${totals.requested} שע׳</span>`;
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
      const decideBy = getDecideByDate(entry);
      const deadlineText = decideBy ? `<br>להחליט עד ${decideBy}` : "";
      inner += `<div class="tooltip">${entry.time} · ${entry.location}${deadlineText}</div>`;
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
        const decideBy = getDecideByDate(e);
        const deadlineLine = decideBy
          ? `<div class="location">להחליט עד ${decideBy}</div>`
          : "";
        detailsHtml += `
        <div class="detail-card">
          <div class="info">
            <div>${dayStr} · ${e.time}</div>
            <div class="location">${e.location} · ${e.hours} שעות</div>
            ${deadlineLine}
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
