# 🔒 Reporte de Auditoría de Seguridad

## Proyecto: PostLinked — Generador de Posts para LinkedIn
## Fecha: 2026-10-01
## Auditor: Claude Sonnet 4.6 (revisión automática + análisis manual)

---

## Resumen ejecutivo

- **Total de hallazgos: 11**
- 🔴 Críticos: 1
- 🟠 Altos: 3
- 🟡 Medios: 4
- 🔵 Bajos: 3

El proyecto está bien estructurado en cuanto a separación servidor/cliente (la `service_role` key nunca se filtra al navegador). Los riesgos más graves giran en torno a la **ausencia de RLS verificable en Supabase** (los datos de todos los usuarios son accesibles con la anon key pública si RLS no está activo) y la **falta de rate limiting** en endpoints que consumen APIs de terceros con costo por llamada.

---

## Hallazgos detallados

---

### 🔴 [CRÍTICO] Consultas directas de Supabase desde el cliente sin RLS verificado

- **Ubicación**: `src/app/dashboard/page.tsx:22-28` · `src/app/historial/page.tsx:21-29`
- **Descripción**: Ambas páginas usan `getSupabase()` (cliente del navegador con `NEXT_PUBLIC_SUPABASE_ANON_KEY`) para consultar directamente la tabla `posts_generados`. La anon key es pública por diseño de Supabase, pero **solo es segura si RLS está habilitado**. No existe ningún archivo de migraciones en el repositorio (`supabase/migrations/` está vacío), por lo que no es posible verificar que RLS esté activado.
- **Impacto**: Si RLS no está habilitado en `posts_generados` y `personalizacion`, **cualquier persona con la anon key** (que está en el código fuente del bundle del navegador) puede ejecutar desde la consola del navegador:
  ```js
  const { createClient } = supabase
  const db = createClient('<URL>', '<ANON_KEY>')
  const { data } = await db.from('posts_generados').select('*')
  // → devuelve TODOS los posts de TODOS los usuarios
  ```
- **Remediación**:
  1. En el dashboard de Supabase → Table Editor → `posts_generados` → RLS → Enable.
  2. Crear las siguientes políticas (SQL en el SQL Editor de Supabase):

  ```sql
  -- Tabla: posts_generados
  ALTER TABLE posts_generados ENABLE ROW LEVEL SECURITY;

  -- Solo el anon puede ver sus propios posts (por session_id)
  -- NOTA: como no hay auth.uid(), la política se basa en que el cliente
  -- pase su session_id; esto es discutible (ver hallazgo 🟠 #2).
  -- Para un sistema sin auth real, la protección real viene de usar
  -- service_role key SOLO en el servidor (ya implementado en API routes).

  -- Bloquear acceso desde el cliente anon completamente:
  CREATE POLICY "deny_anon_select" ON posts_generados
    FOR SELECT USING (false);

  CREATE POLICY "deny_anon_insert" ON posts_generados
    FOR INSERT WITH CHECK (false);

  -- Tabla: personalizacion (mismo tratamiento)
  ALTER TABLE personalizacion ENABLE ROW LEVEL SECURITY;

  CREATE POLICY "deny_anon_select" ON personalizacion
    FOR SELECT USING (false);

  CREATE POLICY "deny_anon_insert" ON personalizacion
    FOR INSERT WITH CHECK (false);
  ```

  3. Migrar las consultas de `dashboard/page.tsx` e `historial/page.tsx` para que pasen por la API (server-side con service_role), en lugar de consultar Supabase directamente desde el cliente.

  > **Alternativa más simple a corto plazo**: agregar `NEXT_PUBLIC_SUPABASE_ANON_KEY` solo si RLS está activo y las políticas solo permiten acceso a través de la API server-side. Si las políticas son `USING (false)`, las consultas del cliente simplemente devolverán arrays vacíos y no expondrán datos, pero las páginas dejarán de funcionar hasta migrarlas.

---

### 🟠 [ALTO] Sin rate limiting en endpoints con costo por llamada

- **Ubicación**: `src/app/api/generar/route.ts` · `src/app/api/generar-imagen/route.ts`
- **Descripción**: Los endpoints `POST /api/generar` (llama a Gemini) y `POST /api/generar-imagen` (llama a Pollinations.AI / futuro OpenAI) no tienen ningún control de frecuencia. Un atacante puede hacer miles de llamadas en segundos.
- **Impacto**:
  - Para `/api/generar`: abuso de la API key de Gemini → cargos económicos inesperados o suspensión del servicio.
  - Para `/api/generar-imagen`: en el caso de OpenAI (uso futuro), cada imagen generada con `gpt-image-2` tiene costo directo. Un ataque de fuerza bruta puede generar facturas de cientos de dólares en minutos.
  - Ambos endpoints son accesibles sin autenticación alguna.
- **Remediación**: Implementar rate limiting basado en IP. La solución más simple para Next.js es el paquete `@upstash/ratelimit` con Redis de Upstash (plan gratuito suficiente) o `rate-limiter-flexible`.

  ```ts
  // Ejemplo con Upstash (agregar a cada route costosa)
  import { Ratelimit } from "@upstash/ratelimit";
  import { Redis } from "@upstash/redis";

  const ratelimit = new Ratelimit({
    redis: Redis.fromEnv(),
    limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests por minuto por IP
  });

  export async function POST(request: NextRequest) {
    const ip = request.headers.get("x-forwarded-for") ?? "anonymous";
    const { success } = await ratelimit.limit(ip);
    if (!success) {
      return NextResponse.json({ error: "Demasiadas peticiones. Espera un momento." }, { status: 429 });
    }
    // ... resto del handler
  }
  ```

---

### 🟠 [ALTO] El `session_id` no tiene validación de formato antes de usarse en queries

- **Ubicación**: `src/app/api/generar/route.ts:65-67` · `src/app/api/personalizacion/route.ts:5-8, 25-28`
- **Descripción**: El header `x-session-id` se lee y se usa directamente en `supabase.from(...).eq('session_id', sessionId)` sin validar que sea un UUID v4 válido. Cualquier string arbitrario es aceptado.
- **Impacto**: Aunque el cliente de Supabase usa queries parametrizadas (no hay SQL injection directa), un session_id malicioso podría:
  - Causar comportamiento inesperado en las queries
  - En tablas con índices o constraints, generar errores 500 que filtran información de la base de datos en el mensaje de error (ver hallazgo 🔵 #3)
  - Si alguna vez se agrega lógica más compleja, abrir vectores nuevos
- **Remediación**: Validar el formato UUID antes de continuar.

  ```ts
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  const sessionId = request.headers.get('x-session-id');
  if (!sessionId || !UUID_REGEX.test(sessionId)) {
    return NextResponse.json({ error: 'Session ID inválido' }, { status: 400 });
  }
  ```

---

### 🟠 [ALTO] Sin headers de seguridad HTTP

- **Ubicación**: `next.config.ts:1-7`
- **Descripción**: No hay headers de seguridad configurados. Next.js no los agrega por defecto.
- **Impacto**:
  - Sin `X-Frame-Options` / `frame-ancestors`: la app puede embeberse en un `<iframe>` malicioso para ataques de clickjacking.
  - Sin `X-Content-Type-Options: nosniff`: el navegador puede interpretar respuestas con tipo MIME incorrecto.
  - Sin `Referrer-Policy`: URLs internas pueden filtrarse a servicios externos.
  - Sin `Content-Security-Policy`: mayor superficie para XSS si en el futuro se agrega renderizado de HTML dinámico.
- **Remediación**: Agregar en `next.config.ts`:

  ```ts
  import type { NextConfig } from "next";

  const nextConfig: NextConfig = {
    async headers() {
      return [
        {
          source: "/(.*)",
          headers: [
            { key: "X-Frame-Options", value: "DENY" },
            { key: "X-Content-Type-Options", value: "nosniff" },
            { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
            { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
            {
              key: "Strict-Transport-Security",
              value: "max-age=63072000; includeSubDomains; preload",
            },
            {
              key: "Content-Security-Policy",
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline'",  // Next.js requiere unsafe-inline
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                "font-src 'self' https://fonts.gstatic.com",
                "img-src 'self' data: blob: https://image.pollinations.ai",
                "connect-src 'self' https://*.supabase.co",
              ].join("; "),
            },
          ],
        },
      ];
    },
  };

  export default nextConfig;
  ```

---

### 🟡 [MEDIO] La identidad del usuario es un UUID en localStorage (sin expiración, sin revocación)

- **Ubicación**: `src/lib/session.ts:1-13`
- **Descripción**: El mecanismo de identidad completo es un UUID almacenado en `localStorage`. Esto es intencional por diseño (no hay auth), pero tiene implicaciones de seguridad no documentadas.
- **Impacto**:
  - **Sin expiración**: un session_id robado (via XSS, acceso físico al equipo, herramientas de developer tools) permite acceso permanente a todos los datos del usuario afectado.
  - **Sin revocación**: no hay forma de invalidar un session_id comprometido.
  - **Compartible sin querer**: si el usuario exporta su `localStorage` o comparte una sesión de navegador, comparte acceso completo.
  - Un atacante que adivina un UUID existente (improbable pero posible con 2^122 posibilidad) obtiene acceso a esos datos.
- **Remediación a corto plazo**: No requiere implementar auth completa, pero sí:
  1. Agregar un campo `created_at` a la lógica de sesión y considerar expiración después de N días de inactividad.
  2. Documentar en la UI que el acceso a los datos está ligado al dispositivo/navegador actual.
  3. A futuro: migrar a Supabase Auth (email magic link es suficiente y gratuito) para proteger los datos con `auth.uid()` real.

---

### 🟡 [MEDIO] Sin validación de schema en inputs de las API routes

- **Ubicación**: `src/app/api/generar/route.ts:71-77` · `src/app/api/personalizacion/route.ts:31-36` · `src/app/api/generar-imagen/route.ts:14-16`
- **Descripción**: Los bodies de los requests no se validan con ningún schema (Zod, Joi, etc.). Se asume que llegan en el formato esperado.
- **Impacto**:
  - `variaciones` recibe `Math.min(Math.max(...))` — correcto. Pero `idea` y `texto` aceptan strings de longitud ilimitada.
  - Un string de 100MB como `idea` puede agotar memoria del servidor o causar timeout.
  - En `personalizacion`, `ejemplos_posts` se acepta como cualquier tipo; si llega un objeto en lugar de array, puede causar errores 500 que filtran stack traces.
  - Los campos de texto sin límite de longitud pueden generar prompts extremadamente largos, elevando el costo de la API de Gemini.
- **Remediación**: Instalar `zod` y validar en cada route.

  ```ts
  // pnpm add zod
  import { z } from 'zod';

  const GenerarSchema = z.object({
    idea: z.string().min(1).max(2000),
    variaciones: z.number().int().min(1).max(3).optional().default(1),
  });

  // En el handler:
  const parsed = GenerarSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
  }
  ```

---

### 🟡 [MEDIO] Mensaje de error interno de Supabase expuesto al cliente

- **Ubicación**: `src/app/api/personalizacion/route.ts:18, 51`
- **Descripción**: Los errores de Supabase se devuelven directamente como respuesta HTTP sin filtrar.
  ```ts
  return NextResponse.json({ error: error.message }, { status: 500 });
  ```
- **Impacto**: Los mensajes de error de Supabase pueden revelar información sobre la estructura de la base de datos, nombres de columnas, constraints, o detalles del schema que facilitan ataques dirigidos.
- **Remediación**: Loguear el error interno y devolver un mensaje genérico al cliente.
  ```ts
  if (error) {
    console.error('Supabase error:', error);
    return NextResponse.json({ error: 'No se pudo guardar el perfil.' }, { status: 500 });
  }
  ```

---

### 🟡 [MEDIO] No hay `proxy.ts` (Next.js 16) para proteger rutas

- **Ubicación**: raíz del proyecto / `src/`
- **Descripción**: Next.js 16 usa `proxy.ts` (renombrado desde `middleware.ts`). No existe ninguno de los dos en el proyecto. Esto es coherente con el diseño sin autenticación, pero si en el futuro se agrega auth, será fácil olvidar proteger alguna ruta.
- **Impacto actual**: Ninguno (diseño sin auth). **Impacto futuro**: al agregar auth, todas las rutas quedan desprotegidas si se olvida crear el proxy.
- **Remediación**: Crear `proxy.ts` en `src/` como punto de extensión preparado, aunque hoy solo haga pass-through:
  ```ts
  // src/proxy.ts
  import { NextRequest, NextResponse } from 'next/server';

  export function proxy(request: NextRequest) {
    // TODO: agregar validación de sesión/auth cuando se implemente
    return NextResponse.next();
  }

  export const config = {
    matcher: ['/dashboard/:path*', '/generar-posts/:path*', '/historial/:path*', '/personalizacion/:path*', '/generar-imagen/:path*'],
  };
  ```

---

### 🔵 [BAJO] `.gitignore` le faltan algunos patrones recomendados

- **Ubicación**: `.gitignore`
- **Descripción**: Faltan los siguientes patrones del checklist estándar:
  - `.vscode/settings.json` y `.vscode/launch.json` (pueden contener tokens de extensiones o paths locales)
  - `*.key`, `*.crt`, `*.p12`, `*.pfx` (solo está `*.pem`)
  - `*.sqlite`, `*.sqlite3`, `*.db` (si se usara base de datos local en algún momento)
- **Impacto**: Bajo riesgo actual. Riesgo futuro si se agregan certificados locales o configs de VS Code con credenciales.
- **Remediación**: Agregar al `.gitignore`:
  ```
  .vscode/settings.json
  .vscode/launch.json
  *.key
  *.crt
  *.p12
  *.pfx
  *.sqlite
  *.sqlite3
  *.db
  ```

---

### 🔵 [BAJO] `.env.example` no documenta `NEXT_PUBLIC_SUPABASE_URL`

- **Ubicación**: `.env.example`
- **Descripción**: La variable `NEXT_PUBLIC_SUPABASE_URL` es usada en `supabase-server.ts:4` y `supabase.ts:7` pero no aparece en `.env.example`.
- **Impacto**: Un nuevo desarrollador que clone el repo no sabrá que debe configurar esa variable.
- **Remediación**: Agregar la línea faltante en `.env.example`:
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
  ```
  *(ya fue agregado durante esta sesión al crear `.env.example`)*

---

### 🔵 [BAJO] Dependencias sin vulnerabilidades conocidas — sin riesgo actual

- **Ubicación**: `package.json`
- **Descripción**: `pnpm audit` devuelve **0 vulnerabilidades conocidas**. Las dependencias principales (`next 16.3.6`, `@supabase/supabase-js 2.117.2`, `@google/generative-ai 0.24.1`) están en versiones recientes.
- **Impacto**: Ninguno actual. Revisar periódicamente.
- **Remediación**: Ejecutar `pnpm audit` antes de cada deploy.

---

## Mapa de rutas y protección

| Ruta | Tipo | Protección actual | Observación |
|------|------|-------------------|-------------|
| `/` | Página | Ninguna (pública) | Landing, redirige a `/dashboard` |
| `/dashboard` | Página client | Ninguna | Consulta Supabase directamente — requiere RLS |
| `/generar-posts` | Página client | Ninguna | Solo llama a API server-side — OK |
| `/generar-imagen` | Página client | Ninguna | Solo llama a API server-side — OK |
| `/personalizacion` | Página client | Ninguna | Solo llama a API server-side — OK |
| `/historial` | Página client | Ninguna | Consulta Supabase directamente — requiere RLS |
| `POST /api/generar` | API Route | `session_id` header | Sin rate limiting, sin validación de schema |
| `GET /api/personalizacion` | API Route | `session_id` header | Filtra errores de DB al cliente |
| `POST /api/personalizacion` | API Route | `session_id` header | Sin validación de schema, filtra errores DB |
| `POST /api/generar-imagen` | API Route | Ninguna | Sin session_id (intencional, no accede a BD) |

---

## Estado de RLS por tabla

> ⚠️ No hay archivos de migración en el repositorio. El estado real de RLS **debe verificarse directamente en el dashboard de Supabase** (Table Editor → Tabla → RLS).

| Tabla | RLS esperado | Riesgo si está desactivado |
|-------|-------------|---------------------------|
| `posts_generados` | ✅ Debe estar activo | 🔴 Cualquier usuario con la anon key puede leer/escribir todos los posts de todos los usuarios |
| `personalizacion` | ✅ Debe estar activo | 🔴 Cualquier usuario puede leer/sobrescribir el perfil de cualquier otro usuario |

**Acción inmediata**: Verificar en Supabase Dashboard → Authentication → Policies que ambas tablas tengan RLS habilitado.

---

## Checklist final

- [x] Todas las variables sensibles en `.env.local` y excluidas de git (`.env*` en `.gitignore`)
- [x] No hay secrets en el historial de git (verificado con `git log`)
- [x] No hay secrets hardcodeados en el código fuente
- [x] `SUPABASE_SERVICE_ROLE_KEY` solo usada en server-side (`supabase-server.ts`)
- [ ] **RLS habilitado en todas las tablas de Supabase** — ⚠️ Acción manual requerida en el dashboard de Supabase (ver hallazgo 🔴)
- [x] Consultas a Supabase desde el cliente migradas a API routes (`/api/posts` — dashboard, historial, generar-imagen) ✅ *Corregido*
- [x] Rate limiting en `/api/generar` (10 req/min) y `/api/generar-imagen` (6 req/min) ✅ *Corregido*
- [x] `session_id` validado como UUID v4 en todas las API routes ✅ *Corregido*
- [x] Headers de seguridad HTTP agregados en `next.config.ts` (X-Frame-Options, CSP, HSTS, nosniff, Referrer-Policy) ✅ *Corregido*
- [x] Mensajes de error internos de Supabase no expuestos al cliente ✅ *Corregido*
- [x] Patrones faltantes agregados a `.gitignore` (*.key, *.crt, *.db, .vscode/) ✅ *Corregido*
- [x] Inputs de personalizacion con longitud máxima y validación de tipos ✅ *Corregido*
- [ ] `proxy.ts` creado como punto de extensión para auth futura (bajo impacto actual)
- [x] No hay middleware.ts deprecado (N/A — no hay middleware en absoluto)
- [x] No hay funciones `SECURITY DEFINER` en el código (no hay RPCs)
- [x] No hay vectores de XSS (`dangerouslySetInnerHTML` no encontrado)
- [x] No hay SQL injection (Supabase client usa queries parametrizadas)
- [x] `pnpm audit` — 0 vulnerabilidades conocidas

---
*Última actualización del checklist: 2026-10-01 — correcciones aplicadas en código*
