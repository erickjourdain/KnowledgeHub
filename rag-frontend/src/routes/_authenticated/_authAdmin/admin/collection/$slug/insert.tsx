import { useEffect, useState } from 'react';
import { createFileRoute, useLoaderData, useRouter } from '@tanstack/react-router';
import Dropzone from 'react-dropzone'
import { useAtom, useSetAtom } from 'jotai';
import { Box, Button, Chip, Grid, Paper, Typography } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InsertionList from '@components/InsertionList';
import AdminPageHeader from '@components/AdminPageHeader';
import {
  jobIngestionIdsAtom,
  jobIngestionUpdatedAtom,
  updateJobIngestionAtom
} from '@store/jobIngestionStore';
import { startDocumentInsertion } from '@api/collections';
import { fetchFinishedIngestionJobCollection } from '@api/jobs';
import { useQueryClient } from '@tanstack/react-query';
import type { IngestionJob } from '@appTypes/Job';

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/collection/$slug/insert',
)({
  loader: async ({ params: { slug }, context: { queryClient } }) => {
    return await queryClient.ensureQueryData({
      queryKey: ['finishedIngestionJobs', slug],
      queryFn: () => fetchFinishedIngestionJobCollection(slug)
    }) as IngestionJob[];
  },
  component: RouteComponent,
})

function RouteComponent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const collection = useLoaderData({
    from: '/_authenticated/_authAdmin/admin/collection/$slug'
  });
  const setJobIds = useSetAtom(jobIngestionIdsAtom);
  const updateJob = useSetAtom(updateJobIngestionAtom);
  const [jobIngestionUpdated, setJobIngestionUpdated] =
    useAtom(jobIngestionUpdatedAtom);
  const [files, setFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (jobIngestionUpdated) {
      queryClient.resetQueries({
        queryKey: ['finishedIngestionJobs', collection.slug]
      });
      queryClient.resetQueries({
        queryKey: ['collections', collection.slug]
      });
      queryClient.resetQueries({
        queryKey: ['collections', { slug: collection.slug }]
      });
      queryClient.resetQueries({
        queryKey: ['collections', collection.slug, 'documents']
      });
      setJobIngestionUpdated(false);
      router.invalidate();
    }
  }, [jobIngestionUpdated])

  const handleInsert = async () => {
    setIsLoading(true);
    if (files !== null) {
      for (const file of Array.from(files)) {
        const job = await startDocumentInsertion(String(collection.id), file);
        setJobIds(prev => [...prev, job.job_id]);
        updateJob({
          job_id: job.job_id,
          type: 'ingestion',
          filename: file.name,
          status: job.status,
          step: null,
          message: null,
          progress: 0,
          collection_id: Number(collection.id)
        })
      }
    }
    setFiles([]);
    setIsLoading(false);
  }

  const handleChange = (file: File[]) => {
    setFiles([...files, ...file]);
  }

  const handleDelete = (index: number) => {
    setFiles(files.filter((_, ind) => ind !== index));
  }

  return (
    <Grid size={8} pt={2}>
      <AdminPageHeader 
        title="Insérer document" 
        icon={<UploadFileIcon />} 
      />
      <Paper variant='outlined' sx={{ p: 3, mb: 3, borderRadius: 2, backgroundColor: 'action.hover', borderColor: 'info.main', display: 'flex', gap: 2 }}>
        <InfoOutlinedIcon color='info' sx={{ fontSize: 28 }} />
        <Box>
          <Typography variant='subtitle1' fontWeight='bold' mb={0.5}>Comment ça fonctionne ?</Typography>
          <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.6 }}>
            Sélectionnez des fichiers PDF ou Word à insérer dans la base de connaissances en les glissant-déposant ci-dessous, ou en cliquant sur l'icône "Upload".
            Une fois les fichiers sélectionnés, cliquez sur le bouton "INSÉRER" pour lancer le traitement. Les documents sont envoyés pour traitement, ce qui peut prendre quelques minutes selon le nombre de pages et le nombre de documents.
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mt: 1, fontWeight: 500, lineHeight: 1.6 }}>
            💡 <b>Note :</b> Les documents Word (.docx) sont automatiquement convertis au format PDF avant leur intégration dans la base de connaissances. Cela garantit un affichage direct optimal dans le navigateur et un accès ciblé à la page exacte de chaque extrait de source.
          </Typography>
        </Box>
      </Paper>
      <Paper
        variant="outlined"
        sx={{
          p: 3,
          mb: 3,
          borderRadius: 2,
          background: 'linear-gradient(180deg, rgba(245, 158, 11, 0.02) 0%, rgba(15, 23, 42, 0.45) 100%)',
          borderColor: 'rgba(245, 158, 11, 0.25)',
          display: 'flex',
          gap: 2
        }}
      >
        <WarningAmberIcon sx={{ color: '#f59e0b', fontSize: 28 }} />
        <Box>
          <Typography variant='subtitle1' fontWeight='bold' sx={{ color: '#f59e0b' }} mb={0.5}>
            Recommandations importantes
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ mb: 1, lineHeight: 1.6 }}>
            Pour obtenir des réponses pertinentes, vos fichiers doivent avoir une structure textuelle claire. Les PDF issus de présentations PowerPoint, par exemple, manquent de repères sémantiques et ne peuvent pas être correctement interprétés par l'extracteur.
          </Typography>
          <Typography variant='body2' color='text.secondary' sx={{ lineHeight: 1.6 }}>
            De plus, veuillez noter que <b>le système est configuré et optimisé pour le traitement de textes en français</b>.
          </Typography>
        </Box>
      </Paper>
      <Box
        component='section'
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        <Dropzone
          onDrop={(acceptedFiles) => handleChange(acceptedFiles)}
          accept={{
            'application/pdf': ['.pdf'],
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
          }}
          multiple
        >
          {({ getRootProps, getInputProps }) => (
            <Box
              {...getRootProps({ className: 'dropzone' })}
              sx={{
                border: '2px dashed',
                borderColor: 'primary.main',
                borderRadius: 1,
                p: 2,
                width: '100%',
                textAlign: 'center',
                cursor: 'pointer',
              }}
            >
              <input {...getInputProps()} />
              <FileUploadIcon color='primary' sx={{ fontSize: 40 }} />
              <Typography variant='body1'>
                Glisser-déposer les fichiers ici, ou cliquer pour sélectionner les fichiers
              </Typography>
            </Box>
          )}
        </Dropzone>
        <Box sx={{ mt: 2, mb: 2 }}>
          {
            files && Array.from(files).map((file, ind) => (
              <Chip
                key={`file-${ind}`}
                label={file.name}
                sx={{ mr: 2 }}
                onDelete={() => handleDelete(ind)}
              />
            ))
          }
        </Box>
        <Button
          color='primary'
          variant='contained'
          disabled={isLoading || files === null || files.length === 0}
          onClick={handleInsert}
        >
          insérer
        </Button>
        {
          isLoading &&
          <Typography variant='body2' color='secondary' mt={2}>
            Chargement en cours ...
          </Typography>
        }
        <InsertionList />
      </Box>
    </Grid>
  )
}
