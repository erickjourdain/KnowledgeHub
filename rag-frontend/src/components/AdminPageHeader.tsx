import React from 'react';
import { Box, Typography, Divider } from '@mui/material';

interface AdminPageHeaderProps {
  title: string;
  icon: React.ReactNode;
}

export default function AdminPageHeader({ title, icon }: AdminPageHeaderProps) {
  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Box 
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            color: 'primary.light',
            '& svg': { fontSize: '1.5rem' }
          }}
        >
          {icon}
        </Box>
        <Typography 
          variant="h6" 
          fontWeight="700" 
          sx={{ 
            background: 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            letterSpacing: '0.01em'
          }}
        >
          {title}
        </Typography>
      </Box>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.08)' }} />
    </Box>
  );
}
