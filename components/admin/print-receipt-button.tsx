"use client";
import { Printer } from "lucide-react";
export function PrintReceiptButton(){return <button className="account-button print:hidden" onClick={()=>window.print()}><Printer size={16}/>Imprimer le bon de vente</button>}
