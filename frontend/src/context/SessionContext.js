import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { getDeviceId } from '../services/deviceId';
import { api } from '../services/api';
import { getSocket, joinSessionRoom } from '../services/socket';
import { getStoredSession, setStoredSession, clearStoredSession } from '../services/activeSession';

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

  useEffect(() => {
    getStoredSession().then((stored) => {
      if (stored?.code && stored?.memberId) {
        setCode(stored.code);
        setMemberId(stored.memberId);
        setIsHost(!!stored.host);
      }
    });
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
    setStoredSession({ code: newCode, memberId: newMemberId, host });
  }, []);

  const resetSession = useCallback(() => {
    setCode(null);
    setMemberId(null);
    setIsHost(false);
    setSnapshot(null);
    setHasSubmittedPreferences(false);
    clearStoredSession();
  }, []);

  useEffect(() => {
    if (!code) return undefined;

    joinSessionRoom(code);
    refreshSnapshot(code).catch(() => resetSession());

    const socket = getSocket();
    const onAnyUpdate = () => refreshSnapshot(code).catch(() => {});
    const onSessionReset = () => {
      setHasSubmittedPreferences(false);
      refreshSnapshot(code).catch(() => {});
    };
    const genericEvents = [
      'member:joined',
      'preferences:count',
      'meeting-point:set',
      'candidates:ready',
      'swipe:cast',
      'session:decided',
      'matching:error',
    ];
    genericEvents.forEach((event) => socket.on(event, onAnyUpdate));
    socket.on('session:reset', onSessionReset);

    return () => {
      genericEvents.forEach((event) => socket.off(event, onAnyUpdate));
      socket.off('session:reset', onSessionReset);
    };
  }, [code, refreshSnapshot, resetSession]);

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
