# Safety Engine — Current Implementation

Status: **IMPLEMENTED** — The safety engine is fully implemented, tested (42 unit tests),
and integrated with the `safety_evaluations` database table (migration
`13cda6c930c1_create_safety_evaluations_table.py`).

---

## 1. Why This Exists

**The LLM must never decide whether a student is in crisis.**

Every chat message flows through a deterministic, independently testable engine
**before** any AI/fallback conversation happens:

```
student message
      ↓
input validation (request layer: length, non-empty)
      ↓
rate limiting (10 messages/minute/session)
      ↓
safety pre-check ──────────────── SafetyEngine (authoritative)
      ↓
risk decision
      ├─ HIGH_RISK  → predetermined crisis flow  (NO generative model)
      └─ NORMAL / MODERATE → conversation pipeline (AI provider or fallback)
      ↓
output safety check (defense in depth on AI responses)
      ↓
persistence (safety_evaluations table — metadata only)
      ↓
response to student
```

---

## 2. Risk Levels & Exact Behavior

| Level | Meaning | Pipeline Behavior |
|-------|---------|-------------------|
| `NORMAL` | Everyday distress, no elevated risk | Normal conversation; topic category can steer self-help/resource suggestions |
| `MODERATE` | Notable distress (hopelessness, depression, panic) but no imminent-harm signal | Normal conversation with supportive framing + screening/resources nudges; treated as a signal, not a crisis |
| `HIGH_RISK` | Self-harm, suicide ideation (active or passive), abuse/safeguarding disclosure | **No normal conversation.** Immediate, predetermined crisis pathway: fixed warm message + verified helpline numbers + call-112/hospital guidance |

**Risk is never "decided by AI."** Categories map deterministically to levels:

| RiskCategory | Level | Example Signal |
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

---

## 3. Engine Design (Deterministic, Extensible)

```
SafetyEngine.evaluate(text)
  → input length check (2000 chars max, P0-3)
  → normalize_text()           Unicode-aware, preserves Devanagari/Bengali (P0-1)
  → [classifier.classify()]    list of RiskClassifier instances
  → max severity → RiskAssessment{level, category, matched_patterns, sources}
```

### Key Components

#### `RiskClassifier` Protocol (`safety/classifiers/base.py`)
The engine depends on the abstraction. Default = `KeywordClassifier` (regex groups,
offline, no model). Future classifiers (ML, provider-backed) plug in via the
constructor — no pipeline changes.

#### `normalize_text()` (`safety/normalizers.py`) — P0-1
- Preserves Devanagari (Hindi), Bengali/Assamese scripts
- Preserves mixed-script text (English + Hindi, English + Assamese)
- Case-folds only where scripts support it (Latin, Cyrillic, Greek)
- Normalizes Unicode whitespace, preserves contractions/hyphens/ZWJ/ZWNJ
- **Never silently converts non-Latin input to empty string**

#### Contextual Negation Handling (`safety/classifiers/keyword_classifier.py`) — P0-2
- Genuine negation words: `not`, `never`, `don't`, `won't`, `can't`, etc.
- **Exclusion patterns** prevent false negatives on:
  - `can't stop` / `cannot stop` / `unable to stop` → ongoing intent (HIGH_RISK)
  - `no one` / `nobody` / `no way` / `nothing` → fixed quantifiers
  - `without help` / `without support` / `no one to help` → conditional lack
  - `there is no` / `there's no` → existential
  - `not sure` / `not certain` → uncertainty, not negation of intent
- Only suppresses when genuine grammatical negation of harmful verb is present

#### Input Length Limit — P0-3
- 2000 characters enforced at engine boundary (fail-fast with clear `ValueError`)

#### Classifier Failure Handling — Additional Safety Fix
- Exceptions in classifiers are caught, logged via failure markers
- **Fail-closed policy**: if all classifiers fail, engine returns `HIGH_RISK`
  with `classifier_failure` marker to prevent safety bypass
- Partial failures: valid classifiers still contribute; failure recorded in
  `classifier_sources` for observability

#### Crisis Flow (`safety/crisis.py`)
`HIGH_RISK` selects a fixed `CrisisResponse` per category (SI/self-harm/passive,
abuse) with warm, action-oriented copy and helplines:
- Tele-MANAS 14416
- KIRAN 1800-599-0019
- AASRA 98204-66726
- Vandrevala 1860-2662-345 / 1800-2333-330
- Emergency 112
- Abuse adds: Childline 1098, Women's Helpline 181
- Unknown HIGH categories fall back to generic crisis message (future-proof)

> ⚠ Helpline numbers are real, well-known Indian services but **must be
> re-verified against official sources before production**.

---

## 4. Data Model — `safety_evaluations` Table

**Implemented in migration `13cda6c930c1`.**

```sql
safety_evaluations
  id                  uuid PK       gen_random_uuid()
  session_id          uuid FK       → sessions.id (NOT NULL, CASCADE)
  message_index       int           sequence of the message within the session
  risk_level          varchar(16)   NORMAL | MODERATE | HIGH_RISK   (CHECK)
  category            varchar(32)   RiskCategory                     (CHECK)
  matched_patterns    jsonb         patterns that fired (transparency/debug)
  classifier_sources  jsonb         which classifiers contributed
  language            varchar(16)
  created_at          timestamptz   NOT NULL
Indexes:
  (session_id, message_index)  unique   → message ordering per session
  (risk_level, created_at)              → aggregate risk-event analytics
  (created_at)                          → time trends
```

**Privacy by Design:**
- **No raw message text stored**
- **No message excerpts**
- **No raw matched phrases**
- **No text hashes**
- **No PII** stored in safety evaluation persistence
- Only metadata: risk level, category, matched pattern identifiers, classifier sources

---

## 5. Output Safety Check (Defense in Depth)

Location: `backend/app/services/output_safety.py`

Runs on **AI/fallback responses only** (crisis responses are trusted — they come
from the deterministic crisis module).

### Checks Performed

1. **Unsafe pattern detection** — regex patterns for:
   - Self-harm encouragement
   - Dismissive of crisis
   - Medical advice (prescribing)
   - Dismissing professional help
   - Medical diagnosis claims
   - Prompt injection / roleplay attempts

2. **Hallucinated phone number / helpline detection**
   - Crisis numbers are **SYSTEM-CONTROLLED** — AI must never output them
   - Any phone-like pattern not in the authorized list → reject

3. **Crisis indicator leakage detection**
   - If response contains multiple crisis indicators but risk ≠ HIGH_RISK → flag

### On Failure
- **REJECT entire response** (don't sanitize)
- Return guaranteed-safe fallback via `OutputSafetyCheck.get_safe_fallback()`

---

## 6. Test Coverage (42 Tests, All Passing)

| Category | Tests | Description |
|---|---|---|
| Unicode / normalization | 7 | English, Hindi (Devanagari), Assamese (Bengali), mixed scripts, Unicode punctuation, empty input, contractions/hyphens |
| Risk levels | 10 | Normal (stress, anxiety, ambiguous, empty), Moderate (hopelessness, depression, panic), High-risk (self-harm, suicide, passive SI, abuse), Override ordering (HIGH overrides) |
| P0-2 Negation logic | 11 | Genuine negations, false-positive exclusions (`can't stop`, `no one`, `without help`, `there is no`, `not sure`), legitimate benign, uncertainty |
| False positives | 4 | Accidental injury, non-suicidal context, negation in help context, accidental self-harm |
| P0-3 Input length | 3 | Exactly 2000 chars, 2001 chars (raises), 10000 chars (raises) |
| Classifier failure | 2 | All fail → fail-closed HIGH_RISK; partial fail → valid contribute + failure recorded |
| Extensibility | 1 | Custom classifier injection |
| Crisis pathway | 3 | HIGH_RISK selection, abuse-specific helplines, rejection for non-HIGH_RISK |

**Total: 42 tests, all passing.**

---

## 7. Files

```
backend/app/safety/
├── __init__.py
├── models.py           # RiskLevel, RiskCategory, RiskAssessment
├── normalizers.py      # normalize_text() — P0-1
├── engine.py           # SafetyEngine — P0-3, classifier failure handling
├── crisis.py           # CrisisResponse, select_crisis_response()
└── classifiers/
    ├── __init__.py
    ├── base.py         # RiskClassifier protocol
    └── keyword_classifier.py  # KeywordClassifier — P0-2 negation

backend/app/services/
└── output_safety.py    # OutputSafetyCheck — defense in depth

backend/tests/
└── test_safety.py      # 42 tests

backend/migrations/versions/
└── 13cda6c930c1_create_safety_evaluations_table.py
```

---

## 8. Summary of P0 Fixes Implemented

| Issue | Fix | Files |
|---|---|---|
| **P0-1 Non-ASCII bypass** | Unicode-aware `normalize_text()` using NFC, casefold, Unicode whitespace, preserves all letters/marks/numbers, ZWJ/ZWNJ | `normalizers.py`, `test_safety.py` (7 new tests) |
| **P0-2 Negation too broad** | Exclusion patterns for false-positive contexts (`can't stop`, `no one`, `without help`, `there is no`, `not sure`) | `keyword_classifier.py`, `test_safety.py` (11 new tests) |
| **P0-3 Input length** | 2000-char limit at engine boundary with clear `ValueError` | `engine.py`, `test_safety.py` (3 new tests) |
| **Classifier failure** | Fail-closed policy: catch exceptions, record failures, return HIGH_RISK if all fail | `engine.py`, `test_safety.py` (2 new tests) |
| **Privacy** | `text_hash` removed from data model; no raw text stored | `safety_evaluations` migration, `models.py` |

**All 56 tests pass (14 session + 42 safety). No regressions.**

---

## 9. Critical Architectural Guarantees

1. **SafetyEngine is authoritative** — Risk classification happens BEFORE any LLM call
2. **HIGH_RISK never reaches the LLM** — Crisis pathway is completely deterministic
3. **OutputSafetyCheck is defense in depth** — Catches any unsafe AI output
4. **Fail-closed on classifier failure** — Safety bypass impossible
5. **Privacy-preserving persistence** — Metadata only, no content
6. **Extensible classifier protocol** — Can add ML classifiers without pipeline changes

---

## 10. What This Is NOT

- The SafetyEngine is **not** an LLM-based classifier
- It does **not** "understand" language semantically
- It does **not** diagnose mental health conditions
- It is a **deterministic pattern-matching system** with carefully designed
  Unicode handling, negation logic, and fail-closed safety guarantees