import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Operador } from './Operador';

@Entity({ name: 'bloqueios_colaboradores', schema: 'gestao_coletores' })
export class BloqueioColaborador {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'bigint',
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  matricula!: number;

  @Column({ type: 'text' })
  motivo!: string;

  @Column({ name: 'operador_id', type: 'uuid' })
  operadorId!: string;

  @ManyToOne(() => Operador)
  @JoinColumn({ name: 'operador_id' })
  operador!: Operador;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  criadoEm!: Date;
}
