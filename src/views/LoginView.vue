<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-brand">
        <div class="brand-mark">H</div>
        <div class="brand-name">Hartinna Partner</div>
        <div class="brand-sub">Admin Console</div>
      </div>

      <div class="alert alert-error" v-if="error">{{ error }}</div>

      <form @submit.prevent="login">
        <div class="form-group">
          <label for="admin-email">Email Address</label>
          <input id="admin-email" name="email" v-model="email" type="email" autocomplete="username" placeholder="admin@hartinna.com" />
        </div>

        <div class="form-group">
          <label for="admin-password">Password</label>
          <input id="admin-password" name="password" v-model="password" :type="showPw ? 'text' : 'password'" autocomplete="current-password" placeholder="Enter password" />
        </div>

        <button class="btn btn-primary login-btn" type="submit" :disabled="loading">
          <span class="spinner" v-if="loading" style="width:16px;height:16px;border-width:2px;border-color:rgba(255,255,255,0.3);border-top-color:white;"></span>
          {{ loading ? 'Signing in…' : 'Sign In' }}
        </button>
      </form>

      <div class="login-note">Access restricted to authorized administrators only.</div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../lib/supabase'

const router   = useRouter()
const email    = ref('')
const password = ref('')
const showPw   = ref(false)
const loading  = ref(false)
const error    = ref('')

async function login() {
  error.value = ''
  if (!email.value || !password.value) { error.value = 'Please enter your email and password.'; return }

  loading.value = true
  try {
    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    email.value.trim(),
      password: password.value
    })

    if (authError) throw authError

    // Verify this user is an admin
    const { data: { session } } = await supabase.auth.getSession()
    const { data: admin } = await supabase
      .from('admins')
      .select('id')
      .eq('id', session.user.id)
      .maybeSingle()

    if (!admin) {
      await supabase.auth.signOut()
      throw new Error('Access denied. This account does not have admin privileges.')
    }

    router.push('/orders')
  } catch (e) {
    error.value = e.message?.includes('Invalid login credentials')
      ? 'Invalid email or password.'
      : e.message || 'Sign in failed.'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: var(--sidebar-bg);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
}

.login-card {
  background: white; border-radius: var(--radius);
  padding: 36px 32px; width: 100%; max-width: 400px;
  box-shadow: 0 20px 60px rgba(0,0,0,0.3);
}

.login-brand {
  text-align: center; margin-bottom: 28px;
}

.brand-mark {
  width: 52px; height: 52px;
  background: linear-gradient(135deg, var(--primary), var(--accent));
  border-radius: 14px;
  display: inline-flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 700; color: white;
  margin-bottom: 12px;
  box-shadow: 0 4px 16px rgba(212,39,108,0.35);
}

.brand-name { font-size: 20px; font-weight: 700; color: var(--text); }
.brand-sub  { font-size: 12px; color: var(--text-muted); margin-top: 3px; }

.form-group { margin-bottom: 14px; }

.login-btn {
  width: 100%; justify-content: center;
  padding: 12px; font-size: 14.5px;
  margin-top: 6px; margin-bottom: 16px;
  box-shadow: 0 4px 14px rgba(212,39,108,0.3);
}

.login-note {
  text-align: center; font-size: 12px;
  color: var(--text-muted);
}
</style>
