import { useEffect, useMemo, useRef, useState } from 'react';
import { customers, inventory, modules } from '../modules/erp/data';
import type { ModuleId } from '../types/erp';

type Result = { name: string; type: string; id: ModuleId };
export function SearchPalette({ open, onClose, onNavigate }: { open: boolean; onClose: () => void; onNavigate: (id: ModuleId) => void }) {
  const [query, setQuery] = useState(''); const [selected, setSelected] = useState(0); const input = useRef<HTMLInputElement>(null);
  const results = useMemo<Result[]>(() => [...modules.map(m => ({ name:m.label, type:'Módulo', id:m.id })), ...customers.map(c => ({name:c[0],type:'Cliente',id:'cli' as ModuleId})), ...inventory.map(i => ({name:i[1],type:'Producto',id:'inv' as ModuleId}))].filter(x => x.name.toLowerCase().includes(query.toLowerCase())).slice(0,8), [query]);
  useEffect(() => { if (open) { setQuery(''); setSelected(0); setTimeout(() => input.current?.focus(), 0); } }, [open]);
  useEffect(() => { setSelected(s => Math.min(s, Math.max(0, results.length - 1))); }, [results.length]);
  useEffect(() => { const key = (e: KeyboardEvent) => { if (!open) return; if (e.key === 'Escape') onClose(); if (e.key === 'ArrowDown') { e.preventDefault(); setSelected(s => Math.min(s+1, results.length-1)); } if (e.key === 'ArrowUp') { e.preventDefault(); setSelected(s => Math.max(s-1,0)); } if (e.key === 'Enter' && results[selected]) { onNavigate(results[selected].id); onClose(); } }; addEventListener('keydown', key); return () => removeEventListener('keydown', key); }, [open, onClose, onNavigate, results, selected]);
  if (!open) return null; return <div id="pal" className="on" role="dialog" aria-label="Buscador" onMouseDown={e => e.target === e.currentTarget && onClose()}><div className="pb"><input ref={input} value={query} onChange={e=>setQuery(e.target.value)} placeholder="Escribe un módulo, cliente o producto" autoComplete="off"/><ul>{results.length ? results.map((r,i) => <li key={`${r.type}-${r.name}`}><button onClick={() => {onNavigate(r.id);onClose();}} aria-selected={i===selected}>{r.name}<small>{r.type}</small></button></li>) : <li className="no-results">Sin resultados. Prueba con otro nombre.</li>}</ul></div></div>;
}
