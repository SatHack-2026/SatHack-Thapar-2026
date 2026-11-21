# API_CONTRACT.md — TruthLens News

Single source of truth for Frontend and Backend. If code and this file disagree, this file wins: change it first, then the code.

**What it does:** TruthLens News audits a news article for rhetorical manipulation, classifies its factual claims, computes a deterministic and explainable bias score, writes a sparse sentence-anchored neutral rewrite with word-level diffs, and compares coverage between two outlets. One `POST /api/analyze` response powers every reader tab (X-Ray, Claims, Side-by-Side, Neutral), so switching tabs never touches the network.

**Stack:** React + TypeScript + Vite + Tailwind + Radix/Shadcn + `diff` + `@floating-ui/react` on Vercel · Python 3.11+ / FastAPI / Pydantic v2 + `curl_cffi`/`httpx` + `trafilatura` + `pysbd` + `rapidfuzz` on Render/Railway · Gemini `response_schema` or OpenAI Structured Outputs at `temperature = 0` · Jina Reader fallback · local SHA-256 JSON cache.
**Auth:** none (hackathon demo mode).

**Endpoints (exactly 4):**

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Service readiness, LLM key and cache status |
| GET | `/api/fixtures` | Metadata for 3 offline spectrum fixtures + 1 comparison preset |
| POST | `/api/analyze` | Full single-article audit |
| POST | `/api/compare` | Dual-outlet story comparison |

---

## Section 1: Global Standards & Conventions

### Base URL & Environment

| Env | Base URL |
|---|---|
| Local | `http://localhost:8000/api` |
| Production | `https://truthlens-news-api.onrender.com/api` |

All paths in this document are relative to the base URL, so `GET /health` means `GET {VITE_API_BASE_URL}/health`.

Required environment variables:

| Variable | Where | Example | Notes |
|---|---|---|---|
| `VITE_API_BASE_URL` | Frontend (`.env`) | `http://localhost:8000/api` | No trailing slash. |
| `LLM_API_KEY` | Backend | `AIza...` | If empty, `/health` reports `llm_configured: false` and live calls return `503 UPSTREAM_UNAVAILABLE`; `?mock=true` still works. |
| `LLM_MODEL` | Backend | `gemini-2.5-flash` | Any structured-output model; always called at `temperature = 0`. |
| `CACHE_FILE_PATH` | Backend | `./data/url_cache.json` | Created on first write. Keys are SHA-256 hashes. |
| `FRONTEND_ORIGIN` | Backend | `https://truthlens-news.vercel.app` | Added to the CORS allow-list. |

### Naming & Formatting
- All JSON keys are `snake_case`.
- All timestamps are ISO-8601 UTC strings, exactly `YYYY-MM-DDTHH:MM:SSZ`.
- Units live in key names: `processing_latency_ms`, `coverage_pct`, `word_count`, `timeout_ms`.
- Scores are unitless floats from `0.0000` to `1.0000` (4 decimal places). `coverage_pct` and `change_ratio` follow the rules in their descriptions.
- **Offsets:** every `start_offset` / `end_offset` is a **UTF-16 code-unit offset into `article.canonical_text`**, zero-based, `end_offset` exclusive. It is identical to JavaScript `canonical_text.slice(start_offset, end_offset)`. The example text contains an emoji (`🚌`, 2 UTF-16 units but 1 Python code point) and an em-dash (`—`, 1 unit); the backend must compute offsets in UTF-16 units, not Python string indexes.
- **Normalization:** `canonical_text` is Unicode NFC. Paragraphs are separated by exactly one blank line (`"\n\n"`) and the separators count toward offsets. No trailing whitespace.
- **Headline:** when a title is known it becomes paragraph `0` (sentence `S1`) and its spans have `in_headline: true`. When there is no title, no span is `in_headline`.

### Nullability Rule
Never omit keys. Missing scalars are `null`; empty arrays are `[]`. Objects are never `null` unless a field is documented as `object | null`.

### Explicit Enums (exact strings, case-sensitive)

| Name | Values |
|---|---|
| `source_tier` | `"primary"`, `"reader_proxy"`, `"rss_fallback"`, `"manual_paste"` |
| `technique` | `"LOADED_LANGUAGE"`, `"FEAR_APPEAL"`, `"CHERRY_PICKING"`, `"FALSE_DILEMMA"`, `"AD_HOMINEM"`, `"EXAGGERATION"`, `"WEASEL_WORDS"`, `"WHATABOUTISM"` |
| `severity` (integer) | `1` subtle slant, `2` clear framing bias, `3` overt manipulation |
| `verdict` | `"LOW"` (score < 0.30), `"MODERATE"` (0.30 to 0.6499), `"HIGH"` (>= 0.65) |
| `claim_label` | `"VERIFIABLE"`, `"UNSUPPORTED"`, `"OPINION"` |
| `alignment_status` | `"UNCHANGED"`, `"REWRITTEN"`, `"DELETED"`, `"MERGED"`, `"SPLIT"` |
| `diff_render_mode` | `"unchanged"`, `"inline_diff"`, `"block_replace"` (used when `change_ratio > 0.60`) |
| `diff_token_type` | `"equal"`, `"delete"`, `"insert"` |
| `cache_status` | `"HIT"`, `"MISS"`, `"MOCK"` |
| `mock_scenario` | `"wire_neutral"`, `"policy_oped"`, `"viral_tabloid"` (default) |
| `health_status` | `"ok"`, `"degraded"` |
| `error.code` | `"INGESTION_BLOCKED"`, `"SSRF_BLOCKED"`, `"INVALID_INPUT"`, `"ARTICLE_TOO_SHORT"`, `"LLM_TIMEOUT"`, `"LLM_RATE_LIMITED"`, `"UPSTREAM_UNAVAILABLE"`, `"INTERNAL_ERROR"` |

Suggested UI colors: severity/verdict `1`/`LOW` green, `2`/`MODERATE` amber, `3`/`HIGH` red.

### Standard Error Envelope
Every 4xx/5xx response on every endpoint uses exactly this shape:

```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Provide exactly one of url or text.",
    "details": {
      "field": "url"
    }
  },
  "request_id": "req_a1b2c3d4"
}
```

`error.details` is an object or `null`. `request_id` also appears on every success body and in the `X-Request-Id` header.

| `error.code` | HTTP | When |
|---|---|---|
| `INVALID_INPUT` | 400 | Body fails validation (both/neither of `url`/`text`, bad URL, bad enum, text over 60,000 characters) |
| `SSRF_BLOCKED` | 422 | URL resolves to a private, loopback, link-local or reserved IP, or uses a non-`http(s)` scheme |
| `INGESTION_BLOCKED` | 422 | All fetch tiers failed; frontend must show the "Paste article text" box. `details.url` and `details.attempts[]` are always present |
| `ARTICLE_TOO_SHORT` | 422 | `/analyze`: fewer than 40 words. `/compare`: either article under 200 words |
| `LLM_RATE_LIMITED` | 429 | Provider rate limit; `details.retry_after_s` when known |
| `LLM_TIMEOUT` | 503 | 12-second circuit breaker tripped |
| `UPSTREAM_UNAVAILABLE` | 502 | LLM key missing, provider down, or reader proxy unreachable |
| `INTERNAL_ERROR` | 500 | Anything else |

For `/compare`, errors caused by one input put `details.failing` (`"article_a"` or `"article_b"`) and `details.url` (or `null` for pasted text) in the details object.

### CORS & Headers
- Allowed origins: `http://localhost:5173`, the deployed Vercel origin (`FRONTEND_ORIGIN`). No wildcard, no credentials.
- Allowed methods: `GET, POST, OPTIONS`. Allowed request headers: `Content-Type, Accept`. `Access-Control-Max-Age: 600`.
- Exposed response headers (so the browser can read them): `X-TruthLens-Cache`, `X-Request-Id`.
- `POST /analyze` always sets `X-TruthLens-Cache: HIT | MISS | MOCK` and `X-Request-Id`. Every other endpoint sets `X-Request-Id`.

### Mock Mode
- `POST /analyze?mock=true&scenario=wire_neutral|policy_oped|viral_tabloid` returns the canned payload for that scenario with `X-TruthLens-Cache: MOCK`, `telemetry.cache_status: "MOCK"`, no network and no LLM call. `scenario` defaults to `viral_tabloid`. The request body is still validated, but its content is ignored.
- `POST /compare?mock=true` returns the canned comparison (the `dual_outlet_demo` preset). Query `scenario` is ignored there.
- `GET /health` and `GET /fixtures` ignore `mock`; they never call the LLM.
- Unknown `scenario` values return `400 INVALID_INPUT`.

---

## Section 2: Endpoint Specifications

### 2.1 `GET /health`

**Purpose:** Check availability and LLM key status on app load.
**Content-Type:** none (no body). **Query:** none. **Custom headers:** response sets `X-Request-Id`.

| Field | Type | Required | Notes |
|---|---|---|---|
| (none) | | | |

**200 OK**

```json
{
  "status": "ok",
  "version": "1.0.0",
  "server_time": "2026-11-21T09:30:00Z",
  "llm_configured": true,
  "llm_model": "gemini-2.5-flash",
  "cache": {
    "status": "ready",
    "entries": 14,
    "file_path": "./data/url_cache.json"
  },
  "request_id": "req_0a1b2c3d"
}
```

If `LLM_API_KEY` is empty the server returns `200` with this body (the UI should enable demo/mock buttons only):

```json
{
  "status": "degraded",
  "version": "1.0.0",
  "server_time": "2026-11-21T09:30:00Z",
  "llm_configured": false,
  "llm_model": null,
  "cache": {
    "status": "ready",
    "entries": 14,
    "file_path": "./data/url_cache.json"
  },
  "request_id": "req_0a1b2c3e"
}
```

**Errors:** only `500 INTERNAL_ERROR` in the standard envelope.

**Smoke test**
```bash
curl -s http://localhost:8000/api/health
```

---

### 2.2 `GET /fixtures`

**Purpose:** Metadata for the three offline spectrum fixtures and one comparison preset, for one-click demo buttons.
**Content-Type:** none. **Query:** none. **Custom headers:** response sets `X-Request-Id`.

**200 OK**

```json
{
  "request_id": "req_4d5e6f70",
  "fixtures": [
    {
      "fixture_id": "wire_neutral",
      "title": "Council approves 12-route bus expansion",
      "outlet": "Metro Wire",
      "spectrum_label": "Wire service, neutral",
      "expected_score": 0.1204,
      "expected_verdict": "LOW",
      "word_count": 418,
      "description": "Plain attribution, sourced figures, minimal adjectives. Use it to show a clean report scoring LOW."
    },
    {
      "fixture_id": "policy_oped",
      "title": "Why the transit plan deserves a fair hearing",
      "outlet": "The Northgate Dispatch",
      "spectrum_label": "Policy op-ed, one-sided",
      "expected_score": 0.4871,
      "expected_verdict": "MODERATE",
      "word_count": 506,
      "description": "Argued opinion with selective evidence. Use it to show MODERATE framing and cherry-picking."
    },
    {
      "fixture_id": "viral_tabloid",
      "title": "Council slams reckless transit plan as businesses face ruin",
      "outlet": "The Northgate Courier",
      "spectrum_label": "Viral tabloid, overt",
      "expected_score": 0.6978,
      "expected_verdict": "HIGH",
      "word_count": 66,
      "description": "Fear appeals, loaded verbs and unsupported claims. Default mock scenario and the article used in the analyze example below."
    }
  ],
  "comparison_presets": [
    {
      "preset_id": "dual_outlet_demo",
      "title": "Same council vote, two outlets",
      "description": "Compares a tabloid-style and a wire-style report of the same council vote. Load it with POST /api/compare?mock=true.",
      "outlet_a": "The Northgate Courier",
      "outlet_b": "Metro Wire",
      "expected_same_event": true
    }
  ]
}
```

Notes: `fixture_id` is the same value you pass as `scenario` to `POST /analyze?mock=true`. `expected_score` equals the score that scenario returns. `comparison_presets[].preset_id` is informational; call `POST /compare?mock=true` to load it.

**Errors:** only `500 INTERNAL_ERROR`.

**Smoke test**
```bash
curl -s http://localhost:8000/api/fixtures
```

---

### 2.3 `POST /analyze`

**Purpose:** One call returns everything the reader needs: normalized article, sentence index, score, flattened highlights, claims and the neutral rewrite.
**Content-Type:** `application/json`. **Query:** `mock` (boolean), `scenario` (`mock_scenario`, only with `mock=true`). **Response headers:** `X-TruthLens-Cache`, `X-Request-Id`.

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| `url` | string \| null | One of `url`/`text` | `http(s)` URL, max 2,048 chars. Exactly one of `url` and `text` must be non-null. |
| `text` | string \| null | One of `url`/`text` | Raw pasted text, 40 to 60,000 characters. |
| `title` | string \| null | No | Used as headline (paragraph 0) in `text` mode. In `url` mode the page title is used and this is ignored. |
| `rss_fallback` | object \| null | No | Only meaningful with `url`. Fields: `title` (string \| null), `summary` (string \| null), `content` (string \| null). Used as tier 3 when tiers 1 and 2 fail. |

All four keys must always be sent (use `null`).

**Request: URL variant**
```json
{
  "url": "https://courier.example/news/council-slams-transit-plan",
  "text": null,
  "title": null,
  "rss_fallback": null
}
```

**Request: raw text variant**
```json
{
  "url": null,
  "title": "City Council Slams Reckless Transit Plan as Businesses Face Ruin",
  "text": "City council members slammed a reckless new transit plan on Tuesday — warning it will devastate local businesses along the proposed routes 🚌. The plan adds 12 bus routes and would cost $40 million over five years.\n\nEveryone knows commuters will suffer, and officials have offered no evidence the plan works. Critics call the proposal a desperate gamble.",
  "rss_fallback": null
}
```

**Request: URL with RSS fallback variant**
```json
{
  "url": "https://paywalled.example/news/council-budget",
  "text": null,
  "title": null,
  "rss_fallback": {
    "title": "Council budget vote splits members",
    "summary": "Council members split on the budget on Tuesday, with several warning of service cuts if the plan passes.",
    "content": "Council members split on the budget on Tuesday, with several warning of service cuts if the plan passes. The vote is expected next week."
  }
}
```

**Processing contract (behavioral rules the backend must follow)**
1. **Fetch cascade (URL mode):** tier 1 `primary` (`curl_cffi`/`httpx` + `trafilatura`, 5 s) → tier 2 `reader_proxy` (`https://r.jina.ai/{url}`, 4 s) → tier 3 `rss_fallback` (the supplied payload, if it has at least 40 words) → `422 INGESTION_BLOCKED`. A tier counts as failed if it errors or yields under 40 words. Pasted text uses `source_tier: "manual_paste"`.
2. **SSRF guard** runs before any fetch: resolve DNS, reject private/loopback/link-local/reserved addresses and non-`http(s)` schemes with `422 SSRF_BLOCKED`; re-check after redirects.
3. **Normalize** to NFC, strip boilerplate, collapse whitespace, join paragraphs with `"\n\n"`. `content_hash` is the lowercase SHA-256 hex of the UTF-8 bytes of `canonical_text`.
4. **Sentences:** split with `pysbd`; ids are `S1..Sn` across the whole article; `paragraph_index` is 0-based.
5. **One LLM call** (`temperature = 0`, structured output) extracts manipulation spans and claims. A hard **12 s** timeout applies to the whole request; on breach return `503 LLM_TIMEOUT`, unless a partial result exists, in which case return `200` with `telemetry.degraded_mode: true` and a `degraded_reason`, and an empty `rewrite.alignment_blocks`.
6. **Offset grounding (3 tiers):** (a) exact substring match of `exact_quote` within `sentence_id`'s text, (b) whitespace- and case-normalized match, (c) `rapidfuzz` partial ratio >= 90 within the sentence. Spans that fail all tiers are dropped and counted in `annotations.dropped_spans_count`. Claims that fail grounding keep their other fields but have `start_offset: null` and `end_offset: null`.
7. **Flattening (sweep-line):** within each paragraph, collect all span boundaries, and for every interval covered by at least one span emit one segment; merge adjacent intervals with identical `span_ids`. Segments never overlap and are sorted by `start_offset`. `span_ids` are sorted by `start_offset` then `span_id`. `primary_technique` is the technique of the highest-severity active span (ties: earliest `start_offset`, then lowest `span_id`). `overlapping_techniques` lists every distinct active technique, ordered the same way. `max_severity` is the highest severity of the active spans. Unmarked text has no segment; render the gaps from `paragraphs[].start_offset`/`end_offset`.
8. **Scoring (deterministic):**
   - Severity weights: 1 → 1, 2 → 2, 3 → 3. A span with `lead_boosted: true` (any span in the headline or the first body sentence, i.e. `S1` or `S2` when a headline exists, otherwise `S1`) is multiplied by 1.5.
   - `density_score = min(1, (sum of weighted points / word_count × 100) / 40)`
   - `rhetoric_component = (mean span severity − 1) / 2`
   - `unsupported_ratio = UNSUPPORTED claims / (VERIFIABLE + UNSUPPORTED claims)`; `0` if there are no factual claims. `factual_claim_count` is the denominator.
   - `score = round(0.50 × density_score + 0.25 × rhetoric_component + 0.25 × unsupported_ratio, 4)`
   - `coverage_pct` is the share of `canonical_text` UTF-16 units covered by any span, rounded to 2 decimals.
   - `technique_counts` always contains all 8 techniques (zeros included).
   - `deduplicated_clusters_merged` counts duplicate spans (same technique, overlap >= 80%) merged before scoring.
9. **Rewrite (sparse, sentence-anchored):** only sentences containing spans or UNSUPPORTED claims are rewritten; others become `UNCHANGED` blocks. `original_sentence_ids` are contiguous. `diff_tokens` are produced from `\s+|\S+` tokens, with adjacent tokens of the same type merged. Concatenating `equal` + `delete` tokens reproduces `original_text`; concatenating `equal` + `insert` tokens reproduces `neutral_text`. `change_ratio = 1 − (equal words / max(original words, neutral words))`, rounded to 4 decimals; `render_mode` is `"unchanged"` when `changed` is false, `"block_replace"` when `change_ratio > 0.60`, else `"inline_diff"`. `rejected_patches_count` counts LLM patches discarded for altering facts, numbers or names.
10. **Cache:** key is the SHA-256 of the canonical URL (URL mode) or of `content_hash` (text mode); the stored value is the whole 200 body. A hit returns `X-TruthLens-Cache: HIT` and `telemetry.cache_status: "HIT"`.

**200 OK** (the `viral_tabloid` fixture; note the overlapping spans `sp_4`/`sp_5`, which flatten into three segments, and the emoji that makes UTF-16 offsets one larger than Python offsets after it)

```json
{
  "request_id": "req_7f3a9c21",
  "analyzed_at": "2026-11-21T09:31:12Z",
  "article": {
    "canonical_text": "City Council Slams Reckless Transit Plan as Businesses Face Ruin\n\nCity council members slammed a reckless new transit plan on Tuesday — warning it will devastate local businesses along the proposed routes 🚌. The plan adds 12 bus routes and would cost $40 million over five years.\n\nEveryone knows commuters will suffer, and officials have offered no evidence the plan works. Critics call the proposal a desperate gamble.",
    "content_hash": "cb67f178cba0c36c9f98399a07abaa93a475bd730994876b362d1153e1db4bac",
    "source_tier": "primary",
    "word_count": 66,
    "metadata": {
      "url": "https://courier.example/news/council-slams-transit-plan",
      "title": "City Council Slams Reckless Transit Plan as Businesses Face Ruin",
      "author": "Staff Reporter",
      "published_at": "2026-11-21T06:15:00Z"
    },
    "sentences": [
      {
        "sentence_id": "S1",
        "paragraph_index": 0,
        "start_offset": 0,
        "end_offset": 64,
        "text": "City Council Slams Reckless Transit Plan as Businesses Face Ruin"
      },
      {
        "sentence_id": "S2",
        "paragraph_index": 1,
        "start_offset": 66,
        "end_offset": 208,
        "text": "City council members slammed a reckless new transit plan on Tuesday — warning it will devastate local businesses along the proposed routes 🚌."
      },
      {
        "sentence_id": "S3",
        "paragraph_index": 1,
        "start_offset": 209,
        "end_offset": 280,
        "text": "The plan adds 12 bus routes and would cost $40 million over five years."
      },
      {
        "sentence_id": "S4",
        "paragraph_index": 2,
        "start_offset": 282,
        "end_offset": 374,
        "text": "Everyone knows commuters will suffer, and officials have offered no evidence the plan works."
      },
      {
        "sentence_id": "S5",
        "paragraph_index": 2,
        "start_offset": 375,
        "end_offset": 420,
        "text": "Critics call the proposal a desperate gamble."
      }
    ]
  },
  "scoring": {
    "score": 0.6978,
    "verdict": "HIGH",
    "breakdown": {
      "density_score": 0.7765,
      "rhetoric_component": 0.5714,
      "unsupported_ratio": 0.6667,
      "factual_claim_count": 3,
      "word_count": 66,
      "coverage_pct": 30.48,
      "weights_applied": {
        "density": 0.5,
        "rhetoric": 0.25,
        "unsupported": 0.25,
        "lead_boost_multiplier": 1.5,
        "severity_weights": {
          "1": 1,
          "2": 2,
          "3": 3
        }
      },
      "technique_counts": {
        "LOADED_LANGUAGE": 3,
        "FEAR_APPEAL": 2,
        "CHERRY_PICKING": 0,
        "FALSE_DILEMMA": 0,
        "AD_HOMINEM": 0,
        "EXAGGERATION": 1,
        "WEASEL_WORDS": 1,
        "WHATABOUTISM": 0
      },
      "lead_boosted_spans": 5,
      "deduplicated_clusters_merged": 1,
      "confidence_note": "Dense rhetoric in the headline and lead sentence; two of three factual claims cite no source."
    }
  },
  "annotations": {
    "spans_by_id": {
      "sp_1": {
        "span_id": "sp_1",
        "technique": "LOADED_LANGUAGE",
        "severity": 2,
        "exact_quote": "Slams Reckless",
        "context_before": "City Council ",
        "sentence_id": "S1",
        "start_offset": 13,
        "end_offset": 27,
        "in_headline": true,
        "lead_boosted": true,
        "rationale": "Verbs and adjectives that pass judgment instead of reporting what was said."
      },
      "sp_2": {
        "span_id": "sp_2",
        "technique": "FEAR_APPEAL",
        "severity": 2,
        "exact_quote": "Face Ruin",
        "context_before": "ss Transit Plan as Businesses ",
        "sentence_id": "S1",
        "start_offset": 55,
        "end_offset": 64,
        "in_headline": true,
        "lead_boosted": true,
        "rationale": "Predicts total financial collapse in the headline without evidence."
      },
      "sp_3": {
        "span_id": "sp_3",
        "technique": "LOADED_LANGUAGE",
        "severity": 2,
        "exact_quote": "slammed a reckless",
        "context_before": "ce Ruin\n\nCity council members ",
        "sentence_id": "S2",
        "start_offset": 87,
        "end_offset": 105,
        "in_headline": false,
        "lead_boosted": true,
        "rationale": "'Slammed' and 'reckless' are emotionally charged; 'criticized' would report the same fact."
      },
      "sp_4": {
        "span_id": "sp_4",
        "technique": "FEAR_APPEAL",
        "severity": 3,
        "exact_quote": "will devastate local businesses",
        "context_before": " plan on Tuesday — warning it ",
        "sentence_id": "S2",
        "start_offset": 147,
        "end_offset": 178,
        "in_headline": false,
        "lead_boosted": true,
        "rationale": "Presents a severe future outcome as certain, with no cited data."
      },
      "sp_5": {
        "span_id": "sp_5",
        "technique": "EXAGGERATION",
        "severity": 2,
        "exact_quote": "devastate local businesses along the proposed routes",
        "context_before": " on Tuesday — warning it will ",
        "sentence_id": "S2",
        "start_offset": 152,
        "end_offset": 204,
        "in_headline": false,
        "lead_boosted": true,
        "rationale": "Inflates a possible effect on some businesses into widespread devastation."
      },
      "sp_6": {
        "span_id": "sp_6",
        "technique": "WEASEL_WORDS",
        "severity": 2,
        "exact_quote": "Everyone knows",
        "context_before": "$40 million over five years.\n\n",
        "sentence_id": "S4",
        "start_offset": 282,
        "end_offset": 296,
        "in_headline": false,
        "lead_boosted": false,
        "rationale": "Appeals to unnamed universal agreement to make a contested prediction feel settled."
      },
      "sp_7": {
        "span_id": "sp_7",
        "technique": "LOADED_LANGUAGE",
        "severity": 2,
        "exact_quote": "desperate gamble",
        "context_before": ". Critics call the proposal a ",
        "sentence_id": "S5",
        "start_offset": 403,
        "end_offset": 419,
        "in_headline": false,
        "lead_boosted": false,
        "rationale": "Characterizes the proposal emotionally instead of attributing a specific criticism."
      }
    },
    "paragraphs": [
      {
        "paragraph_index": 0,
        "start_offset": 0,
        "end_offset": 64,
        "segments": [
          {
            "start_offset": 13,
            "end_offset": 27,
            "text": "Slams Reckless",
            "span_ids": [
              "sp_1"
            ],
            "primary_technique": "LOADED_LANGUAGE",
            "overlapping_techniques": [
              "LOADED_LANGUAGE"
            ],
            "max_severity": 2
          },
          {
            "start_offset": 55,
            "end_offset": 64,
            "text": "Face Ruin",
            "span_ids": [
              "sp_2"
            ],
            "primary_technique": "FEAR_APPEAL",
            "overlapping_techniques": [
              "FEAR_APPEAL"
            ],
            "max_severity": 2
          }
        ]
      },
      {
        "paragraph_index": 1,
        "start_offset": 66,
        "end_offset": 280,
        "segments": [
          {
            "start_offset": 87,
            "end_offset": 105,
            "text": "slammed a reckless",
            "span_ids": [
              "sp_3"
            ],
            "primary_technique": "LOADED_LANGUAGE",
            "overlapping_techniques": [
              "LOADED_LANGUAGE"
            ],
            "max_severity": 2
          },
          {
            "start_offset": 147,
            "end_offset": 152,
            "text": "will ",
            "span_ids": [
              "sp_4"
            ],
            "primary_technique": "FEAR_APPEAL",
            "overlapping_techniques": [
              "FEAR_APPEAL"
            ],
            "max_severity": 3
          },
          {
            "start_offset": 152,
            "end_offset": 178,
            "text": "devastate local businesses",
            "span_ids": [
              "sp_4",
              "sp_5"
            ],
            "primary_technique": "FEAR_APPEAL",
            "overlapping_techniques": [
              "FEAR_APPEAL",
              "EXAGGERATION"
            ],
            "max_severity": 3
          },
          {
            "start_offset": 178,
            "end_offset": 204,
            "text": " along the proposed routes",
            "span_ids": [
              "sp_5"
            ],
            "primary_technique": "EXAGGERATION",
            "overlapping_techniques": [
              "EXAGGERATION"
            ],
            "max_severity": 2
          }
        ]
      },
      {
        "paragraph_index": 2,
        "start_offset": 282,
        "end_offset": 420,
        "segments": [
          {
            "start_offset": 282,
            "end_offset": 296,
            "text": "Everyone knows",
            "span_ids": [
              "sp_6"
            ],
            "primary_technique": "WEASEL_WORDS",
            "overlapping_techniques": [
              "WEASEL_WORDS"
            ],
            "max_severity": 2
          },
          {
            "start_offset": 403,
            "end_offset": 419,
            "text": "desperate gamble",
            "span_ids": [
              "sp_7"
            ],
            "primary_technique": "LOADED_LANGUAGE",
            "overlapping_techniques": [
              "LOADED_LANGUAGE"
            ],
            "max_severity": 2
          }
        ]
      }
    ],
    "dropped_spans_count": 1
  },
  "claims": [
    {
      "id": "c1",
      "exact_quote": "The plan adds 12 bus routes and would cost $40 million over five years.",
      "claim_summary": "The transit plan adds 12 bus routes at a total cost of $40 million over five years.",
      "label": "VERIFIABLE",
      "cited_source": null,
      "verification_query": "city transit plan 12 new bus routes $40 million five years",
      "search_url": "https://www.google.com/search?q=city+transit+plan+12+new+bus+routes+%2440+million+five+years",
      "start_offset": 209,
      "end_offset": 280
    },
    {
      "id": "c2",
      "exact_quote": "it will devastate local businesses along the proposed routes",
      "claim_summary": "The plan will devastate businesses along the proposed routes.",
      "label": "UNSUPPORTED",
      "cited_source": null,
      "verification_query": "transit plan impact on local businesses along proposed bus routes study",
      "search_url": "https://www.google.com/search?q=transit+plan+impact+on+local+businesses+along+proposed+bus+routes+study",
      "start_offset": 144,
      "end_offset": 204
    },
    {
      "id": "c3",
      "exact_quote": "officials have offered no evidence the plan works",
      "claim_summary": "Officials have provided no evidence that the plan is effective.",
      "label": "UNSUPPORTED",
      "cited_source": null,
      "verification_query": "city officials evidence transit plan effectiveness ridership projections",
      "search_url": "https://www.google.com/search?q=city+officials+evidence+transit+plan+effectiveness+ridership+projections",
      "start_offset": 324,
      "end_offset": 373
    },
    {
      "id": "c4",
      "exact_quote": "Critics call the proposal a desperate gamble.",
      "claim_summary": "Critics describe the proposal as a desperate gamble.",
      "label": "OPINION",
      "cited_source": null,
      "verification_query": "critics transit plan council proposal reaction",
      "search_url": "https://www.google.com/search?q=critics+transit+plan+council+proposal+reaction",
      "start_offset": 375,
      "end_offset": 420
    }
  ],
  "rewrite": {
    "stats": {
      "total_sentences": 5,
      "rewritten_count": 4,
      "rejected_patches_count": 1
    },
    "alignment_blocks": [
      {
        "block_id": "B1",
        "original_sentence_ids": [
          "S1"
        ],
        "paragraph_index": 0,
        "original_text": "City Council Slams Reckless Transit Plan as Businesses Face Ruin",
        "neutral_text": "City Council Criticizes Transit Plan, Citing Risks to Local Businesses",
        "status": "REWRITTEN",
        "changed": true,
        "edit_summary": "Removed judgment words and the certainty of 'ruin'; kept who objected and why.",
        "render_mode": "inline_diff",
        "change_ratio": 0.6,
        "diff_tokens": [
          {
            "type": "equal",
            "value": "City Council "
          },
          {
            "type": "delete",
            "value": "Slams Reckless"
          },
          {
            "type": "insert",
            "value": "Criticizes"
          },
          {
            "type": "equal",
            "value": " Transit "
          },
          {
            "type": "delete",
            "value": "Plan"
          },
          {
            "type": "insert",
            "value": "Plan,"
          },
          {
            "type": "equal",
            "value": " "
          },
          {
            "type": "delete",
            "value": "as"
          },
          {
            "type": "insert",
            "value": "Citing Risks to Local"
          },
          {
            "type": "equal",
            "value": " Businesses"
          },
          {
            "type": "delete",
            "value": " Face Ruin"
          }
        ]
      },
      {
        "block_id": "B2",
        "original_sentence_ids": [
          "S2"
        ],
        "paragraph_index": 1,
        "original_text": "City council members slammed a reckless new transit plan on Tuesday — warning it will devastate local businesses along the proposed routes 🚌.",
        "neutral_text": "City council members criticized a new transit plan on Tuesday — saying it could affect local businesses along the proposed routes 🚌.",
        "status": "REWRITTEN",
        "changed": true,
        "edit_summary": "Replaced 'slammed a reckless' with 'criticized a' and 'will devastate' with 'could affect'.",
        "render_mode": "inline_diff",
        "change_ratio": 0.2174,
        "diff_tokens": [
          {
            "type": "equal",
            "value": "City council members "
          },
          {
            "type": "delete",
            "value": "slammed"
          },
          {
            "type": "insert",
            "value": "criticized"
          },
          {
            "type": "equal",
            "value": " a"
          },
          {
            "type": "delete",
            "value": " reckless"
          },
          {
            "type": "equal",
            "value": " new transit plan on Tuesday — "
          },
          {
            "type": "delete",
            "value": "warning"
          },
          {
            "type": "insert",
            "value": "saying"
          },
          {
            "type": "equal",
            "value": " it "
          },
          {
            "type": "delete",
            "value": "will"
          },
          {
            "type": "insert",
            "value": "could"
          },
          {
            "type": "equal",
            "value": " "
          },
          {
            "type": "delete",
            "value": "devastate"
          },
          {
            "type": "insert",
            "value": "affect"
          },
          {
            "type": "equal",
            "value": " local businesses along the proposed routes 🚌."
          }
        ]
      },
      {
        "block_id": "B3",
        "original_sentence_ids": [
          "S3"
        ],
        "paragraph_index": 1,
        "original_text": "The plan adds 12 bus routes and would cost $40 million over five years.",
        "neutral_text": "The plan adds 12 bus routes and would cost $40 million over five years.",
        "status": "UNCHANGED",
        "changed": false,
        "edit_summary": null,
        "render_mode": "unchanged",
        "change_ratio": 0.0,
        "diff_tokens": [
          {
            "type": "equal",
            "value": "The plan adds 12 bus routes and would cost $40 million over five years."
          }
        ]
      },
      {
        "block_id": "B4",
        "original_sentence_ids": [
          "S4",
          "S5"
        ],
        "paragraph_index": 2,
        "original_text": "Everyone knows commuters will suffer, and officials have offered no evidence the plan works. Critics call the proposal a desperate gamble.",
        "neutral_text": "Council members said commuters could be affected, and officials have not yet published evidence on the plan's effectiveness. Critics described the proposal as risky.",
        "status": "MERGED",
        "changed": true,
        "edit_summary": "Merged two sentences; removed the appeal to universal agreement and the absolute claim.",
        "render_mode": "block_replace",
        "change_ratio": 0.625,
        "diff_tokens": [
          {
            "type": "delete",
            "value": "Everyone"
          },
          {
            "type": "insert",
            "value": "Council"
          },
          {
            "type": "equal",
            "value": " "
          },
          {
            "type": "delete",
            "value": "knows"
          },
          {
            "type": "insert",
            "value": "members said"
          },
          {
            "type": "equal",
            "value": " commuters "
          },
          {
            "type": "delete",
            "value": "will"
          },
          {
            "type": "insert",
            "value": "could"
          },
          {
            "type": "equal",
            "value": " "
          },
          {
            "type": "delete",
            "value": "suffer,"
          },
          {
            "type": "insert",
            "value": "be affected,"
          },
          {
            "type": "equal",
            "value": " and officials have "
          },
          {
            "type": "delete",
            "value": "offered"
          },
          {
            "type": "insert",
            "value": "not"
          },
          {
            "type": "equal",
            "value": " "
          },
          {
            "type": "delete",
            "value": "no"
          },
          {
            "type": "insert",
            "value": "yet published"
          },
          {
            "type": "equal",
            "value": " evidence "
          },
          {
            "type": "insert",
            "value": "on "
          },
          {
            "type": "equal",
            "value": "the "
          },
          {
            "type": "delete",
            "value": "plan"
          },
          {
            "type": "insert",
            "value": "plan's"
          },
          {
            "type": "equal",
            "value": " "
          },
          {
            "type": "delete",
            "value": "works."
          },
          {
            "type": "insert",
            "value": "effectiveness."
          },
          {
            "type": "equal",
            "value": " Critics "
          },
          {
            "type": "delete",
            "value": "call"
          },
          {
            "type": "insert",
            "value": "described"
          },
          {
            "type": "equal",
            "value": " the proposal "
          },
          {
            "type": "delete",
            "value": "a"
          },
          {
            "type": "insert",
            "value": "as"
          },
          {
            "type": "equal",
            "value": " "
          },
          {
            "type": "delete",
            "value": "desperate gamble."
          },
          {
            "type": "insert",
            "value": "risky."
          }
        ]
      }
    ]
  },
  "telemetry": {
    "cache_status": "MISS",
    "processing_latency_ms": 7412,
    "degraded_mode": false,
    "degraded_reason": null
  }
}
```

Reading the example:
- `canonical_text` has `420` UTF-16 units (419 Python code points). `content_hash` is `cb67f178cba0c36c9f98399a07abaa93a475bd730994876b362d1153e1db4bac`.
- `sp_4` (`FEAR_APPEAL`, severity 3, offsets 147–178) and `sp_5` (`EXAGGERATION`, severity 2, offsets 152–204) overlap on 152–178. Paragraph 1 therefore has three flat segments: 147–152 (`sp_4`), 152–178 (`sp_4`+`sp_5`, primary `FEAR_APPEAL`) and 178–204 (`sp_5`). Render each as one `<mark>`; never nest.
- `scoring.score` is `0.6978`, which is `HIGH`.
- Block `B4` is `MERGED` (`S4` + `S5`) and `block_replace`, because its `change_ratio` is above 0.60.

**Error cases**

`400 Bad Request` (`INVALID_INPUT`):
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Provide exactly one of url or text.",
    "details": {
      "field": "url",
      "received_non_null_fields": [
        "url",
        "text"
      ]
    }
  },
  "request_id": "req_a1b2c3d4"
}
```

`422 Unprocessable Entity` (`INGESTION_BLOCKED`; show the paste box):
```json
{
  "error": {
    "code": "INGESTION_BLOCKED",
    "message": "Could not retrieve the article text. Paste the article text instead.",
    "details": {
      "url": "https://paywalled.example/news/council-budget",
      "attempts": [
        {
          "tier": "primary",
          "reason": "HTTP 403 from origin (bot protection)"
        },
        {
          "tier": "reader_proxy",
          "reason": "Reader returned fewer than 40 words (paywall)"
        },
        {
          "tier": "rss_fallback",
          "reason": "No rss_fallback payload supplied"
        }
      ]
    }
  },
  "request_id": "req_b2c3d4e5"
}
```

`422 Unprocessable Entity` (`SSRF_BLOCKED`):
```json
{
  "error": {
    "code": "SSRF_BLOCKED",
    "message": "URL resolves to a private or reserved address and was not fetched.",
    "details": {
      "url": "http://169.254.169.254/latest/meta-data/",
      "resolved_ip": "169.254.169.254"
    }
  },
  "request_id": "req_c3d4e5f6"
}
```

`503 Service Unavailable` (`LLM_TIMEOUT`):
```json
{
  "error": {
    "code": "LLM_TIMEOUT",
    "message": "Analysis exceeded the 12-second limit. Retry, or use ?mock=true.",
    "details": {
      "timeout_ms": 12000,
      "stage": "analysis"
    }
  },
  "request_id": "req_d4e5f607"
}
```

Other documented codes (`ARTICLE_TOO_SHORT` 422, `LLM_RATE_LIMITED` 429, `UPSTREAM_UNAVAILABLE` 502, `INTERNAL_ERROR` 500) use the same envelope.

**Smoke test**
```bash
# Live (needs LLM_API_KEY)
curl -s -i -X POST http://localhost:8000/api/analyze \
  -H "Content-Type: application/json" \
  -d '{"url": "https://courier.example/news/council-slams-transit-plan", "text": null, "title": null, "rss_fallback": null}'

# Mock (offline, no quota); try scenario=wire_neutral or policy_oped
curl -s -i -X POST "http://localhost:8000/api/analyze?mock=true&scenario=viral_tabloid" \
  -H "Content-Type: application/json" \
  -d '{"url": null, "text": null, "title": null, "rss_fallback": null}'
```
In mock mode the body may be all `null`; mock mode skips the "exactly one of url/text" rule.

---

### 2.4 `POST /compare`

**Purpose:** Run both single-article pipelines concurrently for two outlets covering the same event, then return dual scores, shared facts, framing contrasts and verified omissions.
**Content-Type:** `application/json`. **Query:** `mock` (boolean). **Response header:** `X-Request-Id`.

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| `article_a` | object | Yes | Same shape as the `POST /analyze` body: `url`, `text`, `title`, `rss_fallback` (all keys required, exactly one of `url`/`text` non-null). |
| `article_b` | object | Yes | Same shape as `article_a`. |

**Request**
```json
{
  "article_a": {
    "url": "https://courier.example/news/council-slams-transit-plan",
    "text": null,
    "title": null,
    "rss_fallback": null
  },
  "article_b": {
    "url": "https://metrowire.example/city/council-approves-bus-routes",
    "text": null,
    "title": null,
    "rss_fallback": null
  }
}
```

**Processing contract**
1. **Stage 1 (`stage1_parallel_ms`):** analyze A and B concurrently with the full `/analyze` pipeline (including the fetch cascade, SSRF guard and cache). Target under 10 s end to end.
2. **Stage 2 (`stage2_synthesis_ms`):** one LLM call decides `same_event`, and if true, produces candidate `shared_facts`, `framing_contrasts` and candidate omissions.
3. **Stage 3 (`stage3_verify_ms`):** every candidate omission is verified against the raw `canonical_text` of the outlet that supposedly left it out, using `rapidfuzz` partial ratio < 70 against that text. Unverified omissions are dropped. `verified_absent` is therefore `true` for every returned item.
4. Each article must have at least 200 words, else `422 ARTICLE_TOO_SHORT` with `details.failing`. If lengths differ by more than 2×, return `200` with `"length_mismatch"` in `warnings`; this never blocks.
5. If `same_event` is `false`: `mismatch_reason` is a sentence, `comparison.shared_facts`, `comparison.omissions.omitted_by_a`, `comparison.omissions.omitted_by_b` and `comparison.framing_contrasts` are all `[]`, but both article summaries are still returned.
6. `top_techniques` lists up to 3 techniques by span count, descending, ties by enum order.

**200 OK**

```json
{
  "request_id": "req_91b2c3d4",
  "compared_at": "2026-11-21T09:36:02Z",
  "same_event": true,
  "mismatch_reason": null,
  "warnings": [
    "length_mismatch"
  ],
  "stage_latency_ms": {
    "stage1_parallel_ms": 6120,
    "stage2_synthesis_ms": 2240,
    "stage3_verify_ms": 310
  },
  "article_a": {
    "url": "https://courier.example/news/council-slams-transit-plan",
    "outlet": "The Northgate Courier",
    "headline": "City Council Slams Reckless Transit Plan as Businesses Face Ruin",
    "word_count": 412,
    "bias_score": 0.6978,
    "verdict": "HIGH",
    "summary": "Frames the plan as a threat to businesses and commuters, led by critics and unattributed predictions.",
    "top_techniques": [
      {
        "technique": "LOADED_LANGUAGE",
        "count": 3
      },
      {
        "technique": "FEAR_APPEAL",
        "count": 2
      },
      {
        "technique": "EXAGGERATION",
        "count": 1
      }
    ]
  },
  "article_b": {
    "url": "https://metrowire.example/city/council-approves-bus-routes",
    "outlet": "Metro Wire",
    "headline": "Council approves 12 new bus routes at a cost of $40 million",
    "word_count": 1184,
    "bias_score": 0.1204,
    "verdict": "LOW",
    "summary": "Reports the vote, the cost and the funding source with attributed quotes and no characterizing language.",
    "top_techniques": [
      {
        "technique": "WEASEL_WORDS",
        "count": 1
      }
    ]
  },
  "comparison": {
    "shared_facts": [
      "The plan adds 12 bus routes.",
      "The plan would cost $40 million over five years.",
      "The council discussed the plan on Tuesday."
    ],
    "omissions": {
      "omitted_by_a": [
        {
          "statement": "The $40 million is funded partly by a state transit grant.",
          "evidence_quote": "About $14 million of the total comes from a state transit grant, the agency said.",
          "verified_absent": true
        },
        {
          "statement": "The agency projects 18,000 new daily riders by year three.",
          "evidence_quote": "The agency's filing projects 18,000 new daily riders by the third year.",
          "verified_absent": true
        }
      ],
      "omitted_by_b": [
        {
          "statement": "Some local business owners oppose the plan.",
          "evidence_quote": "warning it will devastate local businesses along the proposed routes",
          "verified_absent": true
        }
      ]
    },
    "framing_contrasts": [
      {
        "topic": "Council's reaction",
        "phrase_a": "slammed a reckless new transit plan",
        "phrase_b": "voted 7–5 to approve the plan after public comment",
        "note": "A reports opposition as the story; B reports the outcome of the vote."
      },
      {
        "topic": "Impact on businesses",
        "phrase_a": "will devastate local businesses",
        "phrase_b": "business groups asked for a review of delivery access",
        "note": "A states a certain outcome; B reports a specific, attributed request."
      }
    ]
  }
}
```

`omissions.omitted_by_a` means "facts present in B but missing from A". `evidence_quote` is a verbatim quote from the outlet that does have the fact.

**Error cases**

`400 Bad Request`: same shape as `/analyze` (`INVALID_INPUT`), with `details.failing` naming the bad side.

`422 Unprocessable Entity` (`INGESTION_BLOCKED` for article B):
```json
{
  "error": {
    "code": "INGESTION_BLOCKED",
    "message": "Could not retrieve article B. Paste its text instead.",
    "details": {
      "failing": "article_b",
      "url": "https://paywalled.example/news/council-budget",
      "attempts": [
        {
          "tier": "primary",
          "reason": "HTTP 403 from origin (bot protection)"
        },
        {
          "tier": "reader_proxy",
          "reason": "Reader returned fewer than 40 words (paywall)"
        },
        {
          "tier": "rss_fallback",
          "reason": "No rss_fallback payload supplied"
        }
      ]
    }
  },
  "request_id": "req_e5f60718"
}
```

`422 Unprocessable Entity` (`ARTICLE_TOO_SHORT`):
```json
{
  "error": {
    "code": "ARTICLE_TOO_SHORT",
    "message": "Article B has 143 words. Comparison needs at least 200 words per article.",
    "details": {
      "failing": "article_b",
      "url": "https://metrowire.example/brief/council-vote",
      "word_count": 143,
      "min_word_count": 200
    }
  },
  "request_id": "req_f6071829"
}
```

`503 Service Unavailable`: `LLM_TIMEOUT` in the standard envelope.

**Smoke test**
```bash
# Live
curl -s -X POST http://localhost:8000/api/compare \
  -H "Content-Type: application/json" \
  -d '{"article_a": {"url": "https://courier.example/news/council-slams-transit-plan", "text": null, "title": null, "rss_fallback": null}, "article_b": {"url": "https://metrowire.example/city/council-approves-bus-routes", "text": null, "title": null, "rss_fallback": null}}'

# Mock
curl -s -X POST "http://localhost:8000/api/compare?mock=true" \
  -H "Content-Type: application/json" \
  -d '{"article_a": {"url": null, "text": null, "title": null, "rss_fallback": null}, "article_b": {"url": null, "text": null, "title": null, "rss_fallback": null}}'
```

---

## Section 3: Frontend TypeScript Interfaces

```ts
// types.ts — mirrors API_CONTRACT.md exactly

// ---------- Enums ----------
export type SourceTier = "primary" | "reader_proxy" | "rss_fallback" | "manual_paste";

export type Technique =
  | "LOADED_LANGUAGE"
  | "FEAR_APPEAL"
  | "CHERRY_PICKING"
  | "FALSE_DILEMMA"
  | "AD_HOMINEM"
  | "EXAGGERATION"
  | "WEASEL_WORDS"
  | "WHATABOUTISM";

export type Severity = 1 | 2 | 3;
export type Verdict = "LOW" | "MODERATE" | "HIGH";
export type ClaimLabel = "VERIFIABLE" | "UNSUPPORTED" | "OPINION";
export type AlignmentStatus = "UNCHANGED" | "REWRITTEN" | "DELETED" | "MERGED" | "SPLIT";
export type DiffRenderMode = "unchanged" | "inline_diff" | "block_replace";
export type DiffTokenType = "equal" | "delete" | "insert";
export type CacheStatus = "HIT" | "MISS" | "MOCK";
export type MockScenario = "wire_neutral" | "policy_oped" | "viral_tabloid";
export type HealthStatus = "ok" | "degraded";
export type CompareWarning = "length_mismatch";

export type ErrorCode =
  | "INGESTION_BLOCKED"
  | "SSRF_BLOCKED"
  | "INVALID_INPUT"
  | "ARTICLE_TOO_SHORT"
  | "LLM_TIMEOUT"
  | "LLM_RATE_LIMITED"
  | "UPSTREAM_UNAVAILABLE"
  | "INTERNAL_ERROR";

// ---------- Errors ----------
export interface FetchAttempt {
  tier: SourceTier;
  reason: string;
}

export interface ApiErrorDetails {
  field?: string;
  received_non_null_fields?: string[];
  url?: string | null;
  attempts?: FetchAttempt[];
  resolved_ip?: string;
  failing?: "article_a" | "article_b";
  word_count?: number;
  min_word_count?: number;
  timeout_ms?: number;
  stage?: string;
  retry_after_s?: number;
}

export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    details: ApiErrorDetails | null;
  };
  request_id: string;
}

// ---------- GET /health ----------
export interface HealthResponse {
  status: HealthStatus;
  version: string;
  server_time: string;
  llm_configured: boolean;
  llm_model: string | null;
  cache: {
    status: "ready" | "unavailable";
    entries: number;
    file_path: string;
  };
  request_id: string;
}

// ---------- GET /fixtures ----------
export interface FixtureMeta {
  fixture_id: MockScenario;
  title: string;
  outlet: string;
  spectrum_label: string;
  expected_score: number;
  expected_verdict: Verdict;
  word_count: number;
  description: string;
}

export interface ComparisonPreset {
  preset_id: string;
  title: string;
  description: string;
  outlet_a: string;
  outlet_b: string;
  expected_same_event: boolean;
}

export interface FixturesResponse {
  request_id: string;
  fixtures: FixtureMeta[];
  comparison_presets: ComparisonPreset[];
}

// ---------- POST /analyze ----------
export interface RssFallback {
  title: string | null;
  summary: string | null;
  content: string | null;
}

export interface ArticleInput {
  url: string | null;
  text: string | null;
  title: string | null;
  rss_fallback: RssFallback | null;
}

export type AnalyzeRequest = ArticleInput;

export interface AnalyzeQuery {
  mock?: boolean;
  scenario?: MockScenario;
}

export interface ArticleMetadata {
  url: string | null;
  title: string | null;
  author: string | null;
  published_at: string | null;
}

export interface Sentence {
  sentence_id: string; // "S1", "S2", ...
  paragraph_index: number;
  start_offset: number; // UTF-16 code units into canonical_text
  end_offset: number; // exclusive
  text: string;
}

export interface Article {
  canonical_text: string;
  content_hash: string; // SHA-256 hex of UTF-8 canonical_text
  source_tier: SourceTier;
  word_count: number;
  metadata: ArticleMetadata;
  sentences: Sentence[];
}

export interface WeightsApplied {
  density: number;
  rhetoric: number;
  unsupported: number;
  lead_boost_multiplier: number;
  severity_weights: { "1": number; "2": number; "3": number };
}

export interface ScoreBreakdown {
  density_score: number;
  rhetoric_component: number;
  unsupported_ratio: number;
  factual_claim_count: number;
  word_count: number;
  coverage_pct: number;
  weights_applied: WeightsApplied;
  technique_counts: Record<Technique, number>;
  lead_boosted_spans: number;
  deduplicated_clusters_merged: number;
  confidence_note: string;
}

export interface Scoring {
  score: number; // 0.0000 - 1.0000
  verdict: Verdict;
  breakdown: ScoreBreakdown;
}

export interface Span {
  span_id: string;
  technique: Technique;
  severity: Severity;
  exact_quote: string;
  context_before: string;
  sentence_id: string;
  start_offset: number;
  end_offset: number;
  in_headline: boolean;
  lead_boosted: boolean;
  rationale: string;
}

export interface Segment {
  start_offset: number;
  end_offset: number;
  text: string;
  span_ids: string[];
  primary_technique: Technique;
  overlapping_techniques: Technique[];
  max_severity: Severity;
}

export interface ParagraphAnnotation {
  paragraph_index: number;
  start_offset: number;
  end_offset: number;
  segments: Segment[];
}

export interface Annotations {
  spans_by_id: Record<string, Span>;
  paragraphs: ParagraphAnnotation[];
  dropped_spans_count: number;
}

export interface Claim {
  id: string;
  exact_quote: string;
  claim_summary: string;
  label: ClaimLabel;
  cited_source: string | null;
  verification_query: string;
  search_url: string;
  start_offset: number | null;
  end_offset: number | null;
}

export interface DiffToken {
  type: DiffTokenType;
  value: string;
}

export interface AlignmentBlock {
  block_id: string;
  original_sentence_ids: string[];
  paragraph_index: number;
  original_text: string;
  neutral_text: string;
  status: AlignmentStatus;
  changed: boolean;
  edit_summary: string | null;
  render_mode: DiffRenderMode;
  change_ratio: number;
  diff_tokens: DiffToken[];
}

export interface RewriteStats {
  total_sentences: number;
  rewritten_count: number;
  rejected_patches_count: number;
}

export interface Rewrite {
  stats: RewriteStats;
  alignment_blocks: AlignmentBlock[];
}

export interface Telemetry {
  cache_status: CacheStatus;
  processing_latency_ms: number;
  degraded_mode: boolean;
  degraded_reason: string | null;
}

export interface AnalyzeResponse {
  request_id: string;
  analyzed_at: string;
  article: Article;
  scoring: Scoring;
  annotations: Annotations;
  claims: Claim[];
  rewrite: Rewrite;
  telemetry: Telemetry;
}

// Response headers on POST /analyze
export interface AnalyzeResponseHeaders {
  "x-truthlens-cache": CacheStatus;
  "x-request-id": string;
}

// ---------- POST /compare ----------
export interface CompareRequest {
  article_a: ArticleInput;
  article_b: ArticleInput;
}

export interface CompareQuery {
  mock?: boolean;
}

export interface TechniqueCount {
  technique: Technique;
  count: number;
}

export interface ArticleSummary {
  url: string | null;
  outlet: string | null;
  headline: string | null;
  word_count: number;
  bias_score: number;
  verdict: Verdict;
  summary: string;
  top_techniques: TechniqueCount[];
}

export interface Omission {
  statement: string;
  evidence_quote: string;
  verified_absent: boolean;
}

export interface FramingContrast {
  topic: string;
  phrase_a: string;
  phrase_b: string;
  note: string;
}

export interface Comparison {
  shared_facts: string[];
  omissions: {
    omitted_by_a: Omission[];
    omitted_by_b: Omission[];
  };
  framing_contrasts: FramingContrast[];
}

export interface StageLatency {
  stage1_parallel_ms: number;
  stage2_synthesis_ms: number;
  stage3_verify_ms: number;
}

export interface CompareResponse {
  request_id: string;
  compared_at: string;
  same_event: boolean;
  mismatch_reason: string | null;
  warnings: CompareWarning[];
  stage_latency_ms: StageLatency;
  article_a: ArticleSummary;
  article_b: ArticleSummary;
  comparison: Comparison;
}
```
