'use client';

import { useGreenhouseSync, Mode } from '@/hooks/useGreenhouseSync';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { Leaf, Thermometer, Wind, Settings2, AlertCircle, Activity } from 'lucide-react';

export default function DashboardPage() {
  const { temperature, mode, updateMode, extremes } = useGreenhouseSync();

  const isHighTemp = temperature > 28.0;
  const isVentOpen = mode === 'O' || (mode === 'A' && isHighTemp);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-100">
      
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-600">
            <Leaf className="h-6 w-6" />
            <span className="text-xl font-bold tracking-tight">GreenControl</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-slate-500 bg-slate-100 px-3 py-1.5 rounded-full">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              Live Sync
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Farmhouse Dashboard</h1>
          <p className="text-slate-500 mt-1">Real-time telemetry and climate control for Ruiru.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column: Live Status & Controls */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* Temperature Card */}
            <Card className="shadow-sm border-slate-200 overflow-hidden">
              <div className={`h-2 w-full ${isHighTemp ? 'bg-red-500' : 'bg-emerald-500'}`} />
              <CardHeader className="pb-2">
                <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
                  <Thermometer className="h-5 w-5" />
                  Current Temperature
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2 my-4">
                  <span className={`text-6xl font-black tracking-tighter ${isHighTemp ? 'text-red-600' : 'text-slate-900'}`}>
                    {temperature.toFixed(1)}
                  </span>
                  <span className="text-2xl font-bold text-slate-400">&deg;C</span>
                </div>
                
                <Progress 
                  value={Math.min((temperature / 50) * 100, 100)} 
                  className={`h-2 mb-2 ${isHighTemp ? '[&>div]:bg-red-500' : '[&>div]:bg-emerald-500'}`} 
                />
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-500 font-medium">Status:</span>
                  {isHighTemp ? (
                    <span className="text-red-600 flex items-center gap-1 font-semibold">
                      <AlertCircle className="h-3.5 w-3.5" /> High Temp
                    </span>
                  ) : (
                    <span className="text-emerald-600 flex items-center gap-1 font-semibold">
                      <Activity className="h-3.5 w-3.5" /> Optimal
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Ventilation Controls Card */}
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-center">
                  <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
                    <Wind className="h-5 w-5" />
                    Ventilation
                  </CardTitle>
                  <Badge 
                    className={`uppercase tracking-widest text-[10px] px-2 py-0.5 border-transparent shadow-none ${
                      isVentOpen 
                        ? "bg-emerald-100 text-emerald-700" 
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {isVentOpen ? "Vent Open" : "Vent Closed"}
                  </Badge>
                </div>
                <CardDescription>Actuator override controls</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                
                <div className="grid grid-cols-3 gap-2">
                  <Button 
                    variant={mode === 'A' ? "default" : "outline"} 
                    onClick={() => updateMode('A')}
                    className={`h-12 ${mode === 'A' ? 'bg-slate-900 hover:bg-slate-800' : 'text-slate-600 hover:text-slate-900 border-slate-200'}`}
                  >
                    <Settings2 className="h-4 w-4 mr-2" />
                    Auto
                  </Button>
                  <Button 
                    variant={mode === 'O' ? "default" : "outline"} 
                    onClick={() => updateMode('O')}
                    className={`h-12 ${mode === 'O' ? 'bg-emerald-600 hover:bg-emerald-700' : 'text-slate-600 hover:text-emerald-700 hover:border-emerald-200 border-slate-200'}`}
                  >
                    Open
                  </Button>
                  <Button 
                    variant={mode === 'C' ? "default" : "outline"} 
                    onClick={() => updateMode('C')}
                    className={`h-12 ${mode === 'C' ? 'bg-rose-600 hover:bg-rose-700' : 'text-slate-600 hover:text-rose-700 hover:border-rose-200 border-slate-200'}`}
                  >
                    Close
                  </Button>
                </div>
                
                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500 border border-slate-100 flex items-start gap-2">
                  <Activity className="h-4 w-4 text-slate-400 shrink-0 mt-0.5" />
                  <p>In <strong>Auto</strong> mode, the roof louvers will automatically actuate open when the temperature exceeds 28.0&deg;C.</p>
                </div>
              </CardContent>
            </Card>

          </div>

          {/* Right Column: Chart */}
          <div className="lg:col-span-8">
            <Card className="shadow-sm border-slate-200 h-full flex flex-col">
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2 text-slate-700">
                  <Activity className="h-5 w-5" />
                  Historical Extremes
                </CardTitle>
                <CardDescription>
                  Time-series log of recorded temperature anomalies (&lt;15&deg;C or &gt;28&deg;C).
                </CardDescription>
              </CardHeader>
              <CardContent className="flex-1 min-h-[400px]">
                {extremes.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={extremes} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                      <XAxis 
                        dataKey="timestamp" 
                        tickFormatter={formatTime} 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={{ stroke: '#e2e8f0' }}
                        dy={10}
                      />
                      <YAxis 
                        domain={['auto', 'auto']} 
                        tick={{ fontSize: 12, fill: '#64748b' }}
                        tickLine={false}
                        axisLine={false}
                        dx={-10}
                      />
                      <Tooltip 
                        labelFormatter={(label) => formatTime(label as number)}
                        formatter={(value: any) => [`${value}°C`, 'Temperature']}
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      />
                      <ReferenceLine y={28} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'top', value: 'High (28°C)', fill: '#ef4444', fontSize: 10 }} />
                      <ReferenceLine y={15} stroke="#3b82f6" strokeDasharray="3 3" label={{ position: 'bottom', value: 'Low (15°C)', fill: '#3b82f6', fontSize: 10 }} />
                      <Line 
                        type="monotone" 
                        dataKey="temperature" 
                        stroke="#0f172a" 
                        strokeWidth={2}
                        dot={{ r: 4, fill: '#0f172a', strokeWidth: 0 }} 
                        activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }} 
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 bg-slate-50/50 rounded-xl border border-dashed border-slate-200 m-2">
                    <Activity className="h-8 w-8 text-slate-300" />
                    <p className="text-sm font-medium">No temperature extremes recorded.</p>
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
