'use client';

import { useGreenhouseSync, Mode } from '@/hooks/useGreenhouseSync';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

export default function DashboardPage() {
  const { temperature, mode, updateMode } = useGreenhouseSync();

  const isHighTemp = temperature > 28.0;
  const isVentOpen = mode === 'O' || (mode === 'A' && isHighTemp);

  return (
    <div className="min-h-screen bg-neutral-100 flex items-center justify-center p-4">
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
    </div>
  );
}
