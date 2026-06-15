import { useState } from "react";
import { sendChat } from "../../lib/api.js";
import { Button } from "../ui/Button.jsx";

// Post-plan follow-up chat. Carries the business profile + plan headline as context so
// answers stay grounded without regenerating the whole plan.
export function FollowUpChat({ profile, headline }) {
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
      const reply = await sendChat({ profile, headline, history, message });
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
    <div className="mt-8 border-t border-brand-border pt-5">
      <h3 className="m-0 mb-3.5 text-base font-bold">Have questions? Ask away.</h3>

      {history.map((msg, i) => (
        <div
          key={i}
          className={`mb-2.5 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
        >
          <div
            className={`max-w-[85%] px-4 py-2.5 text-sm leading-relaxed ${
              msg.role === "user"
                ? "rounded-[14px_14px_4px_14px] bg-brand-ocean text-white"
                : "rounded-[14px_14px_14px_4px] border border-brand-border bg-white text-brand-navy"
            }`}
          >
            {msg.content}
          </div>
        </div>
      ))}

      {loading && (
        <div className="mb-2.5 text-sm italic text-brand-slate">Thinking...</div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          value={followUp}
          onChange={(e) => setFollowUp(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && ask()}
          placeholder="E.g., How do I set up that AI agent?"
          className="box-border flex-1 rounded-[10px] border-[1.5px] border-brand-border px-4 py-3 text-[15px] outline-none"
        />
        <Button
          variant="primary"
          className="px-5 py-3 text-[15px]"
          disabled={!followUp.trim() || loading}
          onClick={ask}
        >
          Ask
        </Button>
      </div>
    </div>
  );
}
