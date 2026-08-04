import Image from 'next/image'
import Link from 'next/link'

export default function Home() {
  return (
    <div
      className="relative flex min-h-screen flex-col"
      style={{ background: 'linear-gradient(180deg, #1B4B44 0%, #8FBBAE 45%, #F3C4A8 100%)' }}
    >
      {/* Content */}
      <div className="relative flex flex-1 flex-col items-center justify-start px-6 pt-[14vh]">
        <Image
          src="/images/NMG-Logo.webp"
          alt="Noosa Mini Golf"
          width={220}
          height={140}
          className="object-contain drop-shadow-lg"
          priority
        />
        <p className="mt-4 font-display text-2xl text-white drop-shadow-sm">Mini Golf, Major Fun</p>

        {/* Start button */}
        <div className="relative mt-[18vh]">
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
