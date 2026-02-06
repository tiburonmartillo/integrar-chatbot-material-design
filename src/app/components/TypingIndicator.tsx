import React from 'react';
import { Box, Avatar } from '@mui/material';
import { Bot } from 'lucide-react';

export function TypingIndicator() {
  return (
    <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
      <Avatar sx={{ bgcolor: 'secondary.main', width: 40, height: 40 }}>
        <Bot size={20} />
      </Avatar>

      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderRadius: '12px 12px 12px 4px',
            bgcolor: 'background.paper',
            display: 'flex',
            gap: 0.5,
            alignItems: 'center',
            '@keyframes typingBounce': {
              '0%, 100%': { transform: 'translateY(0)' },
              '50%': { transform: 'translateY(-4px)' },
            },
            '& > span': {
              width: 8,
              height: 8,
              borderRadius: '50%',
              bgcolor: 'primary.main',
              animation: 'typingBounce 1s ease-in-out infinite',
            },
            '& > span:nth-of-type(2)': { animationDelay: '0.15s' },
            '& > span:nth-of-type(3)': { animationDelay: '0.3s' },
          }}
        >
          <Box component="span" />
          <Box component="span" />
          <Box component="span" />
        </Box>
      </Box>
    </Box>
  );
}
