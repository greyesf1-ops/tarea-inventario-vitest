import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { Pool } from 'pg';
import type { Server } from 'node:http';
import { once } from 'node:events';
import { migrate } from '../../src/migrate.js';
import { PgProductRepository } from '../../src/repository.js';
import { InventoryService } from '../../src/domain.js';
import { createApi } from '../../src/http.js';
describe('Persistencia real con PostgreSQL temporal', () => {
  let container: StartedPostgreSqlContainer | undefined;
  let pool: Pool | undefined;
  let repository: PgProductRepository;
  let server: Server | undefined;
  let base: string;
  beforeAll(async () => {
    container = await new PostgreSqlContainer('postgres:16-alpine').start();
    // Nunca se lee DATABASE_URL: conexión exclusiva al contenedor temporal.
    pool = new Pool({connectionString:container.getConnectionUri()});
    await migrate(pool);
    repository = new PgProductRepository(pool);
    server = createApi(new InventoryService(repository));
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    base = `http://127.0.0.1:${(server.address() as {port:number}).port}`;
    console.log(`Testcontainers: PostgreSQL temporal en puerto ${container.getPort()}; migraciones aplicadas`);
  }, 120000);
  beforeEach(async () => { await pool!.query('TRUNCATE products RESTART IDENTITY'); });
  afterAll(async () => {
    try {
      if (server?.listening) await new Promise<void>((resolve, reject) => server!.close(error => error ? reject(error) : resolve()));
    } finally {
      try { await pool?.end(); } finally { await container?.stop(); }
    }
  }, 30000);
  it('escribe y recupera un producto con el repositorio real', async () => {
    const input = {sku:'LIB-1',name:'Libro',stock:10};
    const created = await repository.create(input);
    expect(created).toEqual({id:1,...input});
    expect(await repository.list()).toEqual([created]);
  });
  it('rechaza SKU duplicado y conserva el registro original', async () => {
    const input = {sku:'LIB-1',name:'Libro',stock:10};
    await repository.create(input);
    await expect(repository.create(input)).rejects.toMatchObject({status:409});
    expect(await repository.list()).toEqual([{id:1,...input}]);
  });
  it('la restricción SQL impide almacenar stock negativo', async () => {
    await expect(pool!.query("INSERT INTO products(sku,name,stock) VALUES('BAD','Inválido',-1)")).rejects.toMatchObject({code:'23514'});
    expect(await repository.list()).toEqual([]);
  });
  it('permite retirar todo el stock y rechaza un retiro adicional', async () => {
    const product = await repository.create({sku:'A',name:'Lápiz',stock:2});
    expect(await repository.withdraw(product.id,2)).toMatchObject({stock:0});
    await expect(repository.withdraw(product.id,1)).rejects.toMatchObject({status:409});
    expect(await repository.list()).toEqual([{...product,stock:0}]);
  });
  it('retiros concurrentes no producen stock negativo', async () => {
    const product = await repository.create({sku:'A',name:'Lápiz',stock:1});
    const results = await Promise.allSettled([repository.withdraw(product.id,1),repository.withdraw(product.id,1)]);
    expect(results.filter(r => r.status === 'fulfilled')).toHaveLength(1);
    expect(results.filter(r => r.status === 'rejected')).toHaveLength(1);
    expect(await repository.list()).toEqual([{...product,stock:0}]);
  });
  it('rechaza retiro de producto inexistente', async () => {
    await expect(repository.withdraw(99,1)).rejects.toMatchObject({status:404});
  });
  it('puede repetir las migraciones sin perder datos', async () => {
    const product = await repository.create({sku:'A',name:'Lápiz',stock:1});
    await migrate(pool!);
    expect(await repository.list()).toEqual([product]);
  });
  it('la API registra, consulta y retira usando PostgreSQL', async () => {
    const post = (path:string, data:unknown) => fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
    const response = await post('/products',{sku:'API-1',name:'Cuaderno',stock:3});
    expect(response.status).toBe(201);
    const product = await response.json();
    expect(await (await fetch(base+'/products')).json()).toEqual([product]);
    const withdrawal = await post(`/products/${product.id}/withdrawals`,{quantity:3});
    expect(withdrawal.status).toBe(200);
    expect(await withdrawal.json()).toMatchObject({stock:0});
    expect((await post(`/products/${product.id}/withdrawals`,{quantity:1})).status).toBe(409);
    expect((await post('/products',{sku:'INVALID',name:'X',stock:-1})).status).toBe(400);
  });
});
