"use client";
import { useEffect, useState } from "react";
import { browserDb, configured } from "@/lib/supabase/client";
import { type Profile, type Proposal } from "@/lib/domain";
import { useSession } from "./shell";
import { Notice } from "./common";
import { Feed, ProposalCard, proposalSelect } from "./feed";
import { validateFile } from "@/lib/files";
import Image from "next/image";
export function ProfilePage({ id }: { id: string }) {
  const { user } = useSession();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [message, setMessage] = useState("");
  const [editing, setEditing] = useState(false);
  const [reshares, setReshares] = useState<Proposal[]>([]);
  const [busy, setBusy] = useState(false);
  async function load() {
    if (!configured) return;
    const db = browserDb();
    const { data } = await db
      .from("profiles")
      .select("*")
      .eq("id", id)
      .single();
    setProfile(data);
    const { data: r } = await db
      .from("reshares")
      .select("proposal_id")
      .eq("user_id", id);
    if (r?.length) {
      const { data: p } = await db
        .from("proposals")
        .select(proposalSelect)
        .in(
          "id",
          r.map((x) => x.proposal_id),
        )
        .eq("hidden", false);
      setReshares((p as unknown as Proposal[]) ?? []);
    }
  }
  useEffect(() => {
    // The profile and reshares are loaded asynchronously from the database.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [id]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!profile)
    return (
      <div className="empty-state">
        <h1>Perfil no disponible.</h1>
      </div>
    );
  const avatar =
    profile.avatar_path && configured
      ? browserDb().storage.from("avatars").getPublicUrl(profile.avatar_path)
          .data.publicUrl
      : null;
  return (
    <>
      <div className="profile-header">
        {avatar ? (
          <Image
            unoptimized
            width={85}
            height={85}
            className="profile-avatar"
            src={avatar}
            alt="Avatar del perfil"
          />
        ) : (
          <span className="profile-avatar">{profile.name.slice(0, 1)}</span>
        )}
        <div>
          <p className="eyebrow">UNA VOZ DE LA COMUNIDAD</p>
          <h1>{profile.name}</h1>
          <p className="muted">{profile.location}</p>
        </div>
      </div>
      <p>{profile.bio}</p>
      {user?.id === id && (
        <button
          className="button secondary"
          onClick={() => setEditing(!editing)}
        >
          Editar mi perfil
        </button>
      )}
      <Notice message={message} />
      {editing && (
        <form
          className="form-card narrow-page"
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
                const { error } = await db.storage
                  .from("avatars")
                  .upload(path, file, { contentType: file.type });
                if (error) throw new Error("No se pudo guardar el avatar.");
              }
              const { error } = await db
                .from("profiles")
                .update({
                  name: f.get("name"),
                  bio: f.get("bio"),
                  location: f.get("location"),
                  avatar_path: path,
                })
                .eq("id", id);
              if (error) throw new Error("No se pudo actualizar el perfil.");
              if (path !== profile.avatar_path && profile.avatar_path)
                await db.storage.from("avatars").remove([profile.avatar_path]);
              setEditing(false);
              setMessage("Perfil actualizado.");
              await load();
            } catch (e) {
              setMessage(
                e instanceof Error ? e.message : "No se pudo guardar.",
              );
            } finally {
              setBusy(false);
            }
          }}
        >
          <label>
            Nombre público
            <input
              name="name"
              required
              minLength={2}
              maxLength={80}
              defaultValue={profile.name}
            />
          </label>
          <label>
            Biografía
            <textarea name="bio" maxLength={500} defaultValue={profile.bio} />
          </label>
          <label>
            Ubicación pública (opcional)
            <input
              name="location"
              maxLength={120}
              defaultValue={profile.location}
            />
          </label>
          <label>
            Avatar
            <input
              type="file"
              name="avatar"
              accept="image/png,image/jpeg,image/webp"
            />
            <small>Hasta 2 MB. Será público.</small>
          </label>
          <button className="button primary" disabled={busy}>
            Guardar perfil
          </button>
        </form>
      )}
      <div style={{ marginTop: 35 }}>
        <Feed authorId={id} />
      </div>
      <h2 className="section-title">Ideas que ha republicado</h2>
      {reshares.length ? (
        reshares.map((p) => (
          <ProposalCard key={p.id} proposal={p} onChange={load} />
        ))
      ) : (
        <p className="muted">Todavía no hay republicaciones.</p>
      )}
    </>
  );
}
