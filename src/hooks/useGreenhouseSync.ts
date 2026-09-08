import { useState, useEffect } from 'react';
import { ref, onValue, set } from 'firebase/database';
import { database } from '@/lib/firebase';

export type Mode = 'A' | 'O' | 'C';
export type VentState = 'OPEN' | 'CLOSED' | 'UNKNOWN';

export interface HistoryData {
  temp_lm35: number;
  temp_dht: number;
  humidity: number;
  timestamp: number;
  human_readable: string;
}

export function useGreenhouseSync() {
  const [tempLM35, setTempLM35] = useState<number>(0);
  const [tempDHT, setTempDHT] = useState<number>(0);
  const [humidity, setHumidity] = useState<number>(0);
  
  const [mode, setMode] = useState<Mode>('A');
  const [threshold, setThreshold] = useState<number>(28.0);
  const [ventState, setVentState] = useState<VentState>('UNKNOWN');
  const [history, setHistory] = useState<HistoryData[]>([]);
  const [isBridgeOnline, setIsBridgeOnline] = useState<boolean>(false);
  const [power, setPower] = useState<number>(0);

  // Listen to live sensors
  useEffect(() => {
    const lm35Ref = ref(database, 'greenhouse/sensors/temp_lm35');
    const unsubLM35 = onValue(lm35Ref, (snapshot) => {
      if (typeof snapshot.val() === 'number') setTempLM35(snapshot.val());
    });
    
    const dhtRef = ref(database, 'greenhouse/sensors/temp_dht');
    const unsubDHT = onValue(dhtRef, (snapshot) => {
      if (typeof snapshot.val() === 'number') setTempDHT(snapshot.val());
    });

    const humRef = ref(database, 'greenhouse/sensors/humidity');
    const unsubHum = onValue(humRef, (snapshot) => {
      if (typeof snapshot.val() === 'number') setHumidity(snapshot.val());
    });

    return () => { unsubLM35(); unsubDHT(); unsubHum(); };
  }, []);

  // Listen to live power estimation
  useEffect(() => {
    const powerRef = ref(database, 'greenhouse/power_live');
    const unsubscribePower = onValue(powerRef, (snapshot) => {
      const val = snapshot.val();
      if (typeof val === 'number') setPower(val);
    });
    return () => unsubscribePower();
  }, []);

  // Listen to mode
  useEffect(() => {
    const modeRef = ref(database, 'greenhouse/mode');
    const unsubscribeMode = onValue(modeRef, (snapshot) => {
      const val = snapshot.val();
      if (val === 'A' || val === 'O' || val === 'C') setMode(val as Mode);
    });
    return () => unsubscribeMode();
  }, []);

  // Listen to dynamic threshold
  useEffect(() => {
    const thresholdRef = ref(database, 'greenhouse/threshold');
    const unsubscribeThreshold = onValue(thresholdRef, (snapshot) => {
      const val = snapshot.val();
      if (typeof val === 'number') setThreshold(val);
    });
    return () => unsubscribeThreshold();
  }, []);

  // Listen to hardware vent state (ACK)
  useEffect(() => {
    const ventRef = ref(database, 'greenhouse/vent_state');
    const unsubscribeVent = onValue(ventRef, (snapshot) => {
      const val = snapshot.val();
      if (val === 'OPEN' || val === 'CLOSED') setVentState(val as VentState);
    });
    return () => unsubscribeVent();
  }, []);

  // Bridge Heartbeat (Offline Detection)
  useEffect(() => {
    let lastSeen = Date.now();
    
    // Listen to explicit bridge_status
    const statusRef = ref(database, 'greenhouse/bridge_status');
    const unsubStatus = onValue(statusRef, (snapshot) => {
      if (snapshot.val() === 'OFFLINE') setIsBridgeOnline(false);
    });

    // Listen to continuous heartbeat timestamps
    const seenRef = ref(database, 'greenhouse/last_seen');
    const unsubSeen = onValue(seenRef, (snapshot) => {
      const val = snapshot.val();
      if (typeof val === 'number') {
        lastSeen = val;
        setIsBridgeOnline(true);
      }
    });

    // Interval to check if heartbeat has gone stale (>35 seconds)
    const interval = setInterval(() => {
      if (Date.now() - lastSeen > 35000) {
        setIsBridgeOnline(false);
      }
    }, 5000);

    return () => {
      unsubStatus();
      unsubSeen();
      clearInterval(interval);
    };
  }, []);

  // Listen to telemetry history
  useEffect(() => {
    const historyRef = ref(database, 'greenhouse/telemetry_history');
    const unsubscribeHistory = onValue(historyRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const parsed: HistoryData[] = Object.values(data);
        setHistory(parsed.slice(-20)); // Keep last 20 points
      }
    });
    return () => unsubscribeHistory();
  }, []);

  const updateMode = async (newMode: Mode) => {
    setMode(newMode);
    try {
      await set(ref(database, 'greenhouse/mode'), newMode);
    } catch (error) {
      console.error('Failed to update mode in Firebase:', error);
    }
  };

  const updateThreshold = async (newThreshold: number) => {
    setThreshold(newThreshold);
    try {
      await set(ref(database, 'greenhouse/threshold'), newThreshold);
    } catch (error) {
      console.error('Failed to update threshold in Firebase:', error);
    }
  };

  return { tempLM35, tempDHT, humidity, mode, updateMode, threshold, updateThreshold, ventState, history, isBridgeOnline, power };
}
