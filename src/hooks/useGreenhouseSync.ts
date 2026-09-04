import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '@/lib/firebase';

export type Mode = 'A' | 'O' | 'C';

export interface ExtremeData {
  id: string;
  temperature: number;
  type: 'HIGH' | 'LOW';
  timestamp: number;
}

export function useGreenhouseSync() {
  const [temperature, setTemperature] = useState<number>(0);
  const [mode, setMode] = useState<Mode>('A');
  const [extremes, setExtremes] = useState<ExtremeData[]>([]);

  // Listen to temperature
  useEffect(() => {
    const tempRef = ref(database, 'greenhouse/temperature');
    
    const unsubscribeTemp = onValue(tempRef, (snapshot) => {
      const val = snapshot.val();
      if (typeof val === 'number') {
        setTemperature(val);
      }
    });

    return () => unsubscribeTemp();
  }, []);

  // Listen to mode from Firebase
  useEffect(() => {
    const modeRef = ref(database, 'greenhouse/mode');
    
    const unsubscribeMode = onValue(modeRef, (snapshot) => {
      const val = snapshot.val();
      if (val === 'A' || val === 'O' || val === 'C') {
        setMode(val as Mode);
      }
    });

    return () => unsubscribeMode();
  }, []);

  // Listen to historical extremes
  useEffect(() => {
    const extremesRef = ref(database, 'greenhouse/history/extremes');
    
    const unsubscribeExtremes = onValue(extremesRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        // Convert object to array and sort by timestamp
        const extremesArray = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        })).sort((a, b) => a.timestamp - b.timestamp);
        
        setExtremes(extremesArray);
      } else {
        setExtremes([]);
      }
    });

    return () => unsubscribeExtremes();
  }, []);

  const updateMode = async (newMode: Mode) => {
    // Optimistic UI update
    setMode(newMode);
    
    const modeRef = ref(database, 'greenhouse/mode');
    try {
      await set(modeRef, newMode);
    } catch (error) {
      console.error('Failed to update mode in Firebase:', error);
    }
  };

  return { temperature, mode, updateMode, extremes };
}
