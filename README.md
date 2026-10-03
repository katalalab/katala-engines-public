# trust-scorer

Two small TypeScript modules for scoring how much a *claim* deserves to be
trusted, and for running that scoring across several independent evaluators
without silently deleting the ones that disagree.

- **`TrustScorer`** — deterministic, no network, no LLM. Turns a `Claim`
  (content + source metadata) into four 0–1 axis scores, a weighted composite,
  and a letter grade with a human-readable rationale.
- **`ConsensusEngine`** — runs N `TrustAgent`s in parallel over the same claim,
  measures how far apart they landed, optionally calls a tiebreaker, and
  returns a confidence-weighted result **plus** the minority opinions and an
  explicit list of what the score does not capture.

Dependencies: `zod`. That's it.

## The four axes

| Axis | Question | How it is scored |
| --- | --- | --- |
| `freshness` | How old is this? | `exp(-ageHours / halfLife)`, half-life per domain |
| `provenance` | Who said it, first- or second-hand? | source-type baseline (primary 0.9 → generated 0.2), +0.05 for a named author, +0.05 for a URL |
| `verification` | Confirmed or assumed? | base 0.3, corroborating sources add with diminishing returns, contradicting sources subtract |
| `accessibility` | Can someone else go and check? | base 0.5, +0.3 URL, +0.1 publish date, +0.1 primary source |

Domain half-lives (hours) are tunable via the exported `DOMAIN_HALF_LIFE` map:
`crypto: 6, finance: 12, politics: 24, entertainment: 48, tech: 72,
science: 720, general: 168`. A crypto claim from yesterday scores near zero on
freshness; a physics paper from last month does not.

Composite weights default to `provenance 0.35, verification 0.35,
freshness 0.20, accessibility 0.10` and are re-normalised to sum to 1 if you
pass your own.

## Usage

```ts
import { TrustScorer, type Claim } from "trust-scorer";

const scorer = new TrustScorer();

const claim: Claim = {
  id: "c1",
  content: "The service had a 4-hour outage on Tuesday.",
  source: {
    type: "primary",
    author: "vendor status page",
    url: "https://example.com/status/2026-01-13",
    publishedAt: "2026-01-13T09:00:00.000Z",
  },
  domain: "tech",
  retrievedAt: new Date().toISOString(),
  language: "en",
};

const result = scorer.score(claim);
// { compositeScore: 0.86, grade: "A", axes: {...}, reasoning: "…" }
```

`scoreBatch(claims)` groups by `domain` and treats same-domain claims from a
*different* author as corroborating. That is a deliberately crude proxy — see
Limitations.

### Multi-agent consensus

```ts
import { ConsensusEngine, RuleBasedTrustAgent, LLMTrustAgent } from "trust-scorer";

const engine = new ConsensusEngine(
  [new RuleBasedTrustAgent("rules"), new LLMTrustAgent("llm-a", "some-model", myAdapter)],
  new LLMTrustAgent("tiebreak", "some-other-model", myOtherAdapter),
  { divergenceThreshold: 0.15 },
);

const consensus = await engine.evaluate(claim);
consensus.consensus; // "unanimous" | "majority" | "tiebreaker" | "deadlock"
consensus.divergence; // max score spread across agents
consensus.dissent;    // agents >0.2 from the final score, kept verbatim
consensus.caveats;    // what this number cannot see
```

`LLMTrustAgent` takes an `LLMTrustAdapter` you implement — this package ships
no provider SDK and makes no network calls. `MockTrustAgent` returns a fixed
score and is what the tests use.

Divergence above `divergenceThreshold` (default 0.15) with no tiebreaker
configured yields `consensus: "deadlock"` rather than a fabricated agreement.
Agents that throw or exceed `timeoutMs` (default 30s) are dropped; if fewer
than `minAgents` (default 2) survive, `evaluate` throws instead of returning a
one-agent "consensus".

## Limitations

Read these before trusting the number.

- **Corroboration detection is a heuristic, not semantics.** `scoreBatch`
  counts a same-domain claim by a different author as support. Two articles
  that contradict each other will still corroborate each other here. Real
  contradiction detection needs an embedding or NLI step you have to supply.
- **`divergence` is max−min, not variance.** One outlier among ten agreeing
  agents reads the same as a genuine 50/50 split.
- **The weights are chosen, not learned.** 0.35/0.35/0.2/0.1 and the domain
  half-lives are opinions with a plausible shape, not fitted parameters. Tune
  them for your corpus; do not present the output as calibrated.
- **`freshness` never reaches 0 and provenance is capped at 1.0.** The
  composite is bounded to roughly 0.1–1.0 in practice, so grade `F` is rare.
- **The letter grade is a display convenience.** Nothing downstream should
  branch on it that could not branch on `compositeScore`.

## Tests

Use Node.js 24 for development. The locked test tools require a newer Node.js
version than the package's runtime minimum. These commands were verified with
Node.js 24.21.0.

```bash
npm ci          # install the versions in package-lock.json
npm test        # vitest
npm run typecheck
```

The tests use fixed claims and mock agents. They do not call an LLM provider.

## Provenance

Extracted from a larger private research project. Only these two modules and
their tests were carried over; nothing else from that project is included.

## License

MIT — see [LICENSE](./LICENSE).

- [Repository hygiene](.gitignore)
