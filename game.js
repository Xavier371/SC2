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
let blackPawnAssignments = {}; // Store assignments of black pawns to white pawns

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
    blackPawnAssignments = {}; // Reset assignments
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

function makeBlackMove() {
    // PRIORITY 1: Capture adjacent white pawns if possible
    const captureMove = findCaptureMove();
    if (captureMove) {
        executeMove(captureMove);
        return;
    }
    
    // Update assignments between black and white pawns
    assignBlackPawnsToWhitePawns();
    
    // PRIORITY 2: Handle assigned blockers - adjust position if needed
    const blockingMove = findBlockingMove();
    if (blockingMove) {
        executeMove(blockingMove);
        return;
    }
    
    // PRIORITY 3: Advance unassigned black pawns toward the goal
    const advanceMove = findAdvanceMove();
    if (advanceMove) {
        executeMove(advanceMove);
        return;
    }
    
    // If no valid move was found, just skip the turn
    currentPlayer = 'white';
    renderBoard();
    updateGameStatus();
}

// Find a move to capture a white piece if possible
function findCaptureMove() {
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
                        
                        return {
                            fromRow: row,
                            fromCol: col,
                            toRow: newRow,
                            toCol: newCol
                        };
                    }
                }
            }
        }
    }
    return null;
}

// Assign black pawns to white pawns for blocking
function assignBlackPawnsToWhitePawns() {
    // Find all white and black pawns
    const whitePawns = [];
    const blackPawns = [];
    
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'white') {
                whitePawns.push({ row, col });
            } else if (board[row][col] === 'black') {
                blackPawns.push({ row, col });
            }
        }
    }
    
    // Reset the assignments
    blackPawnAssignments = {};
    
    // Sort white pawns by proximity to winning (lowest row first)
    whitePawns.sort((a, b) => a.row - b.row);
    
    // For each white pawn, find the best black pawn to block it
    for (const whitePawn of whitePawns) {
        let bestBlocker = null;
        let bestScore = Infinity;
        
        for (const blackPawn of blackPawns) {
            // Skip if this black pawn is already assigned
            if (isBlackPawnAssigned(blackPawn)) {
                continue;
            }
            
            // Calculate score (lower is better)
            const score = calculateBlockingScore(blackPawn, whitePawn);
            
            if (score < bestScore) {
                bestScore = score;
                bestBlocker = blackPawn;
            }
        }
        
        // Assign the best blocker to this white pawn
        if (bestBlocker) {
            const key = `${bestBlocker.row},${bestBlocker.col}`;
            blackPawnAssignments[key] = { 
                whitePawn: whitePawn,
                isActivelyBlocking: isActivelyBlocking(bestBlocker, whitePawn)
            };
        }
    }
}

// Calculate a score for how good a black pawn is at blocking a specific white pawn
function calculateBlockingScore(blackPawn, whitePawn) {
    // Distance to white pawn's column (lower is better)
    const colDistance = Math.abs(blackPawn.col - whitePawn.col);
    
    // Vertical position relative to white pawn (negative if black is above white)
    const rowDifference = blackPawn.row - whitePawn.row;
    
    // If black is below white, this is a bad blocker
    if (rowDifference >= 0) {
        return 1000 + rowDifference;
    }
    
    // If black is already in white's column or adjacent, this is ideal
    if (colDistance <= 1) {
        return colDistance;
    }
    
    // Otherwise score based on distance
    return colDistance * 10 + Math.abs(rowDifference);
}

// Check if a black pawn is already assigned to block a white pawn
function isBlackPawnAssigned(blackPawn) {
    const key = `${blackPawn.row},${blackPawn.col}`;
    return blackPawnAssignments.hasOwnProperty(key);
}

// Check if a black pawn is actively blocking a white pawn
function isActivelyBlocking(blackPawn, whitePawn) {
    // Same column blocking
    if (blackPawn.col === whitePawn.col && blackPawn.row < whitePawn.row) {
        return true;
    }
    
    // Adjacent column blocking
    if (Math.abs(blackPawn.col - whitePawn.col) === 1 && blackPawn.row <= whitePawn.row) {
        return true;
    }
    
    return false;
}

// Find the best blocking move for assigned black pawns
function findBlockingMove() {
    // Iterate through all assigned black pawns
    for (const key in blackPawnAssignments) {
        const [row, col] = key.split(',').map(Number);
        const { whitePawn, isActivelyBlocking } = blackPawnAssignments[key];
        
        // If already actively blocking, generally don't move
        if (isActivelyBlocking) {
            continue;
        }
        
        // Calculate the best position to block this white pawn
        const blockingPosition = calculateBestBlockingPosition({ row, col }, whitePawn);
        
        if (blockingPosition) {
            return {
                fromRow: row,
                fromCol: col,
                toRow: blockingPosition.row,
                toCol: blockingPosition.col
            };
        }
    }
    
    return null;
}

// Calculate the best position for a black pawn to block a white pawn
function calculateBestBlockingPosition(blackPawn, whitePawn) {
    const possiblePositions = [];
    
    // Only consider positions if black is above white
    if (blackPawn.row >= whitePawn.row) {
        return null;
    }
    
    // Check if black can move to white's column
    if (Math.abs(blackPawn.col - whitePawn.col) === 1) {
        const newPosition = {
            row: blackPawn.row,
            col: whitePawn.col
        };
        
        if (isValidBlockingPosition(newPosition)) {
            possiblePositions.push(newPosition);
        }
    }
    
    // Check if black can move to adjacent columns
    const adjacentCols = [whitePawn.col - 1, whitePawn.col + 1];
    for (const newCol of adjacentCols) {
        // Skip invalid columns or if already in this column
        if (newCol < 0 || newCol >= boardSize || newCol === blackPawn.col) {
            continue;
        }
        
        // If can move horizontally to adjacent column
        if (Math.abs(blackPawn.col - newCol) === 1) {
            const newPosition = {
                row: blackPawn.row,
                col: newCol
            };
            
            if (isValidBlockingPosition(newPosition)) {
                possiblePositions.push(newPosition);
            }
        }
    }
    
    // If no horizontal moves, consider moving down to get closer
    if (possiblePositions.length === 0 && blackPawn.row < whitePawn.row - 1) {
        const newPosition = {
            row: blackPawn.row + 1,
            col: blackPawn.col
        };
        
        if (isValidBlockingPosition(newPosition)) {
            possiblePositions.push(newPosition);
        }
    }
    
    // Find the best position (prioritize columns closer to white)
    if (possiblePositions.length > 0) {
        possiblePositions.sort((a, b) => {
            const aColDistance = Math.abs(a.col - whitePawn.col);
            const bColDistance = Math.abs(b.col - whitePawn.col);
            return aColDistance - bColDistance;
        });
        
        return possiblePositions[0];
    }
    
    return null;
}

// Check if a position is valid for blocking (empty and not adjacent to white)
function isValidBlockingPosition(position) {
    return position.row >= 0 && position.row < boardSize && 
           position.col >= 0 && position.col < boardSize && 
           board[position.row][position.col] === null && 
           !isAdjacentToWhite(position.row, position.col);
}

// Find a move to advance an unassigned black pawn toward the goal
function findAdvanceMove() {
    // First try to continue with the last moved black piece if it's not assigned
    if (lastMovedBlackPiece) {
        const { row, col } = lastMovedBlackPiece;
        const key = `${row},${col}`;
        
        if (!blackPawnAssignments.hasOwnProperty(key) && row < boardSize - 1) {
            // Try to move down first (toward end of board)
            if (board[row + 1][col] === null && !isAdjacentToWhite(row + 1, col)) {
                return {
                    fromRow: row,
                    fromCol: col,
                    toRow: row + 1,
                    toCol: col
                };
            }
        }
    }
    
    // Find unassigned black pawns that can advance
    const unassignedMoves = [];
    
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                const key = `${row},${col}`;
                
                // Skip if assigned as a blocker
                if (blackPawnAssignments.hasOwnProperty(key)) {
                    continue;
                }
                
                // Try to move down
                if (row < boardSize - 1 && board[row + 1][col] === null && 
                    !isAdjacentToWhite(row + 1, col)) {
                    unassignedMoves.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: row + 1,
                        toCol: col,
                        advancement: row + 1
                    });
                }
                
                // Try sideways moves if can't move down
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
                        
                        unassignedMoves.push({
                            fromRow: row,
                            fromCol: col,
                            toRow: newRow,
                            toCol: newCol,
                            advancement: row
                        });
                    }
                }
            }
        }
    }
    
    // Sort by advancement (highest row first for more progress)
    unassignedMoves.sort((a, b) => b.advancement - a.advancement);
    
    if (unassignedMoves.length > 0) {
        return unassignedMoves[0];
    }
    
    return null;
}

// Execute a move and handle its consequences
function executeMove(move) {
    if (!move) return false;
    
    const { fromRow, fromCol, toRow, toCol } = move;
    const movingPiece = board[fromRow][fromCol];
    const capturedPiece = board[toRow][toCol];
    
    // Move the piece
    board[toRow][toCol] = movingPiece;
    board[fromRow][fromCol] = null;
    
    // Update last moved black piece
    lastMovedBlackPiece = { row: toRow, col: toCol };
    
    // Check if black won by reaching the end
    if (toRow === boardSize - 1) {
        renderBoard();
        setTimeout(() => {
            alert('Black wins!');
            initializeBoard();
        }, 100);
        return true;
    }
    
    // Check if black won by capturing all white pieces
    if (capturedPiece === 'white') {
        const remainingWhite = countPieces('white');
        if (remainingWhite === 0) {
            renderBoard();
            setTimeout(() => {
                alert('Black wins by capturing all white pieces!');
                initializeBoard();
            }, 100);
            return true;
        }
    }
    
    // End black's turn
    currentPlayer = 'white';
    renderBoard();
    updateGameStatus();
    return true;
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
