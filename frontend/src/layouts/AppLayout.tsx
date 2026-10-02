import type { ReactNode } from 'react';
import { Icon } from '../components/Icons';
import { modules } from '../modules/erp/data';
import type { ModuleId } from '../types/erp';

type Props = { active: ModuleId; onNavigate: (id: ModuleId) => void; onOpenSearch: () => void; onToggleTheme: () => void; children: ReactNode };
export function AppLayout({ active, onNavigate, onOpenSearch, onToggleTheme, children }: Props) {
  return <div className="app"><nav aria-label="Principal"><div className="brand"><span className="mark"><i /></span>EnterpriseCloud</div><div>{modules.map((item, index) => <div key={item.id}>{(index === 0 || modules[index - 1].group !== item.group) && <div className="grp">{item.group}</div>}<button className="nv" onClick={() => onNavigate(item.id)} aria-current={active === item.id ? 'page' : undefined}><Icon id={item.id} />{item.label}</button></div>)}</div><div className="me"><span className="av">MR</span><div>María Rojas<small>Administradora</small></div></div></nav><main><div className="top"><button className="k" onClick={onOpenSearch} aria-label="Abrir buscador"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg>Buscar o ir a un módulo<kbd>Ctrl K</kbd></button><button className="ic" onClick={onToggleTheme} aria-label="Cambiar tema">◐</button></div>{children}</main></div>;
}
