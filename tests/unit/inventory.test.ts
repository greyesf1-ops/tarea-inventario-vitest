import { describe, expect, it, vi } from 'vitest';
import { InventoryService, validateProduct, validateWithdrawal, type ProductRepository } from '../../src/domain.js';
describe('Reglas del inventario sin infraestructura', () => {
  it.each([0, 1000000])('acepta el límite de stock %i', stock => {
    // Arrange
    const input = {sku:'ABC-1', name:' Cuaderno ', stock};
    // Act
    const result = validateProduct(input);
    // Assert
    expect(result).toEqual({sku:'ABC-1', name:'Cuaderno', stock});
  });
  it.each([-1, 1000001, 0.5, NaN, Infinity, '5', null])('rechaza stock inválido %s', stock => {
    const input = {sku:'ABC', name:'Lápiz', stock};
    expect(() => validateProduct(input)).toThrow('Stock: entero');
  });
  it.each(['', 'abc', 'A B', 'A'.repeat(31)])('rechaza SKU inválido %s', sku => {
    const input = {sku, name:'Lápiz', stock:1};
    expect(() => validateProduct(input)).toThrow('SKU:');
  });
  it.each(['', '   ', 'A'.repeat(101)])('rechaza nombre inválido', name => {
    const input = {sku:'ABC', name, stock:1};
    expect(() => validateProduct(input)).toThrow('Nombre:');
  });
  it('acepta las longitudes máximas de SKU y nombre', () => {
    const input = {sku:'A'.repeat(30), name:'B'.repeat(100), stock:1};
    const result = validateProduct(input);
    expect(result).toEqual(input);
  });
  it.each([1, 1000000])('acepta retiro límite %i', quantity => {
    const result = validateWithdrawal(1, quantity);
    expect(result).toBe(quantity);
  });
  it.each([0, -1, 1.5, 1000001, '2', undefined])('rechaza retiro inválido %s', quantity => {
    expect(() => validateWithdrawal(1, quantity)).toThrow('Cantidad:');
  });
  it.each([0, -1, 1.5, NaN])('rechaza ID inválido %s', id => {
    expect(() => validateWithdrawal(id, 1)).toThrow('ID inválido');
  });
  it('registra el producto normalizado mediante el repositorio', async () => {
    const product = {sku:'ABC', name:'Lápiz', stock:5};
    const repo: ProductRepository = {create:vi.fn().mockResolvedValue({id:1,...product}), list:vi.fn(), withdraw:vi.fn()};
    const service = new InventoryService(repo);
    const result = await service.create({...product, name:' Lápiz '});
    expect(repo.create).toHaveBeenCalledExactlyOnceWith(product);
    expect(result).toEqual({id:1,...product});
  });
  it('no invoca persistencia cuando el producto es inválido', () => {
    const repo: ProductRepository = {create:vi.fn(), list:vi.fn(), withdraw:vi.fn()};
    const service = new InventoryService(repo);
    expect(() => service.create({sku:'ABC',name:'Lápiz',stock:-1})).toThrow();
    expect(repo.create).not.toHaveBeenCalled();
  });
});
