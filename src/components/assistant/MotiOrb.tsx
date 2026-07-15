// A deliberate visual stand-in for the future interactive 3D Moti assistant.
// It is a warm gradient orb with a friendly face, a soft animated halo, and a
// gentle float — intended to read as an intentional placeholder, not a gap.

export function MotiOrb() {
  return (
    <div className="relative mx-auto grid h-32 w-32 place-items-center">
      <span
        aria-hidden
        className="moti-halo absolute inset-2 rounded-full bg-gradient-to-br from-moti-pink via-moti-peach to-moti-yellow blur-xl"
      />
      <div className="moti-float relative grid h-24 w-24 place-items-center rounded-full bg-gradient-to-br from-moti-pink via-moti-peach to-moti-yellow shadow-[0_12px_30px_-12px_rgba(23,32,58,0.5)]">
        <svg
          viewBox="0 0 64 64"
          className="h-14 w-14 text-moti-navy"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="24" cy="28" r="2.4" fill="currentColor" stroke="none" />
          <circle cx="40" cy="28" r="2.4" fill="currentColor" stroke="none" />
          <path d="M23 38c3 3.4 15 3.4 18 0" />
        </svg>
      </div>
    </div>
  );
}
