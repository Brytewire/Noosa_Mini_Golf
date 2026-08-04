import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Background image — already carries the Noosa Mini Golf logo + tagline */}
      <Image
        src="/images/Main page v5.png"
        alt=""
        fill
        className="object-cover object-center"
        priority
      />

      {/* Content */}
      <div className="relative flex flex-1 flex-col items-center justify-start px-6 pt-[24vh]">
        {/* Start button */}
        <div className="relative">
          <div
            className="absolute inset-0 -m-4 rounded-full"
            style={{ background: 'radial-gradient(closest-side, rgba(0,0,0,0.35), transparent)' }}
          />
          <Link
            href="/players"
            className="animate-pulse-cta relative flex h-14 w-56 items-center justify-center rounded-full bg-pp-secondary text-lg font-display uppercase tracking-wide text-pp-primary shadow-[var(--shadow-button)] active:scale-95"
          >
            Start Your Game
          </Link>
        </div>
      </div>
    </div>
  )
}
