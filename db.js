// =====================================================
// VERİTABANI KATMANI
// Tüm Supabase çağrıları burada
// =====================================================

let supabase = null;

function initSupabase(){
  if(!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || window.SUPABASE_CONFIG.url.includes('BURAYA')){
    alert('config.js dosyasındaki Supabase bilgilerini doldurmayı unutma!');
    return false;
  }
  supabase = window.supabase.createClient(
    window.SUPABASE_CONFIG.url,
    window.SUPABASE_CONFIG.anonKey
  );
  return true;
}

// =====================================================
// AUTH
// =====================================================
const Auth = {
  async signUp(email, password, displayName){
    const {data, error} = await supabase.auth.signUp({email, password});
    if(error) throw error;
    if(data.user){
      // Profil oluştur (trigger yerine manuel)
      const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g,'') + Math.floor(Math.random()*1000);
      const {error: pErr} = await supabase.from('profiles').insert({
        id: data.user.id,
        username: username,
        display_name: displayName || username,
        is_admin: false,
        is_approved: false
      });
      if(pErr) throw pErr;
    }
    return data;
  },

  async signIn(email, password){
    const {data, error} = await supabase.auth.signInWithPassword({email, password});
    if(error) throw error;
    return data;
  },

  async signOut(){
    await supabase.auth.signOut();
  },

  async getSession(){
    const {data} = await supabase.auth.getSession();
    return data.session;
  },

  async getCurrentUser(){
    const session = await this.getSession();
    if(!session) return null;
    const {data, error} = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();
    if(error) return null;
    return {...data, email: session.user.email};
  },

  async resetPassword(email){
    const {error} = await supabase.auth.resetPasswordForEmail(email);
    if(error) throw error;
  },

  onAuthChange(callback){
    return supabase.auth.onAuthStateChange((event, session) => callback(event, session));
  }
};

// =====================================================
// PROFILES
// =====================================================
const Profiles = {
  async listAll(){
    const {data, error} = await supabase.from('profiles').select('*').order('display_name');
    if(error) throw error;
    return data || [];
  },

  async listApproved(){
    const {data, error} = await supabase
      .from('profiles')
      .select('*')
      .eq('is_approved', true)
      .order('display_name');
    if(error) throw error;
    return data || [];
  },

  async listPending(){
    const {data, error} = await supabase
      .from('profiles')
      .select('*')
      .eq('is_approved', false)
      .order('created_at');
    if(error) throw error;
    return data || [];
  },

  async approve(userId){
    const {error} = await supabase
      .from('profiles')
      .update({is_approved: true})
      .eq('id', userId);
    if(error) throw error;
  },

  async reject(userId){
    // RLS yüzünden auth.users'tan silmek için admin gerekiyor
    // Şimdilik sadece profile silelim
    const {error} = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);
    if(error) throw error;
  },

  async findById(id){
    const {data} = await supabase.from('profiles').select('*').eq('id', id).single();
    return data;
  }
};

// =====================================================
// LEAGUE SETTINGS
// =====================================================
const League = {
  async get(){
    const {data, error} = await supabase
      .from('league_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if(error) throw error;
    return data;
  },

  async update(updates){
    const {error} = await supabase
      .from('league_settings')
      .update(updates)
      .eq('id', 1);
    if(error) throw error;
  }
};

// =====================================================
// MATCHES
// =====================================================
const Matches = {
  async listAll(){
    const {data, error} = await supabase
      .from('matches')
      .select('*')
      .order('round')
      .order('created_at');
    if(error) throw error;
    return data || [];
  },

  async createBatch(matches){
    const {error} = await supabase.from('matches').insert(matches);
    if(error) throw error;
  },

  async update(id, updates){
    const {error} = await supabase
      .from('matches')
      .update(updates)
      .eq('id', id);
    if(error) throw error;
  },

  async deleteAll(){
    const {error} = await supabase
      .from('matches')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if(error) throw error;
  }
};

// =====================================================
// CUP
// =====================================================
const Cup = {
  async getActive(){
    const {data} = await supabase
      .from('cup')
      .select('*')
      .eq('is_active', true)
      .order('created_at', {ascending: false})
      .limit(1)
      .maybeSingle();
    return data;
  },

  async getMatches(cupId){
    const {data, error} = await supabase
      .from('cup_matches')
      .select('*')
      .eq('cup_id', cupId)
      .order('round_index')
      .order('pair_index');
    if(error) throw error;
    return data || [];
  },

  async create(name, size, season){
    const {data, error} = await supabase
      .from('cup')
      .insert({name, size, season, is_active: true})
      .select()
      .single();
    if(error) throw error;
    return data;
  },

  async deactivateOthers(){
    await supabase.from('cup').update({is_active: false}).eq('is_active', true);
  },

  async createMatches(matches){
    const {error} = await supabase.from('cup_matches').insert(matches);
    if(error) throw error;
  },

  async updateMatch(id, updates){
    const {error} = await supabase.from('cup_matches').update(updates).eq('id', id);
    if(error) throw error;
  },

  async deleteAll(){
    await supabase.from('cup_matches').delete().neq('id','00000000-0000-0000-0000-000000000000');
    await supabase.from('cup').delete().neq('id','00000000-0000-0000-0000-000000000000');
  }
};
