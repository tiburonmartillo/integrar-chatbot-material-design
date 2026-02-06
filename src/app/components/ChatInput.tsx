import React, { useState, useRef, useEffect, KeyboardEvent } from 'react';
import { Box, IconButton, TextField, CircularProgress } from '@mui/material';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  loading?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  autoFocus?: boolean;
}

export function ChatInput({ onSendMessage, disabled = false, loading = false, inputRef: externalInputRef, autoFocus = false }: ChatInputProps) {
  const internalInputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const inputRef = externalInputRef ?? internalInputRef;

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      const t = setTimeout(() => inputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
  }, [autoFocus, inputRef]);
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (message.trim() && !disabled && !loading) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-end',
        gap: 1,
        p: 2,
        bgcolor: 'background.paper',
        borderTop: 1,
        borderColor: 'divider',
      }}
    >
      <TextField
        inputRef={inputRef}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        onKeyDown={handleKeyPress}
        placeholder="Escribe un mensaje..."
        disabled={disabled || loading}
        multiline
        maxRows={4}
        variant="outlined"
        fullWidth
        sx={{
          '& .MuiOutlinedInput-root': {
            bgcolor: 'background.default',
            borderRadius: 2,
            '& fieldset': {
              borderColor: 'divider',
            },
            '&:hover fieldset': {
              borderColor: 'primary.main',
            },
            '&.Mui-focused fieldset': {
              borderWidth: 2,
              borderColor: 'primary.main',
            },
          },
        }}
      />

      <IconButton
        onClick={handleSend}
        disabled={!message.trim() || disabled || loading}
        sx={{
          bgcolor: 'primary.main',
          color: 'primary.contrastText',
          width: 48,
          height: 48,
          '&:hover': {
            bgcolor: 'primary.dark',
          },
          '&:disabled': {
            bgcolor: 'action.disabledBackground',
            color: 'action.disabled',
          },
        }}
      >
        {loading ? (
          <CircularProgress size={20} color="inherit" />
        ) : (
          <Send size={20} />
        )}
      </IconButton>
    </Box>
  );
}
