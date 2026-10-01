# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Rol
Eres un ingeniero en desarrollo de software de clase mundial. Tu trabajo es construir un generador de posts con IA para LinkedIn. Sigues las mejores prácticas de desarrollo web.

# Consideraciones
- Usa pnpm como gestor de paquetes.

# Seguridad
- Toda credencial o secreto siempre en .env o .env.local
- Nunca leas .env o .env.local directamente
- Crea un .env.example para mostrarle al usuario cómo configurar su .env o .env.local
- Si hay git, que toda credencial, secreto o valor sensible esté dentro de .gitignore
- RLS en bases de datos

# Comandos

```bash
pnpm dev        # Servidor de desarrollo en http://localhost:3000
pnpm build      # Build de producción (también valida TypeScript)
pnpm lint       # ESLint
```

# Arquitectura

Next.js 16 App Router + React 19 + TypeScript + Tailwind v4 + pnpm.

## Rutas
- `/dashboard` — estadísticas y posts recientes
- `/generar-posts` — formulario de generación (idea + variaciones 1-3)
- `/personalizacion` — perfil de marca del usuario
- `/historial` — historial completo de posts generados

## API Routes
- `POST /api/generar` — llama a Gemini, guarda resultado en Supabase
- `GET/POST /api/personalizacion` — lee/escribe el perfil de personalización

## Flujo de datos principal
1. El cliente genera un `session_id` UUID en `localStorage` (ver `src/lib/session.ts`) y lo pasa en el header `x-session-id` en cada petición a la API.
2. `POST /api/generar` consulta el perfil de personalización de Supabase, construye el prompt con ese contexto, llama a Gemini, y guarda el resultado en la tabla `posts_generados`.
3. No hay autenticación — todo se identifica por `session_id`.

## Supabase
- Cliente del lado servidor: `src/lib/supabase-server.ts` (usa `SUPABASE_SERVICE_ROLE_KEY`)
- Cliente del lado cliente: `src/lib/getSupabase()` en `src/lib/supabase.ts` (lazy, evita crash en build sin env vars)
- Tablas: `personalizacion` (session_id UNIQUE) y `posts_generados`
- Claves en `.env.local`: `NEXT_PUBLIC_SUPABASE_ANON_KEY` = `sb_publishable_...`, `SUPABASE_SERVICE_ROLE_KEY` = `sb_secret_...`

## Gemini
- Paquete: `@google/generative-ai`
- Modelo activo: `gemini-3.1-flash-lite` (los modelos `gemini-2.5-flash` y anteriores devuelven 404 para keys nuevas; `gemini-3.8-flash` devuelve 503 frecuentemente)
- La route implementa reintentos con backoff (4 intentos, 1.5s × attempt) para manejar saturación del modelo
- Para cambiar de modelo: editar `src/app/api/generar/route.ts` línea con `getGenerativeModel`

## Diseño
- Tokens de diseño definidos en `src/app/globals.css` como variables CSS (`--bg`, `--surface`, `--accent` ámbar #F59E0B, `--sidebar-bg` #0C1821, etc.)
- Fuente: Plus Jakarta Sans (Google Fonts, importada en globals.css)
- Layout: `src/components/AppLayout.tsx` (sidebar fijo 240px + main) + `src/components/Sidebar.tsx`
- Componente reutilizable de copia: `src/components/CopyButton.tsx`
