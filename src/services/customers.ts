import { supabase } from "../lib/supabaseClient";

export async function getOrCreateCustomer(
  businessId: string | undefined,
  name?: string,
  phone?: string,
  email?: string
) {
  // Requirement: Return null if neither phone nor email is provided
  if (!businessId || (!phone && !email)) return null;

  // Search for an existing customer by phone or email within the same business
  let query = supabase
    .from("customers")
    .select("*")
    .eq("business_id", businessId);

  const conditions = [];
  if (phone) conditions.push(`phone.eq.${phone}`);
  if (email) conditions.push(`email.eq.${email}`);

  // Querying using 'or' to match either identifier
  const { data: existing, error: findError } = await query
    .or(conditions.join(','))
    .maybeSingle();

  if (existing) return existing;
  if (findError) console.error("Error finding customer:", findError);

  // If not found, insert a new customer record
  const { data: created, error: createError } = await supabase
    .from("customers")
    .insert({
      business_id: businessId,
      full_name: name || null,
      phone: phone || null,
      email: email || null,
    })
    .select()
    .single();

  if (createError) {
    console.error("Error creating customer:", createError);
    return null;
  }

  return created;
}