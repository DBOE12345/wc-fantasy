import iconImg from '../assets/dubup-logo-icon.png'
import stackedImg from '../assets/dubup-logo-stacked.png'
import horizontalImg from '../assets/dubup-logo-horizontal.png'

// Detects if image is JPEG (black bg) or PNG (transparent)
// We use mix-blend-mode: screen to remove black backgrounds from JPEGs
const blendStyle = { mixBlendMode: 'screen' }

// Icon only - used in headers
export default function DubUpLogo({ size = 40 }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0, overflow: 'hidden' }}>
      <img
        src={iconImg}
        alt="DubUp"
        style={{ width: '100%', height: '100%', objectFit: 'contain', ...blendStyle }}
      />
    </div>
  )
}

// Stacked logo - welcome screen
export function DubUpLogoLarge({ size = 180 }) {
  return (
    <div style={{ width: size, height: size, flexShrink: 0, overflow: 'hidden' }}>
      <img
        src={stackedImg}
        alt="DubUp Fantasy"
        style={{ width: '100%', height: '100%', objectFit: 'contain', ...blendStyle }}
      />
    </div>
  )
}

// Horizontal - nav headers
export function DubUpLogoHorizontal({ height = 36 }) {
  return (
    <div style={{ height: height, flexShrink: 0, overflow: 'hidden', display: 'flex', alignItems: 'center' }}>
      <img
        src={horizontalImg}
        alt="DubUp Fantasy"
        style={{ height: '100%', width: 'auto', objectFit: 'contain', ...blendStyle }}
      />
    </div>
  )
}
