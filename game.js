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

function makeBlackMove() {
    // PRIORITY 1: Capture adjacent white pawns if possible
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
                        
                        // Check if black won by reaching the end
                        if (newRow === boardSize - 1) {
                            renderBoard();
                            setTimeout(() => {
                                alert('Black wins!');
                                initializeBoard();
                            }, 100);
                            return;
                        }
                        
                        // Check if black won by capturing all white pieces
                        const remainingWhite = countPieces('white');
                        if (remainingWhite === 0) {
                            renderBoard();
                            setTimeout(() => {
                                alert('Black wins by capturing all white pieces!');
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

    // PRIORITY 2: Block white pawns with clear paths
    // Get all white pawns
    const whitePawns = [];
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'white') {
                whitePawns.push({ row, col });
            }
        }
    }
    
    // Sort white pawns by proximity to winning (lowest row first)
    whitePawns.sort((a, b) => a.row - b.row);
    
    // Map to track which black pieces are assigned to block which white pawns
    let blackPieceAssignments = new Map();
    let blackPiecesUsed = new Set();
    
    // First pass: try to match each white pawn with a black pawn that can block it
    for (const whitePawn of whitePawns) {
        const blockingOptions = findPotentialBlockers(whitePawn);
        
        if (blockingOptions.length > 0) {
            // Sort blocking options by preference:
            // 1) Already in blocking position
            // 2) Distance from the white pawn's column
            blockingOptions.sort((a, b) => {
                const aIsBlocking = isInBlockingPosition(a, whitePawn) ? 0 : 1;
                const bIsBlocking = isInBlockingPosition(b, whitePawn) ? 0 : 1;
                
                if (aIsBlocking !== bIsBlocking) {
                    return aIsBlocking - bIsBlocking;
                }
                
                // If both are equally blocking or not blocking, prefer closest
                return Math.abs(a.col - whitePawn.col) - Math.abs(b.col - whitePawn.col);
            });
            
            // Find the first black piece that hasn't been assigned yet
            for (const blocker of blockingOptions) {
                const blockerKey = `${blocker.row},${blocker.col}`;
                if (!blackPiecesUsed.has(blockerKey)) {
                    blackPieceAssignments.set(blockerKey, whitePawn);
                    blackPiecesUsed.add(blockerKey);
                    break;
                }
            }
        }
    }
    
    // PRIORITY 2A: Move assigned blockers that are not in position
    for (const [blockerKey, whitePawn] of blackPieceAssignments.entries()) {
        const [row, col] = blockerKey.split(',').map(Number);
        
        // Skip if the black pawn is already in a blocking position
        if (isInBlockingPosition({ row, col }, whitePawn)) {
            continue;
        }
        
        // Calculate best move to block this white pawn
        const blockingMove = calculateBlockingMove({ row, col }, whitePawn);
        
        if (blockingMove) {
            // Execute the blocking move
            board[blockingMove.toRow][blockingMove.toCol] = 'black';
            board[row][col] = null;
            
            // Update last moved piece
            lastMovedBlackPiece = { row: blockingMove.toRow, col: blockingMove.toCol };
            
            // Check if black won by reaching the end
            if (blockingMove.toRow === boardSize - 1) {
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

    // PRIORITY 3: Try to advance black pawns toward the end of the board
    // Prioritize unassigned black pawns first
    
    // First try to continue with the last moved piece if possible and if it's not assigned as a blocker
    if (lastMovedBlackPiece) {
        const { row, col } = lastMovedBlackPiece;
        const blockerKey = `${row},${col}`;
        
        if (!blackPieceAssignments.has(blockerKey)) {
            // Try to move down first (toward end of board)
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
    }
    
    // Find unassigned black pawns that can move down
    const advanceMoves = [];
    
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                const blockerKey = `${row},${col}`;
                
                // Skip if this piece is assigned as a blocker
                if (blackPieceAssignments.has(blockerKey)) {
                    continue;
                }
                
                // Try to move down
                if (row < boardSize - 1 && 
                    board[row + 1][col] === null && 
                    !isAdjacentToWhite(row + 1, col)) {
                    
                    advanceMoves.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: row + 1,
                        toCol: col,
                        priority: row // Higher row = higher priority (closer to goal)
                    });
                }
                
                // Try sideways moves
                const sidewaysDirections = [
                    { r: 0, c: -1 }, // Left
                    { r: 0, c: 1 }   // Right
                ];
                
                for (const dir of sidewaysDirections) {
                    const newRow = row + dir.r;
                    const newCol = col + dir.c;
                    
                    if (newRow >= 0 && newRow < boardSize && 
                        newCol >= 0 && newCol < boardSize && 
                        board[newRow][newCol] === null && 
                        !isAdjacentToWhite(newRow, newCol)) {
                        
                        advanceMoves.push({
                            fromRow: row,
                            fromCol: col,
                            toRow: newRow,
                            toCol: newCol,
                            priority: row - 0.5 // Sideways moves have lower priority than forward moves
                        });
                    }
                }
            }
        }
    }
    
    // Sort by priority (highest first)
    advanceMoves.sort((a, b) => b.priority - a.priority);
    
    if (advanceMoves.length > 0) {
        const move = advanceMoves[0];
        
        // Move the piece
        board[move.toRow][move.toCol] = 'black';
        board[move.fromRow][move.fromCol] = null;
        
        // Update last moved piece
        lastMovedBlackPiece = { row: move.toRow, col: move.toCol };
        
        // Check if black won
        if (move.toRow === boardSize - 1) {
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
    
    // If no valid move was found, try moving any black piece that can move
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                // Check all four directions
                const directions = [
                    { r: 1, c: 0 },  // Down
                    { r: 0, c: -1 }, // Left
                    { r: 0, c: 1 },  // Right
                    { r: -1, c: 0 }  // Up
                ];
                
                for (const dir of directions) {
                    const newRow = row + dir.r;
                    const newCol = col + dir.c;
                    
                    if (newRow >= 0 && newRow < boardSize && 
                        newCol >= 0 && newCol < boardSize && 
                        board[newRow][newCol] === null) {
                        
                        // Move the piece
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
    
    // If no move at all is possible, just skip the turn
    currentPlayer = 'white';
    renderBoard();
    updateGameStatus();
}

// Find potential black pieces that can block a white pawn
function findPotentialBlockers(whitePawn) {
    const blockers = [];
    
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                // Only consider black pieces that are above the white pawn
                if (row < whitePawn.row) {
                    // Calculate Manhattan distance to determine proximity
                    const distance = Math.abs(col - whitePawn.col) + Math.abs(row - whitePawn.row);
                    
                    blockers.push({
                        row,
                        col,
                        distance
                    });
                }
            }
        }
    }
    
    // Sort by distance (closest first)
    blockers.sort((a, b) => a.distance - b.distance);
    
    return blockers;
}

// Check if a black pawn is in a blocking position for a white pawn
function isInBlockingPosition(blackPawn, whitePawn) {
    // Same column and above white pawn
    if (blackPawn.col === whitePawn.col && blackPawn.row < whitePawn.row) {
        return true;
    }
    
    // Adjacent column and above or at the same row as white pawn
    if (Math.abs(blackPawn.col - whitePawn.col) === 1 && blackPawn.row <= whitePawn.row) {
        return true;
    }
    
    return false;
}

// Calculate a move to get a black pawn into a blocking position
function calculateBlockingMove(blackPawn, whitePawn) {
    // If black is already directly above white in the same column, stay there
    if (blackPawn.col === whitePawn.col && blackPawn.row < whitePawn.row) {
        return null; // Already in optimal blocking position
    }
    
    // If in an adjacent column and at or above white's row, consider moving to white's column
    if (Math.abs(blackPawn.col - whitePawn.col) === 1 && blackPawn.row <= whitePawn.row) {
        // Check if white's column is empty
        if (board[blackPawn.row][whitePawn.col] === null && !isAdjacentToWhite(blackPawn.row, whitePawn.col)) {
            return {
                toRow: blackPawn.row,
                toCol: whitePawn.col
            };
        }
        return null; // Already in a good blocking position or can't move to a better one
    }
    
    // If not in blocking position yet, find the best move towards it
    const possibleMoves = [];
    
    // Check horizontal move towards white's column
    if (blackPawn.col !== whitePawn.col) {
        const moveCol = blackPawn.col < whitePawn.col ? blackPawn.col + 1 : blackPawn.col - 1;
        
        if (moveCol >= 0 && moveCol < boardSize && 
            board[blackPawn.row][moveCol] === null && 
            !isAdjacentToWhite(blackPawn.row, moveCol)) {
            
            possibleMoves.push({
                toRow: blackPawn.row,
                toCol: moveCol,
                priority: 2 // Higher priority for horizontal moves towards white's column
            });
        }
    }
    
    // Check move down if not at white's row yet
    if (blackPawn.row < whitePawn.row - 1) {
        if (board[blackPawn.row + 1][blackPawn.col] === null && 
            !isAdjacentToWhite(blackPawn.row + 1, blackPawn.col)) {
            
            possibleMoves.push({
                toRow: blackPawn.row + 1,
                toCol: blackPawn.col,
                priority: 1 // Lower priority for vertical moves
            });
        }
    }
    
    // Check diagonal move (down and towards white's column)
    if (blackPawn.row < whitePawn.row - 1 && blackPawn.col !== whitePawn.col) {
        const moveCol = blackPawn.col < whitePawn.col ? blackPawn.col + 1 : blackPawn.col - 1;
        
        if (moveCol >= 0 && moveCol < boardSize && 
            board[blackPawn.row + 1][moveCol] === null && 
            !isAdjacentToWhite(blackPawn.row + 1, moveCol)) {
            
            // Can't actually move diagonally, but try to simulate a diagonal move
            // with two separate moves by prioritizing the horizontal move first
            possibleMoves.push({
                toRow: blackPawn.row,
                toCol: moveCol,
                priority: 3 // Highest priority for moves that get closer to the diagonal
            });
        }
    }
    
    // Sort by priority (highest first)
    possibleMoves.sort((a, b) => b.priority - a.priority);
    
    return possibleMoves.length > 0 ? possibleMoves[0] : null;
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
