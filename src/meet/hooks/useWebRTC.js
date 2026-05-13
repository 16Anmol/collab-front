import { useRef, useState, useCallback, useEffect } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export function useWebRTC({ roomId, myName, onChat, onReaction, onRaiseHand }) {
  const [peers, setPeers] = useState({}); // peer_id → { name, stream, audio, video, screen, handRaised }
  const [myPeerId, setMyPeerId] = useState(null);
  const [wsState, setWsState] = useState('connecting'); // connecting | open | closed
  const [isHost, setIsHost] = useState(false);
  const [waitingState, setWaitingState] = useState(null); // null | 'waiting' | 'denied' | 'ended'
  const [admissionQueue, setAdmissionQueue] = useState([]); // [{peer_id, name}]

  const wsRef = useRef(null);
  const pcsRef = useRef({}); // peer_id → RTCPeerConnection
  const localStreamRef = useRef(null);
  const origCamTrackRef = useRef(null); // stores original camera track for restoring after screen share
  const pendingCandidates = useRef({}); // peer_id → [candidates before remote desc]

  // ── helpers ─────────────────────────────────────────────────────────────

  const send = useCallback((msg) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(msg));
    }
  }, []);

  const updatePeer = useCallback((peerId, patch) => {
    setPeers(prev => ({
      ...prev,
      [peerId]: { ...prev[peerId], ...patch },
    }));
  }, []);

  const removePeer = useCallback((peerId) => {
    pcsRef.current[peerId]?.close();
    delete pcsRef.current[peerId];
    setPeers(prev => {
      const next = { ...prev };
      delete next[peerId];
      return next;
    });
  }, []);

  // ── create peer connection ───────────────────────────────────────────────

  const createPC = useCallback((peerId, polite) => {
    if (pcsRef.current[peerId]) return pcsRef.current[peerId];

    const pc = new RTCPeerConnection(ICE_SERVERS);
    pcsRef.current[peerId] = pc;

    // Always add a video transceiver so replaceTrack works for screen share
    // even when no camera is available
    const hasLocalStream = localStreamRef.current && localStreamRef.current.getTracks().length > 0;
    if (hasLocalStream) {
      localStreamRef.current.getTracks().forEach(t => pc.addTrack(t, localStreamRef.current));
    } else {
      // No camera/mic - add a sendrecv transceiver anyway so screen share can replaceTrack later
      pc.addTransceiver('video', { direction: 'sendrecv' });
      pc.addTransceiver('audio', { direction: 'sendrecv' });
    }

    // Remote stream handling
    let remoteStream = new MediaStream();
    pc.ontrack = e => {
      if (!e.track) return;
      console.log('[WebRTC] ontrack fired:', e.track.kind, 'readyState:', e.track.readyState, 'from peer:', peerId);

      // Remove existing track of same kind and add new one
      remoteStream.getTracks()
        .filter(t => t.kind === e.track.kind)
        .forEach(t => remoteStream.removeTrack(t));
      remoteStream.addTrack(e.track);

      updatePeer(peerId, { stream: new MediaStream(remoteStream.getTracks()) });

      e.track.onmute = e.track.onunmute = () => {
        updatePeer(peerId, { stream: new MediaStream(remoteStream.getTracks()) });
      };
      e.track.onended = () => {
        remoteStream.removeTrack(e.track);
        updatePeer(peerId, { stream: new MediaStream(remoteStream.getTracks()) });
      };
    };

    // ICE
    pc.onicecandidate = e => {
      if (e.candidate) {
        send({ type: 'ice-candidate', target: peerId, candidate: e.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') removePeer(peerId);
    };

    // Drain pending candidates
    pc.onsignalingstatechange = async () => {
      if (pc.signalingState === 'stable' && pendingCandidates.current[peerId]) {
        for (const c of pendingCandidates.current[peerId]) {
          try { await pc.addIceCandidate(c); } catch {}
        }
        delete pendingCandidates.current[peerId];
      }
    };

    // Negotiate - both polite and impolite peers need to handle onnegotiationneeded
    // Polite peer negotiates freely; impolite peer only negotiates if signaling is stable
    pc.onnegotiationneeded = async () => {
      try {
        if (!polite && pc.signalingState !== 'stable') return; // impolite: wait for stability
        const offer = await pc.createOffer();
        if (pc.signalingState !== 'stable') return; // check again after async
        await pc.setLocalDescription(offer);
        send({ type: 'offer', target: peerId, sdp: pc.localDescription });
      } catch (e) { console.warn('[WebRTC] onnegotiationneeded error:', e); }
    };

    return pc;
  }, [send, updatePeer, removePeer]);

  // ── signaling message handler ────────────────────────────────────────────

  const handleMessage = useCallback(async (msg) => {
    switch (msg.type) {

      case 'joined': {
        setMyPeerId(msg.peer_id);
        // First/only person in room OR explicitly told by server = HOST
        const iAmHost = msg.is_host === true || !msg.members || msg.members.length === 0;
        setIsHost(iAmHost);
        setWaitingState(null);
        // Initiate connections to all existing members
        for (const member of (msg.members || [])) {
          updatePeer(member.peer_id, { name: member.name, stream: null });
          const pc = createPC(member.peer_id, true);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          send({ type: 'offer', target: member.peer_id, sdp: pc.localDescription });
        }
        break;
      }

      case 'waiting': {
        setWaitingState('waiting');
        break;
      }

      case 'denied': {
        setWaitingState('denied');
        break;
      }

      case 'meeting_ended': {
        setWaitingState('ended');
        localStreamRef.current?.getTracks().forEach(t => t.stop());
        break;
      }

      case 'admission_request': {
        setAdmissionQueue(prev => [...prev, { peer_id: msg.peer_id, name: msg.name }]);
        break;
      }

      case 'peer_joined': {
        updatePeer(msg.peer_id, { name: msg.name, stream: null });
        createPC(msg.peer_id, false);
        break;
      }

      case 'peer_left': {
        removePeer(msg.peer_id);
        break;
      }

      case 'offer': {
        // Use existing PC if available (renegotiation), create new one if first time
        const existingPc = pcsRef.current[msg.from];
        const pc = existingPc || createPC(msg.from, false);
        await pc.setRemoteDescription(msg.sdp);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        send({ type: 'answer', target: msg.from, sdp: pc.localDescription });
        break;
      }

      case 'answer': {
        const pc = pcsRef.current[msg.from];
        if (pc) await pc.setRemoteDescription(msg.sdp);
        break;
      }

      case 'ice-candidate': {
        const pc = pcsRef.current[msg.from];
        if (!pc) return;
        if (pc.remoteDescription) {
          try { await pc.addIceCandidate(msg.candidate); } catch {}
        } else {
          if (!pendingCandidates.current[msg.from]) pendingCandidates.current[msg.from] = [];
          pendingCandidates.current[msg.from].push(msg.candidate);
        }
        break;
      }

      case 'chat': onChat?.(msg); break;
      case 'reaction': onReaction?.(msg); break;
      case 'raise-hand': onRaiseHand?.(msg); break;

      case 'media-state': {
        updatePeer(msg.from, {
          audio: msg.audio,
          video: msg.video,
          screen: msg.screen,
        });
        break;
      }

      default: break;
    }
  }, [createPC, send, updatePeer, removePeer, onChat, onReaction, onRaiseHand]);

  // ── connect WebSocket ────────────────────────────────────────────────────

  // Keep handleMessage in a ref so `connect` never needs to be recreated
  // when callbacks like onChat/onReaction change. Without this, connect gets
  // a new identity every render → Room's useEffect([connect]) fires again →
  // a new WebSocket + join message is sent each time (the 20-40 connections
  // seen in the server logs).
  const handleMessageRef = useRef(handleMessage);
  useEffect(() => { handleMessageRef.current = handleMessage; }, [handleMessage]);

  const connect = useCallback((stream) => {
    // Prevent double-connecting (React StrictMode mounts twice in dev)
    if (wsRef.current && wsRef.current.readyState < WebSocket.CLOSING) return;

    localStreamRef.current = stream;
    const WS_URL = import.meta.env.VITE_WEBRTC_WS_URL || `ws://${window.location.hostname}:8765`;
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      setWsState('open');
      ws.send(JSON.stringify({ type: 'join', room_id: roomId, name: myName }));
    };

    ws.onmessage = e => {
      try { handleMessageRef.current(JSON.parse(e.data)); } catch {}
    };

    ws.onclose = () => setWsState('closed');
    ws.onerror = () => setWsState('closed');
  // Intentionally omit handleMessage — we use the ref above so this callback
  // is stable for the lifetime of the component.
  }, [roomId, myName]); // eslint-disable-line

  // ── media controls ───────────────────────────────────────────────────────

  const setAudio = useCallback((enabled) => {
    localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = enabled; });
    send({ type: 'media-state', audio: enabled });
  }, [send]);

  const setVideo = useCallback((enabled) => {
    localStreamRef.current?.getVideoTracks().forEach(t => { t.enabled = enabled; });
    send({ type: 'media-state', video: enabled });
  }, [send]);

  const startScreenShare = useCallback(async () => {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { cursor: 'always', width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false,
      });
      const screenTrack = screenStream.getVideoTracks()[0];

      // Save the original camera track so we can restore it later
      const camTrack = localStreamRef.current?.getVideoTracks()[0] || null;
      origCamTrackRef.current = camTrack;

      // Update localStreamRef so PeerConnections use screen track
      if (localStreamRef.current) {
        // Remove old video tracks, add screen track
        localStreamRef.current.getVideoTracks().forEach(t => localStreamRef.current.removeTrack(t));
        localStreamRef.current.addTrack(screenTrack);
      }

      // Replace video track in every peer connection using replaceTrack
      // (transceivers are always present due to createPC guaranteeing them)
      for (const [peerId, pc] of Object.entries(pcsRef.current)) {
        try {
          const videoSender = pc.getSenders().find(s => s.track?.kind === 'video' || s.track === null);
          if (videoSender) {
            await videoSender.replaceTrack(screenTrack);
          } else {
            // Last resort: add track and renegotiate
            pc.addTrack(screenTrack);
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            send({ type: 'offer', target: peerId, sdp: pc.localDescription });
          }
        } catch(e) { console.error('[ScreenShare] Failed for peer', peerId, e); }
      }

      send({ type: 'media-state', screen: true });
      return screenTrack;
    } catch (err) {
      if (err.name !== 'NotAllowedError') {
        console.error('Screen share error:', err);
      }
      return null;
    }
  }, [send]);

  const stopScreenShare = useCallback(async () => {
    // Restore original camera track (or get a new one if needed)
    let camTrack = origCamTrackRef.current;
    
    if (!camTrack || camTrack.readyState === 'ended') {
      // Original camera track ended - request a new one
      try {
        const newStream = await navigator.mediaDevices.getUserMedia({ video: true });
        camTrack = newStream.getVideoTracks()[0];
      } catch {
        camTrack = null;
      }
    }

    // Restore in localStreamRef
    if (localStreamRef.current && camTrack) {
      localStreamRef.current.getVideoTracks().forEach(t => localStreamRef.current.removeTrack(t));
      localStreamRef.current.addTrack(camTrack);
    }

    // Restore in all peer connections
    for (const pc of Object.values(pcsRef.current)) {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video' || s.track === null);
      if (sender) {
        await sender.replaceTrack(camTrack || null);
      }
    }

    origCamTrackRef.current = null;
    send({ type: 'media-state', screen: false });
  }, [send]);

  const sendChat = useCallback((message) => {
    send({ type: 'chat', message });
  }, [send]);

  const sendReaction = useCallback((emoji) => {
    send({ type: 'reaction', emoji });
  }, [send]);

  const sendRaiseHand = useCallback((raised) => {
    send({ type: 'raise-hand', raised });
  }, [send]);

  const admitPeer = useCallback((peerId, admit) => {
    send({ type: 'admit', peer_id: peerId, admit });
    setAdmissionQueue(prev => prev.filter(p => p.peer_id !== peerId));
  }, [send]);

  const endMeeting = useCallback(() => {
    send({ type: 'end_meeting' });
  }, [send]);

  // ── cleanup ──────────────────────────────────────────────────────────────

  useEffect(() => {
    return () => {
      wsRef.current?.close();
      Object.values(pcsRef.current).forEach(pc => pc.close());
    };
  }, []);

  return {
    peers,
    myPeerId,
    wsState,
    localStreamRef,
    connect,
    setAudio,
    setVideo,
    startScreenShare,
    stopScreenShare,
    isHost, waitingState, admissionQueue, admitPeer, endMeeting,
    sendChat,
    sendReaction,
    sendRaiseHand,
  };
}
