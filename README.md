# EnterpriseCloud ERP

Aplicación React + TypeScript con los módulos operativos de la referencia AlvaPlast, conservando la paleta original de EnterpriseCloud.

## Ejecutar

Desde `frontend`, ejecuta `npm install` y `npm run dev`. En PowerShell con ejecución de scripts restringida usa `npm.cmd`.

## Desplegar en Vercel

Importa el repositorio y utiliza la raíz del repositorio (`.`) como Root Directory. El `vercel.json` de la raíz instala y compila dentro de `frontend`, donde están `package.json` y `package-lock.json`, y publica `frontend/dist`.

También se admite Root Directory `frontend`: en ese caso Vercel utiliza `frontend/vercel.json` y publica `dist`. Elimina overrides manuales de Install Command, Build Command y Output Directory para utilizar la configuración versionada. Ambas configuraciones permiten abrir y recargar las rutas del ERP.

## Módulos

- Panel de control: indicadores calculados de documentos y existencias.
- Orden de compra: proveedores, productos, almacenes, pago, descuento y flete.
- Ingreso al Kardex: recepciones completas y parciales con notas de ingreso y remanentes.
- Cotización: borrador, enviada, aceptación/rechazo y conversión a orden de venta.
- Orden de venta: pedidos y verificación de disponibilidad.
- Facturación: comprobantes, salidas de stock y deuda de ventas a crédito.
- Estado de cuenta: cobros parciales y completos, historial y saldos.
- Movimiento de Kardex: entradas/salidas, saldo por almacén y documento original.
- Stock de productos: existencias, mínimos y valorización al costo del catálogo.
- Reportes: ventas por período, compras por proveedor, stock valorizado, kardex, cuentas por cobrar y comprobantes.
- Mantenimientos: clientes, proveedores, productos, almacenes, categorías, empresa, respaldo y auditoría.

## Datos y reglas

La clave `enterprisecloud-integrated-erp-v1` de localStorage guarda un único estado compartido por los módulos. La primera ejecución carga ejemplos; las operaciones posteriores se conservan al recargar. Las pestañas del mismo navegador reciben actualizaciones. Los datos anteriores del prototipo se conservan en sus claves antiguas, pero los módulos reemplazados ya no los utilizan.

Crear una compra no modifica stock: recibirla genera una nota y movimientos de entrada. Crear una venta no modifica stock: facturarla vuelve a verificar disponibilidad y genera salidas. Las cantidades pendientes de recepción permiten completar una compra parcialmente recibida. No se permite recibir más que lo ordenado, facturar dos veces, generar stock negativo, exceder la línea de crédito o cobrar más que la deuda. Los precios incluyen IGV; no se añade otro 18% al total. Crear una orden de venta verifica stock, pero no lo reserva.

Los filtros de fecha, estado y almacén afectan la tabla y el CSV correspondiente. Las tarjetas del historial y el resumen financiero muestran todos los documentos; el inventario y los reportes calculan sus propios filtros. El kardex mantiene el saldo de cada movimiento; la valorización actual usa el costo del catálogo, sin implementar PEPS ni promedio ponderado.

Los comprobantes son registros internos de esta aplicación: no hay envío a SUNAT, emisión fiscal, correo, autenticación real ni base de datos multiusuario. El botón Enviar cotización registra el estado, sin enviar mensajes. Los datos no se comparten entre dispositivos. Mantenimientos → Empresa permite descargar un respaldo JSON.

## Validación

Mantenimientos utiliza `supplier-admin.tsx`: tabla empresarial con búsqueda, filtros, ordenamiento, paginación y acciones Ver, Editar y Eliminar. El selector de compras y reportes sigue en `suppliers.tsx`, con tarjetas y búsqueda conservada al consultar detalles. Ambos utilizan el mismo estado y la misma ficha, convertida desde `frontend/proveedor-premium.html` en `supplier-profile.tsx` y `supplier-premium.css`, con las pestañas General, Contacto, Comercial e Historial.

Los formularios permiten completar información empresarial, contacto, ubicación y condiciones comerciales. País y sitio web se conservan únicamente como datos históricos internos y no aparecen en las interfaces de proveedores. `catalog-logic.ts` centraliza validaciones de RUC, duplicados, identidad y eliminación segura. El RUC se valida localmente por formato y dígito de control; no se verifica la inscripción en el [padrón de SUNAT](https://centrovirtual.sunat.gob.pe/tramites/inscribete-ruc). Un RUC histórico sin dígito correcto puede conservarse al editar otros campos; si se modifica, debe pasar la nueva validación.

Los registros vinculados a documentos, cotizaciones, movimientos o existencias se desactivan. Solo los registros sin vínculos se eliminan definitivamente. Las transacciones preservan identificadores, documentos y stock y registran auditoría. Clientes y productos comparten tablas, acciones y confirmaciones.

`demo.ts` completa los ejemplos iniciales con identificación DEMO, empresas ficticias, RUC de ejemplo y correos `.example`. Las órdenes iniciales también se identifican como simuladas. La actualización de ejemplos antiguos exige una coincidencia exacta de todos sus campos originales; los registros del usuario o editados se conservan. Las estadísticas y gráficos se calculan exclusivamente desde las órdenes registradas; un proveedor sin órdenes muestra cero y un estado vacío, sin valores aleatorios. El catálogo actual se lee directamente del estado local, sin demoras simuladas.

`frontend/src/erp/modal.tsx` administra capas, Escape, bloqueo del scroll y restauración del foco. Los diálogos se renderizan en portales para evitar formularios anidados. Los iconos empresariales utilizan Lucide React. La ficha premium reproduce los colores, medidas y organización del HTML de referencia; el resto del módulo utiliza los tokens existentes.

`npm run build` ejecuta TypeScript y compila producción. `npm test` verifica los flujos y reglas de negocio con Node 24. `npm run test:browser` verifica las pantallas, compra/recepción, cotización/venta/cobro, persistencia, exportación, catálogos y móvil usando Chrome instalado. Playwright inicia y termina su propio servidor local.

No se publicaron cambios en la web de referencia ni en un hosting externo.

## Selector compartido de productos

El panel ejecutivo (`dashboard.tsx`) muestra indicadores acumulados, saldos y antigüedad de deuda, alertas por almacén y órdenes de venta con búsqueda, ordenamiento y páginas iniciales de cinco registros. El gráfico tiene períodos propios: ocho semanas, seis meses o cuatro trimestres. `dashboard-data.ts` obtiene utilidad estimada de los costos históricos de las salidas, descontando IGV según el contrato actual de precios incluidos (18%); no resta compras como costo de ventas. La rotación utiliza valoraciones registradas y promedio ponderado en el tiempo, mostrando las fechas y el origen DEMO. Sin valores suficientes, se indica explícitamente.

`dashboard-demo.ts` completa una sola vez ejemplos identificados como DEMO: una compra con recepción, dos ventas facturadas, dos cotizaciones, tres cuentas por pagar y tres valoraciones simuladas en instalaciones íntegramente DEMO. Mantiene identificadores y documentos anteriores. No genera valoraciones históricas cuando hay registros reales mezclados. Las deudas de proveedores y sus pagos se consultan en Estado de cuenta mediante `payables.tsx`; sus saldos se guardan por separado de los importes de órdenes de compra. El perfil actual sigue siendo local (“Administrador”), sin autenticación nueva.

`products.tsx` ofrece búsqueda por nombre, código, SKU, código de barras y descripción; filtros reales de categoría, estado y existencias; ordenamiento; fichas y selección múltiple. `product-query.ts` aplica filtros y ordenamiento sobre todo el catálogo antes de paginar (10, 20 o 50 registros). Compras utiliza costos y permite stock cero; ventas utiliza precios y comprueba el almacén y las cantidades existentes; cotizaciones permite proponer productos sin stock. Agregar de nuevo un producto aumenta su cantidad en uno y conserva su precio negociado.

Compras, ventas y cotizaciones utilizan el mismo selector. Los documentos y el inventario permiten consultar la ficha compartida; las recepciones mantienen las líneas de su orden de origen. Mantenimientos edita SKU y código de barras opcionales en la misma fuente persistente. No se crean catálogos adicionales. El proyecto contiene ocho productos DEMO; las pruebas utilizan un catálogo aislado de 240 registros para verificar filtros y paginación sin añadirlos a los datos del usuario.
