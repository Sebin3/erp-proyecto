export const currency = (value: number) => `S/ ${value.toLocaleString('es-PE')}`;
export const statusClass = (status: string) => ({ Pagado: 'ok', 'Al día': 'ok', Pendiente: 'warn', Vencido: 'bad' }[status] ?? '');
