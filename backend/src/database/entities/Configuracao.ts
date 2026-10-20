import { Entity, PrimaryColumn, Column, UpdateDateColumn } from 'typeorm';

@Entity({ name: 'configuracoes', schema: 'gestao_coletores' })
export class Configuracao {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  chave!: string;

  @Column({ type: 'text' })
  valor!: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  descricao!: string | null;

  @UpdateDateColumn({ name: 'atualizado_em', type: 'timestamptz' })
  atualizadoEm!: Date;
}
