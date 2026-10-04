# CloudOps Dashboard – Sistema Web para la Planificación y Visualización Cloud

Sistema web profesional desarrollado en **React + TypeScript + Tailwind CSS** para simular la planificación, análisis de costos, infraestructura global, seguridad e IAM, y arquitectura de red de una propuesta de solución Cloud en **Amazon Web Services (AWS)**.

---

## 🚀 Descripción del Proyecto

El **CloudOps Dashboard** es un panel empresarial interactivo diseñado para representar una propuesta completa de arquitectura en la nube basada en los fundamentos de AWS. La aplicación permite a ingenieros Cloud y administradores planificar soluciones, simular presupuestos mensuales/anuales con exportación de reportes, analizar la infraestructura global de AWS, verificar controles de seguridad (Modelo de Responsabilidad Compartida) y visualizar diagramas de red interactivos (Internet, Route 53, CloudFront, VPC, EC2, RDS).

---

## 🛠️ Tecnologías Utilizadas

- **React 18** + **TypeScript** - Construcción de interfaz basada en componentes reutilizables y tipado estricto.
- **Tailwind CSS** - Diseño responsivo con paleta de colores empresarial (`#0F172A`, `#2563EB`, `#16A34A`, `#F59E0B`, `#DC2626`, `#F8FAFC`).
- **Recharts** - Gráficos interactivos de pastel (distribución por categoría) y barras (estimación de costos).
- **Lucide React** - Iconografía coherente y moderna para servicios AWS e indicadores de estado.
- **Vite** - Bundler ultra-rápido para desarrollo en caliente y compilación optimizada.
- **LocalStorage API** - Persistencia local de temas, notificaciones, propuestas registradas y estimaciones.

---

## 📂 Estructura del Código Fuente

```
cloudops-dashboard/
├── src/
│   ├── components/          # Componentes reutilizables
│   │   ├── Header.tsx       # Barra superior con título, búsqueda, selector de región y tema
│   │   ├── Sidebar.tsx      # Menú lateral con navegación por módulos (#0F172A)
│   │   ├── StatCard.tsx     # Tarjetas de indicadores KPI con estado e iconos
│   │   ├── ServiceCard.tsx  # Tarjetas de servicios AWS con badges y modales
│   │   ├── CostCard.tsx     # Tarjetas interactivas de cálculo de costos
│   │   ├── SecurityCard.tsx # Tarjetas de responsabilidad compartida y auditoría
│   │   ├── RegionCard.tsx   # Tarjetas de infraestructura regional AWS
│   │   ├── StatusBadge.tsx  # Badges semáforo (Verde = OK, Amarillo = Revisar, Rojo = Problema)
│   │   ├── ServiceDetailModal.tsx # Modal con detalles técnicos y SLA de servicios
│   │   └── ToastNotification.tsx  # Sistema de notificaciones emergentes (toasts)
│   ├── pages/               # Páginas principales del sistema (Módulos 1 al 7)
│   │   ├── Dashboard.tsx    # Módulo 1: Resumen ejecutivo, KPIs, gráfico y seguridad
│   │   ├── Planning.tsx     # Módulo 2: Formulario de propuesta Cloud y tabla de registro
│   │   ├── Costs.tsx        # Módulo 3: Calculadora TCO, gráfico interactivo y exportación CSV
│   │   ├── Infrastructure.tsx # Módulo 4: Visor de regiones y zonas de disponibilidad
│   │   ├── Security.tsx     # Módulo 5: Modelo de Responsabilidad Compartida e IAM
│   │   ├── Network.tsx      # Módulo 6: Diagrama interactivo de arquitectura de red VPC
│   │   └── Services.tsx     # Módulo 7: Catálogo de servicios AWS con filtros y buscador
│   ├── data/
│   │   └── awsServices.ts   # Datos mock de servicios, regiones, seguridad y red
│   ├── types/
│   │   └── cloud.ts         # Modelos de datos TypeScript (Interfaces)
│   ├── context/
│   │   └── AppContext.tsx   # Estado global (Tema oscuro, Región activa, Notificaciones)
│   ├── App.tsx              # Componente raíz y maquetación de rutas
│   ├── main.tsx             # Punto de entrada de la aplicación
│   └── index.css            # Directivas de Tailwind y estilos personalizados
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

---

## ⚡ Instalación y Ejecución

1. **Clonar / Ubicarse en el directorio del proyecto:**
   ```bash
   cd "c:\Users\jose2\Desktop\trabajo cloud"
   ```

2. **Instalar dependencias:**
   ```bash
   npm install
   ```

3. **Ejecutar el servidor de desarrollo local:**
   ```bash
   npm run dev
   ```
   *La aplicación estará disponible en `http://localhost:5173/`.*

4. **Compilar para producción:**
   ```bash
   npm run build
   ```

---

## 📋 Módulos y Funcionalidades Principales

### 1. Dashboard (`Módulo 1`)
- Muestra el resumen general de la solución activada.
- **Indicadores KPI:** Servicios en uso, región activa, costo mensual estimado (`$394.10 USD`), costo anual (`$4,729.20 USD`) y puntuación de seguridad (`86%`).
- **Gráficos interactivos:** Distribución de costos por categoría (Computación, Base de Datos, Almacenamiento, Redes).
- Resumen del estado de seguridad y tarjetas de servicios destacados.

### 2. Planificación Cloud (`Módulo 2`)
- Formulario interactivo para registrar propuestas Cloud con campos: Nombre de la solución, Tipo de app, Descripción, Región, Usuarios estimados, Nivel SLA (99.99%), Servicios seleccionados y Objetivo de migración.
- Visualización de propuestas registradas en tarjetas persistidas en `localStorage`.

### 3. Costos y Economía Cloud (`Módulo 3`)
- Estimación dinámica de costos por servicio ajustando cantidad de instancias y horas mensuales (1 a 720 hrs).
- Gráfico de barras comparativo de gastos mensuales.
- **Reto Adicional:** Botón de **Exportación de Reporte en archivo CSV** descargable.

### 4. Infraestructura Global (`Módulo 4`)
- Visor de regiones mundiales de AWS (N. Virginia `us-east-1`, Oregón `us-west-2`, Irlanda `eu-west-1`, São Paulo `sa-east-1`, Tokio `ap-northeast-1`).
- Desglose de latencia en ms, número de Zonas de Disponibilidad (AZs), servicios desplegados y badge de estado operante.

### 5. Seguridad e IAM (`Módulo 5`)
- Matriz de **Modelo de Responsabilidad Compartida** diferenciando responsabilidades de AWS vs Cliente vs Compartidas.
- Tabla de administración de usuarios **IAM**, rol asignado, estado de **MFA**, llaves de acceso y políticas.
- Semáforo de seguridad (Verde = Correcto, Amarillo = Requiere revisión, Rojo = Problema).

### 6. Arquitectura de Red (`Módulo 6`)
- Diagrama web interactivo (sin imágenes pegadas) representando el flujo de tráfico completo:
  $$\text{INTERNET} \rightarrow \text{Route 53} \rightarrow \text{CloudFront} \rightarrow \text{VPC} \rightarrow \text{EC2 / RDS}$$
- Subredes públicas (ALB) y privadas (EC2, RDS Multi-AZ) con inspección de conectores y CIDR IP (`10.0.0.0/16`).

### 7. Servicios AWS (`Módulo 7`)
- Catálogo interactivo de servicios (EC2, S3, RDS, IAM, VPC, Route 53, CloudFront, Lambda, DynamoDB).
- **Reto Adicional:** Buscador instantáneo por nombre/palabras clave y filtros por categorías.
- Modal de vista detallada con SLA, tier, modelos de precios y casos de uso.

---

## 🌟 Retos Adicionales Implementados (100%)

- [x] **Modo Oscuro (Dark Mode):** Alternador con persistencia en `localStorage`.
- [x] **Buscador de Servicios:** Búsqueda en tiempo real en la barra superior y en el catálogo.
- [x] **Filtros por Categoría:** Filtrado instantáneo por Computación, Almacenamiento, Bases de Datos, etc.
- [x] **Gráficos Interactivos:** Visualizaciones con Tooltips integrados con Recharts.
- [x] **Exportación de Reporte:** Descarga automatizada de archivo CSV con el presupuesto estructurado.
- [x] **Selector de Regiones:** Selector global en el Header y selector interactivo en la pestaña de Infraestructura.
- [x] **Notificaciones Toast:** Feedback dinámico al agregar servicios, cambiar temas y registrar propuestas.
- [x] **Vista Detallada en Modal:** Inspección profunda de cada servicio AWS con datos de SLA.
- [x] **Animaciones y Transiciones:** Efectos suaves en Tailwind CSS.
- [x] **Persistencia Local:** Guardado de preferencias y datos del usuario.
