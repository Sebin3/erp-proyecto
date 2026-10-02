export type NavItem={label:string;path:string;group?:string;icon:string;children?:NavItem[]};
export const navigation:NavItem[]=[
 {label:'Dashboard',path:'/dashboard',icon:'⌂'},
 {label:'Comercial',path:'/comercial',icon:'◫',children:[{label:'Clientes',path:'/comercial/clientes',icon:'•'},{label:'Cotizaciones',path:'/comercial/cotizaciones',icon:'•'},{label:'Ventas',path:'/comercial/ventas',icon:'•'},{label:'Facturación',path:'/comercial/facturacion',icon:'•'}]},
 {label:'Compras',path:'/compras',icon:'◧',children:[{label:'Proveedores',path:'/compras/proveedores',icon:'•'},{label:'Solicitudes',path:'/compras/solicitudes',icon:'•'},{label:'Órdenes',path:'/compras/ordenes',icon:'•'},{label:'Recepción',path:'/compras/recepcion',icon:'•'}]},
 {label:'Inventario',path:'/inventario',icon:'◇',children:[{label:'Productos',path:'/inventario/productos',icon:'•'},{label:'Almacenes',path:'/inventario/almacenes',icon:'•'},{label:'Kardex',path:'/inventario/kardex',icon:'•'},{label:'Transferencias',path:'/inventario/transferencias',icon:'•'}]},
 {label:'Finanzas',path:'/finanzas',icon:'▣',children:[{label:'Cuentas por cobrar',path:'/finanzas/cuentas-por-cobrar',icon:'•'},{label:'Cuentas por pagar',path:'/finanzas/cuentas-por-pagar',icon:'•'},{label:'Caja',path:'/finanzas/caja',icon:'•'},{label:'Bancos',path:'/finanzas/bancos',icon:'•'}]},
 {label:'Documentos',path:'/documentos',icon:'▤'}, {label:'Reportes',path:'/reportes',icon:'▥'},
 {label:'Administración',path:'/administracion',icon:'⚙',children:[{label:'Usuarios',path:'/administracion/usuarios',icon:'•'},{label:'Roles',path:'/administracion/roles',icon:'•'},{label:'Permisos',path:'/administracion/permisos',icon:'•'},{label:'Auditoría',path:'/administracion/auditoria',icon:'•'}]},
 {label:'Configuración',path:'/configuracion',icon:'☼'}
];
export const flatNavigation=navigation.flatMap(item=>item.children??[item]);
