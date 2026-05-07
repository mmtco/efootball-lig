// =====================================================
// VERITABANI KATMANI
// =====================================================

let sb = null;

function initSupabase(){
  if(!window.SUPABASE_CONFIG || !window.SUPABASE_CONFIG.url || window.SUPABASE_CONFIG.url.includes('BURAYA')){
    alert('config.js dosyasindaki Supabase bilgilerini doldurmayi unutma!');
    return false;
  }
  sb = window.supabase.createClient(
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
    const {data, error} = await sb.auth.signUp({email, password});
    if(error) throw error;
    if(data.user){
      const username = email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g,'') + Math.floor(Math.random()*1000);
      const {error: pErr} = await sb.from('profiles').insert({
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
    const {data, error} = await sb.auth.signInWithPassword({email, password});
    if(error) throw error;
    return data;
  },

  async signOut(){
    await sb.auth.signOut();
  },

  async getSession(){
    const {data} = await sb.auth.getSession();
    return data.session;
  },

  async getCurrentUser(){
    const session = await this.getSession();
    if(!session) return null;
    const {data, error} = await sb
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybesingle();
    if(error) return null;
    return {...data, email: session.user.email};
  },

  async resetPassword(email){
    const {error} = await sb.auth.resetPasswordForEmail(email);
    if(error) throw error;
  }
};

// =====================================================
// PROFILES
// =====================================================
const Profiles = {
  async listAll(){
    const {data, error} = await sb.from('profiles').select('*').order('display_name');
    if(error) throw error;
    return data || [];
  },

  async listApproved(){
    const {data, error} = await sb
      .from('profiles')
      .select('*')
      .eq('is_approved', true)
      .order('display_name');
    if(error) throw error;
    return data || [];
  },

  async listPending(){
    const {data, error} = await sb
      .from('profiles')
      .select('*')
      .eq('is_approved', false)
      .order('created_at');
    if(error) throw error;
    return data || [];
  },

  async approve(userId){
    const {error} = await sb
      .from('profiles')
      .update({is_approved: true})
      .eq('id', userId);
    if(error) throw error;
  },

  async reject(userId){
    const {error} = await sb
      .from('profiles')
      .delete()
      .eq('id', userId);
    if(error) throw error;
  },

  async findById(id){
    const {data} = await sb.from('profiles').select('*').eq('id', id).single();
    return data;
  }
};

// =====================================================
// LEAGUE SETTINGS
// =====================================================
const League = {
  async get(){
    const {data, error} = await sb
      .from('league_settings')
      .select('*')
      .eq('id', 1)
      .single();
    if(error) throw error;
    return data;
  },

  async update(updates){
    const {error} = await sb
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
    const {data, error} = await sb
      .from('matches')
      .select('*')
      .order('round')
      .order('created_at');
    if(error) throw error;
    return data || [];
  },

  async createBatch(matches){
    const {error} = await sb.from('matches').insert(matches);
    if(error) throw error;
  },

  async update(id, updates){
    const {error} = await sb
      .from('matches')
      .update(updates)
      .eq('id', id);
    if(error) throw error;
  },

  async deleteAll(){
    const {error} = await sb
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
    const {data} = await sb
      .from('cup')
      .select('*')
      .eq('is_active', true)
      .order('created_at', {ascending: false})
      .limit(1)
      .maybeSingle();
    return data;
  },

  async getMatches(cupId){
    const {data, error} = await sb
      .from('cup_matches')
      .select('*')
      .eq('cup_id', cupId)
      .order('round_index')
      .order('pair_index');
    if(error) throw error;
    return data || [];
  },

  async create(name, size, season){
    const {data, error} = await sb
      .from('cup')
      .insert({name, size, season, is_active: true})
      .select()
      .single();
    if(error) throw error;
    return data;
  },

  async deactivateOthers(){
    await sb.from('cup').update({is_active: false}).eq('is_active', true);
  },

  async createMatches(matches){
    const {error} = await sb.from('cup_matches').insert(matches);
    if(error) throw error;
  },

  async updateMatch(id, updates){
    const {error} = await sb.from('cup_matches').update(updates).eq('id', id);
    if(error) throw error;
  },

  async deleteAll(){
    await sb.from('cup_matches').delete().neq('id','00000000-0000-0000-0000-000000000000');
    await sb.from('cup').delete().neq('id','00000000-0000-0000-0000-000000000000');
  }
};
