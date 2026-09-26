"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createAdminSchema } from "@/features/onboarding/schemas";

export interface CreateAdminState {
  error?: string;
  /** Le compte a été créé mais Supabase exige une confirmation par email avant qu'une
   * session existe — on ne peut pas enchaîner sur la suite de l'assistant dans cet onglet. */
  pendingEmailConfirmation?: boolean;
}

export async function createAdminAccount(
  _prev: CreateAdminState,
  formData: FormData,
): Promise<CreateAdminState> {
  const parsed = createAdminSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    role: formData.get("role"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
    acceptTerms: formData.get("acceptTerms"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Formulaire invalide" };
  }

  const { firstName, lastName, phone, email, password } = parsed.data;
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Lu par le trigger handle_new_user() (db/schema.sql §19) pour créer `profiles`.
      data: { first_name: firstName, last_name: lastName, display_name: `${firstName} ${lastName}` },
    },
  });

  if (error) {
    const message = error.message.toLowerCase();
    if (message.includes("already registered") || message.includes("already exists")) {
      return { error: "Un compte existe déjà avec cet email — connectez-vous plutôt." };
    }
    return { error: error.message };
  }

  if (!data.session) {
    return { pendingEmailConfirmation: true };
  }

  if (data.user) {
    // `phone` n'est pas transmis par signUp email/mot de passe (réservé à l'auth par SMS) —
    // on le complète séparément maintenant que la session existe.
    await supabase.from("profiles").update({ phone }).eq("id", data.user.id);
  }

  redirect("/onboarding/configuration");
}
