import React from 'react';
import { Box, MenuItem, Select } from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import type { LlmModel } from '@api/chat';

interface ComposerToolbarProps {
  models: LlmModel[];
  selectedModel: string;
  onModelChange: (model: string) => void;
  children?: React.ReactNode;
}

export default function ComposerToolbar({
  models,
  selectedModel,
  onModelChange,
  children
}: ComposerToolbarProps) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, width: '100%', justifyContent: 'space-between' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <SmartToyIcon sx={{ color: 'primary.light', fontSize: '1.2rem' }} />
        <Select
          value={selectedModel || ""}
          onChange={(e) => onModelChange(e.target.value as string)}
          size="small"
          variant="standard"
          disableUnderline
          sx={{
            color: 'text.primary',
            fontSize: '0.85rem',
            fontWeight: 500,
            '& .MuiSelect-select': {
              py: 0.5,
              px: 1.5,
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              '&:focus': {
                backgroundColor: 'rgba(255, 255, 255, 0.06)',
                borderRadius: '8px',
              }
            },
            '& .MuiSvgIcon-root': {
              color: 'text.secondary',
            }
          }}
          MenuProps={{
            PaperProps: {
              sx: {
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                '& .MuiMenuItem-root': {
                  fontSize: '0.85rem',
                  py: 1,
                  px: 1.5,
                  color: 'text.primary',
                  '&:hover': {
                    backgroundColor: 'rgba(99, 102, 241, 0.08)',
                    color: 'text.primary',
                  },
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(99, 102, 241, 0.16)',
                    color: 'primary.light',
                    fontWeight: 600,
                    '&:hover': {
                      backgroundColor: 'rgba(99, 102, 241, 0.2)',
                    }
                  }
                }
              }
            }
          }}
        >
          {models.length === 0 ? (
            <MenuItem value="" disabled>
              Chargement des modèles...
            </MenuItem>
          ) : (
            models.map((m) => (
              <MenuItem key={m.name} value={m.name || ""}>
                {m.name} {m.parameter_size ? `(${m.parameter_size})` : ''}
              </MenuItem>
            ))
          )}
          {models.find((m) => m.name === selectedModel) === undefined && selectedModel && (
            <MenuItem value={selectedModel}>
              {selectedModel}
            </MenuItem>
          )}
        </Select>
      </Box>
      <Box sx={{ display: 'flex', alignItems: 'center' }}>
        {children}
      </Box>
    </Box>
  );
}
