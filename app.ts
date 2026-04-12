type EntryStatus = "done" | "confirmed" | "requested" | "tbd";

interface HoursEntry {
  date: string;
  time: string;
  location: string;
  status: EntryStatus;
  hours: number;
}

interface DeadlineMarker {
  forDate: string;
  location: string;
}

// Notice rules: how many weeks before the date you need to decide
// Notice period in days: Talpiot (Merav) = 15 days, Neve Yaakov (Avishag) = 22 days
const NOTICE_DAYS: Record<string, number> = {
  תלפיות: 15, // 2 weeks + 1 day
  "נווה יעקב (אבישג)": 22, // 3 weeks + 1 day
};

function getDecideByDate(entry: HoursEntry): string | null {
  const days = NOTICE_DAYS[entry.location];
  if (!days) return null;
  if (entry.status !== "tbd") return null;
  const d = new Date(entry.date);
  d.setDate(d.getDate() - days);
  return `${d.getDate()}/${d.getMonth() + 1}`;
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
  const days = NOTICE_DAYS[entry.location];
  if (!days) return false;
  const deadline = new Date(entry.date);
  deadline.setDate(deadline.getDate() - days);
  return new Date() > deadline;
}

function getDeadlineMarkers(
  year: number,
  month: number,
): Record<number, DeadlineMarker[]> {
  const markers: Record<number, DeadlineMarker[]> = {};
  // Check TBD/requested entries from nearby months (current + next 3 months)
  for (let m = 0; m < 4; m++) {
    let checkMonth = month + m;
    let checkYear = year;
    if (checkMonth > 11) {
      checkMonth -= 12;
      checkYear++;
    }
    const tbdEntries = [
      ...generateTbdEntries(checkYear, checkMonth),
      ...manualEntries.filter((e) => {
        const d = new Date(e.date);
        return (
          d.getFullYear() === checkYear &&
          d.getMonth() === checkMonth &&
          e.status === "tbd"
        );
      }),
    ];
    for (const entry of tbdEntries) {
      if (isExpired(entry)) continue;
      const days = NOTICE_DAYS[entry.location];
      if (!days) continue;
      // Yellow marker on notice deadline (15 or 22 days before)
      const deadlineDate = new Date(entry.date);
      deadlineDate.setDate(deadlineDate.getDate() - days);
      if (
        deadlineDate.getFullYear() === year &&
        deadlineDate.getMonth() === month
      ) {
        // Hide only after the day is completely over (next day)
        const endOfDay = new Date(deadlineDate);
        endOfDay.setDate(endOfDay.getDate() + 1);
        if (new Date() > endOfDay) continue;
        const day = deadlineDate.getDate();
        if (!markers[day]) markers[day] = [];
        const entryDate = new Date(entry.date);
        markers[day].push({
          forDate: `${entryDate.getDate()}/${entryDate.getMonth() + 1}`,
          location: entry.location,
        });
      }
    }
  }
  return markers;
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

  const deadlineMarkers = getDeadlineMarkers(currentYear, currentMonth);

  for (let d = 1; d <= daysInMonth; d++) {
    const entry = entryMap[d];
    const deadlines = deadlineMarkers[d];
    const isToday =
      today.getFullYear() === currentYear &&
      today.getMonth() === currentMonth &&
      today.getDate() === d;
    let cls = "day";
    if (isToday) cls += " today";
    if (entry) cls += ` status-${entry.status}`;
    if (deadlines && !entry) cls += " has-deadline";

    let inner = `<span class="num">${d}</span>`;
    if (entry) {
      inner += `<span class="hours-badge">${entry.hours} שע׳</span>`;
      const decideBy = getDecideByDate(entry);
      const deadlineText = decideBy ? `<br>להחליט עד ${decideBy}` : "";
      inner += `<div class="tooltip">${entry.time} · ${entry.location}${deadlineText}</div>`;
    }
    if (deadlines) {
      inner += `<span class="deadline-dot">⏰</span>`;
      const lines = deadlines
        .map((dl) => `לשלוח למירב: ${dl.forDate} ${dl.location}`)
        .join("<br>");
      if (!entry) {
        inner += `<div class="tooltip">${lines}</div>`;
      }
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
