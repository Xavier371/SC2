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

// Check if a white piece is contained based on the specific rule:
// For a white piece in column i, there must be a black piece above it in column i-1, i, or i+1
function isWhitePieceContained(row, col) {
    // Check the three possible columns (i-1, i, i+1) for black pieces above this white piece
    const columnsToCheck = [col - 1, col, col + 1];
    
    for (const checkCol of columnsToCheck) {
        // Skip invalid columns
        if (checkCol < 0 || checkCol >= boardSize) {
            continue;
        }
        
        // Check for black pieces above the white piece in this column
        for (let r = 0; r < row; r++) {
            if (board[r][checkCol] === 'black') {
                return true; // White piece is contained
            }
        }
    }
    
    // If no black piece is found above in any of the three columns, the piece is not contained
    return false;
}

// Check if a position would be adjacent to any white piece
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

// Find white pieces that are not contained
function getUncontainedWhitePieces() {
    const uncontainedPieces = [];
    
    // Check each column for white pieces
    for (let col = 0; col < boardSize; col++) {
        // Find the topmost white piece in this column
        let topWhitePieceRow = -1;
        
        for (let r = 0; r < boardSize; r++) {
            if (board[r][col] === 'white') {
                topWhitePieceRow = r;
                break; // Found the topmost white piece
            }
        }
        
        // If there's a white piece in this column, check if it's contained
        if (topWhitePieceRow !== -1) {
            if (!isWhitePieceContained(topWhitePieceRow, col)) {
                uncontainedPieces.push({ 
                    row: topWhitePieceRow, 
                    col,
                    distanceToEnd: topWhitePieceRow // Lower row = higher priority
                });
            }
        }
    }
    
    // Sort by how close they are to the end (lower row = higher priority)
    uncontainedPieces.sort((a, b) => a.distanceToEnd - b.distanceToEnd);
    
    return uncontainedPieces;
}

// Find the nearest black piece that can move to block an uncontained white piece
function findNearestBlocker(whiteRow, whiteCol) {
    // Check the three columns where a black piece could provide containment
    const columnsToCheck = [whiteCol - 1, whiteCol, whiteCol + 1];
    const potentialBlockers = [];
    
    // First, find all black pieces that could potentially block this white piece
    for (const col of columnsToCheck) {
        if (col < 0 || col >= boardSize) continue; // Skip invalid columns
        
        // Look for black pieces above the white piece in this column
        for (let row = 0; row < whiteRow; row++) {
            if (board[row][col] === 'black') {
                // This black piece already provides containment, so we're good
                return null;
            }
        }
        
        // Look for black pieces anywhere that could move to provide containment
        for (let row = 0; row < boardSize; row++) {
            for (let checkCol = 0; checkCol < boardSize; checkCol++) {
                if (board[row][checkCol] === 'black') {
                    // Now calculate target positions where this black piece could move to contain
                    
                    // Potential target positions above the white piece in the containment column
                    for (let targetRow = 0; targetRow < whiteRow; targetRow++) {
                        if (board[targetRow][col] === null) {
                            // Calculate Manhattan distance for movement
                            const distance = Math.abs(row - targetRow) + Math.abs(checkCol - col);
                            
                            // If this piece is only one step away from providing containment
                            if (distance === 1) {
                                // Make sure the move doesn't uncontain other white pieces
                                const tempBoard = JSON.parse(JSON.stringify(board));
                                tempBoard[row][checkCol] = null;
                                tempBoard[targetRow][col] = 'black';
                                
                                let wouldUncontainOthers = false;
                                
                                // Check all white pieces
                                for (let c = 0; c < boardSize; c++) {
                                    for (let r = 0; r < boardSize; r++) {
                                        if (tempBoard[r][c] === 'white' && (r !== whiteRow || c !== whiteCol)) {
                                            const containedBefore = isWhitePieceContained(r, c);
                                            
                                            // Skip if this piece wasn't contained before
                                            if (!containedBefore) continue;
                                            
                                            // Check if it would still be contained after the move
                                            let containedAfter = false;
                                            const checkCols = [c - 1, c, c + 1];
                                            
                                            for (const checkCol of checkCols) {
                                                if (checkCol < 0 || checkCol >= boardSize) continue;
                                                
                                                for (let checkRow = 0; checkRow < r; checkRow++) {
                                                    if (tempBoard[checkRow][checkCol] === 'black') {
                                                        containedAfter = true;
                                                        break;
                                                    }
                                                }
                                                if (containedAfter) break;
                                            }
                                            
                                            if (!containedAfter) {
                                                wouldUncontainOthers = true;
                                                break;
                                            }
                                        }
                                    }
                                    if (wouldUncontainOthers) break;
                                }
                                
                                // Make sure we're not moving adjacent to a white piece
                                const wouldBeAdjacent = isAdjacentToWhite(targetRow, col);
                                
                                if (!wouldUncontainOthers && !wouldBeAdjacent) {
                                    potentialBlockers.push({
                                        fromRow: row,
                                        fromCol: checkCol,
                                        toRow: targetRow,
                                        toCol: col,
                                        distance: distance
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Sort blockers by distance (closest first)
    potentialBlockers.sort((a, b) => a.distance - b.distance);
    
    // Return the closest blocker if any were found
    return potentialBlockers.length > 0 ? potentialBlockers[0] : null;
}

// Improved function to find the best containment move
function findBestContainmentMove(whitePiece) {
    // First, check if there's a direct blocker available
    const directBlocker = findNearestBlocker(whitePiece.row, whitePiece.col);
    if (directBlocker) {
        return directBlocker;
    }
    
    // Original containment code as fallback
    const { row: whiteRow, col: whiteCol } = whitePiece;
    const possibleMoves = [];
    
    // Check the three columns (i-1, i, i+1) to place a blocker
    const columnsToBlock = [whiteCol - 1, whiteCol, whiteCol + 1];
    
    for (const blockCol of columnsToBlock) {
        // Skip invalid columns
        if (blockCol < 0 || blockCol >= boardSize) {
            continue;
        }
        
        // Look for the best position to place a black piece in this column above the white piece
        for (let blockRow = 0; blockRow < whiteRow; blockRow++) {
            // Skip occupied positions
            if (board[blockRow][blockCol] !== null) {
                continue;
            }
            
            // Found a valid blocking position - now look for black pieces that can move here
            const blackMovers = findBlackPiecesThatCanMoveTo(blockRow, blockCol);
            
            for (const mover of blackMovers) {
                // Calculate priority: prefer moves that don't risk capture and advance pieces down the board
                let priority = 0;
                
                // Lower priority if this move puts the piece adjacent to white (risk capture)
                if (isAdjacentToWhite(blockRow, blockCol)) {
                    priority -= 100;
                }
                
                // Higher priority for moves that advance pieces downward
                if (blockRow > mover.row) {
                    priority += 10;
                }
                
                // Higher priority for moving pieces that are already advanced
                priority += mover.row;
                
                possibleMoves.push({
                    fromRow: mover.row,
                    fromCol: mover.col,
                    toRow: blockRow,
                    toCol: blockCol,
                    priority
                });
            }
        }
    }
    
    // Sort moves by priority (higher is better)
    possibleMoves.sort((a, b) => b.priority - a.priority);
    
    return possibleMoves.length > 0 ? possibleMoves[0] : null;
}

// Find black pieces that can move to a specific position in one turn
function findBlackPiecesThatCanMoveTo(targetRow, targetCol) {
    const pieces = [];
    
    // Check adjacent positions (left, right, below, above)
    const adjacentPositions = [
        { row: targetRow, col: targetCol - 1 }, // Left
        { row: targetRow, col: targetCol + 1 }, // Right
        { row: targetRow + 1, col: targetCol }, // Below
        { row: targetRow - 1, col: targetCol }  // Above
    ];
    
    for (const pos of adjacentPositions) {
        // Skip invalid positions
        if (pos.row < 0 || pos.row >= boardSize || 
            pos.col < 0 || pos.col >= boardSize) {
            continue;
        }
        
        // Check if there's a black piece at this position
        if (board[pos.row][pos.col] === 'black') {
            pieces.push({ row: pos.row, col: pos.col });
        }
    }
    
    return pieces;
}

// Find black pieces that can advance toward the bottom of the board
function findAdvanceablePieces() {
    const advanceablePieces = [];
    
    // Check each black piece
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                // Check if this piece can move down
                if (row < boardSize - 1 && board[row + 1][col] === null) {
                    // Make sure this move doesn't uncontain any white pieces
                    const tempBoard = JSON.parse(JSON.stringify(board));
                    tempBoard[row][col] = null;
                    tempBoard[row + 1][col] = 'black';
                    
                    // Check if this move would uncontain any white pieces
                    let wouldUncontain = false;
                    
                    // Simulate the board after this move
                    for (let c = 0; c < boardSize; c++) {
                        for (let r = 0; r < boardSize; r++) {
                            if (tempBoard[r][c] === 'white') {
                                // Check containment on the temporary board
                                const containedBefore = isWhitePieceContained(r, c);
                                
                                // Check containment after the potential move
                                let containedAfter = false;
                                const columnsToCheck = [c - 1, c, c + 1];
                                
                                for (const checkCol of columnsToCheck) {
                                    if (checkCol < 0 || checkCol >= boardSize) {
                                        continue;
                                    }
                                    
                                    for (let checkRow = 0; checkRow < r; checkRow++) {
                                        if (tempBoard[checkRow][checkCol] === 'black') {
                                            containedAfter = true;
                                            break;
                                        }
                                    }
                                    
                                    if (containedAfter) break;
                                }
                                
                                // If a piece was contained before but wouldn't be after, reject this move
                                if (containedBefore && !containedAfter) {
                                    wouldUncontain = true;
                                    break;
                                }
                                
                                break; // Only check the topmost white piece in each column
                            }
                        }
                        
                        if (wouldUncontain) break;
                    }
                    
                    // Make sure this move doesn't put the piece adjacent to a white piece
                    const wouldBeAdjacent = isAdjacentToWhite(row + 1, col);
                    
                    if (!wouldUncontain && !wouldBeAdjacent) {
                        advanceablePieces.push({
                            row,
                            col,
                            newRow: row + 1,
                            newCol: col,
                            // Higher priority for pieces closer to winning
                            priority: row
                        });
                    }
                }
                
                // Check if it can make a sideways move that would set up a downward move
                const sidewaysMoves = [
                    { row: row, col: col - 1 }, // Left
                    { row: row, col: col + 1 }  // Right
                ];
                
                for (const move of sidewaysMoves) {
                    if (move.col < 0 || move.col >= boardSize) {
                        continue; // Skip invalid columns
                    }
                    
                    // Check if the sideways move is valid
                    if (board[move.row][move.col] === null) {
                        // Check if this sideways move would set up a downward move next turn
                        const canMoveDownAfter = move.row < boardSize - 1 && board[move.row + 1][move.col] === null;
                        
                        // Make sure this move doesn't uncontain any white pieces
                        const tempBoard = JSON.parse(JSON.stringify(board));
                        tempBoard[row][col] = null;
                        tempBoard[move.row][move.col] = 'black';
                        
                        // Check containment after the move
                        let wouldUncontain = false;
                        
                        for (let c = 0; c < boardSize; c++) {
                            for (let r = 0; r < boardSize; r++) {
                                if (tempBoard[r][c] === 'white') {
                                    const containedBefore = isWhitePieceContained(r, c);
                                    
                                    // Check containment after the potential move
                                    let containedAfter = false;
                                    const columnsToCheck = [c - 1, c, c + 1];
                                    
                                    for (const checkCol of columnsToCheck) {
                                        if (checkCol < 0 || checkCol >= boardSize) {
                                            continue;
                                        }
                                        
                                        for (let checkRow = 0; checkRow < r; checkRow++) {
                                            if (tempBoard[checkRow][checkCol] === 'black') {
                                                containedAfter = true;
                                                break;
                                            }
                                        }
                                        
                                        if (containedAfter) break;
                                    }
                                    
                                    if (containedBefore && !containedAfter) {
                                        wouldUncontain = true;
                                        break;
                                    }
                                    
                                    break; // Only check the topmost white piece in each column
                                }
                            }
                            
                            if (wouldUncontain) break;
                        }
                        
                        // Make sure this move doesn't put the piece adjacent to a white piece
                        const wouldBeAdjacent = isAdjacentToWhite(move.row, move.col);
                        
                        if (!wouldUncontain && !wouldBeAdjacent) {
                            // Add to the list with appropriate priority
                            advanceablePieces.push({
                                row,
                                col,
                                newRow: move.row,
                                newCol: move.col,
                                // Lower priority for sideways moves, but higher if they enable downward movement
                                priority: canMoveDownAfter ? row - 0.5 : row - 5
                            });
                        }
                    }
                }
            }
        }
    }
    
    // Sort by priority (higher is better)
    advanceablePieces.sort((a, b) => b.priority - a.priority);
    
    return advanceablePieces;
}

// Check if a black move would allow a white piece to move up
function wouldAllowWhiteAdvance(blackRow, blackCol, newBlackRow, newBlackCol) {
    // Create a simulated board with the proposed black move
    const tempBoard = JSON.parse(JSON.stringify(board));
    tempBoard[blackRow][blackCol] = null;
    tempBoard[newBlackRow][newBlackCol] = 'black';
    
    // Check all white pieces to see if any can now advance
    for (let col = 0; col < boardSize; col++) {
        for (let row = 0; row < boardSize; row++) {
            if (tempBoard[row][col] === 'white') {
                // Check if this white piece can now move up
                if (row > 0 && tempBoard[row - 1][col] === null) {
                    return true; // This would allow a white piece to advance
                }
                break; // Only check the topmost white piece in each column
            }
        }
    }
    
    return false; // No white piece would be able to advance
}

// Find black pieces that could move to proactively block white's forward movement
function findProactiveBlockingMoves() {
    const proactiveBlockingMoves = [];
    
    // Identify all white pieces that aren't blocked from moving forward
    const whiteForwardPositions = [];
    
    for (let col = 0; col < boardSize; col++) {
        for (let row = 0; row < boardSize; row++) {
            if (board[row][col] === 'white') {
                // Check if white can move forward (up) from here
                if (row > 0 && board[row - 1][col] === null) {
                    whiteForwardPositions.push({ row, col, upRow: row - 1 });
                }
                break; // Only check the topmost white piece in each column
            }
        }
    }
    
    // If there are white pieces that can move forward, try to block them
    if (whiteForwardPositions.length > 0) {
        // For each position where white could move up
        for (const whitePos of whiteForwardPositions) {
            // Check if any black piece can move to block the upward movement
            const upRow = whitePos.upRow;
            const upCol = whitePos.col;
            
            // Find black pieces that could move here
            const potentialBlockers = findBlackPiecesThatCanMoveTo(upRow, upCol);
            
            for (const blocker of potentialBlockers) {
                // Check if moving this piece wouldn't leave other white pieces uncontained
                const tempBoard = JSON.parse(JSON.stringify(board));
                tempBoard[blocker.row][blocker.col] = null;
                tempBoard[upRow][upCol] = 'black';
                
                let wouldUncontain = false;
                for (let c = 0; c < boardSize; c++) {
                    for (let r = 0; r < boardSize; r++) {
                        if (tempBoard[r][c] === 'white') {
                            const containedBefore = isWhitePieceContained(r, c);
                            
                            // Check containment after the move
                            let containedAfter = false;
                            const columnsToCheck = [c - 1, c, c + 1];
                            for (const checkCol of columnsToCheck) {
                                if (checkCol < 0 || checkCol >= boardSize) continue;
                                
                                for (let checkRow = 0; checkRow < r; checkRow++) {
                                    if (tempBoard[checkRow][checkCol] === 'black') {
                                        containedAfter = true;
                                        break;
                                    }
                                }
                                if (containedAfter) break;
                            }
                            
                            if (containedBefore && !containedAfter) {
                                wouldUncontain = true;
                                break;
                            }
                            break; // Only check the topmost white piece
                        }
                    }
                    if (wouldUncontain) break;
                }
                
                // Also check if this move would put the blocker adjacent to any white piece
                const wouldBeAdjacent = isAdjacentToWhite(upRow, upCol);
                
                if (!wouldUncontain && !wouldBeAdjacent) {
                    proactiveBlockingMoves.push({
                        fromRow: blocker.row,
                        fromCol: blocker.col,
                        toRow: upRow,
                        toCol: upCol,
                        // Higher priority for blocking pieces closer to the top
                        priority: boardSize - upRow
                    });
                }
            }
        }
    }
    
    // Sort by priority (higher first)
    proactiveBlockingMoves.sort((a, b) => b.priority - a.priority);
    
    return proactiveBlockingMoves;
}

// Find moves that distribute black pieces evenly across the board
function findDistributedAdvancementMoves() {
    const distributedMoves = [];
    
    // First, analyze the current distribution of black pieces by column
    const blackPiecesByColumn = Array(boardSize).fill(0);
    
    for (let col = 0; col < boardSize; col++) {
        for (let row = 0; row < boardSize; row++) {
            if (board[row][col] === 'black') {
                blackPiecesByColumn[col]++;
            }
        }
    }
    
    // Find columns with fewer black pieces
    const averageBlackPieces = blackPiecesByColumn.reduce((sum, count) => sum + count, 0) / boardSize;
    const underrepresentedColumns = [];
    
    for (let col = 0; col < boardSize; col++) {
        if (blackPiecesByColumn[col] < averageBlackPieces) {
            underrepresentedColumns.push(col);
        }
    }
    
    // If we have a last moved piece, avoid moving it again if possible
    const avoidPiece = lastMovedBlackPiece ? { row: lastMovedBlackPiece.row, col: lastMovedBlackPiece.col } : null;
    
    // Find black pieces that can move to distribute more evenly
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                // Skip the last moved piece if specified
                if (avoidPiece && row === avoidPiece.row && col === avoidPiece.col) {
                    continue;
                }
                
                // Check possible moves for this piece
                const possibleMoves = [];
                
                // Check downward move (highest priority)
                if (row < boardSize - 1 && board[row + 1][col] === null && !isAdjacentToWhite(row + 1, col)) {
                    possibleMoves.push({ 
                        newRow: row + 1, 
                        newCol: col, 
                        priority: 20 + row // Higher row = higher priority for downward moves
                    });
                }
                
                // Check sideways moves, prioritizing underrepresented columns
                const sidewaysCols = [col - 1, col + 1];
                for (const newCol of sidewaysCols) {
                    if (newCol >= 0 && newCol < boardSize && 
                        board[row][newCol] === null && 
                        !isAdjacentToWhite(row, newCol)) {
                        
                        let priority = 10; // Base priority for sideways moves
                        
                        // Higher priority if the move is toward an underrepresented column
                        if (underrepresentedColumns.includes(newCol)) {
                            priority += 5;
                        }
                        
                        // Higher priority if this sets up a forward move
                        if (row < boardSize - 1 && board[row + 1][newCol] === null) {
                            priority += 3;
                        }
                        
                        possibleMoves.push({ newRow: row, newCol, priority });
                    }
                }
                
                // For each possible move, check if it would maintain containment and not allow white to advance
                for (const move of possibleMoves) {
                    // Check containment
                    const tempBoard = JSON.parse(JSON.stringify(board));
                    tempBoard[row][col] = null;
                    tempBoard[move.newRow][move.newCol] = 'black';
                    
                    let wouldUncontain = false;
                    let wouldLetWhiteAdvance = false;
                    
                    // Check if the move would uncontain any white piece
                    for (let c = 0; c < boardSize; c++) {
                        for (let r = 0; r < boardSize; r++) {
                            if (tempBoard[r][c] === 'white') {
                                // Check containment
                                const containedBefore = isWhitePieceContained(r, c);
                                
                                // Simulate containment after the move
                                let containedAfter = false;
                                const columnsToCheck = [c - 1, c, c + 1];
                                for (const checkCol of columnsToCheck) {
                                    if (checkCol < 0 || checkCol >= boardSize) continue;
                                    
                                    for (let checkRow = 0; checkRow < r; checkRow++) {
                                        if (tempBoard[checkRow][checkCol] === 'black') {
                                            containedAfter = true;
                                            break;
                                        }
                                    }
                                    if (containedAfter) break;
                                }
                                
                                if (containedBefore && !containedAfter) {
                                    wouldUncontain = true;
                                    break;
                                }
                                
                                // Check if white could now move up
                                if (r > 0 && tempBoard[r - 1][c] === null) {
                                    wouldLetWhiteAdvance = true;
                                }
                                
                                break; // Only check the topmost white piece
                            }
                        }
                        if (wouldUncontain) break;
                    }
                    
                    // If the move maintains containment and doesn't help white advance
                    if (!wouldUncontain && !wouldLetWhiteAdvance) {
                        distributedMoves.push({
                            fromRow: row,
                            fromCol: col,
                            toRow: move.newRow,
                            toCol: move.newCol,
                            priority: move.priority
                        });
                    }
                }
            }
        }
    }
    
    // Sort by priority
    distributedMoves.sort((a, b) => b.priority - a.priority);
    
    return distributedMoves;
}

// Find a single pawn to push down as far as possible in the early game, prioritizing center columns
function findEarlyGameForwardMoves() {
    // Count total pieces on the board to determine game phase
    let whitePieces = 0;
    let blackPieces = 0;
    
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'white') whitePieces++;
            if (board[row][col] === 'black') blackPieces++;
        }
    }
    
    // Early game is when we still have most pieces on the board
    const isEarlyGame = whitePieces >= boardSize - 2 && blackPieces >= boardSize - 2;
    
    if (!isEarlyGame) {
        return null; // Not early game, don't use this strategy
    }
    
    // If there's a last moved black piece that can still move down, keep pushing it
    if (lastMovedBlackPiece && 
        lastMovedBlackPiece.row < boardSize - 1 && 
        board[lastMovedBlackPiece.row + 1][lastMovedBlackPiece.col] === null) {
        
        // Check if this move would maintain containment and safety
        const tempBoard = JSON.parse(JSON.stringify(board));
        const row = lastMovedBlackPiece.row;
        const col = lastMovedBlackPiece.col;
        tempBoard[row][col] = null;
        tempBoard[row + 1][col] = 'black';
        
        let wouldUncontain = false;
        
        // Check if this move would uncontain any white pieces
        for (let c = 0; c < boardSize; c++) {
            for (let r = 0; r < boardSize; r++) {
                if (tempBoard[r][c] === 'white') {
                    const containedBefore = isWhitePieceContained(r, c);
                    
                    // Check containment after the move
                    let containedAfter = false;
                    const columnsToCheck = [c - 1, c, c + 1];
                    
                    for (const checkCol of columnsToCheck) {
                        if (checkCol < 0 || checkCol >= boardSize) continue;
                        
                        for (let checkRow = 0; checkRow < r; checkRow++) {
                            if (tempBoard[checkRow][checkCol] === 'black') {
                                containedAfter = true;
                                break;
                            }
                        }
                        if (containedAfter) break;
                    }
                    
                    if (containedBefore && !containedAfter) {
                        wouldUncontain = true;
                        break;
                    }
                    
                    break; // Only check the topmost white piece
                }
            }
            if (wouldUncontain) break;
        }
        
        // Ensure we're not moving adjacent to white
        const wouldBeAdjacent = isAdjacentToWhite(row + 1, col);
        
        if (!wouldUncontain && !wouldBeAdjacent) {
            // Continue pushing the same piece
            return {
                fromRow: row,
                fromCol: col,
                toRow: row + 1,
                toCol: col
            };
        }
    }
    
    // Create an array of columns prioritized by their distance from the center
    const centerIndex = Math.floor(boardSize / 2);
    const columnsByPriority = [];
    
    // For even-sized boards (like 8x8), consider both center columns as highest priority
    if (boardSize % 2 === 0) {
        const center1 = centerIndex - 1;
        const center2 = centerIndex;
        
        // Add center columns first
        columnsByPriority.push(center1, center2);
        
        // Add remaining columns outward from center
        for (let offset = 1; offset <= centerIndex; offset++) {
            if (center1 - offset >= 0) columnsByPriority.push(center1 - offset);
            if (center2 + offset < boardSize) columnsByPriority.push(center2 + offset);
        }
    } else {
        // Odd-sized board has a single center column
        columnsByPriority.push(centerIndex);
        
        // Add remaining columns outward from center
        for (let offset = 1; offset <= centerIndex; offset++) {
            if (centerIndex - offset >= 0) columnsByPriority.push(centerIndex - offset);
            if (centerIndex + offset < boardSize) columnsByPriority.push(centerIndex + offset);
        }
    }
    
    // Try each column in priority order
    for (const col of columnsByPriority) {
        // Find the topmost black piece in this column that can move down
        for (let row = 0; row < boardSize - 1; row++) {
            if (board[row][col] === 'black' && board[row + 1][col] === null) {
                // Check if this move would maintain containment
                const tempBoard = JSON.parse(JSON.stringify(board));
                tempBoard[row][col] = null;
                tempBoard[row + 1][col] = 'black';
                
                let wouldUncontain = false;
                
                // Check if this move would uncontain any white pieces
                for (let c = 0; c < boardSize; c++) {
                    for (let r = 0; r < boardSize; r++) {
                        if (tempBoard[r][c] === 'white') {
                            const containedBefore = isWhitePieceContained(r, c);
                            
                            // Check containment after the move
                            let containedAfter = false;
                            const columnsToCheck = [c - 1, c, c + 1];
                            
                            for (const checkCol of columnsToCheck) {
                                if (checkCol < 0 || checkCol >= boardSize) continue;
                                
                                for (let checkRow = 0; checkRow < r; checkRow++) {
                                    if (tempBoard[checkRow][checkCol] === 'black') {
                                        containedAfter = true;
                                        break;
                                    }
                                }
                                if (containedAfter) break;
                            }
                            
                            if (containedBefore && !containedAfter) {
                                wouldUncontain = true;
                                break;
                            }
                            
                            break; // Only check the topmost white piece
                        }
                    }
                    if (wouldUncontain) break;
                }
                
                // Ensure we're not moving adjacent to white
                const wouldBeAdjacent = isAdjacentToWhite(row + 1, col);
                
                if (!wouldUncontain && !wouldBeAdjacent) {
                    // Found a new pawn to start pushing
                    return {
                        fromRow: row,
                        fromCol: col,
                        toRow: row + 1,
                        toCol: col
                    };
                }
            }
        }
    }
    
    // No suitable pawn found to push in early game
    return null;
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
    
    // PRIORITY 2: Check if black can win in the next move
    for (let row = boardSize - 2; row >= 0; row--) {
        for (let col = 0; col < boardSize; col++) {
            // If there's a black piece one row away from the end
            if (board[row][col] === 'black' && board[row + 1][col] === null) {
                // Check if this piece can reach the bottom row
                if (row + 1 === boardSize - 1) {
                    // Make the winning move
                    board[row + 1][col] = 'black';
                    board[row][col] = null;
                    
                    // Update last moved piece
                    lastMovedBlackPiece = { row: row + 1, col: col };
                    
                    // Black reaches the end
                    renderBoard();
                    setTimeout(() => {
                        alert('Black wins!');
                        initializeBoard();
                    }, 100);
                    return;
                }
            }
        }
    }
    
    // PRIORITY 3: Ensure all white pieces are contained
    const uncontainedWhitePieces = getUncontainedWhitePieces();
    
    if (uncontainedWhitePieces.length > 0) {
        // Focus on containing the closest piece to the end first
        for (const whitePiece of uncontainedWhitePieces) {
            const containmentMove = findBestContainmentMove(whitePiece);
            
            if (containmentMove) {
                // Make the containment move
                board[containmentMove.toRow][containmentMove.toCol] = 'black';
                board[containmentMove.fromRow][containmentMove.fromCol] = null;
                
                // Update last moved piece
                lastMovedBlackPiece = { row: containmentMove.toRow, col: containmentMove.toCol };
                
                // Check if black won by reaching the end
                if (containmentMove.toRow === boardSize - 1) {
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
    
    // PRIORITY 4: In early game, push a single pawn as far as possible before moving to the next
    const earlyGameMove = findEarlyGameForwardMoves();
    
    if (earlyGameMove) {
        // Make the forward move - keep pushing the same pawn
        board[earlyGameMove.toRow][earlyGameMove.toCol] = 'black';
        board[earlyGameMove.fromRow][earlyGameMove.fromCol] = null;
        
        // Update last moved piece
        lastMovedBlackPiece = { row: earlyGameMove.toRow, col: earlyGameMove.toCol };
        
        // Check if black won by reaching the end
        if (earlyGameMove.toRow === boardSize - 1) {
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
    
    // PRIORITY 5: Proactively block white pieces from advancing, even if they're already contained
    const proactiveBlocks = findProactiveBlockingMoves();
    
    if (proactiveBlocks.length > 0) {
        const bestBlock = proactiveBlocks[0];
        
        // Make the proactive blocking move
        board[bestBlock.toRow][bestBlock.toCol] = 'black';
        board[bestBlock.fromRow][bestBlock.fromCol] = null;
        
        // Update last moved piece
        lastMovedBlackPiece = { row: bestBlock.toRow, col: bestBlock.toCol };
        
        // End black's turn
        currentPlayer = 'white';
        renderBoard();
        updateGameStatus();
        return;
    }
    
    // PRIORITY 6: Make a distributed advancement move (avoid moving the same piece repeatedly)
    const distributedMoves = findDistributedAdvancementMoves();
    
    if (distributedMoves.length > 0) {
        const bestMove = distributedMoves[0];
        
        // Make the distributed move
        board[bestMove.toRow][bestMove.toCol] = 'black';
        board[bestMove.fromRow][bestMove.fromCol] = null;
        
        // Update last moved piece
        lastMovedBlackPiece = { row: bestMove.toRow, col: bestMove.toCol };
        
        // Check if black won by reaching the end
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
    
    // PRIORITY 7: If all else fails, make any safe advancement move
    const advanceablePieces = findAdvanceablePieces();
    
    if (advanceablePieces.length > 0) {
        // Take the best advancement move
        const bestMove = advanceablePieces[0];
        
        // Make the move
        board[bestMove.newRow][bestMove.newCol] = 'black';
        board[bestMove.row][bestMove.col] = null;
        
        // Update last moved piece
        lastMovedBlackPiece = { row: bestMove.newRow, col: bestMove.newCol };
        
        // Check if black won by reaching the end
        if (bestMove.newRow === boardSize - 1) {
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
    
    // PRIORITY 8: If no other move is possible, just find any safe move
    for (let row = 0; row < boardSize; row++) {
        for (let col = 0; col < boardSize; col++) {
            if (board[row][col] === 'black') {
                // Check adjacent squares for valid moves
                const directions = [
                    { r: 1, c: 0 },  // Down (prioritize)
                    { r: 0, c: 1 },  // Right
                    { r: 0, c: -1 }, // Left
                    { r: -1, c: 0 }  // Up (last resort)
                ];
                
                for (const dir of directions) {
                    const newRow = row + dir.r;
                    const newCol = col + dir.c;
                    
                    if (newRow >= 0 && newRow < boardSize && 
                        newCol >= 0 && newCol < boardSize && 
                        board[newRow][newCol] === null && 
                        !isAdjacentToWhite(newRow, newCol)) {
                        
                        // Make the move
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
    
    // If no move was found, just skip the turn
    currentPlayer = 'white';
    renderBoard();
    updateGameStatus();
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
