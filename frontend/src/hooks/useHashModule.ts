import { useEffect, useState } from 'react';
import type { ModuleId } from '../types/erp';

const valid = new Set<ModuleId>(['dash','ven','com','cli','inv','fin','doc','adm']);
const current = (): ModuleId => valid.has(location.hash.slice(1) as ModuleId) ? location.hash.slice(1) as ModuleId : 'dash';
export function useHashModule() {
  const [module, setModule] = useState<ModuleId>(current);
  useEffect(() => { const sync = () => setModule(current()); addEventListener('hashchange', sync); return () => removeEventListener('hashchange', sync); }, []);
  const navigate = (next: ModuleId) => { location.hash = next; };
  return { module, navigate };
}
