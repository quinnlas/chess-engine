const _ = require('lodash')

const defaultCanCastle = () => ({
  w: {
    short: true,
    long: true
  },
  b: {
    short: true,
    long: true
  }
})

const defaultBoard = () => [
  ['br', 'bn', 'bb', 'bq', 'bk', 'bb', 'bn', 'br'],
  ['bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp', 'bp'],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  [null, null, null, null, null, null, null, null],
  ['wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp', 'wp'],
  ['wr', 'wn', 'wb', 'wq', 'wk', 'wb', 'wn', 'wr']
]

module.exports = class Board {
  // we need to keep the same info here as other board representations
  // for example FEN: https://en.wikipedia.org/wiki/Forsyth%E2%80%93Edwards_Notation#Definition
  #board
  #canCastle // refers to whether the pieces involved have moved, not anything with checks or cleared spaces
  #toPlay
  #lastMovePawnBoostCol // if the last move was a pawn boost, which col, otherwise null
  // in theory you could track stuff for 3fold draw, 50 move rule

  constructor(board = defaultBoard(), toPlay = 'w', canCastle = defaultCanCastle(), lastMovePawnBoostCol = null) {
    this.#board = board
    this.#toPlay = toPlay
    this.#canCastle = canCastle // TODO analyze for out of position kings/rooks
    this.#lastMovePawnBoostCol = lastMovePawnBoostCol
  }

  get toPlay() {
    return this.#toPlay
  }

  getMoves() {
    const moves = []
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        if (this.#board[row][col] && this.#board[row][col].startsWith(this.#toPlay)) {
          moves.push(...this.#getPieceMoves(row, col))
        }
      }
    }
    return moves
  }

  // an array of moves
  // moves have the format [startRow, startCol, endRow, endCol]
  // except castling which is a string in AN
  // so the return value e.g.:
  // ['O-O-O', [0, 0, 0, 1]]
  // color is not returned with castling since we know whose turn it is
  // TODO format promotions
  #getPieceMoves(row, col) {
    // TODO handle in check
    const piece = this.#board[row][col]
    if (piece === null) return []
    const type = piece[1]
    switch (type) {
      case 'r':
        return this.#getRookMoves(row,col)
      
      case 'n':
        return this.#getHorseyMoves(row,col)
          
      case 'b':
        return this.#getBishopMoves(row,col)
        
      case 'q':
        return this.#getQueenMoves(row,col)
        
      case 'k':
        return this.#getKingMoves(row,col)
        
      case 'p':
        return this.#getPawnMoves(row,col)
    }
  }

  // hori and vert are the amount to change the row/col by each time
  // eg moving up would have hori 0 and vert -1
  // set maxOffset to 1 for king/horsey
  #getLineMoves(row, col, hori, vert, maxOffset = 7) {
    const moves = []
    for (let offset = 1; offset <= maxOffset; offset++) {
      const r = row + offset * vert
      const c = col + offset * hori
      
      if (Math.max(r, c) > 7 || Math.min(r, c) < 0) break

      const occupant = this.#board[r][c]

      if (occupant === null) moves.push([row, col, r, c])
      else if (occupant.startsWith(this.#toPlay)) break
      else {
        // capture, but can't continue further
        moves.push([row, col, r, c])
        break
      }
    }
    return moves
  }

  // castling is considered a king move and will not be listed here
  #getRookMoves(row, col) {
    return    this.#getLineMoves(row, col, 1, 0)
      .concat(this.#getLineMoves(row, col, -1, 0))
      .concat(this.#getLineMoves(row, col, 0, 1))
      .concat(this.#getLineMoves(row, col, 0, -1))
  }

  #getHorseyMoves(row, col) {
    return [
      [1,2],
      [1,-2],
      [-1,2],
      [-1,-2],
      [2,1],
      [-2,1],
      [2,-1],
      [-2,-1]
    ]
      .map(([h, v]) => this.#getLineMoves(row, col, h, v, 1))
      .flat(1)
  }

  #getBishopMoves(row, col) {
    return    this.#getLineMoves(row, col, 1, 1)
      .concat(this.#getLineMoves(row, col, 1, -1))
      .concat(this.#getLineMoves(row, col, -1, 1))
      .concat(this.#getLineMoves(row, col, -1, -1))
  }

  #getQueenMoves(row, col) {
    return this.#getBishopMoves(row, col)
      .concat(this.#getRookMoves(row, col))
  }

  #getKingMoves(row, col) {
    // normal moves
    const moves = [
      [1,1],
      [1,-1],
      [-1,1],
      [-1,-1],
      [1,0],
      [-1,0],
      [0,1],
      [0,-1]
    ]
      .map(([h, v]) => this.#getLineMoves(row, col, h, v, 1))
      .flat(1)

    // castling
    // queenside
    if (this.#canCastle[this.#toPlay].long) {
      const rank = this.#board[row]
      if (rank.slice(1, 4).every(s => s === null)) {
        // TODO check for checks
        // can do this by getting board after each intermediate king move, then checkbadcheck
        if (true) {
          moves.push('O-O-O')
        }
      }
    }

    // kingside
    if (this.#canCastle[this.#toPlay].short) {
      const rank = this.#board[row]
      if (rank.slice(5, 7).every(s => s === null)) {
        // TODO check for checks
        if (true) {
          moves.push('O-O')
        }
      }
    }

    return moves
  }

  #getPawnMoves(row, col) {
    const [vert, startRow, promoRow] =
      this.#toPlay === 'w' ? [-1, 6, 1] : [1, 1, 6]

    const moves = []

    // normal move
    if (this.#board[row + vert][col] === null) {
      moves.push([row, col, row + vert, col])
      // TODO promote

      // pawn boost
      // nested here since the square in between needs to be clear
      if (row === startRow && this.#board[row + 2 * vert][col] === null) {
        moves.push([row, col, row + 2 * vert, col])
      }
    }

    // captures (TODO promote)
    const capCols = [col - 1, col + 1]
    capCols.forEach(capCol => {
        const occupant = this.#board[row + vert] && this.#board[row + vert][capCol]
        if (occupant && !occupant.startsWith(this.#toPlay)){
          moves.push([row, col, row + vert, capCol])
        }
    })

    // TODO en passant

    return moves
  }

  getBoardAfterMove(move) {
    const newBoard = _.cloneDeep(this.#board)
    const newCanCastle = _.cloneDeep(this.#canCastle)
    const newToPlay = this.#toPlay === 'w' ? 'b' : 'w'
    let newPawnBoost = null

    const backLineRow = this.#toPlay === 'w' ? 7 : 0
    if (typeof move === 'string') {
      // castling
      const length = move.length === 5 ? 'long' : 'short'
      newCanCastle[this.#toPlay].short = false
      newCanCastle[this.#toPlay].long = false

      const row = newBoard[backLineRow]
      row[4] = null
      if (length === 'long') {
        row[0] = null
        row[2] = this.#toPlay + 'k'
        row[3] = this.#toPlay + 'r'
      } else {
        row[5] = this.#toPlay + 'r'
        row[6] = this.#toPlay + 'k'
        row[7] = null
      }
    } else {
      // only one piece is moved otherwise
      const piece = newBoard[move[0]][move[1]]
      newBoard[move[0]][move[1]] = null
      newBoard[move[2]][move[3]] = piece // implied capture bc of overwriting
      // (TODO capture for en passant) (TODO promotion)

      // adjust castling
      if (piece[1] === 'k') {
        newCanCastle[this.#toPlay].short = false
        newCanCastle[this.#toPlay].long = false
      }
      if (move[0] === backLineRow && move[1] === 0) newCanCastle[this.#toPlay].long = false
      if (move[0] === backLineRow && move[1] === 7) newCanCastle[this.#toPlay].short = false

      // adjust pawn boost
      if (piece[1] === 'p' && Math.abs(move[0] - move[2]) === 2) {
        newPawnBoost = move[1]
      }
    }

    return new Board(newBoard, newToPlay, newCanCastle, newPawnBoost)
  }

  // checks if the game is in an illegal state because the side not playing is in check
  // TODO
  checkBadCheck() {

  }

  getScore() {
    // just scores based on current material
    let score = 0
    this.#board.forEach(row => {
      row.forEach(space => {
        if (!space) return
        const mult = space[0] === 'w' ? 1 : -1
        switch (space[1]) {
          case 'r':
            return score += mult * 5
          case 'n':
            return score += mult * 3
          case 'b':
            return score += mult * 3
          case 'q':
            return score += mult * 9
          case 'p':
            return score += mult * 1
        }
      })
    })
    // TODO checkmate

    return score
  }

  // kind of
  convertMoveToAN(move) {
    if (!Array.isArray(move)) return move
    const [r1, c1, r2, c2] = move
    const startAN = 'abcdefgh'[c1] + (8 - r1)
    const endAN = 'abcdefgh'[c2] + (8 - r2)
    let piece = this.#board[r1][c1][1].toUpperCase()
    if (piece === 'P') piece = ''
    return `${piece ? piece + ': ' : ''}${startAN} -> ${endAN}`
  }

  toString() {
    return '---------------------------------\n'
     + this.#board.map(r =>
      '| '
      + r.map(s => s ? (s[0] === 'w' ? s[1].toUpperCase() : s[1]) : ' ').join(' | ')
      + ' |'
    ).join('\n---------------------------------\n')
     + '\n---------------------------------'
  }
}