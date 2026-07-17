import { useState } from 'react';
import { createFileRoute, useLoaderData } from '@tanstack/react-router';
import { useAtom, useSetAtom, useAtomValue } from 'jotai';
import {
  Box,
  Button,
  Grid,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  List,
  ListItem,
  Paper,
  LinearProgress
} from '@mui/material';
import AutorenewIcon from '@mui/icons-material/Autorenew';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { reindexCollection } from '@api/collections';
import AdminPageHeader from '@components/AdminPageHeader';
import type { JobInfoStatut } from '@appTypes/Job';
import {
  jobReindexIdsAtom,
  updateJobReindexAtom,
  jobReindexListAtom,
  finishedJobCountAtom,
  jobReindexFinishedIdsAtom
} from '@store/jobReindexStore';
import { jobIngestionIdsAtom } from '@store/jobIngestionStore';
import JobReindexItemStatus from '@components/JobReindexItemStatus';

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/collection/$id/reindex',
)({
  component: RouteComponent,
});

function RouteComponent() {
  const collection = useLoaderData({
    from: '/_authenticated/_authAdmin/admin/collection/$id'
  });

  const [jobIds, setJobIds] = useAtom(jobReindexIdsAtom);
  const updateJob = useSetAtom(updateJobReindexAtom);
  const setJobReindexFinishedIds = useSetAtom(jobReindexFinishedIdsAtom);

  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const finishedJobCount = useAtomValue(finishedJobCountAtom);
  const jobReindexList = useAtomValue(jobReindexListAtom);

  const ingestionIds = useAtomValue(jobIngestionIdsAtom);
  const isOperationInProgress = ingestionIds.length > 0 || jobIds.length > 0;

  const handleLaunchReindex = async () => {
    setIsLoading(true);
    setIsDialogOpen(false);
    setJobReindexFinishedIds([]);
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
      <AdminPageHeader 
        title="Réindexer" 
        icon={<AutorenewIcon />} 
      />

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
      {ingestionIds.length > 0 && (
        <Paper
          variant="outlined"
          sx={{
            p: 2,
            mb: 3,
            borderRadius: 2,
            backgroundColor: 'rgba(211, 47, 47, 0.08)',
            borderColor: 'error.main',
            display: 'flex',
            alignItems: 'center',
            gap: 1.5
          }}
        >
          <InfoOutlinedIcon color="error" />
          <Typography variant="body2" color="error.main" fontWeight="medium">
            La réindexation de la collection est désactivée car une indexation de document est actuellement en cours.
          </Typography>
        </Paper>
      )}

      <Box sx={{ mb: 4 }}>
        <Button
          color='primary'
          variant='contained'
          startIcon={<AutorenewIcon />}
          disabled={isLoading || isOperationInProgress}
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
        <Box sx={{ width: '100%', mb: 2, background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', borderRadius: 2, p: 1 }}>
          <Typography variant="body2" sx={{ mb: 0.5 }}>
            {`Réindexation : ${finishedJobCount} / ${finishedJobCount + jobIds.length} fichiers`}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={(finishedJobCount + jobIds.length) > 0 ? (finishedJobCount / (finishedJobCount + jobIds.length)) * 100 : 0}
            sx={{ height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.2)' }}
          />
        </Box>
        <List sx={{ width: '100%' }}>
          {jobReindexList.filter((job) => job.status !== 'queued').map((job) => (
            <ListItem key={job.job_id} divider sx={{ '&:hover': { backgroundColor: 'rgba(255,255,255,0.08)' } }}>
              <JobReindexItemStatus jobId={job.job_id} />
            </ListItem>
          ))}
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
