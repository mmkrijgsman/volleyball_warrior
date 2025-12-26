import React, { useState, useEffect } from 'react';
import { RotateCcw, Users, TrendingUp } from 'lucide-react';

// Storage Module
const Storage = {
  async save(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Save error:', e);
      return false;
    }
  },
  async load(key) {
    try {
      const value = localStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (e) {
      return null;
    }
  },
  async list(prefix) {
      try {
          const keys = [];
          for (let i = 0; i < localStorage.length; i++) {
              const key = localStorage.key(i);
              if (key && key.startsWith(prefix)) {
                  keys.push(key);
              }
          }
          return { keys };
      } catch (e) {
          console.error('List error:', e);
          return { keys: [] };
      }
  },
  async saveMatchHistory(matchData) {
    try {
      const matchId = `match_${matchData.startTime || Date.now()}`;
      localStorage.setItem(matchId, JSON.stringify(matchData));
      
      // Update match list
      const listResult = await this.list('match_');
      const matchList = listResult?.keys || [];
      localStorage.setItem('match_list', JSON.stringify(matchList));
      
      return matchId;
    } catch (e) {
      console.error('Save history error:', e);
      return null;
    }
  },
  async getMatchHistory() {
    try {
      const listResult = await this.list('match_');
      if (!listResult?.keys) return [];
      
      const matches = [];
      for (const key of listResult.keys) {
        if (key === 'match_list' || key === 'match') continue;
        try {
          const value = localStorage.getItem(key);
          if (value) {
            matches.push(JSON.parse(value));
          }
        } catch (e) {
          console.error(`Error loading ${key}:`, e);
        }
      }
      
      return matches.sort((a, b) => (b.startTime || 0) - (a.startTime || 0));
    } catch (e) {
      console.error('Get history error:', e);
      return [];
    }
  },
  async deleteMatch(matchId) {
    try {
      localStorage.removeItem(matchId);
      return true;
    } catch (e) {
      console.error('Delete error:', e);
      return false;
    }
  },
  async exportData() {
    try {
      const data = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.startsWith('match')) {
          data[key] = localStorage.getItem(key);
        }
      }
      const blob = new Blob([JSON.stringify(data)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `volleyball_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      return true;
    } catch (e) {
      console.error('Export error:', e);
      return false;
    }
  },
  async importData(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result);
          Object.keys(data).forEach(key => {
            if (key.startsWith('match')) {
              localStorage.setItem(key, data[key]);
            }
          });
          resolve(true);
        } catch (err) {
          console.error('Import error:', err);
          resolve(false);
        }
      };
      reader.readAsText(file);
    });
  }
};

// Match History Viewer Component
function MatchHistoryViewer({ onLoadMatch, onClose }) {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMatch, setSelectedMatch] = useState(null);
  const fileInputRef = React.useRef(null);

  useEffect(() => {
    loadHistory();
  }, []);

  const loadHistory = async () => {
    const history = await Storage.getMatchHistory();
    setMatches(history);
    setLoading(false);
  };

  const handleExport = async () => {
    await Storage.exportData();
  };

  const handleImport = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (window.confirm('Importing data will merge with existing matches. Continue?')) {
        Storage.importData(file).then(success => {
          if (success) {
            alert('Data imported successfully!');
            loadHistory();
          } else {
            alert('Failed to import data.');
          }
        });
      }
    }
    e.target.value = null; // Reset input
  };

  const deleteMatch = async (matchId) => {
    if (window.confirm('Deze wedstrijd verwijderen?')) {
      await Storage.deleteMatch(matchId);
      loadHistory();
    }
  };

  const viewMatchDetails = (match) => {
    setSelectedMatch(selectedMatch?.id === match.id ? null : match);
  };

  const loadMatch = (match) => {
    if (window.confirm('Deze wedstrijd laden? Huidige wedstrijd gaat verloren als niet opgeslagen.')) {
      onLoadMatch(match);
      onClose();
    }
  };

  if (loading) {
    return <div className="text-center py-4">Laden...</div>;
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-semibold text-gray-700">Wedstrijd Geschiedenis</h2>
        <div className="flex gap-2">
          <button onClick={handleExport} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">
            💾 Backup
          </button>
          <button onClick={() => fileInputRef.current?.click()} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">
            📂 Import
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleImport} 
            style={{ display: 'none' }} 
            accept=".json"
          />
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl font-bold">×</button>
        </div>
      </div>
      
      {matches.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          <div className="text-4xl mb-2">📋</div>
          <div>Nog geen wedstrijden opgeslagen</div>
        </div>
      ) : (
        <div className="space-y-2">
          {matches.map(match => {
            const date = new Date(match.startTime);
            const dateStr = date.toLocaleDateString('nl-NL', { day: '2-digit', month: '2-digit', year: 'numeric' });
            const timeStr = date.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' });
            const isExpanded = selectedMatch?.id === match.id;
            
            const setsWon = match.sets?.filter(s => {
              const wp = s.set === 5 ? 15 : 25;
              return s.us >= wp && s.us - s.them >= 2;
            }).length || 0;
            
            const setsLost = match.sets?.filter(s => {
              const wp = s.set === 5 ? 15 : 25;
              return s.them >= wp && s.them - s.us >= 2;
            }).length || 0;
            
            const matchResult = match.finalScore 
              ? `${match.finalScore.us}-${match.finalScore.them}`
              : `${setsWon}-${setsLost}`;
            
            const isWon = match.finalScore ? match.finalScore.us > match.finalScore.them : setsWon > setsLost;
            
            return (
              <div key={match.id} className={`bg-gray-50 rounded-lg border-2 overflow-hidden ${isWon ? 'border-green-300' : 'border-red-300'}`}>
                <div className="p-3">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="text-xs text-gray-500">{dateStr} om {timeStr}</div>
                      <div className={`text-lg font-bold ${isWon ? 'text-green-600' : 'text-red-600'}`}>
                        {isWon ? '✓ Gewonnen' : '✗ Verloren'} {matchResult}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => viewMatchDetails(match)}
                        className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 px-2 py-1 rounded"
                      >
                        {isExpanded ? '▲' : '▼'}
                      </button>
                      <button
                        onClick={() => loadMatch(match)}
                        className="text-xs bg-orange-100 hover:bg-orange-200 text-orange-700 px-2 py-1 rounded"
                      >
                        Laden
                      </button>
                      <button
                        onClick={() => deleteMatch(match.id)}
                        className="text-xs bg-red-100 hover:bg-red-200 text-red-700 px-2 py-1 rounded"
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  
                  <div className="flex gap-1 flex-wrap mb-2">
                    {match.sets?.map(s => {
                      const wp = s.set === 5 ? 15 : 25;
                      const won = s.us >= wp && s.us - s.them >= 2;
                      const lost = s.them >= wp && s.them - s.us >= 2;
                      return (
                        <div
                          key={s.set}
                          className={`px-2 py-1 rounded text-xs font-semibold ${
                            won ? 'bg-green-200 text-green-800' : lost ? 'bg-red-200 text-red-800' : 'bg-gray-200'
                          }`}
                        >
                          Set {s.set}: {s.us}-{s.them}
                        </div>
                      );
                    })}
                  </div>
                  
                  {isExpanded && (
                    <div className="mt-3 pt-3 border-t border-gray-300 space-y-2 text-xs">
                      <div>
                        <strong>Spelers ({match.allPlayers?.length || 0}):</strong>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {match.allPlayers?.map(p => (
                            <span key={p.id} className="bg-white px-2 py-0.5 rounded border">
                              #{p.number} {p.name}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <strong>Service hits:</strong> {match.serviceHits?.length || 0}
                      </div>
                      <div>
                        <strong>Punt hits:</strong> {match.ourPointHits?.length || 0}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Opponent Lineup Manager Component
function OpponentLineupManager({ opponentLineup, setOpponentLineup }) {
  const positions = [
    { id: 0, label: 'Pos 4 (Links Voor)', defaultRole: 'Diagonaal' },
    { id: 1, label: 'Pos 3 (Midden Voor)', defaultRole: 'Midden' },
    { id: 2, label: 'Pos 2 (Rechts Voor)', defaultRole: 'Passer/Loper' },
    { id: 3, label: 'Pos 5 (Links Achter)', defaultRole: 'Passer/Loper' },
    { id: 4, label: 'Pos 6 (Midden Achter)', defaultRole: 'Midden' },
    { id: 5, label: 'Pos 1 (Rechts Achter)', defaultRole: 'Spelverdeler' }
  ];

  const roles = ['Passer/Loper', 'Midden', 'Spelverdeler', 'Diagonaal', 'Libero'];

  const updatePosition = (idx, role) => {
    const newLineup = [...opponentLineup];
    newLineup[idx] = { pos: idx + 1, role };
    setOpponentLineup(newLineup);
  };

  const resetToDefault = () => {
    if (window.confirm('Tegenstander opstelling resetten naar standaard?')) {
      setOpponentLineup([
        { pos: 1, role: 'Diagonaal' },
        { pos: 2, role: 'Midden' },
        { pos: 3, role: 'Passer/Loper' },
        { pos: 4, role: 'Passer/Loper' },
        { pos: 5, role: 'Midden' },
        { pos: 6, role: 'Spelverdeler' }
      ]);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-sm font-semibold text-gray-700">Tegenstander Opstelling</h2>
        <button onClick={resetToDefault} className="text-xs bg-gray-200 hover:bg-gray-300 px-2 py-1 rounded">
          Reset
        </button>
      </div>
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-2 mb-2">
        <p className="text-xs text-blue-700">
          Pas de rollen aan als je weet wat de tegenstander speelt. Standaard: 5-1 opstelling.
        </p>
      </div>
      <div className="space-y-1.5">
        {positions.map((pos, idx) => (
          <div key={pos.id} className="bg-gray-50 p-1.5 rounded-lg">
            <div className="flex justify-between items-center mb-1">
              <div className="font-semibold text-gray-600 text-xs">{pos.label}</div>
              <div className="text-blue-600 font-bold text-sm">#{idx + 1}</div>
            </div>
            <select
              value={opponentLineup[idx]?.role || pos.defaultRole}
              onChange={(e) => updatePosition(idx, e.target.value)}
              className="w-full p-1.5 text-xs border-2 border-gray-300 rounded-lg font-semibold"
            >
              {roles.map(role => (
                <option key={role} value={role}>{role}</option>
              ))}
            </select>
          </div>
        ))}
      </div>
    </div>
  );
}

// Substitution Manager Component
function SubstitutionManager({ lineup, setLineup, players, libero }) {
  const [selectedBenchPlayer, setSelectedBenchPlayer] = useState(null);
  const [selectedCourtPosition, setSelectedCourtPosition] = useState(null);

  const positions = [
    { id: 0, label: 'Pos 4' },
    { id: 1, label: 'Pos 3' },
    { id: 2, label: 'Pos 2' },
    { id: 3, label: 'Pos 5' },
    { id: 4, label: 'Pos 6' },
    { id: 5, label: 'Pos 1' }
  ];

  const playersOnCourt = lineup.map(l => l.playerId).filter(id => id !== null);
  const playersOnBench = players.filter(p => !playersOnCourt.includes(p.id) && p.id !== libero);

  const makeSubstitution = () => {
    if (!selectedBenchPlayer || selectedCourtPosition === null) {
      alert('Selecteer eerst een speler van de bank EN een positie op het veld');
      return;
    }

    const newLineup = [...lineup];
    const currentRole = newLineup[selectedCourtPosition].role;
    const currentPlayerId = newLineup[selectedCourtPosition].playerId;
    
    // Swap
    newLineup[selectedCourtPosition] = {
      playerId: selectedBenchPlayer,
      role: currentRole,
      originalPlayerId: selectedBenchPlayer
    };

    setLineup(newLineup);
    setSelectedBenchPlayer(null);
    setSelectedCourtPosition(null);
    
    const benchPlayer = players.find(p => p.id === selectedBenchPlayer);
    const courtPlayer = players.find(p => p.id === currentPlayerId);
    alert(`Wissel: ${benchPlayer?.name} IN ↔ ${courtPlayer?.name} UIT`);
  };

  return (
    <div className="h-full overflow-y-auto">
      <h2 className="text-sm font-semibold text-gray-700 mb-2">Wisselspelers</h2>
      
      <div className="bg-orange-50 border-2 border-orange-300 rounded-lg p-2 mb-2">
        <p className="text-xs text-orange-700 mb-2">
          <strong>Wissel maken:</strong> 1) Selecteer speler van bank, 2) Selecteer positie op veld, 3) Druk op "Wissel!"
        </p>
      </div>

      {/* Bench Players */}
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-gray-600 mb-1">Bank</h3>
        <div className="space-y-1">
          {playersOnBench.length === 0 ? (
            <div className="text-center py-2 text-gray-400 text-xs">Alle spelers op het veld</div>
          ) : (
            playersOnBench.map(p => (
              <button
                key={p.id}
                onClick={() => setSelectedBenchPlayer(selectedBenchPlayer === p.id ? null : p.id)}
                className={`w-full p-2 rounded-lg border-2 transition flex items-center gap-2 ${
                  selectedBenchPlayer === p.id
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <div className="w-7 h-7 bg-gray-600 rounded flex items-center justify-center text-white font-bold text-xs">
                  {p.number}
                </div>
                <span className="font-semibold text-sm">{p.name}</span>
                {selectedBenchPlayer === p.id && (
                  <span className="ml-auto text-green-600 text-xs font-bold">✓ Geselecteerd</span>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Court Positions */}
      <div className="mb-3">
        <h3 className="text-xs font-semibold text-gray-600 mb-1">Spelers op het veld</h3>
        <div className="space-y-1">
          {positions.map((pos, idx) => {
            const player = players.find(p => p.id === lineup[idx].playerId);
            const role = lineup[idx].role;
            
            return (
              <button
                key={pos.id}
                onClick={() => setSelectedCourtPosition(selectedCourtPosition === idx ? null : idx)}
                disabled={!player}
                className={`w-full p-2 rounded-lg border-2 transition flex items-center gap-2 ${
                  selectedCourtPosition === idx
                    ? 'border-red-500 bg-red-50'
                    : player
                    ? 'border-gray-200 bg-white hover:border-gray-300'
                    : 'border-gray-200 bg-gray-100 opacity-50 cursor-not-allowed'
                }`}
              >
                <div className={`w-7 h-7 rounded flex items-center justify-center text-white font-bold text-xs ${
                  role === 'Libero' ? 'bg-blue-600' : 'bg-red-600'
                }`}>
                  {player ? player.number : '?'}
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-sm">{player ? player.name : 'Leeg'}</div>
                  <div className="text-xs text-gray-500">{pos.label} • {role || '?'}</div>
                </div>
                {selectedCourtPosition === idx && (
                  <span className="text-red-600 text-xs font-bold">✓ Eruit</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Substitution Button */}
      <button
        onClick={makeSubstitution}
        disabled={!selectedBenchPlayer || selectedCourtPosition === null}
        className="w-full bg-green-500 text-white py-3 rounded-lg font-bold hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {selectedBenchPlayer && selectedCourtPosition !== null
          ? '↔ Wissel maken!'
          : 'Selecteer speler en positie'}
      </button>
    </div>
  );
}

// Player Manager Component
function PlayerManager({ players, onChange }) {
  const [name, setName] = useState('');
  const [number, setNumber] = useState('');

  const add = () => {
    if (name.trim() && number.trim()) {
      onChange([...players, { id: Date.now(), name: name.trim(), number: number.trim() }]);
      setName('');
      setNumber('');
    }
  };

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-sm font-semibold mb-2 shrink-0">Spelers</h2>
      <div className="bg-gray-50 p-2 rounded-lg mb-2 shrink-0">
        <div className="flex gap-1">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Naam"
            className="flex-1 p-1.5 text-sm border-2 rounded-lg"
            onKeyPress={(e) => e.key === 'Enter' && add()}
          />
          <input
            type="text"
            value={number}
            onChange={(e) => setNumber(e.target.value)}
            placeholder="Nr"
            className="w-14 p-1.5 text-sm border-2 rounded-lg text-center"
            maxLength={3}
            onKeyPress={(e) => e.key === 'Enter' && add()}
          />
          <button onClick={add} className="bg-green-500 text-white px-3 rounded-lg">+</button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1">
        {players.length === 0 ? (
          <div className="text-center py-4 text-gray-400 text-sm">Voeg spelers toe</div>
        ) : (
          players.map(p => (
            <div key={p.id} className="bg-white border p-2 rounded-lg flex justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-red-600 rounded flex items-center justify-center text-white font-bold text-sm">
                  {p.number}
                </div>
                <span className="font-semibold text-sm">{p.name}</span>
              </div>
              <button
                onClick={() => onChange(players.filter(x => x.id !== p.id))}
                className="text-red-500 hover:bg-red-50 p-1 rounded"
              >
                ×
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// Lineup Manager Component
function LineupManager({ lineup, setLineup, players, libero, setLibero, set }) {
  const roles = ['Passer/Loper', 'Midden', 'Spelverdeler', 'Diagonaal'];
  const positions = [
    { id: 0, label: 'Pos 4' },
    { id: 1, label: 'Pos 3' },
    { id: 2, label: 'Pos 2' },
    { id: 3, label: 'Pos 5' },
    { id: 4, label: 'Pos 6' },
    { id: 5, label: 'Pos 1' }
  ];

  const assign = (idx, playerId, role) => {
    if (!role && playerId) {
      const autoRoles = ['Diagonaal', 'Midden', 'Passer/Loper', 'Passer/Loper', 'Midden', 'Spelverdeler'];
      role = autoRoles[idx];
    }
    const newLineup = [...lineup];
    newLineup[idx] = { playerId, role, originalPlayerId: playerId };
    setLineup(newLineup);
  };

  if (players.length === 0) {
    return <div className="text-center py-4 text-gray-400 text-sm">Voeg eerst spelers toe</div>;
  }

  return (
    <div className="h-full flex flex-col">
      <h2 className="text-sm font-semibold mb-2 shrink-0">Opstelling Set {set}</h2>
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-2 mb-2 shrink-0">
        <div className="font-semibold text-blue-700 text-xs mb-1">Libero</div>
        <select
          value={libero || ''}
          onChange={(e) => setLibero(e.target.value ? parseInt(e.target.value) : null)}
          className="w-full p-1.5 text-sm border-2 border-blue-300 rounded-lg"
        >
          <option value="">-- Geen Libero --</option>
          {players.map(p => (
            <option key={p.id} value={p.id}>#{p.number} - {p.name}</option>
          ))}
        </select>
      </div>
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {positions.map((pos, idx) => {
          const available = players.filter(p => {
            if (p.id === libero) return false;
            if (p.id === lineup[idx].playerId) return true;
            return !lineup.some((a, i) => i !== idx && a.playerId === p.id);
          });

          return (
            <div key={pos.id} className="bg-gray-50 p-1.5 rounded-lg">
              <div className="font-semibold text-gray-600 text-xs mb-1">{pos.label}</div>
              <div className="grid grid-cols-2 gap-1">
                <select
                  value={lineup[idx].playerId || ''}
                  onChange={(e) => assign(idx, e.target.value ? parseInt(e.target.value) : null, lineup[idx].role)}
                  className="p-1.5 text-xs border-2 rounded-lg"
                >
                  <option value="">-- Speler --</option>
                  {available.map(p => (
                    <option key={p.id} value={p.id}>#{p.number} {p.name}</option>
                  ))}
                </select>
                <select
                  value={lineup[idx].role || ''}
                  onChange={(e) => assign(idx, lineup[idx].playerId, e.target.value || null)}
                  className="p-1.5 text-xs border-2 rounded-lg"
                >
                  <option value="">-- Rol --</option>
                  {roles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Game Tracker Component
function GameTracker({ sets, setSets, currentSet, serviceHits, setServiceHits, ourPointHits, setOurPointHits, lineup, setLineup, libero, onNextSet, players, opponentLineup, onNewMatch, matchFinished }) {
  const [overlaySet, setOverlaySet] = useState(null);
  const [showFireworks, setShowFireworks] = useState(false);
  const [setWinner, setSetWinner] = useState(null);
  
  const current = sets.find(s => s.set === currentSet);
  const winPts = currentSet === 5 ? 15 : 25;
  const won = (current.us >= winPts && current.us - current.them >= 2) || (current.them >= winPts && current.them - current.us >= 2);

  const updateScore = (team, delta) => {
    if (won) return;
    const shouldRotate = team === 'us' && current.lastScorer === 'them';
    const newUs = team === 'us' ? current.us + delta : current.us;
    const newThem = team === 'them' ? current.them + delta : current.them;
    setSets(sets.map(s => s.set === currentSet ? {...s, us: Math.max(0, newUs), them: Math.max(0, newThem), lastScorer: team} : s));
    
    // Check for set win
    if (newUs >= winPts && newUs - newThem >= 2) {
      setSetWinner('us');
      setShowFireworks(true);
      setTimeout(() => { setShowFireworks(false); setSetWinner(null); }, 4000);
    } else if (newThem >= winPts && newThem - newUs >= 2) {
      setSetWinner('them');
      setTimeout(() => setSetWinner(null), 3000);
    }
    
    if (shouldRotate && delta > 0) {
      setTimeout(() => {
        const nl = [...lineup];
        const temp = nl[5];
        [nl[5], nl[2], nl[1], nl[0], nl[3], nl[4]] = [nl[2], nl[1], nl[0], nl[3], nl[4], temp];
        if (nl[4].role === 'Midden' && libero) {
          nl[4] = { playerId: libero, role: 'Libero', originalPlayerId: nl[4].playerId };
        }
        if (nl[0].role === 'Libero' && nl[0].originalPlayerId) {
          nl[0] = { playerId: nl[0].originalPlayerId, role: 'Midden', originalPlayerId: null };
        }
        setLineup(nl);
      }, 100);
    }
  };

  const addTimeout = () => {
    const score = `${current.us}-${current.them}`;
    setSets(sets.map(s => s.set === currentSet && s.timeouts.length < 2 ? {...s, timeouts: [...s.timeouts, score]} : s));
  };

  const courtClick = (e, isOurs) => {
    if (won) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    
    if (isOurs && y < 96) {
      setOurPointHits([...ourPointHits, { x, y, set: currentSet }]);
      updateScore('us', 1);
    } else if (!isOurs && y > 4) {
      setServiceHits([...serviceHits, { x, y, set: currentSet }]);
      updateScore('them', 1);
    }
  };

  const getHeatmapIntensity = (x, y, hits) => {
    if (hits.length === 0) return 0;
    const nearby = hits.filter(hit => Math.sqrt(Math.pow(hit.x - x, 2) + Math.pow(hit.y - y, 2)) < 15);
    return Math.min(nearby.length / 3, 1);
  };

  const courtPositions = [
    { id: 0, x: 15, y: 35, label: 'Pos 4' },
    { id: 1, x: 50, y: 35, label: 'Pos 3' },
    { id: 2, x: 85, y: 35, label: 'Pos 2' },
    { id: 3, x: 15, y: 65, label: 'Pos 5' },
    { id: 4, x: 50, y: 65, label: 'Pos 6' },
    { id: 5, x: 85, y: 65, label: 'Pos 1' }
  ];

  const Court = ({ title, isOurs, hits }) => {
    const currentHits = hits.filter(h => h.set === currentSet);
    const overlayHits = overlaySet ? hits.filter(h => h.set === overlaySet) : [];
    const color = isOurs ? '#3B82F6' : '#EF4444';
    const overlayColor = isOurs ? '#10B981' : '#F59E0B';
    
    // Tegenstander standaard opstelling: 1=Setter, 2=Outside, 3=Middle, 4=Opposite, 5=Outside, 6=Middle
    const opponentLineupMap = [
      { pos: 4, role: 'Diag' },    // Pos 4
      { pos: 3, role: 'Midd' },    // Pos 3
      { pos: 2, role: 'Pass' },    // Pos 2
      { pos: 5, role: 'Pass' },    // Pos 5
      { pos: 6, role: 'Midd' },    // Pos 6
      { pos: 1, role: 'Sett' }     // Pos 1
    ];
    
    return (
      <div className="bg-white rounded-xl shadow-lg p-1.5">
        <h2 className="text-xs font-bold text-center mb-1">{title}</h2>
        <div 
          className="relative bg-blue-700 rounded-lg cursor-crosshair overflow-hidden" 
          style={{ width: '100%', paddingBottom: '122%' }}
          onClick={(e) => courtClick(e, isOurs)}
        >
          <div className="absolute inset-0">
            <div className="absolute bg-orange-400" style={isOurs ? { inset: '2% 2% auto 2%', height: '96%' } : { inset: 'auto 2% 2% 2%', height: '96%' }} />
            <div className="absolute border-4 border-white" style={isOurs ? { top: '2%', left: '2%', right: '2%', height: '96%', borderBottom: 'none' } : { bottom: '2%', left: '2%', right: '2%', height: '96%', borderTop: 'none' }} />
            <div className="absolute left-0 right-0 h-1 bg-white z-10" style={isOurs ? { bottom: '4%' } : { top: '4%' }} />
            
            {/* 3-meter lijn */}
            <div className="absolute left-0 right-0 h-0.5 bg-white" style={isOurs ? { bottom: '28%', marginLeft: '2%', marginRight: '2%' } : { top: '28%', marginLeft: '2%', marginRight: '2%' }} />
            
            {/* Net */}
            <div className="absolute left-0 right-0 flex justify-center z-10" style={isOurs ? { bottom: '4%', transform: 'translateY(50%)' } : { top: '4%', transform: 'translateY(-50%)' }}>
              <div className="w-full h-16 border-l-2 border-r-2 border-white opacity-60" style={{ background: 'repeating-linear-gradient(0deg, transparent, transparent 4px, white 4px, white 5px)' }} />
            </div>
            
            {/* Overlay Heatmap */}
            {overlaySet && (
              <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 pointer-events-none">
                {Array.from({length: 100}).map((_, i) => {
                  const x = (i % 10) * 10 + 5;
                  const y = Math.floor(i / 10) * 10 + 5;
                  const intensity = getHeatmapIntensity(x, y, overlayHits);
                  return (isOurs ? y < 96 : y > 4) && intensity > 0 ? (
                    <div key={i} className="rounded-full opacity-40" style={{ backgroundColor: `rgba(${isOurs ? '16, 185, 129' : '245, 158, 11'}, ${intensity * 0.6})`, gridColumn: (i % 10) + 1, gridRow: Math.floor(i / 10) + 1 }} />
                  ) : null;
                })}
              </div>
            )}
            
            {/* Current Heatmap */}
            <div className="absolute inset-0 grid grid-cols-10 grid-rows-10 pointer-events-none">
              {Array.from({length: 100}).map((_, i) => {
                const x = (i % 10) * 10 + 5;
                const y = Math.floor(i / 10) * 10 + 5;
                const intensity = getHeatmapIntensity(x, y, currentHits);
                return (isOurs ? y < 96 : y > 4) && intensity > 0 ? (
                  <div key={i} className="rounded-full" style={{ backgroundColor: `rgba(${isOurs ? '59, 130, 246' : '239, 68, 68'}, ${intensity * 0.6})`, gridColumn: (i % 10) + 1, gridRow: Math.floor(i / 10) + 1 }} />
                ) : null;
              })}
            </div>
            
            {/* Overlay hits */}
            {overlaySet && overlayHits.map((hit, i) => (
              <div key={`overlay-${i}`} className="absolute transform -translate-x-1/2 -translate-y-1/2 z-15 opacity-50" style={{ left: `${hit.x}%`, top: `${hit.y}%` }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 drop-shadow-lg">
                  <circle cx="12" cy="12" r="10" fill={overlayColor} stroke="#000" strokeWidth="1.5"/>
                  <path d="M 2 12 Q 12 8 22 12 M 2 12 Q 12 16 22 12 M 12 2 Q 8 12 12 22 M 12 2 Q 16 12 12 22" fill="none" stroke="#000" strokeWidth="1"/>
                </svg>
              </div>
            ))}
            
            {/* Current hits */}
            {currentHits.map((hit, i) => (
              <div key={i} className="absolute transform -translate-x-1/2 -translate-y-1/2 z-20" style={{ left: `${hit.x}%`, top: `${hit.y}%` }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 drop-shadow-lg">
                  <circle cx="12" cy="12" r="10" fill={color} stroke="#000" strokeWidth="1.5"/>
                  <path d="M 2 12 Q 12 8 22 12 M 2 12 Q 12 16 22 12 M 12 2 Q 8 12 12 22 M 12 2 Q 16 12 12 22" fill="none" stroke="#000" strokeWidth="1"/>
                </svg>
              </div>
            ))}
            
            {/* Spelers op het veld */}
            {courtPositions.map((pos, idx) => {
              let displayNumber, displayName, playerColor;
              
              if (!isOurs) {
                // Ons team - gebruik echte spelers (op het rode veld = Hun Services)
                const playerId = lineup[idx].playerId;
                const player = players.find(p => p.id === playerId);
                const role = lineup[idx].role;
                displayNumber = player ? player.number : '?';
                displayName = player ? player.name.substring(0, 4) : '?';
                playerColor = player ? (role === 'Libero' ? '#1E40AF' : '#DC2626') : '#D1D5DB';
              } else {
                // Tegenstander - standaard opstelling (op het blauwe veld = Onze Punten)
                // opponentLineup from props, mapped to courtPositions?
                // The original code used a hardcoded opponentLineupMap in the Court component.
                // But there is also an opponentLineup prop passed to GameTracker.
                // Let's use the prop if available, or fallback.
                // The opponentLineup prop is an array of 6 objects with {pos, role}.
                
                // Note: The opponentLineup prop has indices 0-5 corresponding to positions.
                // Let's map it.
                const oppPlayer = opponentLineup[idx]; 
                
                displayNumber = oppPlayer ? oppPlayer.pos : opponentLineupMap[idx].pos;
                displayName = oppPlayer ? oppPlayer.role.substring(0, 4) : opponentLineupMap[idx].role;
                playerColor = '#3B82F6'; // Blauw voor tegenstander
              }
              
              const adjustedY = isOurs ? (95 - ((pos.y - 20) * 1.3)) : (15 + ((pos.y - 20) * 1.3));
              
              return (
                <div key={pos.id} className="absolute transform -translate-x-1/2 -translate-y-1/2 z-30" style={{ left: `${pos.x}%`, top: `${adjustedY}%` }}>
                  <div className="relative">
                    <div className="relative w-9 h-9 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-lg">
                        <path d="M 20 30 L 20 90 L 80 90 L 80 30 L 70 25 L 65 35 L 35 35 L 30 25 Z M 35 35 Q 50 40 65 35 M 20 30 L 10 40 L 15 50 L 20 45 M 80 30 L 90 40 L 85 50 L 80 45" fill={playerColor} stroke="#000" strokeWidth="2"/>
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-sm font-bold text-black" style={{ textShadow: '1px 1px 0 #fff, -1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff', marginTop: '3px' }}>
                          {displayNumber}
                        </span>
                      </div>
                    </div>
                    <div className="absolute top-full mt-0.5 w-12 text-center">
                      <div className="text-xs font-semibold text-gray-700 bg-white rounded px-0.5 py-0.5 shadow-sm leading-tight" style={{ fontSize: '10px' }}>
                        {displayName}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      {showFireworks && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-4xl sm:text-6xl font-bold text-yellow-400 animate-bounce" style={{ textShadow: '0 0 20px rgba(255,215,0,0.8)' }}>
              🎉 SET GEWONNEN! 🎉
            </div>
          </div>
          {[...Array(20)].map((_, i) => (
            <div key={i} className="absolute animate-ping" style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%`, animationDelay: `${Math.random() * 2}s` }}>
              <div className="text-2xl">{['🎆', '🎇', '✨'][Math.floor(Math.random() * 3)]}</div>
            </div>
          ))}
        </div>
      )}

      {setWinner === 'them' && (
        <div className="fixed top-16 left-1/2 transform -translate-x-1/2 z-50 bg-red-500 text-white px-4 py-2 rounded-xl shadow-2xl text-lg font-bold animate-bounce">
          Set verloren 😢
        </div>
      )}
      
      <div className="h-full overflow-y-auto">
        <div className="grid grid-cols-3 gap-2 mb-2">
          <button onClick={() => updateScore('us', 1)} disabled={won} className="bg-blue-50 hover:bg-blue-100 p-3 rounded-lg disabled:opacity-50">
            <div className="text-4xl font-bold text-blue-600 text-center">{current.us}</div>
            <div className="text-xs text-center">Wij</div>
          </button>
          <div className="bg-orange-50 p-2 rounded-lg text-center">
            <div className="text-xl font-bold text-orange-600">Set {currentSet}</div>
            <div className="text-xs text-gray-500 mb-1">
              {currentSet === 5 ? (current.us >= 13 || current.them >= 13 ? '±2pt' : '→15') : (current.us >= 24 || current.them >= 24 ? '±2pt' : '→25')}
            </div>
            <div className="flex gap-1 justify-center flex-wrap">
              {sets.map(s => {
                const isOverlayActive = overlaySet === s.set;
                const isCurrent = s.set === currentSet;
                return (
                  <button
                    key={s.set}
                    onClick={() => setOverlaySet(isOverlayActive ? null : s.set)}
                    disabled={isCurrent}
                    className={`px-1.5 py-0.5 rounded text-xs transition ${
                      isCurrent
                        ? 'bg-orange-600 text-white cursor-default'
                        : isOverlayActive
                        ? 'bg-green-500 text-white ring-2 ring-green-300'
                        : 'bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {s.set}:{s.us}-{s.them}
                  </button>
                );
              })}
            </div>
          </div>
          <button onClick={() => updateScore('them', 1)} disabled={won} className="bg-red-50 hover:bg-red-100 p-3 rounded-lg disabled:opacity-50">
            <div className="text-4xl font-bold text-red-600 text-center">{current.them}</div>
            <div className="text-xs text-center">Zij</div>
          </button>
        </div>
        <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-2 mb-2">
          <div className="flex items-center justify-between">
            <button onClick={addTimeout} disabled={current.timeouts.length >= 2} className="bg-yellow-500 text-white px-4 py-1.5 rounded text-xs font-semibold hover:bg-yellow-600 disabled:opacity-50">
              ⏱️ Timeout
            </button>
            <div className="flex gap-3 text-xs font-semibold">
              <div className={current.timeouts[0] ? 'text-yellow-700' : 'text-gray-400'}>TO1: {current.timeouts[0] || '---'}</div>
              <div className={current.timeouts[1] ? 'text-yellow-700' : 'text-gray-400'}>TO2: {current.timeouts[1] || '---'}</div>
            </div>
          </div>
        </div>
        {current.lastScorer && (
          <div className="bg-blue-50 border border-blue-300 rounded-lg p-1.5 mb-2 text-center text-xs">
            {current.lastScorer === 'us' ? '🔵 Wij service' : '🔴 Zij service - Bij punt: doordraaien'}
          </div>
        )}
        
        <div className="grid grid-cols-2 gap-2 mb-2">
          {!matchFinished ? (
            <button onClick={onNextSet} className="col-span-2 bg-green-500 text-white py-2 rounded-lg text-sm font-semibold hover:bg-green-600">
              Volgende Set →
            </button>
          ) : (
            <button onClick={onNewMatch} className="col-span-2 bg-purple-500 text-white py-3 rounded-lg text-sm font-semibold hover:bg-purple-600 flex items-center justify-center gap-2">
              <span className="text-xl">🆕</span> Nieuwe Wedstrijd Starten
            </button>
          )}
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <Court title="Hun Services" isOurs={false} hits={serviceHits} />
          <Court title="Onze Punten" isOurs={true} hits={ourPointHits} />
        </div>
        {overlaySet && (
          <div className="bg-green-50 border-2 border-green-300 rounded-lg p-2 text-xs text-center mt-2">
            <strong>Overlay actief:</strong> Set {overlaySet} heatmap (groen/oranje) over huidige set. Klik nogmaals om uit te zetten.
          </div>
        )}
      </div>
    </div>
  );
}

// Stats Component
function Stats({ players, stats }) {
  if (players.length === 0) return <div className="text-center py-4 text-gray-400 text-sm">Voeg spelers toe</div>;
  const maxSets = Math.max(...Object.values(stats), 1);

  return (
    <div className="h-full overflow-y-auto">
      <h2 className="text-sm font-semibold mb-2">Speeltijd per speler</h2>
      <div className="space-y-1.5">
        {players.sort((a, b) => (stats[b.id] || 0) - (stats[a.id] || 0)).map(p => {
          const played = stats[p.id] || 0;
          return (
            <div key={p.id} className="bg-gray-50 p-2 rounded-lg">
              <div className="flex justify-between items-center mb-1">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 bg-red-600 rounded flex items-center justify-center text-white font-bold text-xs">{p.number}</div>
                  <span className="font-semibold text-sm">{p.name}</span>
                </div>
                <span className="text-xl font-bold text-orange-600">{played}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-1.5">
                <div className="bg-orange-500 h-1.5 rounded-full transition-all" style={{ width: `${Math.max(5, (played / maxSets) * 100)}%` }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Main App
export default function VolleyballTracker() {
  const [tab, setTab] = useState('players');
  const [currentSet, setCurrentSet] = useState(1);
  const [sets, setSets] = useState([{ set: 1, us: 0, them: 0, timeouts: [], lastScorer: null }]);
  const [serviceHits, setServiceHits] = useState([]);
  const [ourPointHits, setOurPointHits] = useState([]);
  const [lineup, setLineup] = useState(Array(6).fill({ playerId: null, role: null, originalPlayerId: null }));
  const [players, setPlayers] = useState([]);
  const [stats, setStats] = useState({});
  const [libero, setLibero] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startTime, setStartTime] = useState(null);
  const [matchId, setMatchId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [opponentLineup, setOpponentLineup] = useState([
    { pos: 1, role: 'Diagonaal' },
    { pos: 2, role: 'Midden' },
    { pos: 3, role: 'Passer/Loper' },
    { pos: 4, role: 'Passer/Loper' },
    { pos: 5, role: 'Midden' },
    { pos: 6, role: 'Spelverdeler' }
  ]);

  useEffect(() => {
    Storage.load('match').then(data => {
      if (data) {
        setCurrentSet(data.currentSet || 1);
        setSets(data.sets || [{ set: 1, us: 0, them: 0, timeouts: [], lastScorer: null }]);
        setServiceHits(data.serviceHits || []);
        setOurPointHits(data.ourPointHits || []);
        setLineup(data.lineup || Array(6).fill({ playerId: null, role: null, originalPlayerId: null }));
        setPlayers(data.players || []);
        setStats(data.stats || {});
        setLibero(data.libero || null);
        setStartTime(data.startTime || Date.now());
        setMatchId(data.matchId || `match_${Date.now()}`);
        setOpponentLineup(data.opponentLineup || [
          { pos: 1, role: 'Diagonaal' },
          { pos: 2, role: 'Midden' },
          { pos: 3, role: 'Passer/Loper' },
          { pos: 4, role: 'Passer/Loper' },
          { pos: 5, role: 'Midden' },
          { pos: 6, role: 'Spelverdeler' }
        ]);
      } else {
        // New match - set start time
        const now = Date.now();
        setStartTime(now);
        setMatchId(`match_${now}`);
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    if (!loading) {
      Storage.save('match', { 
        currentSet, 
        sets, 
        serviceHits, 
        ourPointHits, 
        lineup, 
        players, 
        stats, 
        libero, 
        opponentLineup,
        startTime,
        matchId
      });
    }
  }, [currentSet, sets, serviceHits, ourPointHits, lineup, players, stats, libero, opponentLineup, loading, startTime, matchId]);

  const handlePlayersChange = (newPlayers) => {
    setPlayers(newPlayers);
    const newStats = {...stats};
    newPlayers.forEach(p => { if (!(p.id in newStats)) newStats[p.id] = 0; });
    Object.keys(newStats).forEach(id => { if (!newPlayers.find(p => p.id === parseInt(id))) delete newStats[id]; });
    setStats(newStats);
    setLineup(lineup.map(pos => pos.playerId && !newPlayers.find(p => p.id === pos.playerId) ? { playerId: null, role: null, originalPlayerId: null } : pos));
    if (libero && !newPlayers.find(p => p.id === libero)) setLibero(null);
  };

  const nextSet = () => {
    const newStats = {...stats};
    lineup.filter(p => p.playerId).forEach(pos => { if (pos.playerId) newStats[pos.playerId] = (newStats[pos.playerId] || 0) + 1; });
    setStats(newStats);

    const won = (s) => {
      const wp = s.set === 5 ? 15 : 25;
      return s.us >= wp && s.us - s.them >= 2;
    };
    const lost = (s) => {
      const wp = s.set === 5 ? 15 : 25;
      return s.them >= wp && s.them - s.us >= 2;
    };
    const wUs = sets.filter(won).length;
    const wThem = sets.filter(lost).length;
    const setsPlayed = wUs + wThem; // Effectively currentSet since we only click next when set is done

    // Logic: Always play 4 sets. If 2-2 after 4 sets, play 5th.
    // Finish if:
    // 1. 5 sets played
    // 2. 4 sets played AND score is NOT 2-2 (meaning 4-0, 0-4, 3-1, 1-3)
    
    const isFinished = setsPlayed === 5 || (setsPlayed === 4 && wUs !== 2);

    if (isFinished) {
      const message = wUs > wThem 
        ? `🎉 WEDSTRIJD GEWONNEN! 🎉

Jullie hebben gewonnen met ${wUs}-${wThem}`
        : `Wedstrijd verloren 😢

Eindstand: ${wUs}-${wThem}`;
      
      alert(message);
      
      // Save match to history
      const matchData = {
        id: matchId,
        startTime,
        endTime: Date.now(),
        currentSet,
        sets,
        serviceHits,
        ourPointHits,
        lineup,
        allPlayers: players,
        playerStats: newStats,
        liberoPlayer: libero,
        opponentLineup,
        finalScore: { us: wUs, them: wThem },
        isComplete: true
      };
      
      Storage.saveMatchHistory(matchData).then(() => {
        alert('✓ Wedstrijd opgeslagen in geschiedenis!');
      });
      
      return; // Don't proceed to next set
    }
    
    // Logic: If we are here, we go to next set (4th or 5th)
    const newSetNum = currentSet + 1;
    setCurrentSet(newSetNum);
    setSets([...sets, { set: newSetNum, us: 0, them: 0, timeouts: [], lastScorer: null }]);
  };

  const startNewMatch = () => {
    if (window.confirm('Nieuwe wedstrijd starten?')) {
      // Reset everything
      const now = Date.now();
      setStartTime(now);
      setMatchId(`match_${now}`);
      setCurrentSet(1);
      setSets([{ set: 1, us: 0, them: 0, timeouts: [], lastScorer: null }]);
      setServiceHits([]);
      setOurPointHits([]);
      setLineup(Array(6).fill({ playerId: null, role: null, originalPlayerId: null }));
      setLibero(null);
      const rs = {};
      players.forEach(p => rs[p.id] = 0);
      setStats(rs);
      setTab('lineup'); // Go to lineup to set up new match
    }
  };

  const isMatchFinished = () => {
    const won = (s) => {
      const wp = s.set === 5 ? 15 : 25;
      return s.us >= wp && s.us - s.them >= 2;
    };
    const lost = (s) => {
      const wp = s.set === 5 ? 15 : 25;
      return s.them >= wp && s.them - s.us >= 2;
    };
    const wUs = sets.filter(won).length;
    const wThem = sets.filter(lost).length;
    const setsPlayed = wUs + wThem;
    
    // Match is finished if:
    // 1. 5 sets played (result 3-2 or 2-3)
    // 2. 4 sets played AND not a tie (result 4-0, 0-4, 3-1, 1-3)
    // Note: If 3 sets played (3-0 or 0-3), match is NOT finished (must play 4th)
    return setsPlayed === 5 || (setsPlayed === 4 && wUs !== 2);
  };

  const reset = () => {
    if (window.confirm('Nieuwe wedstrijd starten? Huidige wedstrijd opslaan in geschiedenis?')) {
      // Save current match to history
      const wUs = sets.filter(s => {
        const wp = s.set === 5 ? 15 : 25;
        return s.us >= wp && s.us - s.them >= 2;
      }).length;
      
      const wThem = sets.filter(s => {
        const wp = s.set === 5 ? 15 : 25;
        return s.them >= wp && s.them - s.us >= 2;
      }).length;
      
      const matchData = {
        id: matchId,
        startTime,
        endTime: Date.now(),
        currentSet,
        sets,
        serviceHits,
        ourPointHits,
        lineup,
        allPlayers: players,
        playerStats: stats,
        liberoPlayer: libero,
        opponentLineup,
        finalScore: { us: wUs, them: wThem },
        isComplete: false
      };
      
      Storage.saveMatchHistory(matchData);
      
      // Reset everything
      const now = Date.now();
      setStartTime(now);
      setMatchId(`match_${now}`);
      setCurrentSet(1);
      setSets([{ set: 1, us: 0, them: 0, timeouts: [], lastScorer: null }]);
      setServiceHits([]);
      setOurPointHits([]);
      setLineup(Array(6).fill({ playerId: null, role: null, originalPlayerId: null }));
      setLibero(null);
      const rs = {};
      players.forEach(p => rs[p.id] = 0);
      setStats(rs);
    }
  };

  const loadMatchFromHistory = (match) => {
    setCurrentSet(match.currentSet);
    setSets(match.sets);
    setServiceHits(match.serviceHits || []);
    setOurPointHits(match.ourPointHits || []);
    setLineup(match.lineup);
    setPlayers(match.allPlayers || []);
    setStats(match.playerStats || {});
    setLibero(match.liberoPlayer || null);
    setOpponentLineup(match.opponentLineup || [
      { pos: 1, role: 'Diagonaal' },
      { pos: 2, role: 'Midden' },
      { pos: 3, role: 'Passer/Loper' },
      { pos: 4, role: 'Passer/Loper' },
      { pos: 5, role: 'Midden' },
      { pos: 6, role: 'Spelverdeler' }
    ]);
    setStartTime(match.startTime);
    setMatchId(match.id);
  };

  if (loading) return <div className="h-screen bg-gradient-to-br from-orange-50 to-orange-100 flex items-center justify-center"><div className="text-xl">Laden...</div></div>;

  if (showHistory) {
    return (
      <div className="h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-2 flex flex-col overflow-hidden">
        <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
          <div className="bg-white rounded-xl shadow-lg p-2 mb-2 flex-shrink-0">
            <div className="flex justify-between items-center">
              <h1 className="text-lg sm:text-2xl font-bold text-orange-600">🏐 Wedstrijd Geschiedenis</h1>
              <button onClick={() => setShowHistory(false)} className="p-1.5 bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200">
                Terug
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-2 flex-1 overflow-hidden">
            <MatchHistoryViewer onLoadMatch={loadMatchFromHistory} onClose={() => setShowHistory(false)} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-br from-orange-50 to-orange-100 p-2 flex flex-col overflow-hidden">
      <div className="max-w-7xl mx-auto w-full flex flex-col h-full">
        <div className="bg-white rounded-xl shadow-lg p-2 mb-2 flex-shrink-0">
          <div className="flex justify-between items-center mb-2">
            <h1 className="text-lg sm:text-2xl font-bold text-orange-600">🏐 Volleybal</h1>
            <div className="flex gap-1">
              <button onClick={() => setShowHistory(true)} className="p-1.5 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 text-xs font-semibold">
                📋 Historie
              </button>
              <button onClick={reset} className="p-1.5 bg-red-100 text-red-600 rounded-lg hover:bg-red-200"><RotateCcw size={16} /></button>
            </div>
          </div>
          <div className="flex gap-1">
            {['players', 'lineup', 'opponent', 'subs', 'game', 'stats'].map(t => (
              <button key={t} onClick={() => setTab(t)} className={`flex-1 py-1.5 px-1 rounded-lg text-xs font-semibold ${tab === t ? 'bg-orange-500 text-white' : 'bg-gray-100'}`}>
                {t === 'players' && <Users size={12} className="inline mr-0.5" />}
                {t === 'stats' && <TrendingUp size={12} className="inline mr-0.5" />}
                {t === 'opponent' && '🔵'}
                {t === 'subs' && '↔'}
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl shadow-lg p-2 flex-1 overflow-hidden">
          {tab === 'players' && <PlayerManager players={players} onChange={handlePlayersChange} />}
          {tab === 'lineup' && <LineupManager lineup={lineup} setLineup={setLineup} players={players} libero={libero} setLibero={setLibero} set={currentSet} />}
          {tab === 'opponent' && <OpponentLineupManager opponentLineup={opponentLineup} setOpponentLineup={setOpponentLineup} />}
          {tab === 'subs' && <SubstitutionManager lineup={lineup} setLineup={setLineup} players={players} libero={libero} />}
          {tab === 'game' && <GameTracker sets={sets} setSets={setSets} currentSet={currentSet} serviceHits={serviceHits} setServiceHits={setServiceHits} ourPointHits={ourPointHits} setOurPointHits={setOurPointHits} lineup={lineup} setLineup={setLineup} libero={libero} onNextSet={nextSet} players={players} opponentLineup={opponentLineup} onNewMatch={startNewMatch} matchFinished={isMatchFinished()} />}
          {tab === 'stats' && <Stats players={players} stats={stats} />}
        </div>
      </div>
    </div>
  );
}
