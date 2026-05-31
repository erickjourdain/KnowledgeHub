import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState
} from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { tokenAtomStorage } from "@store/authStore";
import {
  jobIngestionIdsAtom,
  jobIngestionUpdatedAtom,
  updateJobIngestionAtom
} from "@store/jobIngestionStore";
import { jobQueryAtom } from "@store/jobQueryStore";
import type { JobDocument, JobInfoStatut } from "@appTypes/Job";

interface WSContextType {
  socket: WebSocket | null
}

const WSContext = createContext<WSContextType | undefined>(undefined);

export function WebSocketProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const socketRef = useRef<WebSocket | null>(null);
  const subscribedJobsRef = useRef<Set<string>>(new Set());

  const [jobIngestionIds, setJobIngestionIds] = useAtom(jobIngestionIdsAtom);
  const [jobQuery, setJobQuery] = useAtom(jobQueryAtom);
  const updateJobIngestion  = useSetAtom(updateJobIngestionAtom);
  const setJobIngestionUpdated = useSetAtom(jobIngestionUpdatedAtom);
  const token = useAtomValue(tokenAtomStorage);

  const [retryCount, setRetryCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Connexion WebSocket
  useEffect(() => {
    if (token === null) {
      console.log("WebSocket: token is null, skipping connection");
      return;
    }

    // Vérifier si VITE_API_URL est relatif (ex: /api) ou absolu (ex: //localhost:8000/api)
    const envApiUrl = import.meta.env.VITE_API_URL;
    const isRelative = envApiUrl && envApiUrl.startsWith('/') && !envApiUrl.startsWith('//');
    const apiUrl = isRelative ? `//${window.location.host}${envApiUrl}` : (envApiUrl || `//${window.location.host}/api`);
    const wsUrl = `ws:${apiUrl.replace('/api', '')}/ws/jobs?token=${token}`;
    console.log("WebSocket: attempting to connect to", wsUrl);

    const ws = new WebSocket(wsUrl);

    socketRef.current = ws;

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onopen = () => {
      console.log("WebSocket connected");
      setIsConnected(true);
      // Resubscribe aux jobs existants
      jobIngestionIds.forEach((jobIngestionId) => {
        console.log(`souscription au job: ${jobIngestionId}`);
        ws.send(JSON.stringify({ action: "subscribe", job_id: jobIngestionId }));
        subscribedJobsRef.current.add(jobIngestionId);
      });
      if (jobQuery) {
        console.log(`souscription jobQuery: ${jobQuery.job_id}`);
        ws.send(JSON.stringify({ action: "subscribe", job_id: jobQuery.job_id }));
        subscribedJobsRef.current.add(jobQuery.job_id);
      }
    };

    ws.onmessage = async (event) => {
      const data: JobDocument | JobInfoStatut = JSON.parse(event.data);
      console.log(`message du job: ${data.job_id}`)
      if (data.type === 'ingestion') {
        if (data.progress === 100) {
          // Job terminé, on supprime le job de la liste des jobs suivis
          setJobIngestionIds((prev) => prev.filter((id) => id !== data.job_id));
          // On informe de la mise à jour d'un job
          setJobIngestionUpdated(true);
        }
        updateJobIngestion(data);
      }
      if (data.type === 'query') {
        setJobQuery(data);
      }
    }

    ws.onclose = (event) => {
      console.log(`WebSocket disconnected: ${event.reason || 'no reason'}, code: ${event.code}, wasClean: ${event.wasClean}`);
      setIsConnected(false);

      const delay = Math.min(1000 * 2 ** retryCount, 10000);

      setTimeout(() => {
        setRetryCount((prev) => prev + 1);
      }, delay);
    };

    return () => {
      console.log("WebSocket cleanup");
      setIsConnected(false);
      subscribedJobsRef.current.clear();
      ws.close()
    }
  }, [token])

  // Gestion dynamique des jobs
  useEffect(() => {
    const ws = socketRef.current;
    console.log(`readyState: ${ws?.readyState}, isConnected: ${isConnected}`);
    if (!ws || !isConnected) return;

    const currentSubs = subscribedJobsRef.current;

    // Nouveaux jobs
    jobIngestionIds.forEach((jobIngestionId) => {
      if (!currentSubs.has(jobIngestionId)) {
        ws.send(JSON.stringify({ action: "subscribe", job_id: jobIngestionId }));
        currentSubs.add(jobIngestionId);
      }
    });
    if (jobQuery) {
      if (!currentSubs.has(jobQuery.job_id)) {
        ws.send(JSON.stringify({ action: "subscribe", job_id: jobQuery.job_id }));
        currentSubs.add(jobQuery.job_id);
      }
    };

    // Jobs supprimés
    currentSubs.forEach((jobId) => {
      if (!jobIngestionIds.includes(jobId) &&
        (jobQuery === null || jobQuery.job_id !== jobId)) {
        ws.send(JSON.stringify({ action: "unsubscribe", job_id: jobId }));
        currentSubs.delete(jobId);
      }
    });
  }, [jobIngestionIds, jobQuery, isConnected]);

  return (
    <WSContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </WSContext.Provider>
  )
}

export function useWebSocket() {
  return useContext(WSContext)
}
