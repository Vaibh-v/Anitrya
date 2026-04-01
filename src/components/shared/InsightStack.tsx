type InsightItem = {
  title: string;
  body: string;
  confidence: string;
};

type Props = {
  title: string;
  subtitle: string;
  items: InsightItem[];
};

export function InsightStack({ title, subtitle, items }: Props) {
  return (
    <section className="rounded-[24px] border border-white/10 bg-white/[0.03] p-5 md:p-6">
      <div>
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <p className="mt-2 text-sm leading-6 text-white/56">{subtitle}</p>
      </div>

      <div className="mt-4 space-y-3">
        {items.length === 0 ? (
          <div className="rounded-[18px] border border-dashed border-white/10 bg-black/16 p-4">
            <div className="text-sm font-semibold text-white">No findings yet</div>
            <p className="mt-2 text-sm leading-6 text-white/52">
              Structured findings will appear here as entity-level evidence deepens.
            </p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={`${item.title}-${item.body}`}
              className="rounded-[18px] border border-white/10 bg-black/16 p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="text-sm font-semibold text-white">
                  {item.title}
                </div>
                <div className="rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-1 text-xs text-white/65">
                  {item.confidence}
                </div>
              </div>

              <p className="mt-3 text-sm leading-6 text-white/58">{item.body}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}