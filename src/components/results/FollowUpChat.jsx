import { useState } from "react";
import { sendChat } from "../../lib/api.js";

// Post-plan follow-up chat. Carries the profile + plan headline as context so answers stay
// grounded without regenerating the plan. `planId` is required in production so the server
// can verify the request is tied to a real persisted plan.
export function FollowUpChat({ planId, profile, headline }) {
  const [followUp, setFollowUp] = useState("");
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    const message = followUp.trim();
    if (!message || loading) return;
    setFollowUp("");
    const nextHistory = [...history, { role: "user", content: message }];
    setHistory(nextHistory);
    setLoading(true);
    try {
      const reply = await sendChat({ planId, profile, headline, history, message });
      setHistory([...nextHistory, { role: "assistant", content: reply }]);
    } catch {
      setHistory([
        ...nextHistory,
        { role: "assistant", content: "Sorry, I couldn't process that. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-[16px] border border-brand-border bg-white p-[22px]">
      <div className="mb-4 flex items-center gap-2.5">
        <span className="flex h-[30px] w-[30px] items-center justify-center rounded-[8px] bg-brand-ocean text-[15px] font-extrabold text-white">
          V
        </span>
        <h3 className="m-0 text-base font-extrabold tracking-[-0.01em]">
          Ask Visions anything about your plan
        </h3>
      </div>

      {history.length > 0 && (
        <div className="mb-4 flex flex-col gap-3.5">
          {history.map((msg, i) =>
            msg.role === "user" ? (
              <div key={i} className="flex justify-end">
                <div className="max-w-[82%] rounded-[14px_14px_4px_14px] bg-brand-ocean px-3.5 py-2.5 text-[14px] leading-[1.45] text-white">
                  {msg.content}
                </div>
              </div>
            ) : (
              <div key={i} className="flex items-start gap-[9px]">
                <span className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[7px] border border-[#cfe4f1] bg-brand-lightblue text-[12px] font-extrabold text-brand-ocean">
                  V
                </span>
                <div className="max-w-[85%] rounded-[4px_14px_14px_14px] border border-brand-border bg-brand-sand px-3.5 py-2.5 text-[14px] leading-[1.5] text-brand-slate">
                  {msg.content}
                </div>
              </div>
            )
          )}
        </div>
      )}

      {loading && <div className="mb-3.5 text-[14px] italic text-brand-slate">Thinking...</div>}

      <div className="flex gap-[9px]">
        <input
          type="text"
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="e.g. Which one should I do first?"
          aria-label="Ask a follow-up question"
          className="min-w-0 flex-1 rounded-[11px] border border-brand-border px-[15px] py-3 text-[14px] outline-none transition focus:border-brand-ocean focus:shadow-[0_0_0_3px_rgba(26,127,181,0.13)]"
        />
        <button
          onClick={ask}
          disabled={!followUp.trim() || loading}
          className="whitespace-nowrap rounded-[11px] bg-brand-ocean px-5 py-3 text-[14px] font-bold text-white transition hover:bg-brand-navy disabled:opacity-50"
        >
          Ask
        </button>
      </div>
    </div>
  );
}
