import { SITE } from "../../config/site.js";
import { PROVIDERS } from "../../config/providers.js";
import { Card } from "../ui/Card.jsx";
import { Button } from "../ui/Button.jsx";

// "SD Experts" tab: local provider directory + a "Get Listed" CTA that opens booking.
export function ProviderDirectory({ onGetListed }) {
  return (
    <>
      <h3 className="m-0 mb-1.5 text-lg font-bold">{SITE.directory.heading}</h3>
      <p className="m-0 mb-5 text-sm text-brand-slate">{SITE.directory.subhead}</p>

      {PROVIDERS.map((prov, i) => (
        <Card key={i} className="mb-3.5 flex items-start gap-4">
          <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-ocean/20 to-brand-foam/30 text-xl">
            {prov.name.charAt(0)}
          </div>
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <h4 className="m-0 text-base font-semibold">{prov.name}</h4>
              {prov.badge && (
                <span className="rounded-[10px] bg-brand-coral px-2 py-px text-[11px] font-bold text-white">
                  {prov.badge}
                </span>
              )}
            </div>
            <div className="mb-1.5 text-xs font-semibold text-brand-ocean">{prov.focus}</div>
            <p className="m-0 text-[13px] leading-snug text-brand-slate">{prov.desc}</p>
          </div>
        </Card>
      ))}

      <Card className="mt-2 bg-brand-sand text-center">
        <p className="m-0 mb-3 text-sm font-medium">{SITE.directory.getListedPrompt}</p>
        <Button className="px-6 py-2.5 text-sm" onClick={onGetListed}>
          Get Listed
        </Button>
      </Card>
    </>
  );
}
