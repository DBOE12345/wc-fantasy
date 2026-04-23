// Generate the full snake draft order for n players and total picks
export function snakeOrder(numPlayers, totalTeams) {
  const picksPerPlayer = totalTeams / numPlayers
  const order = []
  for (let round = 0; round < picksPerPlayer; round++) {
    const players = [...Array(numPlayers).keys()]
    if (round % 2 === 1) players.reverse()
    players.forEach(i => order.push(i))
  }
  return order
}

// Get which player index should pick at position draftPos
export function whoseTurn(numPlayers, totalTeams, draftPos) {
  const order = snakeOrder(numPlayers, totalTeams)
  return order[draftPos] ?? null
}

// Get how many picks remain for a given player
export function picksRemaining(numPlayers, totalTeams, draftPos, playerIndex) {
  const order = snakeOrder(numPlayers, totalTeams)
  return order.slice(draftPos).filter(i => i === playerIndex).length
}
