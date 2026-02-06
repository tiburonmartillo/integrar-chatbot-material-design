import React, { useState, useEffect, useRef } from 'react';
import {
  ThemeProvider,
  Box,
  Typography,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  Grid,
  Dialog,
  DialogContent,
  IconButton,
  Pagination,
  AppBar,
  Toolbar,
} from '@mui/material';
import { X, MessageCircle } from 'lucide-react';
import { createMD3Theme } from '../theme/muiTheme';
import gsap from 'gsap';

const POKEMON_DATA_URL = '/data/pokemon.json';

// Colores por tipo (Pokémon oficial)
const TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  normal: { bg: '#A8A878', text: '#fff' },
  fire: { bg: '#F08030', text: '#fff' },
  water: { bg: '#6890F0', text: '#fff' },
  electric: { bg: '#F8D030', text: '#333' },
  grass: { bg: '#78C850', text: '#fff' },
  ice: { bg: '#98D8D8', text: '#333' },
  fighting: { bg: '#C03028', text: '#fff' },
  poison: { bg: '#A040A0', text: '#fff' },
  ground: { bg: '#E0C068', text: '#333' },
  flying: { bg: '#A890F0', text: '#fff' },
  psychic: { bg: '#F85888', text: '#fff' },
  bug: { bg: '#A8B820', text: '#fff' },
  rock: { bg: '#B8A038', text: '#fff' },
  ghost: { bg: '#705898', text: '#fff' },
  dragon: { bg: '#7038F8', text: '#fff' },
  dark: { bg: '#705848', text: '#fff' },
  steel: { bg: '#B8B8D0', text: '#333' },
  fairy: { bg: '#EE99AC', text: '#333' },
};

interface Pokemon {
  id: number;
  name: string;
  sprites: {
    front_default: string;
    other?: { 'official-artwork'?: { front_default?: string } };
  };
  types: { type: { name: string } }[];
  height: number;
  weight: number;
  abilities?: { ability: { name: string }; is_hidden: boolean }[];
  stats?: { base_stat: number; stat: { name: string } }[];
  species?: { name: string; url: string };
  evolutionChain?: number[];
}

function capitalize(str: string) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function getTypeColor(typeName: string) {
  return TYPE_COLORS[typeName] ?? { bg: '#74777F', text: '#fff' };
}

const POKEMON_PER_PAGE = 24;
const TOTAL_POKEMON = 150;

const STAT_NAMES: Record<string, string> = {
  hp: 'PS',
  attack: 'Ataque',
  defense: 'Defensa',
  'special-attack': 'At. Esp.',
  'special-defense': 'Def. Esp.',
  speed: 'Velocidad',
};

export function PokemonPage() {
  const [pokemon, setPokemon] = useState<Pokemon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPokemon, setSelectedPokemon] = useState<Pokemon | null>(null);
  const [evolutions, setEvolutions] = useState<Pokemon[]>([]);
  const [page, setPage] = useState(1);
  const contentRef = useRef<HTMLDivElement>(null);
  const dialogContentRef = useRef<HTMLDivElement>(null);
  const dialogHeaderRef = useRef<HTMLDivElement>(null);
  const evolutionCardsRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (document.querySelector('script[data-chatbot-url]')) return;
    const script = document.createElement('script');
    script.src = '/embed.js';
    script.setAttribute('data-chatbot-url', window.location.origin);
    document.body.appendChild(script);
  }, []);

  const [pokemonData, setPokemonData] = useState<{
    pokemon: Pokemon[];
    chatbotContext: string;
  } | null>(null);

  useEffect(() => {
    async function fetchPokemon() {
      try {
        const res = await fetch(POKEMON_DATA_URL);
        if (!res.ok) throw new Error('No se encontró pokemon.json. Ejecuta: npm run fetch-pokeapi');
        const data = await res.json();
        setPokemonData({ pokemon: data.pokemon, chatbotContext: data.chatbotContext || '' });
        setPokemon(data.pokemon);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar los Pokémon');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }
    fetchPokemon();
  }, []);

  useEffect(() => {
    if (!pokemonData?.chatbotContext) return;
    const sendToChatbot = () => {
      const iframe = document.querySelector<HTMLIFrameElement>('iframe[data-chatbot-iframe]');
      if (iframe?.contentWindow) {
        iframe.contentWindow.postMessage(
          { type: 'PAGE_CONTENT', content: pokemonData.chatbotContext },
          '*'
        );
      }
    };
    sendToChatbot();
    [500, 1000, 2000, 3000].forEach((delay) => setTimeout(sendToChatbot, delay));
  }, [pokemonData]);

  useEffect(() => {
    if (!selectedPokemon || pokemon.length === 0) {
      setEvolutions([]);
      return;
    }
    const ids = selectedPokemon.evolutionChain || [selectedPokemon.id];
    const pokemonById = new Map(pokemon.map((p) => [p.id, p]));
    setEvolutions(ids.map((id) => pokemonById.get(id)).filter((p): p is Pokemon => !!p));
  }, [selectedPokemon, pokemon]);

  useEffect(() => {
    if (!selectedPokemon) return;
    const ctx = gsap.context(() => {
      if (dialogHeaderRef.current) {
        gsap.fromTo(dialogHeaderRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' });
      }
      if (dialogContentRef.current) {
        gsap.fromTo(dialogContentRef.current, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.4, delay: 0.1, ease: 'power2.out' });
      }
    });
    return () => ctx.revert();
  }, [selectedPokemon]);

  useEffect(() => {
    if (!evolutionCardsRef.current || evolutions.length === 0) return;
    const cards = evolutionCardsRef.current.querySelectorAll('[data-evolution-card]');
    const ctx = gsap.context(() => {
      gsap.fromTo(cards, { opacity: 0, scale: 0.8, y: 20 }, { opacity: 1, scale: 1, y: 0, duration: 0.4, stagger: 0.1, ease: 'back.out(1.2)', delay: 0.2 });
    }, evolutionCardsRef);
    return () => ctx.revert();
  }, [evolutions]);

  useEffect(() => {
    if (!gridRef.current || pokemon.length === 0) return;
    const cards = gridRef.current.querySelectorAll('[data-pokemon-card]');
    const ctx = gsap.context(() => {
      gsap.fromTo(cards, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.03, ease: 'power2.out' });
    }, gridRef);
    return () => ctx.revert();
  }, [pokemon, page]);

  if (loading) {
    return (
      <ThemeProvider theme={createMD3Theme('light')}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh" bgcolor="background.default">
          <CircularProgress size={48} sx={{ color: 'primary.main' }} />
        </Box>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={createMD3Theme('light')}>
        <Box p={4} textAlign="center" minHeight="100vh" display="flex" alignItems="center" justifyContent="center">
          <Typography color="error" variant="h6">{error}</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={createMD3Theme('light')}>
      <Box sx={{ minHeight: '100vh', bgcolor: 'background.default' }}>
        {/* Top App Bar - Material 3 */}
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            bgcolor: '#E2E2E9',
            color: 'text.primary',
            borderBottom: '1px solid',
            borderColor: 'divider',
          }}
        >
          <Toolbar sx={{ py: 1.5, px: { xs: 2, sm: 3 } }}>
            <Typography variant="h5" fontWeight={700} sx={{ flexGrow: 1, fontFamily: 'var(--font-display)' }}>
              Pokédex
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <MessageCircle size={20} style={{ opacity: 0.7 }} />
              <Typography variant="body2" color="text.secondary">
                Asistente
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>

        <Box ref={contentRef} sx={{ maxWidth: 1200, mx: 'auto', px: { xs: 2, sm: 3 }, py: 4 }}>
          {/* Hero / Subtitle */}
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 480, mx: 'auto' }}>
              Explora los primeros {TOTAL_POKEMON} Pokémon. Pregunta al asistente sobre cualquiera de ellos.
            </Typography>
          </Box>

          {/* Grid de Pokémon - Cards Material 3 */}
          <Grid ref={gridRef} container spacing={2}>
            {pokemon
              .slice((page - 1) * POKEMON_PER_PAGE, page * POKEMON_PER_PAGE)
              .map((p) => {
                const primaryType = p.types[0]?.type.name ?? 'normal';
                const typeColor = getTypeColor(primaryType);
                return (
                  <Grid item xs={6} sm={4} md={3} lg={2} key={p.id}>
                    <Card
                      data-pokemon-card
                      role="button"
                      tabIndex={0}
                      onClick={() => setSelectedPokemon(p)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setSelectedPokemon(p);
                        }
                      }}
                      sx={{
                        height: '100%',
                        borderRadius: 3,
                        overflow: 'hidden',
                        bgcolor: '#F3F3FA',
                        boxShadow: 'none',
                        border: '1px solid',
                        borderColor: 'divider',
                        cursor: 'pointer',
                        transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                          transform: 'translateY(-4px)',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                          borderColor: typeColor.bg,
                        },
                      }}
                    >
                      <CardContent sx={{ p: 2, textAlign: 'center', '&:last-child': { pb: 2 } }}>
                        <Box
                          component="img"
                          src={p.sprites.front_default}
                          alt={p.name}
                          sx={{ width: 80, height: 80, mb: 1, imageRendering: 'pixelated' }}
                        />
                        <Typography variant="subtitle2" fontWeight={700} sx={{ fontSize: '0.875rem' }}>
                          #{p.id} {capitalize(p.name)}
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                          {p.types.map((t) => {
                            const c = getTypeColor(t.type.name);
                            return (
                              <Chip
                                key={t.type.name}
                                label={capitalize(t.type.name)}
                                size="small"
                                sx={{
                                  bgcolor: c.bg,
                                  color: c.text,
                                  fontWeight: 600,
                                  fontSize: '0.7rem',
                                  height: 20,
                                  '& .MuiChip-label': { px: 1 },
                                }}
                              />
                            );
                          })}
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block', fontSize: '0.7rem' }}>
                          {p.height / 10}m · {p.weight / 10}kg
                        </Typography>
                      </CardContent>
                    </Card>
                  </Grid>
                );
              })}
          </Grid>

          {/* Pagination - Material 3 */}
          <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4, mb: 2 }}>
            <Pagination
              count={Math.ceil(pokemon.length / POKEMON_PER_PAGE)}
              page={page}
              onChange={(_, value) => {
                setPage(value);
                contentRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
              color="primary"
              size="large"
              showFirstButton
              showLastButton
              sx={{
                '& .MuiPaginationItem-root': {
                  borderRadius: 2,
                  fontWeight: 600,
                },
              }}
            />
          </Box>
        </Box>

        {/* Dialog detalle - Material 3 */}
        <Dialog
          open={!!selectedPokemon}
          onClose={() => setSelectedPokemon(null)}
          maxWidth="sm"
          fullWidth
          PaperProps={{
            sx: {
              borderRadius: 4,
              overflow: 'hidden',
              boxShadow: '0 24px 48px rgba(0,0,0,0.2)',
            },
          }}
          slotProps={{ backdrop: { sx: { zIndex: 999998, bgcolor: 'rgba(0,0,0,0.4)' } } }}
        >
          {selectedPokemon && (
            <>
              <Box
                ref={dialogHeaderRef}
                sx={{
                  position: 'relative',
                  background: `linear-gradient(135deg, ${getTypeColor(selectedPokemon.types[0]?.type.name ?? 'normal').bg} 0%, ${getTypeColor(selectedPokemon.types[1]?.type.name ?? selectedPokemon.types[0]?.type.name ?? 'normal').bg} 100%)`,
                  color: 'white',
                  p: 3,
                  textAlign: 'center',
                  minHeight: 200,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <IconButton
                  onClick={() => setSelectedPokemon(null)}
                  aria-label="Cerrar"
                  sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    color: 'white',
                    bgcolor: 'rgba(255,255,255,0.2)',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                  }}
                >
                  <X size={22} />
                </IconButton>
                <Box
                  component="img"
                  src={
                    selectedPokemon.sprites.other?.['official-artwork']?.front_default ||
                    selectedPokemon.sprites.front_default
                  }
                  alt={selectedPokemon.name}
                  sx={{ width: 160, height: 160, mb: 1, imageRendering: 'pixelated', filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.2))' }}
                />
                <Typography variant="h4" fontWeight={700} sx={{ textShadow: '0 1px 2px rgba(0,0,0,0.2)' }}>
                  #{selectedPokemon.id} {capitalize(selectedPokemon.name)}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 0.75, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {selectedPokemon.types.map((t) => {
                    const c = getTypeColor(t.type.name);
                    return (
                      <Chip
                        key={t.type.name}
                        label={capitalize(t.type.name)}
                        size="small"
                        sx={{
                          bgcolor: 'rgba(255,255,255,0.3)',
                          color: 'white',
                          fontWeight: 600,
                          border: '1px solid rgba(255,255,255,0.5)',
                        }}
                      />
                    );
                  })}
                </Box>
              </Box>
              <DialogContent ref={dialogContentRef} sx={{ p: 3, bgcolor: '#FFFFFF' }}>
                {/* Altura / Peso */}
                <Box sx={{ display: 'flex', gap: 4, mb: 3, p: 2, bgcolor: '#EDEDF4', borderRadius: 3 }}>
                  <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Altura
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {selectedPokemon.height / 10} m
                    </Typography>
                  </Box>
                  <Box sx={{ width: 1, bgcolor: 'divider' }} />
                  <Box sx={{ flex: 1, textAlign: 'center' }}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Peso
                    </Typography>
                    <Typography variant="h6" fontWeight={700}>
                      {selectedPokemon.weight / 10} kg
                    </Typography>
                  </Box>
                </Box>

                {/* Habilidades */}
                <Typography variant="labelLarge" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                  Habilidades
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap', mb: 3 }}>
                  {(selectedPokemon.abilities || []).map((a) => (
                    <Chip
                      key={a.ability.name}
                      label={capitalize(a.ability.name.replace(/-/g, ' '))}
                      size="small"
                      variant="outlined"
                      sx={{ borderRadius: 2, fontWeight: 500 }}
                    />
                  ))}
                </Box>

                {/* Estadísticas */}
                <Typography variant="labelLarge" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                  Estadísticas base
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {(selectedPokemon.stats || []).map((s) => {
                    const primaryType = selectedPokemon.types[0]?.type.name ?? 'normal';
                    const barColor = getTypeColor(primaryType).bg;
                    return (
                      <Box key={s.stat.name} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Typography variant="body2" sx={{ width: 90, fontWeight: 500 }}>
                          {STAT_NAMES[s.stat.name] || s.stat.name}
                        </Typography>
                        <Box
                          sx={{
                            flex: 1,
                            height: 10,
                            bgcolor: '#E7E8EE',
                            borderRadius: 2,
                            overflow: 'hidden',
                          }}
                        >
                          <Box
                            sx={{
                              width: `${Math.min(s.base_stat, 255) / 2.55}%`,
                              height: '100%',
                              bgcolor: barColor,
                              borderRadius: 2,
                              transition: 'width 0.5s ease-out',
                            }}
                          />
                        </Box>
                        <Typography variant="body2" fontWeight={700} sx={{ width: 28, textAlign: 'right' }}>
                          {s.base_stat}
                        </Typography>
                      </Box>
                    );
                  })}
                </Box>

                {/* Evoluciones */}
                {evolutions.length > 1 && (
                  <>
                    <Typography variant="labelLarge" color="text.secondary" sx={{ mt: 3, mb: 2, display: 'block' }}>
                      Evoluciones
                    </Typography>
                    <Box
                      ref={evolutionCardsRef}
                      sx={{ display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}
                    >
                      {evolutions.map((ev) => {
                        const evType = ev.types[0]?.type.name ?? 'normal';
                        const evColor = getTypeColor(evType).bg;
                        return (
                          <Card
                            key={ev.id}
                            data-evolution-card
                            role="button"
                            tabIndex={0}
                            onClick={() => setSelectedPokemon(ev)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setSelectedPokemon(ev);
                              }
                            }}
                            sx={{
                              width: 88,
                              cursor: 'pointer',
                              borderRadius: 3,
                              overflow: 'hidden',
                              bgcolor: '#EDEDF4',
                              border: ev.id === selectedPokemon.id ? 2 : 1,
                              borderColor: ev.id === selectedPokemon.id ? evColor : 'divider',
                              transition: 'all 0.2s',
                              '&:hover': {
                                transform: 'scale(1.05)',
                                boxShadow: `0 4px 12px ${evColor}40`,
                              },
                            }}
                          >
                            <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                              <Box
                                component="img"
                                src={ev.sprites.other?.['official-artwork']?.front_default || ev.sprites.front_default}
                                alt={ev.name}
                                sx={{ width: 56, height: 56, imageRendering: 'pixelated' }}
                              />
                              <Typography variant="caption" fontWeight={700} display="block" sx={{ fontSize: '0.7rem' }}>
                                #{ev.id} {capitalize(ev.name)}
                              </Typography>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </Box>
                  </>
                )}
              </DialogContent>
            </>
          )}
        </Dialog>
      </Box>
    </ThemeProvider>
  );
}
