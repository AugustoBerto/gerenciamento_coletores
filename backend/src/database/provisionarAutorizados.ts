import { AppDataSource, connectDatabase } from '../config/database';

interface CandidatoHistorico {
  matricula: string;
  nome_historico: string | null;
  nome_corporativo: string | null;
  codbarras: string | null;
  rfid: string | null;
  setor: string;
  funcao: string;
  total_liberacoes: number;
  ja_eh_usuario_ativo: boolean;
  usuario_login: string | null;
  ja_esta_autorizado: boolean;
}

async function run(): Promise<void> {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const apenasSaida = args.includes('--apenas-saida');

  console.log('==================================================================');
  console.log('[Provisionamento] Lista de Autorizados a Liberar Coletores');
  if (dryRun) {
    console.log('[Modo] SIMULAÇÃO (--dry-run) — Nenhuma alteração será gravada.');
  }
  console.log('==================================================================');

  await connectDatabase();

  try {
    const queryCandidatos = `
      WITH eventos_monitor AS (
        -- 1. Monitores identificados pelo bipe de crachá na saída (check-out)
        SELECT
          m.matricula_monitor_saida AS matricula,
          m.nome_monitor_saida AS nome_historico,
          m.data_saida AS data_evento
        FROM gestao_coletores.movimentacoes m
        WHERE m.matricula_monitor_saida IS NOT NULL

        UNION ALL

        -- 2. Monitores identificados pelo bipe de crachá no retorno (check-in)
        SELECT
          m.matricula_monitor_retorno AS matricula,
          m.nome_monitor_retorno AS nome_historico,
          COALESCE(m.data_retorno, m.data_saida) AS data_evento
        FROM gestao_coletores.movimentacoes m
        WHERE $1::boolean = FALSE
          AND m.matricula_monitor_retorno IS NOT NULL

        UNION ALL

        -- 3. Operadores vinculados via FK em movimentações cujo usuário esteja inativo
        SELECT
          op.matricula AS matricula,
          op.nome AS nome_historico,
          m.data_saida AS data_evento
        FROM gestao_coletores.movimentacoes m
        INNER JOIN gestao_coletores.operadores op ON op.id = m.operador_saida_id
        WHERE op.ativo = FALSE
      ),
      historico_agrupado AS (
        SELECT
          e.matricula,
          (ARRAY_AGG(e.nome_historico ORDER BY e.data_evento DESC) FILTER (WHERE e.nome_historico IS NOT NULL))[1] AS nome_historico,
          COUNT(*)::int AS total_liberacoes
        FROM eventos_monitor e
        WHERE e.matricula IS NOT NULL
          AND e.matricula NOT IN (9999001, 9999002)
        GROUP BY e.matricula
      )
      SELECT
        h.matricula::text AS matricula,
        h.nome_historico,
        c.nome AS nome_corporativo,
        c.codbarras::text AS codbarras,
        c.rfid::text AS rfid,
        COALESCE(l.nome_setor, 'Setor Operacional') AS setor,
        COALESCE(l.funcao, 'Monitor') AS funcao,
        h.total_liberacoes,
        EXISTS (
          SELECT 1
          FROM gestao_coletores.operadores o
          WHERE o.matricula = h.matricula
            AND o.ativo = TRUE
        ) AS ja_eh_usuario_ativo,
        (
          SELECT o.usuario
          FROM gestao_coletores.operadores o
          WHERE o.matricula = h.matricula
            AND o.ativo = TRUE
          LIMIT 1
        ) AS usuario_login,
        EXISTS (
          SELECT 1
          FROM gestao_coletores.autorizados_liberacao a
          WHERE a.matricula = h.matricula
        ) AS ja_esta_autorizado
      FROM historico_agrupado h
      LEFT JOIN colaborador.colaboradores c ON c.matricula = h.matricula
      LEFT JOIN colaborador.lista_funcionario l ON l.matricula = h.matricula
      ORDER BY COALESCE(c.nome, h.nome_historico) ASC;
    `;

    const candidatos: CandidatoHistorico[] = await AppDataSource.query(queryCandidatos, [apenasSaida]);

    if (candidatos.length === 0) {
      console.log('\n[Resultado] Nenhum monitor extra encontrado no histórico de movimentações.');
      return;
    }

    const ignoradosPorUsuario = candidatos.filter((c) => c.ja_eh_usuario_ativo);
    const jaAutorizados = candidatos.filter((c) => !c.ja_eh_usuario_ativo && c.ja_esta_autorizado);
    const novosParaInserir = candidatos.filter((c) => !c.ja_eh_usuario_ativo && !c.ja_esta_autorizado);

    console.log(`\nResumo da análise do histórico de movimentações:`);
    console.log(`  • Total de matrículas distintas que já liberaram coletores: ${candidatos.length}`);
    console.log(`  • Ignorados (já possuem usuário ativo cadastrado):         ${ignoradosPorUsuario.length}`);
    console.log(`  • Já constam na lista de Autorizados a Liberar:            ${jaAutorizados.length}`);
    console.log(`  • Novos colaboradores elegíveis para inclusão:             ${novosParaInserir.length}`);

    if (ignoradosPorUsuario.length > 0) {
      console.log('\n--- Ignorados (Já possuem usuário ativo em gestao_coletores.operadores) ---');
      for (const item of ignoradosPorUsuario) {
        const nome = item.nome_corporativo || item.nome_historico || `Matrícula ${item.matricula}`;
        console.log(`  [SKIP] Mat: ${item.matricula} | ${nome} (@${item.usuario_login})`);
      }
    }

    if (jaAutorizados.length > 0) {
      console.log('\n--- Já presentes na lista de Autorizados ---');
      for (const item of jaAutorizados) {
        const nome = item.nome_corporativo || item.nome_historico || `Matrícula ${item.matricula}`;
        console.log(`  [OK]   Mat: ${item.matricula} | ${nome} (${item.setor})`);
      }
    }

    if (novosParaInserir.length > 0) {
      console.log('\n--- Novos Autorizados a Provisionar ---');
      for (const item of novosParaInserir) {
        const nome = item.nome_corporativo || item.nome_historico || `Colaborador ${item.matricula}`;
        console.log(
          `  [+]    Mat: ${item.matricula} | ${nome} | Setor: ${item.setor} | Função: ${item.funcao} (${item.total_liberacoes} movimentação(ões))`
        );
      }
    }

    if (!dryRun && (novosParaInserir.length > 0 || jaAutorizados.length > 0)) {
      const insertQuery = `
        WITH eventos_monitor AS (
          SELECT
            m.matricula_monitor_saida AS matricula,
            m.nome_monitor_saida AS nome_historico,
            m.data_saida AS data_evento
          FROM gestao_coletores.movimentacoes m
          WHERE m.matricula_monitor_saida IS NOT NULL

          UNION ALL

          SELECT
            m.matricula_monitor_retorno AS matricula,
            m.nome_monitor_retorno AS nome_historico,
            COALESCE(m.data_retorno, m.data_saida) AS data_evento
          FROM gestao_coletores.movimentacoes m
          WHERE $1::boolean = FALSE
            AND m.matricula_monitor_retorno IS NOT NULL

          UNION ALL

          SELECT
            op.matricula AS matricula,
            op.nome AS nome_historico,
            m.data_saida AS data_evento
          FROM gestao_coletores.movimentacoes m
          INNER JOIN gestao_coletores.operadores op ON op.id = m.operador_saida_id
          WHERE op.ativo = FALSE
        ),
        historico_agrupado AS (
          SELECT
            e.matricula,
            (ARRAY_AGG(e.nome_historico ORDER BY e.data_evento DESC) FILTER (WHERE e.nome_historico IS NOT NULL))[1] AS nome_historico
          FROM eventos_monitor e
          WHERE e.matricula IS NOT NULL
            AND e.matricula NOT IN (9999001, 9999002)
          GROUP BY e.matricula
        )
        INSERT INTO gestao_coletores.autorizados_liberacao (
          matricula,
          nome,
          codbarras,
          rfid,
          setor,
          funcao
        )
        SELECT
          h.matricula,
          LEFT(COALESCE(c.nome, h.nome_historico, 'Colaborador ' || h.matricula::text), 120) AS nome,
          c.codbarras,
          c.rfid,
          LEFT(COALESCE(l.nome_setor, 'Setor Operacional'), 100) AS setor,
          LEFT(COALESCE(l.funcao, 'Monitor'), 100) AS funcao
        FROM historico_agrupado h
        LEFT JOIN colaborador.colaboradores c ON c.matricula = h.matricula
        LEFT JOIN colaborador.lista_funcionario l ON l.matricula = h.matricula
        WHERE NOT EXISTS (
          SELECT 1
          FROM gestao_coletores.operadores o
          WHERE o.matricula = h.matricula
            AND o.ativo = TRUE
        )
        ON CONFLICT (matricula) DO UPDATE SET
          codbarras = COALESCE(gestao_coletores.autorizados_liberacao.codbarras, EXCLUDED.codbarras),
          rfid = COALESCE(gestao_coletores.autorizados_liberacao.rfid, EXCLUDED.rfid),
          setor = COALESCE(gestao_coletores.autorizados_liberacao.setor, EXCLUDED.setor),
          funcao = COALESCE(gestao_coletores.autorizados_liberacao.funcao, EXCLUDED.funcao);
      `;

      await AppDataSource.query(insertQuery, [apenasSaida]);
      console.log(
        `\n[Sucesso] Provisionamento concluído! ${novosParaInserir.length} novo(s) colaborador(es) adicionado(s) à lista de autorizados.`
      );
    } else if (dryRun) {
      console.log('\n[Simulação concluída] Execute sem --dry-run para gravar os registros no banco.');
    } else {
      console.log('\n[Concluído] Nenhuma nova inserção necessária.');
    }
  } finally {
    if (AppDataSource.isInitialized) {
      await AppDataSource.destroy();
    }
  }
}

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('[Provisionamento] Erro ao provisionar lista de autorizados:', err);
    process.exit(1);
  });
