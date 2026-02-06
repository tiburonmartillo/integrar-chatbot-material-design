import React from 'react';
import { Box, Avatar, Typography, useTheme } from '@mui/material';
import { Bot, User } from 'lucide-react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  const theme = useTheme();
  const isUser = message.role === 'user';

  const primaryContainer = theme.palette.mode === 'dark' ? '#284777' : '#D6E3FF';
  const onPrimaryContainer = theme.palette.mode === 'dark' ? '#D6E3FF' : '#284777';
  const surfaceContainerHigh = theme.palette.mode === 'dark' ? '#282A2F' : '#E7E8EE';

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 1.5,
        mb: 2,
        flexDirection: isUser ? 'row-reverse' : 'row',
      }}
    >
      <Avatar
        sx={{
          bgcolor: isUser ? 'primary.main' : 'secondary.main',
          width: 40,
          height: 40,
        }}
      >
        {isUser ? <User size={20} /> : <Bot size={20} />}
      </Avatar>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 0.5,
          maxWidth: '70%',
          alignItems: isUser ? 'flex-end' : 'flex-start',
        }}
      >
        <Box
          sx={{
            px: 2,
            py: 1.5,
            borderRadius: isUser ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
            bgcolor: isUser ? primaryContainer : surfaceContainerHigh,
            color: isUser ? onPrimaryContainer : 'text.primary',
          }}
        >
          <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
            {message.content}
          </Typography>
        </Box>

        <Typography variant="caption" sx={{ px: 1, color: 'text.secondary' }}>
          {message.timestamp.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Typography>
      </Box>
    </Box>
  );
}
