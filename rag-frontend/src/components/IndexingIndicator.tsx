import { useAtomValue } from 'jotai';
import { Chip, Tooltip } from '@mui/material';
import { jobIngestionIdsAtom } from '@store/jobIngestionStore';
import { jobReindexIdsAtom } from '@store/jobReindexStore';
import AutorenewIcon from '@mui/icons-material/Autorenew';

export default function IndexingIndicator() {
  const ingestionIds = useAtomValue(jobIngestionIdsAtom);
  const reindexIds = useAtomValue(jobReindexIdsAtom);

  const totalIngestion = ingestionIds.length;
  const totalReindex = reindexIds.length;

  if (totalIngestion === 0 && totalReindex === 0) {
    return null;
  }

  let label = '';
  if (totalIngestion > 0 && totalReindex > 0) {
    label = `Indexation (${totalIngestion}) & Réindexation (${totalReindex})`;
  } else if (totalIngestion > 0) {
    label = `Indexation (${totalIngestion})`;
  } else {
    label = `Réindexation (${totalReindex})`;
  }

  const tooltipTitle = `${label} en cours. Veuillez patienter pendant le traitement des documents.`;

  return (
    <Tooltip title={tooltipTitle} arrow>
      <Chip
        icon={
          <AutorenewIcon
            sx={{
              animation: 'spin 2s linear infinite',
              '@keyframes spin': {
                '0%': {
                  transform: 'rotate(0deg)',
                },
                '100%': {
                  transform: 'rotate(360deg)',
                },
              },
            }}
          />
        }
        label={label}
        color="info"
        variant="outlined"
        sx={{
          borderRadius: '8px',
          borderColor: 'info.main',
          fontWeight: 'medium',
          animation: 'pulse 2s infinite ease-in-out',
          '@keyframes pulse': {
            '0%': {
              opacity: 0.8,
              boxShadow: '0 0 4px rgba(2, 136, 209, 0.2)',
            },
            '50%': {
              opacity: 1,
              boxShadow: '0 0 12px rgba(2, 136, 209, 0.6)',
              borderColor: 'info.light',
            },
            '100%': {
              opacity: 0.8,
              boxShadow: '0 0 4px rgba(2, 136, 209, 0.2)',
            },
          },
        }}
      />
    </Tooltip>
  );
}
