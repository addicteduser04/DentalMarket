"use client";
import { useEffect, useState } from "react";
import { MessageCircle, X } from "lucide-react";
import { createWhatsAppUrl } from "@/lib/whatsapp";

const DISMISS_KEY = "dn-whatsapp-dismissed";

export function WhatsAppFloatButton() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try { setDismissed(sessionStorage.getItem(DISMISS_KEY) === "1"); } catch { setDismissed(false); }
  }, []);

  if (dismissed) return null;

  function close() {
    setDismissed(true);
    try { sessionStorage.setItem(DISMISS_KEY, "1"); } catch {}
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <a
        href={createWhatsAppUrl("Bonjour DENTANOVA, j’aimerais plus d’informations.")}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contacter DENTANOVA sur WhatsApp"
        className="grid h-14 w-14 place-items-center rounded-full bg-[#1f9d55] text-white shadow-[0_14px_36px_rgba(31,157,85,.4)] transition hover:-translate-y-1 hover:brightness-105"
      >
        <MessageCircle size={26}/>
      </a>
      <button
        type="button"
        onClick={close}
        aria-label="Fermer"
        className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full border border-[rgba(23,33,29,.12)] bg-white text-[#17211d] shadow-md transition hover:scale-105"
      >
        <X size={13} strokeWidth={2.5}/>
      </button>
    </div>
  );
}
