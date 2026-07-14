import { prisma } from '../src/config/prisma';
import bcrypt from 'bcryptjs';

async function main() {
  console.log('🌱 Start seeding database...');

  // 1. Clean existing records (in reverse order of dependencies)
  await prisma.message.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.order.deleteMany();
  await prisma.shift.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.driver.deleteMany();
  await prisma.team.deleteMany();

  console.log('🧹 Cleaned existing database records.');

  // 2. Create Teams
  const teamNorth = await prisma.team.create({
    data: { name: 'North Squad' },
  });
  const teamEast = await prisma.team.create({
    data: { name: 'East Riders' },
  });

  console.log('👥 Created teams.');

  // 3. Create Driver Tyler Teeler
  const passwordHash = await bcrypt.hash('Password123', 10);
  const driver = await prisma.driver.create({
    data: {
      email: 'tyler@deliverybuddy.com',
      passwordHash,
      fullName: 'Tyler Teeler',
      workId: '4RT5697',
      teamId: teamNorth.id,
      transportationType: 'BICYCLE',
      vehicleNumber: 'RE 345 6',
      level: 3,
      ratePercent: 25.0,
      status: 'OFFLINE',
    },
  });

  console.log(`👨 Created driver: ${driver.fullName} (${driver.email})`);

  // 4. Seed Wallet Transactions to get EXACT balance of $487.67 and tips of $276.78
  // Transaction 1: Initial Earning
  await prisma.transaction.create({
    data: {
      driverId: driver.id,
      type: 'EARNING',
      amount: 210.89,
      balanceAfter: 210.89,
      createdAt: new Date(Date.now() - 3 * 24 * 3600 * 1000), // 3 days ago
    },
  });

  // Transaction 2: Seed Tips to match UI exactly
  await prisma.transaction.create({
    data: {
      driverId: driver.id,
      type: 'TIP',
      amount: 276.78,
      balanceAfter: 487.67, // 210.89 + 276.78 = 487.67
      createdAt: new Date(Date.now() - 2 * 24 * 3600 * 1000), // 2 days ago
    },
  });

  console.log('💳 Seeded wallet transactions.');

  // 5. Seed some past completed shifts
  await prisma.shift.create({
    data: {
      driverId: driver.id,
      startedAt: new Date(Date.now() - 24 * 3600 * 1000 - 8 * 3600 * 1000), // 1 day ago
      endedAt: new Date(Date.now() - 24 * 3600 * 1000),
      status: 'ENDED',
      earningsTotal: 456.89,
      tipsTotal: 123.65,
      deliveriesCompleted: 8,
    },
  });

  console.log('📅 Seeded past shift history.');

  // 6. Create Orders
  // Order 1: #403-540 (Pending, matching mockup details)
  const order1 = await prisma.order.create({
    data: {
      orderNumber: '#403-540',
      status: 'PENDING',
      pickupName: 'Lazzy Pizza',
      pickupAddress: '(212) 288-1506, 3000 Friendship Lane',
      customerName: 'Mrs. Jonson',
      customerPhone: '(212) 288-1506',
      destinationAddress: '1142 Madison Ave, app. 34',
      distanceLeftKm: 1.4,
      paymentMethod: 'CREDIT_CARD',
      itemsTotal: 64.0,
      driverEarning: 42.0,
      driverTip: 10.0,
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order1.id,
        name: 'Ham and Cheese Pizza 11 inch',
        description: 'Properties: cheese rims, -5% disc',
        quantity: 2,
        unitPrice: 12.0,
      },
      {
        orderId: order1.id,
        name: 'Pepperoni Pepper',
        description: 'Standard',
        quantity: 1,
        unitPrice: 10.0,
      },
      {
        orderId: order1.id,
        name: 'Tuesday Combo',
        description: 'Properties: Hawaiian Hamburger, Double Cheeseburger, coke 1L',
        quantity: 1,
        unitPrice: 30.0,
      },
    ],
  });

  // Order 2: Another available order
  const order2 = await prisma.order.create({
    data: {
      orderNumber: '#403-541',
      status: 'PENDING',
      pickupName: 'Burger Palace',
      pickupAddress: '(212) 555-0199, 456 Broadway',
      customerName: 'Sarah Jonson',
      customerPhone: '865-304-9076',
      destinationAddress: '1142 Madison Ave, 2nd floor, app. 34',
      distanceLeftKm: 3.2,
      paymentMethod: 'CREDIT_CARD',
      itemsTotal: 24.0,
      driverEarning: 12.50,
      driverTip: 3.00,
    },
  });

  await prisma.orderItem.createMany({
    data: [
      {
        orderId: order2.id,
        name: 'Bacon Cheeseburger',
        quantity: 1,
        unitPrice: 15.0,
      },
      {
        orderId: order2.id,
        name: 'French Fries Large',
        quantity: 2,
        unitPrice: 4.5,
      },
    ],
  });

  console.log('🍕 Seeded active orders and order items.');

  // 7. Seed Notifications
  await prisma.notification.create({
    data: {
      driverId: driver.id,
      title: 'Level Raised! 🎉',
      body: 'Your level has been raised to Level 3 due to high delivery activity.',
    },
  });

  console.log('🔔 Seeded notifications.');
  console.log('🌱 Database seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('Error seeding database:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
