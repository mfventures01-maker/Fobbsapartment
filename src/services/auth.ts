import { supabase } from "../lib/supabaseClient";

export async function signUp(email: string, password: string, fullName: string, businessName: string, category: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error("Signup failed");

  // Create a record in the businesses table
  const { data: business, error: businessError } = await supabase
    .from("businesses")
    .insert({ name: businessName, category })
    .select()
    .single();

  if (businessError) {
    console.error("Business creation error:", businessError);
    // Continue anyway or throw depending on business requirements
  }

  // Create a record in the profiles table
  const { error: profileError } = await supabase.from("profiles").insert({
    user_id: user.id,
    business_id: business?.id,
    full_name: fullName,
    role: "owner"
  });

  if (profileError) {
    console.error("Profile creation error:", profileError);
  }

  return user;
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function getSession() {
  const { data } = await supabase.auth.getSession();
  return data.session;
}