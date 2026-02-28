import { create } from "zustand";
import { supabase } from "../lib/supabaseClient";

interface SessionState {
  session: any;
  loading: boolean;
  loadSession: () => Promise<void>;
  clearSession: () => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  session: null,
  loading: true,

  loadSession: async () => {
    if (!supabase) {
      set({ loading: false });
      return;
    }

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.warn("Session store error:", error.message);
      set({ session: null, loading: false });
      return;
    }

    const session = data.session;

    if (!session) {
      set({ session: null, loading: false });
      return;
    }

    set({
      session,
      loading: false
    });
  },

  clearSession: () => {
    set({ session: null });
  }
}));