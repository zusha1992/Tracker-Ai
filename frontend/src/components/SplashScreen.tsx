interface Props {
  fading: boolean
}

function getGreeting(): string {
  const h = new Date().getHours()
  if (h >= 5  && h < 12) return 'Good morning'
  if (h >= 12 && h < 18) return 'Good afternoon'
  if (h >= 18 && h < 22) return 'Good evening'
  return 'Good night'
}

const TAGLINE_WORDS = ['Track', 'Analyze', 'Improve']

export const SplashScreen = ({ fading }: Props) => {
  const greeting = getGreeting()

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
        animation: fading ? 'splash-fade-out 1.0s ease forwards' : undefined,
      }}
    >
      {/* Greeting — letter by letter, slow typewriter */}
      <p style={{
        fontSize: '1rem',
        fontWeight: 500,
        color: 'var(--text-primary)',
        letterSpacing: '0.04em',
        marginBottom: '14px',
        display: 'flex',
      }}>
        {greeting.split('').map((char, i) => (
          <span
            key={i}
            style={{
              opacity: 0,
              display: 'inline-block',
              whiteSpace: 'pre',
              animation: `splash-chip-in 0.5s ease forwards ${0.1 * i}s`,
            }}
          >
            {char}
          </span>
        ))}
      </p>

      {/* Logo */}
      <div style={{
        animation: 'splash-logo-in 1.5s cubic-bezier(0.22,1,0.36,1) forwards 0.6s',
        opacity: 0,
      }}>
        <span style={{
          fontSize: '3.5rem',
          fontWeight: 800,
          letterSpacing: '-0.04em',
          color: 'var(--text-primary)',
        }}>
          Tracker
          <span style={{
            color: 'var(--accent-green)',
            animation: 'splash-glow-pulse 4.8s ease-in-out infinite 3.0s',
          }}>
            AI
          </span>
        </span>
      </div>

      {/* Tagline — one word at a time, slow */}
      <div style={{
        marginTop: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
      }}>
        {TAGLINE_WORDS.map((word, i) => (
          <span key={word} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              fontSize: '0.8rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              opacity: 0,
              display: 'inline-block',
              animation: `splash-chip-in 1.0s cubic-bezier(0.22,1,0.36,1) forwards ${2.2 + i * 0.9}s`,
            }}>
              {word}
            </span>
            {i < TAGLINE_WORDS.length - 1 && (
              <span style={{
                color: 'var(--accent-green)',
                fontWeight: 700,
                opacity: 0,
                animation: `splash-area-in 0.6s ease forwards ${2.2 + i * 0.9 + 0.7}s`,
              }}>·</span>
            )}
          </span>
        ))}
      </div>

      {/* Chart SVG */}
      <svg
        width="320"
        height="64"
        viewBox="0 0 320 64"
        style={{ marginTop: '32px', overflow: 'visible', opacity: 0, animation: 'splash-area-in 0.8s ease forwards 2.0s' }}
      >
        <defs>
          <linearGradient id="splash-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--accent-green)" stopOpacity="0.22" />
            <stop offset="100%" stopColor="var(--accent-green)" stopOpacity="0" />
          </linearGradient>
        </defs>

        <path
          d="M0,52 L40,40 L80,46 L118,20 L160,32 L200,12 L238,26 L278,14 L320,22 L320,64 L0,64 Z"
          fill="url(#splash-fill)"
          style={{ opacity: 0, animation: 'splash-area-in 1.6s ease forwards 6.8s' }}
        />

        {[1, 2, 3].map((i) => (
          <line
            key={i}
            x1="0" y1={i * 16} x2="320" y2={i * 16}
            stroke="var(--border)"
            strokeWidth="0.5"
            strokeDasharray="4 4"
          />
        ))}

        <polyline
          points="0,52  40,40  80,46  118,20  160,32  200,12  238,26  278,14  320,22"
          fill="none"
          stroke="var(--accent-green)"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="560"
          strokeDashoffset="560"
          style={{ animation: 'draw-line 5.6s cubic-bezier(0.4,0,0.2,1) forwards 2.0s' }}
        />

        {[
          { cx: 118, cy: 20, delay: '4.2s' },
          { cx: 200, cy: 12, delay: '5.2s' },
          { cx: 320, cy: 22, delay: '7.4s' },
        ].map((d, i) => (
          <circle
            key={i}
            cx={d.cx} cy={d.cy}
            r={i === 2 ? 4 : 3}
            fill="var(--accent-green)"
            style={{ opacity: 0, animation: `splash-area-in 0.6s ease forwards ${d.delay}` }}
          />
        ))}
      </svg>

      {/* Loading text — shimmer sweep */}
      <p style={{
        marginTop: '28px',
        fontSize: '0.75rem',
        fontWeight: 600,
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        opacity: 0,
        background: 'linear-gradient(90deg, var(--text-muted) 20%, var(--text-primary) 50%, var(--text-muted) 80%)',
        backgroundSize: '250% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animationName: 'splash-sub-in, splash-text-shimmer',
        animationDuration: '1.0s, 4s',
        animationTimingFunction: 'ease, linear',
        animationFillMode: 'forwards, none',
        animationDelay: '2.8s, 4s',
        animationIterationCount: '1, infinite',
      }}>
        Loading your data...
      </p>
    </div>
  )
}
