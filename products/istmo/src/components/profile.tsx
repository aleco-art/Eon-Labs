"use client";
import { useCallback, useEffect, useState } from "react";
import { MapPin } from "lucide-react";
import { browserDb, configured } from "@/lib/supabase/client";
import { proposalSelect, type Profile, type Proposal } from "@/lib/domain";
import { validateFile } from "@/lib/files";
import { useSession } from "./shell";
import { Notice } from "./common";
import { Avatar, Feed, ProposalCard, useInteractions, useToggle } from "./feed";

type Reshare = { created_at: string; proposals: Proposal | null };

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
      db.from("profiles").select("id,name,bio,location,avatar_path").eq("id", id).maybeSingle(),
      db.from("reshares").select(`created_at,proposals(${proposalSelect})`).eq("user_id", id).order("created_at", { ascending: false }),
    ]);
    setProfile(p.data);
    setReshares(((r.data as unknown as Reshare[]) ?? []).filter((x) => x.proposals));
  }, [id]);

  useEffect(() => {
    // Profile data comes from the database.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  const [mine, setMine] = useInteractions(reshares.map((r) => r.proposals!.id));
  const toggle = useToggle(setMine, load);

  if (profile === undefined) return <p className="page loading">Cargando perfil…</p>;
  if (!profile) return <div className="page narrow"><div className="empty"><h1>Perfil no disponible.</h1></div></div>;
  const own = user?.id === id;

  return (
    <div className="page">
      <div className="profile-head">
        <Avatar name={profile.name} path={profile.avatar_path} />
        <div>
          <p className="eyebrow" style={{ marginBottom: 4 }}>Perfil público</p>
          <h1 style={{ margin: 0 }}>{profile.name}</h1>
          {profile.location && <p className="muted" style={{ margin: "4px 0 0" }}><MapPin size={14} style={{ display: "inline" }} /> {profile.location}</p>}
        </div>
      </div>
      {profile.bio && <p style={{ maxWidth: 720, whiteSpace: "pre-wrap" }}>{profile.bio}</p>}
      {own && <button className="button secondary small" onClick={() => setEditing(!editing)}>{editing ? "Cerrar edición" : "Editar mi perfil"}</button>}
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
              const { error } = await db.from("profiles").update({ name: f.get("name"), bio: f.get("bio"), location: f.get("location"), avatar_path: path }).eq("id", id);
              if (error) throw new Error("No se pudo actualizar el perfil.");
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
          <label className="field">Nombre público<input name="name" required minLength={2} maxLength={80} defaultValue={profile.name} /></label>
          <label className="field">Biografía<textarea name="bio" maxLength={500} defaultValue={profile.bio} style={{ minHeight: 90 }} /></label>
          <label className="field">Ubicación pública (opcional)<input name="location" maxLength={120} defaultValue={profile.location} placeholder="Ej.: David, Chiriquí" /></label>
          <label className="field">Avatar<input type="file" name="avatar" accept="image/png,image/jpeg,image/webp" /><span className="hint">PNG, JPEG o WebP de hasta 2 MB. Será público.</span></label>
          <p className="hint">Tu correo nunca se muestra en el perfil.</p>
          <button className="button primary" disabled={busy}>Guardar perfil</button>
        </form>
      )}
      <div style={{ marginTop: 30 }}>
        <Feed authorId={id} title={own ? "Mis propuestas" : "Propuestas publicadas"} />
      </div>
      <h2 className="section-title">Republicaciones</h2>
      <p className="muted" style={{ fontSize: "0.92rem" }}>Propuestas de otras personas que {own ? "has" : "ha"} republicado. Se muestran con su autoría original.</p>
      {reshares.length ? (
        <div className="feed-grid">
          {reshares.map((r) => <ProposalCard key={r.proposals!.id} proposal={r.proposals!} mine={mine} onToggle={toggle} />)}
        </div>
      ) : (
        <p className="muted">Todavía no hay republicaciones.</p>
      )}
    </div>
  );
}
