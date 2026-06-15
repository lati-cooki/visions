import { SITE } from "../../config/site.js";
import { PROVIDERS } from "../../config/providers.js";

// "Experts" tab: local provider cards (featured = ocean ring) + a navy "Get Listed" banner.
export function ProviderDirectory({ onContact }) {
  const market = SITE.location.name;

  return (
    <div>
      <div className="mb-5">
        <h2 className="m-0 mb-1.5 text-[21px] font-extrabold tracking-[-0.01em]">
          Local experts in {market}
        </h2>
        <p className="m-0 text-[15px] text-brand-slate">
          Vetted providers who can build the deeper items for you.
        </p>
      </div>

      <div className="mb-[26px] grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-3.5">
        {PROVIDERS.map((prov, i) => {
          const featured = !!prov.badge;
          return (
            <div
              key={i}
              className={`relative flex flex-col gap-[11px] rounded-[16px] bg-white p-[22px] ${
                featured
                  ? "border-[1.5px] border-brand-ocean shadow-[0_0_0_3px_rgba(26,127,181,0.08)]"
                  : "border border-brand-border"
              }`}
            >
              {featured && (
                <span className="absolute right-4 top-4 rounded-[7px] bg-brand-ocean px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.05em] text-white">
                  {prov.badge}
                </span>
              )}
              <span className="text-[11px] font-bold uppercase tracking-[0.08em] text-brand-ocean">
                {prov.focus}
              </span>
              <h3 className="m-0 text-[19px] font-extrabold tracking-[-0.01em]">{prov.name}</h3>
              <p className="m-0 flex-1 text-[14px] leading-[1.55] text-brand-slate">{prov.desc}</p>
              <button
                onClick={onContact}
                className={`self-start rounded-[11px] px-[18px] py-2.5 text-[14px] font-bold transition ${
                  featured
                    ? "bg-brand-ocean text-white hover:bg-brand-navy"
                    : "border border-brand-border bg-white text-brand-slate hover:border-brand-ocean hover:text-brand-navy"
                }`}
              >
                Contact
              </button>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-[18px] rounded-[16px] bg-gradient-to-br from-brand-navy to-[#1A4A63] p-[26px] text-white">
        <div>
          <h3 className="m-0 mb-[5px] text-[19px] font-extrabold tracking-[-0.01em]">
            Are you a {market} AI provider?
          </h3>
          <p className="m-0 text-[14px] text-[#cfe2ee]">Get listed in front of local owners ready to buy.</p>
        </div>
        <button
          onClick={onContact}
          className="whitespace-nowrap rounded-[12px] bg-white px-[22px] py-[13px] text-[14px] font-bold text-brand-navy transition hover:bg-brand-sand"
        >
          Get Listed
        </button>
      </div>
    </div>
  );
}
