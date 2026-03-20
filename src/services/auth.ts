import { supabase } from "../lib/supabaseClient";
import { callRPC } from "../lib/rpcClient";

export async function signUp(email: string, password: string, fullName: string, businessName: string, category: string) {
  const { data, error } = await supabase.auth.signUp({ email, password });
  if (error) throw error;

  const user = data.user;
  if (!user) throw new Error("Signup failed");

  // 1. CNS-Monitored Business Creation (Pure Determinism)
  const business = await callRPC<any>('public', 'bootstrap_organization', {
    p_name: businessName,
    p_category: category
  });

  // 2. CNS-Monitored Profile Creation
  await callRPC('public', 'create_profile', {
    p_user_id: user.id,
    p_business_id: business?.id,
    p_full_name: fullName,
    p_role: "owner"
  });

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