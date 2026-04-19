import { useEffect, useState } from 'react'

export function RotatingText({ phrases, interval = 3000 }) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isVisible, setIsVisible] = useState(true)

  useEffect(() => {
    const timer = setInterval(() => {
      setIsVisible(false)
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % phrases.length)
        setIsVisible(true)
      }, 500)
    }, interval)

    return () => clearInterval(timer)
  }, [phrases.length, interval])

  return (
    <span
      className="text-primary inline-block transition-opacity duration-500"
      style={{ opacity: isVisible ? 1 : 0 }}
    >
      {phrases[currentIndex]}
    </span>
  )
}
