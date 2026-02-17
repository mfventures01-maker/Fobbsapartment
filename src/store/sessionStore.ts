import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";

interface SessionState {
  session: any;
  profile: any;
  business: any;
  loading: boolean;
  loadSession: () => Promise<void>;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  profile: null,
  business: null,
  loading: true,

  loadSession: async () => {
    if (!supabase) {
      set({ loading: false });
      return;
    }

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.warn("Session store error:", error.message);
      set({ session: null, profile: null, business: null, loading: false });
      return;
    }

    const session = data.session;

    if (!session) {
      set({ session: null, profile: null, business: null, loading: false });
      return;
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*, businesses(*)")
      .eq("user_id", session.user.id)
      .maybeSingle(); // Better than single() if we are unsure

    set({
      session,
      profile,
      business: profile?.businesses || null,
      loading: false
    });
  },

  clearSession: () => {
    set({ session: null, profile: null, business: null });
  }
}));