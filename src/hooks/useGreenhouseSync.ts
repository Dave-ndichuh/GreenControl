import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '@/lib/firebase';

export type Mode = 'A' | 'O' | 'C';

export function useGreenhouseSync() {
  const [temperature, setTemperature] = useState<number>(0);
  const [mode, setMode] = useState<Mode>('A');

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

  // Listen to mode from Firebase as well (so it syncs if another client changes it)
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

  return { temperature, mode, updateMode };
}
