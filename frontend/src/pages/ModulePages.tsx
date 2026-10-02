import { CrudModule, type CrudConfig } from '../components/CrudModule';
import { customers, inventory, sales } from '../modules/erp/data';
import type { ModuleId } from '../types/erp';

const textRows = (rows:readonly (readonly (string|number)[])[]) => rows.map(row=>row.map(String));
const salesConfig:CrudConfig={storageKey:'erp-sales',title:'Ventas',description:'Cotizaciones, pedidos y comprobantes emitidos.',action:'Nueva venta',headers:['Comprobante','Cliente','Fecha','Total','Estado'],numeric:[3],statusColumn:4,rows:textRows(sales)};
const inventoryConfig:CrudConfig={storageKey:'erp-inventory',title:'Inventario',description:'Existencias por almacén. Los productos bajo el mínimo se marcan en rojo.',action:'Registrar movimiento',headers:['Código','Producto','Almacén','Stock','Mínimo','Estado'],numeric:[3,4],statusColumn:5,rows:textRows(inventory).map(row=>[...row,Number(row[3])<Number(row[4])?'Reponer':'Suficiente'])};
const customerConfig:CrudConfig={storageKey:'erp-customers',title:'Clientes',description:'Datos, línea de crédito y estado de cuenta.',action:'Nuevo cliente',headers:['Cliente','RUC','Línea de crédito','Estado'],statusColumn:3,rows:textRows(customers)};
const configurations:Record<Exclude<ModuleId,'dash'|'ven'|'inv'|'cli'>,CrudConfig>={
  com:{storageKey:'erp-purchases',title:'Compras',description:'Solicitudes, órdenes de compra y recepción de mercadería.',action:'Nueva orden',headers:['Orden','Proveedor','Fecha','Total','Estado'],numeric:[3],statusColumn:4,rows:[['OC-1032','Andes Industrial','02 oct','18340','Pendiente'],['OC-1031','Suministros del Pacífico','01 oct','9250','Aprobado'],['OC-1030','Tecnología Comercial SAC','30 sep','14800','Recibido']]},
  fin:{storageKey:'erp-finance',title:'Finanzas',description:'Cuentas por cobrar, pagos, caja y bancos.',action:'Registrar movimiento',headers:['Documento','Concepto','Vencimiento','Monto','Estado'],numeric:[3],statusColumn:4,rows:[['CXC-884','Factura Textiles Andinos','14 oct','12480','Pendiente'],['CXP-392','Compra Andes Industrial','05 oct','18340','Pendiente'],['ING-121','Cobro Grupo Pacífico','02 oct','8920','Pagado'],['CXC-875','Factura Minera Sur','20 sep','27600','Vencido']]},
  doc:{storageKey:'erp-documents',title:'Documentos',description:'Contratos, comprobantes y archivos empresariales.',action:'Subir documento',headers:['Archivo','Módulo','Fecha','Tamaño','Estado'],statusColumn:4,rows:[['Contrato_Textiles_2026.pdf','Clientes','02 oct','2.4 MB','Disponible'],['OC-1032_Andes.pdf','Compras','02 oct','810 KB','Pendiente'],['Factura_V-2041.pdf','Ventas','02 oct','450 KB','Disponible']]},
  adm:{storageKey:'erp-admin',title:'Administración',description:'Usuarios, roles, permisos y auditoría del sistema.',action:'Nuevo usuario',headers:['Usuario','Rol','Último acceso','Estado'],statusColumn:3,rows:[['María Rojas','Administradora','Hoy, 08:42','Activo'],['Carlos Vega','Ventas','Hoy, 08:15','Activo'],['Lucía Ramos','Inventario','Ayer, 17:30','Activo'],['Pedro Soto','Compras','28 sep, 11:20','Inactivo']]},
};
export const SalesPage=()=> <CrudModule config={salesConfig}/>;
export const InventoryPage=()=> <CrudModule config={inventoryConfig}/>;
export const CustomersPage=()=> <CrudModule config={customerConfig}/>;
export const OperationalModule=({id}:{id:Exclude<ModuleId,'dash'|'ven'|'inv'|'cli'>})=><CrudModule config={configurations[id]}/>;
