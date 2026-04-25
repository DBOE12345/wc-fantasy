import iconImg from '../assets/dubup-logo-icon.png'
import stackedImg from '../assets/dubup-logo-stacked.png'
import horizontalImg from '../assets/dubup-logo-horizontal.png'

// Icon only - headers
export default function DubUpLogo({ size = 40 }) {
  return (
    <img
      src={iconImg}
      alt="DubUp"
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  )
}

// Stacked - welcome screen
export function DubUpLogoLarge({ size = 220 }) {
  return (
    <img
      src={stackedImg}
      alt="DubUp Fantasy"
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  )
}

// Horizontal - nav headers
export function DubUpLogoHorizontal({ height = 56 }) {
  return (
    <img
      src={horizontalImg}
      alt="DubUp Fantasy"
      style={{ height: height, width: 'auto', objectFit: 'contain', flexShrink: 0, maxWidth: 240 }}
    />
  )
}
