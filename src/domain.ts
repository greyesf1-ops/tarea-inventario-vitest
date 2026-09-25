export class BusinessError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export interface Product { id: number; sku: string; name: string; stock: number }
export type NewProduct = Omit<Product, 'id'>;
export interface ProductRepository {
  create(product: NewProduct): Promise<Product>;
  list(): Promise<Product[]>;
  withdraw(id: number, quantity: number): Promise<Product>;
}
export function validateProduct(input: unknown): NewProduct {
  if (!input || typeof input !== 'object') throw new BusinessError('Producto inválido');
  const { sku, name, stock } = input as Record<string, unknown>;
  if (typeof sku !== 'string' || !/^[A-Z0-9-]{1,30}$/.test(sku)) throw new BusinessError('SKU: 1 a 30 letras mayúsculas, números o guiones');
  if (typeof name !== 'string' || name.trim().length < 1 || name.trim().length > 100) throw new BusinessError('Nombre: 1 a 100 caracteres');
  if (typeof stock !== 'number' || !Number.isInteger(stock) || stock < 0 || stock > 1000000) throw new BusinessError('Stock: entero entre 0 y 1000000');
  return { sku, name: name.trim(), stock };
}
export function validateWithdrawal(id: number, quantity: unknown): number {
  if (!Number.isSafeInteger(id) || id < 1) throw new BusinessError('ID inválido');
  if (typeof quantity !== 'number' || !Number.isInteger(quantity) || quantity < 1 || quantity > 1000000) throw new BusinessError('Cantidad: entero entre 1 y 1000000');
  return quantity;
}
export class InventoryService {
  constructor(private repository: ProductRepository) {}
  create(input: unknown) { return this.repository.create(validateProduct(input)); }
  list() { return this.repository.list(); }
  withdraw(id: number, quantity: unknown) { return this.repository.withdraw(id, validateWithdrawal(id, quantity)); }
}
