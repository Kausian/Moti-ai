const learningFlow = ["Think", "Explain", "Correct", "Remember"];

export default function Home() {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-6 py-16">
      {/* Warm brand gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(1100px 520px at 15% -5%, var(--moti-pink), transparent 60%)," +
            "radial-gradient(900px 480px at 100% 0%, var(--moti-yellow), transparent 55%)," +
            "radial-gradient(1000px 600px at 50% 115%, var(--moti-peach), transparent 60%)",
        }}
      />

      <section className="moti-rise w-full max-w-2xl rounded-3xl border border-white/60 bg-white/70 px-8 py-12 text-center shadow-[0_20px_60px_-25px_rgba(23,32,58,0.35)] backdrop-blur-sm sm:px-12 sm:py-14">
        <span className="inline-flex items-center gap-2 rounded-full border border-moti-navy/10 bg-white/70 px-4 py-1.5 text-xs font-medium tracking-wide text-moti-navy-soft">
          <span className="h-2 w-2 rounded-full bg-moti-navy" />
          Phase 1 · Product Foundation
        </span>

        <h1 className="mt-6 text-5xl font-semibold tracking-tight text-moti-navy sm:text-6xl">
          Moti AI
        </h1>

        <p className="mt-4 text-lg font-medium text-moti-navy sm:text-xl">
          Learn actively. Understand deeply. Remember longer.
        </p>

        <p className="mx-auto mt-5 max-w-xl text-base leading-7 text-moti-navy-soft">
          Moti is a source-grounded virtual learning coach. It turns your own
          course material into active learning — ask grounded questions, explain
          concepts back in your own words, correct misconceptions, and lock in
          understanding through spaced review.
        </p>

        <ul className="mt-8 flex flex-wrap items-center justify-center gap-2">
          {learningFlow.map((step, index) => (
            <li key={step} className="flex items-center gap-2">
              <span className="rounded-full bg-white/80 px-4 py-2 text-sm font-medium text-moti-navy shadow-sm">
                {step}
              </span>
              {index < learningFlow.length - 1 && (
                <span aria-hidden className="text-moti-navy-soft">
                  →
                </span>
              )}
            </li>
          ))}
        </ul>

        <p className="mt-10 rounded-2xl bg-moti-navy/5 px-5 py-3 text-sm text-moti-navy-soft">
          <span className="font-semibold text-moti-navy">Development status:</span>{" "}
          Phase 1 scaffold. The dashboard, chat, 3D assistant, and AI features
          arrive in later phases.
        </p>
      </section>
    </main>
  );
}
