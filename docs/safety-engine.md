# Safety Engine — Architecture & Data Model Proposal

Status: **DRAFT — pending review.** The safety engine code exists and is tested
(`backend/app/safety/`, `tests/test_safety.py`, **42 unit tests**). **No database
tables or migrations for safety have been created yet.** This document
proposes the data model for review before any schema work.

## 1. Why this exists

The LLM must never decide whether a student is in crisis. Every message flows
through a deterministic, independently testable engine before any AI/fallback
conversation happens:

```
student message
      ↓
input validation (request layer)
      ↓
safety pre-check ──────────────── SafetyEngine (this milestone)
      ↓
risk decision
      ├─ HIGH_RISK  → predetermined crisis flow  (no generative model)
      └─ NORMAL / MODERATE → conversation pipeline (later milestones)
      ↓
(output safety post-check comes with the chat pipeline, M4/M10)
```

## 2. Risk levels and exact behavior

| Level | Meaning | Pipeline behavior |
|-------|---------|-------------------|
| `NORMAL` | Everyday distress, no elevated risk | Normal conversation; topic category can steer self-help/resource suggestions |
| `MODERATE` | Notable distress (hopelessness, depression, panic) but no imminent-harm signal | Normal conversation with supportive framing + screening/resources nudges; treated as a signal, not a crisis |
| `HIGH_RISK` | Self-harm, suicide ideation (active or passive), abuse/safeguarding disclosure | **No normal conversation.** Immediate, predetermined crisis pathway: fixed warm message + verified helpline numbers + call-112/hospital guidance |

Risk is never "decided by AI". Categories map deterministically to levels:

| RiskCategory | Level | Example signal |
|---|---|---|
| SUICIDE | HIGH_RISK | "want to end my life" |
| SELF_HARM | HIGH_RISK | "thinking about hurting myself" |
| PASSIVE_SI | HIGH_RISK | "no point in living" |
| ABUSE | HIGH_RISK | "being abused at home" |
| HOPELESSNESS | MODERATE | "feel hopeless" |
| DEPRESSION | MODERATE | "feel really depressed" |
| PANIC | MODERATE | "had a panic attack" |
| ANXIETY / STRESS / BURNOUT / SLEEP | NORMAL | topic only |
| GENERAL | NORMAL | no signal matched |

## 3. Engine design (deterministic, extensible)

```
SafetyEngine.evaluate(text)
  → input length check (2000 chars max, P0-3)
  → normalize_text()           Unicode-aware, preserves Devanagari/Bengali (P0-1)
  → [classifier.classify()]    list of RiskClassifier instances
  → max severity → RiskAssessment{level, category, matched_patterns, sources}
```

- **`RiskClassifier` protocol** (`safety/classifiers/base.py`): the engine
  depends on the abstraction. Default = `KeywordClassifier` (regex groups,
  offline, no model). Future classifiers (ML, provider-backed) plug in via the
  constructor — no pipeline changes.
- **P0-1 Unicode-aware normalization** (`safety/normalizers.py`):
  - Preserves Devanagari (Hindi), Bengali/Assamese scripts
  - Preserves mixed-script text (English + Hindi, English + Assamese)
  - Case-folds only where scripts support it (Latin, Cyrillic, Greek)
  - Normalizes Unicode whitespace, preserves contractions/hyphens/ZWJ/ZWNJ
  - Never silently converts non-Latin input to empty string
- **P0-2 Contextual negation handling** (`safety/classifiers/keyword_classifier.py`):
  - Genuine negation words: `not`, `never`, `don't`, `won't`, `can't`, etc.
  - **Exclusion patterns** prevent false negatives on:
    - `can't stop` / `cannot stop` / `unable to stop` → ongoing intent (HIGH_RISK)
    - `no one` / `nobody` / `no way` / `nothing` → fixed quantifiers
    - `without help` / `without support` / `no one to help` → conditional lack
    - `there is no` / `there's no` → existential
    - `not sure` / `not certain` → uncertainty, not negation of intent
  - Only suppresses when genuine grammatical negation of harmful verb is present
- **P0-3 Input length limit**: 2000 characters enforced at engine boundary
  (fail-fast with clear `ValueError`).
- **Additional Safety Fix — Classifier failure handling**:
  - Exceptions in classifiers are caught, logged via failure markers
  - **Fail-closed policy**: if all classifiers fail, engine returns `HIGH_RISK`
    with `classifier_failure` marker to prevent safety bypass
  - Partial failures: valid classifiers still contribute; failure recorded in
    `classifier_sources` for observability
- **Crisis flow** (`safety/crisis.py`): HIGH_RISK selects a fixed
  `CrisisResponse` per category (SI/self-harm/passive, abuse) with warm,
  action-oriented copy and helplines (Tele-MANAS 14416, KIRAN, AASRA,
  Vandrevala, 112; abuse adds Childline 1098 / Women's Helpline 181).
  Unknown HIGH categories fall back to a generic crisis message (future-proof).

> ⚠ Helpline numbers are real, well-known Indian services but **must be
> re-verified against official sources before production** (Milestone 6).

## 4. Data model proposal (NOT yet created)

### New table: `safety_evaluations`
One row per evaluated message. **Metadata only — the raw message text is never
stored** (privacy-by-design; a normalised-text hash allows dedup without
storing content).

```
safety_evaluations
  id              uuid PK   gen_random_uuid()
  session_id      uuid FK → sessions.id (NOT NULL)
  message_index   int       sequence of the message within the session
  risk_level      varchar(16)   NORMAL | MODERATE | HIGH_RISK   (CHECK)
  category        varchar(32)   RiskCategory                     (CHECK)
  matched_patterns jsonb     patterns that fired (transparency/debug)
  classifier_sources jsonb   which classifiers contributed
  language         varchar(16)
  created_at       timestamptz  NOT NULL
Indexes:
  (session_id, message_index)  unique   → message ordering per session
  (risk_level, created_at)              → aggregate risk-event analytics
  (created_at)                          → time trends
```

**Privacy note (reviewer requirement):** No `text_hash` column. No raw message,
no message excerpts, no raw matched phrases, no text hashes, no PII stored in
safety evaluation persistence.

### Explicitly NOT proposed right now
- **No `risk_level` column on `sessions`.** A "current highest risk" snapshot
  on the session could help dashboards, but it duplicates source-of-truth
  history in `safety_evaluations`. Decision deferred to M4/M12 (analytics) —
  add via a small migration only if a concrete query needs it.
- **No `status` column.** Nothing in the current flow needs it.

### Open decisions for review
1. Should `safety_evaluations.session_id` be nullable to support
   pre-session evaluations (entry page) — or require a session for everything?
2. Approval to add the `safety_evaluations` migration (M4) as proposed above,
   including CHECK constraints and the three indexes?

## 5. Test coverage (42 tests)

**Unicode / normalization (7):**
- English, Hindi (Devanagari), Assamese (Bengali script)
- Mixed English+Hindi, English+Assamese
- Unicode punctuation, empty input, contractions/hyphens

**Risk levels (10):**
- Normal: stress, anxiety, ambiguous, empty
- Moderate: hopelessness, depression, panic
- High-risk: self-harm, suicide, passive SI, abuse
- Override ordering (HIGH overrides MODERATE/NORMAL)

**P0-2 Negation logic (11):**
- Genuine negations: "don't want to kill myself", "never want to hurt myself"
- False-positive exclusions: "can't stop", "unable to stop", "no one to help",
  "without help", "there is no way out", "no one cares", "if no one helps",
  "not sure if I want to"
- Legitimate benign: "don't want to harm my grades", "never hurt anyone"
- Uncertainty: "not sure if I want to hurt myself" → HIGH_RISK

**False positives (4):**
- Accidental injury, non-suicidal context, negation in help context, accidental self-harm

**P0-3 Input length (3):**
- Exactly 2000 chars, 2001 chars (raises), 10000 chars (raises)

**Additional Safety Fix — Classifier failure (2):**
- All classifiers fail → fail-closed HIGH_RISK with failure marker
- Partial failure → valid classifiers contribute + failure recorded in sources

**Extensibility (1):**
- Custom classifier injection

**Crisis pathway (3):**
- HIGH_RISK selection, abuse-specific helplines, rejection for non-HIGH_RISK

**Total: 42 tests, all passing.**

## 6. Files

- `backend/app/safety/` — `models.py`, `normalizers.py`, `engine.py`,
  `crisis.py`, `classifiers/{base,keyword_classifier}.py`
- `backend/tests/test_safety.py`
- No migration files were created.

## 7. Summary of P0 fixes implemented

| Issue | Fix | Files changed |
|-------|-----|---------------|
| **P0-1 Non-ASCII bypass** | Unicode-aware `normalize_text()` using NFC, casefold, Unicode whitespace, preserves all letters/marks/numbers, ZWJ/ZWNJ | `normalizers.py`, `test_safety.py` (7 new tests) |
| **P0-2 Negation too broad** | Exclusion patterns for false-positive contexts (`can't stop`, `no one`, `without help`, `there is no`, `not sure`) | `keyword_classifier.py`, `test_safety.py` (11 new tests) |
| **P0-3 Input length** | 2000-char limit at engine boundary with clear `ValueError` | `engine.py`, `test_safety.py` (3 new tests) |
| **Classifier failure** | Fail-closed policy: catch exceptions, record failures, return HIGH_RISK if all fail | `engine.py`, `test_safety.py` (2 new tests) |
| **Privacy** | `text_hash` removed from data model proposal | `safety-engine.md` |

All 56 tests pass (14 session + 42 safety). No regressions.