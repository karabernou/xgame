class Game {
    constructor() {
        this.boardSize = 10;
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
        this.currentPlayer = 'red';
        this.scores = { red: 0, green: 0 };
        this.scoredLines = new Set();
        this.gameEnded = false;
        this.isComputerOpponent = false;
        this.initializePlayerSelection();
    }

    initializePlayerSelection() {
        const modeButtons = document.querySelectorAll('.mode-btn');
        modeButtons.forEach(button => {
            button.addEventListener('click', () => {
                this.isComputerOpponent = button.dataset.mode === 'computer';
                document.getElementById('player-selection').style.display = 'none';
                document.getElementById('game-board-container').style.display = 'block';
                
                if (this.isComputerOpponent) {
                    document.querySelector('.green-player .player-name').textContent = 'Computer';
                }
                
                this.initializeBoard();
                this.initializeNewGameButton();
            });
        });
    }

    handleClick(event) {
        if (this.gameEnded) return;
        if (this.isComputerOpponent && this.currentPlayer === 'green') return;
        
        const row = parseInt(event.target.dataset.row);
        const col = parseInt(event.target.dataset.col);

        if (this.board[row][col] !== '') return;

        this.makeMove(row, col);
        
        if (this.isComputerOpponent && !this.gameEnded) {
            setTimeout(() => this.makeComputerMove(), 500);
        }
    }

    makeMove(row, col) {
        this.board[row][col] = this.currentPlayer;
        const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        cell.innerHTML = 'X';
        cell.style.color = this.currentPlayer;

        this.checkAllPossibleScores();
        
        if (this.isBoardFull() || !this.hasValidMoves()) {
            this.endGame();
        } else {
            this.switchPlayer();
        }
    }

    makeComputerMove() {
        const move = this.findBestMove();
        if (move) {
            this.makeMove(move.row, move.col);
        }
    }

    findBestMove() {
        const winningMove = this.findWinningMove();
        if (winningMove) return winningMove;

        const blockingMove = this.findBlockingMove();
        if (blockingMove) return blockingMove;

        return this.findOptimalMove();
    }

    findWinningMove() {
        return this.findMoveForPlayer('green');
    }

    findBlockingMove() {
        return this.findMoveForPlayer('red');
    }

    findMoveForPlayer(player) {
        for (let row = 0; row < this.boardSize; row++) {
            for (let col = 0; col < this.boardSize; col++) {
                if (this.board[row][col] === '') {
                    this.board[row][col] = player;
                    if (this.checkWinningPosition(row, col, player)) {
                        this.board[row][col] = '';
                        return { row, col };
                    }
                    this.board[row][col] = '';
                }
            }
        }
        return null;
    }

    checkWinningPosition(row, col, player) {
        const directions = [
            [[0, 1], [0, -1]], // horizontal
            [[1, 0], [-1, 0]], // vertical
            [[1, 1], [-1, -1]], // diagonal
            [[1, -1], [-1, 1]]  // diagonal
        ];

        for (const [dir1, dir2] of directions) {
            let count = 1;
            
            for (const [dx, dy] of [dir1, dir2]) {
                let r = row + dx;
                let c = col + dy;
                while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && 
                       this.board[r][c] === player) {
                    count++;
                    r += dx;
                    c += dy;
                }
            }
            
            if (count >= 5) return true;
        }
        return false;
    }

    findOptimalMove() {
        let bestMove = null;
        let bestScore = -Infinity;

        const centerStart = Math.floor(this.boardSize * 0.3);
        const centerEnd = Math.floor(this.boardSize * 0.7);

        for (let row = centerStart; row <= centerEnd; row++) {
            for (let col = centerStart; col <= centerEnd; col++) {
                if (this.board[row][col] === '') {
                    const score = this.evaluateMove(row, col);
                    if (score > bestScore) {
                        bestScore = score;
                        bestMove = { row, col };
                    }
                }
            }
        }

        if (bestScore < 10) {
            for (let row = 0; row < this.boardSize; row++) {
                for (let col = 0; col < this.boardSize; col++) {
                    if (this.board[row][col] === '' && 
                        (row < centerStart || row > centerEnd || 
                         col < centerStart || col > centerEnd)) {
                        const score = this.evaluateMove(row, col);
                        if (score > bestScore) {
                            bestScore = score;
                            bestMove = { row, col };
                        }
                    }
                }
            }
        }

        return bestMove || this.findRandomMove();
    }

    evaluateMove(row, col) {
        let score = 0;
        
        const directions = [
            [0, 1],  // horizontal
            [1, 0],  // vertical
            [1, 1],  // diagonal
            [1, -1]  // anti-diagonal
        ];

        for (const [dx, dy] of directions) {
            let ownCount = 1;
            let oppCount = 1;
            let ownSpace = 0;
            let oppSpace = 0;

            this.countLine(row, col, dx, dy, 'green', result => {
                ownCount += result.count;
                ownSpace += result.space;
            });
            this.countLine(row, col, dx, dy, 'red', result => {
                oppCount += result.count;
                oppSpace += result.space;
            });

            this.countLine(row, col, -dx, -dy, 'green', result => {
                ownCount += result.count;
                ownSpace += result.space;
            });
            this.countLine(row, col, -dx, -dy, 'red', result => {
                oppCount += result.count;
                oppSpace += result.space;
            });

            if (ownCount >= 4) score += 100;
            if (oppCount >= 4) score += 80;
            if (ownCount === 3 && ownSpace >= 2) score += 50;
            if (oppCount === 3 && oppSpace >= 2) score += 40;
            if (ownCount === 2 && ownSpace >= 3) score += 10;
            if (oppCount === 2 && oppSpace >= 3) score += 8;
        }

        const centerDist = Math.abs(row - this.boardSize/2) + Math.abs(col - this.boardSize/2);
        score += (this.boardSize - centerDist) / 2;

        return score;
    }

    countLine(row, col, dx, dy, player, callback) {
        let count = 0;
        let space = 0;
        let r = row + dx;
        let c = col + dy;
        
        while (r >= 0 && r < this.boardSize && c >= 0 && c < this.boardSize && space < 4) {
            if (this.board[r][c] === player) {
                count++;
            } else if (this.board[r][c] === '') {
                space++;
            } else {
                break;
            }
            r += dx;
            c += dy;
        }
        
        callback({ count, space });
    }

    resetGame() {
        document.getElementById('game-board-container').style.display = 'none';
        document.getElementById('player-selection').style.display = 'block';
        
        this.board = Array(this.boardSize).fill().map(() => Array(this.boardSize).fill(''));
        this.currentPlayer = 'red';
        this.scores = { red: 0, green: 0 };
        this.scoredLines = new Set();
        this.gameEnded = false;
        this.updateScoreDisplay();
        
        const cells = document.querySelectorAll('.cell');
        cells.forEach(cell => {
            cell.innerHTML = '';
            cell.style.color = '';
        });
        
        const gameStatus = document.getElementById('game-status');
        if (gameStatus) {
            gameStatus.remove();
        }
        
        const playerSpan = document.getElementById('current-player');
        playerSpan.textContent = "Red's Turn";
        playerSpan.style.color = 'red';
    }

    initializeNewGameButton() {
        const newGameBtn = document.getElementById('new-game');
        newGameBtn.addEventListener('click', () => this.resetGame());
    }

    initializeBoard() {
        const gameBoard = document.getElementById('game-board');
        gameBoard.innerHTML = '';
        
        for (let i = 0; i < 10; i++) {
            for (let j = 0; j < 10; j++) {
                const cell = document.createElement('div');
                cell.className = 'cell';
                cell.dataset.row = i;
                cell.dataset.col = j;
                cell.addEventListener('click', (e) => this.handleClick(e));
                gameBoard.appendChild(cell);
            }
        }
    }

    checkAllPossibleScores() {
        const newScorePositions = new Set();
        
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                if (this.board[row][col] === this.currentPlayer) {
                    this.findScoringCombinations(row, col, newScorePositions);
                }
            }
        }

        if (newScorePositions.size > 0) {
            this.highlightScoringCells(newScorePositions);
            this.scoredLines = new Set([...this.scoredLines, ...newScorePositions]);
        }
    }

    findScoringCombinations(row, col, newScorePositions) {
        const directions = [
            [[0, 1], [0, -1], 'horizontal'], // horizontal
            [[1, 0], [-1, 0], 'vertical'], // vertical
            [[1, 1], [-1, -1], 'diagonal-right'], // diagonal
            [[1, -1], [-1, 1], 'diagonal-left']  // diagonal
        ];

        for (const direction of directions) {
            let count = 1;
            const positions = [];
            positions.push({ row, col });
            
            const [dx1, dy1] = direction[0];
            const [dx2, dy2] = direction[1];
            const lineType = direction[2];

            for (const [dx, dy] of [direction[0], direction[1]]) {
                let r = row + dx;
                let c = col + dy;
                while (r >= 0 && r < 10 && c >= 0 && c < 10 && 
                       this.board[r][c] === this.currentPlayer) {
                    positions.push({ row: r, col: c });
                    count++;
                    r += dx;
                    c += dy;
                }
            }

            positions.sort((a, b) => {
                if (a.row !== b.row) return a.row - b.row;
                return a.col - b.col;
            });

            if (count === 5) {
                const lineKey = positions.map(p => `${p.row},${p.col}`).join('|');
                if (!this.scoredLines.has(lineKey)) {
                    this.scores[this.currentPlayer] += 1;
                    this.updateScoreDisplay();
                    this.scoredLines.add(lineKey);
                    this.drawScoringLine(positions[0], positions[4], lineType);
                }
            }
        }
    }

    drawScoringLine(startPos, endPos, lineType) {
        const line = document.createElement('div');
        line.className = `score-line ${lineType}`;
        line.style.color = this.currentPlayer;
        
        const midRow = Math.floor((startPos.row + endPos.row) / 2);
        const midCol = Math.floor((startPos.col + endPos.col) / 2);
        const midCell = document.querySelector(
            `[data-row="${midRow}"][data-col="${midCol}"]`
        );
        
        if (midCell) {
            midCell.appendChild(line);
        }
    }

    highlightScoringCells(positions) {
        positions.forEach(pos => {
            const [row, col] = pos.split(',').map(Number);
            const cell = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
            cell.classList.add('highlight-score');
            setTimeout(() => cell.classList.remove('highlight-score'), 2000);
        });
    }

    isOverlapping(positions) {
        for (const pos of positions) {
            if (this.scoredLines.has(pos)) {
                return true;
            }
        }
        return false;
    }

    switchPlayer() {
        this.currentPlayer = this.currentPlayer === 'red' ? 'green' : 'red';
        const playerSpan = document.getElementById('current-player');
        playerSpan.textContent = this.currentPlayer.charAt(0).toUpperCase() + "'s Turn";
        playerSpan.style.color = this.currentPlayer;
    }

    updateScoreDisplay() {
        document.getElementById('red-score').textContent = this.scores.red;
        document.getElementById('green-score').textContent = this.scores.green;
    }

    isBoardFull() {
        return this.board.every(row => row.every(cell => cell !== ''));
    }

    hasValidMoves() {
        for (let row = 0; row < 10; row++) {
            for (let col = 0; col < 10; col++) {
                if (this.board[row][col] === '') {
                    if (this.couldFormGoal(row, col)) {
                        return true;
                    }
                }
            }
        }
        return false;
    }

    couldFormGoal(row, col) {
        const directions = [
            [[0, 1], [0, -1]], // horizontal
            [[1, 0], [-1, 0]], // vertical
            [[1, 1], [-1, -1]], // diagonal
            [[1, -1], [-1, 1]]  // diagonal
        ];

        for (const [dir1, dir2] of directions) {
            let count = 1;
            
            for (const [dx, dy] of [dir1, dir2]) {
                let r = row + dx;
                let c = col + dy;
                let consecutiveCount = 0;
                
                while (r >= 0 && r < 10 && c >= 0 && c < 10 && consecutiveCount < 4) {
                    if (this.board[r][c] === '' || this.board[r][c] === this.currentPlayer) {
                        consecutiveCount++;
                        count++;
                    } else {
                        break;
                    }
                    r += dx;
                    c += dy;
                }
            }
            
            if (count >= 5) return true;
        }
        return false;
    }

    endGame() {
        this.gameEnded = true;
        const gameStatus = document.createElement('div');
        gameStatus.className = 'game-status';
        gameStatus.id = 'game-status';

        if (this.scores.red > this.scores.green) {
            gameStatus.textContent = 'Red Player Wins!';
            gameStatus.classList.add('red-wins');
        } else if (this.scores.green > this.scores.red) {
            gameStatus.textContent = 'Green Player Wins!';
            gameStatus.classList.add('green-wins');
        } else {
            gameStatus.textContent = "It's a Draw!";
            gameStatus.classList.add('draw');
        }

        const existingStatus = document.getElementById('game-status');
        if (existingStatus) {
            existingStatus.remove();
        }

        const scoreContainer = document.querySelector('.score-container');
        scoreContainer.after(gameStatus);

        setTimeout(() => gameStatus.classList.add('show'), 10);
    }
}

const game = new Game(); 