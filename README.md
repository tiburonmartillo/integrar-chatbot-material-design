
  # Integrar chatbot con Material Design

  This is a code bundle for Integrar chatbot con Material Design. The original project is available at https://www.figma.com/design/doYzc7t2cJjFLROmvcf8qj/Integrar-chatbot-con-Material-Design.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.

  ## Páginas disponibles

  - `/` - Chatbot principal (Material Design 3)
  - `/pokemon.html` - Pokédex con PokeAPI y chatbot incrustado
  - `/embed.html` - Widget del chatbot (para incrustar en iframe)

  ## Desplegar en Vercel

  1. Conecta el repositorio en [vercel.com](https://vercel.com)
  2. Añade la variable de entorno **GROQ_API_KEY** en: Project → Settings → Environment Variables
  3. Obtén tu API key en [console.groq.com/keys](https://console.groq.com/keys)
  4. Despliega. La API key queda en el servidor y no se expone en el frontend.
  