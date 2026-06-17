import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { hash } from "argon2";
import { PrismaClient } from "../src/generated/prisma/client";
import { CartStatus, OrderStatus, Role } from "../src/generated/prisma/enums";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL ?? "" }),
});

const categories = [
  [
    "smartphones",
    "Smartphones",
    "Android and iOS phones for daily use, gaming, and content creation.",
  ],
  [
    "laptops",
    "Laptops",
    "Portable computers for work, study, gaming, and creative production.",
  ],
  ["audio", "Audio", "Headphones, earbuds, speakers, and microphones."],
  [
    "cameras",
    "Cameras",
    "Mirrorless cameras, action cameras, lenses, and camera accessories.",
  ],
  [
    "home-office",
    "Home Office",
    "Ergonomic desks, chairs, monitors, and productivity tools.",
  ],
  [
    "gaming",
    "Gaming",
    "Consoles, controllers, keyboards, mice, and gaming accessories.",
  ],
  [
    "wearables",
    "Wearables",
    "Smartwatches, fitness trackers, and health devices.",
  ],
  [
    "smart-home",
    "Smart Home",
    "Connected lights, plugs, security cameras, and home automation.",
  ],
] as const;

const products = [
  [
    "smartphones",
    "aurora-x1-128gb",
    "Aurora X1 128GB",
    "Balanced 5G phone with OLED display and all-day battery.",
    "6299000",
    42,
  ],
  [
    "smartphones",
    "aurora-x1-pro-256gb",
    "Aurora X1 Pro 256GB",
    "Flagship camera phone with fast charging and titanium frame.",
    "9999000",
    18,
  ],
  [
    "smartphones",
    "pixelnova-lite",
    "PixelNova Lite",
    "Affordable Android phone with clean software and bright display.",
    "2899000",
    80,
  ],
  [
    "smartphones",
    "terra-rugged-5g",
    "Terra Rugged 5G",
    "Water-resistant rugged phone for field work and travel.",
    "4599000",
    24,
  ],
  [
    "smartphones",
    "mini-se-64gb",
    "Mini SE 64GB",
    "Compact smartphone for kids, seniors, and backup use.",
    "1999000",
    55,
  ],
  [
    "laptops",
    "workmate-14-i5",
    "WorkMate 14 i5",
    "Thin office laptop with 16GB RAM and 512GB SSD.",
    "10999000",
    16,
  ],
  [
    "laptops",
    "workmate-16-i7",
    "WorkMate 16 i7",
    "Large-screen productivity laptop with strong multitasking performance.",
    "15999000",
    11,
  ],
  [
    "laptops",
    "creatorbook-pro-14",
    "CreatorBook Pro 14",
    "Color-accurate laptop for designers, editors, and developers.",
    "22499000",
    7,
  ],
  [
    "laptops",
    "gameforge-15-rtx",
    "GameForge 15 RTX",
    "144Hz gaming laptop with discrete graphics and RGB keyboard.",
    "18999000",
    9,
  ],
  [
    "laptops",
    "studentbook-13",
    "StudentBook 13",
    "Lightweight laptop for school, notes, and online classes.",
    "6499000",
    35,
  ],
  [
    "audio",
    "sonicbuds-air",
    "SonicBuds Air",
    "True wireless earbuds with noise cancellation and wireless charging.",
    "1299000",
    120,
  ],
  [
    "audio",
    "sonicbuds-sport",
    "SonicBuds Sport",
    "Sweat-resistant earbuds with secure hooks for running.",
    "899000",
    95,
  ],
  [
    "audio",
    "studio-max-headphones",
    "Studio Max Headphones",
    "Over-ear headphones with detailed sound and long battery life.",
    "2499000",
    34,
  ],
  [
    "audio",
    "roomwave-mini",
    "RoomWave Mini Speaker",
    "Portable Bluetooth speaker with punchy bass and IPX7 rating.",
    "699000",
    76,
  ],
  [
    "audio",
    "podcast-usb-mic",
    "Podcast USB Microphone",
    "Plug-and-play microphone for streaming, meetings, and podcasts.",
    "849000",
    44,
  ],
  [
    "cameras",
    "snappro-mirrorless-kit",
    "SnapPro Mirrorless Kit",
    "Compact mirrorless camera with 18-55mm kit lens.",
    "12499000",
    8,
  ],
  [
    "cameras",
    "snappro-50mm-f18",
    "SnapPro 50mm f/1.8 Lens",
    "Fast prime lens for portraits and low-light photos.",
    "2299000",
    19,
  ],
  [
    "cameras",
    "actioncam-wave-4k",
    "ActionCam Wave 4K",
    "Stabilized action camera for biking, diving, and travel vlogs.",
    "3299000",
    27,
  ],
  [
    "cameras",
    "creator-tripod-carbon",
    "Creator Tripod Carbon",
    "Lightweight carbon tripod with fluid head.",
    "1599000",
    31,
  ],
  [
    "cameras",
    "vloglight-rgb",
    "VlogLight RGB Panel",
    "Portable RGB video light with app control.",
    "599000",
    63,
  ],
  [
    "home-office",
    "ergochair-flex",
    "ErgoChair Flex",
    "Adjustable ergonomic chair with lumbar support.",
    "3499000",
    22,
  ],
  [
    "home-office",
    "standdesk-120",
    "StandDesk 120",
    "Electric sit-stand desk with memory presets.",
    "4299000",
    13,
  ],
  [
    "home-office",
    "viewplus-27-4k",
    "ViewPlus 27 4K Monitor",
    "Sharp 27-inch 4K monitor for coding, editing, and multitasking.",
    "4999000",
    20,
  ],
  [
    "home-office",
    "dockmaster-usbc",
    "DockMaster USB-C Hub",
    "11-in-1 USB-C dock with HDMI, LAN, SD, and power delivery.",
    "1199000",
    58,
  ],
  [
    "home-office",
    "focusdesk-lamp",
    "FocusDesk Lamp",
    "Dimmable LED desk lamp with wireless charging pad.",
    "799000",
    67,
  ],
  [
    "gaming",
    "neonkey-tkl",
    "NeonKey TKL Keyboard",
    "Hot-swappable mechanical keyboard with compact layout.",
    "1299000",
    48,
  ],
  [
    "gaming",
    "aimpro-wireless",
    "AimPro Wireless Mouse",
    "Lightweight gaming mouse with low-latency receiver.",
    "899000",
    70,
  ],
  [
    "gaming",
    "pulsepad-xl",
    "PulsePad XL Mousepad",
    "Large stitched gaming mousepad with smooth control surface.",
    "249000",
    140,
  ],
  [
    "gaming",
    "consolebox-s",
    "ConsoleBox S",
    "Compact next-gen console for digital games and streaming.",
    "5499000",
    15,
  ],
  [
    "gaming",
    "duopad-controller",
    "DuoPad Controller",
    "Wireless controller with haptic feedback and USB-C charging.",
    "749000",
    62,
  ],
  [
    "wearables",
    "fittrack-band-2",
    "FitTrack Band 2",
    "Slim fitness tracker with sleep, steps, and heart-rate monitoring.",
    "599000",
    100,
  ],
  [
    "wearables",
    "orbit-watch-active",
    "Orbit Watch Active",
    "GPS smartwatch with workout modes and 7-day battery.",
    "2199000",
    39,
  ],
  [
    "wearables",
    "orbit-watch-classic",
    "Orbit Watch Classic",
    "Premium smartwatch with stainless case and AMOLED display.",
    "3499000",
    21,
  ],
  [
    "wearables",
    "healthring-air",
    "HealthRing Air",
    "Sleep and recovery ring with lightweight titanium body.",
    "2999000",
    26,
  ],
  [
    "wearables",
    "kidwatch-safe",
    "KidWatch Safe",
    "Kids smartwatch with location sharing and emergency call button.",
    "1299000",
    46,
  ],
  [
    "smart-home",
    "lumos-smart-bulb-4pack",
    "Lumos Smart Bulb 4-Pack",
    "Wi-Fi smart bulbs with dimming and warm-to-cool color.",
    "499000",
    130,
  ],
  [
    "smart-home",
    "guardcam-mini",
    "GuardCam Mini",
    "Indoor security camera with motion alerts and two-way audio.",
    "699000",
    74,
  ],
  [
    "smart-home",
    "guardcam-outdoor",
    "GuardCam Outdoor",
    "Weatherproof outdoor camera with night vision.",
    "1299000",
    36,
  ],
  [
    "smart-home",
    "plugwise-duo",
    "PlugWise Duo",
    "Two-pack smart plugs with energy monitoring.",
    "349000",
    118,
  ],
  [
    "smart-home",
    "homehub-voice",
    "HomeHub Voice",
    "Smart speaker hub for lights, plugs, routines, and music.",
    "999000",
    52,
  ],
] as const;

const users = [
  ["admin@onlinestore.test", "Admin Store", Role.ADMIN],
  ["maya.putri@example.test", "Maya Putri", Role.CUSTOMER],
  ["bima.pratama@example.test", "Bima Pratama", Role.CUSTOMER],
  ["siti.rahayu@example.test", "Siti Rahayu", Role.CUSTOMER],
  ["raka.wijaya@example.test", "Raka Wijaya", Role.CUSTOMER],
  ["nabila.hakim@example.test", "Nabila Hakim", Role.CUSTOMER],
  ["dimas.saputra@example.test", "Dimas Saputra", Role.CUSTOMER],
  ["lina.maharani@example.test", "Lina Maharani", Role.CUSTOMER],
  ["arif.nugroho@example.test", "Arif Nugroho", Role.CUSTOMER],
  ["intan.lestari@example.test", "Intan Lestari", Role.CUSTOMER],
  ["yusuf.fadli@example.test", "Yusuf Fadli", Role.CUSTOMER],
] as const;

const cartPlans = [
  [
    "maya.putri@example.test",
    ["aurora-x1-128gb", "sonicbuds-air", "lumos-smart-bulb-4pack"],
  ],
  [
    "bima.pratama@example.test",
    ["workmate-14-i5", "dockmaster-usbc", "focusdesk-lamp"],
  ],
  ["siti.rahayu@example.test", ["fittrack-band-2", "roomwave-mini"]],
  [
    "raka.wijaya@example.test",
    ["neonkey-tkl", "aimpro-wireless", "pulsepad-xl"],
  ],
] as const;

const orderPlans = [
  [
    "nabila.hakim@example.test",
    OrderStatus.PAID,
    [
      ["aurora-x1-pro-256gb", 1],
      ["studio-max-headphones", 1],
    ],
  ],
  [
    "dimas.saputra@example.test",
    OrderStatus.FULFILLED,
    [
      ["studentbook-13", 1],
      ["sonicbuds-sport", 1],
      ["dockmaster-usbc", 1],
    ],
  ],
  [
    "lina.maharani@example.test",
    OrderStatus.PENDING,
    [
      ["snappro-mirrorless-kit", 1],
      ["vloglight-rgb", 2],
    ],
  ],
  [
    "arif.nugroho@example.test",
    OrderStatus.CANCELLED,
    [
      ["consolebox-s", 1],
      ["duopad-controller", 2],
    ],
  ],
  [
    "intan.lestari@example.test",
    OrderStatus.PAID,
    [
      ["ergochair-flex", 1],
      ["standdesk-120", 1],
      ["viewplus-27-4k", 1],
    ],
  ],
  [
    "yusuf.fadli@example.test",
    OrderStatus.FULFILLED,
    [
      ["guardcam-outdoor", 2],
      ["plugwise-duo", 3],
      ["homehub-voice", 1],
    ],
  ],
] as const;

const seededCartId = (index: number) =>
  `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;
const seededOrderId = (index: number) =>
  `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`;

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required to run seed");
  }

  const passwordHash = await hash("Password123!");

  for (const [slug, name, description] of categories) {
    await prisma.category.upsert({
      where: { slug },
      update: { name, description, isActive: true },
      create: { slug, name, description, isActive: true },
    });
  }

  const categoryBySlug = new Map(
    (await prisma.category.findMany()).map((category) => [
      category.slug,
      category,
    ])
  );

  for (const [
    categorySlug,
    slug,
    name,
    description,
    price,
    stock,
  ] of products) {
    const category = categoryBySlug.get(categorySlug);
    if (!category) throw new Error(`Missing category ${categorySlug}`);

    await prisma.product.upsert({
      where: { slug },
      update: {
        categoryId: category.id,
        name,
        description,
        price,
        stock,
        isActive: true,
      },
      create: {
        categoryId: category.id,
        slug,
        name,
        description,
        price,
        stock,
        isActive: true,
      },
    });
  }

  for (const [email, name, role] of users) {
    await prisma.user.upsert({
      where: { email },
      update: { name, role },
      create: { email, name, role, passwordHash },
    });
  }

  const userByEmail = new Map(
    (await prisma.user.findMany()).map((user) => [user.email, user])
  );
  const productBySlug = new Map(
    (await prisma.product.findMany()).map((product) => [product.slug, product])
  );

  for (const [index, [email, productSlugs]] of cartPlans.entries()) {
    const user = userByEmail.get(email);
    if (!user) throw new Error(`Missing user ${email}`);

    const cart = await prisma.cart.upsert({
      where: { id: seededCartId(index) },
      update: { userId: user.id, status: CartStatus.ACTIVE },
      create: {
        id: seededCartId(index),
        userId: user.id,
        status: CartStatus.ACTIVE,
      },
    });

    for (const [itemIndex, slug] of productSlugs.entries()) {
      const product = productBySlug.get(slug);
      if (!product) throw new Error(`Missing product ${slug}`);

      await prisma.cartItem.upsert({
        where: { cartId_productId: { cartId: cart.id, productId: product.id } },
        update: { quantity: itemIndex + 1, unitPriceSnapshot: product.price },
        create: {
          cartId: cart.id,
          productId: product.id,
          quantity: itemIndex + 1,
          unitPriceSnapshot: product.price,
        },
      });
    }
  }

  for (const [index, [email, status, items]] of orderPlans.entries()) {
    const user = userByEmail.get(email);
    if (!user) throw new Error(`Missing user ${email}`);

    const totalAmount = items.reduce((total, [slug, quantity]) => {
      const product = productBySlug.get(slug);
      if (!product) throw new Error(`Missing product ${slug}`);
      return total + Number(product.price) * quantity;
    }, 0);

    const order = await prisma.order.upsert({
      where: { id: seededOrderId(index) },
      update: { userId: user.id, status, totalAmount: totalAmount.toFixed(2) },
      create: {
        id: seededOrderId(index),
        userId: user.id,
        status,
        totalAmount: totalAmount.toFixed(2),
      },
    });

    await prisma.orderItem.deleteMany({ where: { orderId: order.id } });

    for (const [slug, quantity] of items) {
      const product = productBySlug.get(slug);
      if (!product) throw new Error(`Missing product ${slug}`);
      const unitPrice = Number(product.price);

      await prisma.orderItem.create({
        data: {
          orderId: order.id,
          productId: product.id,
          quantity,
          unitPriceSnapshot: unitPrice.toFixed(2),
          subtotal: (unitPrice * quantity).toFixed(2),
        },
      });
    }
  }

  console.log(
    `Seed complete: ${categories.length} categories, ${products.length} products, ${users.length} users, ${cartPlans.length} active carts, ${orderPlans.length} orders.`
  );
  console.log("Demo password for all seeded users: Password123!");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
