import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { MAX_NITRO, TOTAL_LAPS } from './game/constants';
import { VehicleModel } from './game/Vehicle';
import { MapType } from './game/Track';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const minimapRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  
  const [gameState, setGameState] = useState('menu');
  const [showSettings, setShowSettings] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const [countdown, setCountdown] = useState(3);
  const [lap, setLap] = useState(1);
  const [speed, setSpeed] = useState(0);
  const [nitro, setNitro] = useState(MAX_NITRO);
  const [position, setPosition] = useState(1);
  const [totalVehicles, setTotalVehicles] = useState(5);
  const [time, setTime] = useState(0);
  const [selectedMap, setSelectedMap] = useState<MapType>('grassland');
  
  const [bestTime, setBestTime] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('nitroRushBestTime');
    if (saved) setBestTime(parseFloat(saved));
  }, [gameState]);

  useEffect(() => {
    if (!canvasRef.current || !minimapRef.current) return;

    const engine = new GameEngine(canvasRef.current, minimapRef.current, selectedMap, (state) => {
      setGameState(state.gameState);
      setCountdown(state.countdown);
      setLap(state.lap);
      setSpeed(state.speed);
      setNitro(state.nitro);
      setPosition(state.position);
      setTotalVehicles(state.totalVehicles);
      setTime(state.time);
    });
    
    engine.audio.setVolume(volume);
    engineRef.current = engine;
    
    return () => {
      engine.destroy();
    };
  }, [selectedMap]);

  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.audio.setVolume(volume);
    }
  }, [volume]);

  const startGame = (model: VehicleModel) => {
    engineRef.current?.startGame(model);
  };

  const formatTime = (t: number) => {
    const mins = Math.floor(t / 60);
    const secs = Math.floor(t % 60);
    const ms = Math.floor((t % 1) * 100);
    return `${mins}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleTouchStart = (key: string) => (e: React.TouchEvent) => {
    e.preventDefault();
    engineRef.current?.setTouchKey(key, true);
  };

  const handleTouchEnd = (key: string) => (e: React.TouchEvent) => {
    e.preventDefault();
    engineRef.current?.setTouchKey(key, false);
  };

  return (
    <div className="relative w-full h-screen overflow-hidden bg-slate-900 font-sans select-none touch-none">
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full block z-0" />
      <canvas 
        ref={minimapRef} 
        width={150} 
        height={150} 
        className={`absolute top-20 right-4 z-10 bg-black/50 backdrop-blur rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)] transition-opacity duration-300 ${
          (gameState === 'playing' || gameState === 'countdown' || gameState === 'paused') ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      />

      {/* HUD */}
      {(gameState === 'playing' || gameState === 'countdown' || gameState === 'paused') && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-10">
          <div className="flex justify-between items-start">
            <div className="flex gap-4 items-start">
              <div className="bg-black/50 backdrop-blur p-3 rounded-xl border border-cyan-500/30 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <div className="text-cyan-400 text-xs uppercase tracking-wider font-bold">Pos</div>
                <div className="text-3xl font-black text-white italic">{position}<span className="text-lg text-slate-400">/{totalVehicles}</span></div>
              </div>
              
              {gameState === 'playing' && (
                <button 
                  onClick={() => engineRef.current?.togglePause()}
                  className="pointer-events-auto bg-black/50 backdrop-blur p-3 rounded-xl border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M6 4h4v16H6zm8 0h4v16h-4z"/></svg>
                </button>
              )}
            </div>
            
            <div className="flex flex-col items-end gap-2">
              <div className="bg-black/50 backdrop-blur p-3 rounded-xl border border-cyan-500/30 text-right shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                <div className="text-cyan-400 text-xs uppercase tracking-wider font-bold">Lap</div>
                <div className="text-2xl font-black text-white italic">{lap}/{TOTAL_LAPS}</div>
              </div>
              <div className="bg-black/50 backdrop-blur px-3 py-1 rounded-lg border border-cyan-500/30 text-right">
                <div className="text-xl font-mono text-white">{formatTime(time)}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-between items-end mb-24 md:mb-4">
            <div className="bg-black/50 backdrop-blur p-4 rounded-full w-24 h-24 flex flex-col items-center justify-center border-2 border-cyan-500 shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              <div className="text-3xl font-black text-white italic">{speed}</div>
              <div className="text-cyan-400 text-xs uppercase tracking-wider font-bold">KM/H</div>
            </div>
            
            <div className="w-8 h-48 bg-black/50 backdrop-blur rounded-full border border-cyan-500/30 overflow-hidden flex flex-col justify-end p-1 shadow-[0_0_15px_rgba(6,182,212,0.3)] relative">
              <div 
                className="w-full bg-gradient-to-t from-cyan-600 via-cyan-400 to-white rounded-full transition-all duration-100 shadow-[0_0_10px_#22d3ee]"
                style={{ height: `${(nitro / MAX_NITRO) * 100}%` }}
              />
              <div className="absolute inset-0 flex items-center justify-center rotate-[-90deg] text-xs font-black text-white/80 tracking-widest">
                NITRO
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Controls */}
      {gameState === 'playing' && (
        <div className="absolute bottom-0 left-0 right-0 h-32 flex justify-between px-4 pb-4 md:hidden">
          <div className="flex gap-2 w-1/2">
            <button 
              className="flex-1 bg-white/10 backdrop-blur active:bg-white/30 rounded-2xl border border-white/20 flex items-center justify-center text-white/50"
              onTouchStart={handleTouchStart('left')} onTouchEnd={handleTouchEnd('left')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
            </button>
            <button 
              className="flex-1 bg-white/10 backdrop-blur active:bg-white/30 rounded-2xl border border-white/20 flex items-center justify-center text-white/50"
              onTouchStart={handleTouchStart('right')} onTouchEnd={handleTouchEnd('right')}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6"/></svg>
            </button>
          </div>
          <div className="flex gap-2 w-1/2 justify-end">
            <button 
              className="w-16 bg-red-500/20 backdrop-blur active:bg-red-500/40 rounded-2xl border border-red-500/50 flex items-center justify-center text-red-400 font-bold text-xs"
              onTouchStart={handleTouchStart('brake')} onTouchEnd={handleTouchEnd('brake')}
            >
              BRK
            </button>
            <button 
              className="w-20 bg-cyan-500/20 backdrop-blur active:bg-cyan-500/40 rounded-2xl border border-cyan-500/50 flex items-center justify-center text-cyan-400 font-bold text-xs shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              onTouchStart={handleTouchStart('nitro')} onTouchEnd={handleTouchEnd('nitro')}
            >
              NITRO
            </button>
            <button 
              className="w-20 bg-green-500/20 backdrop-blur active:bg-green-500/40 rounded-2xl border border-green-500/50 flex items-center justify-center text-green-400 font-bold text-xs"
              onTouchStart={handleTouchStart('accelerate')} onTouchEnd={handleTouchEnd('accelerate')}
            >
              ACC
            </button>
          </div>
        </div>
      )}

      {/* Countdown Overlay */}
      {gameState === 'countdown' && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/40 backdrop-blur-sm">
          <div className="text-9xl font-black text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-cyan-600 italic animate-pulse drop-shadow-[0_0_30px_rgba(6,182,212,0.8)]">
            {countdown > 0 ? countdown : 'GO!'}
          </div>
        </div>
      )}

      {/* Main Menu */}
      {gameState === 'menu' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-slate-950/80 backdrop-blur-md p-6 overflow-y-auto">
          <div className="text-center mb-8 transform -skew-x-6 mt-12">
            <h1 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 uppercase tracking-tighter drop-shadow-[0_0_20px_rgba(6,182,212,0.5)]">
              Nitro Rush
            </h1>
            <h2 className="text-3xl md:text-5xl font-black text-white uppercase tracking-widest mt-[-10px]">
              Legends
            </h2>
          </div>

          <div className="w-full max-w-3xl mb-8">
            <h3 className="text-cyan-400 text-sm uppercase tracking-wider font-bold mb-3 text-center">Select Map</h3>
            <div className="flex flex-wrap justify-center gap-4">
              {[
                { id: 'grassland', name: 'Grassland', color: 'bg-green-600' },
                { id: 'city', name: 'Neon City', color: 'bg-slate-800' },
                { id: 'highway', name: 'Desert Highway', color: 'bg-orange-600' },
                { id: 'monaco', name: 'Monaco GP', color: 'bg-blue-600' },
                { id: 'chicago', name: 'Chicago', color: 'bg-red-700' }
              ].map(map => (
                <button
                  key={map.id}
                  onClick={() => setSelectedMap(map.id as MapType)}
                  className={`px-6 py-3 rounded-xl border-2 transition-all ${selectedMap === map.id ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.5)] scale-105' : 'border-transparent opacity-70 hover:opacity-100'} ${map.color} text-white font-bold uppercase tracking-wider`}
                >
                  {map.name}
                </button>
              ))}
            </div>
          </div>

          <h3 className="text-cyan-400 text-sm uppercase tracking-wider font-bold mb-3 text-center">Select Vehicle</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full max-w-3xl">
            {[
              { id: 'lambo', name: 'Lambo', desc: 'High Speed', color: 'from-cyan-500/20 to-transparent', border: 'border-cyan-500/30 hover:border-cyan-400' },
              { id: 'porsche', name: 'Porsche', desc: 'High Handling', color: 'from-blue-500/20 to-transparent', border: 'border-blue-500/30 hover:border-blue-400' },
              { id: 'generic', name: 'Stock Car', desc: 'Balanced', color: 'from-slate-500/20 to-transparent', border: 'border-slate-500/30 hover:border-slate-400' },
              { id: 'sportbike', name: 'Sportbike', desc: 'Extreme Speed', color: 'from-purple-500/20 to-transparent', border: 'border-purple-500/30 hover:border-purple-400' },
              { id: 'dirtbike', name: 'Dirtbike', desc: 'Off-road King', color: 'from-green-500/20 to-transparent', border: 'border-green-500/30 hover:border-green-400' },
              { id: 'cruiser', name: 'Cruiser', desc: 'Heavy & Stable', color: 'from-orange-500/20 to-transparent', border: 'border-orange-500/30 hover:border-orange-400' },
            ].map(v => (
              <button 
                key={v.id}
                onClick={() => startGame(v.id as VehicleModel)}
                className={`group relative overflow-hidden rounded-2xl bg-slate-900 border-2 ${v.border} p-4 transition-all duration-300 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${v.color} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative z-10 flex flex-col items-center">
                  <h3 className="text-xl font-black text-white uppercase tracking-wider">{v.name}</h3>
                  <p className="text-slate-400 text-xs mt-1">{v.desc}</p>
                </div>
              </button>
            ))}
          </div>

          {bestTime && (
            <div className="mt-8 text-center">
              <div className="text-slate-400 text-sm uppercase tracking-widest">Best Time</div>
              <div className="text-2xl font-mono text-cyan-400">{formatTime(bestTime)}</div>
            </div>
          )}
          
          <div className="mt-8 text-slate-500 text-xs text-center max-w-md">
            Desktop: Arrow Keys / WASD to drive, Shift for Nitro.<br/>
            Mobile: Use on-screen touch controls.
          </div>

          <button 
            onClick={() => setShowSettings(true)}
            className="absolute top-6 right-6 p-3 bg-slate-900 border border-cyan-500/30 rounded-full text-cyan-400 hover:bg-cyan-500/20 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
          </button>
        </div>
      )}

      {/* Settings Menu */}
      {showSettings && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-[60] bg-black/80 backdrop-blur-md p-6">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-8 w-full max-w-sm shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <h2 className="text-3xl font-black text-white uppercase tracking-widest mb-8 text-center drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
              Settings
            </h2>
            
            <div className="mb-8">
              <label className="block text-cyan-400 text-sm uppercase tracking-wider font-bold mb-4">
                Master Volume: {Math.round(volume * 100)}%
              </label>
              <input 
                type="range" 
                min="0" 
                max="1" 
                step="0.05" 
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-full accent-cyan-500"
              />
            </div>

            <button 
              onClick={() => setShowSettings(false)}
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all transform hover:scale-105 active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Pause Menu */}
      {gameState === 'paused' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-black/60 backdrop-blur-sm p-6">
          <h2 className="text-5xl font-black text-white uppercase tracking-widest mb-8 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
            Paused
          </h2>
          
          <div className="flex flex-col gap-4 w-full max-w-xs">
            <button 
              onClick={() => engineRef.current?.togglePause()}
              className="px-8 py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all transform hover:scale-105 active:scale-95"
            >
              Resume
            </button>
            <button 
              onClick={() => {
                engineRef.current?.resetToMenu();
                setGameState('menu');
              }}
              className="px-8 py-4 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-white font-black uppercase tracking-widest rounded-full transition-all transform hover:scale-105 active:scale-95"
            >
              Quit to Menu
            </button>
          </div>
        </div>
      )}

      {/* Race Finished */}
      {gameState === 'finished' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-50 bg-slate-950/90 backdrop-blur-md p-6">
          <h2 className="text-5xl font-black text-white uppercase tracking-widest mb-2 drop-shadow-[0_0_20px_rgba(255,255,255,0.5)]">
            Race Finished!
          </h2>
          
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-8 mt-8 w-full max-w-md shadow-[0_0_30px_rgba(6,182,212,0.2)]">
            <div className="flex justify-between items-center mb-6 border-b border-white/10 pb-6">
              <div className="text-slate-400 uppercase tracking-wider">Final Position</div>
              <div className="text-4xl font-black text-cyan-400 italic">{position}<span className="text-xl text-slate-500">/{totalVehicles}</span></div>
            </div>
            <div className="flex justify-between items-center">
              <div className="text-slate-400 uppercase tracking-wider">Total Time</div>
              <div className="text-3xl font-mono text-white">{formatTime(time)}</div>
            </div>
          </div>

          <div className="flex flex-col gap-4 w-full max-w-md mt-12">
            <button 
              onClick={() => {
                engineRef.current?.resetToMenu();
                setGameState('menu');
              }}
              className="w-full py-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black uppercase tracking-widest rounded-full shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all transform hover:scale-105 active:scale-95"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
