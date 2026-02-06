#!/usr/bin/env node
/**
 * Script para descargar datos de PokeAPI y guardarlos localmente.
 * Ejecutar: npm run fetch-pokeapi
 * Los datos se guardan en public/data/pokemon.json para uso offline.
 */

import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const POKE_API = 'https://pokeapi.co/api/v2';
const TOTAL_POKEMON = 150;

const STAT_NAMES = {
  hp: 'PS',
  attack: 'Ataque',
  defense: 'Defensa',
  'special-attack': 'At. Esp.',
  'special-defense': 'Def. Esp.',
  speed: 'Velocidad',
};

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function flattenEvolutionChain(chain) {
  const result = [];
  function traverse(link) {
    result.push(link.species);
    link.evolves_to?.forEach(traverse);
  }
  traverse(chain);
  return result;
}

async function fetchWithRetry(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.json();
    } catch (err) {
      if (i === retries - 1) throw err;
      await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

async function main() {
  console.log('Descargando datos de PokeAPI...\n');

  // 1. Obtener lista de Pokémon
  console.log('1. Obteniendo lista de Pokémon...');
  const listRes = await fetchWithRetry(`${POKE_API}/pokemon?limit=${TOTAL_POKEMON}`);
  const list = listRes.results;

  // 2. Descargar detalles de cada Pokémon
  console.log(`2. Descargando detalles de ${list.length} Pokémon...`);
  const pokemonDetails = [];
  for (let i = 0; i < list.length; i++) {
    const p = list[i];
    const details = await fetchWithRetry(p.url);
    pokemonDetails.push(details);
    if ((i + 1) % 25 === 0) {
      console.log(`   Progreso: ${i + 1}/${list.length}`);
    }
  }

  // 3. Obtener cadenas de evolución (cache por URL única)
  console.log('3. Descargando cadenas de evolución...');
  const evolutionCache = new Map();
  const evolutionChains = {};

  for (let i = 0; i < pokemonDetails.length; i++) {
    const pokemon = pokemonDetails[i];
    const speciesUrl = pokemon.species?.url;
    if (!speciesUrl) continue;

    try {
      const species = await fetchWithRetry(speciesUrl);
      const chainUrl = species.evolution_chain?.url;
      if (!chainUrl) continue;

      let chainIds = evolutionCache.get(chainUrl);
      if (!chainIds) {
        const chainData = await fetchWithRetry(chainUrl);
        const speciesList = flattenEvolutionChain(chainData.chain);
        chainIds = speciesList.map((s) => {
          const match = s.url.match(/pokemon-species\/(\d+)/);
          return match ? parseInt(match[1], 10) : null;
        }).filter(Boolean);
        evolutionCache.set(chainUrl, chainIds);
      }
      evolutionChains[pokemon.id] = chainIds;
    } catch (err) {
      console.warn(`   Error evolución ${pokemon.name}:`, err.message);
    }
    if ((i + 1) % 25 === 0) {
      console.log(`   Progreso: ${i + 1}/${list.length}`);
    }
  }

  // 4. Crear mapa de Pokémon por ID para evolutions
  const pokemonById = {};
  pokemonDetails.forEach((p) => {
    pokemonById[p.id] = p;
  });

  // 5. Formatear datos para el chatbot (formato ultra-compacto para límite 6K tokens Groq)
  // Formato: #ID Nombre|Tipos|Hm Wkg|HP,Atk,Def,SpA,SpD,Spd|Habilidad
  const chatbotContext = [
    'POKÉDEX 150 Pokémon. Formato: #ID Nombre|Tipos|Altura Peso|HP,Atk,Def,SpA,SpD,Spd|Habilidad',
    '',
    ...pokemonDetails.map((p) => {
      const statOrder = ['hp', 'attack', 'defense', 'special-attack', 'special-defense', 'speed'];
      const statsMap = {};
      (p.stats || []).forEach((s) => { statsMap[s.stat.name] = s.base_stat; });
      const stats = statOrder.map((name) => statsMap[name] ?? 0).join(',');
      const ability = (p.abilities || [])[0]?.ability.name.replace(/-/g, ' ') ?? '-';
      const types = p.types.map((t) => capitalize(t.type.name)).join(',');
      const h = (p.height / 10).toFixed(1);
      const w = (p.weight / 10).toFixed(1);
      return `#${p.id} ${capitalize(p.name)}|${types}|${h} ${w}|${stats}|${ability}`;
    }),
  ].join('\n');

  // 6. Estructura final - compatible con PokemonPage
  const output = {
    meta: {
      generatedAt: new Date().toISOString(),
      totalPokemon: pokemonDetails.length,
      source: 'https://pokeapi.co',
    },
    pokemon: pokemonDetails.map((p) => ({
      id: p.id,
      name: p.name,
      height: p.height,
      weight: p.weight,
      sprites: {
        front_default: p.sprites?.front_default,
        other: p.sprites?.other ? { 'official-artwork': p.sprites.other['official-artwork'] } : undefined,
      },
      types: p.types || [],
      abilities: p.abilities || [],
      stats: p.stats || [],
      evolutionChain: evolutionChains[p.id] || [p.id],
    })),
    evolutionChains,
    chatbotContext,
  };

  // 7. Guardar archivos
  const dataDir = join(__dirname, '..', 'public', 'data');
  if (!existsSync(dataDir)) {
    mkdirSync(dataDir, { recursive: true });
  }

  const outputPath = join(dataDir, 'pokemon.json');
  writeFileSync(outputPath, JSON.stringify(output, null, 0), 'utf-8');

  console.log(`\n✓ Datos guardados en public/data/pokemon.json`);
  console.log(`  - ${output.pokemon.length} Pokémon`);
  console.log(`  - ${Object.keys(evolutionChains).length} cadenas de evolución`);
  console.log(`  - Contexto para chatbot: ${(output.chatbotContext.length / 1024).toFixed(1)} KB`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
