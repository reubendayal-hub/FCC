// Excel export for /handbook-review/admin.
import ExcelJS from "exceljs";

const NAVY = "FF1B2A5C";
const GOLD = "FFD4A217";
const VERDICT_LABEL = { agree: "Agree", changes: "Agree with changes", disagree: "Disagree" };
const iso = (ms) => (ms ? new Date(ms) : null);

function addSheet(wb, name, columns, rows) {
  const ws = wb.addWorksheet(name, { views: [{ state: "frozen", ySplit: 1 }] });
  ws.columns = columns;
  ws.addRows(rows);
  const head = ws.getRow(1);
  head.font = { bold: true, color: { argb: "FFFFFFFF" } };
  head.fill = { type: "pattern", pattern: "solid", fgColor: { argb: NAVY } };
  head.border = { bottom: { style: "medium", color: { argb: GOLD } } };
  ws.eachRow((row, i) => { if (i > 1) row.alignment = { vertical: "top", wrapText: true }; });
  return ws;
}

export async function buildWorkbook(summary) {
  const wb = new ExcelJS.Workbook();
  wb.creator = "FCC Handbook Review";
  wb.created = new Date(summary.generatedAt);
  const { kpis, config } = summary;

  addSheet(wb, "Summary", [
    { header: "Metric", key: "k", width: 28 },
    { header: "Value", key: "v", width: 36 },
  ], [
    { k: "Generated", v: new Date(summary.generatedAt).toISOString() },
    { k: "Handbook version", v: config.version },
    { k: "Review open", v: config.open ? "Yes" : "No" },
    { k: "Deadline", v: config.deadlineISO },
    { k: "Started", v: kpis.started },
    { k: "Completed (13/13)", v: kpis.completed },
    { k: "Completion %", v: kpis.completionPct },
    { k: "Days left", v: kpis.daysLeft },
  ]);

  addSheet(wb, "Per-part", [
    { header: "Part", key: "part", width: 6 },
    { header: "Title", key: "title", width: 30 },
    { header: "Agree", key: "agree", width: 10 },
    { header: "Agree with changes", key: "changes", width: 20 },
    { header: "Disagree", key: "disagree", width: 10 },
    { header: "Not yet", key: "notYet", width: 10 },
  ], summary.perPart);

  addSheet(wb, "Comments", [
    { header: "Part", key: "part", width: 6 },
    { header: "Verdict", key: "verdict", width: 20 },
    { header: "Name", key: "name", width: 24 },
    { header: "Role group", key: "roleGroup", width: 14 },
    { header: "What would you change?", key: "change", width: 50 },
    { header: "What's not OK?", key: "notOk", width: 50 },
    { header: "What would make it work?", key: "fix", width: 50 },
    { header: "Updated", key: "updatedAt", width: 20 },
  ], summary.comments.map((c) => ({ ...c, verdict: VERDICT_LABEL[c.verdict], updatedAt: iso(c.updatedAt) })));

  const volRows = [];
  for (const v of summary.volunteers) for (const p of v.people) volRows.push({ group: v.group, role: v.label, ...p });
  addSheet(wb, "Volunteers", [
    { header: "Group", key: "group", width: 12 },
    { header: "Role / committee", key: "role", width: 26 },
    { header: "Name", key: "name", width: 24 },
    { header: "Email", key: "email", width: 30 },
    { header: "Role group", key: "roleGroup", width: 14 },
  ], volRows);

  addSheet(wb, "Anything missed", [
    { header: "Name", key: "name", width: 24 },
    { header: "Role group", key: "roleGroup", width: 14 },
    { header: "Text", key: "text", width: 80 },
    { header: "Updated", key: "updatedAt", width: 20 },
  ], summary.missed.map((m) => ({ ...m, updatedAt: iso(m.updatedAt) })));

  addSheet(wb, "Respondents", [
    { header: "Name", key: "name", width: 24 },
    { header: "Email", key: "email", width: 30 },
    { header: "Role group", key: "roleGroup", width: 14 },
    { header: "Parts reviewed", key: "doneCount", width: 14 },
    { header: "Drafts", key: "draftCount", width: 8 },
    { header: "Completed", key: "completedAt", width: 20 },
    { header: "Started", key: "createdAt", width: 20 },
    { header: "Last activity", key: "lastActivity", width: 20 },
    { header: "Device", key: "userAgentHint", width: 10 },
  ], summary.respondents.map((r) => ({
    ...r, completedAt: iso(r.completedAt), createdAt: iso(r.createdAt), lastActivity: iso(r.lastActivity),
  })));

  return wb.xlsx.writeBuffer();
}
