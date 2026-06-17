/* eslint-disable @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return */
import { Test, TestingModule } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import helmet from "helmet";
import { JwtService } from "@nestjs/jwt";
import { ZodSerializerInterceptor, ZodValidationPipe } from "nestjs-zod";
import request from "supertest";
import { App } from "supertest/types";
import { AppModule } from "../../src/app.module";
import { HttpExceptionFilter } from "../../src/common/filters/http-exception.filter";
import { PrismaService } from "../../src/database/prisma.service";
import { setupOpenApi } from "../../src/openapi";

export type HealthResponseBody = {
  timestamp: string;
  uptime: number;
};

export type OpenApiResponseBody = {
  openapi?: string;
  info: Record<string, unknown>;
  components: {
    securitySchemes: {
      bearer: Record<string, unknown>;
    };
  };
  paths: Record<string, unknown>;
};

export type AuthResponseBody = {
  accessToken: string;
  user: {
    email: string;
    name: string;
    role: string;
    passwordHash?: string;
  };
};

export type CategoryResponseBody = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CategoryListResponseBody = {
  data: CategoryResponseBody[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type ProductResponseBody = {
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

export type ProductListResponseBody = {
  data: ProductResponseBody[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CartResponseBody = {
  id: string;
  userId: string;
  status: "ACTIVE" | "CHECKED_OUT" | "ABANDONED";
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPriceSnapshot: string;
    product: ProductResponseBody;
  }>;
};

export type OrderResponseBody = {
  id: string;
  userId: string;
  status: "PENDING" | "PAID" | "CANCELLED" | "FULFILLED";
  totalAmount: string;
  items: Array<{
    id: string;
    productId: string;
    quantity: number;
    unitPriceSnapshot: string;
    subtotal: string;
    product: ProductResponseBody;
  }>;
};

export function setupE2eContext() {
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
  const carts: Array<{
    id: string;
    userId: string;
    status: "ACTIVE" | "CHECKED_OUT" | "ABANDONED";
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const cartItems: Array<{
    id: string;
    cartId: string;
    productId: string;
    quantity: number;
    unitPriceSnapshot: {
      toString: () => string;
      mul: (value: unknown) => { toString: () => string };
    };
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const orders: Array<{
    id: string;
    userId: string;
    status: "PENDING" | "PAID" | "CANCELLED" | "FULFILLED";
    totalAmount: { toString: () => string };
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const orderItems: Array<{
    id: string;
    orderId: string;
    productId: string;
    quantity: number;
    unitPriceSnapshot: { toString: () => string };
    subtotal: { toString: () => string };
    createdAt: Date;
    updatedAt: Date;
  }> = [];
  const findCategory = (id: string) =>
    categories.find((category) => category.id === id) ?? null;
  const findProduct = (id: string) =>
    products.find((product) => product.id === id) ?? null;
  const serializeCart = (cart: (typeof carts)[number]) => ({
    ...cart,
    items: cartItems
      .filter((item) => item.cartId === cart.id)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
      .map((item) => ({ ...item, product: findProduct(item.productId) })),
  });
  const serializeOrder = (order: (typeof orders)[number]) => ({
    ...order,
    items: orderItems
      .filter((item) => item.orderId === order.id)
      .map((item) => ({ ...item, product: findProduct(item.productId) })),
  });
  const decimal = (value: unknown) => ({
    toString: () => Number(value).toFixed(2),
    mul: (quantity: unknown) => decimal(Number(value) * Number(quantity)),
  });
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
    $transaction: jest.fn((callback: (tx: unknown) => unknown) =>
      callback(prismaMock)
    ),
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
        const product = products.find((item) =>
          matchesProductWhere(item, where)
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
          price: decimal(data.price),
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
          price: data.price === undefined ? product.price : decimal(data.price),
          stock:
            data.stock?.decrement === undefined
              ? (data.stock ?? product.stock)
              : product.stock - data.stock.decrement,
          updatedAt: new Date(),
        });
        return Promise.resolve(product);
      }),
      updateMany: jest.fn(({ where, data }) => {
        const product = products.find(
          (item) =>
            item.id === where.id &&
            item.isActive === where.isActive &&
            item.stock >= where.stock.gte
        );

        if (!product) {
          return Promise.resolve({ count: 0 });
        }

        product.stock -= data.stock.decrement;
        product.updatedAt = new Date();
        return Promise.resolve({ count: 1 });
      }),
    },
    cart: {
      findFirst: jest.fn(({ where }) => {
        const cart = carts.find(
          (item) => item.userId === where.userId && item.status === where.status
        );

        return Promise.resolve(cart ? serializeCart(cart) : null);
      }),
      create: jest.fn(({ data }) => {
        const now = new Date();
        const cart = {
          id: `30000000-0000-4000-8000-${String(carts.length + 1).padStart(
            12,
            "0"
          )}`,
          userId: data.userId,
          status: data.status,
          createdAt: now,
          updatedAt: now,
        };
        carts.push(cart);
        return Promise.resolve(cart);
      }),
      update: jest.fn(({ where, data }) => {
        const cart = carts.find((item) => item.id === where.id);

        if (!cart) {
          throw new Error("Cart not found");
        }

        Object.assign(cart, data, { updatedAt: new Date() });
        return Promise.resolve(cart);
      }),
    },
    cartItem: {
      create: jest.fn(({ data }) => {
        const now = new Date();
        const item = {
          id: `40000000-0000-4000-8000-${String(cartItems.length + 1).padStart(
            12,
            "0"
          )}`,
          cartId: data.cartId,
          productId: data.productId,
          quantity: data.quantity,
          unitPriceSnapshot: decimal(data.unitPriceSnapshot),
          createdAt: now,
          updatedAt: now,
        };
        cartItems.push(item);
        return Promise.resolve(item);
      }),
      update: jest.fn(({ where, data }) => {
        const item = cartItems.find((cartItem) => cartItem.id === where.id);

        if (!item) {
          throw new Error("Cart item not found");
        }

        Object.assign(item, data, { updatedAt: new Date() });
        return Promise.resolve(item);
      }),
      delete: jest.fn(({ where }) => {
        const index = cartItems.findIndex((item) => item.id === where.id);

        if (index === -1) {
          throw new Error("Cart item not found");
        }

        const [deleted] = cartItems.splice(index, 1);
        return Promise.resolve(deleted);
      }),
    },
    order: {
      findMany: jest.fn(({ where }) =>
        Promise.resolve(
          orders
            .filter(
              (order) =>
                where?.userId === undefined || order.userId === where.userId
            )
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
            .map(serializeOrder)
        )
      ),
      findUnique: jest.fn(({ where, include }) => {
        const order = orders.find((item) => item.id === where.id) ?? null;

        return Promise.resolve(
          order && include?.items ? serializeOrder(order) : order
        );
      }),
      create: jest.fn(({ data, include }) => {
        const now = new Date();
        const order = {
          id: `50000000-0000-4000-8000-${String(orders.length + 1).padStart(
            12,
            "0"
          )}`,
          userId: data.userId,
          status: data.status,
          totalAmount: decimal(data.totalAmount),
          createdAt: now,
          updatedAt: now,
        };
        orders.push(order);
        data.items.create.forEach((item: any) => {
          orderItems.push({
            id: `60000000-0000-4000-8000-${String(
              orderItems.length + 1
            ).padStart(12, "0")}`,
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
            unitPriceSnapshot: decimal(item.unitPriceSnapshot),
            subtotal: decimal(item.subtotal),
            createdAt: now,
            updatedAt: now,
          });
        });
        return Promise.resolve(include?.items ? serializeOrder(order) : order);
      }),
      update: jest.fn(({ where, data, include }) => {
        const order = orders.find((item) => item.id === where.id);

        if (!order) {
          throw new Error("Order not found");
        }

        Object.assign(order, data, { updatedAt: new Date() });
        return Promise.resolve(include?.items ? serializeOrder(order) : order);
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
    carts.length = 0;
    cartItems.length = 0;
    orders.length = 0;
    orderItems.length = 0;
    jest.clearAllMocks();
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(prismaMock)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1");
    app.use(helmet());
    app.enableCors({ origin: true, credentials: true });
    app.useGlobalPipes(new ZodValidationPipe());
    app.useGlobalInterceptors(new ZodSerializerInterceptor(app.get(Reflector)));
    app.useGlobalFilters(new HttpExceptionFilter());
    await setupOpenApi(app);
    await app.init();
  });

  const createUserToken = async (
    id: string,
    email: string,
    role: "CUSTOMER" | "ADMIN"
  ) => {
    const user = {
      id,
      email,
      passwordHash: "not-used",
      name: email,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    users.push(user);

    return app.get(JwtService).signAsync({
      sub: user.id,
      email: user.email,
      role: user.role,
    });
  };

  afterEach(async () => {
    await app.close();
  });

  return {
    get app() {
      return app;
    },
    users,
    categories,
    products,
    carts,
    cartItems,
    orders,
    orderItems,
    prismaMock,
    findProduct,
    createUserToken,
  };
}
