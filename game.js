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

    // 2. Second priority: Check if any white piece has a clear path to top and intercept
    const whitePawnsWithClearPath = findWhitePawnsWithClearPath();
    if (whitePawnsWithClearPath.length > 0) {
        // Find nearest black piece that can intercept
        const interceptionMove = findInterceptionMove(whitePawnsWithClearPath);
        if (interceptionMove) {
            board[interceptionMove.toRow][interceptionMove.toCol] = 'black';
            board[interceptionMove.fromRow][interceptionMove.fromCol] = null;
            
            // Check if black won
            if (interceptionMove.toRow === boardSize - 1) {
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
    
    // 3. If no capture or interception is possible, use improved evaluation for moves
    let bestMove = null;
    let bestScore = -Infinity;
    
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                // Check possible moves with priority to moving downward
                const directions = [
                    { r: 1, c: 0 },  // Down (highest priority)
                    { r: 0, c: -1 }, // Left (lower priority)
                    { r: 0, c: 1 }   // Right (lower priority)
                ];
                
                for (const dir of directions) {
                    const newRow = row + dir.r;
                    const newCol = col + dir.c;
                    
                    // Check if move is valid
                    if (newRow >= 0 && newRow < boardSize && 
                        newCol >= 0 && newCol < boardSize && 
                        board[newRow][newCol] === null) {
                        
                        // Enhanced score calculation with emphasis on forward movement
                        let score = 0;
                        
                        // Heavily prioritize moving forward
                        if (dir.r === 1) { // Moving down
                            score += 100; // Huge bonus for moving forward
                        } else {
                            score += 20; // Much smaller bonus for side moves
                        }
                        
                        // Safety - avoid capture range
                        if (isInCaptureRange(newRow, newCol)) {
                            score -= 60;
                        }
                        
                        // Proximity to goal
                        score += newRow * 10;
                        
                        // Add a small random factor
                        score += Math.random() * 2;
                        
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
    
    // 4. If still no move found, make any valid move
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

// Find white pawns that have a relatively clear path to the top row
function findWhitePawnsWithClearPath() {
    const pawnsWithPath = [];
    
    for (let col = 0; col < boardSize; col++) {
        for (let row = 0; row < boardSize; row++) {
            if (board[row][col] === 'white') {
                let clearPath = true;
                let blocksInPath = 0;
                
                // Check path from current position to top row
                for (let r = row - 1; r >= 0; r--) {
                    if (board[r][col] !== null) {
                        blocksInPath++;
                        if (blocksInPath > 1) {
                            clearPath = false;
                            break;
                        }
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

// Find a black piece that can move to intercept a white piece's path
function findInterceptionMove(whitePawnsWithPath) {
    if (whitePawnsWithPath.length === 0) return null;
    
    // Focus on the most dangerous white pawn (closest to top)
    const targetPawn = whitePawnsWithPath[0];
    let bestInterceptor = null;
    let shortestDistance = Infinity;
    
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                // Try moving toward the column of the white pawn
                const colDiff = targetPawn.col - col;
                
                if (colDiff !== 0) {
                    // Try to move horizontally toward the target column
                    const moveDir = colDiff > 0 ? 1 : -1; // Right or left
                    const newCol = col + moveDir;
                    
                    if (newCol >= 0 && newCol < boardSize && board[row][newCol] === null) {
                        const distance = Math.abs(targetPawn.col - newCol) + Math.abs(targetPawn.row - row);
                        
                        if (distance < shortestDistance && !isInCaptureRange(row, newCol)) {
                            shortestDistance = distance;
                            bestInterceptor = { fromRow: row, fromCol: col, toRow: row, toCol: newCol };
                        }
                    }
                } else {
                    // Already in same column, try moving downward
                    if (row < boardSize - 1 && board[row + 1][col] === null) {
                        const distance = Math.abs(targetPawn.row - (row + 1));
                        
                        if (distance < shortestDistance && !isInCaptureRange(row + 1, col)) {
                            shortestDistance = distance;
                            bestInterceptor = { fromRow: row, fromCol: col, toRow: row + 1, toCol: col };
                        }
                    }
                }
            }
        }
    }
    
    return bestInterceptor;
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
