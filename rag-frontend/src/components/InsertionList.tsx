import { useLoaderData } from "@tanstack/react-router";
import { ListItem, ListItemIcon, ListItemText, Typography } from "@mui/material";
import { useAtomValue } from "jotai";
import React from "react";
import dayjs from "dayjs";
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import JobItemStatus from "@components/JobItemStatus";
import { jobIngestionIdsAtom } from "@store/jobIngestionStore";
import type { IngestionJob } from "@appTypes/Job";

function InsertionList() {
  const finishedIngestionJobs = useLoaderData({
    from: '/_authenticated/_authAdmin/admin/collection/$slug/insert'
  }) as IngestionJob[];
  const jobIds = useAtomValue(jobIngestionIdsAtom)

  return (
    <React.Fragment>
      <Typography variant="h6" sx={{ mt: 2 }}>Traitement en cours</Typography>
      {
        jobIds.length === 0 && (
          <ListItem>
            <ListItemText primary="Aucun document en attente" />
          </ListItem>
        )
      }
      {
        jobIds.map((jobId) => (
          <ListItem key={jobId}>
            <JobItemStatus jobId={jobId} />
          </ListItem>
        ))
      }
      <Typography variant="h6" sx={{ mt: 2 }}>Traitement terminée</Typography>
      {
        finishedIngestionJobs.map((job: IngestionJob) => (
          <ListItem disablePadding key={job.uuid}>
            <ListItemIcon>
              {
                job.status === 'finished' ? 
                  <CheckIcon color="success" /> : 
                  <CloseIcon color="error" />
              }
            </ListItemIcon>
            <ListItemText
              primary={job.filename}
              secondary={`${job.status} le ${dayjs(job.created_at).format('DD/MM/YYYY à HH:mm')}`}
            />
          </ListItem>
        ))
      }
    </React.Fragment>
  )
}

export default InsertionList;