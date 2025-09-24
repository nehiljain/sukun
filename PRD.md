## Proposed Primary Personas (v1)

### Persona 1 — **Account Executive (AE) / Sales IC**

* **Context:** Google Workspace Gmail; 80–150 inbound/day; multiple prospect threads; frequent calendar changes.
* **Pain:** Misses time-sensitive buyer emails; noisy newsletters; anxiety about losing a hot lead; context switching.
* **Definition of “important”:** Human buyer replies, scheduling changes, security/billing from prospects or tools tied to deals, VIP domains.
* **Success signals:** 0 critical misses/week; scans brief in <60s twice daily; spends <30 min/day in inbox.

### Persona 2 — **Middle Manager (Ops/Product/Sales Manager)**

* **Context:** 100–200 inbound/day; staff + exec chain; approvals, alerts, meeting churn.
* **Pain:** Missing escalation/approval asks; overwhelmed by reports/newsletters; meeting updates slip.
* **Definition of “important”:** Team/executive emails needing a reply, time-sensitive approvals, compliance/finance alerts, calendar updates.
* **Success signals:** No missed approvals/escalations; twice-daily brief becomes the default workflow; restores anything misfiled in 1 click.

---

## First-Pass User Stories (v1)

### A. Never Miss Important (Screening & Fail-safes)

1. **As a Sales IC**, I want **all important emails** routed to my inbox with an **“Important” chip** so I don’t miss human, time-sensitive, VIP, transactional, or calendar changes.

   * **Acceptance:** ≥95% precision; ≥90% recall. Low-confidence cases labeled “Important (low confidence)”.
2. **As a Manager**, if Sukun is **unsure**, I want those messages **flagged low-confidence** in inbox **and** queued in the next brief for confirmation so I can quickly teach/confirm.
3. **As any user**, I can **undo** any auto-action (archive/categorize) in **one click** and fully restore the original message state.

### B. Briefs (Twice Daily at 9am & 4pm local)

4. **As any user**, I receive a **beautiful, categorized brief** at **9:00 AM** and **4:00 PM**, summarizing **all non-important** items (newsletters, promos, updates) with skim-able bullets and a “show more” link.

   * **Acceptance:** No real-time pings between briefs; urgent items are already caught by “Important” routing.
5. **As any user**, I can **confirm/deny** category suggestions inside the brief (“teach one, apply many”) so Sukun improves with minimal effort.
6. **As any user**, the brief shows an **X% handled today** indicator (target ≥80%) with counts by category.

### C. Personalization & Teaching

7. **As any user**, onboarding is **mostly automatic** (model infers VIPs, common categories, domains) and only asks me to confirm when confidence is low.
8. **As any user**, when I mark an email as **Important/Not Important**, Sukun offers a **one-click rule** (“Always inbox when similar”) and explains its reasoning at a glance.
9. **As any user**, I can declare simple **rules** (VIPs, always-show/never-show domains, categories like Payments/Recruiting) without touching filters.

### D. Draft Replies (Scoped to non-auto by default)

10. **As a Sales IC**, I can **generate a draft** in my voice on demand from any important thread, then edit/send in Gmail.

    * **Acceptance:** Drafting is **not auto-triggered** by default; available via command or button. (Pending your confirmation on behavior.)
11. **As any user**, drafts respect my **tone** (short/neutral/friendly) and **signature**; they **never auto-send**.

### E. Cost & Performance Guardrails

12. **As the business**, Sukun **queues non-urgent summarization** to brief windows and **degrades to cheaper models** near budget caps to hold **≤\$2/user/month** without hurting “Never miss important”.
13. **As any user**, classification happens quickly enough that **important** emails **hit inbox within 30 seconds** of receipt (goal), while bulk summarization can lag to the next brief.

### F. Privacy Baseline

14. **As any user**, my data is **encrypted in transit and at rest**, raw content is **cached briefly**, and **no humans** access content without my explicit consent in support flows.
15. **As any user**, I can **export and delete** my data (basic GDPR-like controls), even if we’re not pursuing certifications yet.

### G. Metrics & Definitions

16. **As the team**, DAU counts a user as active if they **open a brief OR review ≥1 decision** in Sukun that day.
17. **As the team**, “**≥80% handled automatically**” = (auto-archived + auto-categorized + summarized) ÷ (all inbound that day), with **user-approved actions** counted as handled.

