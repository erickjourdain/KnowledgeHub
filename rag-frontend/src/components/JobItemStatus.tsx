import { useAtomValue } from "jotai";
import React, { useEffect, useState } from "react";
import { LinearProgress, ListItemText } from "@mui/material";
import { jobIngestionAtomFamily } from "../store/jobIngestionStore";
import dayjs from "dayjs";

type JobStatusProps = {
  jobId: string
}

function JobItemStatus({ jobId }: JobStatusProps) {
  const job = useAtomValue(jobIngestionAtomFamily(jobId));
  const [finishedAt, setFinishedAt] = useState<Date | null>(null);
  const [etat, setEtat] = useState<string>("");

  useEffect(() => {
    switch (job.status) {
      case 'queued':
        setEtat('en attente');
        break;
      case 'started':
        setEtat(`${job.message}`);
        break;
      case 'finished':
        if (finishedAt) break;
        setFinishedAt(dayjs().toDate());
        setEtat(`terminé à ${dayjs(finishedAt).format('HH:mm:ss')}`);
        break;
      case 'failed':
        setEtat('Erreur lors du traitement');
        break;
      case 'stopped':
        setEtat('Traitement arrêté');
        break;
      case 'canceled':
        setEtat('Traitement annulé');
        break;
      default:
        setEtat('état inconnu');
        break;
    }
  }, [job]);

  if (!job) return null;

  return (
    <ListItemText
      primary={job.filename}
      secondary={
        <React.Fragment>
          {etat}<br />
          {
            job.status === 'started' &&
            <LinearProgress color="secondary" />
          }
        </React.Fragment>
      }
    />
  )
}

export default JobItemStatus;