import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';

export type PapelOperador = 'ADMIN' | 'TI' | 'OPERADOR';

@Entity({ name: 'operadores', schema: 'gestao_coletores' })
export class Operador {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({
    type: 'bigint',
    unique: true,
    transformer: {
      to: (value: number) => value,
      from: (value: string | number) => Number(value),
    },
  })
  matricula!: number;

  @Column({ type: 'varchar', length: 60, unique: true })
  usuario!: string;

  @Column({ type: 'varchar', length: 120 })
  nome!: string;

  @Column({ type: 'varchar', length: 80, nullable: true })
  cargo!: string | null;

  @Column({
    type: 'varchar',
    length: 30,
    default: 'OPERADOR',
  })
  papel!: PapelOperador;

  @Column({ name: 'senha_hash', type: 'varchar', length: 255, nullable: true })
  senhaHash!: string | null;

  @Column({ type: 'boolean', default: true })
  ativo!: boolean;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  criadoEm!: Date;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamptz' })
  atualizadoEm!: Date;
}
