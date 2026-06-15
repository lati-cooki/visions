import { Card } from "../ui/Card.jsx";
import { EffortBadge } from "../ui/EffortBadge.jsx";
import { FollowUpChat } from "./FollowUpChat.jsx";

const SECTION_LABEL = "mb-3.5 mt-7 text-[13px] font-bold uppercase tracking-[1.2px] text-brand-slate";

// "AI Plan" tab: headline, action bar, quick wins, custom agent opportunity, this-week
// next step, and the follow-up chat. Pure presentation driven by `recommendations`.
export function PlanView({
  recommendations,
  profile,
  onAddTasks,
  onSavePlan,
  onBook,
  planSaved,
  shareUrl,
}) {
  return (
    <>
      <Card className="border-none bg-gradient-to-br from-brand-navy to-[#1A4A6B] text-white">
        <p className="m-0 text-[17px] font-medium leading-relaxed">{recommendations.headline}</p>
      </Card>

      <div className="my-4 flex flex-wrap gap-2">
        <button
          onClick={onAddTasks}
          className="rounded-[10px] border-[1.5px] border-brand-ocean/30 bg-brand-lightblue px-3.5 py-2 text-[13px] font-semibold text-brand-ocean"
        >
          📋 Add All to Tasks
        </button>
        <button
          onClick={onSavePlan}
          disabled={!shareUrl}
          className="rounded-[10px] border-[1.5px] border-brand-border bg-white px-3.5 py-2 text-[13px] font-medium text-brand-navy disabled:opacity-50"
        >
          {planSaved ? "✓ Link Copied" : "🔗 Save & Share"}
        </button>
        <button
          onClick={onBook}
          className="rounded-[10px] border-[1.5px] border-brand-coral bg-brand-coral px-3.5 py-2 text-[13px] font-semibold text-white"
        >
          📅 Book a Consultation
        </button>
      </div>

      {planSaved && shareUrl && (
        <Card className="border-[1.5px] border-brand-ocean/30 bg-brand-lightblue px-[18px] py-3.5 text-[13px]">
          <span className="font-semibold">Link copied!</span> Share or revisit your plan at:{" "}
          <a
            href={shareUrl}
            className="break-all font-semibold text-brand-ocean underline"
          >
            {shareUrl}
          </a>
        </Card>
      )}

      <p className={SECTION_LABEL}>Quick Wins</p>
      {recommendations.quick_wins?.map((win, i) => (
        <Card key={i} className="mb-3.5">
          <div className="mb-2.5 flex items-start justify-between">
            <h4 className="m-0 text-[17px] font-semibold">{win.title}</h4>
            <EffortBadge effort={win.effort} />
          </div>
          <p className="m-0 mb-3 text-sm leading-relaxed text-brand-slate">{win.description}</p>
          {win.task && (
            <div className="mb-3 rounded-lg bg-brand-sand px-3 py-2 text-[13px] leading-snug text-brand-navy">
              <span className="font-semibold">Action:</span> {win.task}
            </div>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            {win.tools?.map((tool, j) => (
              <span
                key={j}
                className="rounded-md bg-brand-lightblue px-2.5 py-0.5 text-[13px] font-medium text-brand-ocean"
              >
                {tool}
              </span>
            ))}
            {win.monthly_cost && (
              <span className="ml-1 text-[13px] text-brand-slate">{win.monthly_cost}</span>
            )}
          </div>
        </Card>
      ))}

      {recommendations.agent_opportunity && (
        <>
          <p className={SECTION_LABEL}>🤖 Custom Agent Opportunity</p>
          <Card className="mb-3.5 border-l-4 border-l-brand-coral">
            <h4 className="m-0 mb-2 text-[17px] font-semibold">
              {recommendations.agent_opportunity.title}
            </h4>
            <p className="m-0 mb-2.5 text-sm leading-relaxed text-brand-slate">
              {recommendations.agent_opportunity.description}
            </p>
            <p className="m-0 text-sm font-semibold text-brand-foam">
              Expected impact: {recommendations.agent_opportunity.impact}
            </p>
          </Card>
        </>
      )}

      {recommendations.next_step && (
        <Card className="border-[1.5px] border-brand-ocean/30 bg-brand-lightblue">
          <p className="m-0 mb-1.5 text-xs font-bold uppercase tracking-wide text-brand-ocean">
            This Week
          </p>
          <p className="m-0 text-base font-medium leading-snug">{recommendations.next_step}</p>
        </Card>
      )}

      <FollowUpChat profile={profile} headline={recommendations.headline} />
    </>
  );
}
