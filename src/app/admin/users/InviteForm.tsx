"use client";
import { useState } from "react";
import { generateInviteLink } from "../actions";
import { button, field } from "../ui";

export default function InviteForm() {
  const [link, setLink] = useState(""); const [error, setError] = useState(""); const [pending, setPending] = useState(false);
  return <form className="rounded-2xl border border-[#d9dee7] bg-white p-5" onSubmit={async (event) => { event.preventDefault(); setPending(true); setError(""); const form = new FormData(event.currentTarget); try { const result = await generateInviteLink(form); setLink(result.link); } catch (reason) { setError(reason instanceof Error ? reason.message : "No se pudo generar el enlace"); } finally { setPending(false); } }}>
    <h2 className="font-bold">Generar invitación manual</h2><div className="mt-3 flex flex-wrap gap-2"><input className={`${field} min-w-72`} name="email" type="email" required placeholder="persona@ejemplo.com" /><button className={button} disabled={pending}>{pending ? "Generando…" : "Generar enlace"}</button></div>
    {link ? <div className="mt-3 rounded-lg bg-amber-50 p-3 text-sm"><p className="font-bold">Copiá ahora: se muestra una sola vez.</p><p className="mt-1 break-all">{link}</p></div> : null}{error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
  </form>;
}
