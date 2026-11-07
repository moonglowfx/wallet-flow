# Prompt para Argon 4: App de Finanzas Personales (Liquid Glass)

**Rol y Contexto:**
Actúa como un Senior Full-Stack Developer y experto en UI/UX. Tu objetivo es construir una aplicación web de finanzas personales de nivel empresarial, 100% responsive (mobile-first) y con una navegación fluida.

## Sistema de Diseño y UI/UX (Liquid Glass for iOS)
* **Estilo Visual:** Implementa un diseño "Liquid Glass" (Glassmorphism). Utiliza paneles translúcidos, desenfoque de fondo calibrado (`backdrop-blur-lg`), bordes sutiles semitransparentes (`border-white/10`) y sombras suaves y difuminadas.
* **Optimización Safari iOS / PWA (Safe Area Top):** Cuando la app se instala desde Safari en el iPhone (Add to Home Screen), debe agregar un `padding-top` con `env(safe-area-inset-top)` en la cabecera superior para evitar que la isla dinámica o barra de estado tape el contenido, y reducir o quitar el blur excesivo en la barra superior (`backdrop-blur-none` o sutil) para que la parte superior se vea nítida y perfecta sin verse borrosa.
* **Animaciones UX/UI Fluidas:** Mejora las animaciones de toda la interfaz (transiciones suaves estilo iOS spring, entrada escalonada de tarjetas y modales, micro-interacciones táctiles y efectos de hover/active fluidos).
* **Paleta de Colores:** Diseño estrictamente en *Dark Mode*. El fondo principal debe ser un negro profundo o gris muy oscuro (`#0F0F13`). Los colores de acento, botones, gradientes y estados activos deben usar una escala de morados premium (desde violeta neón hasta púrpura oscuro). 
* **Tipografía e Iconografía:** Usa una tipografía sans-serif limpia (estilo SF Pro de Apple) y una librería de iconos minimalistas (como Lucide Icons).

## Arquitectura de la Aplicación y Funcionalidades Core

### 1. Dashboard Principal (Visión General)
* **Filtro Temporal Global:** Un selector en la parte superior para cambiar toda la vista de datos (Mensual por defecto, con opciones a Semanal, Trimestral y Anual).
* **Hero Card (Capital Actual):** Una tarjeta Liquid Glass destacada mostrando el balance total neto y balances separados en Dólares (`USD`) y Pesos (`COP`). Justo debajo, un desglose visual del dinero seccionado por cuentas en su moneda nativa (ej. $X USD en Banco A, $Y COP en Bancolombia/Efectivo, -$Z USD en Tarjeta de Crédito).
* **Resumen Visual:** Gráficos modernos (líneas fluidas y anillos) que contrasten ingresos vs. gastos del periodo seleccionado, y la distribución del gasto por categoría.

### 2. Gestión de Cuentas, Monedas Separadas y Transacciones
* **Módulo de Cuentas (USD y COP Separados):** Capacidad de crear y administrar cuentas manteniendo las cuentas en **Pesos (`COP`)** y en **Dólares (`USD`)** por separado en su moneda nativa, evitando hacer doble conversión (`COP -> USD -> COP`) para que los redondeos no varíen nunca y los saldos sean 100% exactos.
* **Tasa Predeterminada:** La tasa de cambio predeterminada debe estar configurada en **3200 USD/COP** (`1 USD = 3,200 COP`).
* **Saldo Inicial por Defecto en 0:** Al crear una cuenta nueva, si el usuario no ingresa un saldo inicial (o lo deja vacío), el sistema debe tomar por defecto `0` sin bloquear la creación.
* **Inputs Numéricos (`type="tel"`):** Todos los campos de entrada numéricos (montos, saldos, límites de crédito, tasas, días de cobro, abonos y PIN) deben usar `type="tel"` con `inputMode="decimal"` o `"numeric"` y validación estricta para que solo se puedan escoger e ingresar números puros, desplegando el teclado numérico nativo en móviles.
* **Registro de Movimientos:** Un botón flotante o modal de acceso rápido para "Registrar Entrada/Salida". Todo movimiento debe vincularse obligatoriamente a una de las cuentas creadas, conservar su monto exacto sin distorsión por redondeo, vincularse a una categoría específica y tener fecha.

### 3. Secciones Especializadas
* **Gastos Fijos y Suscripciones:** Un panel para registrar pagos recurrentes mensuales (Netflix, gimnasio, renta). Debe mostrar el impacto mensual de estos pasivos.
* **Gestor de Deudas y Abonos:** Una vista para registrar dinero prestado o deudas adquiridas. Debe permitir ingresar "abonos" a estas deudas, mostrando barras de progreso hacia la liquidación total.

### 4. Módulo de Análisis IA (Smart Financial Advisor)
* Crea una pestaña dedicada que simule un análisis de inteligencia artificial sobre los patrones de gasto. 
* **Diagnóstico:** Debe detectar y enlistar "Qué estás haciendo mal" (ej. "Tus gastos hormiga representan el 20% de tu capital", "Estás sobreutilizando la tarjeta de crédito").
* **Plan de Acción:** Generar recomendaciones predictivas de cómo mejorar el estatus económico basado en las matemáticas de sus ingresos vs. gastos fijos y variables.

### 5. Persistencia SQLite Real y Gestión de Cuentas de Usuario
* **Peticiones SQLite y Guardado por Cuenta:** Realiza todas las peticiones a la base de datos SQLite (`wallet_flow.db`) de forma correcta y atómica (`ACID`), garantizando que cada movimiento, cuenta, suscripción, deuda y ajuste se guarde de forma persistente por cada una de las dos cuentas de usuario (`Munboi` y `Tiago`).
* **Identidad Basada en la Cuenta (Sin Crear Usuarios por Dispositivo):** No crees usuarios nuevos ni registros ligados al dispositivo cada vez que se inicia sesión desde un lugar o navegador diferente. No tomes en cuenta el dispositivo sino exclusivamente la cuenta (`munboi` o `tiago`) a la que se entró, cargando y guardando siempre los mismos datos exactos de esa cuenta sin importar desde dónde se acceda.
* **Pruebas Integrales:** Ejecuta pruebas automatizadas verificando la base de datos SQLite, la separación de cuentas en USD/COP sin errores de redondeo, la tasa `3200`, los inputs `type="tel"`, el saldo inicial por defecto en `0` y la vista superior en iOS.

## Instrucciones Técnicas de Generación
* Utiliza Tailwind CSS para lograr los efectos de cristal líquido (ej. clases como `bg-purple-900/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl`).
* Construye un layout con una barra de navegación lateral en desktop que se transforme en una *bottom tab bar* flotante estilo iOS en dispositivos móviles.
* Genera mockups de datos (dummy data) abundantes para que las gráficas, las cuentas y los consejos de la IA se visualicen completamente poblados desde el primer render. No me des explicaciones, genera directamente el código y la estructura completa.