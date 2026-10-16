# Flujo general de EnterpriseCloud ERP

Este diagrama representa las pantallas y acciones implementadas. Las flechas continuas indican el recorrido operativo; las discontinuas indican consultas y actualización de información. Se puede ampliar el diagrama desde GitHub.

```mermaid
%%{init: {"theme":"base","themeVariables":{"primaryColor":"#F9FAFB","primaryTextColor":"#111827","primaryBorderColor":"#9CA3AF","lineColor":"#6B7280","secondaryColor":"#F3F4F6","tertiaryColor":"#FFFFFF","fontFamily":"Arial"}}}%%
flowchart TB
    INICIO([Abrir EnterpriseCloud]) --> CARGA[Leer datos del navegador]
    CARGA --> PANEL[Resumen ejecutivo]
    PANEL --> MENU{Elegir un módulo}

    subgraph CATALOGOS[Catálogos y configuración]
        MANT[Mantenimientos] --> CLIENTES[Clientes: crear, consultar y editar]
        MANT --> PROVEEDORES[Proveedores y ficha premium]
        PROVEEDORES --> HISTORIAL[Historial: compras por orden e importes]
        MANT --> PRODUCTOS[Productos: precio, costo, unidad y mínimo]
        MANT --> ALMACENES[Almacenes]
        MANT --> CATEGORIAS[Categorías: crear y eliminar]
        CATEGORIAS --> REASIGNAR[Reasignar productos o dejarlos sin categoría]
        MANT --> EMPRESA[Empresa y descarga de respaldo JSON]
    end
    MENU --> MANT

    subgraph COMPRAS[Abastecimiento]
        OC[Crear orden de compra] --> OCPEND[Orden pendiente: stock sin cambios]
        OCPEND --> OCACCION{Qué hacer}
        OCACCION -->|Sin recepciones ni pagos| OCCANCEL[Cancelar orden y conservar historial]
        OCACCION -->|Recibir mercadería| INGRESO[Ingreso al Kardex: elegir almacén y cantidades]
        INGRESO --> VALIDAROC{Cantidades válidas y orden vigente}
        VALIDAROC -->|No| CORREGIROC[Corregir formulario]
        CORREGIROC --> INGRESO
        VALIDAROC -->|Sí| NI[Registrar nota de ingreso]
        NI --> ENTRADA[Movimiento de entrada y aumento de stock]
        ENTRADA --> COMPLETA{Se recibió todo}
        COMPLETA -->|No| PARCIAL[Orden recibida parcialmente]
        PARCIAL --> INGRESO
        COMPLETA -->|Sí| RECIBIDA[Orden recibida]
    end
    MENU --> OC
    MENU --> INGRESO
    PROVEEDORES -.-> OC
    PRODUCTOS -.-> OC
    ALMACENES -.-> INGRESO

    subgraph VENTAS[Comercial]
        COT[Crear cotización] --> BORRADOR[Guardar cotización en borrador]
        BORRADOR --> COTACCION{Elegir acción}
        COTACCION -->|Ojito| VERCOT[Consultar detalles]
        VERCOT --> BORRADOR
        COTACCION -->|Editar| COT
        COTACCION -->|Eliminar| ELIMINADA[Eliminar solo el borrador sin venta vinculada]
        COTACCION -->|Enviar| CONFENVIO[Confirmar destinatario y registrar envío]
        CONFENVIO --> ENVIADA[Cotización enviada]
        ENVIADA --> RESPUESTA{Respuesta del cliente}
        RESPUESTA -->|No aceptó| BORRADOR
        RESPUESTA -->|Aceptar y validar disponibilidad| ACEPTADA[Cotización aceptada]
        ACEPTADA --> OV[Pedido de venta pendiente]
        DIRECTA[Crear pedido de venta directamente] --> OV
        OV --> OVACCION{Qué hacer}
        OVACCION -->|Sin factura ni movimientos| OVCANCEL[Cancelar pedido y conservar historial]
        OVACCION -->|Facturar| FACT[Facturación y comprobantes]
        FACT --> VALIDARVENTA{Stock, estado y crédito válidos}
        VALIDARVENTA -->|No| CORREGIRVENTA[Mostrar error y corregir operación]
        CORREGIRVENTA --> FACT
        VALIDARVENTA -->|Sí| CP[Emitir comprobante y crear saldo por cobrar]
        CP --> SALIDA[Movimiento de salida y descuento de stock]
        CP --> FACTURADA[Pedido facturado y cotización procesada si está vinculada]
        CP --> CXC[Cuentas por cobrar]
        CXC --> COBRO[Registrar importe, fecha y medio de pago]
        COBRO --> SALDO{Queda saldo}
        SALDO -->|Sí| PAGO[Comprobante con pago parcial]
        PAGO --> CXC
        SALDO -->|No| PAGADA[Comprobante pagado]
    end
    MENU --> COT
    MENU --> DIRECTA
    MENU --> FACT
    MENU --> CXC
    CLIENTES -.-> COT
    CLIENTES -.-> DIRECTA
    PRODUCTOS -.-> COT
    ALMACENES -.-> OV

    subgraph CONSULTAS[Inventario y gestión]
        KARDEX[Movimientos de Kardex: entradas, salidas y documentos]
        STOCK[Stock de productos: existencias por almacén]
        REPORTES[Analítica y reportes: filtros y exportación]
        DASH[Dashboard: indicadores, saldos y pedidos de hoy]
    end
    MENU --> KARDEX
    MENU --> STOCK
    MENU --> REPORTES
    ENTRADA -.-> KARDEX
    SALIDA -.-> KARDEX
    ENTRADA -.-> STOCK
    SALIDA -.-> STOCK
    KARDEX -.-> REPORTES
    STOCK -.-> REPORTES
    CP -.-> REPORTES
    OC -.-> REPORTES
    COBRO -.-> DASH
    CP -.-> DASH
    OC -.-> DASH
    OVCANCEL -.-> DASH
    OCCANCEL -.-> DASH
    PANEL -.-> DASH

    subgraph ADMIN[Administración]
        USUARIOS[Usuarios locales y perfiles]
        ROLES[Roles y matriz de permisos]
        AUDITORIA[Consulta de auditoría]
        USUARIOS --> ROLES
    end
    MENU --> USUARIOS
    MENU --> AUDITORIA
```

## Reglas del recorrido

- Crear una orden de compra no aumenta stock; confirmar su recepción crea la nota de ingreso y la entrada de inventario.
- Aceptar una cotización crea el pedido vinculado. El pedido verifica disponibilidad, pero no reserva ni descuenta stock.
- Facturar comprueba nuevamente disponibilidad y, si corresponde, crédito; genera el comprobante, la salida de inventario y la deuda. Una venta al contado también requiere registrar el cobro por separado.
- La cancelación conserva el documento. Compras exige que no existan recepciones, movimientos ni pagos; ventas exige que no exista factura, movimiento ni cobro. No hay reversión de ingresos ni anulación fiscal implementada.
- Una cotización aceptada o procesada no se edita ni elimina. Una enviada solo ofrece consulta y respuesta del cliente. El rechazo la devuelve a borrador.
- Enviar cotización registra el estado y muestra el correo del cliente; no envía un correo real. Los comprobantes tampoco se remiten a SUNAT.
- Los formularios y listas operativas abren con la fecha actual; sus filtros permiten consultar otras fechas. El dashboard muestra únicamente pedidos de hoy y el gráfico diario del mes hasta hoy.
- Las operaciones válidas se guardan y actualizan las consultas relacionadas. Consultar, filtrar, exportar o cobrar no mueve inventario.

Fuentes del código: [model.ts](../frontend/src/erp/model.ts), [pages.tsx](../frontend/src/erp/pages.tsx), [receiving.tsx](../frontend/src/erp/receiving.tsx), [catalogs.tsx](../frontend/src/erp/catalogs.tsx).
