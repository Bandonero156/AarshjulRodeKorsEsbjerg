const months = [
  "Januar","Februar","Marts","April","Maj","Juni",
  "Juli","August","September","Oktober","November","December"
];

const events = [
  // HR-udvalg
  { date:"2027-01-15", title:"HR-udvalgsmøde", type:"hr" },
  { date:"2027-03-15", title:"HR-udvalgsmøde", type:"hr" },
  { date:"2027-05-15", title:"HR-udvalgsmøde", type:"hr" },
  { date:"2027-07-15", title:"HR-udvalgsmøde", type:"hr" },
  { date:"2027-09-15", title:"HR-udvalgsmøde", type:"hr" },
  { date:"2027-11-15", title:"HR-udvalgsmøde", type:"hr" },

  // Udvalgsmøder
  { date:"2027-02-02", title:"Udvalgsmøde", type:"committee" },
  { date:"2027-05-25", title:"Udvalgsmøde", type:"committee" },
  { date:"2027-08-31", title:"Udvalgsmøde", type:"committee" },
  { date:"2027-12-07", title:"Udvalgsmøde", type:"committee" },

  // Mødeaftner forår
  { date:"2027-02-04", title:"Mødeaften", type:"meeting" },
  { date:"2027-02-18", title:"Mødeaften", type:"meeting" },
  { date:"2027-03-04", title:"Mødeaften", type:"meeting" },
  { date:"2027-03-18", title:"Mødeaften", type:"meeting" },
  { date:"2027-04-01", title:"Mødeaften", type:"meeting" },
  { date:"2027-04-15", title:"Mødeaften", type:"meeting" },
  { date:"2027-04-29", title:"Mødeaften", type:"meeting" },
  { date:"2027-05-13", title:"Mødeaften", type:"meeting" },
  { date:"2027-05-27", title:"Mødeaften", type:"meeting" },
  { date:"2027-06-10", title:"Mødeaften", type:"meeting" },

  // Mødeaftner efterår
  { date:"2027-08-19", title:"Mødeaften", type:"meeting" },
  { date:"2027-09-02", title:"Mødeaften", type:"meeting" },
  { date:"2027-09-16", title:"Mødeaften", type:"meeting" },
  { date:"2027-09-30", title:"Mødeaften", type:"meeting" },
  { date:"2027-10-14", title:"Mødeaften", type:"meeting" },
  { date:"2027-10-28", title:"Mødeaften", type:"meeting" },
  { date:"2027-11-11", title:"Mødeaften", type:"meeting" },
  { date:"2027-11-25", title:"Mødeaften", type:"meeting" },
  { date:"2027-12-09", title:"Mødeaften", type:"meeting" }
];

const wheel = document.getElementById("wheel");
const monthTitle = document.getElementById("monthTitle");
const eventList = document.getElementById("eventList");
const eventCount = document.getElementById("eventCount");

function countForMonth(index) {
  return events.filter(e => new Date(e.date + "T12:00:00").getMonth() === index).length;
}

months.forEach((name, i) => {
  const angle = (i / 12) * Math.PI * 2 - Math.PI / 2;
  const radius = 41;
  const x = 50 + Math.cos(angle) * radius;
  const y = 50 + Math.sin(angle) * radius;

  const btn = document.createElement("button");
  btn.className = "month";
  btn.style.left = `${x}%`;
  btn.style.top = `${y}%`;
  btn.dataset.month = i;
  btn.innerHTML = `<strong>${name}</strong><small>${countForMonth(i)} aktiviteter</small>`;
  btn.addEventListener("click", () => showMonth(i));
  wheel.appendChild(btn);
});

function formatDate(dateString) {
  const d = new Date(dateString + "T12:00:00");
  return d.toLocaleDateString("da-DK", {
    weekday: "long", day: "numeric", month: "long"
  });
}

function showMonth(index) {
  document.querySelectorAll(".month").forEach(el =>
    el.classList.toggle("active", Number(el.dataset.month) === index)
  );

  const monthEvents = events
    .filter(e => new Date(e.date + "T12:00:00").getMonth() === index)
    .sort((a,b) => a.date.localeCompare(b.date));

  monthTitle.textContent = months[index];
  eventCount.textContent = `${monthEvents.length} ${monthEvents.length === 1 ? "aktivitet" : "aktiviteter"}`;

  if (!monthEvents.length) {
    eventList.innerHTML = `<div class="empty">Ingen aktiviteter lagt ind endnu.</div>`;
    return;
  }

  eventList.innerHTML = monthEvents.map(e => `
    <article class="event ${e.type}">
      <div class="event-date">${formatDate(e.date)}</div>
      <div class="event-title">${e.title}</div>
    </article>
  `).join("");
}

showMonth(0);
