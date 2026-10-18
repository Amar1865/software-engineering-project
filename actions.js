/* STEP 5: WHAT EACH FORM DOES
   5A  small helper functions
   5B  the database (saved in the browser)
   5C  one function per form. The name matches "action" in data.js. */

/* ---------- 5A. HELPERS ---------- */
function esc(text) {                       // makes typed text safe to show on the page
  return String(text == null ? "" : text).replace(/[&<>"']/g, function (c) {
    return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
  });
}
function inr(n) { return "Rs. " + Number(n || 0).toLocaleString("en-IN"); }
function today() { return new Date().toISOString().slice(0, 10); }
function ok(msg, html) { return { ok: true, msg: msg, html: html || "" }; }
function fail(msg) { return { ok: false, msg: msg, html: "" }; }

/* ---------- 5B. DATABASE ---------- */
const STEPS = ["Submitted", "Under Assessment", "Medical Review", "Approved", "Settled"];

const DB = {
  data: null,
  useServer: false,                         // true when server.py is running
  starter: function () {                    // sample data used the first time
    return {
      nextClaim: 1001, nextPre: 1,
      policies: [
        { id: "POL-1001", holder: "Holder 1", plan: "Family Floater",  sum: 500000, remaining: 300000, start: "2026-04-01", end: "2027-03-31", status: "Active" },
        { id: "POL-1042", holder: "Holder 2", plan: "Individual Plus", sum: 200000, remaining: 50000,  start: "2026-02-01", end: "2027-01-31", status: "Active" },
        { id: "POL-0877", holder: "Holder 1", plan: "Senior Care",     sum: 300000, remaining: 300000, start: "2024-01-01", end: "2025-12-31", status: "Expired" }
      ],
      claims: [], payments: [], preauths: [], users: []
    };
  },
  fromBrowser: function () {                // data kept in this browser (backup copy)
    try { return JSON.parse(localStorage.getItem("hicts_data")); } catch (e) { return null; }
  },
  load: function () {                       // ask the server first; if it is not running, use the browser copy
    const self = this;
    return fetch("/api/data")
      .then(function (r) { if (!r.ok) throw new Error("no server"); return r.json(); })
      .then(function (saved) {
        self.useServer = true;
        self.data = saved || self.fromBrowser() || self.starter();
        if (!saved) self.save();            // first run: store the starting data in the database
      })
      .catch(function () {
        self.useServer = false;
        self.data = self.fromBrowser() || self.starter();
      });
  },
  save: function () {                       // called after every change
    try { localStorage.setItem("hicts_data", JSON.stringify(this.data)); } catch (e) {}
    if (this.useServer) {
      fetch("/api/data", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(this.data) })
        .catch(function () { alert("Could not save to the server. Is server.py still running?"); });
    }
  }
};
DB.ready = DB.load();                       // other files wait for this before drawing the page

function findClaim(id) {
  const wanted = String(id).trim().toUpperCase();
  return DB.data.claims.find(function (c) { return c.id === wanted; });
}
function findPolicy(id) {
  const wanted = String(id).trim().toUpperCase();
  return DB.data.policies.find(function (p) { return p.id === wanted; });
}
function addLog(claim, status, note) {      // changes the status and records who/when/why
  claim.status = status;
  claim.log.push({ status: status, note: note, on: new Date().toLocaleString("en-IN") });
}
function timelineHTML(c) {                  // the progress line shown by "Track Claim Status"
  let index = STEPS.indexOf(c.status), extra = "";
  if (c.status === "Query Raised") { index = 0; extra = " hold"; }
  if (c.status === "Rejected") {
    const before = c.log.filter(function (l) { return STEPS.indexOf(l.status) >= 0; }).pop();
    index = before ? STEPS.indexOf(before.status) : 0; extra = " stop";
  }
  const steps = STEPS.map(function (s, i) {
    const cls = i < index ? "done" : (i === index ? "done current" + extra : "");
    return '<li class="' + cls + '">' + s + "</li>";
  }).join("");
  const history = c.log.map(function (l) {
    return "<li>" + esc(l.status) + " - " + esc(l.note) + " (" + esc(l.on) + ")</li>";
  }).join("");
  return '<ol class="timeline">' + steps + "</ol><ul>" + history + "</ul>";
}

/* ---------- 5C. THE FORM ACTIONS ---------- */
const ACTIONS = {

  /* Policyholder + Hospital: Submit Claim (flowchart: policy valid? / duplicate check) */
  submitClaim: function (v) {
    const policy = findPolicy(v.policy);
    if (!policy) return fail("Policy number not found. Try POL-1001.");
    if (v.discharge < v.admit) return fail("Discharge date cannot be before the admission date.");
    const duplicate = DB.data.claims.some(function (c) {
      return c.policy === policy.id && c.hospital === v.hospital && c.admit === v.admit && c.discharge === v.discharge;
    });
    const claim = { id: "CLM-" + (DB.data.nextClaim++), policy: policy.id, hospital: v.hospital, diagnosis: v.diagnosis,
                    admit: v.admit, discharge: v.discharge, claimed: Number(v.claimed), paid: 0, dup: duplicate, docs: [], log: [] };
    DB.data.claims.push(claim);
    addLog(claim, "Submitted", "Claim registered");
    if (policy.status !== "Active" || policy.end < today()) {
      addLog(claim, "Rejected", "Policy is not active (auto-rejected)");
      DB.save();
      return fail("Claim " + claim.id + " was rejected automatically because the policy is not active.");
    }
    DB.save();
    return ok("Claim " + claim.id + " submitted." + (duplicate ? " It is flagged as a possible duplicate." : ""));
  },

  uploadDocs: function (v) {
    const claim = findClaim(v.claimId);
    if (!claim) return fail("Claim ID not found.");
    claim.docs.push({ type: v.docType, file: v.file });
    addLog(claim, claim.status, "Document uploaded: " + v.docType + " (" + v.file + ")");
    DB.save();
    return ok(v.docType + " uploaded for " + claim.id + ".");
  },

  trackStatus: function (v) {
    const claim = findClaim(v.claimId);
    if (!claim) return fail("Claim ID not found.");
    return ok("Current status of " + claim.id + ": " + claim.status, timelineHTML(claim));
  },

  respondQuery: function (v) {
    const claim = findClaim(v.claimId);
    if (!claim) return fail("Claim ID not found.");
    if (claim.status !== "Query Raised") return fail("This claim has no open query.");
    addLog(claim, "Submitted", "Policyholder response: " + v.response);
    DB.save();
    return ok("Response sent. " + claim.id + " is back with the claims officer.");
  },

  /* Hospital coordinator */
  preAuth: function (v) {
    if (!findPolicy(v.policy)) return fail("Policy number not found. Try POL-1001.");
    const id = "PA-" + (DB.data.nextPre++);
    DB.data.preauths.push({ id: id, policy: v.policy.trim().toUpperCase(), hospital: v.hospital, treatment: v.treatment, estimate: Number(v.estimate) });
    DB.save();
    return ok("Pre-authorization request " + id + " recorded.");
  },

  confirmTreatment: function (v) {
    const claim = findClaim(v.claimId);
    if (!claim) return fail("Claim ID not found.");
    addLog(claim, claim.status, "Treatment confirmed by hospital: " + v.treatment);
    DB.save();
    return ok("Treatment details saved for " + claim.id + ".");
  },

  uploadBill: function (v) {
    return ACTIONS.uploadDocs({ claimId: v.claimId, docType: "Hospital bill", file: v.file });
  },

  /* Claims officer */
  verifyDocs: function (v) {
    const claim = findClaim(v.claimId);
    if (!claim) return fail("Claim ID not found.");
    if (claim.status !== "Submitted") return fail("Only claims with status Submitted can be verified. This claim is: " + claim.status + ".");
    if (v.complete === "Yes") {
      addLog(claim, "Under Assessment", "Documents verified");
      DB.save();
      return ok(claim.id + " moved to Under Assessment. It is ready for medical review.");
    }
    addLog(claim, "Query Raised", "Documents incomplete. " + (v.remarks || ""));
    DB.save();
    return ok("Query raised on " + claim.id + ": the policyholder must send the missing documents.");
  },

  raiseQuery: function (v) {
    const claim = findClaim(v.claimId);
    if (!claim) return fail("Claim ID not found.");
    if (claim.status !== "Submitted" && claim.status !== "Under Assessment") return fail("A query cannot be raised when the status is " + claim.status + ".");
    addLog(claim, "Query Raised", v.query);
    DB.save();
    return ok("Query raised on " + claim.id + ".");
  },

  decide: function (v) {
    const claim = findClaim(v.claimId);
    if (!claim) return fail("Claim ID not found.");
    if (claim.status !== "Medical Review") return fail("The medical reviewer must review this claim first. Current status: " + claim.status + ".");
    if (v.decision === "Approve") {
      addLog(claim, "Approved", v.reason || "Approved after medical review");
      DB.save();
      return ok(claim.id + " approved. It is now with the finance officer.");
    }
    if (!v.reason) return fail("Give a reason when rejecting a claim.");
    addLog(claim, "Rejected", v.reason);
    DB.save();
    return ok(claim.id + " rejected.");
  },

  /* Medical reviewer */
  medicalReview: function (v) {
    const claim = findClaim(v.claimId);
    if (!claim) return fail("Claim ID not found.");
    if (claim.status !== "Under Assessment") return fail("The claims officer must verify the documents first. Current status: " + claim.status + ".");
    const advice = v.necessary === "Yes" ? "approve" : "reject";
    addLog(claim, "Medical Review", "Recommendation: " + advice + ". " + v.remarks);
    DB.save();
    return ok("Review saved. Recommendation for " + claim.id + ": " + advice + ".");
  },

  fraudCheck: function (v) {
    const claim = findClaim(v.claimId);
    if (!claim) return fail("Claim ID not found.");
    const same = DB.data.claims.filter(function (c) {
      return c.id !== claim.id && c.policy === claim.policy && c.hospital === claim.hospital && c.admit === claim.admit && c.discharge === claim.discharge;
    });
    claim.dup = same.length > 0;
    DB.save();
    if (same.length === 0) return ok("No duplicate found for " + claim.id + ".");
    return ok("Possible duplicate: " + claim.id + " matches " + same.map(function (c) { return c.id; }).join(", ") + " (same policy, hospital and dates).");
  },

  /* Finance officer: Settlement = MIN[(Claimed - Non-payable - Deductible) x (1 - Co-pay%), Remaining sum insured] */
  calcSettlement: function (v) {
    const afterDeductible = Number(v.claimed) - Number(v.nonPayable) - Number(v.deductible);
    const copay = afterDeductible * Number(v.copay) / 100;
    const beforeLimit = Math.max(0, afterDeductible - copay);
    const finalAmount = Math.min(beforeLimit, Number(v.remaining));
    const rows = [["Claimed amount", v.claimed], ["Less: non-payable items", v.nonPayable], ["Less: deductible", v.deductible],
                  ["Amount after deductible", afterDeductible], ["Less: co-pay " + v.copay + "%", copay],
                  ["Payable before limit check", beforeLimit], ["Remaining sum insured", v.remaining]];
    const table = "<table>" + rows.map(function (r) { return "<tr><td>" + r[0] + "</td><td>" + inr(r[1]) + "</td></tr>"; }).join("") + "</table>";
    const note = beforeLimit > Number(v.remaining) ? " (capped at the remaining sum insured)" : "";
    return ok("Final settlement: " + inr(finalAmount) + note, table);
  },

  processPayment: function (v) {
    const claim = findClaim(v.claimId);
    if (!claim) return fail("Claim ID not found.");
    if (claim.status !== "Approved") return fail("Only approved claims can be paid. Current status: " + claim.status + ".");
    const policy = findPolicy(claim.policy);
    const amount = Number(v.amount);
    if (amount <= 0) return fail("Enter an amount greater than zero.");
    if (amount > policy.remaining) return fail("Amount is more than the remaining sum insured (" + inr(policy.remaining) + ").");
    DB.data.payments.push({ claimId: claim.id, amount: amount, mode: v.mode, txn: v.txn, paidOn: new Date().toLocaleString("en-IN") });
    claim.paid = amount;
    policy.remaining -= amount;
    addLog(claim, "Settled", "Paid " + inr(amount) + " by " + v.mode + ", reference " + v.txn);
    DB.save();
    return ok("Payment of " + inr(amount) + " recorded. " + claim.id + " is now Settled.");
  },

  /* Administrator */
  addUser: function (v) {
    const name = v.username.trim();
    if (DB.data.users.some(function (u) { return u.username === name; })) return fail("That username already exists.");
    DB.data.users.push({ username: name, role: v.role, status: "Active" });
    DB.save();
    return ok("User " + name + " added as " + v.role + ".");
  },

  addPolicy: function (v) {
    const id = v.id.trim().toUpperCase();
    if (findPolicy(id)) return fail("That policy number already exists.");
    if (v.end < v.start) return fail("End date cannot be before the start date.");
    DB.data.policies.push({ id: id, holder: v.holder, plan: v.plan, sum: Number(v.sum), remaining: Number(v.sum), start: v.start, end: v.end,
                            status: v.end < today() ? "Expired" : "Active" });
    DB.save();
    return ok("Policy " + id + " added.");
  }
};