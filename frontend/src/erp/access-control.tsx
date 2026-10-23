import { useEffect, useMemo, useState } from "react";
import {
  Check,
  ChevronDown,
  Edit3,
  ImagePlus,
  Mail,
  Save,
  ShieldCheck,
  UserRound,
  UserCheck,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import { Modal } from "./modal";
import { useErp } from "./store";
import {
  permissionCatalog,
  type Audit,
  type ErpRole,
  type ErpUser,
} from "./model";
import { toast } from "./toast";
import "./access-control.css";

type UserDraft = Omit<ErpUser, "id" | "lastAccess"> & { id?: string };
type RoleDraft = Omit<ErpRole, "id"> & { id?: string };
export type AccessSection = "usuarios" | "roles" | "matriz" | "auditoria";

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("") || "EC";

const emptyUser = (roleId: string): UserDraft => ({
  name: "",
  email: "",
  roleId,
  active: true,
  avatar: "fox",
});

const emptyRole = (): RoleDraft => ({
  name: "",
  description: "",
  permissions: [],
  active: true,
});

type PermissionAction = "ver" | "crear" | "editar" | "aprobar" | "anular" | "exportar";
type PermissionMatrixRow = {
  resource: string;
  permissions: Partial<Record<PermissionAction, string>>;
};

const permissionActions: Array<{ id: PermissionAction; label: string }> = [
  { id: "ver", label: "Ver" },
  { id: "crear", label: "Crear" },
  { id: "editar", label: "Editar" },
  { id: "aprobar", label: "Aprobar" },
  { id: "anular", label: "Anular" },
  { id: "exportar", label: "Exportar" },
];

// La matriz traduce los permisos amplios que ya usa el ERP a la lectura
// operativa de la referencia: recurso en filas y acciones en columnas.
const permissionMatrixRows: PermissionMatrixRow[] = [
  { resource: "Inicio", permissions: { ver: "dashboard.view", exportar: "dashboard.view" } },
  { resource: "Clientes", permissions: { ver: "masters.view", crear: "masters.manage", editar: "masters.manage", exportar: "masters.view" } },
  { resource: "Cotizaciones", permissions: { ver: "sales.view", crear: "sales.manage", editar: "sales.manage", anular: "sales.manage", exportar: "sales.view" } },
  { resource: "Pedidos de venta", permissions: { ver: "sales.view", crear: "sales.manage", editar: "sales.manage", aprobar: "sales.manage", anular: "sales.manage", exportar: "sales.view" } },
  { resource: "Comprobantes", permissions: { ver: "billing.manage", crear: "billing.manage", editar: "billing.manage", anular: "billing.manage", exportar: "billing.manage" } },
  { resource: "Cuentas por cobrar", permissions: { ver: "collections.manage", crear: "collections.manage", editar: "collections.manage", anular: "collections.manage", exportar: "collections.manage" } },
  { resource: "Proveedores", permissions: { ver: "masters.view", crear: "masters.manage", editar: "masters.manage", anular: "masters.manage", exportar: "masters.view" } },
  { resource: "Solicitudes de compra", permissions: { ver: "purchases.view", crear: "purchases.manage", editar: "purchases.manage", aprobar: "purchases.manage", anular: "purchases.manage", exportar: "purchases.view" } },
  { resource: "Órdenes de compra", permissions: { ver: "purchases.view", crear: "purchases.manage", editar: "purchases.manage", aprobar: "purchases.manage", anular: "purchases.manage", exportar: "purchases.view" } },
  { resource: "Existencias", permissions: { ver: "inventory.view", editar: "inventory.manage", exportar: "inventory.view" } },
  { resource: "Ingresos al Kardex", permissions: { ver: "receiving.manage", crear: "receiving.manage", editar: "receiving.manage", anular: "receiving.manage", exportar: "receiving.manage" } },
  { resource: "Movimientos de Kardex", permissions: { ver: "inventory.view", crear: "inventory.manage", editar: "inventory.manage", anular: "inventory.manage", exportar: "inventory.view" } },
  { resource: "Analítica y reportes", permissions: { ver: "reports.view", exportar: "reports.view" } },
  { resource: "Maestros", permissions: { ver: "masters.view", crear: "masters.manage", editar: "masters.manage", anular: "masters.manage", exportar: "masters.view" } },
  { resource: "Usuarios y roles", permissions: { ver: "access.manage", crear: "access.manage", editar: "access.manage", anular: "access.manage", exportar: "access.manage" } },
  { resource: "Auditoría", permissions: { ver: "audit.view", exportar: "audit.view" } },
];

export function userInitials(name: string) {
  return initials(name);
}

const avatarOptions = [
  { id: "fox", label: "Zorro" },
  { id: "cat", label: "Gato" },
  { id: "panda", label: "Panda" },
  { id: "penguin", label: "Pingüino" },
  { id: "rabbit", label: "Conejo" },
  { id: "owl", label: "Búho" },
] as const;

export function avatarToneClass(avatar?: string) {
  const legacyMap: Record<string, string> = {
    charcoal: "fox",
    slate: "cat",
    blue: "panda",
    teal: "penguin",
    violet: "rabbit",
    amber: "owl",
  };
  const tone = avatarOptions.some((item) => item.id === avatar)
    ? avatar
    : legacyMap[avatar ?? ""] ?? "fox";
  return `avatar-image-${tone}`;
}

export function AccessControl({
  initialSection = "usuarios",
}: {
  initialSection?: AccessSection;
}) {
  const { state, transact } = useErp();
  const users = state.users ?? [];
  const roles = state.roles ?? [];
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("Todos");
  const [statusOpen, setStatusOpen] = useState(false);
  const [section, setSection] = useState<AccessSection>(initialSection);
  const [userEditor, setUserEditor] = useState<UserDraft | null>(null);
  const [roleEditor, setRoleEditor] = useState<RoleDraft | null>(null);
  const [error, setError] = useState("");
  const filteredUsers = useMemo(
    () =>
      users.filter((user) => {
        const role = roles.find((item) => item.id === user.roleId);
        const haystack = `${user.name} ${user.email} ${role?.name ?? ""}`.toLowerCase();
        return (
          haystack.includes(query.toLowerCase()) &&
          (status === "Todos" ||
            user.active === (status === "Activos"))
        );
      }),
    [query, roles, status, users],
  );
  const activeUsers = users.filter((user) => user.active).length;
  const activeRoles = roles.filter((role) => role.active).length;

  useEffect(() => {
    setSection(initialSection);
  }, [initialSection]);

  const sectionMeta: Record<AccessSection, { title: string; subtitle: string }> = {
    usuarios: { title: "Usuarios", subtitle: "Personas con acceso y cuentas activas del ERP." },
    roles: { title: "Roles", subtitle: "Perfiles de acceso configurables para cada área del ERP." },
    matriz: { title: "Permisos", subtitle: "Matriz efectiva de acceso por recurso y acción." },
    auditoria: { title: "Auditoría", subtitle: "Historial de cambios y acciones relevantes del sistema." },
  };

  const saveUser = () => {
    if (!userEditor) return;
    const name = userEditor.name.trim();
    const email = userEditor.email.trim().toLowerCase();
    try {
      if (!name) throw Error("El nombre del usuario es obligatorio.");
      if (!/^\S+@\S+\.\S+$/.test(email))
        throw Error("Ingresa un correo electrónico válido.");
      if (!roles.some((role) => role.id === userEditor.roleId && role.active))
        throw Error("Selecciona un rol activo.");
      transact((draft) => {
        draft.users ??= [];
        const id = userEditor.id ?? `USR-${Date.now().toString(36).toUpperCase()}`;
        const existing = draft.users.find((user) => user.id === id);
        const record: ErpUser = {
          id,
          name,
          email,
          roleId: userEditor.roleId,
          active: userEditor.active,
          lastAccess: existing?.lastAccess ?? new Date().toISOString(),
          avatar: userEditor.avatar ?? existing?.avatar ?? "fox",
        };
        const index = draft.users.findIndex((user) => user.id === id);
        if (index >= 0) draft.users[index] = record;
        else draft.users.unshift(record);
        draft.audit.unshift({
          id: `USR-${Date.now()}`,
          date: new Date().toISOString(),
          action: index >= 0 ? "Editar usuario" : "Crear usuario",
          record: `${record.name} · ${record.email}`,
        });
      });
      setUserEditor(null);
      setError("");
      toast.success("Usuario guardado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el usuario.");
    }
  };

  const saveRole = () => {
    if (!roleEditor) return;
    const name = roleEditor.name.trim();
    try {
      if (!name) throw Error("El nombre del rol es obligatorio.");
      transact((draft) => {
        draft.roles ??= [];
        const id = roleEditor.id ?? `ROL-${Date.now().toString(36).toUpperCase()}`;
        const record: ErpRole = {
          id,
          name,
          description: roleEditor.description.trim(),
          permissions: [...roleEditor.permissions],
          active: roleEditor.active,
          system: roleEditor.system,
        };
        const index = draft.roles.findIndex((role) => role.id === id);
        if (index >= 0) draft.roles[index] = record;
        else draft.roles.push(record);
        draft.audit.unshift({
          id: `ROL-${Date.now()}`,
          date: new Date().toISOString(),
          action: index >= 0 ? "Editar rol" : "Crear rol",
          record: record.name,
        });
      });
      setRoleEditor(null);
      setError("");
      toast.success("Rol guardado correctamente.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar el rol.");
    }
  };

  const toggleUser = (user: ErpUser) => {
    if (user.id === state.currentUserId && user.active) {
      toast.warning("No puedes desactivar el usuario que está activo.");
      return;
    }
    transact((draft) => {
      const record = draft.users?.find((item) => item.id === user.id);
      if (record) record.active = !record.active;
      draft.audit.unshift({
        id: `USR-${Date.now()}`,
        date: new Date().toISOString(),
        action: record?.active ? "Activar usuario" : "Desactivar usuario",
        record: user.name,
      });
    });
  };

  return (
    <div className="access-control">
      <div className="hd page-head">
        <div>
          <p className="section-eyebrow">GESTIÓN · ADMINISTRACIÓN</p>
          <h1>{sectionMeta[section].title}</h1>
          <p className="sub no-margin">{sectionMeta[section].subtitle}</p>
        </div>
        <div className="header-actions">
          {section === "roles" && <button className="btn" onClick={() => setRoleEditor(emptyRole())}><ShieldCheck size={15} />Nuevo rol</button>}
          {section === "usuarios" && <button className="btn" onClick={() => setUserEditor(emptyUser(roles.find((role) => role.active)?.id ?? ""))}><UserPlus size={15} />Nuevo usuario</button>}
        </div>
      </div>

      {section === "usuarios" && <div className="access-metrics">
        <section className="card access-metric">
          <span className="access-metric-icon"><Users size={17} /></span>
          <div><small>Usuarios registrados</small><strong>{users.length}</strong><p>{activeUsers} activos actualmente</p></div>
        </section>
        <section className="card access-metric">
          <span className="access-metric-icon"><ShieldCheck size={17} /></span>
          <div><small>Roles configurados</small><strong>{roles.length}</strong><p>{activeRoles} disponibles para asignar</p></div>
        </section>
      </div>}

      {(section === "usuarios" || section === "roles") && <div id="administration-panel" role="tabpanel" className="access-layout is-single">
        {section === "usuarios" && <section className="card access-users-panel">
          <div className="access-panel-head">
            <div><h2>Personas con acceso</h2><p>Administra quién puede ingresar al espacio de trabajo.</p></div>
            <span className="access-count">{filteredUsers.length} usuarios</span>
          </div>
          <div className="access-filters">
            <div className="record-search">
              <Users size={16} />
              <input aria-label="Buscar usuarios" placeholder="Buscar por nombre, correo o rol…" value={query} onChange={(event) => setQuery(event.target.value)} />
            </div>
            <div className="access-status-filter">
              <button
                type="button"
                className="access-filter-select"
                aria-label="Filtrar usuarios"
                aria-haspopup="listbox"
                aria-expanded={statusOpen}
                onClick={() => setStatusOpen((open) => !open)}
              >
                <span>{status}</span>
                <ChevronDown size={15} />
              </button>
              {statusOpen && (
                <div className="access-filter-menu" role="listbox" aria-label="Estado del usuario">
                  {["Todos", "Activos", "Inactivos"].map((option) => (
                    <button
                      key={option}
                      type="button"
                      role="option"
                      aria-selected={status === option}
                      className={status === option ? "is-selected" : ""}
                      onClick={() => {
                        setStatus(option);
                        setStatusOpen(false);
                      }}
                    >
                      {option}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="access-user-list">
            <div className="access-user-table-head" aria-hidden="true">
              <span />
              <span>Usuario</span>
              <span>Rol</span>
              <span>Estado</span>
              <span>Acciones</span>
            </div>
            {filteredUsers.map((user) => {
              const role = roles.find((item) => item.id === user.roleId);
              return (
                <article className="access-user-row" key={user.id}>
                  <span className={`access-avatar ${avatarToneClass(user.avatar)}`}>{initials(user.name)}</span>
                  <div className="access-user-identity"><strong>{user.name}</strong><span><Mail size={12} />{user.email}</span></div>
                  <div className="access-user-role"><b>{role?.name ?? "Sin rol"}</b></div>
                  <span className={`access-status ${user.active ? "is-active" : ""}`}>{user.active ? "Activo" : "Inactivo"}</span>
                  <div className="access-row-actions">
                    <button className="access-icon-action" aria-label={`Editar ${user.name}`} title="Editar usuario" onClick={() => setUserEditor({ ...user })}><Edit3 size={15} /></button>
                    <button className="access-icon-action" aria-label={`${user.active ? "Desactivar" : "Activar"} ${user.name}`} title={user.active ? "Desactivar usuario" : "Activar usuario"} onClick={() => toggleUser(user)}>{user.active ? <Check size={15} /> : <UserCheck size={15} />}</button>
                  </div>
                </article>
              );
            })}
            {!filteredUsers.length && <div className="access-empty">No hay usuarios que coincidan con los filtros.</div>}
          </div>
        </section>}

        {section === "roles" && <section className="access-roles-panel">
          <div className="access-role-list">
            {roles.map((role) => {
              const assignedUsers = users.filter((user) => user.roleId === role.id).length;
              return <article key={role.id} className="access-role-card">
                <div className="access-role-card-head">
                  <div className="access-role-identity">
                    <span className="access-role-icon"><ShieldCheck size={16} /></span>
                    <div><h3>{role.name}</h3><p>{role.description}</p></div>
                  </div>
                  <span className="access-role-users">{assignedUsers} {assignedUsers === 1 ? "usuario" : "usuarios"}</span>
                </div>
                <div className="access-role-meta">
                  <div><small>Permisos asignados</small><strong>{role.permissions.length}</strong></div>
                  <div><small>Estado</small><strong className={role.active ? "is-active" : "is-inactive"}>{role.active ? "Activo" : "Inactivo"}</strong></div>
                </div>
                <button type="button" className="access-edit-permissions" onClick={() => setRoleEditor({ ...role, permissions: [...role.permissions] })}><Edit3 size={14} /> Editar permisos</button>
              </article>;
            })}
          </div>
        </section>}
      </div>}

      {section === "matriz" && <PermissionMatrix roles={roles} />}
      {section === "auditoria" && <AccessAudit entries={state.audit ?? []} />}

      {error && <p className="error" role="alert">{error}</p>}
      {userEditor && <UserEditor draft={userEditor} roles={roles} onChange={setUserEditor} onClose={() => { setUserEditor(null); setError(""); }} onSave={saveUser} error={error} />}
      {roleEditor && <RoleEditor draft={roleEditor} onChange={setRoleEditor} onClose={() => { setRoleEditor(null); setError(""); }} onSave={saveRole} error={error} />}
    </div>
  );
}

function PermissionMatrix({ roles }: { roles: ErpRole[] }) {
  const [selectedRoleId, setSelectedRoleId] = useState(roles[0]?.id ?? "");
  const selectedRole = roles.find((role) => role.id === selectedRoleId) ?? roles[0];

  useEffect(() => {
    if (!roles.some((role) => role.id === selectedRoleId)) {
      setSelectedRoleId(roles[0]?.id ?? "");
    }
  }, [roles, selectedRoleId]);

  return (
    <section className="access-matrix" id="permission-matrix">
      <div className="access-matrix-role-picker" aria-label="Seleccionar rol">
        {roles.map((role) => (
          <button key={role.id} type="button" className={`access-matrix-role-button ${selectedRole?.id === role.id ? "is-selected" : ""}`} aria-pressed={selectedRole?.id === role.id} onClick={() => setSelectedRoleId(role.id)}>
            {role.name}
          </button>
        ))}
      </div>
      <div className="access-matrix-scroll">
        <table className="access-matrix-table">
          <thead>
            <tr>
              <th scope="col">Recurso</th>
              {permissionActions.map((action) => <th scope="col" key={action.id}>{action.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {permissionMatrixRows.map((row) => (
              <tr key={row.resource}>
                <th scope="row">
                  <strong>{row.resource}</strong>
                </th>
                {permissionActions.map((action) => {
                  const permission = row.permissions[action.id];
                  const granted = Boolean(permission && selectedRole?.permissions.includes(permission));
                  return <td key={action.id} aria-label={`${row.resource}, ${action.label}: ${granted ? "habilitado" : "no habilitado"}`}>
                    <span className={`access-matrix-check ${granted ? "is-granted" : ""}`}>{granted ? <Check size={14} /> : "—"}</span>
                  </td>;
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function AccessAudit({ entries }: { entries: Audit[] }) {
  return (
    <section className="card access-audit" id="audit-panel">
      <div className="access-panel-head">
        <div>
          <span className="section-eyebrow">CONTROL Y TRAZABILIDAD</span>
          <h2>Registro de actividad</h2>
          <p>Consulta los cambios realizados en usuarios, roles y configuración.</p>
        </div>
        <span className="access-count">{entries.length} eventos</span>
      </div>
      <div className="access-audit-table-wrap">
        <table className="access-audit-table">
          <thead>
            <tr>
              <th scope="col">Fecha</th>
              <th scope="col">Acción</th>
              <th scope="col">Registro</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>{new Date(entry.date).toLocaleString("es-PE", { dateStyle: "medium", timeStyle: "short" })}</td>
                <td><strong>{entry.action}</strong></td>
                <td>{entry.record}</td>
              </tr>
            ))}
            {!entries.length && <tr><td colSpan={3} className="access-empty">No hay eventos registrados.</td></tr>}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function ProfileDrawer({ onClose }: { onClose: () => void }) {
  const { state, transact } = useErp();
  const currentUser =
    state.users?.find((user) => user.id === state.currentUserId) ??
    state.users?.[0] ?? {
      id: "USR-001",
      name: "Administrador",
      email: "admin@enterprisecloud.pe",
      roleId: "ROL-ADMIN",
      active: true,
      lastAccess: new Date().toISOString(),
      avatar: "fox",
    };
  const currentRole = state.roles?.find((role) => role.id === currentUser.roleId);
  const [name, setName] = useState(currentUser.name);
  const [avatar, setAvatar] = useState(currentUser.avatar ?? "fox");
  const [error, setError] = useState("");
  const [closing, setClosing] = useState(false);
  const [avatarsOpen, setAvatarsOpen] = useState(false);

  const requestClose = () => setClosing(true);

  useEffect(() => {
    setName(currentUser.name);
    setAvatar(currentUser.avatar ?? "fox");
  }, [currentUser.id, currentUser.name, currentUser.avatar]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  const saveProfile = () => {
    const nextName = name.trim();
    if (!nextName) {
      setError("El nombre es obligatorio.");
      return;
    }
    transact((draft) => {
      const record = draft.users?.find((user) => user.id === currentUser.id);
      if (!record) return;
      record.name = nextName;
      record.avatar = avatar;
      draft.audit.unshift({
        id: `USR-${Date.now()}`,
        date: new Date().toISOString(),
        action: "Actualizar mi perfil",
        record: record.name,
      });
    });
    setError("");
    toast.success("Perfil actualizado correctamente.");
  };

  return (
    <>
      <button className={`profile-drawer-backdrop ${closing ? "is-closing" : ""}`} aria-label="Cerrar perfil" onClick={requestClose} />
      <aside className={`profile-drawer ${closing ? "is-closing" : ""}`} role="dialog" aria-modal="true" aria-label="Mi perfil" onAnimationEnd={(event) => { if (closing && event.animationName === "profile-slide-out") onClose(); }}>
        <header className="profile-drawer-head">
          <div>
            <span className="section-eyebrow">CUENTA</span>
            <h2>Mi perfil</h2>
          </div>
          <button className="profile-drawer-close" aria-label="Cerrar perfil" onClick={requestClose}><X size={18} /></button>
        </header>

        <section className="profile-drawer-hero">
          <span className={`profile-drawer-avatar ${avatarToneClass(avatar)}`}>{userInitials(name || currentUser.name)}</span>
          <div>
            <strong>{name || currentUser.name}</strong>
            <small><i className="profile-status-dot" />{currentUser.active ? "Cuenta activa" : "Cuenta inactiva"}</small>
          </div>
        </section>

        <div className="profile-drawer-body">
          {error && <p className="error" role="alert">{error}</p>}
          <section className="profile-drawer-section">
            <div className="profile-drawer-section-title"><div><span className="section-eyebrow">DATOS PERSONALES</span><h3>Información de cuenta</h3></div><UserRound size={16} /></div>
            <label>Nombre completo<input value={name} onChange={(event) => setName(event.target.value)} /></label>
          </section>

          <section className="profile-drawer-section profile-avatar-section">
            <button className="profile-section-toggle" type="button" aria-expanded={avatarsOpen} onClick={() => setAvatarsOpen((open) => !open)}>
              <span><span className="section-eyebrow">APARIENCIA</span><strong>Avatar de usuario</strong></span>
              <span className="profile-section-toggle-icon"><ImagePlus size={16} /><ChevronDown size={15} /></span>
            </button>
            <div className={`profile-avatar-panel ${avatarsOpen ? "is-open" : "is-closed"}`} aria-hidden={!avatarsOpen}>
              <div className="profile-avatar-options">
                {avatarOptions.map((option) => (
                  <button key={option.id} type="button" tabIndex={avatarsOpen ? 0 : -1} className={avatar === option.id ? "is-selected" : ""} onClick={() => setAvatar(option.id)} aria-label={`Usar avatar ${option.label}`}>
                    <span className={`profile-avatar-option ${avatarToneClass(option.id)}`}>{userInitials(name || currentUser.name)}</span>
                    <small>{option.label}</small>
                  </button>
                ))}
              </div>
            </div>
          </section>

          <section className="profile-drawer-section profile-access-section">
            <div className="profile-drawer-section-title"><div><span className="section-eyebrow">ACCESO ASIGNADO</span><h3>Perfil de acceso</h3></div><ShieldCheck size={17} /></div>
            <label>Rol asignado<div className="profile-readonly-field"><ShieldCheck size={14} />{currentRole?.name ?? "Perfil local"}</div></label>
          </section>

        </div>

        <footer className="profile-drawer-actions"><button className="secondary-btn" onClick={requestClose}>Cerrar</button><button className="btn" onClick={saveProfile}><Save size={15} />Guardar cambios</button></footer>
      </aside>
    </>
  );
}

function UserEditor({ draft, roles, onChange, onClose, onSave, error }: { draft: UserDraft; roles: ErpRole[]; onChange: (draft: UserDraft) => void; onClose: () => void; onSave: () => void; error: string }) {
  return <Modal title={draft.id ? "Editar usuario" : "Nuevo usuario"} subtitle="Asigna una persona a un rol del ERP." onClose={onClose}>
    <form onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="form-grid"><label>Nombre completo<input required value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} /></label><label>Correo electrónico<input required type="email" value={draft.email} onChange={(event) => onChange({ ...draft, email: event.target.value })} /></label><label>Rol<select value={draft.roleId} onChange={(event) => onChange({ ...draft, roleId: event.target.value })}>{roles.filter((role) => role.active).map((role) => <option key={role.id} value={role.id}>{role.name}</option>)}</select></label><label>Estado<select value={draft.active ? "Activo" : "Inactivo"} onChange={(event) => onChange({ ...draft, active: event.target.value === "Activo" })}><option>Activo</option><option>Inactivo</option></select></label></div>
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button><button className="btn">Guardar usuario</button></div>
    </form>
  </Modal>;
}

function RoleEditor({ draft, onChange, onClose, onSave, error }: { draft: RoleDraft; onChange: (draft: RoleDraft) => void; onClose: () => void; onSave: () => void; error: string }) {
  const groups = [...new Set(permissionCatalog.map((permission) => permission.group))];
  const toggle = (permission: string) => onChange({ ...draft, permissions: draft.permissions.includes(permission) ? draft.permissions.filter((item) => item !== permission) : [...draft.permissions, permission] });
  return <Modal title={draft.id ? `Permisos · ${draft.name}` : "Nuevo rol"} subtitle="Define el alcance operativo de este rol." onClose={onClose} wide>
    <form onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="form-grid"><label>Nombre del rol<input required value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} /></label><label>Estado<select value={draft.active ? "Activo" : "Inactivo"} onChange={(event) => onChange({ ...draft, active: event.target.value === "Activo" })}><option>Activo</option><option>Inactivo</option></select></label><label className="span-two">Descripción<textarea value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} /></label></div>
      <div className="access-editor-permissions"><div className="access-permission-head"><div><span className="section-eyebrow">ALCANCE DEL ROL</span><h3>Permisos habilitados</h3></div><span>{draft.permissions.length} seleccionados</span></div>{groups.map((group) => <div className="access-editor-group" key={group}><strong>{group}</strong><div>{permissionCatalog.filter((permission) => permission.group === group).map((permission) => <label key={permission.id}><input type="checkbox" checked={draft.permissions.includes(permission.id)} onChange={() => toggle(permission.id)} /><span>{permission.label}</span></label>)}</div></div>)}</div>
      <div className="modal-actions"><button type="button" className="secondary-btn" onClick={onClose}>Cancelar</button><button className="btn">Guardar rol</button></div>
    </form>
  </Modal>;
}
