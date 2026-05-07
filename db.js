// =====================================================
// eFootball Lig - DB Layer
// =====================================================

let sb = null;

// =====================================================
// INIT
// =====================================================

function initSupabase() {
  if (
    !window.SUPABASE_CONFIG ||
    !window.SUPABASE_CONFIG.url ||
    !window.SUPABASE_CONFIG.anonKey
  ) {
    alert("Supabase config eksik!");
    return false;
  }

  sb = window.supabase.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey
  );

  return true;
}

initSupabase();

// =====================================================
// HELPERS
// =====================================================

function makeUsername(email) {
  return (
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, "") +
    Math.floor(Math.random() * 10000)
  );
}

// =====================================================
// AUTH
// =====================================================

const Auth = {
  async signUp(email, password, displayName) {
    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) throw error;
    return data;
  },

  async signIn(email, password) {
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
    return data;
  },

  async signOut() {
    await sb.auth.signOut();
  },

  async getSession() {
    const { data, error } = await sb.auth.getSession();
    if (error) throw error;
    return data.session;
  },

  async getCurrentUser() {
    const session = await this.getSession();
    if (!session) return null;

    let { data, error } = await sb
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .maybeSingle();

    if (error) throw error;

    if (!data) {
      const username = makeUsername(session.user.email);

      const { data: created, error: createErr } = await sb
        .from("profiles")
        .insert({
          id: session.user.id,
          username,
          display_name: session.user.user_metadata?.display_name || username,
          is_admin: false,
          is_approved: false,
        })
        .select("*")
        .maybeSingle();

      if (createErr) throw createErr;
      data = created;
    }

    return {
      ...data,
      email: session.user.email,
    };
  },

  async resetPassword(email) {
    const { error } = await sb.auth.resetPasswordForEmail(email);
    if (error) throw error;
  },

  onAuthChange(callback) {
    return sb.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  },
};

// =====================================================
// PROFILES
// =====================================================

const Profiles = {
  async listAll() {
    const { data, error } = await sb
      .from("profiles")
      .select("*")
      .order("display_name");

    if (error) throw error;
    return data || [];
  },

  async listApproved() {
    const { data, error } = await sb
      .from("profiles")
      .select("*")
      .eq("is_approved", true)
      .order("display_name");

    if (error) throw error;
    return data || [];
  },

  async listPending() {
    const { data, error } = await sb
      .from("profiles")
      .select("*")
      .eq("is_approved", false)
      .order("created_at");

    if (error) throw error;
    return data || [];
  },

  async approve(userId) {
    const { error } = await sb
      .from("profiles")
      .update({ is_approved: true })
      .eq("id", userId);

    if (error) throw error;
  },

  async reject(userId) {
    const { error } = await sb
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (error) throw error;
  },

  async findById(id) {
    const { data, error } = await sb
      .from("profiles")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) throw error;
    return data;
  },
};

// =====================================================
// LEAGUE
// =====================================================

const League = {
  async get() {
    const { data, error } = await sb
      .from("league_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async update(updates) {
    const { error } = await sb
      .from("league_settings")
      .update(updates)
      .eq("id", 1);

    if (error) throw error;
  },
};

// =====================================================
// MATCHES
// =====================================================

const Matches = {
  async listAll() {
    const { data, error } = await sb
      .from("matches")
      .select("*")
      .order("round");

    if (error) throw error;
    return data || [];
  },

  async createBatch(matches) {
    if (!matches || matches.length === 0) return;

    const { error } = await sb
      .from("matches")
      .insert(matches);

    if (error) throw error;
  },

  async update(id, updates) {
    const { error } = await sb
      .from("matches")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
  },

  async deleteAll() {
    const { error } = await sb
      .from("matches")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (error) throw error;
  },
};

// =====================================================
// CUP
// =====================================================

const Cup = {
  async getActive() {
    const { data, error } = await sb
      .from("cup")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async getMatches(cupId) {
    const { data, error } = await sb
      .from("cup_matches")
      .select("*")
      .eq("cup_id", cupId)
      .order("round_index")
      .order("pair_index");

    if (error) throw error;
    return data || [];
  },

  async create(name, size, season) {
    const { data, error } = await sb
      .from("cup")
      .insert({
        name,
        size,
        season,
        is_active: true,
      })
      .select("*")
      .maybeSingle();

    if (error) throw error;
    return data;
  },

  async deactivateOthers() {
    const { error } = await sb
      .from("cup")
      .update({ is_active: false })
      .eq("is_active", true);

    if (error) throw error;
  },

  async createMatches(matches) {
    if (!matches || matches.length === 0) return;

    const { error } = await sb
      .from("cup_matches")
      .insert(matches);

    if (error) throw error;
  },

  async updateMatch(id, updates) {
    const { error } = await sb
      .from("cup_matches")
      .update(updates)
      .eq("id", id);

    if (error) throw error;
  },

  async deleteAll() {
    const { error: e1 } = await sb
      .from("cup_matches")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (e1) throw e1;

    const { error: e2 } = await sb
      .from("cup")
      .delete()
      .neq("id", "00000000-0000-0000-0000-000000000000");

    if (e2) throw e2;
  },
};

// =====================================================
// NOTIFICATIONS
// =====================================================

const Notifications = {
  async listMine() {
    const session = await Auth.getSession();
    if (!session) return [];

    const { data, error } = await sb
      .from("notifications")
      .select("*")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  },

  async markRead(id) {
    const { error } = await sb
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id);

    if (error) throw error;
  },

  async create(userId, type, title, body, link) {
    const { error } = await sb
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        body,
        link,
      });

    if (error) throw error;
  },
};
