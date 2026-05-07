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

function cleanUsername(email){
  const base = (email || 'user')
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');

  return base + Math.floor(Math.random() * 10000);
}

async function createProfileIfMissing(session, displayName){
  if(!session || !session.user) return null;

  const email = session.user.email || '';
  const username = cleanUsername(email);
  const name =
    displayName ||
    session.user.user_metadata?.display_name ||
    session.user.user_metadata?.name ||
    email.split('@')[0] ||
    username;

  const {data, error} = await supabase
    .from('profiles')
    .insert({
      id: session.user.id,
      username: username,
      display_name: name,
      is_admin: false,
      is_approved: false
    })
    .select('*')
    .maybeSingle();

  if(error){
    console.error('Profil oluşturma hatası:', error);
    throw error;
  }

  return data;
}

// =====================================================
// AUTH
// =====================================================
const Auth = {
  async signUp(email, password, displayName){
    const {data, error} = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName
        }
      }
    });

    if(error) throw error;

    // Email confirmation açıksa burada session olmayabilir.
    // O yüzden profil oluşturma işi login sonrası da kontrol ediliyor.
    if(data.session && data.user){
      try {
        await createProfileIfMissing(data.session, displayName);
      } catch(e){
        console.warn('Signup sonrası profil hemen oluşturulamadı, login sonrası denenir:', e.message);
      }
    }

    return data;
  },

  async signIn(email, password){
    const {data, error} = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if(error) throw error;
    return data;
  },

  async signOut(){
    await supabase.auth.signOut();
  },

  async getSession(){
    const {data, error} = await supabase.auth.getSession();
    if(error) throw error;
    return data.session;
  },

  async getCurrentUser(){
    const session = await this.getSession();
    if(!session) return null;

    let {data, error} = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .maybeSingle();

    if(error){
      console.error('Profil okuma hatası:', error);
      throw error;
    }

    // Profil yoksa otomatik oluştur
    if(!data){
      data = await createProfileIfMissing(session);
    }

    return {
      ...data,
      email: session.user.email
    };
  },

  async resetPassword(email){
    const {error} = await supabase.auth.resetPasswordForEmail(email);
    if(error) throw error;
  },

  onAuthChange(callback){
    return supabase.auth.onAuthStateChange((event, session) => {
      callback(event, session);
    });
  }
};

// =====================================================
// PROFILES
// =====================================================
const Profiles = {
  async listAll(){
    const {data, error} = await supabase
      .from('profiles')
      .select('*')
      .order('display_name');

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
      .order('created_at', {ascending: true});

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
    const {error} = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if(error) throw error;
  },

  async findById(id){
    const {data, error} = await supabase
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if(error) throw error;
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
      .maybeSingle();

    if(error) throw error;

    if(!data){
      const {data: inserted, error: insertError} = await supabase
        .from('league_settings')
        .insert({id: 1})
        .select('*')
        .maybeSingle();

      if(insertError) throw insertError;
      return inserted;
    }

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
      .order('round', {ascending: true})
      .order('created_at', {ascending: true});

    if(error) throw error;
    return data || [];
  },

  async createBatch(matches){
    if(!matches || matches.length === 0) return;

    const {error} = await supabase
      .from('matches')
      .insert(matches);

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
    const {data, error} = await supabase
      .from('cup')
      .select('*')
      .eq('is_active', true)
      .order('created_at', {ascending: false})
      .limit(1)
      .maybeSingle();

    if(error) throw error;
    return data;
  },

  async getMatches(cupId){
    const {data, error} = await supabase
      .from('cup_matches')
      .select('*')
      .eq('cup_id', cupId)
      .order('round_index', {ascending: true})
      .order('pair_index', {ascending: true});

    if(error) throw error;
    return data || [];
  },

  async create(name, size, season){
    const {data, error} = await supabase
      .from('cup')
      .insert({
        name,
        size,
        season,
        is_active: true
      })
      .select('*')
      .maybeSingle();

    if(error) throw error;
    return data;
  },

  async deactivateOthers(){
    const {error} = await supabase
      .from('cup')
      .update({is_active: false})
      .eq('is_active', true);

    if(error) throw error;
  },

  async createMatches(matches){
    if(!matches || matches.length === 0) return;

    const {error} = await supabase
      .from('cup_matches')
      .insert(matches);

    if(error) throw error;
  },

  async updateMatch(id, updates){
    const {error} = await supabase
      .from('cup_matches')
      .update(updates)
      .eq('id', id);

    if(error) throw error;
  },

  async deleteAll(){
    const {error: e1} = await supabase
      .from('cup_matches')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if(e1) throw e1;

    const {error: e2} = await supabase
      .from('cup')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000');

    if(e2) throw e2;
  }
};

// =====================================================
// NOTIFICATIONS
// =====================================================
const Notifications = {
  async listMine(){
    const session = await Auth.getSession();
    if(!session) return [];

    const {data, error} = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', {ascending: false});

    if(error) throw error;
    return data || [];
  },

  async markRead(id){
    const {error} = await supabase
      .from('notifications')
      .update({is_read: true})
      .eq('id', id);

    if(error) throw error;
  },

  async create(userId, type, title, body, link){
    const {error} = await supabase
      .from('notifications')
      .insert({
        user_id: userId,
        type,
        title,
        body,
        link,
        is_read: false
      });

    if(error) throw error;
  }
};
