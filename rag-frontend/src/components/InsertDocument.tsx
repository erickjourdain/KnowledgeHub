import { useRef, useState } from "react";
import { useSetAtom } from "jotai";
import { useRouter } from "@tanstack/react-router";
import { Box, Button, Chip, IconButton, Typography } from "@mui/material";
import FileUploadRoundedIcon from '@mui/icons-material/FileUploadRounded';
import { jobIngestionIdsAtom, updateJobIngestionAtom } from '@store/jobIngestionStore';
import { startDocumentInsertion } from '@api/collections';
import type { CollectionDetail } from "@appTypes/Collection";
import InsertionList from "./InsertionList";

type InsertDocumentProps = {
  collection: CollectionDetail
}

function InsertDocument({ collection }: InsertDocumentProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();
  const setJobIngestionIds = useSetAtom(jobIngestionIdsAtom);
  const updateJobIngestion = useSetAtom(updateJobIngestionAtom);
  const [files, setFiles] = useState<FileList | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleInsert = async () => {
    setIsLoading(true);
    if (files !== null) {
      for (const file of Array.from(files)) {
        const job = await startDocumentInsertion(String(collection.id), file);
        setJobIngestionIds(prev => [...prev, job.job_id]);
        updateJobIngestion({
          job_id: job.job_id,
          filename: file.name,
          status: job.status,
          type: 'ingestion',
          step: null,
          message: null,
          progress: 0,
          collection_id: Number(collection.id)
        })
      }
    }
    setFiles(null);
    setIsLoading(false);
    router.invalidate()
  }

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFiles(event.target.files);
  }

  const handleClick = () => {
    if (inputRef.current !== null) {
      inputRef.current.click()
    }
  }

  return (
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
      <Box
        sx={{ width: '100%', height: '150px' }}
        mb={2}
        border='dashed'
        display='flex'
        alignItems='center'
        justifyContent='center'
        flexDirection='column'
      >
        <IconButton onClick={handleClick}>
          <FileUploadRoundedIcon fontSize='large' sx={{ zIndex: -1 }} />
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.docx"
            onChange={(e) => handleChange(e)}
            multiple
            style={{
              height: 1,
              width: 1,
              overflow: 'hidden',
              position: 'absolute',
              bottom: 0,
              left: 0,
            }}
          />
        </IconButton>
        <Typography>Sélectionner ou déposer un fichier</Typography>
      </Box>
      <Box sx={{ mb: 2 }}>
        {
          files && Array.from(files).map((file, ind) => (
            <Chip label={file.name} key={`file-${ind}`} sx={{ mr: 2 }} />
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
  )
}

export default InsertDocument;