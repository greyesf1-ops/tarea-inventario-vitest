import type { Pool } from 'pg';
import { BusinessError, type NewProduct, type Product, type ProductRepository } from './domain.js';
export class PgProductRepository implements ProductRepository {
  constructor(private pool: Pool) {}
  async create(product: NewProduct): Promise<Product> {
    try {
      const result = await this.pool.query<Product>('INSERT INTO products(sku,name,stock) VALUES($1,$2,$3) RETURNING *', [product.sku, product.name, product.stock]);
      return result.rows[0];
    } catch (error) {
      if ((error as {code?: string}).code === '23505') throw new BusinessError('SKU ya registrado', 409);
      throw error;
    }
  }
  async list() { return (await this.pool.query<Product>('SELECT * FROM products ORDER BY id')).rows; }
  async withdraw(id: number, quantity: number): Promise<Product> {
    // La condición y la modificación ocurren en una única sentencia atómica.
    const result = await this.pool.query<Product>('UPDATE products SET stock=stock-$2 WHERE id=$1 AND stock >= $2 RETURNING *', [id, quantity]);
    if (result.rows[0]) return result.rows[0];
    const exists = await this.pool.query('SELECT id FROM products WHERE id=$1', [id]);
    if (!exists.rowCount) throw new BusinessError('Producto no encontrado', 404);
    throw new BusinessError('Stock insuficiente', 409);
  }
}
