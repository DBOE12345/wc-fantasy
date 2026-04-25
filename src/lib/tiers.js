// DubUp Dubber tier system
export const TIERS = [
  {
    id: 'gold',
    label: 'Gold Dubber',
    minReferrals: 100,
    color: '#C8A96A',
    bg: 'rgba(200,169,106,.15)',
    border: 'rgba(200,169,106,.35)',
    emoji: '🥇',
    badge: '⭐',
    perks: ['Gold DU badge on profile', 'Gold Dubber status', 'VIP league features (coming soon)'],
  },
  {
    id: 'silver',
    label: 'Silver Dubber',
    minReferrals: 50,
    color: '#B0BEC5',
    bg: 'rgba(176,190,197,.12)',
    border: 'rgba(176,190,197,.3)',
    emoji: '🥈',
    badge: '🔘',
    perks: ['Silver DU badge on profile', 'Silver Dubber status', 'Early access to new features'],
  },
  {
    id: 'bronze',
    label: 'Bronze Dubber',
    minReferrals: 20,
    color: '#CD7F32',
    bg: 'rgba(205,127,50,.12)',
    border: 'rgba(205,127,50,.3)',
    emoji: '🥉',
    badge: '🔶',
    perks: ['Bronze DU badge on profile', 'Bronze Dubber status', 'Exclusive in-app recognition'],
  },
]

export function getTier(referralCount) {
  for (const tier of TIERS) {
    if (referralCount >= tier.minReferrals) return tier
  }
  return null
}

export function getNextTier(referralCount) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (referralCount < TIERS[i].minReferrals) return TIERS[i]
  }
  return null
}

export function getTierBadge(referralCount) {
  const tier = getTier(referralCount)
  if (!tier) return null
  return tier.badge
}
