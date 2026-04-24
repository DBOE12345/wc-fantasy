import iconImg from '../assets/dubup-logo-icon.png'
import stackedImg from '../assets/dubup-logo-stacked.png'
import horizontalImg from '../assets/dubup-logo-horizontal.png'

// Icon only - used in headers and small spaces
export default function DubUpLogo({ size = 40 }) {
  return (
    <img
      src={iconImg}
      alt="DubUp"
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  )
}

// Stacked logo - used on welcome screen
export function DubUpLogoLarge({ size = 120 }) {
  return (
    <img
      src={stackedImg}
      alt="DubUp Fantasy"
      style={{ width: size, height: size, objectFit: 'contain', flexShrink: 0 }}
    />
  )
}

// Horizontal logo - used in nav headers
export function DubUpLogoHorizontal({ height = 36 }) {
  return (
    <img
      src={horizontalImg}
      alt="DubUp Fantasy"
      style={{ height: height, width: 'auto', objectFit: 'contain', flexShrink: 0 }}
    />
  )
}
