import type { ModuleDefinition } from '../../types/erp';

export const modules: ModuleDefinition[] = [
  { id: 'dash', label: 'Dashboard', group: 'Resumen' }, { id: 'ven', label: 'Ventas', group: 'Comercial' },
  { id: 'com', label: 'Compras', group: 'Comercial' }, { id: 'cli', label: 'Clientes', group: 'Comercial' },
  { id: 'inv', label: 'Inventario', group: 'Operación' }, { id: 'fin', label: 'Finanzas', group: 'Operación' },
  { id: 'doc', label: 'Documentos', group: 'Operación' }, { id: 'adm', label: 'Administración', group: 'Sistema' },
];
export const sales = [['V-2041','Textiles Andinos SAC','02 oct',12480,'Pagado'],['V-2040','Grupo Pacífico','02 oct',8920,'Pendiente'],['V-2039','Ferretería Norte','01 oct',3150,'Pagado'],['V-2038','Minera Sur Perú','30 sep',27600,'Vencido'],['V-2037','Distribuidora Lima','30 sep',6410,'Pagado'],['V-2036','Agro Verde SRL','29 sep',9875,'Pendiente']] as const;
export const inventory = [['SKU-1001','Rodamiento 6204','Almacén Lima',14,50],['SKU-1087','Cable NYY 3x10','Almacén Lima',220,120],['SKU-2310','Válvula bola 1"','Almacén Callao',9,40],['SKU-0456','Guantes dieléctricos','Almacén Callao',160,60],['SKU-3302','Sensor de nivel','Almacén Lima',31,30]] as const;
export const customers = [['Textiles Andinos SAC','20512345678','S/ 45,000','Al día'],['Grupo Pacífico','20498765432','S/ 80,000','Pendiente'],['Minera Sur Perú','20455512309','S/ 200,000','Vencido'],['Agro Verde SRL','20601234567','S/ 25,000','Al día']] as const;
