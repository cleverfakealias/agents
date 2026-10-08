# Long-context performance of current frontier models (1M-token class), as of 2026-10-07

Scope note: the research used about 20 web calls. Several primary documents could not be read (the Claude Opus 5.5 system card PDF exceeded the fetch size limit; openai.com returned HTTP 403; fiction.live returned only its navigation). Many 2026 numbers below come from aggregators that cite vendor cards. Each finding is labeled **[vendor]**, **[independent]** or **[aggregator, unverified]**.

## Q1. What does Anthropic publish about long-context performance (Claude 5 family, Haiku 4.5, Claude 4.x)?

### Takeaway
Anthropic's current docs give window sizes and a general warning about "context rot". The Opus 5.5 launch page (2026-09-22) gives no long-context benchmark numbers. The newest Anthropic MRCR figures I could verify are for Opus 4.6 / Sonnet 4.6 (Feb 2026): about 90-93% at 256k and 66-76% at 1M (MRCR v2, 8-needle). These show a real but moderate drop between 256k and 1M.

### Cited Findings
**Window sizes and docs (current, read 2026-10-07)**
- Claude Opus 5.5 was released 2026-09-22. It has a 1M-token context window and 128K max output, priced $4/$20 per MTok **[vendor]** — [Claude Opus 5.5 overview, platform.claude.com](https://platform.claude.com/docs/en/models/opus-5-5/overview)
- The same comparison table lists Fable 5.1, Opus 5.5, Sonnet 5.5 and **Haiku 5.5** all at 1M context, 128K output, knowledge cutoff Jun 2026 **[vendor]** — [Opus 5.5 overview](https://platform.claude.com/docs/en/models/opus-5-5/overview)
- Docs: 1M tokens is "roughly 555k words or 2.5M Unicode characters on the current tokenizer (introduced with Claude Opus 4.7)". Older models fit about 750k words in 1M tokens **[vendor]** — [Opus 5.5 overview](https://platform.claude.com/docs/en/models/opus-5-5/overview). Implication for a meter: token counts are not comparable across the Opus 4.7 tokenizer boundary.
- 1M-window models listed: Fable 5.1, Mythos 5.1, Fable 5, Mythos 5, Opus 5.5, Opus 5, Opus 4.8, Opus 4.7, Opus 4.6, Sonnet 5.5, Sonnet 5, Sonnet 4.6, Haiku 5.5, Mythos Preview. "Other Claude models, including Claude Sonnet 4.5 (deprecated), have a 200k-token context window." 1M is the default with no beta header. Long-context requests use standard pricing, except Haiku 5.5, where prompts over 100,000 tokens cost more **[vendor]** — [Context windows doc](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- Docs quote: "more context isn't automatically better. As token count grows, accuracy and recall degrade, a phenomenon known as *context rot*." The docs give no threshold in tokens or percent **[vendor]** — [Context windows doc](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- Context awareness: Sonnet 5, Sonnet 4.6, Sonnet 4.5 and Haiku 4.5 receive `<budget:token_budget>` and, after each tool call, `<system_warning>Token usage: 35000/200000; 165000 remaining</system_warning>`. Opus 4.7 and later Opus, Sonnet 5.5, Fable 5.1, Mythos 5.x, Fable 5 and Haiku 5.5 "don't receive these injected tags". They can get an explicit budget through "task budgets" (beta) **[vendor]** — [Context windows doc](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- Server-side compaction is "the primary strategy for context management" for long conversations. It is in beta for Claude 4.6 and later models. Context editing offers tool result clearing and thinking block clearing **[vendor]** — [Context windows doc](https://platform.claude.com/docs/en/build-with-claude/context-windows)
- On Opus 4.5+ and Sonnet 4.6+ (and the 5.x family), previous thinking blocks are kept by default and count toward the window. Earlier models and Haiku through 4.5 strip them **[vendor]** — [Context windows doc](https://platform.claude.com/docs/en/build-with-claude/context-windows). Implication: a meter on newer models fills faster per turn.

**Opus 5.5 launch page (2026-09-22)**
- The announcement contains no MRCR, GraphWalks or needle results and no long-context table. It mentions "long sessions", "long and sprawling jobs", a tester session that "stayed on task for over 18 hours", and a WANDR footnote that Claude ran with "a 980k-token task budget" **[vendor]** — [Claude Opus 5.5 announcement](https://www.anthropic.com/claude-opus-5-5)
- An aggregator says Sonnet 5.5 benchmarks were only promised "in the coming weeks" and reports no long-context numbers for Opus 5.5, Fable 5.1, Sonnet 5.5 or Opus 5 **[aggregator]** — [Kingy AI](https://kingy.ai/blog/claude-opus-5-5-specs-benchmarks-pricing-comparison/)
- A BenchLM comparison page has MRCR v2 rows for Opus 5.5 in the 256K-512K and 512K-1M bands, but the Opus 5.5 values did not appear in the extracted text **[aggregator, unverified]** — [BenchLM Opus 5.5 vs GPT-6 Astra](https://benchlm.ai/compare/claude-opus-5-5-vs-gpt-6-astra)

**Opus 4.6 / Sonnet 4.6 (Feb 2026), the newest verified Anthropic MRCR numbers**
- Opus 4.6 (released 2026-02-05) scores 76% on MRCR v2 8-needle 1M. Sonnet 4.5 scores 18.5% on the same test. Anthropic calls this "a qualitative shift" in how much context a model can use "while maintaining peak performance". The page also says context rot means "performance degrades as conversations exceed a certain number of tokens" **[vendor]** — [Anthropic, Introducing Claude Opus 4.6](https://www.anthropic.com/news/claude-opus-4-6)
- At launch, the Opus 4.6 1M window was beta, and prompts over 200k tokens cost $10/$37.50 per MTok **[vendor]** — [Opus 4.6 announcement](https://www.anthropic.com/news/claude-opus-4-6). (Current docs say 1M is now standard pricing.)
- A March 2026 compilation of system card numbers: Opus 4.6 93.0% (256k aggregate) to 76.0% (1M), max thinking. Sonnet 4.6 90.3% (256k) to 65.8% (1M). Sonnet 4.5 10.8% (256k) and 18.5% (1M). The author flags the Sonnet 4.5 inversion as unexplained **[vendor numbers via secondary compiler]** — [yage.ai long-context benchmark, 2026-03-15](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- Two secondary sources disagree slightly on Opus 4.6 at 1M: 76% vs 78.3 **[aggregator]** — search summary of [benchmarklist MRCR 1M](https://benchmarklist.com/benchmarks/mrcr_1m/) and [yage.ai](https://yage.ai/share/long-context-benchmark-en-20260315.html)

**Context engineering post (2025-09-29)**
- Defines context rot: as context grows, "the model's ability to accurately recall information from that context decreases." Introduces an "attention budget" where "Every new token introduced depletes this budget". Notes "n² pairwise relationships for n tokens." Key phrase: "These factors create a performance gradient rather than a hard cliff." Compaction is "the first lever". Tool result clearing is "one of the safest lightest touch forms of compaction" **[vendor]** — [Anthropic, Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

### Inferences
- The best evidence for Claude 1M-class models is a gentle slope, not a cliff: about 90%+ at 256k and about 65-78% at 1M on the hardest 8-needle test (Opus/Sonnet 4.6). Opus 4.7 through 5.5 are probably no worse, but I found no published number to prove it.
- Haiku 4.5 (200k) has context awareness but no published long-context score that I found. Sonnet 4.5 (200k window in docs, 1M beta in 2025) scored poorly on 8-needle MRCR. Treat 200k-window models as weaker per token.
- Anthropic itself chose "gradient" language and gives no threshold. Any warning level in a meter is a product choice, not a vendor spec.

### Gaps
- Opus 5.5, Sonnet 5.5, Fable 5.1, Opus 5, Opus 4.7/4.8 and Haiku 5.5 MRCR / GraphWalks numbers: the Opus 5.5 system card PDF was too large to fetch, and no secondary source quoted its long-context table. Not verified.
- Haiku 4.5 long-context benchmark numbers: none found.
- Claude Sonnet 4 / 4.5 1M beta (Aug-Sep 2025) launch statements about quality across the window: not fetched in this pass.
- GraphWalks numbers for any Claude model: not found.
- Memory tool specifics: only a doc pointer was seen, not quality data.

## Q2. Other vendors (OpenAI, Google, xAI, Meta, Qwen, DeepSeek): published numbers at specific lengths, and independent checks

### Takeaway
Vendor numbers at 1M diverge widely. GPT-6 Astra (Sep 2026) claims 100% to 512K and 96.3% at 512K-1M on MRCR v2 8-needle, but this is unverified. Earlier GPT-5.4 and every Gemini 3.x model fell sharply past 256k (GPT-5.4 36.6% at 512K-1M, Gemini 3.x about 24-26% at 1M). Independent coverage of 2026 models at 512k-1M is thin.

### Cited Findings
**OpenAI**
- GPT-6 Astra shipped 2026-09-03. Window 1,050,000 tokens (922,000 input max, 128,000 output). OpenAI reports MRCR v2 8-needle: 100% up to 512K, 96.3% at 512K-1M **[vendor, via secondary; openai.com returned 403]** — [computingforgeeks](https://computingforgeeks.com/gpt-6-astra-released-features-benchmarks/); primary links cited there: [OpenAI announcement](https://openai.com/index/gpt-6-astra/)
- Same source family: GPT-5.6 Sol scored 73.8% at 512K-1M. OpenAI states the scores are "the best result achieved at any tested reasoning-effort level". Requests above 272,000 input tokens cost 2x input and 1.5x output **[aggregator, unverified]** — search summary of [aicybr](https://aicybr.com/blog/gpt-6-astra-api-pricing-rollout) and [codersera](https://codersera.com/blog/gpt-6-astra-complete-guide-2026/)
- GPT-5.6 Sol: 91.5% at 256K-512K on MRCR v2 8-needle **[aggregator, unverified]** — search summary of [orcarouter](https://orcarouter.ai/blog/gpt-6-1-sol-vs-gpt-5-6-sol)
- GPT-5.4 (Mar 2026): 86.0% (64K-128K), 79.3% (128K-256K), 57.5% (256K-512K), 36.6% (512K-1M) **[vendor via compiler]** — [yage.ai 2026-03-15](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- GPT-5.2: 77.0% (128K-256K) at xhigh reasoning per OpenAI. Anthropic's card cites 63.9% (contextarena). OpenAI did not test beyond 256K **[vendor + independent via compiler]** — [yage.ai](https://yage.ai/share/long-context-benchmark-en-20260315.html)

**Google**
- Gemini 3 Pro (Nov 2025): MRCR v2 8-needle 77.0% at 128k average, 26.3% at 1M pointwise (Google). Contextarena measured 45.4% at 256K and 24.5% at 1M **[vendor + independent]** — [yage.ai](https://yage.ai/share/long-context-benchmark-en-20260315.html); 128k figure also via [Simon Willison](https://feeds.simonwillison.net/2025/Nov/18/gemini-3/)
- Gemini 3.1 Pro (Feb 2026): 84.9% at 128k, 26.3% at 1M **[vendor via compiler]** — [yage.ai](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- Gemini 3 Flash: 58.5% (256K), 32.6% (1M) **[independent, contextarena via compiler]** — [yage.ai](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- Gemini 2.5 Pro (Jun 2025): 58.0% at ≤128K, 16.4% at 1M. Gemini 2.0 Flash: 18.4% at ≤128K, 10.2% at 1M **[vendor]** — [yage.ai](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- Newer Flash models at 128K only (8-needle): 3.5 Flash 77.3 (dated 2026-06-20), 3.6 Flash 91.8 (from Google's 3.6 Flash card), 3.7 Flash 97.0 **[aggregator]** — search summary of [DataLearner GDM-MRCR 128K](https://www.datalearner.com/en/benchmarks/gdm-mrcr-v2-8-needle-128k). No 1M numbers found for 3.5+ models.

**Others**
- Qwen3.7-Plus: MRCR v2 0.917, self-reported, context length not stated **[aggregator]** — [llm-stats MRCR v2](https://llm-stats.com/benchmarks/mrcr-v2)
- DeepSeek-V4-Pro: its model card reports MRCR 1M numbers, used by a three-model "preliminary" board. I did not get the value **[aggregator]** — [benchmarklist MRCR 1M](https://benchmarklist.com/benchmarks/mrcr_1m/)
- xAI Grok 4: 96.9 on a Fiction.LiveBench import (length unstated), 94.4 at 16k **[aggregator]** — search summaries of [benchmarklist Fiction.LiveBench](https://benchmarklist.com/benchmarks/fiction_livebench/) and [DataLearner Fiction.liveBench](https://www.datalearner.com/en/benchmarks/fiction-livebench)

**Independent evaluators**
- Context Arena (contextarena.ai) runs OpenAI's MRCR dataset with 2-needle and 8-needle variants. It is run by an independent developer. I could not load its live board **[independent, description only]** — [DataLearner on Context Arena](https://www.datalearner.com/en/blog/context-arena-long-context-evaluation-mrcr)
- Fiction.LiveBench added claude-opus-4-5, claude-sonnet-4-5, gemini-3-pro-preview, gemini-3-flash-preview, gpt-5.2 and Kimi K2.5 on 2026-01-30. Aggregated tables disagree and rarely state the length. One import shows Claude Opus 4.5 at 37.5 (length unstated) **[aggregator]** — search summary of [benchmarklist Fiction.LiveBench](https://benchmarklist.com/benchmarks/fiction_livebench/)
- A 2025 analysis of Fiction.LiveBench found most models degrade between 16k and 64k tokens and suggested a usable band of 16k-64k for most models **[independent commentary]** — [Dan Cleary, "Do long context windows actually work?"](https://danjcleary.substack.com/p/do-long-context-windows-actually)
- llm-stats marks MRCR v2 "Unverified": 0 verified and 3 self-reported results **[aggregator]** — [llm-stats MRCR v2](https://llm-stats.com/benchmarks/mrcr-v2)

### Inferences
- MRCR v2 8-needle is the only test with cross-vendor numbers at 256k, 512k and 1M. Most 2026 numbers at those lengths are vendor-reported. Contextarena checks lag new releases.
- The GPT-6 Astra 96.3% at 512K-1M claim is a large jump from GPT-5.4 (36.6%) six months earlier. Treat it as unverified until an independent run exists.

### Gaps
- Meta Llama 4 (10M claim): no published numbers or independent checks found in this pass.
- Artificial Analysis long-context (AA-LCR), Epoch AI and LMArena long-context results for 2026 models: not reached.
- Live Fiction.LiveBench table: the page did not render for the fetch tool.
- Gemini 3.5+ Pro and 1M/2M pointwise numbers for the newest Gemini models: not found.
- GraphWalks numbers for any 2026 model: not found.

## Q3. Does degradation scale with window size (percent), or start at similar absolute token counts? Is there 2026 evidence of strong 500k-1M performance?

### Takeaway
The data does not support a single percent-of-window rule. Degradation depends on the model, and the clearest breakpoints are in absolute tokens (often after about 128k-256k), even for 1M-window models. Only vendor claims (GPT-6 Astra 96.3% at 512K-1M, Opus 4.6 76% at 1M) show strong 500k-1M results, and none of the 2026 claims past Opus 4.6 is independently confirmed.

### Cited Findings
- GPT-5.4 (1M window) is "roughly flat through 256K (about 79-86%), then drops sharply" to 57.5% and 36.6%. The breakpoint is at about 25% of its window **[vendor via compiler]** — [yage.ai](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- Gemini 3.x (1M window) falls from 77-85% at 128k to about 24-26% at 1M. Contextarena measures 45.4% already at 256K for Gemini 3 Pro **[vendor + independent]** — [yage.ai](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- Opus 4.6 drops about 17 points from 256k to 1M. Sonnet 4.6 drops about 25 points **[vendor via compiler]** — [yage.ai](https://yage.ai/share/long-context-benchmark-en-20260315.html)
- On Fiction.LiveBench (2025), most models degrade between 16k and 64k, far below their windows **[independent commentary]** — [Dan Cleary](https://danjcleary.substack.com/p/do-long-context-windows-actually)
- Anthropic: "a performance gradient rather than a hard cliff" **[vendor]** — [Effective context engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- GPT-6 Astra: 100% to 512K and 96.3% at 512K-1M **[vendor, unverified]** — [computingforgeeks](https://computingforgeeks.com/gpt-6-astra-released-features-benchmarks/)

### Inferences
- Within one model family, a bigger window does push the curve out (Sonnet 4.5 at 18.5% vs Opus 4.6 at 76% at 1M). The gain comes from long-context training in newer models, not from the window size itself. Same-window models (GPT-5.4, Gemini 3 Pro, Opus 4.6, all 1M) differ by 40-50 points at 1M.
- For a Claude Code meter, absolute-token thresholds are easier to defend than percent thresholds. A plausible scheme from this data: an early "notice" at about 128k-200k (the end of the flat region for most models), a "warning" at about 256k-400k (where 2026 non-Anthropic curves bend and Claude 4.6 is still above 90%), and a "strong warning" at about 600k-800k. The final values need a per-model override, because the newest models may be much flatter.
- MRCR measures retrieval of repeated requests. It does not measure agentic coding quality across a long session, so it gives an upper bound on context quality.

### Gaps
- No public 2026 data compares the same model at 200k and 1M window settings. That data would test the percent rule directly.
- No independent 2026 run at 512k-1M for Claude 5.x, GPT-6 Astra or Gemini 3.5+ was found.
