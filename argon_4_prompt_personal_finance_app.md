# Prompt para Argon 4: App de Finanzas Personales (Liquid Glass)

**Rol y Contexto:**
Actúa como un Senior Full-Stack Developer y experto en UI/UX. Tu objetivo es construir una aplicación web de finanzas personales de nivel empresarial, 100% responsive (mobile-first) y con una navegación fluida.

## Sistema de Diseño y UI/UX (Liquid Glass for iOS)
* **Estilo Visual:** Implementa un diseño "Liquid Glass" (Glassmorphism). Utiliza paneles translúcidos, desenfoque de fondo (`backdrop-blur-lg`), bordes sutiles semitransparentes (`border-white/10`) y sombras suaves y difuminadas.
* **Paleta de Colores:** Diseño estrictamente en *Dark Mode*. El fondo principal debe ser un negro profundo o gris muy oscuro (`#0F0F13`). Los colores de acento, botones, gradientes y estados activos deben usar una escala de morados premium (desde violeta neón hasta púrpura oscuro). 
* **Tipografía e Iconografía:** Usa una tipografía sans-serif limpia (estilo SF Pro de Apple) y una librería de iconos minimalistas (como Lucide Icons).

## Arquitectura de la Aplicación y Funcionalidades Core

### 1. Dashboard Principal (Visión General)
* **Filtro Temporal Global:** Un selector en la parte superior para cambiar toda la vista de datos (Mensual por defecto, con opciones a Semanal, Trimestral y Anual).
* **Hero Card (Capital Actual):** Una tarjeta Liquid Glass destacada mostrando el balance total neto. Justo debajo, un desglose visual del dinero seccionado por cuentas (ej. $X en Banco A, $Y en Efectivo, -$Z en Tarjeta de Crédito).
* **Resumen Visual:** Gráficos modernos (líneas fluidas y anillos) que contrasten ingresos vs. gastos del periodo seleccionado, y la distribución del gasto por categoría.

### 2. Gestión de Cuentas y Transacciones
* **Módulo de Cuentas:** Capacidad de crear y administrar cuentas. Los tipos obligatorios son: Efectivo, Cuentas Bancarias (Débito/Ahorro) y Tarjetas de Crédito.
* **Registro de Movimientos:** Un botón flotante o modal de acceso rápido para "Registrar Entrada/Salida". Todo movimiento debe vincularse obligatoriamente a una de las cuentas creadas, a una categoría específica, y tener fecha.

### 3. Secciones Especializadas
* **Gastos Fijos y Suscripciones:** Un panel para registrar pagos recurrentes mensuales (Netflix, gimnasio, renta). Debe mostrar el impacto mensual de estos pasivos.
* **Gestor de Deudas y Abonos:** Una vista para registrar dinero prestado o deudas adquiridas. Debe permitir ingresar "abonos" a estas deudas, mostrando barras de progreso hacia la liquidación total.

### 4. Módulo de Análisis IA (Smart Financial Advisor)
* Crea una pestaña dedicada que simule un análisis de inteligencia artificial sobre los patrones de gasto. 
* **Diagnóstico:** Debe detectar y enlistar "Qué estás haciendo mal" (ej. "Tus gastos hormiga representan el 20% de tu capital", "Estás sobreutilizando la tarjeta de crédito").
* **Plan de Acción:** Generar recomendaciones predictivas de cómo mejorar el estatus económico basado en las matemáticas de sus ingresos vs. gastos fijos y variables.

## Instrucciones Técnicas de Generación
* Utiliza Tailwind CSS para lograr los efectos de cristal líquido (ej. clases como `bg-purple-900/20 backdrop-blur-xl border border-purple-500/30 rounded-2xl`).
* Construye un layout con una barra de navegación lateral en desktop que se transforme en una *bottom tab bar* flotante estilo iOS en dispositivos móviles.
* Genera mockups de datos (dummy data) abundantes para que las gráficas, las cuentas y los consejos de la IA se visualicen completamente poblados desde el primer render. No me des explicaciones, genera directamente el código y la estructura completa.