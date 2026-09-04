'use client';

import { useGreenhouseSync, Mode } from '@/hooks/useGreenhouseSync';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

export default function DashboardPage() {
  const { temperature, mode, updateMode, extremes } = useGreenhouseSync();

  const isHighTemp = temperature > 28.0;
  const isVentOpen = mode === 'O' || (mode === 'A' && isHighTemp);

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-neutral-100 flex flex-col items-center py-10 px-4 space-y-6">
      
      {/* Control Card */}
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Greenhouse Control</CardTitle>
          <CardDescription>Live monitoring and ventilation overrides</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Temperature Section */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-neutral-500">Current Temperature</span>
              <Badge variant={isHighTemp ? "destructive" : "secondary"} className="text-sm px-2 py-1">
                {temperature.toFixed(1)}&deg;C
              </Badge>
            </div>
            {/* Progress bar to visualize temperature relative to say 50C max */}
            <Progress value={Math.min((temperature / 50) * 100, 100)} className="h-3" />
            <p className={`text-sm mt-1 ${isHighTemp ? 'text-red-500 font-medium' : 'text-neutral-500'}`}>
              {isHighTemp ? 'Threshold exceeded (>28&deg;C)' : 'Optimal range'}
            </p>
          </div>

          <hr className="border-neutral-200" />

          {/* Mode Control Section */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-medium text-neutral-500">Ventilation Mode</h3>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-neutral-500">Vent Status:</span>
                <Badge 
                  className={`uppercase tracking-wider text-xs border-transparent ${
                    isVentOpen 
                      ? "bg-emerald-500 text-white hover:bg-emerald-600" 
                      : "bg-neutral-400 text-white hover:bg-neutral-500"
                  }`}
                >
                  {isVentOpen ? "Open" : "Closed"}
                </Badge>
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button 
                variant={mode === 'A' ? "default" : "outline"} 
                onClick={() => updateMode('A')}
                className="flex-1"
              >
                Auto
              </Button>
              <Button 
                variant={mode === 'O' ? "default" : "outline"} 
                onClick={() => updateMode('O')}
                className="flex-1"
              >
                Open (M)
              </Button>
              <Button 
                variant={mode === 'C' ? "default" : "outline"} 
                onClick={() => updateMode('C')}
                className="flex-1"
              >
                Close (M)
              </Button>
            </div>
            <p className="text-xs text-neutral-400 text-center">
              Auto opens vent when temp &gt; 28&deg;C
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Historical Extremes Chart */}
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader>
          <CardTitle className="text-xl font-bold">Historical Extremes</CardTitle>
          <CardDescription>Time-series log of temperatures outside normal range (&lt;15&deg;C or &gt;28&deg;C)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full mt-4">
            {extremes.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={extremes} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.5} />
                  <XAxis 
                    dataKey="timestamp" 
                    tickFormatter={formatTime} 
                    tick={{ fontSize: 12, fill: '#888' }}
                  />
                  <YAxis 
                    domain={['auto', 'auto']} 
                    tick={{ fontSize: 12, fill: '#888' }}
                  />
                  <Tooltip 
                    labelFormatter={(label) => formatTime(label as number)}
                    formatter={(value: any) => [`${value}°C`, 'Temperature']}
                  />
                  <ReferenceLine y={28} stroke="red" strokeDasharray="3 3" />
                  <ReferenceLine y={15} stroke="blue" strokeDasharray="3 3" />
                  <Line 
                    type="monotone" 
                    dataKey="temperature" 
                    stroke="#171717" 
                    strokeWidth={2}
                    dot={{ r: 4, fill: '#171717' }} 
                    activeDot={{ r: 6 }} 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-neutral-400 text-sm">
                No extreme temperatures recorded yet.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

    </div>
  );
}
