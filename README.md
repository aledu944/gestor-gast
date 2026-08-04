# Gestor Gast

PWA mobile-first para administrar gastos únicos y recurrentes, pagos, vencimientos y categorías. Está construida con TanStack Start, React 19, Prisma 7, PostgreSQL y Tailwind CSS 4.

> La aplicación no incluye autenticación. Todas las personas con acceso a la URL comparten y pueden modificar los mismos datos.

## Desarrollo local

Requisitos: Node.js 22 o superior y una base PostgreSQL.

```bash
npm install
cp .env.example .env.local
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

La aplicación estará disponible en `http://localhost:3000`.

## Variables de entorno

```dotenv
DATABASE_URL="postgresql://..."
CRON_SECRET="un-secreto-largo"
VAPID_PUBLIC_KEY="..."
VAPID_PRIVATE_KEY="..."
VAPID_SUBJECT="mailto:tu-correo@dominio.com"
```

Genera las claves Web Push con:

```bash
npx web-push generate-vapid-keys
```

Ningún secreto debe usar el prefijo `VITE_`.

## Comandos de calidad

```bash
npm test
npm run typecheck
npm run test:e2e
npm run build
```

Playwright comprueba las vistas móvil y desktop e incluye una auditoría Axe. El build genera el manifiesto, los recursos offline y el service worker en `.output/public`.

## Producción en Vercel

1. Crea el proyecto con framework `tanstack-start`.
2. Registra todas las variables indicadas arriba.
3. Ejecuta la migración de Prisma contra la base de producción.
4. Despliega el repositorio.

`vercel.json` configura el recordatorio diario a las `13:00 UTC`. Vercel llamará `GET /api/cron/reminders` con `Authorization: Bearer $CRON_SECRET`.

La zona horaria funcional por defecto es `America/La_Paz` y la moneda predeterminada es `BOB`. Cambiar la moneda no convierte importes históricos.

## PWA y notificaciones

- En Android/Chromium, Ajustes muestra el prompt nativo cuando está disponible.
- En iPhone/iPad, se instala desde **Compartir → Añadir a inicio**.
- En iOS, Web Push requiere abrir la aplicación ya instalada.
- El último resumen mensual se conserva en IndexedDB para consulta offline; las mutaciones permanecen deshabilitadas sin conexión.
