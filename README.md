# EnterpriseCloud ERP

Aplicación React + TypeScript con los módulos operativos de la referencia AlvaPlast, conservando la paleta original de EnterpriseCloud.

## Diagramas del sistema

- [Diagrama de flujo general](docs/flujo-general.md): recorrido de uso, estados, decisiones y conexiones de todas las pantallas.
- [Diagrama de funcionamiento y módulos](docs/funcionamiento-modulos.md): arquitectura actual, persistencia, sincronización, relaciones y responsabilidades de cada módulo.

Los diagramas están escritos en Mermaid y se visualizan directamente en GitHub.

## Ejecutar

Desde `frontend`, ejecuta `npm install` y `npm run dev`. En PowerShell con ejecución de scripts restringida usa `npm.cmd`.

## Desplegar en Vercel

Repositorio: https://github.com/josueochoareyes/erp-proyecto

No se requieren variables de entorno, claves API ni conexión a una base de datos para esta versión. En Vercel, importa el repositorio, deja Root Directory en `.` y pulsa Deploy. Los comandos de instalación (`cd frontend && npm ci`), compilación (`cd frontend && npm run build`) y salida (`frontend/dist`) ya están definidos en `vercel.json`. Usa Node.js 24.x para ejecutar también las pruebas de Node que importan archivos TypeScript.

La aplicación usa localStorage: los módulos y pestañas del mismo navegador y dominio comparten datos. El dominio nuevo de Vercel tiene almacenamiento independiente del entorno local y del sitio anterior; desplegar el código no transfiere los registros guardados ni crea un backend multiusuario.

Importa el repositorio y utiliza la raíz del repositorio (`.`) como Root Directory. El `vercel.json` de la raíz instala y compila dentro de `frontend`, donde están `package.json` y `package-lock.json`, y publica `frontend/dist`.

También se admite Root Directory `frontend`: en ese caso Vercel utiliza `frontend/vercel.json` y publica `dist`. Elimina overrides manuales de Install Command, Build Command y Output Directory para utilizar la configuración versionada. Ambas configuraciones permiten abrir y recargar las rutas del ERP.

## Módulos

- Panel de control: indicadores calculados de documentos y existencias.
- Orden de compra: proveedores, productos, almacenes, pago, descuento y flete; cancelación antes de recibir y sin pagos.
- Ingreso al Kardex: recepciones completas y parciales con notas de ingreso y remanentes.
- Cotización: borrador, enviada, aceptación/rechazo y conversión a orden de venta.
- Orden de venta: pedidos y verificación de disponibilidad; cancelación antes de facturar.
- Facturación: comprobantes, salidas de stock y deuda de ventas a crédito.
- Estado de cuenta: cobros parciales y completos, historial y saldos.
- Movimiento de Kardex: entradas/salidas, saldo por almacén y documento original.
- Stock de productos: existencias, mínimos y valorización al costo del catálogo.
- Reportes: ventas por período, compras por proveedor, stock valorizado, kardex, cuentas por cobrar y comprobantes.
- Mantenimientos: clientes, proveedores, productos, almacenes, categorías, empresa y respaldo. Auditoría se consulta en Administración.

## Datos y reglas

La clave `enterprisecloud-integrated-erp-v1` de localStorage guarda un único estado compartido por los módulos. La primera ejecución carga ejemplos; las operaciones posteriores se conservan al recargar. Las pestañas del mismo navegador reciben actualizaciones. Los datos anteriores del prototipo se conservan en sus claves antiguas, pero los módulos reemplazados ya no los utilizan.

Crear una compra no modifica stock: recibirla genera una nota y movimientos de entrada. Crear una venta no modifica stock: facturarla vuelve a verificar disponibilidad y genera salidas. Las cantidades pendientes de recepción permiten completar una compra parcialmente recibida. No se permite recibir más que lo ordenado, facturar dos veces, generar stock negativo, exceder la línea de crédito o cobrar más que la deuda. Los precios incluyen IGV; no se añade otro 18% al total. Crear una orden de venta verifica stock, pero no lo reserva.

Los filtros de fecha, estado y almacén afectan la tabla y el CSV correspondiente. Las tarjetas del historial muestran los indicadores acumulados; el inventario y los reportes calculan sus propios filtros. El kardex mantiene el saldo de cada movimiento; la valorización actual usa el costo del catálogo, sin implementar PEPS ni promedio ponderado.

Los comprobantes son registros internos de esta aplicación: no hay envío a SUNAT, emisión fiscal, correo, autenticación real ni base de datos multiusuario. El botón Enviar cotización registra el estado, sin enviar mensajes. Los datos no se comparten entre dispositivos. Mantenimientos → Empresa permite descargar un respaldo JSON.

## Validación

Mantenimientos utiliza `supplier-admin.tsx`: tabla empresarial con búsqueda, filtros, ordenamiento, paginación y acciones Ver, Editar y Eliminar. El selector de compras y reportes sigue en `suppliers.tsx`, con tarjetas y búsqueda conservada al consultar detalles. Ambos utilizan el mismo estado y la misma ficha, convertida desde `frontend/proveedor-premium.html` en `supplier-profile.tsx` y `supplier-premium.css`, con las pestañas General, Contacto, Comercial e Historial.

Los formularios permiten completar información empresarial, contacto, ubicación y condiciones comerciales. País y sitio web se conservan únicamente como datos históricos internos y no aparecen en las interfaces de proveedores. `catalog-logic.ts` centraliza validaciones de RUC, duplicados, identidad y eliminación segura. El RUC de proveedores se valida localmente por formato y dígito de control; los clientes aceptan cualquier número de 11 dígitos como RUC, o un DNI de 8 dígitos, sin documentos duplicados. Para proveedores, no se verifica la inscripción en el [padrón de SUNAT](https://centrovirtual.sunat.gob.pe/tramites/inscribete-ruc). Un RUC histórico sin dígito correcto puede conservarse al editar otros campos; si se modifica, debe pasar la nueva validación.

Los registros vinculados a documentos, cotizaciones, movimientos o existencias se desactivan. Solo los registros sin vínculos se eliminan definitivamente. Las transacciones preservan identificadores, documentos y stock y registran auditoría. Clientes y productos comparten tablas, acciones y confirmaciones.

`demo.ts` completa los ejemplos iniciales con identificación DEMO, empresas ficticias, RUC de ejemplo y correos `.example`. Las órdenes iniciales también se identifican como simuladas. La actualización de ejemplos antiguos exige una coincidencia exacta de todos sus campos originales; los registros del usuario o editados se conservan. Las estadísticas y gráficos se calculan exclusivamente desde las órdenes registradas; un proveedor sin órdenes muestra cero y un estado vacío, sin valores aleatorios. El catálogo actual se lee directamente del estado local, sin demoras simuladas.

`frontend/src/erp/modal.tsx` administra capas, Escape, bloqueo del scroll y restauración del foco. Los diálogos se renderizan en portales para evitar formularios anidados. Los iconos empresariales utilizan Lucide React. La ficha premium reproduce los colores, medidas y organización del HTML de referencia; el resto del módulo utiliza los tokens existentes.

`npm run build` ejecuta TypeScript y compila producción. `npm test` verifica los flujos y reglas de negocio con Node 24. `npm run test:browser` verifica las pantallas, compra/recepción, cotización/venta/cobro, persistencia, exportación, catálogos y móvil usando Chrome instalado. Playwright inicia y termina su propio servidor local.

No se publicaron cambios en la web de referencia ni en un hosting externo.

## Selector compartido de productos

El panel ejecutivo (`dashboard.tsx`) muestra indicadores acumulados, cuentas por cobrar, pedidos por facturar, alertas por almacén y únicamente las órdenes de venta de hoy, con búsqueda, ordenamiento y páginas iniciales de cinco registros. El gráfico compara ventas y compras por día desde el inicio del mes hasta hoy, sin fechas futuras ni selectores de período. `dashboard-data.ts` obtiene la utilidad estimada de los costos históricos de las salidas, descontando IGV según el contrato actual de precios incluidos (18%); no resta compras como costo de ventas.

`dashboard-demo.ts` completa una sola vez ejemplos identificados como DEMO. La limpieza única de `operation-cleanup.ts` elimina las operaciones del 16/10/2026 solicitadas, ajusta inventario y vínculos, y conserva los registros nuevos posteriores a esa limpieza. Cuentas por pagar y Rotación de inventario no aparecen en el dashboard ni en Cuentas por cobrar. El perfil actual sigue siendo local, sin autenticación de servidor.

`products.tsx` ofrece búsqueda por nombre, código, SKU, código de barras y descripción; filtros reales de categoría, estado y existencias; ordenamiento; fichas y selección múltiple. `product-query.ts` aplica filtros y ordenamiento sobre todo el catálogo antes de paginar (10, 20 o 50 registros). Compras utiliza costos y permite stock cero; ventas utiliza precios y comprueba el almacén y las cantidades existentes; cotizaciones permite proponer productos sin stock. Agregar de nuevo un producto aumenta su cantidad en uno y conserva su precio negociado.

Compras, ventas y cotizaciones utilizan el mismo selector. Los documentos y el inventario permiten consultar la ficha compartida; las recepciones mantienen las líneas de su orden de origen. Mantenimientos edita SKU y código de barras opcionales en la misma fuente persistente. No se crean catálogos adicionales. El proyecto contiene ocho productos DEMO; las pruebas utilizan un catálogo aislado de 240 registros para verificar filtros y paginación sin añadirlos a los datos del usuario.

## Fichas de venta y comprobantes

Las órdenes de venta y los comprobantes usan `sales-documents.tsx`: fichas con General, Productos, Resumen económico y Seguimiento. La confirmación de facturación presenta datos de la orden sin editar sus líneas, previsión de numeración interna, vencimiento según la condición de crédito y un resumen de las operaciones. Al confirmar se utiliza la transacción existente; la ficha del comprobante generado se abre automáticamente.

Los documentos nuevos conservan una copia del cliente, descripción/categoría/unidad de los productos, moneda, condiciones comerciales y fecha de creación. Los eventos de estado se registran desde las nuevas operaciones. No se reconstruyen ni sobrescriben los históricos: si no hay copia del cliente se identifica que procede de la ficha actual; las fechas y estados históricos ausentes se muestran sin inventarlos. Seguimiento también consulta los eventos de auditoría relacionados.

El total guardado es la referencia del resumen; base imponible e IGV se desglosan según el contrato de precios con 18% incluido. El descuento existente es global y no se distribuye ficticiamente entre productos. Cualquier diferencia histórica entre el detalle y el total se muestra sin corregir el documento. La impresión genera un registro interno con presentación empresarial, identificado como DEMO cuando corresponde y sin atribuir validación SUNAT.

`tests/sales-documents.test.mjs` comprueba datos acordados y copias independientes durante la conversión/facturación, relaciones documentales y totales históricos. `tests/browser/sales-documents.spec.ts` cubre escritorio, móvil, pestañas, vínculos de origen, facturación, persistencia y rechazo por stock insuficiente.

## Facturacion y cobros

Al facturar, la orden queda Facturada y el comprobante Pendiente de pago, incluso al contado. El cobro se registra por separado en Estado de cuenta: un abono deja Pago parcial y el pago completo deja Pagada con saldo cero. Cada nuevo cobro genera una referencia interna COB-000001 sin solicitar escritura manual. El formulario muestra el cliente, comprobante y saldo pendiente, sin bloque de saldo posterior. Las fichas permiten imprimir y no ofrecen descarga HTML. Los documentos anteriores conservan sus registros.
