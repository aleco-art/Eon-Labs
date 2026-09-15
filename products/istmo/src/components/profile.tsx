"use client";
import { useCallback, useEffect, useState } from "react";
import { AtSign, Briefcase, Globe, Link as LinkIcon, Mail, MapPin, Phone } from "lucide-react";
import { browserDb, configured } from "@/lib/supabase/client";
import { profileSelect, proposalSelect, type Profile, type Proposal } from "@/lib/domain";
import { validateFile } from "@/lib/files";
import { useSession } from "./shell";
import { Notice } from "./common";
import { Avatar, Feed, ProposalCard, useCovers, useInteractions, useToggle } from "./feed";

type Reshare = { created_at: string; proposals: Proposal | null };

const optional = (v: FormDataEntryValue | null) => String(v ?? "").trim() || null;
const withProtocol = (v: string | null) => (v && !/^https?:\/\//i.test(v) ? "https://" + v : v);

/** Maps database check violations on the contact fields to a readable message. */
const profileError = (message: string) =>
  /contact_email/.test(message) ? "El correo de contacto no es válido."
  : /phone/.test(message) ? "El teléfono solo puede tener números, espacios, guiones, paréntesis y un + inicial (7 a 20 caracteres)."
  : /website/.test(message) ? "La web debe ser un enlace válido."
  : /instagram/.test(message) ? "El usuario de Instagram solo puede tener letras, números, puntos y guiones bajos."
  : /linkedin/.test(message) ? "El enlace de LinkedIn debe empezar por https://www.linkedin.com/."
  : "No se pudo actualizar el perfil.";

function ContactList({ profile }: { profile: Profile }) {
  const items = [
    profile.occupation && { icon: <Briefcase size={16} />, label: profile.occupation },
    profile.location && { icon: <MapPin size={16} />, label: profile.location },
    profile.contact_email && { icon: <Mail size={16} />, label: profile.contact_email, href: "mailto:" + profile.contact_email },
    profile.phone && { icon: <Phone size={16} />, label: profile.phone, href: "tel:" + profile.phone.replace(/[^+0-9]/g, "") },
    profile.website && { icon: <Globe size={16} />, label: profile.website.replace(/^https?:\/\/(www\.)?/i, "").replace(/\/$/, ""), href: profile.website },
    profile.instagram && { icon: <AtSign size={16} />, label: "@" + profile.instagram, href: "https://www.instagram.com/" + profile.instagram },
    profile.linkedin && { icon: <LinkIcon size={16} />, label: "LinkedIn", href: profile.linkedin },
  ].filter(Boolean) as { icon: React.ReactNode; label: string; href?: string }[];
  if (!items.length) return null;
  return (
    <ul className="contact-list">
      {items.map((item) => (
        <li key={item.label}>
          {item.icon}
          {item.href ? <a href={item.href} target={item.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer nofollow">{item.label}</a> : <span>{item.label}</span>}
        </li>
      ))}
    </ul>
  );
}

export function ProfilePage({ id }: { id: string }) {
  const { user } = useSession();
  const [profile, setProfile] = useState<Profile | null | undefined>(undefined);
  const [reshares, setReshares] = useState<Reshare[]>([]);
  const [editing, setEditing] = useState(false);
  const [message, setMessage] = useState<{ text: string; tone: "ok" | "error" } | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!configured) return;
    const db = browserDb();
    const [p, r] = await Promise.all([
      db.from("profiles").select(profileSelect).eq("id", id).maybeSingle(),
      db.from("reshares").select(`created_at,proposals(${proposalSelect})`).eq("user_id", id).order("created_at", { ascending: false }),
    ]);
    setProfile(p.data as Profile | null);
    setReshares(((r.data as unknown as Reshare[]) ?? []).filter((x) => x.proposals));
  }, [id]);

  useEffect(() => {
    // Profile data comes from the database.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const [mine, setMine] = useInteractions(reshares.map((r) => r.proposals!.id));
  const covers = useCovers(reshares.map((r) => r.proposals!.id));
  const toggle = useToggle(setMine, load);

  if (profile === undefined) return <p className="page loading">Cargando perfil…</p>;
  if (!profile) return <div className="page narrow"><div className="empty"><h1>Perfil no disponible.</h1></div></div>;
  const own = user?.id === id;
  const incomplete = own && !profile.bio && !profile.occupation && !profile.avatar_path;

  return (
    <div className="page">
      <div className="card profile-card">
        <div className="profile-head">
          <Avatar name={profile.name} path={profile.avatar_path} />
          <div style={{ minWidth: 0 }}>
            <p className="eyebrow" style={{ marginBottom: 4 }}>Perfil público</p>
            <h1 style={{ margin: 0 }}>{profile.name}</h1>
          </div>
        </div>
        {profile.bio ? <p className="profile-bio">{profile.bio}</p> : !own && <p className="muted">Esta persona todavía no ha escrito su biografía.</p>}
        <ContactList profile={profile} />
        {own && <button className="button secondary small" onClick={() => setEditing(!editing)}>{editing ? "Cerrar edición" : "Editar mi perfil"}</button>}
      </div>
      {incomplete && !editing && (
        <Notice tone="info" message="Completa tu perfil: una foto, a qué te dedicas y una biografía corta ayudan a que la gente y los responsables confíen en tus propuestas." />
      )}
      {message && <Notice message={message.text} tone={message.tone} />}
      {own && editing && (
        <form
          className="card form-card narrow"
          style={{ marginLeft: 0 }}
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const f = new FormData(e.currentTarget);
              const db = browserDb();
              let path = profile.avatar_path;
              const file = f.get("avatar");
              if (file instanceof File && file.size) {
                await validateFile(file, true);
                path = `${id}/${crypto.randomUUID()}`;
                const { error } = await db.storage.from("avatars").upload(path, file, { contentType: file.type });
                if (error) throw new Error("No se pudo guardar el avatar.");
              }
              const instagram = optional(f.get("instagram"))?.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//i, "").replace(/\/.*$/, "") || null;
              const { error } = await db.from("profiles").update({
                name: String(f.get("name") ?? "").trim(),
                bio: String(f.get("bio") ?? "").trim(),
                location: String(f.get("location") ?? "").trim(),
                avatar_path: path,
                occupation: optional(f.get("occupation")),
                contact_email: optional(f.get("contact_email")),
                phone: optional(f.get("phone")),
                website: withProtocol(optional(f.get("website"))),
                instagram,
                linkedin: withProtocol(optional(f.get("linkedin"))),
              }).eq("id", id);
              if (error) throw new Error(profileError(error.message));
              if (path !== profile.avatar_path && profile.avatar_path) await db.storage.from("avatars").remove([profile.avatar_path]);
              setEditing(false);
              setMessage({ text: "Perfil actualizado.", tone: "ok" });
              await load();
            } catch (err) {
              setMessage({ text: err instanceof Error ? err.message : "No se pudo guardar.", tone: "error" });
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 style={{ marginTop: 0 }}>Editar mi perfil</h2>
          <label className="field">Nombre público<input name="name" required minLength={2} maxLength={80} defaultValue={profile.name} /></label>
          <label className="field">A qué te dedicas (opcional)<input name="occupation" maxLength={80} defaultValue={profile.occupation ?? ""} placeholder="Ej.: Arquitecta, estudiante, comerciante" /></label>
          <label className="field">Biografía<textarea name="bio" maxLength={500} defaultValue={profile.bio} style={{ minHeight: 110 }} placeholder="Cuéntale a la comunidad quién eres y qué te importa de tu barrio o de Panamá." /><span className="hint">Hasta 500 caracteres.</span></label>
          <label className="field">Ubicación pública (opcional)<input name="location" maxLength={120} defaultValue={profile.location} placeholder="Ej.: David, Chiriquí" /></label>
          <label className="field">Foto de perfil<input type="file" name="avatar" accept="image/png,image/jpeg,image/webp" /><span className="hint">PNG, JPEG o WebP de hasta 2 MB. Será pública.</span></label>
          <fieldset className="subpanel">
            <legend style={{ fontWeight: 700, padding: "0 6px" }}>Datos de contacto (opcionales y públicos)</legend>
            <p className="hint" style={{ marginTop: 0 }}>Solo se muestra lo que completes. Cualquier persona podrá verlo en tu perfil. El correo con el que inicias sesión nunca se muestra.</p>
            <div className="form-grid">
              <label className="field">Correo de contacto<input name="contact_email" type="email" maxLength={254} defaultValue={profile.contact_email ?? ""} placeholder="nombre@correo.com" /></label>
              <label className="field">Teléfono o WhatsApp<input name="phone" type="tel" maxLength={20} defaultValue={profile.phone ?? ""} placeholder="+507 6000-0000" /></label>
              <label className="field">Página web<input name="website" maxLength={200} defaultValue={profile.website ?? ""} placeholder="https://" /></label>
              <label className="field">Instagram<input name="instagram" maxLength={80} defaultValue={profile.instagram ?? ""} placeholder="@usuario" /></label>
              <label className="field">LinkedIn<input name="linkedin" maxLength={200} defaultValue={profile.linkedin ?? ""} placeholder="https://www.linkedin.com/in/..." /></label>
            </div>
          </fieldset>
          <button className="button primary" disabled={busy}>{busy ? "Guardando…" : "Guardar perfil"}</button>
        </form>
      )}
      <div style={{ marginTop: 30 }}>
        <Feed authorId={id} title={own ? "Mis propuestas" : "Propuestas publicadas"} />
      </div>
      <h2 className="section-title">Republicaciones</h2>
      <p className="muted" style={{ fontSize: "0.92rem" }}>Propuestas de otras personas que {own ? "has" : "ha"} republicado. Se muestran con su autoría original.</p>
      {reshares.length ? (
        <div className="feed-grid">
          {reshares.map((r) => <ProposalCard key={r.proposals!.id} proposal={r.proposals!} mine={mine} onToggle={toggle} cover={covers.get(r.proposals!.id)} />)}
        </div>
      ) : (
        <p className="muted">Todavía no hay republicaciones.</p>
      )}
    </div>
  );
}
