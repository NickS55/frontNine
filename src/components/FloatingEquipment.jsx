import { useEffect, useState } from 'react'

export function FloatingEquipment() {
  const [items, setItems] = useState([])

  useEffect(() => {
    const generated = []
    for (let i = 0; i < 12; i++) {
      generated.push({
        id: i,
        left: `${Math.random() * 100}%`,
        top: `${Math.random() * 100}%`,
        delay: Math.random() * 5,
        duration: 20 + Math.random() * 10,
        size: 60 + Math.random() * 80,
        rotate: Math.random() * 360,
      })
    }
    setItems(generated)
  }, [])

  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden opacity-[0.08] text-fg">
      {items.map((item) => (
        <div
          key={item.id}
          className="absolute"
          style={{
            left: item.left,
            top: item.top,
            animation: `float ${item.duration}s ease-in-out infinite`,
            animationDelay: `${item.delay}s`,
          }}
        >
          <svg
            width={item.size}
            height={item.size}
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ transform: `rotate(${item.rotate}deg)`, display: 'block' }}
          >
            <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" />
            <path
              strokeLinecap="round"
              strokeWidth="2"
              stroke="currentColor"
              d="m51.04508,2.69672a48,48 0 0 1 0,96m-30,-73c10,8 20.20713,10.1496 30.20713,10.1496s19.79287,-2.1496 29.79287,-10.1496m-60,50c10,-8 19.58573,-11.3924 29.58573,-11.3924s20.41427,3.3924 30.41427,11.3924"
            />
          </svg>
        </div>
      ))}
    </div>
  )
}
