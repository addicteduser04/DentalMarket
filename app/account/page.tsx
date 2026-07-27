import { AuthForm } from "@/components/account/auth-form";
import { BrandLogo } from "@/components/brand-logo";
export default function AccountPage(){return <div className="container-shell grid gap-10 py-16 lg:grid-cols-2 lg:items-center"><div><BrandLogo/><p className="eyebrow mt-8">Espace personnel</p><h1 className="display mt-3 max-w-lg text-5xl md:text-6xl">Votre matériel, vos préférences.</h1><p className="mt-5 max-w-md leading-7 text-ink/55">Enregistrez vos coordonnées pour simplifier vos échanges avec l’équipe DENTALNOVA.</p></div><AuthForm/></div>}
