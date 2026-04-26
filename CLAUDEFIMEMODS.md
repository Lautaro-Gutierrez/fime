# CLAUDEFIME.MD — FiMe App Documentación Maestra

App web + mobile para gestionar finanzas personales con datos de mercado en tiempo real. Usuario: inversor retail argentino con expertise en mercados y crypto.

---

## 1. Reglas de colaboración (CRÍTICO — leer antes de codear)

1. **Desarrollo módulo-por-módulo.** No iniciar un módulo ni tocar otro hasta que haya orden explícita del usuario. Nunca anticipar decisiones de módulos futuros.
2. **Moneda.** ARS para todo excepto **Inversiones** y **Portfolio**, que son USD. Tipo de cambio de referencia (MEP/CCL/blue) se decide cuando toque esos módulos.
3. **Idioma.** Comunicación en español rioplatense. Textos de UI también. El usuario es experto en finanzas/mercados — no hace falta explicar conceptos básicos; sí hace falta rigor numérico y claridad visual.
4. **Diseño.** Creativo, moderno, intuitivo. Debe verse bien en mobile y desktop. Evitar UI genérica de dashboard.
5. **Antes de codear cada módulo:** proponer alcance, schema, y decisiones de producto en texto. Esperar aprobación.
6. **Next.js 16 ≠ lo que conocés.** Leer `node_modules/next/dist/docs/` antes de tocar cualquier API. Ver `AGENTS.md`.

---

## 2. Estado General de Módulos

| # | Módulo | Estado | Ruta |
|---|---|---|---|
| 1 | Gastos Personales | ✅ completo | `/gastos` |
| 2 | Nuevas Inversiones | ✅ completo | `/inversiones` |
| 3 | Portfolio de Activos | ✅ completo | `/portfolio` |
| 4 | Gestión de Ingresos | ✅ completo | `/ingresos` |
| 5 | Metas y Objetivos | ✅ completo | `/metas` |
| 6 | Configuración / Perfil | ⏳ pendiente | `/config` |

---

## 3. Stack técnico

| Capa | Tool | Versión |
|---|---|---|
| Framework | Next.js (App Router, Turbopack) | 16.2.4 |
| React | react / react-dom | 19.2.4 |
| Estilo | Tailwind CSS | v4 (`@theme inline`) |
| UI primitivos | shadcn/ui sobre `@base-ui/react` | 1.4 |
| Auth + DB | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) | 0.10 / 2.103 |
| Server state | TanStack Query | v5 |
| Animación | Framer Motion | 12 |
| Charts | Recharts | 3 |
| Iconos | Lucide React | 1.8 |
| Toasts | Sonner | 2 |
| Theme | next-themes (forzado dark) | 0.4 |
| Client state | Zustand (no usado todavía) | 5 |
| Utils fechas | date-fns | 4 |

### Gotchas críticos del stack

- **Next 16 rompió `middleware.ts`** → ahora es `proxy.ts` en la raíz con `export async function proxy(req)`. Misma lógica, nombre distinto.
- **`cookies()`, `headers()`, `params` son async** en Next 16. Siempre `await`.
- **shadcn/ui sobre base-ui, no Radix.** API cambió: se usa `render={<Componente />}` en lugar de `asChild`. No existe `DialogTitle asChild`.
- **Tipo `Database` de Supabase es estricto.** Requiere `Views: Record<string, never>`, `Functions: Record<string, never>`, `CompositeTypes: Record<string, never>`, y `Relationships: []` en cada tabla. Sin esto los `.insert()` quedan tipados como `never`.
- **Tailwind v4** usa `@theme inline` en CSS para definir tokens — no hay `tailwind.config.js` para tokens de color.
- **Iconos Lucide:** verificar nombres con `node -e "require('lucide-react')"` antes de importar; algunos cambiaron de nombre entre versiones.

---

## 4. Auth y Comandos

- Providers: Email + password. **Confirmación de email debe estar desactivada en dev** (Dashboard → Auth → Providers → Email → Confirm email OFF).
- `proxy.ts` intercepta toda request (excepto estáticos). Si no hay sesión y la ruta no es `/login`, redirige.
- `createClient()` en componentes cliente lee cookies del browser; `createServerClient()` en server components con `await cookies()`.

**Comandos habituales**
```bash
pnpm dev              # server en 0.0.0.0:3000
pnpm build            # producción
pnpm exec tsc --noEmit # typecheck