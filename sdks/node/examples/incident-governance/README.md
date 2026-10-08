# Incident Governance Example

This example shows how to create an AI incident, link safe evidence references,
start investigation, add a corrective action, and export an incident governance
Evidence Pack through the Node SDK.

It covers:

- incident creation;
- incident-to-output evidence linkage;
- lifecycle transition;
- corrective action recording;
- incident Evidence Pack export;
- future webhook metadata boundaries.

## Configuration

Production defaults:

```bash
AUTHENCHAIN_API_KEY=ac_live_...
AUTHENCHAIN_BASE_URL=https://api.authenchain.com
```

Local development boundary:

```bash
AUTHENCHAIN_API_KEY=ac_test_...
AUTHENCHAIN_BASE_URL=http://localhost:3000
```

The example records IDs, hashes, statuses, safe summaries, and policy
references. It does not upload raw prompts, raw outputs, personal identifiers,
privileged legal notes, screenshots, artifact URLs, or regulator filing data.

## Run

```bash
npx tsx sdks/node/examples/incident-governance/index.ts
```

Webhook helper output is metadata-only. It documents the future event boundary
for incident created, incident severity changed, deadline approaching,
deadline overdue, evidence failure created, and corrective action overdue. It
does not deliver webhooks and does not imply external automation is active.

AuthenChain records customer-controlled incident governance evidence.
Customers own incident classification, legal interpretation, reportability
decisions, regulator communication, corrective-action sufficiency,
operational remediation, affected-person communication, and sector-specific
post-market monitoring obligations.
