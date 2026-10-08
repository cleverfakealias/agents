# Measured long-context degradation in LLMs: benchmarks and papers, 2025 to Oct 2026

Scope note: Research date 2026-10-07. Items marked BACKGROUND are 2023-2024 results. Items marked "not re-fetched" come from well-known paper abstracts that I did not re-open in this session; the report writer should treat their exact wording as needing a spot check. Vendor-card numbers appear only where an independent or secondary benchmark source relays them, and they are labeled "vendor".

## 1. What the main 2025-2026 long-context benchmarks show

### Takeaway
Every benchmark that removes literal-match shortcuts or adds multi-step work shows degradation that starts far below the advertised window: often by 8K to 32K tokens for harder tasks, and with steep drops past about 128K to 256K for 2026 frontier models. Simple single-needle retrieval is close to solved at 1M tokens, so simple NIAH (needle in a haystack) scores overstate usable context.

### Cited Findings

**Chroma "Context Rot" (technical report, 2025-07-14)**
- Hong, Troynikov and Huber tested 18 LLMs (5 Anthropic, 7 OpenAI, 3 Google, 3 Alibaba; for example GPT-4.1, Claude 4, Gemini 2.5, Qwen3) with 194,480 calls. Performance is non-uniform across input length even on deliberately simple tasks. — [Chroma Context Rot](https://www.trychroma.com/research/context-rot)
- NIAH variant: 8 input lengths up to each model's maximum window, 11 needle positions. Needle-question pairs with lower semantic similarity degrade faster as length grows. In this setup, needle position showed no notable effect. — [Chroma Context Rot](https://www.trychroma.com/research/context-rot)
- Distractors: 1 distractor lowers accuracy versus baseline. 4 distractors lower it further. Distractors are not equal: some are much more often echoed in hallucinated answers. — [Chroma Context Rot](https://www.trychroma.com/research/context-rot)
- Haystack structure: shuffled (incoherent) haystacks gave better performance than logically coherent haystacks, averaged over all 18 models. — [Chroma Context Rot](https://www.trychroma.com/research/context-rot)
- LongMemEval: focused prompts (about 300 tokens) scored significantly higher than full prompts (about 113K tokens) for all models. Claude showed the largest focused-vs-full gap, mainly from abstentions. — [Chroma Context Rot](https://www.trychroma.com/research/context-rot)
- Repeated-words copy task (25 to 10,000 words): accuracy declined consistently with length. Failure-mode onsets: Gemini random words from about 500 to 750 words; Claude Opus 4 and GPT-4.1 behavior changes (commentary, refusals) from about 2,500 words; Qwen3-8B random outputs from about 5,000 words. — [Chroma Context Rot](https://www.trychroma.com/research/context-rot)
- Model-family behavior: Claude models had the lowest hallucination rates and tended to abstain. GPT models had the highest hallucination rates with confident wrong answers under distractors. Gemini and Qwen produced random or degenerate output at longer lengths. — [Chroma Context Rot](https://www.trychroma.com/research/context-rot)
- Limitation: most accuracy values are shown only in plots. The report does not state exact token thresholds. — [Chroma Context Rot](https://www.trychroma.com/research/context-rot)

**NoLiMa (Modarressi et al., ICML 2025; arXiv Feb 2025)**
- NoLiMa removes literal word overlap between question and needle. Models do well under 1K tokens. At 32K, 11 of 13 models (ICML version) drop below 50% of their short-context baseline. The arXiv v1 says 10 of 12. — [ICML 2025 proceedings](https://proceedings.mlr.press/v267/modarressi25a.html); [HF paper page](https://huggingface.co/papers/2502.05167)
- GPT-4o, one of the best, fell from 99.3% (short baseline) to 69.7% at 32K. — [ICML 2025 proceedings](https://proceedings.mlr.press/v267/modarressi25a.html)
- Reasoning models and CoT (chain-of-thought) prompting do not remove the drop. — [ICML 2025 poster](https://icml.cc/virtual/2025/poster/46685)

**OpenAI-MRCR v2, 8-needle (multi-round coreference; numbers relayed by a 2026-03-15 survey post and by aggregators)**
- GPT-5.2 (vendor, OpenAI blog, xhigh reasoning) by length bin: 4-8K 98.2%, 8-16K 89.3%, 16-32K 95.3%, 32-64K 92.0%, 64-128K 85.6%, 128-256K 77.0%. — [yage.ai survey, 2026-03-15](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- GPT-5.4 (vendor): 4-8K 97.3%, 8-16K 91.4%, 16-32K 97.2%, 32-64K 90.5%, 64-128K 86.0%, 128-256K 79.3%, 256-512K 57.5%, 512K-1M 36.6%. — [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- Claude Opus 4.6 (vendor, Anthropic system card): 93.0% at 256K aggregate, 76.0% at 1M. Claude Sonnet 4.6: 90.3% at 256K, 65.8% at 1M. Claude Sonnet 4.5: 10.8% at 256K, 18.5% at 1M. — [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- Gemini 3 Pro (independent, contextarena.ai): 45.4% at 256K aggregate, 24.5% at 1M. Gemini 3 Flash: 58.5% at 256K, 32.6% at 1M. Gemini 3.1 Pro (vendor): 84.9% at 128K, 26.3% at 1M. Gemini 2.5 Pro (vendor, June 2025): about 58% at 128K or less, 16.4% at 1M. — [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- Vendors use different reasoning settings, so cross-vendor MRCR numbers are not directly comparable. — [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- Context Arena reports MRCR as AUC@128K (trapezoidal area over 8K to 128K bins). A 2026-05-06 aggregator snapshot shows a top AUC@128K of 91.71% but a top AUC@1M of only about 50.5%. Model names were missing in the extracted text. — [BenchmarkList Context Arena mirror](https://benchmarklist.com/benchmarks/context_arena/); [Step 3.5 Flash report describing the protocol](https://arxiv.org/pdf/2602.10604)
- Aggregator 256K fixed-length MRCR v2 8-needle (sampled 2026-08-12): GPT-5.6 Sol (Max) 93.8%, Qwen3.8 Max 92.9%. Not independently verified. — [BenchmarkList MRCR 256K](https://benchmarklist.com/benchmarks/mrcr_v2_8_needle_256k/)

**GraphWalks (multi-hop graph traversal, relayed from Anthropic Sonnet 4.6 system card)**
- At 1M tokens: Claude Opus 4.6 Parents 71.1%, BFS about 40%. GPT-5.2 Parents 72.0%, BFS about 40% (vendor, relayed). — [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)

**Fiction.LiveBench (deep comprehension of long stories; 36 questions, 30 stories)**
- Stories are cut to many lengths and each model is tested at each length. — [Epoch AI benchmark page](https://epoch.ai/benchmarks/fictionlivebench)
- Aggregators use the 16K column as the headline. Snapshot 2026-08-12: GPT-5 (medium) and o3-pro (medium) 97.2% at 16K; Grok 4 94.4%; Kimi K2.5 86.1%. Open-weight (Jan 2026 data): Kimi K2.5 86.1%, DeepSeek V3.2 Exp 83.3%. — [DataLearner Fiction.LiveBench](https://www.datalearner.com/en/benchmarks/fiction-livebench); [llmrun](https://llmrun.dev/benchmark/fiction-livebench)
- Snapshot 2026-09-10 lists o3 at 100%, GPT-5 96.9%, o3-pro 88.9%, Kimi K2.5 78.1% (metric/length not clear). — [benchmarklist Fiction.LiveBench](https://benchmarklist.com/benchmarks/fiction_livebench/)

**LongCodeBench (arXiv 2505.07897, May 2025, revised Oct 2025): code QA and bug fixing, 32K to 1M**
- LongSWE-Bench (bug fixing, % solved): Claude 3.5 Sonnet 29 (32K), 19 (64K), 15 (128K), 3 (256K). Gemini 2.5 Pro 23, 25, 22, 24 (32K to 256K), then 12 (512K), 7 (1M). Gemini 2 Flash 10 (32K) to 3 (256K) to 2 (1M). GPT-4o 11, 6, 5 (32K to 128K). — [LongCodeBench HTML v2](https://arxiv.org/html/2505.07897v2)
- LongCodeQA (multiple-choice repo QA) is much flatter: GPT-4.1 72.6% (32K) to 80.0% (1M); Gemini 2.5 Pro 75.2% to 69.8%; Qwen2.5-14B 70.2% (512K) to 40.0% (1M); Jamba 1.5 Large 72.8% (128K) to 54.2% (256K). — [LongCodeBench HTML v2](https://arxiv.org/html/2505.07897v2)
- Authors' view: results at long context cannot be inferred from short-context results. — [LongCodeBench](https://arxiv.org/pdf/2505.07897)

**New 2025-2026 papers and benchmarks**
- "Context Length Alone Hurts LLM Performance Despite Perfect Retrieval" (Du et al., arXiv 2510.05381, Oct 2025, EMNLP 2025 Findings): across 5 models on math, QA and code, performance drops 13.9% to 85% as input length grows, inside the claimed windows. The drop persists when filler is whitespace, when irrelevant tokens are masked, and when evidence sits right before the question. Reciting evidence first gave up to +4% for GPT-4o on RULER. — [arXiv 2510.05381](https://arxiv.org/abs/2510.05381)
- LongBench Pro (arXiv 2601.02872, Jan 2026): overall Gemini 2.5 Pro 73.42, GPT-5 72.61, Claude 4 Sonnet 69.87. Gemini 2.5 Pro scores 74.50 at 8K vs 71.77 at 256K. — [arXiv 2601.02872](https://arxiv.org/abs/2601.02872); numbers relayed by [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- LOCA-bench (Zeng, Huang, He, arXiv 2602.07962, Feb 2026): agent tasks where context grows from environment state with task semantics fixed. Accuracy drops quickly as environment length grows. Search-result summary of the paper: frontier models get about 2 to 3 times the accuracy of open models at long settings, and GPT-5.2-medium stays relatively strong at 256K. Context-management strategies substantially improve success. — [arXiv 2602.07962](https://arxiv.org/abs/2602.07962)
- Context-Length Robustness in QA (Dhara and Sheth, arXiv 2603.15723, Mar 2026): adding irrelevant text with the answer kept intact gives consistent degradation. HotpotQA (multi-hop) degrades nearly 2 times as much as SQuAD (single-hop) for the same context growth. — [arXiv 2603.15723](https://arxiv.org/abs/2603.15723)
- Classifier Context Rot (Martin and Roger, arXiv 2605.12366, May 2026): Opus 4.6, GPT-5.4 and Gemini 3.1 as monitors of coding-agent transcripts. When a dangerous action follows about 800K tokens of benign activity, miss rates are about 2 to 30 times higher than for the action alone. Periodic reminders in the transcript partly mitigate this. — [arXiv 2605.12366](https://arxiv.org/abs/2605.12366)
- MECW, "Context Is What You Need" (Paulsen, arXiv 2509.21361, Sep 2025, rev. Apr 2026): some top models failed with as little as 100 tokens; most showed severe degradation by about 1,000 tokens; all fell short of advertised windows by up to 99%. Models are not named in the abstract. — [arXiv 2509.21361](https://arxiv.org/abs/2509.21361)

**BACKGROUND (2023-2024), not re-fetched**
- RULER (Hsieh et al., NVIDIA, 2024): almost all models pass vanilla NIAH, yet only about half of models claiming 32K+ hold satisfactory performance at 32K. Effective length is the longest length that beats a Llama-2-7B 4K baseline of 85.6%. — [RULER GitHub](https://github.com/NVIDIA/RULER); [arXiv 2404.06654](https://arxiv.org/abs/2404.06654)
- RULER 128K scores relayed in 2026: Jamba-1.5-large 95.1%, Gemini 1.5 Pro 94.4%, GPT-4 81.2%. — [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- BABILong (Kuratov et al., NeurIPS 2024 D&B): popular LLMs effectively use only 10% to 20% of the context, and performance falls sharply as reasoning complexity rises. — [arXiv 2406.10149](https://arxiv.org/abs/2406.10149)
- LongBench v2 (Bai et al., Dec 2024; 503 questions, 8K to 2M words): human experts 53.7% under time limit. Leaderboard relayed in 2026: Gemini 2.5 Pro 63.3%, GPT-4o 46.0%, Claude 3.5 Sonnet 41.0%. — [arXiv 2412.15204](https://arxiv.org/abs/2412.15204); [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- HELMET (Yen et al., ICLR 2025): synthetic NIAH-style recall does not reliably predict downstream long-context task performance. — [arXiv 2410.02694](https://arxiv.org/abs/2410.02694)
- Michelangelo (Vodrahalli et al., Google, Sep 2024) introduced Latent List, MRCR and IDK tasks. It reported degradation that starts at relatively short lengths for frontier models of that time. — [arXiv 2409.12640](https://arxiv.org/abs/2409.12640)
- Loong / "Leave No Document Behind" (2024): GPT-4o and Qwen2-72B-Instruct start degrading in the 50K to 100K band despite 128K training context. — [arXiv 2406.17419](https://arxiv.org/pdf/2406.17419)

### Inferences
- Across benchmarks, three tiers appear. (a) Literal single-needle retrieval: near flat to 1M for 2026 frontier models. (b) Multi-needle or semantic retrieval (MRCR, NoLiMa): gentle decline to about 128K, then steeper. (c) Multi-step work, bug fixing, agents, monitoring: degradation visible from 32K to 128K and severe by 256K+.
- For 2026 frontier models, MRCR bins suggest a "knee" around 128K to 256K. GPT-5.4 loses about 7 to 11 points from 8K to 128K, then about 22 more by 256-512K and about 43 more by 512K-1M.
- LongCodeBench suggests bug-fixing quality for a strong 2025 model (Claude 3.5 Sonnet) halves by 128K. That model had a 200K window, so 128K was about 64% fill.

### Gaps
- I could not load the live Fiction.LiveBench table, so per-length (60K, 120K, 192K) numbers for 2026 models are missing.
- I could not reach contextarena.ai directly. Aggregator snapshots lack model names for AUC rows.
- I found no 2025-2026 updates to RULER, HELMET, LOFT, BABILong or Michelangelo leaderboards with current frontier models.
- LOCA-bench per-length numbers were not visible in the abstract.

## 2. Effective context length versus advertised window

### Takeaway
Measured effective context is usually a fraction of the advertised window: about 50% for open models on RULER, about 10% to 20% on BABILong reasoning, and for 2026 frontier 1M-token models, about 128K to 256K before multi-needle recall falls below about 80% to 90%.

### Cited Findings
- Open-source LLMs' effective context typically does not exceed half of their training length. Llama 3.1 70B has 64K effective on RULER despite a 128K window. — [An et al., ICLR 2025, arXiv 2410.18745](https://arxiv.org/html/2410.18745v1)
- BACKGROUND, not re-fetched: RULER reports GPT-4 (128K claimed) effective at 64K; Gemini 1.5 Pro (1M claimed) effective beyond 128K, the top tested length. — [RULER GitHub](https://github.com/NVIDIA/RULER)
- GPT-5.4 (1M window, vendor MRCR): 86.0% at 64-128K, 79.3% at 128-256K, 57.5% at 256-512K, 36.6% at 512K-1M. About 90% holds only up to about 64K. — [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- Claude Opus 4.6 (1M window, vendor MRCR): 93.0% at 256K, 76.0% at 1M. — [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- Gemini 3.1 Pro (1M window, vendor MRCR): 84.9% at 128K, 26.3% at 1M. Gemini 3 Pro (independent): 45.4% at 256K. — [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- NoLiMa: GPT-4o (128K window) falls from 99.3% to 69.7% at 32K, which is 25% of its window. — [ICML 2025](https://proceedings.mlr.press/v267/modarressi25a.html)
- MECW paper: all tested models fell short of advertised windows by up to 99%, and the effective window shifts with problem type. — [arXiv 2509.21361](https://arxiv.org/abs/2509.21361)
- Opinion (blog-level, not peer-reviewed): several 2026 vendor and blog pages claim usable context is about 50% to 70% of the advertised maximum. I could not trace this to a primary RULER result. — [elvex 2026 comparison](https://www.elvex.com/blog/context-length-comparison-ai-models-2026)
- Unverified secondary note: single-needle retrieval at 1M tokens reported as "essentially solved" (100%) in a 2026 Classical Chinese retrieval study, arXiv 2605.02173. — [speedcell4 research notes](https://github.com/speedcell4/ai-research-2026/blob/main/notes/long-context.md)

### Inferences
- For 1M-window frontier models in 2026, "90% multi-needle recall" sits near 64K to 256K depending on vendor. That is roughly 6% to 25% of the window.
- For 128K to 200K window models of 2024-2025, effective length is near 50% of the window on RULER-style tasks and lower on semantic or reasoning tasks.

### Gaps
- No single independent source gives a 2026 cross-vendor "effective context" table with the same settings.
- Vendor MRCR figures use different reasoning settings and are not directly comparable.

## 3. Absolute token count versus percentage of the advertised window

### Takeaway
The evidence is mixed. Most degradation results are reported and best explained in absolute tokens, since the same token count hurts models with very different windows. But one 2025 paper shows that position-bias shape depends on fill fraction, with a change near 50% of the window.

### Cited Findings
- Veseli, Chibane, Toneva and Koller (arXiv 2508.07479, COLM 2025) measure input length relative to each model's window. The lost-in-the-middle effect is strongest when inputs fill up to 50% of the window. Above about 50%, primacy bias weakens, recency stays stable, and a distance-to-end bias replaces the U-shape. — [arXiv 2508.07479](https://arxiv.org/abs/2508.07479)
- The same paper finds that retrieval success is a prerequisite for reasoning, and reasoning position biases are largely inherited from retrieval. — [arXiv 2508.07479](https://arxiv.org/abs/2508.07479)
- An et al. tie effective length to how often each position index was seen in training (left-skewed position frequency). Models with similar exposure to position indices reach similar effective lengths even if their training lengths differ. Most failures occur in the first L/3 of the document. — [arXiv 2410.18745](https://arxiv.org/html/2410.18745v1); [JHU course slides](https://self-supervised.cs.jhu.edu/fa2025/files/presentations/ContextLength-Oct14.pdf)
- Absolute-length evidence: NoLiMa drops are tied to 32K across models with windows from 128K to 1M+. — [ICML 2025](https://proceedings.mlr.press/v267/modarressi25a.html)
- Absolute-length evidence: Du et al. show drops even when filler is whitespace or masked, which points to sheer length, not window fill. — [arXiv 2510.05381](https://arxiv.org/abs/2510.05381)
- Absolute-length evidence: Chroma repeated-words failures begin at 500 to 5,000 words, a tiny fraction of every tested window. — [Chroma Context Rot](https://www.trychroma.com/research/context-rot)
- Same-family different-window evidence: Claude Sonnet 4.5 MRCR 10.8% at 256K vs Sonnet 4.6 90.3% at 256K (both vendor). This shows generation, not window size, drives the gap. — [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)

### Inferences
- A meter that uses only percent-of-window would under-warn on 1M-window models. A 200K session is only 20% of 1M but already sits in the MRCR decline zone for GPT-5.4 and Gemini 3.x.
- A hybrid rule fits the data best: an absolute floor (for example, a caution near 32K to 64K for reasoning-heavy work, and a stronger warning near 128K to 256K) plus a fill-fraction trigger near 50% of window where position bias changes shape.

### Gaps
- I found no paper that holds the model fixed and changes only the configured window to test absolute vs relative directly.
- The 2508.07479 abstract does not name its models or give effect sizes.

## 4. Dependence on task type

### Takeaway
Degradation strongly depends on task type. Literal retrieval is nearly flat, semantic retrieval and distractor-rich input drop by 32K, multi-hop drops about 2 times faster than single-hop, and code repair and agent work fall hardest.

### Cited Findings
- Literal vs semantic retrieval: GPT-4o 99.3% to 69.7% at 32K once literal overlap is removed (NoLiMa). — [ICML 2025](https://proceedings.mlr.press/v267/modarressi25a.html)
- Semantic similarity: lower needle-question similarity degrades faster with length (Chroma). — [Chroma Context Rot](https://www.trychroma.com/research/context-rot)
- Distractors: 1 distractor hurts, 4 hurt more, across 18 models (Chroma). — [Chroma Context Rot](https://www.trychroma.com/research/context-rot)
- Multi-hop vs single-hop: HotpotQA shows nearly 2 times the degradation of SQuAD for equal context growth (2026). — [arXiv 2603.15723](https://arxiv.org/abs/2603.15723)
- Graph reasoning at 1M: Parents (one hop) about 71% to 72%, BFS (multi-hop) about 40% for both Opus 4.6 and GPT-5.2 (vendor, relayed). — [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- Code: LongCodeQA (choose an answer) stays roughly flat to 1M for GPT-4.1 and Gemini 2.5 Pro. LongSWE-Bench (write a fix) falls from 29% to 3% for Claude 3.5 Sonnet between 32K and 256K, and Gemini 2.5 Pro halves between 256K and 512K. — [LongCodeBench](https://arxiv.org/html/2505.07897v2)
- Agents: LOCA-bench accuracy drops quickly as environment context grows. Context-management strategies recover much of it. — [arXiv 2602.07962](https://arxiv.org/abs/2602.07962)
- Monitoring long coding-agent transcripts: 2 to 30 times higher miss rates after about 800K tokens. — [arXiv 2605.12366](https://arxiv.org/abs/2605.12366)
- BACKGROUND, not re-fetched: BABILong reports sharper declines as reasoning complexity rises. — [arXiv 2406.10149](https://arxiv.org/abs/2406.10149)
- Math, QA and code all drop 13.9% to 85% with length even with perfect retrieval. — [arXiv 2510.05381](https://arxiv.org/abs/2510.05381)

### Inferences
- A coding assistant session is closer to "code repair plus agent plus distractor-rich" than to NIAH. Thresholds should follow the steeper curves (LongSWE-Bench, LOCA-bench, MRCR) and not the flat NIAH or multiple-choice curves.

### Gaps
- No 2026 independent per-length LongSWE-style results for Claude 4.x, GPT-5.x or Gemini 3.x were found.

## 5. Proposed mechanisms

### Takeaway
Papers propose five main causes: position bias, undertrained far positions (RoPE and training-length distribution), attention dilution from length itself, distractor interference, and context structure effects. Several are measured, not only theorized.

### Cited Findings
- Position bias: lost-in-the-middle is strongest up to 50% window fill. Beyond that, a distance-to-end bias dominates. — [arXiv 2508.07479](https://arxiv.org/abs/2508.07479)
- BACKGROUND, not re-fetched: Liu et al. 2023 first showed the U-shaped "lost in the middle" curve for multi-document QA. — [Lost in the Middle](https://cs.stanford.edu/~nfliu/papers/lost-in-the-middle.arxiv2023.pdf)
- Training-length distribution and RoPE: far position indices are undertrained (left-skewed position frequency). STRING shifts well-trained positions at inference and gains over 10 points on RULER and InfiniteBench for Llama 3.1 70B and Qwen2 72B without training. — [arXiv 2410.18745](https://arxiv.org/html/2410.18745v1); [STRING GitHub](https://github.com/HKUNLP/STRING)
- Length itself (attention dilution): drop persists with whitespace filler and with masked irrelevant tokens. — [arXiv 2510.05381](https://arxiv.org/abs/2510.05381)
- Attention without literal cues: NoLiMa authors attribute the drop to attention difficulty in long contexts when literal matches are absent. — [ICML 2025](https://proceedings.mlr.press/v267/modarressi25a.html)
- Distractors and structure: distractors drive hallucinated answers, and coherent haystacks hurt more than shuffled ones. — [Chroma Context Rot](https://www.trychroma.com/research/context-rot)
- Mid-training on long code: OctoLong (arXiv 2608.05141, Aug 2026) proposes mid-training on cross-repository code contexts to improve long-context modeling. I only saw its title. — [arXiv 2608.05141](https://arxiv.org/pdf/2608.05141)

### Inferences
- Because masking irrelevant tokens does not remove the drop, compaction or summarizing (reducing token count) should help more than reordering alone.

### Gaps
- No 2026 paper found that quantifies the share of each mechanism in frontier models.

## 6. Is the problem shrinking or growing in 2026?

### Takeaway
It is shrinking for retrieval within about 256K, but not solved at 1M or for reasoning, agent and monitoring tasks. The gap between windows (now 1M for all three major vendors) and reliable use remains large.

### Cited Findings
- Anthropic MRCR at 256K jumped from 10.8% (Sonnet 4.5) to 90.3% (Sonnet 4.6) and 93.0% (Opus 4.6) (vendor). — [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- Gemini MRCR at 128K: about 58% (2.5 Pro, 2025) to 84.9% (3.1 Pro, 2026). At 1M: 16.4% to 26.3% (vendor). — [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- OpenAI MRCR 128-256K: GPT-5.2 77.0% to GPT-5.4 79.3% (vendor). — [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- Survey opinion (2026-03-15): all three major providers offer 1M windows, but benchmark data shows "massive reliability gaps" at 1M. — [yage.ai survey](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- Aggregator, May 2026: top AUC@128K 91.71% vs top AUC@1M about 50.5%. — [BenchmarkList Context Arena](https://benchmarklist.com/benchmarks/context_arena/)
- Aggregator, Aug 2026: best 256K MRCR 8-needle about 93.8% (GPT-5.6 Sol Max). Unverified. — [BenchmarkList MRCR 256K](https://benchmarklist.com/benchmarks/mrcr_v2_8_needle_256k/)
- Growing in agentic and safety settings: May 2026 frontier monitors (Opus 4.6, GPT-5.4, Gemini 3.1) still miss 2 to 30 times more often at about 800K tokens. — [arXiv 2605.12366](https://arxiv.org/abs/2605.12366)
- Feb 2026 LOCA-bench: steep agent accuracy drops with context growth across models. — [arXiv 2602.07962](https://arxiv.org/abs/2602.07962)

### Inferences
- Warning thresholds tuned to 2024 models (32K to 64K) are likely conservative for 2026 frontier retrieval, but still fit reasoning and agentic coding tasks. A threshold band near 128K to 256K for strong warnings matches 2026 MRCR knees.

### Gaps
- Sept to Oct 2026 independent results for the newest models (for example GPT-5.6, Claude successors, Gemini 3.x updates) were not verifiable from primary sources in this session.
- Fiction.LiveBench aggregator boards appear stale and show mostly 2025 models.
