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

@Entity({ name: 'historico_manutencoes', schema: 'gestao_coletores' })
export class HistoricoManutencao {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'coletor_id', type: 'uuid' })
  coletorId!: string;

  @ManyToOne(() => Coletor, (c) => c.historicoManutencoes)
  @JoinColumn({ name: 'coletor_id' })
  coletor!: Coletor;

  @Column({ name: 'operador_id', type: 'uuid' })
  operadorId!: string;

  @ManyToOne(() => Operador)
  @JoinColumn({ name: 'operador_id' })
  operador!: Operador;

  @Column({ name: 'motivo_entrada', type: 'text' })
  motivoEntrada!: string;

  @Column({ name: 'numero_os', type: 'varchar', length: 50, nullable: true })
  numeroOs!: string | null;

  @Column({ name: 'solucao_saida', type: 'text', nullable: true })
  solucaoSaida!: string | null;

  @CreateDateColumn({ name: 'data_entrada', type: 'timestamptz' })
  dataEntrada!: Date;

  @Column({ name: 'data_conclusao', type: 'timestamptz', nullable: true })
  dataConclusao!: Date | null;
}
