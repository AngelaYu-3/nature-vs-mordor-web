import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Entity types
const ENTITY_TYPES = {
  PLANT: 'plant',
  ENEMY: 'enemy',
  POWERUP: 'powerup'
};

// Game configuration
const GAME_CONFIG = {
  rows: 5,
  cols: 9,
  enemyMoveInterval: 1500,
  enemySpawnInterval: 5000,
  sunFallInterval: 10000,
  plantSunCheckInterval: 1000,
  initialSun: 150
};

// Plant definitions
const PLANTS = {
  '🌻': { name: 'Sunflower', cost: 10, health: 50, damage: 0, sunGen: 10, genInterval: 8 },
  '🌿': { name: 'Peashooter', cost: 15, health: 100, damage: 10, sunGen: 15, genInterval: 10 },
  '🌹': { name: 'Rose', cost: 20, health: 120, damage: 12, sunGen: 30, genInterval: 20 },
  '🌳': { name: 'Tree', cost: 25, health: 300, damage: 5, sunGen: 40, genInterval: 25 },
  '🍄': { name: 'Mushroom', cost: 30, health: 80, damage: 8, sunGen: 30, genInterval: 9 }
};

// Powerup definitions
const POWERUPS = {
  '🔥': { name: 'Fire', cost: 5, damage: 5, effect: 'Line' },
  '❄️': { name: 'Freeze', cost: 10, damage: 10, effect: 'Single' },
  '💣': { name: 'Bomb', cost: 15, damage: 15, effect: 'Area 3x3' },
  '🌊': { name: 'Water', cost: 20, damage: 20, effect: 'Row' },
  '⚡': { name: 'Lightning', cost: 30, damage: 25, effect: 'Column' }
};

// Enemy definitions
const ENEMY_TYPES = [
  { emoji: '👹', health: 5, damage: 2 },
  { emoji: '👺', health: 10, damage: 4 },
  { emoji: '🧟', health: 15, damage: 6 },
  { emoji: '👿', health: 20, damage: 8 },
  { emoji: '💀', health: 25, damage: 10 }
];

function App() {
  const [gameStarted, setGameStarted] = useState(false);
  const [sun, setSun] = useState(GAME_CONFIG.initialSun);
  const [score, setScore] = useState(0);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [grid, setGrid] = useState([]);
  const [gameOver, setGameOver] = useState(false);
  

  // Initialize grid
  useEffect(() => {
    const newGrid = Array(GAME_CONFIG.rows).fill(null).map(() => 
      Array(GAME_CONFIG.cols).fill(null)
    );
    setGrid(newGrid);
  }, []);

  // Create entity
  const createEntity = (emoji, type, additionalProps = {}) => ({
    emoji,
    type,
    id: Date.now() + Math.random(),
    lastGenTime: Date.now(),
    ...additionalProps
  });

  // Apply powerup directly on enemy (renamed to avoid hook naming)
  const applyPowerupDirect = useCallback((row, col, powerupEmoji, gridToModify) => {
    const powerupData = POWERUPS[powerupEmoji];
    const damage = powerupData.damage;

    if (powerupEmoji === '💣') {
      // Bomb - 3x3 area
      for (let i = Math.max(0, row - 1); i <= Math.min(GAME_CONFIG.rows - 1, row + 1); i++) {
        for (let j = Math.max(0, col - 1); j <= Math.min(GAME_CONFIG.cols - 1, col + 1); j++) {
          if (gridToModify[i][j] && gridToModify[i][j].type === ENTITY_TYPES.ENEMY) {
            gridToModify[i][j].health -= damage;
            if (gridToModify[i][j].health <= 0) {
              gridToModify[i][j] = null;
              setScore(prev => prev + 10);
            }
          }
        }
      }
    } else if (powerupEmoji === '⚡') {
      // Lightning - column
      for (let i = 0; i < GAME_CONFIG.rows; i++) {
        if (gridToModify[i][col] && gridToModify[i][col].type === ENTITY_TYPES.ENEMY) {
          gridToModify[i][col].health -= damage;
          if (gridToModify[i][col].health <= 0) {
            gridToModify[i][col] = null;
            setScore(prev => prev + 10);
          }
        }
      }
    } else if (powerupEmoji === '🌊') {
      // Water - row
      for (let j = col; j < GAME_CONFIG.cols; j++) {
        if (gridToModify[row][j] && gridToModify[row][j].type === ENTITY_TYPES.ENEMY) {
          gridToModify[row][j].health -= damage;
          if (gridToModify[row][j].health <= 0) {
            gridToModify[row][j] = null;
            setScore(prev => prev + 10);
          }
        }
      }
    } else if (powerupEmoji === '🔥') {
      // Fire - line (current + one ahead)
      for (let j = col; j <= Math.min(GAME_CONFIG.cols - 1, col + 1); j++) {
        if (gridToModify[row][j] && gridToModify[row][j].type === ENTITY_TYPES.ENEMY) {
          gridToModify[row][j].health -= damage;
          if (gridToModify[row][j].health <= 0) {
            gridToModify[row][j] = null;
            setScore(prev => prev + 10);
          }
        }
      }
    } else {
      // Single target (Freeze)
      if (gridToModify[row][col] && gridToModify[row][col].type === ENTITY_TYPES.ENEMY) {
        gridToModify[row][col].health -= damage;
        if (gridToModify[row][col].health <= 0) {
          gridToModify[row][col] = null;
          setScore(prev => prev + 10);
        }
      }
    }
  }, []);

  // Place plant
  const placePlant = useCallback((row, col) => {
    if (!selectedItem || selectedType !== 'plant') return;
    if (col > 2) {
      alert('Plants can only be placed in the left area!');
      return;
    }

    const plantData = PLANTS[selectedItem];
    if (sun < plantData.cost) {
      alert(`Not enough sun! Need ${plantData.cost}, have ${sun}`);
      return;
    }

    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      if (newGrid[row][col]) {
        alert('Cell already occupied!');
        return prevGrid;
      }

      newGrid[row][col] = createEntity(selectedItem, ENTITY_TYPES.PLANT, {
        health: plantData.health,
        damage: plantData.damage,
        sunGen: plantData.sunGen,
        genInterval: plantData.genInterval * 1000
      });

      setSun(prev => prev - plantData.cost);
      setSelectedItem(null);
      setSelectedType(null);
      return newGrid;
    });
  }, [selectedItem, selectedType, sun]);

  // Place powerup trap
  const placePowerupTrap = useCallback((row, col) => {
    if (!selectedItem || selectedType !== 'powerup') return;

    const powerupData = POWERUPS[selectedItem];
    if (sun < powerupData.cost) {
      alert(`Not enough sun! Need ${powerupData.cost}, have ${sun}`);
      return;
    }

    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      
      // Check if there's an enemy here - use powerup directly
      if (newGrid[row][col] && newGrid[row][col].type === ENTITY_TYPES.ENEMY) {
        applyPowerupDirect(row, col, selectedItem, newGrid);
        setSun(prev => prev - powerupData.cost);
        setSelectedItem(null);
        setSelectedType(null);
        return newGrid;
      }

      // Place as trap
      if (newGrid[row][col]) {
        alert('Cell already occupied!');
        return prevGrid;
      }

      newGrid[row][col] = createEntity(selectedItem, ENTITY_TYPES.POWERUP, {
        remainingPower: powerupData.damage,
        powerupType: selectedItem
      });

      setSun(prev => prev - powerupData.cost);
      setSelectedItem(null);
      setSelectedType(null);
      return newGrid;
    });
  }, [selectedItem, selectedType, sun, applyPowerupDirect]);

  // Handle cell click
  const handleCellClick = (row, col) => {
    if (selectedType === 'plant') {
      placePlant(row, col);
    } else if (selectedType === 'powerup') {
      placePowerupTrap(row, col);
    }
  };

  // Spawn enemy
  const spawnEnemy = useCallback(() => {
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      const row = Math.floor(Math.random() * GAME_CONFIG.rows);
      const col = GAME_CONFIG.cols - 1;

      if (!newGrid[row][col]) {
        const enemyType = ENEMY_TYPES[Math.floor(Math.random() * ENEMY_TYPES.length)];
        newGrid[row][col] = createEntity(enemyType.emoji, ENTITY_TYPES.ENEMY, {
          health: enemyType.health,
          damage: enemyType.damage
        });
      }

      return newGrid;
    });
  }, []);

  // Move enemies and handle collisions
  const updateGame = useCallback(() => {
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      const moved = Array(GAME_CONFIG.rows).fill(null).map(() => Array(GAME_CONFIG.cols).fill(false));

      for (let row = 0; row < GAME_CONFIG.rows; row++) {
        for (let col = 0; col < GAME_CONFIG.cols; col++) {
          const entity = newGrid[row][col];
          
          if (entity && entity.type === ENTITY_TYPES.ENEMY && !moved[row][col]) {
            const targetCol = col - 1;
            
            if (targetCol >= 0) {
              const target = newGrid[row][targetCol];
              
              if (target && target.type === ENTITY_TYPES.PLANT) {
                // Attack plant
                target.health -= entity.damage;
                if (target.health <= 0) {
                  newGrid[row][targetCol] = null;
                }
              } else if (target && target.type === ENTITY_TYPES.POWERUP) {
                // Hit trap
                const damageDealt = Math.min(target.remainingPower, entity.health);
                entity.health -= damageDealt;
                target.remainingPower -= damageDealt;

                if (target.remainingPower <= 0) {
                  // Trap destroyed, enemy moves in
                  newGrid[row][targetCol] = entity;
                  newGrid[row][col] = null;
                  moved[row][targetCol] = true;
                } else {
                  // Trap survives, enemy blocked
                  if (entity.health <= 0) {
                    newGrid[row][col] = null;
                  }
                }

                if (entity.health <= 0) {
                  setScore(prev => prev + 10);
                }

                if (targetCol === 0 && newGrid[row][targetCol] && newGrid[row][targetCol].type === ENTITY_TYPES.ENEMY) {
                  setGameOver(true);
                }
              } else if (!target) {
                // Move left
                newGrid[row][targetCol] = entity;
                newGrid[row][col] = null;
                moved[row][targetCol] = true;

                if (targetCol === 0) {
                  setGameOver(true);
                }
              }
            }
          }
        }
      }

      return newGrid;
    });
  }, []);

  // Plants attack enemies
  const checkCollisions = useCallback(() => {
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);

      for (let row = 0; row < GAME_CONFIG.rows; row++) {
        for (let col = 0; col < GAME_CONFIG.cols; col++) {
          const entity = newGrid[row][col];
          
          if (entity && entity.type === ENTITY_TYPES.PLANT && entity.damage > 0) {
            // Find first enemy to the right
            for (let targetCol = col + 1; targetCol < GAME_CONFIG.cols; targetCol++) {
              const target = newGrid[row][targetCol];
              if (target && target.type === ENTITY_TYPES.ENEMY) {
                target.health -= entity.damage;
                if (target.health <= 0) {
                  newGrid[row][targetCol] = null;
                  setScore(prev => prev + 10);
                }
                break;
              }
            }
          }
        }
      }

      return newGrid;
    });
  }, []);

  // Generate sun from plants
  const generateSunFromPlants = useCallback(() => {
    const currentTime = Date.now();

    setGrid(prevGrid => {
      const newGrid = prevGrid.map(row => [...row]);
      let totalSun = 0;

      for (let row = 0; row < GAME_CONFIG.rows; row++) {
        for (let col = 0; col < GAME_CONFIG.cols; col++) {
          const entity = newGrid[row][col];
          
          if (entity && entity.type === ENTITY_TYPES.PLANT && entity.sunGen > 0) {
            const timeSinceLast = currentTime - entity.lastGenTime;
            
            if (timeSinceLast >= entity.genInterval) {
              totalSun += entity.sunGen;
              entity.lastGenTime = currentTime;
            }
          }
        }
      }

      if (totalSun > 0) {
        setSun(prev => prev + totalSun);
      }

      return newGrid;
    });
  }, []);

  // Game loop timers
  useEffect(() => {
    if (!gameStarted || gameOver) return;

    const enemyMoveTimer = setInterval(updateGame, GAME_CONFIG.enemyMoveInterval);
    const collisionTimer = setInterval(checkCollisions, GAME_CONFIG.enemyMoveInterval);
    const enemySpawnTimer = setInterval(spawnEnemy, GAME_CONFIG.enemySpawnInterval);
    const sunFallTimer = setInterval(() => setSun(prev => prev + 25), GAME_CONFIG.sunFallInterval);
    const plantSunTimer = setInterval(generateSunFromPlants, GAME_CONFIG.plantSunCheckInterval);

    return () => {
      clearInterval(enemyMoveTimer);
      clearInterval(collisionTimer);
      clearInterval(enemySpawnTimer);
      clearInterval(sunFallTimer);
      clearInterval(plantSunTimer);
    };
  }, [gameStarted, gameOver, updateGame, checkCollisions, spawnEnemy, generateSunFromPlants]);

  // Get cell background color
  const getCellColor = (col) => {
    if (col <= 2) return '#64c864'; // Plant zone
    if (col >= 7) return '#b46464'; // Enemy spawn
    return '#a08c64'; // Battlefield
  };

  // Restart game
  const restartGame = () => {
    setGameStarted(false);
    setGameOver(false);
    setSun(GAME_CONFIG.initialSun);
    setScore(0);
    setSelectedItem(null);
    setSelectedType(null);
    const newGrid = Array(GAME_CONFIG.rows).fill(null).map(() => 
      Array(GAME_CONFIG.cols).fill(null)
    );
    setGrid(newGrid);
  };

  if (!gameStarted) {
    return (
      <div className="start-screen">
        <h1>Nature vs Mordor</h1>
        <button onClick={() => setGameStarted(true)} className="start-button">
          Start Game
        </button>
      </div>
    );
  }

  return (
    <div className="App">
      {gameOver && (
        <div className="game-over-modal">
          <div className="modal-content">
            <h2>Game Over!</h2>
            <p>Final Score: {score}</p>
            <button onClick={restartGame}>Restart</button>
            <button onClick={() => window.location.reload()}>Quit</button>
          </div>
        </div>
      )}

      <div className="top-panel">
        <div className="sun-display">Sun: {sun}</div>
        <div className="score-display">Score: {score}</div>
        <div className="selected-display">
          Selected: {selectedItem ? `${selectedItem} (${selectedType === 'plant' ? PLANTS[selectedItem].cost : POWERUPS[selectedItem].cost})` : 'None'}
        </div>
        <button onClick={restartGame} className="restart-button">Restart</button>
      </div>

      <div className="game-container">
        <div className="plant-panel">
          <h3>Plants</h3>
          {Object.entries(PLANTS).map(([emoji, data]) => (
            <button
              key={emoji}
              className={`plant-button ${selectedItem === emoji ? 'selected' : ''}`}
              onClick={() => {
                if (sun >= data.cost) {
                  setSelectedItem(emoji);
                  setSelectedType('plant');
                } else {
                  alert(`Not enough sun! Need ${data.cost}, have ${sun}`);
                }
              }}
            >
              <div>{emoji} {data.name}</div>
              <div className="cost">Cost: {data.cost}</div>
              <div className="small"> {data.sunGen} every {data.genInterval}s</div>
            </button>
          ))}
        </div>

        <div className="board">
          {grid.map((row, rowIndex) => (
            <div key={rowIndex} className="board-row">
              {row.map((cell, colIndex) => (
                <div
                  key={colIndex}
                  className="cell"
                  style={{ backgroundColor: getCellColor(colIndex) }}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                >
                  {cell && (
                    <div className="cell-content">
                      {cell.type === ENTITY_TYPES.ENEMY && (
                        <div className="health">{cell.health}</div>
                      )}
                      {cell.type === ENTITY_TYPES.POWERUP && (
                        <div className="health">{cell.remainingPower}</div>
                      )}
                      <div className="emoji">{cell.emoji}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>

        <div className="powerup-panel">
          <h3>Power-Ups</h3>
          {Object.entries(POWERUPS).map(([emoji, data]) => (
            <button
              key={emoji}
              className={`powerup-button ${selectedItem === emoji ? 'selected' : ''}`}
              onClick={() => {
                if (sun >= data.cost) {
                  setSelectedItem(emoji);
                  setSelectedType('powerup');
                } else {
                  alert(`Not enough sun! Need ${data.cost}, have ${sun}`);
                }
              }}
            >
              <div>{emoji} {data.name}</div>
              <div className="cost">Cost: {data.cost}</div>
              <div className="small"> {data.damage} dmg</div>
              <div className="small">{data.effect}</div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

export default App;