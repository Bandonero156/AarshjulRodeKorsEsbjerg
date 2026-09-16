const months = [
  "Januar","Februar","Marts","April","Maj","Juni",
  "Juli","August","September","Oktober","November","December"
];

const SHEET_CSV_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS0Y683nr_IOWw2EjGRNiH7VVIWK7XdCrzjK0fXzeo6X-3uaJFCXl6htnCQ0VE5dmB97sCoJBMi1CU5/pub?gid=1691626216&single=true&output=csv";

let events = [];
let displayYear = 2027;

const wheel = document.getElementById("wheel");
const monthTitle = document.getElementById("monthTitle");
const eventList = document.getElementById("eventList");
const eventCount = document.getElementById("eventCount");

const monthLookup = {
  januar: 0, februar: 1, marts: 2, april: 3, maj: 4, juni: 5,
  juli: 6, august: 7, september: 8, oktober: 9, november: 10, december: 11
};

const segmentColors = [
  "#fff4f2", "#fde9e6", "#fff7f6", "#fbe3df",
  "#fff2f0", "#f8ded9", "#fff6f4", "#fce7e3",
  "#fff2ef", "#f9dfdb", "#fff6f5", "#fce9e6"
];

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"' && inQuotes && next === '"') {
      field += '"';
      i++;
    } else if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      row.push(field);
      field = "";
    } else if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") i++;
      row.push(field);
      if (row.some(cell => cell.trim() !== "")) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  row.push(field);
  if (row.some(cell => cell.trim() !== "")) rows.push(row);
  return rows;
}

function parseDate(value) {
  if (!value) return null;
  const match = String(value).trim().match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (!match) return null;
  const [, day, month, year] = match;
  return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
}

function categoryType(category) {
  const value = String(category || "").trim().toLowerCase();
  if (value === "møde" || value === "moede") return "meeting";
  if (value === "udvalg") return "committee";
  if (value === "hr-udvalg" || value === "hr udvalg") return "hr";
  return "other";
}

function shouldShow(value) {
  return String(value || "").trim().toLowerCase() === "ja";
}

function rowToEvent(headers, row) {
  const item = {};
  headers.forEach((header, index) => {
    item[header.trim().toLowerCase()] = (row[index] || "").trim();
  });

  if (!item.aktivitet || !shouldShow(item.vis)) return null;

  const date = parseDate(item.dato);
  const monthName = String(item["måned"] || item.maned || "").trim().toLowerCase();
  const monthIndex = date ? date.getMonth() : monthLookup[monthName];
  const year = date ? date.getFullYear() : Number(item["år"] || item.aar || displayYear);

  if (monthIndex === undefined || Number.isNaN(year)) return null;

  return {
    year,
    monthIndex,
    date,
    title: item.aktivitet,
    category: item.kategori || "Andet",
    type: categoryType(item.kategori),
    description: item.beskrivelse || "",
    responsible: item.ansvarlig || item.ansvarshavende || ""
  };
}

function countForMonth(index) {
  return events.filter(e => e.year === displayYear && e.monthIndex === index).length;
}

function renderWheel() {
  wheel.querySelectorAll(".month").forEach(el => el.remove());

  months.forEach((name, i) => {
    const angle = i * 30;

    const btn = document.createElement("button");
    btn.className = "month";
    btn.type = "button";
    btn.setAttribute("aria-label", `${name}: ${countForMonth(i)} aktiviteter`);
    btn.dataset.month = i;

    btn.style.setProperty("--angle", `${angle}deg`);
    btn.style.setProperty("--counter-angle", `${-angle}deg`);
    btn.style.setProperty("--segment-color", segmentColors[i]);

    btn.innerHTML = `
      <span class="month-label">
        <strong>${name}</strong>
        <small>${countForMonth(i)} ${countForMonth(i) === 1 ? "aktivitet" : "aktiviteter"}</small>
      </span>
    `;

    btn.addEventListener("click", () => showMonth(i));
    wheel.appendChild(btn);
  });
}

function formatDate(date) {
  if (!date) return "Dato fastlægges";
  return date.toLocaleDateString("da-DK", {
    weekday: "long", day: "numeric", month: "long"
  });
}

function showMonth(index) {
  document.querySelectorAll(".month").forEach(el =>
    el.classList.toggle("active", Number(el.dataset.month) === index)
  );

  const monthEvents = events
    .filter(e => e.year === displayYear && e.monthIndex === index)
    .sort((a, b) => {
      if (a.date && b.date) return a.date - b.date;
      if (a.date) return -1;
      if (b.date) return 1;
      return a.title.localeCompare(b.title, "da");
    });

  monthTitle.textContent = months[index];
  eventCount.textContent = `${monthEvents.length} ${monthEvents.length === 1 ? "aktivitet" : "aktiviteter"}`;

  if (!monthEvents.length) {
    eventList.innerHTML = `<div class="empty">Ingen aktiviteter lagt ind endnu.</div>`;
    return;
  }

  eventList.innerHTML = monthEvents.map(e => `
    <article class="event ${e.type}">
      <div class="event-date">${escapeHtml(formatDate(e.date))} · ${escapeHtml(e.category)}</div>
      <div class="event-title">${escapeHtml(e.title)}</div>
      ${e.description ? `<div>${escapeHtml(e.description)}</div>` : ""}
      ${e.responsible ? `<div><strong>Ansvarshavende:</strong> ${escapeHtml(e.responsible)}</div>` : ""}
    </article>
  `).join("");
}

async function loadEvents() {
  eventList.innerHTML = `<div class="empty">Henter aktiviteter fra regnearket…</div>`;

  try {
    const response = await fetch(`${SHEET_CSV_URL}&_=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const csv = await response.text();
    const rows = parseCSV(csv);
    if (rows.length < 2) throw new Error("Arket indeholder ingen aktiviteter");

    const headers = rows[0];
    events = rows.slice(1)
      .map(row => rowToEvent(headers, row))
      .filter(Boolean);

    const years = [...new Set(events.map(e => e.year))].sort();
    if (years.length) displayYear = years[0];

    const centerYear = document.querySelector(".wheel-center strong");
    if (centerYear) centerYear.textContent = displayYear;

    const pageHeading = document.querySelector("h1");
    if (pageHeading) pageHeading.textContent = `Årshjul ${displayYear}`;

    document.title = `Årshjul ${displayYear} – Røde Kors Esbjerg`;

    renderWheel();

    const firstMonthWithEvents = months.findIndex((_, index) => countForMonth(index) > 0);
    showMonth(firstMonthWithEvents >= 0 ? firstMonthWithEvents : 0);
  } catch (error) {
    console.error(error);
    eventCount.textContent = "Fejl";
    eventList.innerHTML = `<div class="empty">Kunne ikke hente aktiviteter fra regnearket. Kontrollér at fanen stadig er udgivet som CSV.</div>`;
  }
}

loadEvents();
