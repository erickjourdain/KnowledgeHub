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
  updateJobIngestionAtom,
} from "@store/jobIngestionStore";
import {
  jobReindexFinishedIdsAtom,
  jobReindexIdsAtom,
  updateJobReindexAtom,
} from "@store/jobReindexStore";

import { jobQueryAtom } from "@store/jobQueryStore";
import type { JobDocument, JobInfoStatut } from "@appTypes/Job";
import { fecthIngestionJob } from "@api/jobs";

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
  const [jobReindexIds, setJobReindexIds] = useAtom(jobReindexIdsAtom);
  const setJobReindexFinishedIds = useSetAtom(jobReindexFinishedIdsAtom);
  const [jobQuery, setJobQuery] = useAtom(jobQueryAtom);
  const updateJobIngestion = useSetAtom(updateJobIngestionAtom);
  const updateJobReindex = useSetAtom(updateJobReindexAtom);
  const setJobIngestionUpdated = useSetAtom(jobIngestionUpdatedAtom);
  const updateReindexJob = useSetAtom(updateJobReindexAtom);
  const updateReindexFinishedJob = useSetAtom(updateJobReindexAtom);
  const token = useAtomValue(tokenAtomStorage);

  // Refs to always have the latest IDs inside the ws.onmessage closure
  const jobIngestionIdsRef = useRef<string[]>(jobIngestionIds);
  const jobReindexIdsRef = useRef<string[]>(jobReindexIds);
  // Sync refs when atom values change
  useEffect(() => { jobIngestionIdsRef.current = jobIngestionIds; }, [jobIngestionIds]);
  useEffect(() => { jobReindexIdsRef.current = jobReindexIds; }, [jobReindexIds]);

  const [retryCount, setRetryCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);

  // Connexion WebSocket
  useEffect(() => {
    if (token === null) {
      console.log("WebSocket: token is null, skipping connection");
      return;
    }

    const wsUrl = `ws:${import.meta.env.VITE_API_URL?.replace('/api', '')}/ws/jobs?token=${token}`;
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
      // Reindex jobs subscription
      jobReindexIds.forEach((jobReindexId) => {
        console.log(`souscription au job (reindex): ${jobReindexId}`);
        ws.send(JSON.stringify({ action: "subscribe", job_id: jobReindexId }));
        subscribedJobsRef.current.add(jobReindexId);
      });
      if (jobQuery) {
        console.log(`souscription jobQuery: ${jobQuery.job_id}`);
        ws.send(JSON.stringify({ action: "subscribe", job_id: jobQuery.job_id }));
        subscribedJobsRef.current.add(jobQuery.job_id);
      }
    };

    ws.onmessage = async (event) => {
      const data: JobDocument | JobInfoStatut = JSON.parse(event.data);
      console.log(`message du job: ${data.job_id}`);
      // Use refs to access the latest job ID lists
      if (jobIngestionIdsRef.current.includes(data.job_id)) {
        if (data.progress === 100) {
          setJobIngestionIds((prev) => prev.filter((id) => id !== data.job_id));
          setJobIngestionUpdated(true);
        }
        updateJobIngestion(data);
      } else if (jobReindexIdsRef.current.includes(data.job_id)) {
        // Démarrage du job de réindexation
        if (data.status === "started" && data.progress === 0) {
          // Recherche des informations sur le job
          const response = await fecthIngestionJob(data.job_id);
          updateReindexJob({
            ...data,
            filename: response.filename,
          });
        }
        // Fin du job de réindexation
        if (data.progress === 100) {
          // Suppression de la liste des jobs en cours
          setJobReindexIds((prev) => prev.filter((id) => id !== data.job_id));
          // Ajout à la liste des jobs terminés
          setJobReindexFinishedIds((prev) => [...prev, data.job_id]);
          // Mise à jour des informations du job terminé
          const response = await fecthIngestionJob(data.job_id);
          updateReindexFinishedJob({
            ...data,
            filename: response.filename,
          });
        }
        updateJobReindex(data);
        console.log('Updated reindex store for job', data.job_id, data);
      } else if (data.type === 'query') {
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
    jobReindexIds.forEach((jobReindexId) => {
      if (!currentSubs.has(jobReindexId)) {
        ws.send(JSON.stringify({ action: "subscribe", job_id: jobReindexId }));
        currentSubs.add(jobReindexId);
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
      const isIngestion = jobIngestionIds.includes(jobId);
      const isReindex = jobReindexIds.includes(jobId);
      const isQuery = jobQuery && jobQuery.job_id === jobId;
      if (!isIngestion && !isReindex && !isQuery) {
        ws.send(JSON.stringify({ action: "unsubscribe", job_id: jobId }));
        currentSubs.delete(jobId);
      }
    });
  }, [jobIngestionIds, jobReindexIds, jobQuery, isConnected]);

  return (
    <WSContext.Provider value={{ socket: socketRef.current }}>
      {children}
    </WSContext.Provider>
  )
}

export function useWebSocket() {
  return useContext(WSContext)
}