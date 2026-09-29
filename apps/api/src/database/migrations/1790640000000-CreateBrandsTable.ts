import { Table } from 'typeorm';
import type { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Written with TypeORM's schema-builder API rather than raw SQL so the same
 * migration runs on Postgres, MySQL/MariaDB and the sqljs e2e database.
 */
export class CreateBrandsTable1790640000000 implements MigrationInterface {
  name = 'CreateBrandsTable1790640000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'brands',
        columns: [
          { name: 'id', type: 'uuid', isPrimary: true, isGenerated: true, generationStrategy: 'uuid' },
          { name: 'name', type: 'varchar', length: '255' },
          { name: 'slug', type: 'varchar', length: '255', isUnique: true },
          { name: 'description', type: 'text', isNullable: true },
          { name: 'logo', type: 'varchar', length: '255', isNullable: true },
          { name: 'website', type: 'varchar', length: '255', isNullable: true },
          { name: 'isActive', type: 'boolean', default: true },
          { name: 'sortOrder', type: 'int', default: 0 },
          { name: 'createdBy', type: 'varchar', length: '255', isNullable: true },
          { name: 'updatedBy', type: 'varchar', length: '255', isNullable: true },
          { name: 'createdAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'updatedAt', type: 'timestamp', default: 'CURRENT_TIMESTAMP' },
          { name: 'deletedAt', type: 'timestamp', isNullable: true },
        ],
      }),
      true,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('brands', true);
  }
}
