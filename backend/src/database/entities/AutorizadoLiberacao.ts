import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Operador } from './Operador';

@Entity('autorizados_liberacao', { schema: 'gestao_coletores' })
export class AutorizadoLiberacao {
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

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | number | null) => (value !== null && value !== undefined ? Number(value) : null),
    },
  })
  codbarras!: number | null;

  @Column({
    type: 'bigint',
    nullable: true,
    transformer: {
      to: (value: number | null) => value,
      from: (value: string | number | null) => (value !== null && value !== undefined ? Number(value) : null),
    },
  })
  rfid!: number | null;

  @Column({ type: 'varchar', length: 120 })
  nome!: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  setor!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  funcao!: string | null;

  @Column({ name: 'criado_por_id', type: 'uuid', nullable: true })
  criadoPorId!: string | null;

  @ManyToOne(() => Operador, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'criado_por_id' })
  criadoPor!: Operador | null;

  @CreateDateColumn({ name: 'criado_em', type: 'timestamptz' })
  criadoEm!: Date;
}
