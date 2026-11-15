import { createContext, useContext } from 'react';

export const BackendStatusContext = createContext({
  status: 'connecting', // 'connecting' | 'live' | 'offline'
  lastSync: null,
  checkConnection: () => {},
  reportSuccess: () => {},
  reportFailure: () => {}
});

export function useBackendStatus() {
  return useContext(BackendStatusContext);
}

export default BackendStatusContext;

