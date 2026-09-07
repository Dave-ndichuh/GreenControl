'use client';

import { useGreenhouseSync } from '@/hooks/useGreenhouseSync';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Leaf, Thermometer, Wind, Settings2, AlertCircle, Activity, CheckCircle2, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';

type Theme = 'modern' | 'cyberpunk' | 'eco';

const themeMap = {
  modern: {
    root: "min-h-screen bg-slate-50 text-slate-900 font-sans transition-colors duration-500",
    nav: "bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 transition-colors duration-500",
    card: "bg-white border-slate-200 shadow-sm transition-all duration-500 overflow-hidden",
    title: "text-slate-900",
    subtitle: "text-slate-500",
    chartLine: "#0f172a",
    chartGrid: "#e2e8f0",
    chartText: "#64748b",
    buttonOutline: "text-slate-600 border-slate-200 hover:text-slate-900 hover:bg-slate-50",
    buttonActive: "bg-slate-900 text-white hover:bg-slate-800 border-slate-900",
    tempText: "text-slate-900",
    sliderTrack: "bg-slate-200",
    sliderThumb: "accent-emerald-500",
    logo: "text-emerald-600",
    icon: "text-slate-700",
    emptyBox: "bg-slate-50/50 border-slate-200 text-slate-400"
  },
  cyberpunk: {
    root: "min-h-screen bg-slate-950 text-emerald-400 font-mono transition-colors duration-500",
    nav: "bg-slate-950/90 backdrop-blur-md border-b border-emerald-900/50 sticky top-0 z-10 shadow-[0_0_20px_rgba(16,185,129,0.15)] transition-colors duration-500",
    card: "bg-slate-900/80 border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.1)] hover:shadow-[0_0_25px_rgba(16,185,129,0.2)] transition-all duration-500 overflow-hidden",
    title: "text-emerald-300 drop-shadow-[0_0_5px_rgba(110,231,183,0.8)] uppercase tracking-widest",
    subtitle: "text-emerald-600",
    chartLine: "#34d399",
    chartGrid: "#064e3b",
    chartText: "#059669",
    buttonOutline: "text-emerald-500 border-emerald-800 hover:bg-emerald-950/50 hover:text-emerald-300 hover:border-emerald-500 shadow-[inset_0_0_10px_rgba(16,185,129,0.1)]",
    buttonActive: "bg-emerald-500 text-slate-950 hover:bg-emerald-400 border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.6)] uppercase font-bold tracking-widest",
    tempText: "text-emerald-400 drop-shadow-[0_0_15px_rgba(16,185,129,0.9)] animate-pulse",
    sliderTrack: "bg-slate-800 border border-emerald-900",
    sliderThumb: "accent-emerald-400 shadow-[0_0_10px_rgba(16,185,129,1)]",
    logo: "text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.8)]",
    icon: "text-emerald-500",
    emptyBox: "bg-slate-900/50 border-emerald-900 text-emerald-700"
  },
  eco: {
    root: "min-h-screen bg-[#f9f9f6] text-stone-800 font-serif transition-colors duration-500",
    nav: "bg-[#f4f6f0]/90 backdrop-blur-md border-b border-stone-200 sticky top-0 z-10 transition-colors duration-500",
    card: "bg-white/90 border-stone-200 shadow-xl shadow-stone-200/50 rounded-3xl hover:-translate-y-1 transition-all duration-500 overflow-hidden",
    title: "text-stone-800 tracking-tight",
    subtitle: "text-stone-500 italic",
    chartLine: "#57534e",
    chartGrid: "#e7e5e4",
    chartText: "#78716c",
    buttonOutline: "text-stone-600 border-stone-200 hover:text-stone-900 hover:bg-stone-100 rounded-full",
    buttonActive: "bg-stone-800 text-stone-50 hover:bg-stone-700 border-stone-800 rounded-full",
    tempText: "text-stone-800",
    sliderTrack: "bg-stone-200",
    sliderThumb: "accent-stone-800",
    logo: "text-stone-800",
    icon: "text-stone-600",
    emptyBox: "bg-stone-50 border-stone-200 text-stone-400 rounded-2xl"
  }
};

export default function DashboardPage() {
  const { temperature, mode, updateMode, threshold, updateThreshold, ventState, history, isBridgeOnline } = useGreenhouseSync();

  const [themeName, setThemeName] = useState<Theme>('modern');
  const t = themeMap[themeName];

  // Local state for the slider to prevent lag while dragging
  const [localThreshold, setLocalThreshold] = useState(threshold);
  useEffect(() => setLocalThreshold(threshold), [threshold]);

  const isHighTemp = temperature > threshold;
  const isCritical = temperature >= 32.0;

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className={t.root}>
      
      {/* Navbar */}
      <header className={t.nav}>
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className={`flex items-center gap-2 ${t.logo}`}>
            {themeName === 'cyberpunk' ? <Zap className="h-6 w-6" /> : <Leaf className="h-6 w-6" />}
            <span className="text-xl font-bold tracking-tight">GreenControl</span>
          </div>

          <div className="flex items-center gap-6">
            {/* Theme Switcher */}
            <div className={`hidden sm:flex p-1 rounded-full text-xs font-semibold ${themeName === 'cyberpunk' ? 'bg-emerald-950/50 border border-emerald-900/50' : 'bg-black/5'}`}>
              <button onClick={() => setThemeName('modern')} className={`px-3 py-1 rounded-full transition-all ${themeName === 'modern' ? 'bg-white shadow-sm text-slate-900' : 'opacity-60 hover:opacity-100'}`}>Modern</button>
              <button onClick={() => setThemeName('cyberpunk')} className={`px-3 py-1 rounded-full transition-all ${themeName === 'cyberpunk' ? 'bg-emerald-950 text-emerald-400 shadow-md shadow-emerald-900/50 border border-emerald-500/30' : 'opacity-60 hover:opacity-100'}`}>Cyberpunk</button>
              <button onClick={() => setThemeName('eco')} className={`px-3 py-1 rounded-full transition-all ${themeName === 'eco' ? 'bg-[#e7e5e4] text-stone-900 shadow-sm' : 'opacity-60 hover:opacity-100'}`}>Eco</button>
            </div>

            {/* Sync Badge */}
            <div className={`flex items-center gap-2 text-sm px-3 py-1.5 rounded-full ${isBridgeOnline ? (themeName === 'cyberpunk' ? 'text-emerald-400 bg-emerald-950/50 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]' : 'text-emerald-700 bg-emerald-50 border border-emerald-200') : 'text-red-700 bg-red-50 border border-red-200'}`}>
              <span className="relative flex h-2.5 w-2.5">
                {isBridgeOnline && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${themeName === 'cyberpunk' ? 'bg-emerald-400' : 'bg-emerald-400'}`}></span>}
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isBridgeOnline ? (themeName === 'cyberpunk' ? 'bg-emerald-400 shadow-[0_0_5px_#34d399]' : 'bg-emerald-500') : 'bg-red-500'}`}></span>
              </span>
              {isBridgeOnline ? 'Live Sync' : 'SYSTEM OFFLINE'}
            </div>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {!isBridgeOnline && (
        <div className="bg-red-600 text-white px-4 py-3 text-center text-sm font-medium flex items-center justify-center gap-2 shadow-inner">
          <AlertCircle className="h-4 w-4 animate-pulse" />
          Hardware Bridge is disconnected. Reverting to automatic failsafe mode.
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold tracking-tight ${t.title}`}>Farmhouse Dashboard</h1>
          <p className={`mt-1 ${t.subtitle}`}>Real-time telemetry and climate control for Ruiru.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Live Status & Controls */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Temperature Card */}
            <Card className={t.card}>
              <div className={`h-2 w-full transition-colors duration-500 ${isCritical ? (themeName === 'cyberpunk' ? 'bg-red-500 shadow-[0_0_15px_#ef4444]' : 'bg-red-600') : isHighTemp ? 'bg-amber-500' : 'bg-emerald-500'}`} />
              <CardHeader className="pb-2">
                <CardTitle className={`text-lg flex items-center gap-2 ${t.title}`}>
                  <Thermometer className={`h-5 w-5 ${t.icon}`} />
                  Current Temperature
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 my-4">
                  <span className={`text-6xl font-black tracking-tighter transition-all duration-500 ${isCritical ? (themeName === 'cyberpunk' ? 'text-red-500 drop-shadow-[0_0_15px_rgba(239,68,68,0.8)] animate-pulse' : 'text-red-600 animate-pulse') : isHighTemp ? (themeName === 'cyberpunk' ? 'text-amber-400 drop-shadow-[0_0_10px_rgba(251,191,36,0.6)]' : 'text-amber-500') : t.tempText}`}>
                    {temperature.toFixed(1)}
                  </span>
                  <span className={`text-2xl font-bold ${t.subtitle}`}>&deg;C</span>
                </div>
                
                <Progress 
                  value={Math.min((temperature / 50) * 100, 100)} 
                  className={`h-2 mb-2 bg-slate-200/20 ${isCritical ? '[&>div]:bg-red-600' : isHighTemp ? '[&>div]:bg-amber-500' : (themeName === 'cyberpunk' ? '[&>div]:bg-emerald-400 [&>div]:shadow-[0_0_10px_#34d399]' : '[&>div]:bg-emerald-500')}`} 
                />
                
                <div className={`flex items-center justify-between text-sm ${t.subtitle}`}>
                  <span className="font-medium">Status:</span>
                  {isCritical ? (
                    <span className="text-red-500 flex items-center gap-1 font-bold drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">
                      <AlertCircle className="h-4 w-4" /> CRITICAL
                    </span>
                  ) : isHighTemp ? (
                    <span className="text-amber-500 flex items-center gap-1 font-semibold">
                      <AlertCircle className="h-3.5 w-3.5" /> High Temp
                    </span>
                  ) : (
                    <span className={`flex items-center gap-1 font-semibold ${themeName === 'cyberpunk' ? 'text-emerald-400' : 'text-emerald-600'}`}>
                      <Activity className="h-3.5 w-3.5" /> Optimal
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Ventilation Controls Card */}
            <Card className={t.card}>
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className={`text-lg flex items-center gap-2 ${t.title}`}>
                    <Wind className={`h-5 w-5 ${t.icon}`} />
                    Ventilation
                  </CardTitle>
                  
                  {/* Hardware ACK Badge */}
                  <Badge 
                    className={`uppercase tracking-widest text-[10px] px-2 py-0.5 border-transparent shadow-none flex items-center gap-1 transition-colors ${
                      ventState === 'OPEN' 
                        ? (themeName === 'cyberpunk' ? "bg-emerald-950/50 text-emerald-400 border border-emerald-500/50 shadow-[0_0_10px_rgba(16,185,129,0.2)]" : "bg-emerald-100 text-emerald-700")
                        : ventState === 'CLOSED' ? (themeName === 'cyberpunk' ? "bg-slate-900 text-slate-400 border border-slate-700" : "bg-slate-100 text-slate-600")
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {ventState !== 'UNKNOWN' && <CheckCircle2 className="h-3 w-3" />}
                    {ventState === 'UNKNOWN' ? 'Waiting...' : `Vent ${ventState}`}
                  </Badge>
                </div>
                <CardDescription className={t.subtitle}>Actuator override controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant="outline"
                    onClick={() => updateMode('A')}
                    disabled={!isBridgeOnline}
                    className={`h-12 transition-all duration-300 ${mode === 'A' ? t.buttonActive : t.buttonOutline}`}
                  >
                    <Settings2 className={`h-4 w-4 mr-2 ${mode === 'A' && themeName === 'cyberpunk' ? 'animate-spin-slow' : ''}`} />
                    Auto
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => updateMode('O')}
                    disabled={!isBridgeOnline}
                    className={`h-12 transition-all duration-300 ${mode === 'O' ? (themeName === 'cyberpunk' ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_#34d399] uppercase font-bold tracking-widest' : 'bg-emerald-600 text-white border-emerald-600 hover:bg-emerald-700') : t.buttonOutline}`}
                  >
                    Open
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => updateMode('C')}
                    disabled={!isBridgeOnline}
                    className={`h-12 transition-all duration-300 ${mode === 'C' ? (themeName === 'cyberpunk' ? 'bg-rose-500 text-slate-950 shadow-[0_0_15px_#f43f5e] uppercase font-bold tracking-widest' : 'bg-rose-600 text-white border-rose-600 hover:bg-rose-700') : t.buttonOutline}`}
                  >
                    Close
                  </Button>
                </div>
                
                {/* Dynamic Threshold Slider */}
                <div className={`pt-4 border-t ${themeName === 'cyberpunk' ? 'border-emerald-900/50' : 'border-slate-100'}`}>
                  <div className="flex justify-between items-center mb-2">
                    <label className={`text-sm font-medium ${t.title}`}>Auto Trigger Threshold</label>
                    <span className={`text-sm font-bold ${t.title}`}>{localThreshold.toFixed(1)}&deg;C</span>
                  </div>
                  <input 
                    type="range" 
                    min="20" 
                    max="35" 
                    step="0.5"
                    value={localThreshold}
                    disabled={!isBridgeOnline}
                    onChange={(e) => setLocalThreshold(parseFloat(e.target.value))}
                    onMouseUp={() => updateThreshold(localThreshold)}
                    onTouchEnd={() => updateThreshold(localThreshold)}
                    className={`w-full h-2 rounded-lg appearance-none transition-all ${t.sliderThumb} ${isBridgeOnline ? `${t.sliderTrack} cursor-pointer` : `${t.sliderTrack} cursor-not-allowed opacity-50`}`}
                  />
                  <p className={`text-xs mt-2 ${t.subtitle}`}>
                    In Auto mode, vents open when temp &gt; {localThreshold.toFixed(1)}&deg;C.
                  </p>
                </div>

              </CardContent>
            </Card>

          </div>

          {/* Right Column: Chart */}
          <div className="lg:col-span-8">
            <Card className={`${t.card} h-full flex flex-col`}>
              <CardHeader>
                <CardTitle className={`text-lg flex items-center gap-2 ${t.title}`}>
                  <Activity className={`h-5 w-5 ${t.icon}`} />
                  Temperature History
                </CardTitle>
                <CardDescription className={t.subtitle}>
                  Time-series log recorded every 5 minutes.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-[400px]">
                {history.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={history} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={t.chartGrid} />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatTime} 
                        tick={{ fontSize: 12, fill: t.chartText }}
                        tickLine={false}
                        axisLine={{ stroke: t.chartGrid }}
                        dy={10}
                      />
                      <YAxis 
                        domain={['auto', 'auto']} 
                        tick={{ fontSize: 12, fill: t.chartText }}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                      />
                      <Tooltip 
                        labelFormatter={(label) => formatTime(label as number)}
                        formatter={(value: any) => [`${value}°C`, 'Temperature']}
                        contentStyle={{ 
                          borderRadius: '8px', 
                          border: themeName === 'cyberpunk' ? '1px solid #065f46' : 'none', 
                          backgroundColor: themeName === 'cyberpunk' ? '#020617' : '#ffffff',
                          color: themeName === 'cyberpunk' ? '#34d399' : '#0f172a',
                          boxShadow: themeName === 'cyberpunk' ? '0 0 15px rgba(16,185,129,0.3)' : '0 4px 6px -1px rgb(0 0 0 / 0.1)' 
                        }}
                      />
                      {/* Dynamic Reference Line from slider */}
                      <ReferenceLine y={threshold} stroke="#f59e0b" strokeDasharray="3 3" label={{ position: 'top', value: `Threshold (${threshold}°C)`, fill: '#f59e0b', fontSize: 10 }} />
                      <Line 
                        type="monotone" 
                        dataKey="temp" 
                        stroke={t.chartLine} 
                        strokeWidth={themeName === 'cyberpunk' ? 3 : 2}
                        dot={{ r: 3, fill: t.chartLine, strokeWidth: 0 }} 
                        activeDot={{ r: 6, stroke: themeName === 'cyberpunk' ? '#10b981' : '#fff', strokeWidth: 2 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className={`h-full flex flex-col items-center justify-center space-y-3 border border-dashed m-2 ${t.emptyBox}`}>
                    <Activity className={`h-8 w-8 ${themeName === 'cyberpunk' ? 'opacity-50 animate-pulse' : 'opacity-30'}`} />
                    <p className="text-sm font-medium">Waiting for historical data...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
