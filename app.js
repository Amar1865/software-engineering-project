/* STEP 2 and 3: NAVIGATION BAR + SHOWING THE SELECTED CATEGORY */

/* Not logged in? Go back to the login page. */
function checkLogin() {
  if (sessionStorage.getItem("loggedIn") !== "yes") location.replace("index.html");
}
checkLogin();
window.addEventListener("pageshow", checkLogin);   // also when the Back button restores an old page

const navbar = document.getElementById("navbar");
const content = document.getElementById("content");
let current = CATEGORIES[0];                        // the category on screen

/* ---------- STEP 2: navigation bar ---------- */
function drawNavbar() {
  let html = '<span class="brand">HICTS</span>';
  CATEGORIES.forEach(function (cat) {
    html += '<a href="#' + cat.id + '"' + (cat.id === current.id ? ' class="active"' : "") + ">" + cat.name + "</a>";
  });
  html += '<span class="spacer"></span><button id="logout">Log out</button>';
  navbar.innerHTML = html;
  document.getElementById("logout").onclick = function () {
    sessionStorage.removeItem("loggedIn");
    location.replace("index.html");
  };
}

/* ---------- STEP 3: show one category ---------- */
function showCategory() {                           // runs whenever the # part of the address changes
  const id = location.hash.slice(1);
  current = CATEGORIES.find(function (c) { return c.id === id; }) || CATEGORIES[0];
  drawNavbar();
    content.innerHTML = "<h1>" + current.name + "</h1>" + current.sections.map(sectionHTML).join("");
    
}

function sectionHTML(sec, i) {
  if (sec.type === "form") {
    return '<section class="card"><h2>' + sec.title + '</h2><form data-i="' + i + '"><div class="form-grid">' +
           sec.fields.map(fieldHTML).join("") + '</div><button class="btn" type="submit">' + (sec.button || "Submit") +
           '</button></form><div class="result"></div></section>';
  }
  if (sec.type === "table") {
    return '<section class="card"><h2>' + sec.title + '</h2><div data-table="' + i + '">' + tableHTML(sec) + "</div></section>";
  }
  return '<section class="card"><h2>' + sec.title + '</h2><div data-report="1">' + reportHTML() + "</div></section>";
}

function fieldHTML(f) {
  const req = f.optional ? "" : " required";
  const ph = f.placeholder ? ' placeholder="' + f.placeholder + '"' : "";
  let input;
  if (f.type === "select") {
    input = '<select name="' + f.name + '"' + req + ">" + f.options.map(function (o) { return "<option>" + o + "</option>"; }).join("") + "</select>";
  } else if (f.type === "textarea") {
    input = '<textarea name="' + f.name + '" rows="3"' + req + ph + "></textarea>";
  } else if (f.type === "file") {
    input = '<input type="file" name="' + f.name + '" accept=".pdf,.jpg,.jpeg"' + req + ">";
  } else {
    input = '<input type="' + f.type + '" name="' + f.name + '"' + (f.type === "number" ? ' min="0"' : "") + req + ph + ">";
  }
  return "<label>" + f.label + input + "</label>";
}

function tableHTML(sec) {
  let rows = DB.data[sec.source];
  if (sec.filter) rows = rows.filter(function (r) { return r.status === sec.filter; });
  if (rows.length === 0) return '<p class="hint">No records yet.</p>';
  const head = sec.columns.map(function (c) { return "<th>" + c[1] + "</th>"; }).join("");
  const body = rows.map(function (r) {
    return "<tr>" + sec.columns.map(function (c) {
      const value = c[2] === "money" ? inr(r[c[0]]) : esc(r[c[0]]);
      return "<td>" + (c[0] === "status" ? '<span class="chip">' + value + "</span>" : value) + "</td>";
    }).join("") + "</tr>";
  }).join("");
  return "<table><tr>" + head + "</tr>" + body + "</table>";
}

function reportHTML() {
  const claims = DB.data.claims;
  const count = function (s) { return claims.filter(function (c) { return c.status === s; }).length; };
  const paid = claims.reduce(function (sum, c) { return sum + c.paid; }, 0);
  const rows = [["Total claims", claims.length], ["Submitted", count("Submitted")], ["Under Assessment", count("Under Assessment")],
                ["Query Raised", count("Query Raised")], ["Medical Review", count("Medical Review")], ["Approved", count("Approved")],
                ["Settled", count("Settled")], ["Rejected", count("Rejected")], ["Total paid", inr(paid)]];
  return "<table>" + rows.map(function (r) { return "<tr><td>" + r[0] + "</td><td>" + r[1] + "</td></tr>"; }).join("") + "</table>";
}

function refreshTables() {                          // update the tables after a form is saved
  content.querySelectorAll("[data-table]").forEach(function (el) { el.innerHTML = tableHTML(current.sections[el.dataset.table]); });
  content.querySelectorAll("[data-report]").forEach(function (el) { el.innerHTML = reportHTML(); });
}

function showResult(box, result) {
  box.className = "result " + (result.ok ? "ok" : "error");
  box.innerHTML = "<p>" + esc(result.msg) + "</p>" + result.html;
}

/* ---------- when any form is submitted ---------- */
content.addEventListener("submit", function (e) {
  e.preventDefault();
  const form = e.target;
  const sec = current.sections[form.dataset.i];
  const box = form.parentElement.querySelector(".result");
  const values = {};

  for (let k = 0; k < sec.fields.length; k++) {
    const f = sec.fields[k], el = form.elements[f.name];
    if (f.type === "file") {
      const file = el.files[0];
      if (file && (!/\.(pdf|jpe?g)$/i.test(file.name) || file.size > 2 * 1024 * 1024)) {
        showResult(box, fail("Only PDF or JPG files up to 2 MB are accepted."));
        return;
      }
      values[f.name] = file ? file.name : "";
    } else {
      values[f.name] = el.value;
    }
  }

  const result = ACTIONS[sec.action](values);       // do the work (see actions.js)
  showResult(box, result);
  if (result.ok && !sec.keep) form.reset();
  refreshTables();
});

DB.ready.then(function () {                           // wait until the saved data has been loaded
  window.addEventListener("hashchange", showCategory); // Back / Forward buttons work through this
  showCategory();
});