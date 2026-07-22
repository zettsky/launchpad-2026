import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getDeviceId } from '../services/deviceId';
import { api } from '../services/api';
import { getSocket, joinSessionRoom } from '../services/socket';

const SessionContext = createContext(null);

export function SessionProvider({ children }) {
  const [deviceId, setDeviceId] = useState(null);
  const [code, setCode] = useState(null);
  const [memberId, setMemberId] = useState(null);
  const [isHost, setIsHost] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [hasSubmittedPreferences, setHasSubmittedPreferences] = useState(false);

  const codeRef = useRef(null);
  codeRef.current = code;

  useEffect(() => {
    getDeviceId().then(setDeviceId);
  }, []);

  const refreshSnapshot = useCallback(async (targetCode = codeRef.current) => {
    if (!targetCode) return;
    const data = await api.getSnapshot(targetCode);
    setSnapshot(data);
    return data;
  }, []);

  const startSession = useCallback(({ code: newCode, memberId: newMemberId, host }) => {
    setCode(newCode);
    setMemberId(newMemberId);
    setIsHost(host);
    setHasSubmittedPreferences(false);
  }, []);

  const resetSession = useCallback(() => {
    setCode(null);
    setMemberId(null);
    setIsHost(false);
    setSnapshot(null);
    setHasSubmittedPreferences(false);
  }, []);

  useEffect(() => {
    if (!code) return undefined;

    joinSessionRoom(code);
    refreshSnapshot(code);

    const socket = getSocket();
    const onAnyUpdate = () => refreshSnapshot(code);
    const events = [
      'member:joined',
      'preferences:count',
      'meeting-point:set',
      'candidates:ready',
      'swipe:cast',
      'session:decided',
      'matching:error',
    ];
    events.forEach((event) => socket.on(event, onAnyUpdate));

    return () => {
      events.forEach((event) => socket.off(event, onAnyUpdate));
    };
  }, [code, refreshSnapshot]);

  const value = {
    deviceId,
    code,
    memberId,
    isHost,
    snapshot,
    hasSubmittedPreferences,
    setHasSubmittedPreferences,
    startSession,
    resetSession,
    refreshSnapshot,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within a SessionProvider');
  return ctx;
}
