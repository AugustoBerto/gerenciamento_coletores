import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Coletor } from './Coletor';

@Entity({ name: 'coletor_titulares', schema: 'gestao_coletores' })
export class ColetorTitular {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'coletor_id', type: 'uuid' })
  coletorId!: string;

  @ManyToOne(() => Coletor, (c) => c.titulares, { onDelete: 'CASCADE' })
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

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  criadoEm!: Date;
}
