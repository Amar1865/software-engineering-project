/* STEP 3: WHAT EACH CATEGORY SHOWS
   This is the file you will change most.
   - To add a menu item: add one block to CATEGORIES.
   - To add a form field: add one line to that form's "fields".
   - To change a drop-down list: edit the lists just below. */

const HOSPITALS = ["Sunrise Hospital", "City Care Clinic", "Lakeview Medical"];
const DOC_TYPES = ["Hospital bill", "Discharge summary", "Diagnosis report", "ID proof"];
const PAY_MODES = ["NEFT", "UPI", "Cheque"];
const ROLE_NAMES = ["Policyholder", "Hospital coordinator", "Claims officer", "Medical reviewer", "Finance officer", "Administrator"];

/* Field types: text, number, date, select (with options), textarea, file.
   Every field is required unless you add  optional: true  */
const CLAIM_ID = { name: "claimId", label: "Claim ID", type: "text", placeholder: "e.g. CLM-1001" };

/* A section used by two categories, written once */
const SUBMIT_CLAIM = {
  type: "form", title: "Submit Claim", action: "submitClaim", button: "Submit claim",
  fields: [
    { name: "policy",    label: "Policy number", type: "text", placeholder: "e.g. POL-1001" },
    { name: "hospital",  label: "Hospital", type: "select", options: HOSPITALS },
    { name: "diagnosis", label: "Diagnosis", type: "text" },
    { name: "admit",     label: "Admission date", type: "date" },
    { name: "discharge", label: "Discharge date", type: "date" },
    { name: "claimed",   label: "Claimed amount (Rs.)", type: "number" }
  ]
};

/* Columns for tables: [field name, heading] (add "money" as a third item to show Rs.) */
const CLAIM_COLUMNS = [["id", "Claim"], ["policy", "Policy"], ["hospital", "Hospital"], ["claimed", "Claimed", "money"], ["paid", "Paid", "money"], ["status", "Status"]];

const CATEGORIES = [

  /* ---------- 1. POLICYHOLDER ---------- */
  { id: "policyholder", name: "Policyholder", sections: [
    SUBMIT_CLAIM,
    { type: "form", title: "Upload Documents", action: "uploadDocs", button: "Upload",
      fields: [CLAIM_ID,
        { name: "docType", label: "Document type", type: "select", options: DOC_TYPES },
        { name: "file", label: "File (PDF or JPG, up to 2 MB)", type: "file" }] },
    { type: "form", title: "Track Claim Status", action: "trackStatus", button: "Track", keep: true,
      fields: [CLAIM_ID] },
    { type: "form", title: "Respond to Query", action: "respondQuery", button: "Send response",
      fields: [CLAIM_ID, { name: "response", label: "Your response", type: "textarea" }] },
    { type: "table", title: "My Claims, Settlement and Payment", source: "claims", columns: CLAIM_COLUMNS }
  ]},

  /* ---------- 2. HOSPITAL COORDINATOR ---------- */
  { id: "hospital", name: "Hospital coordinator", sections: [
    { type: "form", title: "Request Pre-authorization", action: "preAuth", button: "Send request",
      fields: [
        { name: "policy",    label: "Policy number", type: "text", placeholder: "e.g. POL-1001" },
        { name: "hospital",  label: "Hospital", type: "select", options: HOSPITALS },
        { name: "treatment", label: "Planned treatment", type: "text" },
        { name: "estimate",  label: "Estimated cost (Rs.)", type: "number" }] },
    { type: "table", title: "Pre-authorization Requests", source: "preauths",
      columns: [["id", "Request"], ["policy", "Policy"], ["hospital", "Hospital"], ["treatment", "Treatment"], ["estimate", "Estimate", "money"]] },
    SUBMIT_CLAIM,
    { type: "form", title: "Confirm Treatment Details", action: "confirmTreatment", button: "Confirm",
      fields: [CLAIM_ID, { name: "treatment", label: "Treatment given", type: "textarea" }] },
    { type: "form", title: "Upload Hospital Bills", action: "uploadBill", button: "Upload bill",
      fields: [CLAIM_ID, { name: "file", label: "Bill (PDF or JPG, up to 2 MB)", type: "file" }] }
  ]},

  /* ---------- 3. CLAIMS OFFICER ---------- */
  { id: "officer", name: "Claims officer", sections: [
    { type: "form", title: "Verify Documents", action: "verifyDocs", button: "Save verification",
      fields: [CLAIM_ID,
        { name: "complete", label: "Documents complete?", type: "select", options: ["Yes", "No"] },
        { name: "remarks", label: "Remarks (what is missing)", type: "text", optional: true }] },
    { type: "form", title: "Raise Query", action: "raiseQuery", button: "Raise query",
      fields: [CLAIM_ID, { name: "query", label: "What do you need from the policyholder?", type: "textarea" }] },
    { type: "form", title: "Approve / Reject Claim", action: "decide", button: "Save decision",
      fields: [CLAIM_ID,
        { name: "decision", label: "Decision", type: "select", options: ["Approve", "Reject"] },
        { name: "reason", label: "Reason (required for Reject)", type: "text", optional: true }] },
    { type: "table", title: "All Claims", source: "claims", columns: CLAIM_COLUMNS },
    { type: "report", title: "Claim Report" }
  ]},

  /* ---------- 4. MEDICAL REVIEWER ---------- */
  { id: "reviewer", name: "Medical reviewer", sections: [
    { type: "form", title: "Review Medical Necessity", action: "medicalReview", button: "Save review",
      fields: [CLAIM_ID,
        { name: "necessary", label: "Treatment medically necessary?", type: "select", options: ["Yes", "No"] },
        { name: "remarks", label: "Medical remarks", type: "textarea" }] },
    { type: "form", title: "Fraud / Duplicate Check", action: "fraudCheck", button: "Check", keep: true,
      fields: [CLAIM_ID] },
    { type: "table", title: "Claims", source: "claims", columns: CLAIM_COLUMNS }
  ]},

  /* ---------- 5. FINANCE OFFICER ---------- */
  { id: "finance", name: "Finance officer", sections: [
    { type: "form", title: "Calculate Settlement", action: "calcSettlement", button: "Calculate", keep: true,
      fields: [
        { name: "claimed",    label: "Claimed amount (Rs.)", type: "number" },
        { name: "nonPayable", label: "Non-payable items (Rs.)", type: "number" },
        { name: "deductible", label: "Deductible (Rs.)", type: "number" },
        { name: "copay",      label: "Co-pay (%)", type: "number" },
        { name: "remaining",  label: "Remaining sum insured (Rs.)", type: "number" }] },
    { type: "table", title: "Approved Claims Waiting for Payment", source: "claims", filter: "Approved", columns: CLAIM_COLUMNS },
    { type: "form", title: "Process Payment", action: "processPayment", button: "Release payment",
      fields: [CLAIM_ID,
        { name: "amount", label: "Amount to pay (Rs.)", type: "number" },
        { name: "mode", label: "Payment mode", type: "select", options: PAY_MODES },
        { name: "txn", label: "Transaction reference", type: "text" }] },
    { type: "table", title: "Payment Records", source: "payments",
      columns: [["claimId", "Claim"], ["amount", "Amount", "money"], ["mode", "Mode"], ["txn", "Reference"], ["paidOn", "Paid on"]] }
  ]},

  /* ---------- 6. ADMINISTRATOR ---------- */
  { id: "admin", name: "Administrator", sections: [
    { type: "form", title: "Manage Users and Roles", action: "addUser", button: "Add user",
      fields: [{ name: "username", label: "Username", type: "text" },
               { name: "role", label: "Role", type: "select", options: ROLE_NAMES }] },
    { type: "table", title: "Users", source: "users", columns: [["username", "Username"], ["role", "Role"], ["status", "Status"]] },
    { type: "form", title: "Manage Policies and Plans", action: "addPolicy", button: "Add policy",
      fields: [
        { name: "id",     label: "Policy number", type: "text" },
        { name: "holder", label: "Policyholder", type: "text" },
        { name: "plan",   label: "Plan name", type: "text" },
        { name: "sum",    label: "Sum insured (Rs.)", type: "number" },
        { name: "start",  label: "Start date", type: "date" },
        { name: "end",    label: "End date", type: "date" }] },
    { type: "table", title: "Policies", source: "policies",
      columns: [["id", "Policy"], ["holder", "Holder"], ["plan", "Plan"], ["sum", "Sum insured", "money"], ["remaining", "Remaining", "money"], ["end", "Valid until"], ["status", "Status"]] },
    { type: "report", title: "System Report" }
  ]}
];