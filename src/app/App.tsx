import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Box,
  Chip,
  Switch,
  FormControlLabel,
  Snackbar,
  Alert,
} from '@mui/material';
import { Bot, Moon, Sun, Info } from 'lucide-react';
import { createMD3Theme } from '../theme/muiTheme';
import { ChatMessage } from './components/ChatMessage';
import { ChatInput } from './components/ChatInput';
import { TypingIndicator } from './components/TypingIndicator';
import { sendMessage, getConfigInfo } from './utils/aiService';
import type { Message } from './components/ChatMessage';

function App() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: '¡Hola! Soy tu asistente de IA con Material Design 3. Puedo ayudarte con consultas sobre diseño, desarrollo y mejores prácticas. ¿En qué puedo ayudarte hoy?',
      timestamp: new Date(),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showInfo, setShowInfo] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  const configInfo = getConfigInfo();

  const theme = useMemo(
    () => createMD3Theme(darkMode ? 'dark' : 'light'),
    [darkMode]
  );

  // Auto-scroll al final cuando hay nuevos mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  // Aplicar clase dark al documento
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleSendMessage = async (content: string) => {
    // Agregar mensaje del usuario
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    try {
      // Convertir mensajes al formato esperado por la API
      const apiMessages = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
          role: m.role,
          content: m.content,
        }));

      // Agregar el nuevo mensaje del usuario
      apiMessages.push({
        role: 'user',
        content,
      });

      // Llamar a la API de IA
      const response = await sendMessage(apiMessages);

      // Agregar respuesta del asistente
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mensaje de error
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Lo siento, ha ocurrido un error al procesar tu mensaje. Por favor, verifica tu configuración de API o intenta de nuevo.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          bgcolor: 'background.default',
        }}
      >
        <AppBar
          position="static"
          elevation={0}
          sx={{
            flexShrink: 0,
            bgcolor: 'background.paper',
            color: 'text.primary',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Toolbar>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexGrow: 1 }}>
              <Box component="span" sx={{ color: 'primary.main', display: 'flex' }}>
              <Bot size={28} />
            </Box>
              <Typography variant="h6" component="h1">
                Asistente IA Material Design 3
              </Typography>
            </Box>

            {configInfo.isDemoMode && (
              <Chip
                label="Modo Demo"
                size="small"
                sx={{
                  mr: 2,
                  bgcolor: darkMode ? '#573E5C' : '#FAD8FD',
                  color: darkMode ? '#FAD8FD' : '#573E5C',
                }}
              />
            )}

            <FormControlLabel
              control={
                <Switch
                  checked={darkMode}
                  onChange={(e) => setDarkMode(e.target.checked)}
                  icon={<Sun size={16} />}
                  checkedIcon={<Moon size={16} />}
                />
              }
              label=""
              sx={{ mr: 0 }}
            />

            <IconButton onClick={() => setShowInfo(true)} sx={{ color: 'text.secondary' }}>
              <Info size={20} />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Box
          ref={chatContainerRef}
          sx={{
            flex: 1,
            overflowY: 'auto',
            px: 2,
            py: 3,
            bgcolor: 'background.default',
          }}
        >
          <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            
            {isTyping && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </Box>
        </Box>

        {/* Input Area */}
        <ChatInput 
          onSendMessage={handleSendMessage} 
          disabled={isTyping}
          loading={isTyping}
        />

        {/* Info Snackbar */}
        <Snackbar
          open={showInfo}
          autoHideDuration={8000}
          onClose={() => setShowInfo(false)}
          anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
        >
          <Alert
            onClose={() => setShowInfo(false)}
            severity="info"
            sx={{
              width: '100%',
              maxWidth: 600,
              bgcolor: 'background.paper',
              color: 'text.primary',
            }}
          >
            {configInfo.isDemoMode ? (
              <>
                <strong>Modo Demo Activado:</strong> Para conectar con una API de IA real, 
                añade <code>VITE_GROQ_API_KEY</code> o <code>VITE_OPENAI_API_KEY</code> en <code>.env.local</code>. 
                Actualmente se están usando respuestas simuladas.
              </>
            ) : (
              <>
                <strong>API Configurada:</strong> Conectado a {configInfo.provider === 'groq' ? 'Groq' : 'OpenAI'}
              </>
            )}
          </Alert>
        </Snackbar>
      </Box>
    </ThemeProvider>
  );
}

export default App;