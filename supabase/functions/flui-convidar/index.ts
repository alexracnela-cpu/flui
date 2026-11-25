// @ts-nocheck
// FLUI · Edge Function "flui-convidar"
// Cria o acesso de uma pessoa ao Flui. Só o administrador do Flui consegue usar.
// - Se o email já tem conta no Supabase (ex.: usa o Rondaluz), só libera o Flui: a pessoa entra com a mesma senha.
// - Se não tem, cria a conta com uma SENHA PROVISÓRIA (vale 24 horas); no primeiro acesso a pessoa cria a dela.
// - "nova_senha": gera nova senha provisória (atenção: a conta é a mesma do Rondaluz, então a senha muda nos dois).
// Como publicar: Supabase > Edge Functions > Deploy a new function > Via Editor >
// nome "flui-convidar" > apague o exemplo, cole este arquivo inteiro > Deploy.
import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const resp = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const SETORES = ['Cadastro de pedidos', 'Aprovações', 'Manutenção', 'Obras leves', 'Obras pesadas', 'Cadastro', 'Levantamento', 'Gerência'];
const VALIDADE_H = 24;

function senhaProvisoria() {
  const L = 'abcdefghjkmnpqrstuvwxyz', N = '23456789', T = L + N + L.toUpperCase();
  const r = (s: string) => s[crypto.getRandomValues(new Uint32Array(1))[0] % s.length];
  let s = ''; for (let i = 0; i < 6; i++) s += r(T);
  return 'Fl' + r(N) + r(N) + '-' + s;   // ex.: Fl47-kR9mTz
}

async function acharUsuario(adm, email: string) {
  for (let page = 1; page < 50; page++) {
    const { data, error } = await adm.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const u = data.users.find((x) => (x.email || '').toLowerCase() === email);
    if (u) return u;
    if (data.users.length < 1000) return null;
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  try {
    const url = Deno.env.get('SUPABASE_URL')!;
    const anon = Deno.env.get('SUPABASE_ANON_KEY')!;
    const servico = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const auth = req.headers.get('Authorization') || '';
    const comoUsuario = createClient(url, anon, { global: { headers: { Authorization: auth } } });
    const { data: u } = await comoUsuario.auth.getUser();
    if (!u?.user) return resp({ erro: 'Entre no Flui de novo.' }, 401);

    const adm = createClient(url, servico, { auth: { persistSession: false } });
    const { data: eu } = await adm.from('flui_perfis').select('id,admin,ativo').eq('id', u.user.id).maybeSingle();
    if (!eu?.admin || !eu?.ativo) return resp({ erro: 'Só o administrador do Flui cria acessos.' }, 403);

    const b = await req.json();
    const email = String(b.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return resp({ erro: 'Email inválido.' }, 400);
    const expira = new Date(Date.now() + VALIDADE_H * 3600e3).toISOString();
    const { data: perfil } = await adm.from('flui_perfis').select('id').eq('email', email).maybeSingle();

    if (b.acao === 'nova_senha') {
      if (!perfil) return resp({ erro: 'Pessoa não encontrada.' }, 404);
      if (perfil.id === eu.id) return resp({ erro: 'Para trocar a sua própria senha, use "Trocar minha senha".' }, 400);
      const senha = senhaProvisoria();
      const { error } = await adm.auth.admin.updateUserById(perfil.id, { password: senha });
      if (error) return resp({ erro: error.message }, 400);
      await adm.from('flui_perfis').update({ senha_ok: false, convite_enviado: new Date().toISOString(), convite_expira: expira }).eq('id', perfil.id);
      return resp({ ok: true, email, senha, expira });
    }

    // criar
    const nome = String(b.nome || '').trim(), setor = String(b.setor || '');
    if (!nome) return resp({ erro: 'Informe o nome.' }, 400);
    if (!SETORES.includes(setor)) return resp({ erro: 'Escolha o setor.' }, 400);
    if (perfil) return resp({ erro: 'Essa pessoa já tem acesso ao Flui.' }, 400);

    const existente = await acharUsuario(adm, email);
    if (existente) {
      const { error } = await adm.from('flui_perfis').insert({ id: existente.id, nome, email, setor, senha_ok: true });
      if (error) return resp({ erro: error.message }, 400);
      return resp({ ok: true, email, existente: true });
    }
    const senha = senhaProvisoria();
    const { data: c, error } = await adm.auth.admin.createUser({ email, password: senha, email_confirm: true, user_metadata: { nome } });
    if (error) return resp({ erro: error.message }, 400);
    const { error: e2 } = await adm.from('flui_perfis').insert({ id: c.user.id, nome, email, setor, senha_ok: false,
      convite_enviado: new Date().toISOString(), convite_expira: expira });
    if (e2) { await adm.auth.admin.deleteUser(c.user.id); return resp({ erro: e2.message }, 400); }
    return resp({ ok: true, email, senha, expira });
  } catch (e) {
    return resp({ erro: String(e?.message || e) }, 500);
  }
});
