# Guía Fútbol TV España

Widget de partidos de fútbol televisados en España, usando la API WOSTI via RapidAPI.

---

## 🚀 Deploy en Vercel (5 minutos)

### 1. Subir a GitHub

```bash
# Descomprime el ZIP y entra al directorio
unzip guia-futbol-tv.zip
cd guia-futbol-tv

# Inicializa git y sube
git init
git add .
git commit -m "feat: guia futbol tv inicial"

# Crea un repo en github.com y conecta
git remote add origin https://github.com/TU_USUARIO/guia-futbol-tv.git
git push -u origin main
```

### 2. Conectar con Vercel

1. Entra en **[vercel.com](https://vercel.com)** → **Add New Project**
2. Importa el repo de GitHub recién creado
3. Framework: **Next.js** (se detecta automático)
4. Antes de hacer Deploy, ve a **Environment Variables** y añade:

| Variable | Valor |
|---|---|
| `RAPIDAPI_KEY` | `TU_RAPIDAPI_KEY` |
| `RAPIDAPI_HOST` | `wosti-futbol-tv-spain.p.rapidapi.com` |

5. Click **Deploy** → en ~1 minuto tienes la URL pública.

> ⚠️ **Nunca subas `.env.local` a GitHub.** El archivo ya está en `.gitignore`. Las variables van solo en el panel de Vercel.

---

## 🔍 Verificar que la API funciona

Una vez desplegado (o en local), abre:

```
https://TU-DOMINIO.vercel.app/api/debug
```

Verás la respuesta raw de cada endpoint WOSTI. Si ves `200` con datos en alguno, la API está funcionando. Si todos devuelven `401` o `403`, revisa la API key en el panel de Vercel → Settings → Environment Variables.

---

## 🛠 Desarrollo local

```bash
npm install
npm run dev
# → http://localhost:3000
```

Variables en `.env.local` (ya incluidas en el ZIP):
```
RAPIDAPI_KEY=TU_RAPIDAPI_KEY
RAPIDAPI_HOST=wosti-futbol-tv-spain.p.rapidapi.com
```

---

## 📁 Estructura

```
guia-futbol-tv/
├── .env.local                    ← API keys (NO subir a git)
├── app/
│   ├── layout.tsx                ← HTML base + metadata SEO
│   ├── page.tsx                  ← UI completa (filtros, partidos, canales)
│   └── api/
│       ├── matches/route.ts      ← Proxy WOSTI → JSON normalizado (caché 5min)
│       └── debug/route.ts        ← /api/debug para inspeccionar endpoints raw
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## 🔧 Ajustar el normalizador

Si `/api/debug` muestra que la API devuelve un formato distinto al esperado, edita `app/api/matches/route.ts` al final del bloque de normalización:

```ts
// Añade el campo correcto según lo que veas en /api/debug
else if (Array.isArray(data.TU_CAMPO)) {
  matches = data.TU_CAMPO
}
```

---

## 📡 Fuente de datos

- API: [WOSTI Fútbol TV Spain](https://rapidapi.com/wosti/api/wosti-futbol-tv-spain) via RapidAPI
- Web de referencia: [futbolenlatv.es](https://www.futbolenlatv.es)
- Datos: partidos televisados hoy/mañana en España con canales y horarios
