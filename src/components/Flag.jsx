const CODES = {
  'Brazil':'br','France':'fr','Argentina':'ar','England':'gb-eng',
  'Spain':'es','Germany':'de','Portugal':'pt','Netherlands':'nl',
  'Belgium':'be','Croatia':'hr','Denmark':'dk','Uruguay':'uy',
  'USA':'us','Mexico':'mx','Switzerland':'ch','Morocco':'ma',
  'Senegal':'sn','Colombia':'co','Japan':'jp','South Korea':'kr',
  'Australia':'au','Canada':'ca','Turkiye':'tr','Poland':'pl',
  'Serbia':'rs','Ukraine':'ua','Sweden':'se','Austria':'at',
  'Ecuador':'ec','Chile':'cl','Peru':'pe','Ghana':'gh',
  'Nigeria':'ng','Ivory Coast':'ci','Egypt':'eg','Cameroon':'cm',
  'South Africa':'za','Tunisia':'tn','Czech Rep.':'cz','Greece':'gr',
  'Hungary':'hu','Slovakia':'sk','Saudi Arabia':'sa','Iran':'ir',
  'Bolivia':'bo','DR Congo':'cd','Venezuela':'ve','Zambia':'zm',
  'Qatar':'qa','Bosnia':'ba','Scotland':'gb-sct','Haiti':'ht',
  'Paraguay':'py','Norway':'no','Iraq':'iq','Algeria':'dz',
  'Jordan':'jo','Uzbekistan':'uz','Panama':'pa','New Zealand':'nz',
  'Cape Verde':'cv','Curacao':'cw','Sweden':'se','Scotland':'gb-sct',
}

const EMOJIS = {
  'Brazil':'🇧🇷','France':'🇫🇷','Argentina':'🇦🇷','England':'🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'Spain':'🇪🇸','Germany':'🇩🇪','Portugal':'🇵🇹','Netherlands':'🇳🇱',
  'Belgium':'🇧🇪','Croatia':'🇭🇷','Denmark':'🇩🇰','Uruguay':'🇺🇾',
  'USA':'🇺🇸','Mexico':'🇲🇽','Switzerland':'🇨🇭','Morocco':'🇲🇦',
  'Senegal':'🇸🇳','Colombia':'🇨🇴','Japan':'🇯🇵','South Korea':'🇰🇷',
  'Australia':'🇦🇺','Canada':'🇨🇦','Turkiye':'🇹🇷','Poland':'🇵🇱',
  'Serbia':'🇷🇸','Ukraine':'🇺🇦','Sweden':'🇸🇪','Austria':'🇦🇹',
  'Ecuador':'🇪🇨','Chile':'🇨🇱','Peru':'🇵🇪','Ghana':'🇬🇭',
  'Nigeria':'🇳🇬','Ivory Coast':'🇨🇮','Egypt':'🇪🇬','Cameroon':'🇨🇲',
  'South Africa':'🇿🇦','Tunisia':'🇹🇳','Czech Rep.':'🇨🇿','Greece':'🇬🇷',
  'Hungary':'🇭🇺','Slovakia':'🇸🇰','Saudi Arabia':'🇸🇦','Iran':'🇮🇷',
  'Bolivia':'🇧🇴','DR Congo':'🇨🇩','Venezuela':'🇻🇪','Zambia':'🇿🇲',
  'Qatar':'🇶🇦','Bosnia':'🇧🇦','Scotland':'🏴󠁧󠁢󠁳󠁣󠁴󠁿','Haiti':'🇭🇹',
  'Paraguay':'🇵🇾','Norway':'🇳🇴','Iraq':'🇮🇶','Algeria':'🇩🇿',
  'Jordan':'🇯🇴','Uzbekistan':'🇺🇿','Panama':'🇵🇦','New Zealand':'🇳🇿',
  'Cape Verde':'🇨🇻','Curacao':'🇨🇼',
}

export default function Flag({ team, size = 24 }) {
  const code = CODES[team]
  const emoji = EMOJIS[team]
  if (!code && !emoji) return null
  if (!code) return <span style={{ fontSize: size * 0.85, lineHeight: 1 }}>{emoji}</span>
  return (
    <img
      src={`https://flagcdn.com/w40/${code}.png`}
      alt={team}
      width={size * 1.5}
      height={size}
      style={{ objectFit: 'cover', borderRadius: 2, display: 'inline-block', verticalAlign: 'middle' }}
      onError={e => {
        e.target.style.display = 'none'
        if (emoji) {
          const span = document.createElement('span')
          span.style.fontSize = `${size * 0.85}px`
          span.textContent = emoji
          e.target.parentNode.insertBefore(span, e.target.nextSibling)
        }
      }}
    />
  )
}
