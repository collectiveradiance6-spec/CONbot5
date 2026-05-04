import { BRAND } from '../../content/brandCopy'
import { ConbotLogo } from './ConbotLogo'

export function BrandStatusChip() {
  return (
    <div className="brand-status-chip">
      <ConbotLogo />
      <div className="brand-status-copy">
        <span>CONBOT5 CORE</span>
        <strong>{BRAND.productName}</strong>
        <small>{BRAND.matrixLabel}</small>
      </div>
    </div>
  )
}
