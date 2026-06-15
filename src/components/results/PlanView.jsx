import { EffortBadge } from "../ui/EffortBadge.jsx";
import { FollowUpChat } from "./FollowUpChat.jsx";

// "AI Plan" tab: navy hero, action bar, quick-win cards, custom-agent + this-week pair, and
// the follow-up chat. Pure presentation driven by `recommendations`.
export function PlanView({
  recommendations,
  profile,
  businessLabel,
  onAddTasks,
  onSavePlan,
  onBook,
  planSaved,
  shareUrl,
}) {
  const painCount = profile?.painPoints?.length || 0;
  const painsLabel = `${painCount || "0"} focus area${painCount === 1 ? "" : "s"}`;
  const agent = recommendations.agent_opportunity;

  return (
    <div>
      {/* Hero */}
      <div className="relative overflow-hidden rounded-[18px] bg-gradient-to-br from-brand-navy to-[#1A4A63] p-[clamp(24px,4vw,38px)] text-white">
        <div className="absolute right-[-30px] top-[-50px] h-[200px] w-[200px] rounded-full bg-[radial-gradient(circle,rgba(108,196,161,0.32),transparent_70%)]" />
        <div className="relative">
          <div className="mb-3.5 text-xs font-bold uppercase tracking-[0.1em] text-[#7fc2e4]">
            Your AI Plan{businessLabel ? ` · ${businessLabel}` : ""}
          </div>
          <h1 className="m-0 mb-3.5 max-w-[18em] text-[clamp(26px,4.5vw,40px)] font-extrabold leading-[1.1] tracking-[-0.02em]">
            {recommendations.headline}
          </h1>
          <p className="m-0 mb-5 max-w-[34em] text-[clamp(15px,2vw,17px)] leading-[1.55] text-[#cfe2ee]">
            Quick wins ranked by effort, the tools to use, and a custom agent idea built around
            how you actually work.
          </p>
          <div className="flex flex-wrap gap-[9px]">
            {[businessLabel, painsLabel, "Powered by Claude"].filter(Boolean).map((chip, i) => (
              <span
                key={i}
                className="rounded-full border border-white/20 bg-white/10 px-[13px] py-1.5 text-[13px] font-semibold"
              >
                {chip}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Action bar */}
      <div className="my-[22px] flex flex-wrap gap-2.5">
        <button
          onClick={onAddTasks}
          className="inline-flex items-center gap-2 rounded-[12px] bg-brand-ocean px-5 py-[13px] text-[14px] font-bold text-white transition hover:bg-brand-navy"
        >
          ＋ Add to Tasks
        </button>
        <button
          onClick={onSavePlan}
          disabled={!shareUrl}
          className="inline-flex items-center gap-2 rounded-[12px] border border-brand-border bg-white px-5 py-[13px] text-[14px] font-bold text-brand-slate transition hover:border-brand-ocean hover:text-brand-navy disabled:opacity-50"
        >
          {planSaved ? "✓ Link copied" : "↗ Save & Share"}
        </button>
        <button
          onClick={onBook}
          className="inline-flex items-center gap-2 rounded-[12px] bg-brand-coral px-5 py-[13px] text-[14px] font-bold text-white transition hover:bg-[#cf5946]"
        >
          Book a Consultation
        </button>
      </div>

      {planSaved && shareUrl && (
        <div className="mb-6 rounded-[14px] border-[1.5px] border-brand-ocean/30 bg-brand-lightblue px-[18px] py-3.5 text-[13px]">
          <span className="font-semibold">Link copied!</span> Share or revisit your plan at:{" "}
          <a href={shareUrl} className="break-all font-semibold text-brand-ocean underline">
            {shareUrl}
          </a>
        </div>
      )}

      {/* Quick wins */}
      <div className="mb-4 flex items-baseline justify-between gap-3">
        <h2 className="m-0 text-[21px] font-extrabold tracking-[-0.01em]">Quick Wins</h2>
        <span className="text-[13px] font-semibold text-[#9aa7b1]">
          {recommendations.quick_wins?.length || 0} recommended
        </span>
      </div>
      <div className="mb-[30px] grid grid-cols-[repeat(auto-fit,minmax(265px,1fr))] gap-3.5">
        {recommendations.quick_wins?.map((win, i) => (
          <div
            key={i}
            className="flex flex-col gap-[13px] rounded-[14px] border border-brand-border bg-white p-5"
          >
            <div className="flex items-start justify-between gap-3">
              <h3 className="m-0 text-[17px] font-bold leading-[1.3] tracking-[-0.01em]">{win.title}</h3>
              {win.monthly_cost && (
                <span className="whitespace-nowrap text-[15px] font-extrabold">{win.monthly_cost}</span>
              )}
            </div>
            <EffortBadge effort={win.effort} />
            <p className="m-0 text-[14px] leading-[1.55] text-brand-slate">{win.description}</p>
            {win.task && (
              <div className="flex gap-[9px] rounded-[10px] border border-[#d6e8f3] bg-brand-lightblue px-[13px] py-[11px]">
                <span className="font-extrabold leading-[1.4] text-brand-ocean">▸</span>
                <span className="text-[13px] font-semibold leading-[1.45] text-brand-navy">
                  <span className="text-brand-ocean">Action:</span> {win.task}
                </span>
              </div>
            )}
            {win.tools?.length > 0 && (
              <div className="mt-auto flex flex-wrap gap-1.5">
                {win.tools.map((tool, j) => (
                  <span
                    key={j}
                    className="rounded-md border border-brand-border bg-[#f3eee6] px-[9px] py-[3px] text-[11px] font-semibold text-brand-slate"
                  >
                    {tool}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Custom agent + This week */}
      <div className="mb-[30px] grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-3.5">
        {agent && (
          <div className="flex flex-col gap-[13px] rounded-[16px] border border-[#f3d6cd] bg-gradient-to-br from-[#fff6f3] to-[#fdeee9] p-6">
            <div className="flex items-center gap-2.5">
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-[9px] bg-brand-coral text-[18px] text-white">
                ✦
              </span>
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-[#c1543f]">
                Custom Agent Opportunity
              </span>
            </div>
            <h3 className="m-0 text-[19px] font-extrabold tracking-[-0.01em]">{agent.title}</h3>
            <p className="m-0 text-[14px] leading-[1.55] text-[#7a564d]">{agent.description}</p>
            {agent.impact && (
              <p className="m-0 text-[13px] font-semibold text-[#c1543f]">Expected impact: {agent.impact}</p>
            )}
            <button
              onClick={onBook}
              className="mt-1 self-start rounded-[11px] bg-brand-coral px-[18px] py-[11px] text-[14px] font-bold text-white transition hover:bg-[#cf5946]"
            >
              Explore this →
            </button>
          </div>
        )}

        {recommendations.next_step && (
          <div className="flex flex-col gap-3.5 rounded-[16px] border border-brand-border bg-white p-6">
            <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-ocean">
              This Week
            </span>
            <h3 className="m-0 text-[19px] font-extrabold tracking-[-0.01em]">Start with the easiest win</h3>
            <div className="flex items-start gap-3">
              <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full border border-[#cfe4f1] bg-brand-lightblue text-[13px] font-extrabold text-brand-ocean">
                1
              </span>
              <span className="pt-0.5 text-[14px] font-semibold leading-[1.45]">{recommendations.next_step}</span>
            </div>
            <button
              onClick={onAddTasks}
              className="mt-1 self-start rounded-[11px] border border-brand-border bg-white px-[18px] py-[11px] text-[14px] font-bold text-brand-slate transition hover:border-brand-ocean hover:text-brand-navy"
            >
              ＋ Add this week to tasks
            </button>
          </div>
        )}
      </div>

      <FollowUpChat profile={profile} headline={recommendations.headline} />
    </div>
  );
}
