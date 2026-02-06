import React, { useState, useRef, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { Box, Typography, IconButton } from '@mui/material';
import { Bot, X } from 'lucide-react';
import { createMD3Theme } from '../theme/muiTheme';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { TypingIndicator } from './components/TypingIndicator';
import { sendMessage } from './utils/aiService';
import {
  initContextListener,
  getContextForPrompt,
  subscribeToContext,
  notifyChatbotReady,
} from './utils/contextService';
import type { Message } from './components/ChatMessage';

const INITIAL_MESSAGE: Message = {
  id: '1',
  role: 'assistant',
  content: '¡Hola! Soy tu asistente. Puedo responder preguntas sobre el contenido de esta página y los datos disponibles. ¿En qué puedo ayudarte?',
  timestamp: new Date(),
};

export function EmbeddableChat() {
  const [messages, setMessages] = useState<Message[]>([INITIAL_MESSAGE]);
  const [isTyping, setIsTyping] = useState(false);
  const [context, setContext] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  useEffect(() => {
    initContextListener();
    notifyChatbotReady();

    const unsubscribe = subscribeToContext((state) => {
      const parts: string[] = [];
      if (state.pageContent) parts.push(state.pageContent);
      if (state.apiData) parts.push(state.apiData);
      setContext(parts.join('\n\n'));
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    const handler = (e: MessageEvent) => {
      if (e.data?.type === 'CHATBOT_FOCUS_INPUT') {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleClose = () => {
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'CHATBOT_CLOSE' }, '*');
    }
  };

  const handleSendMessage = async (content: string) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      const apiMessages = messages
        .filter((m) => m.role !== 'system')
        .map((m) => ({ role: m.role, content: m.content }));
      apiMessages.push({ role: 'user', content });

      const contextForPrompt = await getContextForPrompt();
      const response = await sendMessage(apiMessages, contextForPrompt);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, ha ocurrido un error. Por favor, intenta de nuevo.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <ThemeProvider theme={createMD3Theme('light')}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100%',
          minHeight: 0,
          bgcolor: 'background.default',
        }}
      >
        <Box
          component="header"
          sx={{
            flexShrink: 0,
            py: 1.5,
            px: 2,
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Box component="span" sx={{ color: 'primary.main', display: 'flex' }}>
              <Bot size={24} />
            </Box>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'text.primary' }}>
              Pokechatbot
            </Typography>
          </Box>
          <IconButton
            onClick={handleClose}
            aria-label="Cerrar chat"
            size="small"
            sx={{ color: 'text.secondary' }}
          >
            <X size={20} />
          </IconButton>
        </Box>

        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: 'auto',
            px: 2,
            py: 2,
            bgcolor: 'background.default',
          }}
        >
          <Box sx={{ maxWidth: 672, mx: 'auto' }}>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </Box>
        </Box>

        <Box sx={{ flexShrink: 0 }}>
          <ChatInput
            onSendMessage={handleSendMessage}
            disabled={isTyping}
            loading={isTyping}
            inputRef={inputRef}
            autoFocus={typeof window !== 'undefined' && window.parent === window}
          />
        </Box>
      </Box>
    </ThemeProvider>
  );
}
