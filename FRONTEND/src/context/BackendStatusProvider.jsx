import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getStatus } from '../api/twinApi';
import { BackendStatusContext } from './BackendStatusContext';

export function BackendStatusProvider({ children }) {
  const [status, setStatus] = useState('connecting');
  const [lastSync, setLastSync] = useState(null);
  const inFlightRef = useRef(false);

  const reportSuccess = useCallback(() => {
    setStatus('live');
    setLastSync(new Date());
  }, []);

  const reportFailure = useCallback(() => {
    setStatus('offline');
  }, []);

  const checkConnection = useCallback(async (signal) => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    try {
      await getStatus(signal);
      reportSuccess();
    } catch {
      reportFailure();
    } finally {
      inFlightRef.current = false;
    }
  }, [reportSuccess, reportFailure]);

  // Initial connection check & heartbeat when tab is visible
  useEffect(() => {
    let active = true;
    const controller = new AbortController();

    const runInitialCheck = async () => {
      if (active) {
        await checkConnection(controller.signal);
      }
    };
    void runInitialCheck();

    const interval = setInterval(() => {
      if (document.visibilityState === 'visible' && active) {
        void checkConnection(controller.signal);
      }
    }, 10000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible' && active) {
        void checkConnection(controller.signal);
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      active = false;
      controller.abort();
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [checkConnection]);

  return (
    <BackendStatusContext.Provider
      value={{
        status,
        lastSync,
        checkConnection,
        reportSuccess,
        reportFailure
      }}
    >
      {children}
    </BackendStatusContext.Provider>
  );
}

export default BackendStatusProvider;

