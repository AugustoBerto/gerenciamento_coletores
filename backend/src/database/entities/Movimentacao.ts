import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Coletor } from './Coletor';
import { Operador } from './Operador';

@Entity({ name: 'movimentacoes', schema: 'gestao_coletores' })
export class Movimentacao {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'coletor_id', type: 'uuid' })
  coletorId!: string;

  @ManyToOne(() => Coletor, (c) => c.movimentacoes)
  @JoinColumn({ name: 'coletor_id' })
  coletor!: Coletor;

  @Column({
    name: 'matricula_colaborador',
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  matriculaColaborador!: number;

  @Column({ name: 'nome_colaborador', type: 'varchar', length: 120 })
  nomeColaborador!: string;

  @Column({ name: 'setor_colaborador', type: 'varchar', length: 80, nullable: true })
  setorColaborador!: string | null;

  @Column({ name: 'operador_saida_id', type: 'uuid' })
  operadorSaidaId!: string;

  @ManyToOne(() => Operador)
  @JoinColumn({ name: 'operador_saida_id' })
  operadorSaida!: Operador;

  @Column({ name: 'operador_retorno_id', type: 'uuid', nullable: true })
  operadorRetornoId!: string | null;

  @ManyToOne(() => Operador)
  @JoinColumn({ name: 'operador_retorno_id' })
  operadorRetorno!: Operador | null;

  @Column({
    name: 'matricula_monitor_saida',
    type: 'bigint',
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | number | null) => (value !== null && value !== undefined ? Number(value) : null),
    },
  })
  matriculaMonitorSaida!: number | null;

  @Column({ name: 'nome_monitor_saida', type: 'varchar', length: 120, nullable: true })
  nomeMonitorSaida!: string | null;

  @Column({
    name: 'matricula_monitor_retorno',
    type: 'bigint',
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | number | null) => (value !== null && value !== undefined ? Number(value) : null),
    },
  })
  matriculaMonitorRetorno!: number | null;

  @Column({ name: 'nome_monitor_retorno', type: 'varchar', length: 120, nullable: true })
  nomeMonitorRetorno!: string | null;

  @Column({ name: 'data_saida', type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  dataSaida!: Date;

  @Column({ name: 'data_retorno', type: 'timestamptz', nullable: true })
  dataRetorno!: Date | null;

  @Column({ name: 'minutos_uso', type: 'integer', nullable: true })
  minutosUso!: number | null;

  @Column({ name: 'observacao_devolucao', type: 'text', nullable: true })
  observacaoDevolucao!: string | null;

  @Column({
    name: 'tipo_preferencia',
    type: 'varchar',
    length: 25,
    default: 'LIVRE',
  })
  tipoPreferencia!: 'TITULAR' | 'LIVRE' | 'FORA_PREFERENCIA';

  @Column({
    name: 'detalhe_preferencia',
    type: 'varchar',
    length: 255,
    nullable: true,
  })
  detalhePreferencia!: string | null;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  criadoEm!: Date;
}
