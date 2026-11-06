# Wallet Flow — Liquid Glass Personal Finance 💳✨

Aplicación web de finanzas personales de nivel empresarial, diseñada bajo la estética **Liquid Glass (Glassmorphism para iOS)**, 100% responsiva (Mobile-First) y optimizada para despliegue instantáneo en **Vercel** y control de versiones en **GitHub**.

---

## 🚀 Características Principales

1. **Dashboard Principal:**
   - Filtro temporal global reactivo: Semanal, Mensual, Trimestral y Anual.
   - **Hero Card (Capital Actual):** Balance total neto con desglose segmentado por cuentas (Bancos, Efectivo y Tarjetas de Crédito).
   - Resumen visual con gráficos fluidos en SVG (Curvas Bezier de Ingresos vs. Gastos y Anillo Donut de distribución por categoría).
   - Feed de movimientos con filtro rápido (Todos, Ingresos, Gastos, Gastos Hormiga).

2. **Gestión de Cuentas y Transacciones:**
   - Soporte para **Efectivo**, **Cuentas Bancarias (Débito/Ahorro con tasas de rendimiento)** y **Tarjetas de Crédito (con límite y uso)**.
   - Modal de registro rápido para **Entrada / Salida** con asignación obligatoria a cuenta, categoría, fecha y notas.
   - Actualización en tiempo real del saldo de cada cuenta al registrar un movimiento.

3. **Gastos Fijos y Suscripciones:**
   - Panel de control de pasivos recurrentes (renta, gimnasio, streaming, seguros).
   - Cálculo automático de impacto mensual y proyección anualizada.
   - Diferenciación entre gastos esenciales y opcionales/optimizables.

4. **Gestor de Deudas y Abonos:**
   - Amortización progresiva de créditos automotrices, préstamos personales y tarjetas.
   - Registro de **abonos a capital** con barras de progreso hacia la liquidación total.

5. **Aura AI — Smart Financial Advisor:**
   - Diagnóstico algorítmico de fugas ("Qué estás haciendo mal": detección de gastos hormiga y sobreutilización de crédito).
   - Simulador interactivo predictivo con slider de ahorro y cálculo con interés compuesto.
   - Auditoría matemática bajo la **Regla 50 / 30 / 20** y plan de acción escalonado (Método Avalancha).

---

## 🛠️ Stack Tecnológico

- **Frontend:** React 18 (JavaScript ES Modules & JSX)
- **Bundler:** Vite 6
- **Estilos:** Tailwind CSS 3.4 con extensiones Liquid Glass personalizadas
- **Iconos:** Lucide Icons
- **Persistencia Actual:** `localStorage` en el navegador del cliente (offline-first, no pierde datos al recargar)
- **Hosting y CI/CD:** Optimizado para Vercel & GitHub Actions

---

## 💻 Instalación y Ejecución Local

```bash
# 1. Clonar el repositorio
git clone <URL_DE_TU_REPOSITORIO>
cd "WALLET FLOW"

# 2. Instalar dependencias
npm install

# 3. Iniciar entorno de desarrollo
npm run dev

# 4. Compilar para producción
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
