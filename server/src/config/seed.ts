import { User } from "../models/User";
import { Customer } from "../models/Customer";
import { Deal } from "../models/Deal";
import { Company } from "../models/Company";
import { Task } from "../models/Task";
import { Event } from "../models/Event";
import { ActivityLog } from "../models/ActivityLog";
import { Notification } from "../models/Notification";
import { KpiSetting } from "../models/KpiSetting";

export const seedDatabase = async (): Promise<void> => {
  try {
    console.log("[SEED] Initiating CRM Demo Data Seeding process...");

    const superAdminEmail =
      process.env.SUPER_ADMIN_EMAIL || "superadmin@aicrm.com";
    const superAdminPassword = process.env.SUPER_ADMIN_PASSWORD || "Super12!";
    const adminEmail = process.env.ADMIN_EMAIL || "admin@aicrm.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "Admin12!";

    // 1. Ensure SuperAdmin user exists
    let superAdmin = await User.findOne({
      email: superAdminEmail.toLowerCase(),
    });
    if (!superAdmin) {
      superAdmin = await User.create({
        name: "Super Admin",
        email: superAdminEmail.toLowerCase(),
        password: superAdminPassword,
        role: "SUPER_ADMIN",
        accountStatus: "ACTIVE",
        isVerified: true,
      });
      console.log(`[SEED] Created default SuperAdmin user: ${superAdminEmail}`);
    } else if (superAdmin.accountStatus !== "ACTIVE") {
      superAdmin.accountStatus = "ACTIVE";
      await superAdmin.save();
    }

    // 2. Ensure default Company exists
    let demoCompany = await Company.findOne({
      companyName: "Acme Enterprise Solutions",
    });
    if (!demoCompany) {
      demoCompany = await Company.create({
        companyName: "Acme Enterprise Solutions",
        ownerId: superAdmin._id,
        businessEmail: adminEmail.toLowerCase(),
        status: "ACTIVE",
        joinCode: "ACME2026",
        joinCodeActive: true,
        joinCodeGeneratedAt: new Date(),
        subscription: {
          plan: "premium",
          status: "active",
          billingCycle: "monthly",
          amountPaid: 299,
          aiFeaturesEnabled: true,
          currentAiUsage: 0,
        },
      });
      console.log(
        `[SEED] Created default demo company: Acme Enterprise Solutions`,
      );
    }

    // 3. Ensure System Admin user exists
    let adminUser = await User.findOne({ email: adminEmail.toLowerCase() });
    if (!adminUser) {
      adminUser = await User.create({
        name: "System Admin",
        email: adminEmail.toLowerCase(),
        password: adminPassword,
        role: "COMPANY_OWNER",
        companyId: demoCompany._id,
        accountStatus: "ACTIVE",
        isVerified: true,
        companies: [
          { companyId: demoCompany._id as any, role: "COMPANY_OWNER" },
        ],
      });
      console.log(`[SEED] Created default Admin user: ${adminEmail}`);
    }

    // =========================================================================
    // TARGET DEMO ACCOUNT: ktirumala811@gmail.com & NovaSphere Technologies
    // =========================================================================

    const targetEmail = "ktirumala811@gmail.com";
    const targetPassword = "Tiru@28";

    let abhiUser = await User.findOne({ email: targetEmail.toLowerCase() });
    if (!abhiUser) {
      abhiUser = await User.create({
        name: "Tirumala",
        email: targetEmail.toLowerCase(),
        password: targetPassword,
        role: "COMPANY_OWNER",
        accountStatus: "ACTIVE",
        isVerified: true,
        phone: "+91 12345678910",
        company: "NovaSphere Technologies",
        jobTitle: "Chief Executive Officer",
      });
      console.log(`[SEED] Created target demo user: ${targetEmail}`);
    } else {
      let updated = false;
      const isMatch = await abhiUser.comparePassword(targetPassword);
      if (!isMatch) {
        abhiUser.password = targetPassword;
        updated = true;
      }
      if (abhiUser.accountStatus !== "ACTIVE") {
        abhiUser.accountStatus = "ACTIVE";
        updated = true;
      }
      if (!abhiUser.isVerified) {
        abhiUser.isVerified = true;
        updated = true;
      }
      if (abhiUser.role !== "COMPANY_OWNER") {
        abhiUser.role = "COMPANY_OWNER";
        updated = true;
      }
      if (abhiUser.name !== "Tirumala") {
        abhiUser.name = "Tirumala";
        updated = true;
      }
      if (updated) {
        await abhiUser.save();
        console.log(
          `[SEED] Updated target demo user ${targetEmail} status & credentials.`,
        );
      }
    }

    // Ensure NovaSphere Technologies Company exists
    let novaSphere = await Company.findOne({ ownerId: abhiUser._id });
    if (!novaSphere) {
      novaSphere = await Company.findOne({
        businessEmail: targetEmail.toLowerCase(),
      });
    }
    if (!novaSphere) {
      novaSphere = await Company.findOne({
        companyName: "NovaSphere Technologies",
      });
    }

    if (!novaSphere) {
      novaSphere = await Company.create({
        companyName: "NovaSphere Technologies",
        ownerId: abhiUser._id,
        businessEmail: targetEmail.toLowerCase(),
        phone: "+91 12345678910",
        industry: "Software & Technology",
        companySize: "51-200",
        website: "https://example.com",
        country: "India",
        state: "Telangana",
        city: "Hyderabad",
        status: "ACTIVE",
        joinCode: "NOVASPHERE2026",
        joinCodeActive: true,
        joinCodeGeneratedAt: new Date(),
        subscription: {
          plan: "premium",
          status: "active",
          billingCycle: "yearly",
          amountPaid: 499,
          startDate: new Date("2026-01-01"),
          endDate: new Date("2027-01-01"),
          renewalDate: new Date("2027-01-01"),
          autoRenew: true,
          aiFeaturesEnabled: true,
          currentAiUsage: 0,
          usageLimits: {
            maxSalesManagers: 10,
            maxSalesReps: 50,
            maxUsers: 100,
            maxLeads: 10000,
            maxCustomers: 5000,
            maxDeals: 5000,
            aiQueryLimit: 5000,
          },
        },
      });
      console.log(
        `[SEED] Created company NovaSphere Technologies for ${targetEmail}`,
      );
    } else {
      novaSphere.status = "ACTIVE";
      novaSphere.companyName = "NovaSphere Technologies";
      novaSphere.subscription.plan = "premium";
      novaSphere.subscription.status = "active";
      novaSphere.subscription.aiFeaturesEnabled = true;
      await novaSphere.save();
    }

    // Associate user with NovaSphere companyId
    if (!abhiUser.companyId || !abhiUser.companyId.equals(novaSphere._id)) {
      abhiUser.companyId = novaSphere._id as any;
      abhiUser.companies = [
        { companyId: novaSphere._id as any, role: "COMPANY_OWNER" as any },
      ];
      abhiUser.subscription = {
        plan: "premium",
        status: "active",
        startDate: new Date("2026-01-01"),
        endDate: new Date("2027-01-01"),
      };
      await abhiUser.save();
    }

    // 4. Seed Sales Representatives (Only 2 other members = 3 total)
    const repsDef = [
      {
        name: "Rahul Sharma",
        email: "rahul@novasphere.com",
        role: "SALES_MANAGER",
        phone: "+91 90000 00001",
      },
      {
        name: "Priya Verma",
        email: "priya@novasphere.com",
        role: "SALES_REPRESENTATIVE",
        phone: "+91 90000 00002",
      },
    ];

    const salesReps: Record<string, any> = {
      Tirumala: abhiUser,
    };

    for (const rep of repsDef) {
      let rUser = await User.findOne({ email: rep.email.toLowerCase() });
      if (!rUser) {
        rUser = await User.create({
          name: rep.name,
          email: rep.email.toLowerCase(),
          password: "Password123!",
          role: rep.role as any,
          companyId: novaSphere._id,
          accountStatus: "ACTIVE",
          isVerified: true,
          phone: rep.phone,
          company: "NovaSphere Technologies",
          companies: [
            { companyId: novaSphere._id as any, role: rep.role as any },
          ],
        });
      } else {
        rUser.name = rep.name;
        rUser.companyId = novaSphere._id as any;
        rUser.accountStatus = "ACTIVE";
        rUser.isVerified = true;
        await rUser.save();
      }
      salesReps[rep.name] = rUser;
    }

    // Clean existing demo collections for NovaSphere companyId to guarantee idempotency
    await Customer.deleteMany({ companyId: novaSphere._id });
    await Deal.deleteMany({ companyId: novaSphere._id });
    await Task.deleteMany({ companyId: novaSphere._id });
    await Event.deleteMany({ companyId: novaSphere._id });
    await ActivityLog.deleteMany({ companyId: novaSphere._id });
    await Notification.deleteMany({ companyId: novaSphere._id });

    // 5. Seed 3 Fictional Customers
    const customersData = [
      {
        name: "Aarav Mehta",
        company: "NovaTech Solutions",
        email: "aarav.mehta@example.com",
        phone: "+91 90000 10001",
        status: "Proposal" as const,
        value: 25000,
        assignedTo: salesReps["Rahul Sharma"]._id,
        tags: ["Technology", "Enterprise", "Inbound"],
        notes: [
          {
            content:
              "Initial discovery call completed. Client requested custom AI email generator demo.",
            createdBy: salesReps["Rahul Sharma"]._id,
            createdAt: new Date(Date.now() - 7 * 86400000),
          },
        ],
      },
      {
        name: "Riya Shah",
        company: "BrightCore Systems",
        email: "riya.shah@example.com",
        phone: "+91 90000 10002",
        status: "Contacted" as const,
        value: 18500,
        assignedTo: salesReps["Priya Verma"]._id,
        tags: ["Software", "AI Automation"],
        notes: [
          {
            content:
              "Evaluated AI Copilot auto-reply feature and meeting summarizer.",
            createdBy: salesReps["Priya Verma"]._id,
            createdAt: new Date(Date.now() - 5 * 86400000),
          },
        ],
      },
      {
        name: "Kabir Patel",
        company: "Vertex Digital",
        email: "kabir.patel@example.com",
        phone: "+91 90000 10003",
        status: "Won" as const,
        value: 32000,
        assignedTo: abhiUser._id,
        tags: ["IT Services", "Closed Won"],
        notes: [
          {
            content: "Contract finalized and signed.",
            createdBy: abhiUser._id,
            createdAt: new Date(Date.now() - 2 * 86400000),
          },
        ],
      },
    ];

    const customerDocs = await Customer.insertMany(
      customersData.map((c) => ({
        ...c,
        companyId: novaSphere._id,
      })),
    );
    console.log(
      `[SEED] Inserted ${customerDocs.length} demo customers for NovaSphere Technologies.`,
    );

    const customerMap: Record<string, any> = {};
    customerDocs.forEach((c) => {
      customerMap[c.name] = c;
    });

    // 6. Seed 5 Deals — exactly 1 in EACH column (Lead In, Contacted, Proposal Sent, Negotiation, Closed Won)
    const dealsData = [
      {
        title: "Cloud Infrastructure Migration",
        customer: customerMap["Aarav Mehta"]._id,
        value: 15000,
        stage: "Lead" as const, // 👈 Appears in "Lead In" column
        probability: 10,
        expectedCloseDate: new Date("2026-10-01"),
        assignedTo: salesReps["Rahul Sharma"]._id,
      },
      {
        title: "AI Sales Automation Package",
        customer: customerMap["Riya Shah"]._id,
        value: 18500,
        stage: "Contacted" as const, // 👈 Appears in "Contacted" column
        probability: 25,
        expectedCloseDate: new Date("2026-10-15"),
        assignedTo: salesReps["Priya Verma"]._id,
      },
      {
        title: "Enterprise CRM Implementation",
        customer: customerMap["Aarav Mehta"]._id,
        value: 25000,
        stage: "Proposal" as const, // 👈 Appears in "Proposal Sent" column
        probability: 50,
        expectedCloseDate: new Date("2026-09-30"),
        assignedTo: salesReps["Rahul Sharma"]._id,
      },
      {
        title: "Security & SOC2 Compliance",
        customer: customerMap["Riya Shah"]._id,
        value: 28000,
        stage: "Negotiation" as const, // 👈 Appears in "Negotiation" column
        probability: 75,
        expectedCloseDate: new Date("2026-09-20"),
        assignedTo: salesReps["Priya Verma"]._id,
      },
      {
        title: "Customer Support CRM Upgrade",
        customer: customerMap["Kabir Patel"]._id,
        value: 32000,
        stage: "Won" as const, // 👈 Appears in "Closed Won" column
        probability: 100,
        expectedCloseDate: new Date("2026-09-25"),
        assignedTo: abhiUser._id,
      },
    ];

    const dealDocs = await Deal.insertMany(
      dealsData.map((d) => ({
        ...d,
        companyId: novaSphere._id,
        notes: [
          {
            content: `Initial deal creation in ${d.stage} stage`,
            createdBy: d.assignedTo,
            createdAt: new Date(),
          },
        ],
      })),
    );
    console.log(
      `[SEED] Inserted ${dealDocs.length} demo deals for NovaSphere Technologies.`,
    );

    // 7. Reset KPIs
    await KpiSetting.deleteMany({});
    await KpiSetting.create({
      closedRevenue: 32000,
      activePipeline: 86500,
      winRate: 20,
      avgDealSize: 23700,
    });

    console.log("[SEED] ✅ Demo Data Seeding completed successfully!");
    console.log(
      `[SEED] Account: ${targetEmail} | Password: ${targetPassword} | Company: NovaSphere Technologies`,
    );
  } catch (error: any) {
    console.error("[SEED] ❌ Seeding error:", error.message, error.stack);
  }
};

export default seedDatabase;
