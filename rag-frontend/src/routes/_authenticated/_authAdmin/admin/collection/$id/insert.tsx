import { useEffect, useState } from 'react';
import { createFileRoute, useLoaderData, useRouter } from '@tanstack/react-router';
import Dropzone from 'react-dropzone'
import { useAtom, useSetAtom } from 'jotai';
import { Box, Button, Chip, Divider, Grid, Typography } from '@mui/material';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import InsertionList from '@components/InsertionList';
import { 
  jobIngestionIdsAtom, 
  jobIngestionUpdatedAtom, 
  updateJobIngestionAtom 
} from '@store/jobIngestionStore';
import { startDocumentInsertion } from '@api/collections';
import { fetchFinishedIngestionJobCollection } from '@api/jobs';
import { useQueryClient } from '@tanstack/react-query';
import type { FinishedIngestionJob } from '@appTypes/Job';

export const Route = createFileRoute(
  '/_authenticated/_authAdmin/admin/collection/$id/insert',
)({
  loader: async({ params: { id }, context: { queryClient } }) => {
    return await queryClient.ensureQueryData({
      queryKey: ['finishedIngestionJobs', id],
      queryFn: () => fetchFinishedIngestionJobCollection(id)
    }) as FinishedIngestionJob[];
  },
  component: RouteComponent,
})

function RouteComponent() {
  const queryClient = useQueryClient();
  const router = useRouter();
  const collection = useLoaderData({ 
    from: '/_authenticated/_authAdmin/admin/collection/$id'
  });
  const setJobIds = useSetAtom(jobIngestionIdsAtom);
  const updateJob = useSetAtom(updateJobIngestionAtom);
  const [jobIngestionUpdated, setJobIngestionUpdated] = 
    useAtom(jobIngestionUpdatedAtom);
  const [files, setFiles] = useState<File []>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (jobIngestionUpdated) {
      queryClient.resetQueries({
        queryKey: ['finishedIngestionJobs', String(collection.id)]
      });
      queryClient.resetQueries({ 
        queryKey: ['collections', String(collection.id)]
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
      <Typography variant='h6'>
        Insertion de documents
      </Typography>
      <Divider sx={{ mb: 2 }} />
      <Box
        component='section'
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        <Typography variant='body2' mb={2}>
          Sélectionner les fichiers pdf ou Word à insérer dans la base de connaissance.
        </Typography>
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
