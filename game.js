const boardSize = 8;
let board = [];
let currentPlayer = 'white';
let selectedPiece = null;
let isDragging = false;
let touchStartX = 0;
let touchStartY = 0;
let touchStartRow = null;
let touchStartCol = null;

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
                
                // For white pieces only (player's pieces)
                if (board[row][col] === 'white' && currentPlayer === 'white') {
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
                        renderBoard();
                        e.preventDefault();
                    });
                    
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
                        moveWhitePiece(selectedPiece.row, selectedPiece.col, row, col);
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
                        moveWhitePiece(fromRow, fromCol, toRow, toCol);
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
            
            // Touch events for mobile
            cell.addEventListener('touchend', (e) => {
                if (!selectedPiece) return;
                
                const touch = e.changedTouches[0];
                const element = document.elementFromPoint(touch.clientX, touch.clientY);
                
                // Find the cell that was touched
                let touchedCell = element;
                while (touchedCell && !touchedCell.dataset.row) {
                    if (touchedCell === document.body) break;
                    touchedCell = touchedCell.parentElement;
                }
                
                if (touchedCell && touchedCell.dataset.row) {
                    const toRow = parseInt(touchedCell.dataset.row);
                    const toCol = parseInt(touchedCell.dataset.col);
                    
                    if (isValidMove(selectedPiece.row, selectedPiece.col, toRow, toCol)) {
                        moveWhitePiece(selectedPiece.row, selectedPiece.col, toRow, toCol);
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
    // Only process if it's white's turn
    if (currentPlayer !== 'white') return;
    
    // If clicking on a white piece, select it
    if (board[row][col] === 'white') {
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
            moveWhitePiece(selectedPiece.row, selectedPiece.col, row, col);
        }
    }
}

function moveWhitePiece(fromRow, fromCol, toRow, toCol) {
    // Move the piece
    board[toRow][toCol] = 'white';
    board[fromRow][fromCol] = null;
    
    // Check win condition
    if (toRow === 0) {
        renderBoard();
        setTimeout(() => {
            alert('White wins!');
            initializeBoard();
        }, 100);
        return;
    }
    
    // Switch to black's turn and render
    currentPlayer = 'black';
    selectedPiece = null;
    renderBoard();
    updateGameStatus();
    
    // AI moves after a short delay
    setTimeout(makeBlackMove, 500);
}

function isValidMove(row, col, newRow, newCol) {
    // Check if destination has a piece of the same color
    if (board[newRow][newCol] === board[row][col]) {
        return false;
    }
    
    // Check if move is one square horizontally or vertically
    const rowDiff = Math.abs(newRow - row);
    const colDiff = Math.abs(newCol - col);
    
    return (rowDiff === 1 && colDiff === 0) || (rowDiff === 0 && colDiff === 1);
}

function makeBlackMove() {
    // 1. First priority: capture any adjacent white piece
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                // Check the four adjacent squares for white pieces
                const directions = [
                    { r: 1, c: 0 },  // Down
                    { r: 0, c: -1 }, // Left
                    { r: 0, c: 1 },  // Right
                    { r: -1, c: 0 }  // Up
                ];
                
                for (const dir of directions) {
                    const newRow = row + dir.r;
                    const newCol = col + dir.c;
                    
                    // Check if square is valid and has a white piece
                    if (newRow >= 0 && newRow < boardSize && 
                        newCol >= 0 && newCol < boardSize && 
                        board[newRow][newCol] === 'white') {
                        
                        // Capture the white piece
                        board[newRow][newCol] = 'black';
                        board[row][col] = null;
                        
                        // Check if black won
                        if (newRow === boardSize - 1) {
                            renderBoard();
                            setTimeout(() => {
                                alert('Black wins!');
                                initializeBoard();
                            }, 100);
                            return;
                        }
                        
                        // End black's turn
                        currentPlayer = 'white';
                        renderBoard();
                        updateGameStatus();
                        return;
                    }
                }
            }
        }
    }
    
    // 2. If no capture is possible, use improved evaluation for moves
    let bestMove = null;
    let bestScore = -Infinity;
    
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                // Check possible moves: down, left, right
                const directions = [
                    { r: 1, c: 0 },  // Down
                    { r: 0, c: -1 }, // Left
                    { r: 0, c: 1 }   // Right
                ];
                
                for (const dir of directions) {
                    const newRow = row + dir.r;
                    const newCol = col + dir.c;
                    
                    // Check if move is valid
                    if (newRow >= 0 && newRow < boardSize && 
                        newCol >= 0 && newCol < boardSize && 
                        board[newRow][newCol] === null) {
                        
                        // Enhanced score calculation
                        let score = evaluateMove(row, col, newRow, newCol);
                        
                        if (score > bestScore) {
                            bestScore = score;
                            bestMove = { fromRow: row, fromCol: col, toRow: newRow, toCol: newCol };
                        }
                    }
                }
            }
        }
    }
    
    // Make the best move if one was found
    if (bestMove) {
        board[bestMove.toRow][bestMove.toCol] = 'black';
        board[bestMove.fromRow][bestMove.fromCol] = null;
        
        // Check if black won
        if (bestMove.toRow === boardSize - 1) {
            renderBoard();
            setTimeout(() => {
                alert('Black wins!');
                initializeBoard();
            }, 100);
            return;
        }
        
        // End black's turn
        currentPlayer = 'white';
        renderBoard();
        updateGameStatus();
        return;
    }
    
    // 3. If still no move found, make any valid move
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                const directions = [
                    { r: 1, c: 0 },  // Down
                    { r: 0, c: -1 }, // Left
                    { r: 0, c: 1 }   // Right
                ];
                
                for (const dir of directions) {
                    const newRow = row + dir.r;
                    const newCol = col + dir.c;
                    
                    if (newRow >= 0 && newRow < boardSize && 
                        newCol >= 0 && newCol < boardSize && 
                        board[newRow][newCol] === null) {
                        
                        board[newRow][newCol] = 'black';
                        board[row][col] = null;
                        
                        // Check if black won
                        if (newRow === boardSize - 1) {
                            renderBoard();
                            setTimeout(() => {
                                alert('Black wins!');
                                initializeBoard();
                            }, 100);
                            return;
                        }
                        
                        // End black's turn
                        currentPlayer = 'white';
                        renderBoard();
                        updateGameStatus();
                        return;
                    }
                }
            }
        }
    }
}

// New function for enhanced move evaluation
function evaluateMove(fromRow, fromCol, toRow, toCol) {
    let score = 0;
    
    // Make a temporary move to evaluate its effects
    board[toRow][toCol] = 'black';
    board[fromRow][fromCol] = null;
    
    // FACTOR 1: Progress toward goal (heavily weighted)
    // Black wants to reach the bottom row (boardSize - 1)
    score += toRow * 15;  // Heavily reward moving down
    
    // FACTOR 2: Near-win detection - huge bonus for being close to bottom row
    if (toRow >= boardSize - 2) {
        score += 100; // Massive bonus for being one step away from winning
    }
    
    // FACTOR 3: Safety - check if the piece would be in capture range after move
    if (isInCaptureRange(toRow, toCol)) {
        score -= 60;  // Significant penalty for moving into capture range
    }
    
    // FACTOR 4: Opportunity - check if this move creates a capture opportunity
    const canCaptureAfterMove = checkCaptureOpportunity(toRow, toCol);
    if (canCaptureAfterMove) {
        score += 40;  // Bonus for setting up a capture
    }
    
    // FACTOR 5: Center control - slight bonus for controlling center columns
    if (toCol >= 2 && toCol <= boardSize - 3) {
        score += 5;
    }
    
    // FACTOR 6: Support from other black pieces (strength in numbers)
    if (hasAdjacentBlackPiece(toRow, toCol)) {
        score += 10;
    }
    
    // FACTOR 7: Blocking white pieces from reaching the top
    score += evaluateBlockingValue(toRow, toCol);
    
    // FACTOR 8: Path to goal - check if there's a relatively clear path to bottom
    if (hasPathToBottom(toRow, toCol)) {
        score += 25;
    }
    
    // Undo the temporary move
    board[fromRow][fromCol] = 'black';
    board[toRow][toCol] = null;
    
    // Add a small random factor to break ties and add unpredictability
    score += Math.random() * 2;
    
    return score;
}

// Helper functions for evaluation
function hasAdjacentBlackPiece(row, col) {
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
            board[adjRow][adjCol] === 'black') {
            return true;
        }
    }
    
    return false;
}

function checkCaptureOpportunity(row, col) {
    const directions = [
        { r: 1, c: 0 },  // Down
        { r: 0, c: -1 }, // Left
        { r: 0, c: 1 },  // Right
        { r: -1, c: 0 }  // Up
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

function evaluateBlockingValue(row, col) {
    let blockingValue = 0;
    
    // Check if this position blocks white pieces from advancing
    for (let r = 0; r < boardSize; r++) {
        for (let c = 0; c < boardSize; c++) {
            if (board[r][c] === 'white') {
                // If there's a white piece above this position
                if (r > row && c === col) {
                    // The closer the white piece is to the top, the more valuable blocking it is
                    blockingValue += 5 * (boardSize - r);
                }
            }
        }
    }
    
    return blockingValue;
}

function hasPathToBottom(row, col) {
    // Simple check - count empty squares or black pieces in the columns below
    let count = 0;
    
    for (let r = row + 1; r < boardSize; r++) {
        if (board[r][col] === null || board[r][col] === 'black') {
            count++;
        }
    }
    
    // Return true if we have a mostly clear path
    return count >= (boardSize - row - 1) / 2;
}

function isInCaptureRange(row, col) {
    // Check if any white piece could capture a piece at this position
    const directions = [
        { r: 1, c: 0 },  // Down
        { r: 0, c: -1 }, // Left
        { r: 0, c: 1 },  // Right
        { r: -1, c: 0 }  // Up
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

function updateGameStatus() {
    // If the status element exists, update it
    const status = document.getElementById('game-status');
    if (status) {
        status.textContent = `Current turn: ${currentPlayer.charAt(0).toUpperCase() + currentPlayer.slice(1)}`;
    }
}

// Prevent default touch behavior to avoid scrolling
document.addEventListener('DOMContentLoaded', function() {
    document.addEventListener('touchmove', function(e) {
        if (e.target.closest('#game-board')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    document.addEventListener('touchstart', function(e) {
        if (e.target.closest('#game-board')) {
            e.preventDefault();
        }
    }, { passive: false });
    
    // Add restart button functionality
    const restartBtn = document.getElementById('restart-btn');
    if (restartBtn) {
        restartBtn.addEventListener('click', initializeBoard);
    }
    
    // Add instructions toggle functionality
    const instructionsBtn = document.getElementById('instructions-btn');
    if (instructionsBtn) {
        instructionsBtn.addEventListener('click', function() {
            const instructions = document.getElementById('instructions');
            if (instructions) {
                if (instructions.classList.contains('hidden')) {
                    instructions.classList.remove('hidden');
                    this.textContent = 'Hide Instructions';
                } else {
                    instructions.classList.add('hidden');
                    this.textContent = 'Show Instructions';
                }
            }
        });
    }
});

// Initialize the game when the page loads
window.onload = function() {
    initializeBoard();
};
