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
                
                // Make player's pieces draggable
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
    
    // Move the piece
    board[toRow][toCol] = movingPiece;
    board[fromRow][fromCol] = null;
    
    // If black piece was moved, update lastMovedBlackPiece
    if (movingPiece === 'black') {
        lastMovedBlackPiece = { row: toRow, col: toCol };
    }
    
    // Check win conditions
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

function makeBlackMove() {
    // Check for white pawns with clear paths to the top
    const whitePawnsWithClearPath = findWhitePawnsWithClearPath();
    
    // Priority 1: If white has a clear path, find the nearest black piece to intercept
    if (whitePawnsWithClearPath.length > 0) {
        const interceptionMove = findNearestInterceptor(whitePawnsWithClearPath[0]);
        if (interceptionMove) {
            board[interceptionMove.toRow][interceptionMove.toCol] = 'black';
            board[interceptionMove.fromRow][interceptionMove.fromCol] = null;
            
            // Update last moved piece
            lastMovedBlackPiece = { row: interceptionMove.toRow, col: interceptionMove.toCol };
            
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
    
    // Priority 2: Capture white pieces if possible
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
                        
                        // Update last moved piece
                        lastMovedBlackPiece = { row: newRow, col: newCol };
                        
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
    
    // Priority 3: Continue movement with the last moved piece (only forward)
    if (lastMovedBlackPiece) {
        const { row, col } = lastMovedBlackPiece;
        
        // Check if this piece can move down
        if (row < boardSize - 1 && 
            board[row + 1][col] === null && 
            !isAdjacentToWhite(row + 1, col)) {
            
            // Move the piece down
            board[row + 1][col] = 'black';
            board[row][col] = null;
            
            // Update last moved piece
            lastMovedBlackPiece = { row: row + 1, col: col };
            
            // Check if black won
            if (row + 1 === boardSize - 1) {
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
    
    // Priority 4: Move any black piece forward (preferring the furthest advanced)
    let furthestPiece = null;
    let maxRow = -1;
    
    for (let row = boardSize - 1; row >= 0; row--) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                // Check if piece can move down
                if (row < boardSize - 1 && 
                    board[row + 1][col] === null && 
                    !isAdjacentToWhite(row + 1, col)) {
                    
                    if (row >= maxRow) {
                        maxRow = row;
                        furthestPiece = { row, col };
                    }
                }
            }
        }
    }
    
    if (furthestPiece) {
        const { row, col } = furthestPiece;
        board[row + 1][col] = 'black';
        board[row][col] = null;
        
        // Update last moved piece
        lastMovedBlackPiece = { row: row + 1, col: col };
        
        // Check if black won
        if (row + 1 === boardSize - 1) {
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
    
    // Priority 5: Only if no forward moves are possible, try sideways moves
    // Prioritize the most advanced pieces
    let sidewaysPiece = null;
    maxRow = -1;
    
    for (let row = boardSize - 1; row >= 0; row--) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                // Check left and right
                const directions = [
                    { r: 0, c: -1 }, // Left
                    { r: 0, c: 1 }   // Right
                ];
                
                for (const dir of directions) {
                    const newRow = row + dir.r;
                    const newCol = col + dir.c;
                    
                    if (newRow >= 0 && newRow < boardSize && 
                        newCol >= 0 && newCol < boardSize && 
                        board[newRow][newCol] === null && 
                        !isAdjacentToWhite(newRow, newCol)) {
                        
                        if (row > maxRow) {
                            maxRow = row;
                            sidewaysPiece = { row, col, direction: dir };
                        }
                    }
                }
            }
        }
        
        // If we found a piece at this row, stop searching (we want the most advanced piece)
        if (sidewaysPiece !== null) {
            break;
        }
    }
    
    if (sidewaysPiece) {
        const { row, col, direction } = sidewaysPiece;
        const newRow = row + direction.r;
        const newCol = col + direction.c;
        
        board[newRow][newCol] = 'black';
        board[row][col] = null;
        
        // Update last moved piece
        lastMovedBlackPiece = { row: newRow, col: newCol };
        
        // End black's turn
        currentPlayer = 'white';
        renderBoard();
        updateGameStatus();
        return;
    }
    
    // Priority 6: If no safe move is found, make any legal move
    // (This should rarely happen, but prevents getting stuck)
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                const directions = [
                    { r: 1, c: 0 },  // Down (preferred)
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
                        
                        // Update last moved piece
                        lastMovedBlackPiece = { row: newRow, col: newCol };
                        
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

// Find the nearest black piece that can intercept a white pawn with a clear path
function findNearestInterceptor(whitePawn) {
    if (!whitePawn) return null;
    
    let bestInterceptor = null;
    let shortestDistance = Infinity;
    
    // Try to find any black piece that can move to block the white pawn's path
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                // Calculate horizontal distance to the white pawn's column
                const colDistance = Math.abs(whitePawn.col - col);
                
                // If in same column but below white piece, move upward if possible
                if (colDistance === 0 && row > whitePawn.row) {
                    if (row > 0 && board[row - 1][col] === null && !isAdjacentToWhite(row - 1, col)) {
                        return { fromRow: row, fromCol: col, toRow: row - 1, toCol: col };
                    }
                }
                
                // If one step away horizontally, move toward the white pawn's column
                if (colDistance === 1) {
                    const moveDir = whitePawn.col > col ? 1 : -1; // Right or left
                    const newCol = col + moveDir;
                    
                    // Verify the move is safe
                    if (newCol >= 0 && newCol < boardSize && 
                        board[row][newCol] === null && 
                        !isAdjacentToWhite(row, newCol)) {
                        
                        return { fromRow: row, fromCol: col, toRow: row, toCol: newCol };
                    }
                }
                
                // For other pieces, track the one with shortest distance that can move toward target
                if (colDistance > 1) {
                    const moveDir = whitePawn.col > col ? 1 : -1; // Right or left
                    const newCol = col + moveDir;
                    
                    // Verify the move is safe
                    if (newCol >= 0 && newCol < boardSize && 
                        board[row][newCol] === null && 
                        !isAdjacentToWhite(row, newCol)) {
                        
                        if (colDistance < shortestDistance) {
                            shortestDistance = colDistance;
                            bestInterceptor = { fromRow: row, fromCol: col, toRow: row, toCol: newCol };
                        }
                    }
                }
            }
        }
    }
    
    return bestInterceptor;
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
        modeBtn.textContent = `Mode: ${gameMode === '1p' ? '1 Player' : '2 Player'}`;
    }
    
    // Reset the game
    initializeBoard();
}

// Prevent default touch behavior to avoid scrolling
document.addEventListener('DOMContentLoaded', function() {
    // Prevent scrolling on touch devices
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
