export default function TempoOrb({ size = 48, onClick, className = '' }) {
  return (
    <span
      onClick={onClick}
      className={`relative inline-flex items-center justify-center cursor-pointer select-none shrink-0 ${className}`}
      style={{ width: size, height: size }}
    >
      {/* outer pulse ring */}
      <span
        className="absolute rounded-full animate-[tempoRing_2.4s_ease-in-out_infinite]"
        style={{
          inset: -2,
          background: 'transparent',
          border: '1px solid rgba(0,0,0,0.18)',
        }}
      />
      {/* core sphere */}
      <span
        className="absolute inset-0 rounded-full"
        style={{
          background: 'radial-gradient(circle at 35% 35%, #555, #111 70%, #000)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.45), inset 0 1px 2px rgba(255,255,255,0.08)',
          animation: 'tempoPulse 2.4s ease-in-out infinite',
        }}
      />
    </span>
  )
}
