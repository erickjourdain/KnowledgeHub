// src/components/JobReindexItemStatus.tsx
import { useAtomValue } from "jotai";
import React, { useEffect, useState } from "react";
import { LinearProgress, ListItemText } from "@mui/material";
import { jobReindexAtomFamily } from "../store/jobReindexStore";
import dayjs from "dayjs";

type JobStatusProps = {
  jobId: string;
};

export default function JobReindexItemStatus({ jobId }: JobStatusProps) {
  const job = useAtomValue(jobReindexAtomFamily(jobId));
  const [finishedAt, setFinishedAt] = useState<Date | null>(null);
  const [etat, setEtat] = useState<string>("");

  useEffect(() => {
    if (!job) return;
    switch (job.status) {
      case "queued":
        // Hide queued jobs
        setEtat("");
        break;
      case "started":
        setEtat(`${job.message || "traitement en cours"}`);
        break;
      case "finished":
        if (finishedAt) break;
        const now = dayjs().toDate();
        setFinishedAt(now);
        setEtat(`terminé à ${dayjs(now).format("HH:mm:ss")}`);
        break;
      case "failed":
        setEtat("Erreur lors du traitement");
        break;
      case "stopped":
        setEtat("Traitement arrêté");
        break;
      case "canceled":
        setEtat("Traitement annulé");
        break;
      default:
        setEtat("état inconnu");
        break;
    }
  }, [job]);

  return (
    <ListItemText
      primary={job.filename}
      secondary={
        <React.Fragment>
          {etat}<br />
          {job.status === "started" && <LinearProgress color="secondary" />}
        </React.Fragment>
      }
    />
  );
}
