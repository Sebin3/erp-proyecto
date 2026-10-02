import { useEffect, useRef, useState } from 'react';
import { navigation } from './modules/navigation';
import { DashboardPage } from './pages/DashboardPage';
import { ErpModulePage } from './pages/ErpModules';

const currentPath = () => location.pathname === '/' ? '/dashboard' : location.pathname;
export default function App() {
  const [path,setPath]=useState(currentPath); const [collapsed,setCollapsed]=useState(false); const [dark,setDark]=useState(false); const [openGroups,setOpenGroups]=useState<string[]>([]); const navigationRef=useRef<HTMLElement>(null);
  useEffect(()=>{const sync=()=>setPath(currentPath());addEventListener('popstate',sync);return()=>removeEventListener('popstate',sync)},[]);
  useEffect(()=>{const parent=navigation.find(item=>item.children?.some(child=>child.path===path));if(parent){setOpenGroups(groups=>groups.includes(parent.label)?groups:[...groups,parent.label]);requestAnimationFrame(()=>document.querySelector('.sub-link.active')?.scrollIntoView({block:'nearest',behavior:'smooth'}));}},[path]);
  useEffect(()=>{document.documentElement.dataset.theme=dark?'dark':'light';},[dark]);
  const go=(next:string)=>{history.pushState(null,'',next);setPath(next);scrollTo(0,0)};
  const navigate=(event:React.MouseEvent,next:string)=>{event.preventDefault();go(next)};
  const toggleGroup=(name:string)=>{if(collapsed){setCollapsed(false);setOpenGroups(groups=>groups.includes(name)?groups:[...groups,name]);return;}setOpenGroups(groups=>groups.includes(name)?groups.filter(group=>group!==name):[...groups,name])};
  const label=navigation.flatMap(item=>item.children??[item]).find(item=>item.path===path)?.label??'Dashboard';
  return <div className={`app erp-shell ${collapsed?'sidebar-collapsed':''}`}><aside className="sidebar">
    <header className="sidebar-header"><div className="brand"><span className="mark"><i/></span>{!collapsed&&<span>EnterpriseCloud</span>}<button className="collapse" onClick={()=>setCollapsed(value=>!value)} aria-label={collapsed?'Expandir barra':'Colapsar barra'}>{collapsed?'›':'‹'}</button></div></header>
    <nav className="sidebar-navigation scrollbar-hide" aria-label="ERP" ref={navigationRef}>{navigation.map(item=>item.children?<section className="nav-group" key={item.label}><button className={`nav-parent ${item.children.some(child=>child.path===path)?'active':''}`} onClick={()=>toggleGroup(item.label)} aria-expanded={openGroups.includes(item.label)} title={collapsed?item.label:undefined}><span className="nav-icon">{item.icon}</span>{!collapsed&&<><span>{item.label}</span><b className={openGroups.includes(item.label)?'chevron open':'chevron'}>⌄</b></>}</button><div className={`submenu ${openGroups.includes(item.label)&&!collapsed?'expanded':''}`}><div className="submenu-content">{item.children.map(child=><a key={child.path} href={child.path} onClick={event=>navigate(event,child.path)} className={path===child.path?'sub-link active':'sub-link'}>{child.label}</a>)}</div></div></section>:<a key={item.path} href={item.path} onClick={event=>navigate(event,item.path)} className={path===item.path?'nav-parent active':'nav-parent'} title={collapsed?item.label:undefined}><span className="nav-icon">{item.icon}</span>{!collapsed&&item.label}</a>)}</nav>
    <footer className="sidebar-footer"><span className="av">MR</span>{!collapsed&&<span className="profile-name">María Rojas<small>Administradora</small></span>}<button className="ic" onClick={()=>setDark(value=>!value)} aria-label="Cambiar tema">◐</button></footer>
  </aside><main><div className="breadcrumb">EnterpriseCloud <span>/</span> {path.split('/').filter(Boolean).map(x=>x.replaceAll('-',' ')).join(' / ')}</div>{path==='/dashboard'?<DashboardPage onNavigate={()=>go('/comercial/ventas')}/>:<ErpModulePage path={path} label={label}/>}</main></div>
}
