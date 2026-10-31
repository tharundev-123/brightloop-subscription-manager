import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Brightloop database seeding...');

  // 1. Clean existing records in correct relation order
  console.log('🧹 Cleaning old data...');
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionLine.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.quotationTemplateLine.deleteMany();
  await prisma.quotationTemplate.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.taxRule.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.user.deleteMany();

  // 2. Passwords
  const passwordHash = await bcrypt.hash('Password123!', 10);

  // 3. Create Admin & Staff
  console.log('👤 Creating Admin and Staff users...');
  const admin = await prisma.user.create({
    data: {
      email: 'admin@brightloop.io',
      name: 'Brightloop Superadmin',
      passwordHash,
      role: 'ADMIN',
    },
  });

  const staff1 = await prisma.user.create({
    data: {
      email: 'staff1@brightloop.io',
      name: 'Sarah Jenkins (Billing Staff)',
      passwordHash,
      role: 'STAFF',
    },
  });

  const staff2 = await prisma.user.create({
    data: {
      email: 'staff2@brightloop.io',
      name: 'Marcus Vance (Accounts Staff)',
      passwordHash,
      role: 'STAFF',
    },
  });

  // 4. Create Customers (50 diverse business accounts)
  console.log('👥 Creating 50 Customer accounts...');
  const companyNames = [
    'Acme Corp', 'TechNova Solutions', 'CloudScale Systems', 'Apex Logistics',
    'Quantum Data Labs', 'BlueSky Media', 'FinEdge Global', 'Starlight BioTech',
    'Nexus Robotics', 'Vanguard Retail', 'Horizon Energy', 'OmniHealth Tech',
    'Pulse Dynamics', 'CyberShield Security', 'Prism Design Studio', 'Echo Interactive',
    'Velocity Logistics', 'Zenith Financial', 'Aurora Cloud', 'InfiniCorp Group',
    'Solstice Software', 'Aegis Defense Labs', 'Hyperion Analytics', 'Summit Outdoor Gear',
    'CoreStack Hosting', 'Matrix Global', 'Krypton Networks', 'Elevate Learning',
    'Titan Manufacturing', 'Beacon Media Works', 'Sterling Consulting', 'Veritas Legal Tech',
    'Paramount Trading', 'Synergy Labs', 'Alpine Resorts Ltd', 'Integra Healthcare',
    'Pinnacle Gaming', 'Crestline Logistics', 'Atlas Marine', 'Vortex VR',
    'Aura IoT Solutions', 'Radiant Energy', 'Oasis Beverages', 'Strata Architecture',
    'Cobalt Robotics', 'Lumina Sensors', 'Dynamo Automations', 'IronClad Storage',
    'Zephyr Air Mobility', 'Orbit Telecom'
  ];

  const customerUsers = [];
  for (let i = 0; i < companyNames.length; i++) {
    const slug = companyNames[i].toLowerCase().replace(/[^a-z0-9]/g, '');
    const user = await prisma.user.create({
      data: {
        email: `contact@${slug}.com`,
        name: companyNames[i],
        passwordHash,
        role: 'CUSTOMER',
      },
    });
    customerUsers.push(user);
  }

  // 5. Create Products & Variants
  console.log('📦 Creating Products and Variants...');
  const productErp = await prisma.product.create({
    data: {
      name: 'BrightERP Core Suite',
      type: 'SOFTWARE',
      salesPrice: 1200.0,
      costPrice: 350.0,
      notes: 'Full ERP enterprise software with finance, inventory and operations modules.',
      variants: {
        create: [
          { attributeName: 'Brand Connector', attributeValue: 'Odoo ERP Sync', extraPrice: 560.0 },
          { attributeName: 'Brand Connector', attributeValue: 'SAP Bridge', extraPrice: 850.0 },
          { attributeName: 'Deployment', attributeValue: 'Multi-Region High Availability', extraPrice: 300.0 },
        ],
      },
    },
    include: { variants: true },
  });

  const productCrm = await prisma.product.create({
    data: {
      name: 'BrightCRM Pro',
      type: 'SOFTWARE',
      salesPrice: 450.0,
      costPrice: 100.0,
      notes: 'Comprehensive CRM with lead tracking, sales pipelines, and email marketing.',
      variants: {
        create: [
          { attributeName: 'Tier', attributeValue: 'Enterprise (Unlimited seats)', extraPrice: 250.0 },
          { attributeName: 'Tier', attributeValue: 'Standard (Up to 10 seats)', extraPrice: 0.0 },
        ],
      },
    },
    include: { variants: true },
  });

  const productAi = await prisma.product.create({
    data: {
      name: 'AI Workflow Copilot',
      type: 'SOFTWARE',
      salesPrice: 650.0,
      costPrice: 150.0,
      notes: 'Automated intelligence copilot for automated invoice reconciliation and forecasting.',
    },
    include: { variants: true },
  });

  const productStorage = await prisma.product.create({
    data: {
      name: 'Cloud Storage 2TB Add-on',
      type: 'ADDON',
      salesPrice: 80.0,
      costPrice: 20.0,
      notes: 'Secure, encrypted cloud storage bucket add-on.',
      variants: {
        create: [
          { attributeName: 'Redundancy', attributeValue: 'Geo-Redundant', extraPrice: 40.0 },
          { attributeName: 'Redundancy', attributeValue: 'Standard', extraPrice: 0.0 },
        ],
      },
    },
    include: { variants: true },
  });

  const productSupport = await prisma.product.create({
    data: {
      name: '24/7 Dedicated Support SLA',
      type: 'SERVICE',
      salesPrice: 300.0,
      costPrice: 90.0,
      notes: 'Priority 15-minute response SLA with a designated technical account manager.',
    },
    include: { variants: true },
  });

  const productApi = await prisma.product.create({
    data: {
      name: 'High-Volume API Access',
      type: 'ADDON',
      salesPrice: 150.0,
      costPrice: 30.0,
      notes: 'Up to 1,000,000 monthly API calls and webhook dispatch.',
    },
    include: { variants: true },
  });

  const allProducts = [productErp, productCrm, productAi, productStorage, productSupport, productApi];

  // 6. Create Plans
  console.log('📋 Creating Plans...');
  const planMonthly = await prisma.plan.create({
    data: {
      name: 'Monthly Business Plan',
      price: 100.0,
      billingPeriod: 'MONTHLY',
      minQuantity: 1,
      autoCloseAtEnd: false,
      allowEarlyClose: true,
      allowPause: true,
      allowRenewal: true,
    },
  });

  const planYearly = await prisma.plan.create({
    data: {
      name: 'Yearly Enterprise Plan (20% Off)',
      price: 1000.0,
      billingPeriod: 'YEARLY',
      minQuantity: 1,
      autoCloseAtEnd: false,
      allowEarlyClose: true,
      allowPause: true,
      allowRenewal: true,
    },
  });

  const planWeekly = await prisma.plan.create({
    data: {
      name: 'Weekly Growth Plan',
      price: 35.0,
      billingPeriod: 'WEEKLY',
      minQuantity: 1,
      autoCloseAtEnd: false,
      allowEarlyClose: true,
      allowPause: true,
      allowRenewal: true,
    },
  });

  const planDaily = await prisma.plan.create({
    data: {
      name: 'Daily Trial Sandbox',
      price: 5.0,
      billingPeriod: 'DAILY',
      minQuantity: 1,
      autoCloseAtEnd: true,
      allowEarlyClose: false,
      allowPause: false,
      allowRenewal: false,
    },
  });

  const allPlans = [planMonthly, planYearly, planWeekly, planDaily];

  // 7. Create Tax Rules
  console.log('🏛️ Creating Tax Rules...');
  const taxGst18 = await prisma.taxRule.create({
    data: { name: 'GST 18%', percentage: 18.0, appliesTo: 'ALL', isActive: true },
  });
  const taxVat5 = await prisma.taxRule.create({
    data: { name: 'VAT 5%', percentage: 5.0, appliesTo: 'ALL', isActive: true },
  });
  const taxZero = await prisma.taxRule.create({
    data: { name: 'Zero Tax 0%', percentage: 0.0, appliesTo: 'ALL', isActive: true },
  });

  // 8. Create Discounts
  console.log('🎟️ Creating Discounts...');
  await prisma.discount.create({
    data: {
      code: 'WELCOME10',
      type: 'PERCENTAGE',
      value: 10.0,
      minPurchaseAmount: 100.0,
      minQuantity: 1,
      usageLimit: 500,
      usageCount: 42,
      appliesTo: 'SUBSCRIPTION',
      isActive: true,
    },
  });

  await prisma.discount.create({
    data: {
      code: 'ANNUAL20',
      type: 'PERCENTAGE',
      value: 20.0,
      minPurchaseAmount: 500.0,
      minQuantity: 1,
      usageLimit: 200,
      usageCount: 19,
      appliesTo: 'SUBSCRIPTION',
      isActive: true,
    },
  });

  await prisma.discount.create({
    data: {
      code: 'FLAT100',
      type: 'FIXED',
      value: 100.0,
      minPurchaseAmount: 600.0,
      minQuantity: 1,
      usageLimit: 100,
      usageCount: 15,
      appliesTo: 'SUBSCRIPTION',
      isActive: true,
    },
  });

  // 9. Quotation Templates
  console.log('📄 Creating Quotation Templates...');
  const templateEnterprise = await prisma.quotationTemplate.create({
    data: {
      name: 'Enterprise Full Stack Suite',
      planId: planMonthly.id,
      validDays: 30,
      notes: 'Standard bundle containing BrightERP, Dedicated Support, and Geo-Redundant Cloud Storage.',
      lines: {
        create: [
          { productId: productErp.id, quantity: 1, unitPrice: 1200.0 },
          { productId: productSupport.id, quantity: 1, unitPrice: 300.0 },
          { productId: productStorage.id, quantity: 2, unitPrice: 120.0 },
        ],
      },
    },
  });

  const templateDev = await prisma.quotationTemplate.create({
    data: {
      name: 'Developer Automation Pack',
      planId: planWeekly.id,
      validDays: 14,
      notes: 'Tailored for startups and engineering teams needing AI and high-volume APIs.',
      lines: {
        create: [
          { productId: productAi.id, quantity: 1, unitPrice: 650.0 },
          { productId: productApi.id, quantity: 1, unitPrice: 150.0 },
        ],
      },
    },
  });

  // 10. Generating 1,050 realistic subscriptions in batches
  console.log('⚡ Generating 1,050+ Subscriptions and related Invoices/Payments...');
  const totalSubscriptions = 1050;
  const statuses = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'ACTIVE', 'ACTIVE', 'CLOSED'];
  const paymentTermsList = ['IMMEDIATE', 'NET_15', 'NET_30'];

  // We'll prepare records for high-speed creation
  const now = new Date();

  // Create subscriptions in chunks of 100
  const chunkSize = 100;
  let subCount = 0;

  for (let c = 0; c < totalSubscriptions; c += chunkSize) {
    const batchSize = Math.min(chunkSize, totalSubscriptions - c);

    for (let i = 0; i < batchSize; i++) {
      subCount++;
      const subNum = `SUB-${String(subCount).padStart(5, '0')}`;
      const customer = customerUsers[subCount % customerUsers.length];
      const plan = allPlans[subCount % allPlans.length];
      const status = statuses[subCount % statuses.length];
      const paymentTerm = paymentTermsList[subCount % paymentTermsList.length];

      // Realistic date ranges:
      // Start dates spread between 6 months ago and today
      const daysAgo = (subCount % 180);
      const startDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
      
      // Expiry 365 days after start
      const expiryDate = new Date(startDate.getTime() + 365 * 24 * 60 * 60 * 1000);

      // Next billing date:
      // For some active ones, set next billing date to yesterday/today (so billing run picks them up!)
      let nextBillingDate: Date | null = null;
      if (status === 'ACTIVE') {
        if (subCount % 5 === 0) {
          // Due for billing right now!
          nextBillingDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        } else {
          // Future billing
          nextBillingDate = new Date(now.getTime() + ((subCount % 30) + 1) * 24 * 60 * 60 * 1000);
        }
      }

      // Pick 1 to 3 products
      const p1 = allProducts[subCount % allProducts.length];
      const p2 = allProducts[(subCount + 2) % allProducts.length];
      
      // Check variants
      const v1 = p1.variants && p1.variants.length > 0 ? p1.variants[0] : null;
      const extraPrice = v1 ? v1.extraPrice : 0;
      const unitPrice1 = p1.salesPrice + extraPrice;
      const unitPrice2 = p2.salesPrice;

      const lineTotal1 = unitPrice1 * 1;
      const lineTotal2 = unitPrice2 * 1;
      const totalAmount = plan.price + lineTotal1 + lineTotal2;

      const sub = await prisma.subscription.create({
        data: {
          subscriptionNumber: subNum,
          customerId: customer.id,
          planId: plan.id,
          templateId: subCount % 2 === 0 ? templateEnterprise.id : templateDev.id,
          status,
          startDate,
          expiryDate,
          nextBillingDate,
          paymentTerms: paymentTerm,
          totalAmount,
          isPaused: status === 'ACTIVE' && subCount % 20 === 0,
          notes: `Automated enterprise subscription provisioned for ${customer.name}.`,
          lines: {
            create: [
              {
                productId: p1.id,
                variantId: v1?.id || null,
                quantity: 1,
                unitPrice: unitPrice1,
                taxAmount: unitPrice1 * 0.18,
                totalAmount: unitPrice1 * 1.18,
              },
              {
                productId: p2.id,
                quantity: 1,
                unitPrice: unitPrice2,
                taxAmount: unitPrice2 * 0.18,
                totalAmount: unitPrice2 * 1.18,
              },
            ],
          },
        },
      });

      // If subscription is ACTIVE or CLOSED, create historical invoices and payments
      if (status === 'ACTIVE' || status === 'CLOSED') {
        const invNum = `INV-${String(subCount).padStart(5, '0')}`;
        const billingPeriod = '2026-10'; // Fixed current period for idempotent tests
        const issueDate = new Date(startDate.getTime() + 1 * 24 * 60 * 60 * 1000);
        const dueDate = new Date(issueDate.getTime() + 15 * 24 * 60 * 60 * 1000);

        const subtotal = totalAmount;
        const taxTotal = subtotal * 0.18;
        const invoiceTotal = subtotal + taxTotal;

        // Invoice status distribution
        let invStatus = 'PAID';
        let paidAmount = invoiceTotal;
        let outstandingAmount = 0.0;

        if (subCount % 6 === 0) {
          // Overdue invoice (dueDate was 10 days ago, $0 paid)
          invStatus = 'CONFIRMED';
          paidAmount = 0.0;
          outstandingAmount = invoiceTotal;
        } else if (subCount % 7 === 0) {
          // Partial payment
          invStatus = 'CONFIRMED';
          paidAmount = Math.round(invoiceTotal / 2);
          outstandingAmount = invoiceTotal - paidAmount;
        } else if (subCount % 13 === 0) {
          // Fresh draft invoice
          invStatus = 'DRAFT';
          paidAmount = 0.0;
          outstandingAmount = invoiceTotal;
        }

        const invoice = await prisma.invoice.create({
          data: {
            invoiceNumber: invNum,
            subscriptionId: sub.id,
            customerId: customer.id,
            billingPeriod,
            status: invStatus,
            issueDate,
            dueDate: subCount % 6 === 0 ? new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000) : dueDate,
            subtotal,
            taxTotal,
            discountTotal: 0.0,
            totalAmount: invoiceTotal,
            paidAmount,
            outstandingAmount,
            notes: `Invoice for ${plan.name} (${billingPeriod})`,
            lines: {
              create: [
                {
                  productId: p1.id,
                  description: `${p1.name} ${v1 ? `(${v1.attributeValue})` : ''}`,
                  quantity: 1,
                  unitPrice: unitPrice1,
                  taxRate: 18.0,
                  taxAmount: unitPrice1 * 0.18,
                  discountAmount: 0.0,
                  lineTotal: unitPrice1 * 1.18,
                },
                {
                  productId: p2.id,
                  description: p2.name,
                  quantity: 1,
                  unitPrice: unitPrice2,
                  taxRate: 18.0,
                  taxAmount: unitPrice2 * 0.18,
                  discountAmount: 0.0,
                  lineTotal: unitPrice2 * 1.18,
                },
              ],
            },
          },
        });

        // If paid or partial paid, create Payment records
        if (paidAmount > 0) {
          const methods = ['CARD', 'UPI', 'BANK_TRANSFER', 'CASH'];
          const method = methods[subCount % methods.length];
          await prisma.payment.create({
            data: {
              paymentNumber: `PAY-${String(subCount).padStart(5, '0')}`,
              invoiceId: invoice.id,
              amount: paidAmount,
              paymentMethod: method,
              paymentDate: new Date(issueDate.getTime() + 2 * 24 * 60 * 60 * 1000),
              notes: `Payment received via ${method} for ${invoice.invoiceNumber}`,
              recordedById: staff1.id,
            },
          });
        }
      }
    }
    console.log(`  ...created ${subCount} subscriptions so far`);
  }

  // Summary counts
  const userCount = await prisma.user.count();
  const prodCount = await prisma.product.count();
  const planCount = await prisma.plan.count();
  const finalSubCount = await prisma.subscription.count();
  const invCount = await prisma.invoice.count();
  const payCount = await prisma.payment.count();

  console.log('\n✅ Database seeding complete!');
  console.log('--------------------------------------------------');
  console.log(`👤 Users:         ${userCount} (1 Admin, 2 Staff, ${userCount - 3} Customers)`);
  console.log(`📦 Products:      ${prodCount}`);
  console.log(`📋 Plans:         ${planCount}`);
  console.log(`⚡ Subscriptions: ${finalSubCount} (>= 1,000 performance test target)`);
  console.log(`🧾 Invoices:      ${invCount}`);
  console.log(`💳 Payments:      ${payCount}`);
  console.log('--------------------------------------------------');
  console.log('Admin Demo Login:    admin@brightloop.io / Password123!');
  console.log('Staff Demo Login:    staff1@brightloop.io / Password123!');
  console.log('Customer Demo Login: contact@acmecorp.com / Password123!');
  console.log('--------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

