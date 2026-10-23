# EnterpriseCloud · Sistema visual

La presentación usa un lienzo blanco, superficies neutras, iconografía outline y densidad moderada. Los componentes visuales se mantienen separados del modelo y del almacenamiento del ERP.

## Tokens

Los tokens se definen en `src/styles.css` y tienen variantes para el modo oscuro existente.

| Token | Claro | Uso |
| --- | --- | --- |
| `--bg`, `--panel` | `#FFFFFF` | Lienzo y tarjetas |
| `--surface-secondary` | `#F8F9FB` | Sidebar, filtros y secciones auxiliares |
| `--surface-soft`, `--hover` | `#F3F4F6` | Interacciones y superficies suaves |
| `--active-bg` | `#F3F4F6` | Módulo seleccionado |
| `--active-border` | `#DADDE3` | Borde del módulo seleccionado |
| `--line` | `#E5E7EB` | Separadores y bordes |
| `--ink` | `#111827` | Texto principal |
| `--mute` | `#6B7280` | Texto secundario |
| `--chart-sales` | `#647D91` | Ventas facturadas |
| `--chart-buys` | `#CBD4DE` | Compras ordenadas |

Inter es la tipografía principal, con alternativas del sistema. Los valores numéricos usan cifras tabulares. Las tarjetas tienen radios de 14 px; los modales, 16 px; los controles, 8 px. Las sombras son suaves y nunca sustituyen los bordes.

## Componentes

- `icons.tsx`: catálogo SVG local con trazos de 1.65 px, tamaños consistentes y nombres semánticos. Los iconos decorativos se ocultan a lectores de pantalla; los controles conservan sus nombres accesibles.
- Sidebar: grupos desplegables con separadores, selección gris con borde y un indicador discreto. Conserva las once rutas, el modo colapsado y la navegación móvil.
- `Metrics`: etiqueta, valor, icono y descripción discreta. No inventa tendencias ni porcentajes.
- `Records`: buscador integrado, filtros, separadores de filas, cifras alineadas a la derecha, estados y paginación. Los filtros y las exportaciones conservan su comportamiento.
- `Modal`: encabezado con identidad, overlay suave, cuerpo con scroll y acciones fijas dentro de formularios. Mantiene el foco dentro del diálogo, restaura el foco al cerrar y bloquea el scroll de la página.
- `BusinessChart`: barras o curvas entre valores reales, cuadrícula horizontal, etiquetas, leyendas y tooltip con acceso por foco. Para un único día presenta barras por defecto; no simula una serie temporal inexistente. El gráfico se carga de forma diferida con un skeleton real.

## Movimiento y accesibilidad

Las transiciones usan 180–220 ms. Las animaciones se limitan a gráficos, carga y diálogos. `prefers-reduced-motion` elimina el movimiento. Los estados de foco se muestran con un anillo suave y los controles conservan etiquetas accesibles.

Los estilos adaptan navegación, tarjetas, formularios y modales a móvil. Las tablas mantienen scroll horizontal dentro de su contenedor. El modo de impresión elimina controles y navegación.

## Alcance

La ficha de proveedores utiliza `proveedor-premium.html` como referencia visual. `supplier-profile.tsx` reproduce encabezado, avatar, tres KPI, cuatro pestañas, contacto editable, condiciones comerciales e historial; `supplier-premium.css` conserva las medidas y colores del archivo con estilos aislados. Los símbolos originales se sustituyen por SVG empresariales Lucide.

Mantenimientos utiliza tablas ordenables y paginadas, acciones compactas y formularios por secciones. `supplier-admin.tsx` administra proveedores; el selector de compras conserva tarjetas y búsqueda. Ambos utilizan la misma ficha y fuente de datos. Las tablas mantienen scroll horizontal interno en pantallas pequeñas.

El modelo conserva metadatos opcionales; el almacenamiento limpia una sola vez los registros operativos anteriores y no incorpora ejemplos. Las reglas operativas de inventario, recepción, facturación y cobros se conservan. La eliminación protege sus relaciones mediante desactivación cuando existen vínculos.

El selector compartido de productos utiliza `products.tsx` y estilos aislados en `products.css`: superficies blancas, iconos Lucide, tabla con selección gris, encabezado, paginación y acciones fijas, búsqueda con foco accesible y detalles dentro del mismo diálogo. La búsqueda, los filtros y los productos marcados sobreviven al cambio entre lista y ficha. Los datos locales se consultan sin introducir esperas ni cargas simuladas. La confirmación vuelve a comprobar disponibilidad e identidad antes de modificar las líneas del formulario.
