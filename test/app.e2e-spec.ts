import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "./../src/app.module";
import { PrismaService } from "./../src/database/prisma.service";
import { setupOpenApi } from "./../src/openapi";

type HealthResponseBody = {
  timestamp: string;
  uptime: number;
};

type OpenApiResponseBody = {
  openapi?: string;
  info: Record<string, unknown>;
  components: {
    securitySchemes: {
      bearer: Record<string, unknown>;
    };
  };
  paths: Record<string, unknown>;
};

type AuthResponseBody = {
  accessToken: string;
  user: {
    email: string;
    name: string;
    role: string;
    passwordHash?: string;
  };
};

type CategoryResponseBody = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type CategoryListResponseBody = {
  data: CategoryResponseBody[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

type ProductResponseBody = {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  description: string | null;
  price: string;
  stock: number;
  isActive: boolean;
  category?: CategoryResponseBody;
};

type ProductListResponseBody = {
  data: ProductResponseBody[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

describe("AppController (e2e)", () => {
  let app: INestApplication<App>;
  const users: Array<{
    id: string;
    email: string;
    passwordHash: string;
    name: string;
    role: "CUSTOMER" | "ADMIN";
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const categories: Array<{
    id: string;
    name: string;
    slug: string;
    description: string | null;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const products: Array<{
    id: string;
    categoryId: string;
    name: string;
    slug: string;
    description: string | null;
    price: { toString: () => string };
    stock: number;
    isActive: boolean;
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const findCategory = (id: string) =>
    categories.find((category) => category.id === id) ?? null;
  const matchesProductWhere = (
    product: (typeof products)[number],
    where: Record<string, any>
  ) => {
    const category = findCategory(product.categoryId);
    const price = Number(product.price.toString());

    return (
      (where.id === undefined || product.id === where.id) &&
      (where.isActive === undefined || product.isActive === where.isActive) &&
      (where.categoryId === undefined ||
        product.categoryId === where.categoryId) &&
      (where.category?.isActive === undefined ||
        category?.isActive === where.category.isActive) &&
      (where.category?.slug === undefined ||
        category?.slug === where.category.slug) &&
      (where.price?.gte === undefined || price >= Number(where.price.gte)) &&
      (where.price?.lte === undefined || price <= Number(where.price.lte)) &&
      (where.OR === undefined ||
        where.OR.some((condition: Record<string, any>) => {
          const search = String(
            condition.name?.contains ?? condition.description?.contains
          ).toLowerCase();
          return (
            product.name.toLowerCase().includes(search) ||
            (product.description?.toLowerCase().includes(search) ?? false)
          );
        }))
    );
  };
  const prismaMock = {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $queryRaw: jest.fn().mockResolvedValue([{ "?column?": 1 }]),
    user: {
      findUnique: jest.fn(
        ({ where }: { where: { id?: string; email?: string } }) =>
          Promise.resolve(
            users.find(
              (user) => user.id === where.id || user.email === where.email
            ) ?? null
          )
      ),
      create: jest.fn(
        ({
          data,
        }: {
          data: { email: string; passwordHash: string; name: string };
        }) => {
          const now = new Date();
          const user = {
            id: `00000000-0000-4000-8000-${String(users.length + 1).padStart(
              12,
              "0"
            )}`,
            email: data.email,
            passwordHash: data.passwordHash,
            name: data.name,
            role: "CUSTOMER" as const,
            createdAt: now,
            updatedAt: now,
          };
          users.push(user);
          return Promise.resolve(user);
        }
      ),
    },
    product: {
      findMany: jest.fn(({ where, skip, take }) =>
        Promise.resolve(
          products
            .filter((product) => matchesProductWhere(product, where))
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(skip, skip + take)
        )
      ),
      count: jest.fn(({ where }) =>
        Promise.resolve(
          products.filter((product) => matchesProductWhere(product, where))
            .length
        )
      ),
      findFirst: jest.fn(({ where, include }) => {
        const product = products.find(
          (item) => item.id === where.id && matchesProductWhere(item, where)
        );

        return Promise.resolve(
          product && include?.category
            ? { ...product, category: findCategory(product.categoryId) }
            : (product ?? null)
        );
      }),
      findUnique: jest.fn(
        ({ where }: { where: { id?: string; slug?: string } }) =>
          Promise.resolve(
            products.find(
              (product) =>
                product.id === where.id || product.slug === where.slug
            ) ?? null
          )
      ),
      create: jest.fn(({ data }) => {
        const now = new Date();
        const product = {
          id: `20000000-0000-4000-8000-${String(products.length + 1).padStart(
            12,
            "0"
          )}`,
          categoryId: data.categoryId,
          name: data.name,
          slug: data.slug,
          description: data.description ?? null,
          price: { toString: () => Number(data.price).toFixed(2) },
          stock: data.stock,
          isActive: data.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        };
        products.push(product);
        return Promise.resolve(product);
      }),
      update: jest.fn(({ where, data }) => {
        const product = products.find((item) => item.id === where.id);

        if (!product) {
          throw new Error("Product not found");
        }

        Object.assign(product, data, {
          price:
            data.price === undefined
              ? product.price
              : { toString: () => Number(data.price).toFixed(2) },
          updatedAt: new Date(),
        });
        return Promise.resolve(product);
      }),
    },
    category: {
      findMany: jest.fn(({ skip, take }: { skip: number; take: number }) =>
        Promise.resolve(
          categories
            .filter((category) => category.isActive)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .slice(skip, skip + take)
        )
      ),
      count: jest.fn(() =>
        Promise.resolve(
          categories.filter((category) => category.isActive).length
        )
      ),
      findFirst: jest.fn(({ where }: { where: { id: string } }) =>
        Promise.resolve(
          categories.find(
            (category) => category.id === where.id && category.isActive
          ) ?? null
        )
      ),
      findUnique: jest.fn(
        ({ where }: { where: { id?: string; slug?: string } }) =>
          Promise.resolve(
            categories.find(
              (category) =>
                category.id === where.id || category.slug === where.slug
            ) ?? null
          )
      ),
      create: jest.fn(
        ({
          data,
        }: {
          data: {
            name: string;
            slug: string;
            description?: string;
            isActive?: boolean;
          };
        }) => {
          const now = new Date();
          const category = {
            id: `10000000-0000-4000-8000-${String(
              categories.length + 1
            ).padStart(12, "0")}`,
            name: data.name,
            slug: data.slug,
            description: data.description ?? null,
            isActive: data.isActive ?? true,
            createdAt: now,
            updatedAt: now,
          };
          categories.push(category);
          return Promise.resolve(category);
        }
      ),
      update: jest.fn(
        ({
          where,
          data,
        }: {
          where: { id: string };
          data: Partial<{
            name: string;
            slug: string;
            description: string;
            isActive: boolean;
          }>;
        }) => {
          const category = categories.find((item) => item.id === where.id);

          if (!category) {
            throw new Error("Category not found");
          }

          Object.assign(category, data, { updatedAt: new Date() });
          return Promise.resolve(category);
        }
      ),
    },
  };

  beforeEach(async () => {
    users.length = 0;
    categories.length = 0;
    products.length = 0;
    jest.clearAllMocks();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalInterceptors(new ZodSerializerInterceptor(app.get(Reflector)));
    await setupOpenApi(app);
    await app.init();
  });

  it("/ (GET)", () => {
    return request(app.getHttpServer())
      .get("/api/v1")
      .expect(200)
      .expect("Hello World!");
  });

  it("/api/v1/health (GET)", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/health")
      .expect(200);

    const body = response.body as HealthResponseBody;

    expect(body).toMatchObject({
      status: "ok",
      database: {
        status: "ok",
      },
    });
    expect(body.timestamp).toEqual(expect.any(String));
    expect(body.uptime).toEqual(expect.any(Number));
  });

  it("/openapi.json (GET)", async () => {
    const response = await request(app.getHttpServer())
      .get("/openapi.json")
      .expect(200);

    const body = response.body as OpenApiResponseBody;

    expect(body.openapi).toBeDefined();
    expect(body.info).toMatchObject({
      title: "NestJS Online Store API",
      version: "1.0.0",
    });
    expect(body.components.securitySchemes.bearer).toMatchObject({
      type: "http",
      scheme: "bearer",
      bearerFormat: "JWT",
    });
    expect(body.paths["/api/v1/health"]).toBeDefined();
  });

  it("/docs (GET)", () => {
    return request(app.getHttpServer())
      .get("/docs")
      .expect(200)
      .expect("Content-Type", /html/);
  });

  it("auth token flow", async () => {
    const email = "customer@example.com";
    const password = "password123";

    const registerResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/register")
      .send({ email, password, name: "Customer User" })
      .expect(201);

    const registerBody = registerResponse.body as AuthResponseBody;

    expect(registerBody.accessToken).toEqual(expect.any(String));
    expect(registerBody.user).toMatchObject({
      email,
      name: "Customer User",
      role: "CUSTOMER",
    });
    expect(registerBody.user.passwordHash).toBeUndefined();

    const loginResponse = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({ email, password })
      .expect(201);

    const loginBody = loginResponse.body as AuthResponseBody;

    expect(loginBody.accessToken).toEqual(expect.any(String));

    await request(app.getHttpServer()).get("/api/v1/auth/me").expect(401);

    const meResponse = await request(app.getHttpServer())
      .get("/api/v1/auth/me")
      .set("Authorization", `Bearer ${loginBody.accessToken}`)
      .expect(200);

    const meBody = meResponse.body as AuthResponseBody["user"];

    expect(meBody).toMatchObject({
      email,
      name: "Customer User",
      role: "CUSTOMER",
    });
    expect(meBody.passwordHash).toBeUndefined();
  });

  it("categories CRUD flow", async () => {
    const admin = {
      id: "00000000-0000-4000-8000-000000000999",
      email: "admin@example.com",
      passwordHash: "not-used",
      name: "Admin User",
      role: "ADMIN" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.push(admin);

    const adminToken = await app.get(JwtService).signAsync({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });

    await request(app.getHttpServer())
      .post("/api/v1/categories")
      .send({ name: "Books", slug: "books" })
      .expect(401);

    const createResponse = await request(app.getHttpServer())
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        name: "Books",
        slug: "books",
        description: "Book collection",
      })
      .expect(201);

    const createdCategory = createResponse.body as CategoryResponseBody;

    expect(createdCategory).toMatchObject({
      name: "Books",
      slug: "books",
      description: "Book collection",
      isActive: true,
    });

    await request(app.getHttpServer())
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Duplicate Books", slug: "books" })
      .expect(409);

    const listResponse = await request(app.getHttpServer())
      .get("/api/v1/categories?page=1&limit=10")
      .expect(200);

    const listBody = listResponse.body as CategoryListResponseBody;

    expect(listBody.data).toHaveLength(1);
    expect(listBody.meta).toMatchObject({
      page: 1,
      limit: 10,
      total: 1,
      totalPages: 1,
    });

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/categories/${createdCategory.id}`)
      .expect(200);

    expect(detailResponse.body).toMatchObject({ slug: "books" });

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/categories/${createdCategory.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Updated Books", slug: "updated-books" })
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      name: "Updated Books",
      slug: "updated-books",
    });

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/api/v1/categories/${createdCategory.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(deleteResponse.body).toMatchObject({ isActive: false });

    const emptyListResponse = await request(app.getHttpServer())
      .get("/api/v1/categories")
      .expect(200);

    expect((emptyListResponse.body as CategoryListResponseBody).data).toEqual(
      []
    );

    await request(app.getHttpServer())
      .get(`/api/v1/categories/${createdCategory.id}`)
      .expect(404);
  });

  it("products relation CRUD flow", async () => {
    const admin = {
      id: "00000000-0000-4000-8000-000000000999",
      email: "admin-products@example.com",
      passwordHash: "not-used",
      name: "Admin Products",
      role: "ADMIN" as const,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.push(admin);

    const adminToken = await app.get(JwtService).signAsync({
      sub: admin.id,
      email: admin.email,
      role: admin.role,
    });

    const categoryResponse = await request(app.getHttpServer())
      .post("/api/v1/categories")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Electronics", slug: "electronics" })
      .expect(201);

    const category = categoryResponse.body as CategoryResponseBody;

    await request(app.getHttpServer())
      .post("/api/v1/products")
      .send({
        categoryId: category.id,
        name: "Laptop",
        slug: "laptop",
        price: 1500,
        stock: 5,
      })
      .expect(401);

    await request(app.getHttpServer())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        categoryId: "00000000-0000-4000-8000-000000000404",
        name: "Invalid Product",
        slug: "invalid-product",
        price: 10,
        stock: 1,
      })
      .expect(404);

    await request(app.getHttpServer())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        categoryId: category.id,
        name: "Free Laptop",
        slug: "free-laptop",
        price: 0,
        stock: 1,
      })
      .expect(400);

    const createResponse = await request(app.getHttpServer())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        categoryId: category.id,
        name: "Laptop",
        slug: "laptop",
        description: "Portable computer",
        price: 1500,
        stock: 5,
      })
      .expect(201);

    const createdProduct = createResponse.body as ProductResponseBody;

    expect(createdProduct).toMatchObject({
      categoryId: category.id,
      name: "Laptop",
      slug: "laptop",
      description: "Portable computer",
      price: "1500.00",
      stock: 5,
      isActive: true,
    });

    await request(app.getHttpServer())
      .post("/api/v1/products")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        categoryId: category.id,
        name: "Duplicate Laptop",
        slug: "laptop",
        price: 100,
        stock: 1,
      })
      .expect(409);

    const listResponse = await request(app.getHttpServer())
      .get(
        "/api/v1/products?search=portable&categorySlug=electronics&minPrice=1000&maxPrice=2000"
      )
      .expect(200);

    const listBody = listResponse.body as ProductListResponseBody;

    expect(listBody.data).toHaveLength(1);
    expect(listBody.data[0]).toMatchObject({ slug: "laptop" });

    const detailResponse = await request(app.getHttpServer())
      .get(`/api/v1/products/${createdProduct.id}`)
      .expect(200);

    expect(detailResponse.body).toMatchObject({
      slug: "laptop",
      category: { id: category.id, slug: "electronics" },
    });

    const updateResponse = await request(app.getHttpServer())
      .patch(`/api/v1/products/${createdProduct.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ name: "Updated Laptop", stock: 3 })
      .expect(200);

    expect(updateResponse.body).toMatchObject({
      name: "Updated Laptop",
      stock: 3,
    });

    const deleteResponse = await request(app.getHttpServer())
      .delete(`/api/v1/products/${createdProduct.id}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .expect(200);

    expect(deleteResponse.body).toMatchObject({ isActive: false });

    await request(app.getHttpServer())
      .get(`/api/v1/products/${createdProduct.id}`)
      .expect(404);
  });

  afterEach(async () => {
    await app.close();
  });
});
