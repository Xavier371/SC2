const boardSize = 8;
let board = [];
let currentPlayer = 'white';
let selectedPiece = null;
let isDragging = false;
let touchStartX = 0;
let touchStartY = 0;
let touchStartRow = null;
let touchStartCol = null;
let gameMode = '1p'; // '1p' or '2p'
let lastMovedBlackPiece = null; // Track the last moved black piece for continuity

function initializeBoard() {
    board = Array.from({ length: boardSize }, () => Array(boardSize).fill(null));
    
    // Place black pieces in row 1
    for (let i = 0; i < boardSize; i++) {
        board[1][i] = 'black';
    }
    
    // Place white pieces in second-to-last row
    for (let i = 0; i < boardSize; i++) {
        board[boardSize - 2][i] = 'white';
    }
    
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
            
            // Highlight selected piece
            if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
                cell.classList.add('selected');
            }
            
            if (board[row][col]) {
                const triangle = document.createElement('div');
                triangle.className = 'triangle ' + board[row][col];
                
                // Make player's pieces interactive
                if ((board[row][col] === 'white' && currentPlayer === 'white') || 
                    (gameMode === '2p' && board[row][col] === 'black' && currentPlayer === 'black')) {
                    
                    // Make draggable for desktop
                    triangle.draggable = true;
                    
                    // Desktop drag events
                    triangle.addEventListener('dragstart', (e) => {
                        isDragging = true;
                        e.dataTransfer.setData('text/plain', JSON.stringify({ row, col }));
                        selectedPiece = { row, col };
                    });
                    
                    triangle.addEventListener('dragend', () => {
                        isDragging = false;
                    });
                    
                    // Touch events for mobile
                    triangle.addEventListener('touchstart', (e) => {
                        const touch = e.touches[0];
                        touchStartX = touch.clientX;
                        touchStartY = touch.clientY;
                        touchStartRow = row;
                        touchStartCol = col;
                        selectedPiece = { row, col };
                        e.preventDefault();
                    }, { passive: false });
                    
                    triangle.addEventListener('touchmove', (e) => {
                        if (selectedPiece) {
                            e.preventDefault();
                        }
                    }, { passive: false });
                    
                    triangle.addEventListener('touchend', (e) => {
                        if (!selectedPiece) return;
                        
                        const touch = e.changedTouches[0];
                        const endX = touch.clientX;
                        const endY = touch.clientY;
                        const dx = endX - touchStartX;
                        const dy = endY - touchStartY;
                        
                        // Just detect general direction with a small threshold
                        const SWIPE_THRESHOLD = 5;
                        
                        let newRow = touchStartRow;
                        let newCol = touchStartCol;
                        
                        // Determine which direction had the largest movement
                        if (Math.abs(dx) > Math.abs(dy)) {
                            // Horizontal movement dominates
                            if (dx > SWIPE_THRESHOLD) {
                                // Right swipe
                                newCol += 1;
                            } else if (dx < -SWIPE_THRESHOLD) {
                                // Left swipe
                                newCol -= 1;
                            }
                        } else {
                            // Vertical movement dominates
                            if (dy > SWIPE_THRESHOLD) {
                                // Down swipe
                                newRow += 1;
                            } else if (dy < -SWIPE_THRESHOLD) {
                                // Up swipe
                                newRow -= 1;
                            }
                        }
                        
                        // Try to make the move if valid
                        if (newRow !== touchStartRow || newCol !== touchStartCol) {
                            if (newRow >= 0 && newRow < boardSize && newCol >= 0 && newCol < boardSize && 
                                isValidMove(touchStartRow, touchStartCol, newRow, newCol)) {
                                movePiece(touchStartRow, touchStartCol, newRow, newCol);
                            } else {
                                selectedPiece = null;
                                renderBoard();
                            }
                        } else {
                            // Tiny movement might be a tap/click intent
                            cellClick(touchStartRow, touchStartCol);
                        }
                        
                        e.preventDefault();
                    }, { passive: false });
                    
                    // Click/tap for selection
                    triangle.addEventListener('mousedown', (e) => {
                        e.stopPropagation();
                        cellClick(row, col);
                    });
                }
                
                cell.appendChild(triangle);
            }
            
            // Add click handler for cells
            cell.addEventListener('click', () => cellClick(row, col));
            cell.addEventListener('mouseup', () => {
                if (selectedPiece && row !== selectedPiece.row && col !== selectedPiece.col) {
                    if (isValidMove(selectedPiece.row, selectedPiece.col, row, col)) {
                        movePiece(selectedPiece.row, selectedPiece.col, row, col);
                    }
                }
            });
            
            // Add drop handler for desktop
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
                        // Reset selection if move is invalid
                        selectedPiece = null;
                        renderBoard();
                    }
                } catch (error) {
                    console.error("Error in drop handler:", error);
                    selectedPiece = null;
                    renderBoard();
                }
            });
            
            gameBoard.appendChild(cell);
        }
    }
}

function cellClick(row, col) {
    // Only process if it's the player's turn
    const isPlayerTurn = (currentPlayer === 'white') || 
                       (gameMode === '2p' && currentPlayer === 'black');
    
    if (!isPlayerTurn) return;
    
    // If clicking on a player's piece, select it
    if (board[row][col] === currentPlayer) {
        // If already selected, deselect it
        if (selectedPiece && selectedPiece.row === row && selectedPiece.col === col) {
            selectedPiece = null;
            renderBoard();
            return;
        }
        
        // Select the piece
        selectedPiece = { row, col };
        renderBoard();
        return;
    }
    
    // If a piece is selected and we click on a valid destination, move it
    if (selectedPiece) {
        if (isValidMove(selectedPiece.row, selectedPiece.col, row, col)) {
            movePiece(selectedPiece.row, selectedPiece.col, row, col);
        }
    }
}

function movePiece(fromRow, fromCol, toRow, toCol) {
    const movingPiece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    
    // Move the piece
    board[toRow][toCol] = movingPiece;
    board[fromRow][fromCol] = null;
    
    // If black piece was moved, update lastMovedBlackPiece
    if (movingPiece === 'black') {
        lastMovedBlackPiece = { row: toRow, col: toCol };
    }
    
    // Check win conditions
    
    // Win by reaching the opposite end
    if (movingPiece === 'white' && toRow === 0) {
        renderBoard();
        setTimeout(() => {
            alert('White wins!');
            initializeBoard();
        }, 100);
        return;
    } else if (movingPiece === 'black' && toRow === boardSize - 1) {
        renderBoard();
        setTimeout(() => {
            alert('Black wins!');
            initializeBoard();
        }, 100);
        return;
    }
    
    // Win by capturing all opponent's pieces
    if (capturedPiece) {
        // Check if all pieces of a color have been captured
        const remainingWhite = countPieces('white');
        const remainingBlack = countPieces('black');
        
        if (remainingWhite === 0) {
            renderBoard();
            setTimeout(() => {
                alert('Black wins by capturing all white pieces!');
                initializeBoard();
            }, 100);
            return;
        } else if (remainingBlack === 0) {
            renderBoard();
            setTimeout(() => {
                alert('White wins by capturing all black pieces!');
                initializeBoard();
            }, 100);
            return;
        }
    }
    
    // Switch turns
    currentPlayer = currentPlayer === 'white' ? 'black' : 'white';
    selectedPiece = null;
    renderBoard();
    updateGameStatus();
    
    // If in 1-player mode and it's black's turn, make AI move
    if (gameMode === '1p' && currentPlayer === 'black') {
        setTimeout(makeBlackMove, 500);
    }
}

// Helper function to count pieces of a given color
function countPieces(color) {
    let count = 0;
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === color) {
                count++;
            }
        }
    }
    return count;
}

function isValidMove(row, col, newRow, newCol) {
    // Check if the current player is moving their own piece
    if (board[row][col] !== currentPlayer) {
        return false;
    }
    
    // Check if destination has a piece of the same color
    if (board[newRow][newCol] === board[row][col]) {
        return false;
    }
    
    // Check if move is one square horizontally or vertically
    const rowDiff = Math.abs(newRow - row);
    const colDiff = Math.abs(newCol - col);
    
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

// makeBlackMove()
// Smart AI for Black that prioritizes defense, avoids adjacency, and captures opportunistically

function makeBlackMove() {
    const size = boardSize;
    const moves = [];

    // Step 1: Identify threats from white pieces
    const whitePaths = [];
    for (let c = 0; c < size; c++) {
        for (let r = 0; r < size; r++) {
            if (board[r][c] === 'white') {
                let clear = true;
                for (let k = r - 1; k >= 0; k--) {
                    if (board[k][c]) clear = false;
                }
                if (clear) whitePaths.push({ r, c });
                break;
            }
        }
    }

    // Step 2: Evaluate all black moves
    for (let r = 0; r < size; r++) {
        for (let c = 0; c < size; c++) {
            if (board[r][c] !== 'black') continue;

            const directions = [
                { dr: 1, dc: 0 },   // Down
                { dr: 1, dc: -1 },  // Diag left
                { dr: 1, dc: 1 },   // Diag right
                { dr: 0, dc: -1 },  // Left
                { dr: 0, dc: 1 }    // Right
            ];

            for (let dir of directions) {
                const nr = r + dir.dr, nc = c + dir.dc;
                if (nr < 0 || nr >= size || nc < 0 || nc >= size) continue;

                const target = board[nr][nc];
                const forward = dir.dr === 1;
                const sideways = dir.dr === 0;
                const capture = target === 'white';
                const empty = !target;

                if (empty || capture) {
                    let score = 0;
                    if (capture) score += 100;
                    if (nr === size - 1) score += 1000;
                    if (forward && !capture) score += 20;
                    if (sideways) score -= 5;

                    // Avoid adjacent to white
                    let safe = true;
                    for (let ar = nr - 1; ar <= nr + 1; ar++) {
                        for (let ac = nc - 1; ac <= nc + 1; ac++) {
                            if (ar === nr && ac === nc) continue;
                            if (ar >= 0 && ar < size && ac >= 0 && ac < size) {
                                if (board[ar][ac] === 'white') safe = false;
                            }
                        }
                    }
                    if (!safe) score -= 200;

                    // Defense bonus: block white with clear path
                    for (let wp of whitePaths) {
                        if (wp.c === nc && nr < wp.r) score += 50;
                    }

                    moves.push({ from: { r, c }, to: { r: nr, c: nc }, score });
                }
            }
        }
    }

    // Step 3: Choose best move
    if (moves.length > 0) {
        moves.sort((a, b) => b.score - a.score);
        const best = moves[0];
        const { r: fr, c: fc } = best.from;
        const { r: tr, c: tc } = best.to;
        board[tr][tc] = 'black';
        board[fr][fc] = null;
    }

    currentPlayer = 'white';
    selectedPiece = null;
    renderBoard();
    updateGameStatus();
}


// Helper function: Check if a position is adjacent to a white piece
function isAdjacentToWhite(row, col) {
    const directions = [
        { r: 1, c: 0 },  // Down
        { r: -1, c: 0 }, // Up
        { r: 0, c: -1 }, // Left
        { r: 0, c: 1 }   // Right
    ];
    
    for (const dir of directions) {
        const adjRow = row + dir.r;
        const adjCol = col + dir.c;
        
        if (adjRow >= 0 && adjRow < boardSize && 
            adjCol >= 0 && adjCol < boardSize && 
            board[adjRow][adjCol] === 'white') {
            return true;
        }
    }
    
    return false;
}

// Find white pawns that have a clear path to the top row
function findWhitePawnsWithClearPath() {
    const pawnsWithPath = [];
    
    for (let col = 0; col < boardSize; col++) {
        for (let row = 0; row < boardSize; row++) {
            if (board[row][col] === 'white') {
                let clearPath = true;
                
                // Check path from current position to top row
                for (let r = row - 1; r >= 0; r--) {
                    if (board[r][col] !== null) {
                        clearPath = false;
                        break;
                    }
                }
                
                if (clearPath) {
                    pawnsWithPath.push({ row, col, distanceToTop: row });
                }
                
                // Only check the first white piece in each column
                break;
            }
        }
    }
    
    // Sort by distance to top (closest first)
    pawnsWithPath.sort((a, b) => a.distanceToTop - b.distanceToTop);
    
    return pawnsWithPath;
}

// Find a move to block a white pawn with a clear path to the top
function findBlockingMove(whitePawn) {
    if (!whitePawn) return null;
    
    // First, try to find a black piece already in the same column that can move up
    for (let row = whitePawn.row + 1; row < boardSize; row++) {
        if (board[row][whitePawn.col] === 'black' && row > 0 && 
            board[row - 1][whitePawn.col] === null && 
            !isAdjacentToWhite(row - 1, whitePawn.col)) {
            
            return { fromRow: row, fromCol: whitePawn.col, toRow: row - 1, toCol: whitePawn.col };
        }
    }
    
    // Next, find black pieces that are one move away from blocking the column
    for (let row = 0; row < boardSize; row++) {
        // Check pieces adjacent to the white pawn's column
        const adjacentCols = [whitePawn.col - 1, whitePawn.col + 1];
        
        for (const col of adjacentCols) {
            if (col >= 0 && col < boardSize && board[row][col] === 'black') {
                // Try to move to the white pawn's column
                if (board[row][whitePawn.col] === null && !isAdjacentToWhite(row, whitePawn.col)) {
                    return { fromRow: row, fromCol: col, toRow: row, toCol: whitePawn.col };
                }
            }
        }
    }
    
    // If no direct blocking is possible, find the nearest black piece that can move toward the column
    let bestBlocker = null;
    let minDistance = Infinity;
    
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                const distance = Math.abs(col - whitePawn.col);
                
                // If this piece is closer than our current best blocker
                if (distance > 0 && distance < minDistance) {
                    // Determine direction to move (toward white pawn's column)
                    const moveDir = whitePawn.col > col ? 1 : -1;
                    const newCol = col + moveDir;
                    
                    // Check if move is valid and safe
                    if (newCol >= 0 && newCol < boardSize && 
                        board[row][newCol] === null && 
                        !isAdjacentToWhite(row, newCol)) {
                        
                        minDistance = distance;
                        bestBlocker = { fromRow: row, fromCol: col, toRow: row, toCol: newCol };
                    }
                }
            }
        }
    }
    
    return bestBlocker;
}

function updateGameStatus() {
    // If the status element exists, update it
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
    
    // Reset the game
    initializeBoard();
}

// Prevent default touch behavior to avoid scrolling
document.addEventListener('DOMContentLoaded', function() {
    // Prevent scrolling on touch devices when interacting with the game board
    document.addEventListener('touchmove', function(e) {
        if (e.target.closest('#game-board')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Instructions popup functionality
    const instructionsBtn = document.getElementById('instructions-btn');
    const closeInstructionsBtn = document.getElementById('close-instructions-btn');
    const instructionsPopup = document.getElementById('instructions-popup');
    
    if (instructionsBtn) {
        instructionsBtn.addEventListener('click', function() {
            instructionsPopup.classList.remove('hidden');
        });
    }
    
    if (closeInstructionsBtn) {
        closeInstructionsBtn.addEventListener('click', function() {
            instructionsPopup.classList.add('hidden');
        });
    }
    
    // Game mode toggle
    const modeToggleBtn = document.getElementById('mode-toggle-btn');
    if (modeToggleBtn) {
        modeToggleBtn.addEventListener('click', toggleGameMode);
    }
    
    // Add restart button functionality if it exists
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', initializeBoard);
    }
});

// Initialize the game when the page loads
window.onload = function() {
    initializeBoard();
};
