# The three modes

Explain these to the user in their own terms, then let them choose. This is not legal advice; check with a lawyer for your situation. Whether a pop-up is required where your visitors live is a legal question.

## Hybrid (default)

Everyone is counted. Visitors who accept get more.

- **Decline or no answer:** the visit is counted, with a visitor code that changes every day. The same person on two days looks like two visitors. No lasting ID, no replay.
- **Accept:** the browser gets a lasting random ID, so returning visits link up. Session replay records how the visitor uses the pages. Typed text is hidden.
- **Needs a pop-up:** yes. A "Privacy choices" link in the footer reopens it so a visitor can withdraw.
- **Site switches:** `saltUserIds` on, `sessionReplay` on after the code is live, `trackCopy` and `trackFormInteractions` off.
- **consent.js option:** `mode: 'hybrid'`.

## Daily only

Counts visits and same-day journeys. No lasting browser ID and no session replay.

- Visitor code changes every day. No lasting ID. No replay.
- **Needs a pop-up:** no. Whether your law agrees is for you and a lawyer to decide.
- **Site switches:** `saltUserIds` on, `sessionReplay` off.
- **consent.js option:** `mode: 'daily'`. It still holds back the `rybbit-visitor-id` storage key.

## Full

Replay and a lasting ID for every visitor. Use it only on a personal site where the owner accepts that, and the privacy policy says so.

- Every visitor gets a random ID and is recorded. Typed text is masked, and the owner must prove it (see verify-privacy.md).
- **Needs a pop-up:** the code adds none. Visitors who never agreed to recording are recorded, so the legal risk is highest here.
- **Site switches:** `saltUserIds` off, `sessionReplay` on after the code is live, `trackCopy` and `trackFormInteractions` on only if the policy covers them.
- **consent.js option:** `mode: 'full'`.

## What the policy must say

Whatever the mode, the policy and the pop-up must match the code.

- Say what is counted for everyone, and that a decline still counts the visit.
- Say what accept adds: a lasting random ID and, with replay on, a recording of how pages are used.
- Say that typed text and the masked elements are not recorded, but only after you have proved it.
- Say how long replays are kept (the retention you set on the server).
- Say how to change the choice: the "Privacy choices" link.
- If copy or form tracking is on, say that copied text and form activity are stored.
- If Rybbit runs on a server you do not control (Rybbit Cloud or a host), name that provider as a processor of the data.

Do not claim "no tracking", "no cookies" or "no browser storage" unless you checked it in the browser for this site. Rybbit writes a `rybbit-visitor-id` key to local storage on load unless consent.js holds it back.
