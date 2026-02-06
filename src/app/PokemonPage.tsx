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
  Divider,
  Pagination,
} from '@mui/material';
import { X } from 'lucide-react';
import { createMD3Theme } from '../theme/muiTheme';
import gsap from 'gsap';

const POKEMON_DATA_URL = '/data/pokemon.json';

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

  // Enviar contexto del chatbot (datos pregenerados en pokemon.json)
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
    const retries = [500, 1000, 2000, 3000];
    retries.forEach((delay) => setTimeout(sendToChatbot, delay));
  }, [pokemonData]);

  // Obtener evoluciones desde datos locales (evolutionChain)
  useEffect(() => {
    if (!selectedPokemon || pokemon.length === 0) {
      setEvolutions([]);
      return;
    }

    const ids = selectedPokemon.evolutionChain || [selectedPokemon.id];
    const pokemonById = new Map(pokemon.map((p) => [p.id, p]));
    const evolved = ids
      .map((id) => pokemonById.get(id))
      .filter((p): p is Pokemon => !!p);

    setEvolutions(evolved);
  }, [selectedPokemon, pokemon]);

  // GSAP animations when dialog opens or selected Pokemon changes
  useEffect(() => {
    if (!selectedPokemon) return;

    const ctx = gsap.context(() => {
      if (dialogHeaderRef.current) {
        gsap.fromTo(
          dialogHeaderRef.current,
          { opacity: 0, scale: 0.95 },
          { opacity: 1, scale: 1, duration: 0.35, ease: 'power2.out' }
        );
      }
      if (dialogContentRef.current) {
        gsap.fromTo(
          dialogContentRef.current,
          { opacity: 0, y: 15 },
          { opacity: 1, y: 0, duration: 0.4, delay: 0.1, ease: 'power2.out' }
        );
      }
    });

    return () => ctx.revert();
  }, [selectedPokemon]);

  // GSAP animation for evolution cards
  useEffect(() => {
    if (!evolutionCardsRef.current || evolutions.length === 0) return;

    const cards = evolutionCardsRef.current.querySelectorAll('[data-evolution-card]');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { opacity: 0, scale: 0.8, y: 20 },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          duration: 0.4,
          stagger: 0.1,
          ease: 'back.out(1.2)',
          delay: 0.2,
        }
      );
    }, evolutionCardsRef);

    return () => ctx.revert();
  }, [evolutions]);

  // GSAP animation for grid cards on page/scroll
  useEffect(() => {
    if (!gridRef.current || pokemon.length === 0) return;

    const cards = gridRef.current.querySelectorAll('[data-pokemon-card]');
    const ctx = gsap.context(() => {
      gsap.fromTo(
        cards,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.5,
          stagger: 0.03,
          ease: 'power2.out',
        }
      );
    }, gridRef);

    return () => ctx.revert();
  }, [pokemon, page]);

  if (loading) {
    return (
      <ThemeProvider theme={createMD3Theme('light')}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="100vh">
          <CircularProgress size={48} />
        </Box>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={createMD3Theme('light')}>
        <Box p={4} textAlign="center">
          <Typography color="error">{error}</Typography>
        </Box>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={createMD3Theme('light')}>
      <Box
        sx={{
          minHeight: '100vh',
          bgcolor: 'background.default',
          py: 4,
          px: 2,
        }}
      >
        <Box ref={contentRef} maxWidth={1200} mx="auto">
          <Typography
            variant="h3"
            component="h1"
            sx={{
              mb: 1,
              color: 'primary.main',
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            Pokédex
          </Typography>
          <Typography
            variant="body1"
            sx={{ mb: 4, color: 'text.secondary', textAlign: 'center' }}
          >
            Explora los primeros {TOTAL_POKEMON} Pokémon. Pregunta al asistente sobre cualquiera de ellos.
          </Typography>

          <Grid ref={gridRef} container spacing={3}>
            {pokemon
              .slice((page - 1) * POKEMON_PER_PAGE, page * POKEMON_PER_PAGE)
              .map((p) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={p.id}>
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
                    borderRadius: 2,
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    cursor: 'pointer',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 3,
                    },
                  }}
                >
                  <CardContent sx={{ textAlign: 'center', pt: 3, px: 3, pb: 3 }}>
                    <Box
                      component="img"
                      src={p.sprites.front_default}
                      alt={p.name}
                      sx={{ width: 96, height: 96, mb: 1 }}
                    />
                    <Typography variant="h6" fontWeight={600}>
                      #{p.id} {capitalize(p.name)}
                    </Typography>
                    <Box sx={{ mt: 1, display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                      {p.types.map((t) => (
                        <Chip
                          key={t.type.name}
                          label={capitalize(t.type.name)}
                          size="small"
                        sx={{
                          bgcolor: 'primary.light',
                          color: 'primary.dark',
                          fontWeight: 600,
                        }}
                        />
                      ))}
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Altura: {p.height / 10}m · Peso: {p.weight / 10}kg
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

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
                },
              }}
            />
          </Box>
        </Box>

        <Dialog
          open={!!selectedPokemon}
          onClose={() => setSelectedPokemon(null)}
          maxWidth="sm"
          fullWidth
          aria-labelledby="pokemon-dialog-title"
          slotProps={{
            backdrop: { sx: { zIndex: 999998 } },
          }}
          PaperProps={{
            sx: {
              borderRadius: 2,
              overflow: 'hidden',
              zIndex: 999999,
            },
          }}
        >
          {selectedPokemon && (
            <>
              <Box
                ref={dialogHeaderRef}
                sx={{
                  position: 'relative',
                  bgcolor: 'primary.main',
                  color: 'white',
                  p: 3,
                  textAlign: 'center',
                }}
              >
                <IconButton
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedPokemon(null);
                  }}
                  aria-label="Cerrar"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    color: 'white',
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.2)' },
                  }}
                >
                  <X size={24} />
                </IconButton>
                <Box
                  component="img"
                  src={
                    selectedPokemon.sprites.other?.['official-artwork']?.front_default ||
                    selectedPokemon.sprites.front_default
                  }
                  alt={selectedPokemon.name}
                  sx={{ width: 180, height: 180, mb: 1 }}
                />
                <Typography id="pokemon-dialog-title" variant="h4" component="h2" fontWeight={700}>
                  #{selectedPokemon.id} {capitalize(selectedPokemon.name)}
                </Typography>
                <Box sx={{ mt: 1, display: 'flex', gap: 0.5, justifyContent: 'center', flexWrap: 'wrap' }}>
                  {selectedPokemon.types.map((t) => (
                    <Chip
                      key={t.type.name}
                      label={capitalize(t.type.name)}
                      size="small"
                        sx={{
                          bgcolor: 'primary.light',
                          color: 'primary.dark',
                          fontWeight: 600,
                        }}
                    />
                  ))}
                </Box>
              </Box>
              <DialogContent ref={dialogContentRef} sx={{ p: 3, bgcolor: 'background.default' }}>
                <Box sx={{ display: 'flex', gap: 4, mb: 2 }}>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Altura
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {selectedPokemon.height / 10} m
                    </Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary">
                      Peso
                    </Typography>
                    <Typography variant="body1" fontWeight={600}>
                      {selectedPokemon.weight / 10} kg
                    </Typography>
                  </Box>
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Habilidades
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                  {(selectedPokemon.abilities || []).map((a) => (
                    <Chip
                      key={a.ability.name}
                      label={capitalize(a.ability.name.replace(/-/g, ' '))}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
                <Divider sx={{ my: 2 }} />
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Estadísticas base
                </Typography>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                  {(selectedPokemon.stats || []).map((s) => (
                    <Box key={s.stat.name} sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Typography variant="body2" sx={{ width: 100 }}>
                        {STAT_NAMES[s.stat.name] || s.stat.name}
                      </Typography>
                      <Box
                        sx={{
                          flex: 1,
                          height: 8,
                          bgcolor: 'grey.200',
                          borderRadius: 1,
                          overflow: 'hidden',
                        }}
                      >
                        <Box
                          sx={{
                            width: `${Math.min(s.base_stat, 255) / 2.55}%`,
                            height: '100%',
                            bgcolor: 'primary.main',
                            borderRadius: 1,
                          }}
                        />
                      </Box>
                      <Typography variant="body2" fontWeight={600} sx={{ width: 30 }}>
                        {s.base_stat}
                      </Typography>
                    </Box>
                  ))}
                </Box>

                {evolutions.length > 1 && (
                  <>
                    <Divider sx={{ my: 3 }} />
                    <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                      Evoluciones
                    </Typography>
                    <Box
                      ref={evolutionCardsRef}
                      sx={{
                        display: 'flex',
                        gap: 2,
                        flexWrap: 'wrap',
                        justifyContent: 'center',
                      }}
                    >
                      {evolutions.map((ev) => (
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
                                width: 100,
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                border: ev.id === selectedPokemon.id ? 2 : 0,
                                borderColor: 'primary.main',
                                '&:hover': {
                                  transform: 'scale(1.05)',
                                  boxShadow: 3,
                                },
                              }}
                            >
                              <CardContent sx={{ p: 1.5, textAlign: 'center' }}>
                                <Box
                                  component="img"
                                  src={
                                    ev.sprites.other?.['official-artwork']?.front_default ||
                                    ev.sprites.front_default
                                  }
                                  alt={ev.name}
                                  sx={{ width: 64, height: 64 }}
                                />
                                <Typography variant="caption" fontWeight={600} display="block">
                                  #{ev.id} {capitalize(ev.name)}
                                </Typography>
                              </CardContent>
                            </Card>
                          ))}
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
