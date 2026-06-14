import { useEffect, useState } from 'react';
import { createFileRoute, useLoaderData, useRouter } from '@tanstack/react-router';
import { useAtom, useSetAtom } from 'jotai';
import {
  Box,
  Button,
  Divider,
  Grid,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper
} from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { reindexCollection } from '@api/collections';
import type { JobInfoStatut } from '@appTypes/Job';
import { fetchFinishedIngestionJobCollection } from '@api/jobs';
import {
  jobReindexIdsAtom,
  jobReindexUpdatedAtom,
  updateJobReindexAtom
} from '@store/jobReindexStore';
import type { FinishedIngestionJob } from '@appTypes/Job';
import JobReindexItemStatus from '@components/JobReindexItemStatus';

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/collection/$id/reindex',
)({
  loader: async ({ params: { id }, context: { queryClient } }) => {
    return await queryClient.ensureQueryData({
      queryKey: ['finishedIngestionJobs', id],
      queryFn: () => fetchFinishedIngestionJobCollection(id)
    }) as FinishedIngestionJob[];
  },
  component: RouteComponent,
});

function RouteComponent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const collection = useLoaderData({
    from: '/_authenticated/_authAdmin/admin/collection/$id'
  });
  const finishedJobs = useLoaderData({
    from: '/_authenticated/_authAdmin/admin/collection/$id/reindex'
  }) as FinishedIngestionJob[];

  const [jobIds, setJobIds] = useAtom(jobReindexIdsAtom);
  const updateJob = useSetAtom(updateJobReindexAtom);
  const [jobReindexUpdated, setJobReindexUpdated] = useAtom(jobReindexUpdatedAtom);

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (jobReindexUpdated) {
      queryClient.resetQueries({
        queryKey: ['finishedIngestionJobs', String(collection.id)]
      });
      queryClient.resetQueries({
        queryKey: ['collections', String(collection.id)]
      });
      setJobReindexUpdated(false);
      router.invalidate();
    }
  }, [jobReindexUpdated, collection.id, queryClient, router, setJobReindexUpdated]);

  const handleLaunchReindex = async () => {
    setIsLoading(true);
    setIsDialogOpen(false);
    try {
      const jobs: JobInfoStatut[] = await reindexCollection(String(collection.id));
      const newJobIds = jobs.map(j => j.job_id);
      setJobIds(prev => [...prev, ...newJobIds]);

      // Initialise les jobs dans le store
      jobs.forEach(job => {
        updateJob({
          job_id: job.job_id,
          type: 'ingestion',
          filename: 'Lancement du traitement...',
          status: job.status,
          step: null,
          message: null,
          progress: 0,
          collection_id: Number(collection.id)
        });
      });
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Grid size={8} pt={2}>
      <Typography variant='h6' display="flex" alignItems="center" gap={1}>
        <AutorenewIcon color="primary" /> Réindexation de la collection
      </Typography>
      <Divider sx={{ mb: 2 }} />

      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          backgroundColor: 'action.hover',
          borderColor: 'info.main',
          display: 'flex',
          gap: 2
        }}
      >
        <InfoOutlinedIcon color="info" sx={{ fontSize: 28 }} />
        <Box>
          <Typography variant='subtitle1' fontWeight='bold' mb={0.5}>
            À quoi sert la réindexation ?
          </Typography>
          <Typography variant='body2' color='text.secondary'>
            Cette opération permet de relancer l'ingestion pour l'ensemble des documents de la collection.
            Elle est particulièrement utile en cas de changement dans les configurations d'embedding,
            ou si l'indexation de certains documents a échoué.
          </Typography>
        </Box>
      </Paper>

      <Box sx={{ mb: 4 }}>
        <Button
          color='primary'
          variant='contained'
          startIcon={<AutorenewIcon />}
          disabled={isLoading || jobIds.length > 0}
          onClick={() => setIsDialogOpen(true)}
          sx={{
            px: 3,
            py: 1,
            borderRadius: 2,
            boxShadow: '0 4px 14px 0 rgba(0,0,0,0.1)',
            '&:hover': {
              transform: 'translateY(-1px)',
              boxShadow: '0 6px 20px 0 rgba(0,0,0,0.15)',
            },
            transition: 'all 0.2s ease-in-out'
          }}
        >
          Réindexer la collection
        </Button>
        {isLoading && (
          <Typography variant='body2' color='secondary' mt={2}>
            Lancement de la réindexation...
          </Typography>
        )}
      </Box>

      {/* Traitement en cours */}
      <Paper variant="outlined" sx={{ p: 2, mb: 4, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Réindexations en cours
        </Typography>
        <List sx={{ width: '100%' }}>
          {jobIds.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="Aucun travail de réindexation actif."
                slotProps={{
                  primary: {
                    color: 'text.secondary',
                    variant: 'body2'
                  }
                }}
              />
            </ListItem>
          ) : (
            jobIds.map((jobId) => (
              <ListItem key={jobId} divider>
                <JobReindexItemStatus jobId={jobId} />
              </ListItem>
            ))
          )}
        </List>
      </Paper>

      {/* Historique */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
        <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 2 }}>
          Historique de la collection
        </Typography>
        <List sx={{ width: '100%' }}>
          {finishedJobs.length === 0 ? (
            <ListItem>
              <ListItemText
                primary="Aucun traitement terminé dans l'historique."
                slotProps={{
                  primary: {
                    color: 'text.secondary',
                    variant: 'body2'
                  }
                }}
              />
            </ListItem>
          ) : (
            finishedJobs.map((job) => (
              <ListItem disablePadding key={job.uuid} sx={{ py: 1 }} divider>
                <ListItemIcon>
                  {job.status === 'finished' ? (
                    <CheckIcon color="success" />
                  ) : (
                    <CloseIcon color="error" />
                  )}
                </ListItemIcon>
                <ListItemText
                  primary={job.filename}
                  secondary={
                    job.status === 'finished'
                      ? `Terminé le ${dayjs(job.created_at).format('DD/MM/YYYY à HH:mm')}`
                      : `Échoué (${job.error || 'Erreur inconnue'}) le ${dayjs(job.created_at).format('DD/MM/YYYY à HH:mm')}`
                  }
                />
              </ListItem>
            ))
          )}
        </List>
      </Paper>

      {/* Dialogue de Confirmation */}
      <Dialog
        open={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        aria-labelledby="confirm-reindex-title"
        aria-describedby="confirm-reindex-description"
        slotProps={{
          paper: {
            sx: { borderRadius: 2, p: 1 }
          }
        }}
      >
        <DialogTitle id="confirm-reindex-title" fontWeight="bold">
          Confirmer la réindexation ?
        </DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-reindex-description">
            Voulez-vous vraiment réindexer l'ensemble des documents de la collection <b>{collection.name}</b> ?
            Cette action va recalculer tous les embeddings et peut impacter temporairement les performances des recherches.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsDialogOpen(false)} color="inherit">
            Annuler
          </Button>
          <Button onClick={handleLaunchReindex} color="primary" variant="contained" autoFocus>
            Confirmer
          </Button>
        </DialogActions>
      </Dialog>
    </Grid>
  );
}
