# Long-context degradation in agentic coding sessions and the "dumb zone" heuristic (2025 to Oct 2026)

Scope note: this file covers agent-session evidence and practitioner guidance. General long-context benchmarks (RULER, NoLiMa, MRCR, model cards) are mentioned only where agent sources lean on them. All dates are publication dates as shown by the source. Items marked UNVERIFIED come only from secondary sources.

## Q1. Who coined or popularized the "dumb zone" and the 30-40% figure, and what window size did they assume?

### Takeaway
Dex Horthy (founder of HumanLayer) is the origin of both the "dumb zone" term and the "around 40%" line. He first wrote "keep utilization in the 40%-60% range" in his Aug-2025 "Advanced Context Engineering for Coding Agents" (ACE) essay, then said "around the 40% line" in his "No Vibes Allowed" talk at the AI Engineer Code Summit (NYC, 19-22 Nov 2025). The assumed window was the Claude Code 200K window, of which roughly 170K is usable. The 30% figure for 1M windows comes from later community tools, not from Horthy.

### Cited Findings
- ACE essay (HumanLayer GitHub, written late Aug 2025: it references a talk "on August 20th" and image captions dated 2025-08-29): the method is "keeping utilization in the 40%-60% range (depends on complexity of the problem)". The essay does NOT use the term "dumb zone". — [humanlayer/advanced-context-engineering-for-coding-agents, ace-fca.md](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md)
- Same essay names the technique "frequent intentional compaction" and frames it as "designing your ENTIRE WORKFLOW around context management". — [ace-fca.md](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md)
- Window size assumed in the ACE essay: it quotes Geoffrey Huntley that "you only have approximately 170k of context window to work with" (Claude Code era of a 200K window). — [ace-fca.md](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md)
- Talk: "No Vibes Allowed: Solving Hard Problems in Complex Codebases", Dex Horthy, HumanLayer, AI Engineer Code Summit 2025 (held 19-22 Nov 2025, New York). Video: youtube.com/watch?v=rmvDxxNubIg. Upload date and transcript were not retrievable. — [YouTube](https://www.youtube.com/watch?v=rmvDxxNubIg); summit dates per [search summary of ai.engineer](https://www.ai.engineer/llms.txt)
- Quote from the talk, as transcribed by a Dec 13, 2025 blog: "Around the 40% line is where you're going to start to see some diminishing returns depending on your task." Also: "If you have too many MCPs in your coding agent, you are doing all your work in the dumb zone". — [Quevin, "Context Engineering: How I Learned to Stop Worrying and Manage the Smart Zone" (2025-12-13)](https://www.quevin.ai/blog/2025-12-13-context-engineering-smart-zone)
- Pragmatic Engineer interview (Gergely Orosz, dated July 15, 2026 per fetch): "You hit the 'dumb zone' when its performance starts to degrade". The article states "As a rule of thumb, the less of the context window that is used, the better the outcomes are." It gives token numbers, not percent: "For a model with a 1M context window, Dex pushes it to around 300-400K when it feels right," and "For smaller models, he stops at around 100K." It also cites an earlier anecdote on Sonnet 4: "many folks struggle to keep it on task past 100k". — [Pragmatic Engineer, "Context engineering with Dex Horthy"](https://newsletter.pragmaticengineer.com/p/context-engineering-with-dex-horthy)
- Dev Interrupted (LinearB, Feb 17, 2026) frames Horthy as the person who teaches how to "escape the 'Dumb Zone'" with RPI (Research, Plan, Implement). No numbers. — [Dev Interrupted](https://devinterrupted.substack.com/p/dex-horthy-on-ralph-rpi-and-escaping)
- Matt Pocock (AI Hero) amplified the term in the 1M era. X post dated 2026-03-19 (date decoded from the post ID): experiments with Opus 4.6's 1M window, pushing sessions "deep into what I would consider the 'dumb zone' of SOTA models: >100K tokens. The drop-off in quality is really noticeable." A search summary also attributes "100K of smart, and 900K of dumb" to him and says he credits Horthy for the phrase. — [Matt Pocock on X](https://x.com/mattpocockuk/status/2034572011175907474) (page text from search snippet only; X returned HTTP 402 on fetch)
- The 30% figure for 1M models comes from community tooling. The "dumb-zone" GitHub project uses DUMB at 40% for Sonnet-class models, RED at 75%, and "CONTEXT ROT" at 30% for 1M models. It calls 40% "a working threshold, not a hard cliff" and its thresholds "opinionated". It credits Horthy for the framing only, not for the number. Evidence cited: "broadly reported across r/ClaudeAI". — [dumb-zone/dumb-zone README](https://github.com/dumb-zone/dumb-zone/blob/main/README.md)
- The pi-context-zone extension (for the Pi coding agent) uses Smart 0-40%, Warm 40-70%, and claims Horthy "coined the term 'Dumb Zone' after analyzing 100,000+ developer sessions". UNVERIFIED: another write-up attributes a 100,000-developer dataset to a different researcher (Yegor Denisov-Blanch). — [pi-context-zone README](https://cdn.jsdelivr.net/gh/arpagon/pi-context-zone@main/README.md); conflict noted in [search summary](https://www.quevin.ai/blog/2025-12-13-context-engineering-smart-zone)
- A third-party guide (claude-codex.fr) gives a table for the 1M window: about 30% for beginners with vague prompts, about 60% for experienced users, 30-40% for complex multi-file refactors. Opinion only. — [claude-codex.fr, "Context rot: why 1M tokens isn't 1M useful tokens"](https://claude-codex.fr/en/prompting/context-rot/)

### Inferences
- The figure drifted from "40-60%" (Aug 2025 essay) to "around 40%" (Nov 2025 talk) to "under 40%, or 30% on 1M" (community tools, 2026). Each step made it more conservative and more absolute-sounding.
- On a 200K window with about 170K usable, 40% is about 68K to 80K tokens. This sits close to the "~100K" absolute figure that Horthy and Pocock quote later. The percent and the token figures describe roughly the same zone for 200K windows.
- The "168k" figure in the assignment brief did not appear in any source I retrieved. The closest primary number is Huntley's "approximately 170k" in the ACE essay.

### Gaps
- No primary transcript or slide deck of the Nov 2025 talk was retrievable. The 40% quote rests on one blog transcription.
- Exact YouTube upload date of the talk not found.
- The Pragmatic Engineer date (July 15, 2026) came from a fetch summary. It was not cross-checked.
- Whether Horthy has said anything about a percentage on 1M windows: not found. His 1M statement is in tokens (300-400K).

## Q2. Was the figure measured, or is it a rule of thumb? Percent or tokens?

### Takeaway
It is a rule of thumb from practitioner experience. No source presents a measurement behind 40%. Horthy states it as a percent of the window, hedged "around" and "depending on your task". Since 1M windows arrived (2026), practitioners, including Horthy, now quote absolute tokens (about 100K for smaller models, 300-400K for 1M models).

### Cited Findings
- Pragmatic Engineer describes the thresholds as "heuristic" and "As a rule of thumb". The 100K figure rests on Horthy's observations, not a benchmark. — [Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/context-engineering-with-dex-horthy)
- The talk quote itself hedges: "Around the 40% line ... depending on your task." — [Quevin blog](https://www.quevin.ai/blog/2025-12-13-context-engineering-smart-zone)
- The ACE essay range "40%-60% ... depends on complexity of the problem" has no cited data. — [ace-fca.md](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md)
- The dumb-zone tool says its thresholds are "opinionated" and 40% is "not a hard cliff". — [dumb-zone README](https://github.com/dumb-zone/dumb-zone/blob/main/README.md)
- agentpatterns.ai (reviewed 2026-07-22) argues for absolute tokens: roughly 32K to 100K depending on task, and under 32K for reasoning-heavy tasks. It bases this on general long-context benchmarks (RULER, NoLiMa, BABILong, LongCodeBench), not agent sessions. It also calls the "50% rule" the "original heuristic", without a source. — [agentpatterns.ai, "Context Window Management: Understanding the Dumb Zone"](https://agentpatterns.ai/context-engineering/context-window-dumb-zone/)
- Duncan Leung argues that reasoning quality degrades with absolute token count, not percent fill. — [Duncan Leung, "Surviving the Dumb Zone"](https://duncanleung.com/blog/claude-code-precompact-postcompact-context-management/) (from search summary)
- Code With Andrea (July 14, 2026): the smart zone "usually sits within the first ~100k tokens." No percent. — [Code With Andrea, "How to Keep Your Coding Agent in the Smart Zone"](https://codewithandrea.com/articles/keep-coding-agent-smart-zone/)

### Inferences
- A percent threshold made sense when all Claude Code windows were 200K. On a 1M window, 40% is 400K tokens. That is at the upper end of Horthy's own 300-400K "when it feels right", and well above the 100K that Pocock and others call the start of degradation.
- For a meter on a 1M window, the current amber 30% (300K) and red 40% (400K) match Horthy's 1M token statement. They are looser than the ~100K camp (Pocock, Code With Andrea, Sonnet-4-era anecdote).

### Gaps
- No controlled study measures where quality falls in Claude Code sessions as a function of tokens used. See Q3.

## Q3. What measured data exists on quality loss in long agent sessions?

### Takeaway
Measured evidence exists but is thin, mostly indirect, and does not give a single threshold. The best direct agent data shows (a) managing context (masking, editing) helps or holds solve rate at lower cost, (b) long iterative coding degrades code quality, and (c) one small Codex study and one monitoring study show large drops with very long context. None measures a "40%" cliff.

### Cited Findings (measured)
- Anthropic, "Managing context on the Claude Developer Platform" (Sep 29, 2025): on an internal agentic-search eval, memory tool plus context editing "improved performance by 39% over baseline"; context editing alone by 29%. In a 100-turn web search eval, context editing cut token use by 84% and let agents finish workflows that otherwise failed from context exhaustion. Baselines and sample sizes not disclosed. Not a coding eval. — [claude.com/blog/context-management](https://claude.com/blog/context-management)
- "The Complexity Trap" (Lindenbauer et al., JetBrains, arXiv 2508.21433, Aug 2025, NeurIPS 2025 DL4Code workshop): on SWE-bench Verified with SWE-agent, simple observation masking halves cost versus the raw agent and matches or slightly beats LLM summarization on solve rate (e.g., Qwen3-Coder 480B: 53.8% raw to 54.8% masked). Observations are about 84% of an average turn's tokens. A hybrid gives +2.6 points solve rate over raw. — [arXiv 2508.21433](https://arxiv.org/abs/2508.21433); [GitHub repo](https://github.com/JetBrains-Research/the-complexity-trap)
- SlopCodeBench (arXiv 2603.24755, Mar 2026): agents extend their own code under changing specs. Best agent passes 14.8% of checkpoints. Structural erosion rises in 77% of trajectories and verbosity in 75.5%. Agents accumulate verbosity about 7x and erosion about 5x faster than human repos. Note: v1 reported different numbers. This measures code quality over iterations, not context length directly. — [arXiv 2603.24755](https://arxiv.org/html/2603.24755v1)
- "When and How Context Rot Appears in Coding Agents" (arXiv 2607.17937, Jul 2026, per a third-party review): Codex with gpt-5.4-mini passed 8/10 runs with ~11K characters of clean context, but 3/10 with ~299K characters of either relevant or irrelevant context. Only trend-level (Fisher p = 0.0698). 14 disconnects in long conditions may inflate the gap. Small sample. — [Pith review of 2607.17937](https://pith.science/paper/2607.17937)
- Martin and Roger, "classifier context rot" (arXiv 2605.12366, May 2026, as summarized by WorkOS): Opus 4.6, GPT 5.4 and Gemini 3.1 missed a hidden dangerous coding-agent action 2x to 30x more often when it came after 800K tokens of benign activity than when shown alone. Periodic reminders recovered part of the loss. This is a monitoring task, not implementation. — [WorkOS blog (Aug 14, 2026)](https://workos.com/blog/coding-agent-context-window-compaction-settings)
- "Coding Agents are Effective Long-Context Processors" (Duke, arXiv 2603.20432, Mar 2026): agents that keep text in a filesystem and use tools beat published SOTA on four of five long-context tasks, average 17.3% relative improvement, contexts from 188K to three trillion tokens. Supports keeping bulk data out of the window. — [arXiv 2603.20432](https://arxiv.org/abs/2603.20432)
- "Beyond Token Savings" (arXiv 2609.32961, Sep 2026): about 35,000 agent runs on three open-weight models. Fewer tokens did not always mean faster or cheaper runs. — [arXiv 2609.32961](https://arxiv.org/html/2609.32961v1)
- Factory, "Evaluating Context Compression for AI Agents" (Dec 16, 2025): structured summarization kept more useful information than OpenAI and Anthropic compaction on real sessions. Key metric reframed as "tokens per task", not tokens per request. Secondhand scores 3.70 vs 3.44 (Anthropic) vs 3.35 (OpenAI), UNVERIFIED against Factory's page. Vendor self-evaluation. — [factory.ai/news/evaluating-compression](https://factory.ai/news/evaluating-compression)
- Chroma "Context Rot" study (July 2025, general, not agent): all 18 models tested degrade as input length grows. One distractor is enough to drop below baseline. — cited via [WorkOS](https://workos.com/blog/coding-agent-context-window-compaction-settings) and [agentpatterns.ai](https://agentpatterns.ai/context-engineering/context-window-dumb-zone/)
- LongCodeBench (arXiv 2505.07897, general code benchmark): Claude 3.5 Sonnet bug-fix accuracy fell from 29% at 32K to 3% at 256K. GPT-4.1 stayed stable to 1M. — cited via [agentpatterns.ai](https://agentpatterns.ai/context-engineering/context-window-dumb-zone/)

### Cited Findings (vendor observations, not controlled)
- Cognition, "Rebuilding Devin for Claude Sonnet 4.5" (Sep 29, 2025): Sonnet 4.5 is "aware of its own context window". It showed "context anxiety": "taking shortcuts or leaving tasks incomplete when it believed it was near the end of its window, even when it had plenty of room left." Fix: enable the 1M beta but cap use at 200K. The model "consistently underestimates how many tokens it has left". — [Cognition blog](https://cognition.com/blog/devin-sonnet-4-5-lessons-and-challenges)
- Anthropic, "Effective context engineering for AI agents" (Sep 29, 2025): context rot "emerges across all models". Every token "depletes this budget by some amount" (the "attention budget"). No benchmark numbers. — [anthropic.com/engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)

### Cited Findings (practitioner anecdote)
- Pocock (2026-03-19): past 100K on Opus 4.6 1M, "Dumber decisions, worse code, worse instruction-following." — [X post](https://x.com/mattpocockuk/status/2034572011175907474)
- Horthy: sycophantic replies like "You're completely right!" signal a trajectory-poisoned session and a time to restart. — [Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/context-engineering-with-dex-horthy)
- Jaigu gateway analysis (May 2026): average input tokens per call rose from about 50K (May 2025) to 84K (Apr 2026). Claude Code cache hit rate 92%. Not a quality metric. — [Requesty, "The Coding Agent Economy"](https://www.requesty.ai/papers/coding-agents/The-Coding-Agent-Economy.pdf)

### Inferences
- Measured data supports "less irrelevant context is better" and "context content matters more than raw length". It does not support a specific percent cutoff.
- The two strongest long-context agent results (Codex 11K vs 299K chars; monitoring after 800K tokens) both show large drops, but at very different scales. A meter threshold must be a judgment call.
- Model-specific behavior matters: Sonnet 4.5's "context anxiety" was triggered by perceived remaining window, not by tokens used. A percent-of-window display can interact with that.

### Gaps
- No study found that plots SWE-bench or Terminal-Bench solve rate against tokens consumed within a trajectory for Claude Code, Cursor, Aider, Cline or Amp.
- No METR, tau-bench or Terminal-Bench analysis by context fill was found in this pass.
- Cursor blog posts on long sessions were not retrieved.
- Unverified claims seen and NOT used: a "Sourcegraph benchmark" (100K summary worse than 5K targeted retrieval) and a "35-minute wall" for agent success. No primary source found.

## Q4. How did the advice change once 1M windows became normal (2026)?

### Takeaway
Advice moved from percent to absolute tokens. The common 2026 figures are "about 100K" (Pocock, Code With Andrea, Horthy for smaller models) and "300-400K on 1M" (Horthy). Some practitioners recommend capping or compacting far below 1M (WorkOS at 256K, Cognition at 200K). Anthropic itself gives no threshold.

### Cited Findings
- Horthy: 300-400K on a 1M window, about 100K on smaller models. — [Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/context-engineering-with-dex-horthy)
- Pocock (2026-03-19): ">100K tokens" is the dumb zone even on Opus 4.6 1M. — [X post](https://x.com/mattpocockuk/status/2034572011175907474)
- Code With Andrea (2026-07-14): smart zone "within the first ~100k tokens". — [Code With Andrea](https://codewithandrea.com/articles/keep-coding-agent-smart-zone/)
- WorkOS (Mitch Fultz, 2026-08-14), "Stop giving your coding agent a million-token context window": recommends compaction at 256K tokens (window 320K, reserve 64K, keepRecent 40K). It calls this a "defensible quality-first starting point", not a measured optimum. — [WorkOS](https://workos.com/blog/coding-agent-context-window-compaction-settings)
- Cognition (2025-09-29): 1M beta capped at 200K. — [Cognition](https://cognition.com/blog/devin-sonnet-4-5-lessons-and-challenges)
- dumb-zone tool: 30% on 1M models (= 300K). — [dumb-zone README](https://github.com/dumb-zone/dumb-zone/blob/main/README.md)
- Anthropic (Thariq Shihipar, 2026-04-15): context rot means "model performance degrades as context grows because attention gets spread across more tokens". Gives no token or percent threshold. — [claude.com blog, "Using Claude Code: session management and 1M context"](https://claude.com/blog/using-claude-code-session-management-and-1m-context)
- Claude Code model docs (2026): newer models are positioned as able to "sustain long autonomous sessions" and hold "long sessions without losing the thread". Docs give no quality-vs-fill curve. — [code.claude.com/docs/en/model-config](https://code.claude.com/docs/en/model-config)
- Amp (Sourcegraph) replaced compaction with "Handoff" because summaries lose information and compaction led to long, wandering threads. Users should work in focused threads. UNVERIFIED: a May 2026 listing says Amp later re-added automatic compaction. — [ampcode.com/news/handoff](https://ampcode.com/news/handoff); [hunted.space](https://hunted.space/product/amp-free)

### Inferences
- Practitioner consensus in 2026 is a band: warning near 100K to 200K, hard stop near 300K to 400K on 1M windows. The ClaudeDeck meter (amber 300K, red 400K) matches the top of that band and Horthy's own 1M figure. An earlier informational cue near 100K to 150K would match the Pocock and Code With Andrea camp.
- Because evidence points to absolute tokens, a meter could show tokens beside percent, or switch thresholds by window size (40% of 200K is 80K, 30% of 1M is 300K).

### Gaps
- No Anthropic-published threshold for when to compact or clear on 1M windows.
- No vendor (Cursor, Cline, Aider, Codex) threshold guidance was found in this pass.

## Q5. What do Claude Code docs and Anthropic recommend about /compact, /clear, auto-compaction and long sessions (2026)?

### Takeaway
Anthropic says the context window is "the most important resource to manage" and quality drops as it fills. It recommends /clear between unrelated tasks, /clear after two failed corrections, steered /compact mid-task, /rewind to drop failed attempts, and subagents for high-volume output. Auto-compaction on native-1M models fires at about 967K tokens by default and is configurable from 100K to 1M.

### Cited Findings
- Best practices: the context window "fills up fast, and performance degrades as it fills". When full, Claude "may start 'forgetting' earlier instructions or making more mistakes". Run /clear "when switching to unrelated work". After two failed corrections, "/clear and write a better initial prompt". "A clean session with a better prompt almost always outperforms a long session with accumulated corrections." — [code.claude.com/docs/en/best-practices](https://code.claude.com/docs/en/best-practices) (quotes from search summary)
- Auto-compaction thresholds: native 1M models (Sonnet 5, Haiku 5.5, Fable models, Opus 4.7 and later on the Anthropic API) "compact before the window fills, at about 967K tokens by default". Models on 200K compact at the 200K boundary. Configure via `/autocompact 500k`, the `autoCompactWindow` setting, the `--autocompact` flag, or `CLAUDE_CODE_AUTO_COMPACT_WINDOW` (highest precedence, plain integer only). Range 100K to 1M. `CLAUDE_CODE_DISABLE_1M_CONTEXT=1` holds models to 200K. — [code.claude.com/docs/en/model-config](https://code.claude.com/docs/en/model-config)
- Pricing: 1M window "uses standard model pricing with no premium for tokens beyond 200K, except on Haiku 5.5" (premium past 100K). — [model-config](https://code.claude.com/docs/en/model-config)
- Older practitioner sources cite an 80% or ~95% auto-compact trigger and a `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE` variable (50% often suggested). These describe earlier versions. The current docs use a token window instead. — [agentpatterns.ai](https://agentpatterns.ai/context-engineering/context-window-dumb-zone/); conflict noted in [wmedia.es](https://wmedia.es/en/tips/claude-code-auto-compact-window)
- Anthropic session-management post (Thariq Shihipar, 2026-04-15): "the model is at its least intelligent point when compacting", so compact proactively. Bad compacts happen "when the model can't predict the direction your work is going." Decision guide: Continue if everything is "still load-bearing"; Rewind ("often the better approach to correction"); /compact when "the session is bloated with stale debugging/exploration"; /clear when "Starting a genuinely new task"; subagent when you need only the conclusion. "When you start a new task, you should also start a new session." — [claude.com blog](https://claude.com/blog/using-claude-code-session-management-and-1m-context)
- What compaction keeps: Claude Code summarizes history, keeping "architectural decisions, unresolved bugs, and implementation details", plus "the five most recently accessed files" (Sep 2025 description). — [Anthropic engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- What compaction drops (2026 docs): the skill listing is "not re-injected after /compact". Invoked skills are re-injected, "capped at 5,000 tokens per skill". Path-scoped rules and nested CLAUDE.md reload only when a matching file is read again. — [code.claude.com/docs/en/context-window](https://code.claude.com/docs/en/context-window)
- Subagents: they "run in separate context windows and report back summaries". Many detailed subagent returns "can consume significant context". Anthropic's Sep 2025 post says subagents use "tens of thousands of tokens or more" but return "a condensed, distilled summary ... (often 1,000-2,000 tokens)". — [code.claude.com/docs/en/sub-agents](https://code.claude.com/docs/en/sub-agents); [Anthropic engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- Lighter compaction: "One of the safest lightest touch forms of compaction is tool result clearing." Structured note-taking to files outside the window is also recommended. — [Anthropic engineering](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
- Practitioner critique of /compact: it silently drops external state changes, abandoned approaches, behavioral constraints, and exact IDs, line numbers and SHAs. — [Duncan Leung](https://duncanleung.com/blog/claude-code-precompact-postcompact-context-management/) (from search summary)
- Horthy's alternative: compress state into a Markdown document, then start a fresh session (intentional compaction with RPI). — [Pragmatic Engineer](https://newsletter.pragmaticengineer.com/p/context-engineering-with-dex-horthy); [ace-fca.md](https://github.com/humanlayer/advanced-context-engineering-for-coding-agents/blob/main/ace-fca.md)

### Inferences
- The default auto-compact at ~967K means Claude Code itself does not enforce any "dumb zone" limit on 1M models. A user-facing meter is the only cue unless the user lowers `autoCompactWindow`.
- Anthropic's "least intelligent point when compacting" line gives a direct reason to warn before auto-compact: compaction quality itself suffers when it runs late.
- A meter could link its red state to the documented actions: /compact with focus, /rewind, /clear with a handoff file, or `/autocompact` to a lower window such as 400K.

### Gaps
- Full text of the best-practices page was not fetched directly. Quotes come from a search summary of the official page.
- No official Anthropic statement gives a recommended manual compaction point on 1M windows.
