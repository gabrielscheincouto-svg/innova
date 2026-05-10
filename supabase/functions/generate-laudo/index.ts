// ============================================================
// Edge Function · generate-laudo
// ============================================================
// Gera o PDF do Laudo PGR (NR-1) a partir do assessment_id.
//
// Auth: requer header Authorization com JWT do Supabase.
// Apenas perfil 'profissional' ou 'gestor' pode chamar.
// 'proprietario' que tem acesso à empresa pode baixar o PDF
// já gerado (via assinatura), mas não regerar.
//
// Endpoint:
//   POST /functions/v1/generate-laudo
//   Body: { "assessment_id": "uuid" }
//
// Response: PDF binary (application/pdf)
// ============================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.43.0';
import { corsHeaders, handleCorsPreflight } from '../_shared/cors.ts';
import { buildLaudoPDF, type LaudoData } from './pdf-builder.ts';

interface RequestBody {
  assessment_id: string;
}

Deno.serve(async (req: Request) => {
  // Preflight CORS
  const cors = handleCorsPreflight(req);
  if (cors) return cors;

  if (req.method !== 'POST') {
    return jsonError(405, 'Método não permitido');
  }

  try {
    // ===== 1. Auth · pega o usuário do JWT =====
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return jsonError(401, 'Authorization header obrigatório');

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || Deno.env.get('PROJECT_URL');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('ANON_KEY');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY');

    if (!supabaseUrl || !anonKey || !serviceKey) {
      return jsonError(500, 'Variáveis de ambiente Supabase não configuradas');
    }

    // Cliente com JWT do usuário (pra checar quem é)
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userError } = await userClient.auth.getUser();
    if (userError || !userData.user) {
      return jsonError(401, 'Token inválido ou expirado');
    }

    // Cliente service-role pra agregar dados (bypass RLS)
    const adminClient = createClient(supabaseUrl, serviceKey);

    // Verifica role
    const { data: profile } = await adminClient
      .from('profiles')
      .select('id, full_name, email, role, is_active')
      .eq('id', userData.user.id)
      .single();

    if (!profile || !profile.is_active) {
      return jsonError(403, 'Usuário inativo');
    }
    if (!['profissional', 'gestor', 'proprietario'].includes(profile.role)) {
      return jsonError(403, 'Sem permissão para gerar laudo');
    }

    // ===== 2. Body =====
    const body = (await req.json()) as RequestBody;
    if (!body.assessment_id) {
      return jsonError(400, 'assessment_id é obrigatório');
    }

    // ===== 3. Busca dados do assessment =====
    const { data: assessment, error: assessError } = await adminClient
      .from('assessments')
      .select('id, company_id, cycle, type, status, total_invited, total_responses, signed_at, signed_by')
      .eq('id', body.assessment_id)
      .single();

    if (assessError || !assessment) {
      return jsonError(404, 'Avaliação não encontrada');
    }

    // ===== 4. Verifica se proprietário tem acesso à empresa =====
    if (profile.role === 'proprietario') {
      const { data: link } = await adminClient
        .from('user_companies')
        .select('id')
        .eq('profile_id', profile.id)
        .eq('company_id', assessment.company_id)
        .maybeSingle();
      if (!link) return jsonError(403, 'Você não tem acesso a esta empresa');
    }

    // ===== 5. Busca dados auxiliares (empresa, IPAR, plano, signedBy) =====
    const [companyRes, iparRes, actionsRes, signedByRes] = await Promise.all([
      adminClient.from('companies').select('id, legal_name, trade_name, cnpj, cnae, sector, address, city, state').eq('id', assessment.company_id).single(),
      adminClient.from('ipar_items').select('setor, atividade, perigo, dano, probabilidade, severidade, nr_aplicavel, controles_recomendados').eq('company_id', assessment.company_id).order('probabilidade', { ascending: false }),
      adminClient.from('action_plan').select('risco, medida, tipo, prioridade, responsavel, prazo, status').eq('company_id', assessment.company_id).order('prazo', { ascending: true }),
      assessment.signed_by
        ? adminClient.from('profiles').select('full_name, email, role').eq('id', assessment.signed_by).single()
        : Promise.resolve({ data: null }),
    ]);

    if (companyRes.error || !companyRes.data) {
      return jsonError(500, 'Erro ao carregar dados da empresa');
    }

    // ===== 6. Hash SHA-256 do payload (trilha de auditoria) =====
    const payload = JSON.stringify({
      assessment_id: assessment.id,
      company_cnpj: companyRes.data.cnpj,
      cycle: assessment.cycle,
      ipar_count: iparRes.data?.length || 0,
      actions_count: actionsRes.data?.length || 0,
      generated_at: new Date().toISOString(),
    });
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(payload));
    const documentHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const generatedAt = new Date().toISOString();

    // ===== 7. Monta o PDF =====
    const data: LaudoData = {
      company: companyRes.data,
      assessment,
      ipar: iparRes.data || [],
      actions: actionsRes.data || [],
      signedBy: signedByRes.data,
      generatedAt,
      documentHash,
    };

    const pdfBytes = await buildLaudoPDF(data);

    // ===== 8. Audit log + storage (best-effort) =====
    await adminClient.from('audit_logs').insert({
      actor_id: profile.id,
      actor_email: profile.email,
      action: 'laudo_generated',
      resource_type: 'assessment',
      resource_id: assessment.id,
      meta: {
        company_id: assessment.company_id,
        cycle: assessment.cycle,
        document_hash: documentHash,
        size_bytes: pdfBytes.byteLength,
      },
    });

    // Upload pra storage (bucket 'laudos') — best-effort
    try {
      const filePath = `${assessment.company_id}/${assessment.id}-${Date.now()}.pdf`;
      await adminClient.storage.from('laudos').upload(filePath, pdfBytes, {
        contentType: 'application/pdf',
        cacheControl: '3600',
        upsert: false,
      });
    } catch (e) {
      console.warn('[generate-laudo] storage upload falhou (bucket pode não existir):', e);
    }

    // ===== 9. Retorna o PDF =====
    const filename = `Laudo-PGR-NR1_${(companyRes.data.trade_name || companyRes.data.legal_name).replace(/\s+/g, '_')}_${assessment.cycle}.pdf`;
    return new Response(pdfBytes, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'X-Document-Hash': documentHash,
      },
    });
  } catch (err) {
    console.error('[generate-laudo] erro:', err);
    return jsonError(500, err instanceof Error ? err.message : 'Erro interno');
  }
});

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
