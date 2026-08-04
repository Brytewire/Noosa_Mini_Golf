export interface Hole {
  number: number
  tip: string
  isChallenge: boolean
  challengeText?: string
}

const TIPS = [
  'Aim for the centre and keep your swing smooth.',
  'A gentle tap is all you need — don\'t overshoot!',
  'Use the side wall to your advantage on this one.',
  'Take your time and read the slope before you putt.',
  'Aim slightly left and let the curve do the work.',
  'Keep it slow — this green is faster than it looks.',
  'Hit straight down the middle for the best line.',
  'Aim for the far corner and watch it roll in.',
  'A firm, straight shot works best here.',
]

const CHALLENGES = [
  'Hit with your eyes closed — first shot only.',
  'Hit standing on one leg — first shot only.',
  'Hit behind your back — first shot only.',
  'Roll the ball with your hands — first shot only.',
]

const CHALLENGE_HOLES = new Set([4, 8, 12, 16])

function buildHoles(): Hole[] {
  return Array.from({ length: 18 }, (_, i) => {
    const number = i + 1
    const isChallenge = CHALLENGE_HOLES.has(number)
    return {
      number,
      tip: TIPS[i % TIPS.length],
      isChallenge,
      challengeText: isChallenge ? CHALLENGES[Math.floor((number - 1) / 4)] : undefined,
    }
  })
}

export const HOLES: Hole[] = buildHoles()
