# Wallet Flow — Liquid Glass Personal Finance 💳✨

Aplicación web de finanzas personales de nivel empresarial, diseñada bajo la estética **Liquid Glass (Glassmorphism para iOS)**, 100% responsiva (Mobile-First), con sistema dual de divisas (**USD principal / COP secundario**), importador masivo en **Excel (.xlsx)** y persistencia híbrida en **SQLite / LibSQL** y `localStorage`.

---

## 🚀 Características Principales

1. **Sistema Dual de Divisas (USD / COP):**
   - **USD como moneda base y principal**, con **COP (Pesos Colombianos)** como moneda secundaria.
   - Switcher interactivo instantáneo `[ USD $ | COP $ ]` en la barra superior con indicador de tipo de cambio en tiempo real (`1 USD = $4,150 COP`).
   - Todos los módulos (Dashboard, Hero Card, Bóveda de Cuentas, Suscripciones, Deudas y Advisor IA) convierten y proyectan sus valores dinámicamente al cambiar de divisa.
   - En modales de registro (movimientos, cuentas, abonos, suscripciones y deudas) el usuario puede ingresar el monto en USD o COP indistintamente.

2. **Importador y Exportador Masivo en Excel (.xlsx):**
   - Descarga de plantilla oficial en Excel estructurada en 4 hojas: `Cuentas`, `Transacciones`, `Suscripciones` y `Deudas`.
   - Carga mediante arrastrar y soltar (drag & drop) o selector de archivo.
   - Detección de moneda del archivo (USD o COP) con conversión automática al modelo interno.
   - Modalidades de importación: **Reemplazo total** (limpieza y sobreescritura limpia) o **Fusión progresiva** (merge acumulativo sin duplicados).
   - Sincronización instantánea con SQLite y `localStorage`.

3. **Dashboard Principal:**
   - Filtro temporal global reactivo: Semanal, Mensual, Trimestral y Anual.
   - **Hero Card (Capital Actual):** Balance total neto en la divisa activa con equivalencia secundaria automática (`≈ $X,XXX COP`).
   - Resumen visual con gráficos fluidos en SVG (Curvas Bezier de Ingresos vs. Gastos y Anillo Donut de distribución por categoría).
   - Feed de movimientos con filtro rápido (Todos, Ingresos, Gastos, Gastos Hormiga).

4. **Gestión de Cuentas, Transferencias y Reordenamiento:**
   - Soporte para **Efectivo**, **Cuentas Bancarias (Débito/Ahorro con tasas de rendimiento)** y **Tarjetas de Crédito (con límite y uso)**.
   - **Transferencias entre Cuentas:** Módulo especializado para mover fondos entre cuentas con conversión multi-divisa automática en tiempo real (USD ⇄ COP) y actualización atómica del saldo de ambas cuentas.
   - **Reordenamiento Manual de Cuentas:** Reorganiza tus cuentas manualmente con Drag & Drop o flechas interactivas (`ChevronLeft` / `ChevronRight`); el orden se almacena de forma persistente en SQLite / Turso.
   - Modal de registro rápido para **Gasto / Ingreso / Transferir** con asignación obligatoria a cuenta, categoría, fecha, notas y divisa.
   - **1-Touch Edit & Delete:** Acceso directo a edición y borrado en un toque en el Libro Mayor y Movimientos por Mes.

5. **Base de Datos Persistente & Respaldos (SQLite & Turso):**
   - **Persistencia Robusta:** La base de datos es estrictamente no destructiva. No se eliminan ni sobreescriben datos en reinicios del servidor o despliegues.
   - **Compatibilidad Dual:** Funciona localmente en SQLite (`wallet_flow.db`) o en la nube mediante **Turso (libSQL)** con réplica embebida o conexión remota.
   - **Respaldos Automáticos y a Demanda:**
     - `npm run db:backup`: Genera una copia binaria timestamped `.db` y un snapshot JSON completo con metadata.
     - `npm run db:restore`: Restaura la base de datos completa desde el snapshot JSON más reciente.

6. **Gastos Fijos y Suscripciones:**
   - Panel de control de pasivos recurrentes (renta, gimnasio, streaming, seguros).
   - Cálculo automático de impacto mensual y proyección anualizada.
   - Interruptor de estado activo/pausado y categorización de esencialidad.

7. **Gestor de Deudas y Abonos:**
   - Amortización progresiva de créditos automotrices, préstamos personales y tarjetas.
   - Registro de **abonos a capital** con selector de cuenta de origen, fecha, notas y barras de progreso hacia la liquidación total.

8. **Aura AI — Smart Financial Advisor:**
   - Diagnóstico algorítmico de fugas ("Qué estás haciendo mal": detección de gastos hormiga y sobreutilización de crédito).
   - Simulador interactivo predictivo con slider de ahorro y cálculo con interés compuesto.
   - Auditoría matemática bajo la **Regla 50 / 30 / 20** y plan de acción escalonado (Método Avalancha).

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 18 (JavaScript ES Modules & JSX sin TypeScript)
- **Bundler:** Vite 6
- **Estilos:** Tailwind CSS 3.4 con extensiones Liquid Glass personalizadas
- **Procesamiento de Archivos:** SheetJS (`xlsx`) para lectura y generación de hojas de cálculo
- **Iconos:** Lucide Icons
- **Base de Datos:** SQLite / LibSQL con API REST Express en Node.js y fallback offline en `localStorage`
- **Hosting y CI/CD:** Optimizado para Vercel y GitHub

---

## 💻 Instalación y Ejecución Local

```bash
# 1. Clonar el repositorio
git clone https://github.com/moonglowfx/wallet-flow.git
cd "wallet-flow"

# 2. Instalar dependencias
npm install

# 3. Iniciar entorno de desarrollo
npm run dev

# 4. Iniciar servidor SQLite / Turso local
npm run server

# 5. Generar backup de la base de datos (binario + snapshot JSON)
npm run db:backup

# 6. Restaurar base de datos desde el snapshot JSON más reciente
npm run db:restore

# 7. Compilar para producción
npm run build
```

---

## ☁️ Despliegue en Vercel

### Opción 1: Conectar Repositorio de GitHub (Recomendado)
1. Sube este proyecto a tu GitHub (ver comandos abajo).
2. Entra a [vercel.com](https://vercel.com) e inicia sesión con tu cuenta de GitHub.
3. Haz clic en **"Add New..."** > **"Project"**.
4. Selecciona el repositorio de GitHub recién subido.
5. Vercel detectará automáticamente la configuración gracias al archivo `vercel.json`:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
6. Haz clic en **Deploy**. ¡Tu app estará viva en producción en menos de 1 minuto con certificado SSL!

### Integración de Turso (SQLite en la Nube) desde Vercel Marketplace
1. En el Dashboard de tu proyecto en [vercel.com](https://vercel.com), ve a la pestaña **Storage** o **Integrations**.
2. Busca **Turso** en el Marketplace y presiona **Install / Connect**.
3. Crea o vincula tu base de datos de Turso.
4. Vercel inyectará automáticamente las variables de entorno:
   - `TURSO_DATABASE_URL` (ej. `libsql://wallet-flow-...turso.io`)
   - `TURSO_AUTH_TOKEN` (tu token de autenticación seguro)
5. ¡Listo! El backend serverless (`/api`) detecta Turso automáticamente vía `@libsql/client` y sincroniza las tablas de cuentas, transacciones y usuarios de forma persistente.

### Opción 2: Usar Vercel CLI desde la terminal
```bash
# Instalar CLI de Vercel globalmente (si no lo tienes)
npm i -g vercel

# Desplegar directamente
vercel
```

---

## 📦 Subir a GitHub

Ejecuta los siguientes comandos en tu terminal:

```bash
git init
git add .
git commit -m "feat: initial commit Wallet Flow Liquid Glass"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPOSITORIO.git
git push -u origin main
```
