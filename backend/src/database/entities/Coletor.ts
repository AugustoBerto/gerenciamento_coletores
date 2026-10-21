import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Movimentacao } from './Movimentacao';
import { HistoricoManutencao } from './HistoricoManutencao';
import { Setor } from './Setor';

export type StatusColetor = 'DISPONIVEL' | 'EM_USO' | 'MANUTENCAO' | 'INATIVO';

@Entity({ name: 'coletores', schema: 'gestao_coletores' })
export class Coletor {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 7, unique: true })
  patrimonio!: string;

  @Column({ name: 'numero_serie', type: 'varchar', length: 60, nullable: true })
  numeroSerie!: string | null;

  @Column({ type: 'varchar', length: 50 })
  marca!: string;

  @Column({ type: 'varchar', length: 50 })
  modelo!: string;

  @Column({ name: 'setor_id', type: 'uuid', nullable: true })
  setorId!: string | null;

  @ManyToOne(() => Setor, (s) => s.coletores, { nullable: true })
  @JoinColumn({ name: 'setor_id' })
  setor!: Setor | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'DISPONIVEL',
  })
  status!: StatusColetor;

  @Column({ name: 'motivo_manutencao', type: 'text', nullable: true })
  motivoManutencao!: string | null;

  @Column({ name: 'numero_os', type: 'varchar', length: 50, nullable: true })
  numeroOs!: string | null;

  @Column({
    name: 'data_envio_manutencao',
    type: 'timestamptz',
    nullable: true,
  })
  dataEnvioManutencao!: Date | null;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  criadoEm!: Date;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamptz' })
  atualizadoEm!: Date;

  @OneToMany(() => Movimentacao, (mov) => mov.coletor)
  movimentacoes!: Movimentacao[];

  @OneToMany(() => HistoricoManutencao, (hm) => hm.coletor)
  historicoManutencoes!: HistoricoManutencao[];
}
