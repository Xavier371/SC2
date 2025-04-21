// Final Combined JS File with Smart AI Logic and Full UI Logic

const boardSize = 8;
let board = [];
let currentPlayer = 'white';
let selectedPiece = null;
let isDragging = false;
let touchStartX = 0;
let touchStartY = 0;
let touchStartRow = null;
let touchStartCol = null;
let gameMode = '1p';
let lastMovedBlackPiece = null;

function initializeBoard() {
    board = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
    for (let i = 0; i < boardSize; i++) board[1][i] = 'black';
    for (let i = 0; i < boardSize; i++) board[boardSize - 2][i] = 'white';
    currentPlayer = 'white';
    selectedPiece = null;
    lastMovedBlackPiece = null;
    renderBoard();
    updateGameStatus();
}

function renderBoard() {
    const gameBoard = document.getElementById('game-board');
    gameBoard.innerHTML = '';
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            const cell = document.createElement('div');
            cell.dataset.row = row;
            cell.dataset.col = col;
            if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
                cell.classList.add('selected');
            }
            if (board[row][col]) {
                const triangle = document.createElement('div');
                triangle.className = 'triangle ' + board[row][col];
                if ((board[row][col] === 'white' && currentPlayer === 'white') || 
                    (gameMode === '2p' && board[row][col] === 'black' && currentPlayer === 'black')) {
                    triangle.draggable = true;
                    triangle.addEventListener('dragstart', (e) => {
                        isDragging = true;
                        e.dataTransfer.setData('text/plain', JSON.stringify({ row, col }));
                        selectedPiece = { row, col };
                    });
                    triangle.addEventListener('dragend', () => {
                        isDragging = false;
                    });
                    triangle.addEventListener('touchstart', (e) => {
                        const touch = e.touches[0];
                        touchStartX = touch.clientX;
                        touchStartY = touch.clientY;
                        touchStartRow = row;
                        touchStartCol = col;
                        selectedPiece = { row, col };
                        renderBoard();
                        e.preventDefault();
                    });
                    triangle.addEventListener('mousedown', (e) => {
                        e.stopPropagation();
                        cellClick(row, col);
                    });
                }
                cell.appendChild(triangle);
            }
            cell.addEventListener('click', () => cellClick(row, col));
            cell.addEventListener('mouseup', () => {
                if (selectedPiece && row !== selectedPiece.row && col !== selectedPiece.col) {
                    if (isValidMove(selectedPiece.row, selectedPiece.col, row, col)) {
                        movePiece(selectedPiece.row, selectedPiece.col, row, col);
                    }
                }
            });
            cell.addEventListener('dragover', (e) => e.preventDefault());
            cell.addEventListener('drop', (e) => {
                e.preventDefault();
                try {
                    const { row: fromRow, col: fromCol } = JSON.parse(e.dataTransfer.getData('text/plain'));
                    const toRow = parseInt(cell.dataset.row);
                    const toCol = parseInt(cell.dataset.col);
                    if (isValidMove(fromRow, fromCol, toRow, toCol)) {
                        movePiece(fromRow, fromCol, toRow, toCol);
                    } else {
                        selectedPiece = null;
                        renderBoard();
                    }
                } catch (error) {
                    selectedPiece = null;
                    renderBoard();
                }
            });
            cell.addEventListener('touchend', (e) => {
                if (!selectedPiece) return;
                const touch = e.changedTouches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                let touchedCell = element;
                while (touchedCell && !touchedCell.dataset.row) {
                    if (touchedCell === document.body) break;
                    touchedCell = touchedCell.parentElement;
                }
                if (touchedCell && touchedCell.dataset.row) {
                    const toRow = parseInt(touchedCell.dataset.row);
                    const toCol = parseInt(touchedCell.dataset.col);
                    if (isValidMove(selectedPiece.row, selectedPiece.col, toRow, toCol)) {
                        movePiece(selectedPiece.row, selectedPiece.col, toRow, toCol);
                    } else {
                        selectedPiece = null;
                        renderBoard();
                    }
                }
                e.preventDefault();
            });
            gameBoard.appendChild(cell);
        }
    }
}

function cellClick(row, col) {
    const isPlayerTurn = (currentPlayer === 'white') || (gameMode === '2p' && currentPlayer === 'black');
    if (!isPlayerTurn) return;
    if (board[row][col] === currentPlayer) {
        if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
            selectedPiece = null;
            renderBoard();
            return;
        }
        selectedPiece = { row, col };
        renderBoard();
        return;
    }
    if (selectedPiece) {
        if (isValidMove(selectedPiece.row, selectedPiece.col, row, col)) {
            movePiece(selectedPiece.row, selectedPiece.col, row, col);
        }
    }
}

function isValidMove(row, col, newRow, newCol) {
    if (board[row][col] !== currentPlayer) return false;
    if (board[newRow][newCol] === board[row][col]) return false;
    const rowDiff = Math.abs(newRow - row);
    const colDiff = Math.abs(newCol - col);
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

function updateGameStatus() {
    const status = document.getElementById('game-status');
    if (status) {
        status.textContent = `Current turn: ${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}`;
    }
}

function toggleGameMode() {
    gameMode = gameMode === '1p' ? '2p' : '1p';
    const modeBtn = document.getElementById('mode-toggle-btn');
    if (modeBtn) {
        modeBtn.textContent = `${gameMode === '1p' ? 'One Player' : 'Two Player'}`;
    }
    initializeBoard();
}

document.addEventListener('DOMContentLoaded', function () {
    document.addEventListener('touchmove', function (e) {
        if (e.target.closest('#game-board')) {
            e.preventDefault();
        }
    }, { passive: false });
    document.addEventListener('touchstart', function (e) {
        if (e.target.closest('#game-board')) {
            e.preventDefault();
        }
    }, { passive: false });
    const instructionsBtn = document.getElementById('instructions-btn');
    const closeInstructionsBtn = document.getElementById('close-instructions-btn');
    const instructionsPopup = document.getElementById('instructions-popup');
    if (instructionsBtn) {
        instructionsBtn.addEventListener('click', function () {
            instructionsPopup.classList.remove('hidden');
        });
    }
    if (closeInstructionsBtn) {
        closeInstructionsBtn.addEventListener('click', function () {
            instructionsPopup.classList.add('hidden');
        });
    }
    const modeToggleBtn = document.getElementById('mode-toggle-btn');
    if (modeToggleBtn) {
        modeToggleBtn.addEventListener('click', toggleGameMode);
    }
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', initializeBoard);
    }
});

window.onload = function () {
    initializeBoard();
};

// -- Smart AI Logic Below --

function makeBlackMove() {
    const whiteThreats = findWhitePawnsWithClearPath();
    if (whiteThreats.length > 0) {
        const threat = whiteThreats[0];
        const targetCol = threat.col;
        const whiteDistance = threat.row;
        let bestBlocker = null;
        let shortestSteps = Infinity;
        for (let row = 0; row < boardSize; row++) {
            for (let col = 0; col < boardSize; col++) {
                if (board[row][col] === 'black') {
                    const colSteps = Math.abs(col - targetCol);
                    const rowSteps = boardSize - 1 - row;
                    const totalSteps = colSteps + rowSteps;
                    if (totalSteps < whiteDistance && !isAdjacentToWhite(row, targetCol)) {
                        if (col !== targetCol && board[row][targetCol] === null) {
                            if (totalSteps < shortestSteps) {
                                shortestSteps = totalSteps;
                                bestBlocker = { fromRow: row, fromCol: col, toRow: row, toCol: targetCol };
                            }
                        }
                    }
                }
            }
        }
        if (bestBlocker) {
            movePiece(bestBlocker.fromRow, bestBlocker.fromCol, bestBlocker.toRow, bestBlocker.toCol);
            return;
        }
    }
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                const directions = [
                    { r: -1, c: 0 }, { r: 1, c: 0 },
                    { r: 0, c: -1 }, { r: 0, c: 1 }
                ];
                for (const dir of directions) {
                    const newRow = row + dir.r;
                    const newCol = col + dir.c;
                    if (
                        newRow >= 0 && newRow < boardSize &&
                        newCol >= 0 && newCol < boardSize &&
                        board[newRow][newCol] === 'white'
                    ) {
                        movePiece(row, col, newRow, newCol);
                        return;
                    }
                }
            }
        }
    }
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                const newRow = row + 1;
                if (
                    newRow < boardSize &&
                    board[newRow][col] === null &&
                    !isAdjacentToWhite(newRow, col)
                ) {
                    movePiece(row, col, newRow, col);
                    return;
                }
            }
        }
    }
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                for (const dir of [-1, 1]) {
                    const newCol = col + dir;
                    if (
                        newCol >= 0 && newCol < boardSize &&
                        board[row][newCol] === null &&
                        !isAdjacentToWhite(row, newCol)
                    ) {
                        movePiece(row, col, row, newCol);
                        return;
                    }
                }
            }
        }
    }
    currentPlayer = 'white';
    renderBoard();
    updateGameStatus();
}

function isAdjacentToWhite(row, col) {
    const directions = [
        { r: -1, c: 0 }, { r: 1, c: 0 },
        { r: 0, c: -1 }, { r: 0, c: 1 }
    ];
    for (const dir of directions) {
        const r = row + dir.r;
        const c = col + dir.c;
        if (r >= 0 && r < boardSize && c >= 0 && c < boardSize) {
            if (board[r][c] === 'white') return true;
        }
    }
    return false;
}

function findWhitePawnsWithClearPath() {
    const threats = [];
    for (let col = 0; col < boardSize; col++) {
        for (let row = 0; row < boardSize; row++) {
            if (board[row][col] === 'white') {
                let clear = true;
                for (let r = row - 1; r >= 0; r--) {
                    if (board[r][col] !== null) {
                        clear = false;
                        break;
                    }
                }
                if (clear) threats.push({ row, col });
                break;
            }
        }
    }
    threats.sort((a, b) => a.row - b.row);
    return threats;
}
