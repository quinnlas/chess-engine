const Board = require("./classes/Board");

const canCastle = {
  w: {
    short: true,
    long: true
  },
  b: {
    short: true,
    long: true
  }
}
const boardInput = [
  ['br', 'bn', 'bb', 'bq', 'bk', 'bb', null, 'br'],
  ['bp', 'bp', null, null, null, 'bp', 'bp', 'bp'],
  [null, null, 'bp', null, null, 'bn', null, null],
  [null, null, null, 'bp', null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, 'wp', null, null, 'bp', null, 'wp', 'wn'],
  ['wp', 'wb', 'wp', 'wp', 'wp', 'wp', 'wb', 'wp'],
  ['wr', 'wn', 'wq', null, 'wk', null, null, 'wr']
]
const toPlay = 'w'

const board = new Board(boardInput, toPlay, canCastle)
const moves = board.getMoves()
moves.forEach(m => console.log(board.convertMoveToAN(m)))
console.log()
// const move = moves[Math.floor(Math.random() * moves.length)]
const move = moves[10]
console.log(`Playing ${board.convertMoveToAN(move)}`)
const newBoard = board.getBoardAfterMove(move)
console.log(newBoard.toString())
console.log(`Score: ${newBoard.getScore()}`)
// console.log(dfs(board, 1))

// dfs to find the best move
function dfs (board, halfTurns = 2, originalToPlay = board.toPlay) {
  if (halfTurns < 1) throw Error('depth must be at least 1')

  const scoreMult = originalToPlay === 'w' ? 1 : -1

  const moves = board.getMoves()

  // last turn, determine which move leads to the best outcome
  // TODO this is probably wrong if the last turn is the other players
  // TODO checkbadcheck
  if (halfTurns === 1) {
    let bestScore = -Infinity * scoreMult
    let bestMove = null
    moves.forEach(m => {
      const score = board.getBoardAfterMove(m).getScore() * scoreMult
      if (score > bestScore) {
        bestScore = score
        bestMove = m
      }
    })
  }

  // TODO recursion
}