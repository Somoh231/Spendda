import { createRng } from "./rng";
import type {
  County,
  DemoDataset,
  Department,
  Employee,
  Ministry,
  Organization,
  Sector,
  Transaction,
  Vendor,
} from "./types";
import { buildFlags } from "./rules";

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function monthKey(date: Date) {
  const y = date.getUTCFullYear();
  const m = date.getUTCMonth() + 1;
  return `${y}-${pad2(m)}`;
}

function addMonthsUTC(d: Date, months: number) {
  const nd = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1));
  return nd;
}

const vendorCategories = [
  "Facilities",
  "Medical",
  "IT",
  "Logistics",
  "Construction",
  "Professional Services",
  "Education",
  "Security",
  "Travel",
  "Office Supplies",
] as const satisfies readonly Vendor["category"][];

export type GenerateOptions = {
  seed?: number;
  months?: number; // default 24
  transactions?: number; // default 100000
  employees?: number; // default 10000
  vendors?: number; // default 200
  currency?: string; // default USD
  organizationName?: string;
  sector?: Sector;
  /** Used for cache keying when generating from profile packs. */
  demoPackId?: string;
  /** Tenant key — used only for cache keying/isolation. */
  tenantKey?: string;
};

export function generateDemoDataset(opts: GenerateOptions = {}): DemoDataset {
  const seed = opts.seed ?? 1337;
  const months = opts.months ?? 24;
  const pack = String(opts.demoPackId || "").trim();
  const isUsb = pack === "home-care-us" || pack === "childcare-us" || pack === "restaurant-us" || pack === "sme-us";

  // US SME packs aim for realistic monthly totals rather than 100k synthetic rows.
  const txPerMonthDefault = isUsb ? 220 : Math.round((opts.transactions ?? 100_000) / months);
  const transactionCount =
    opts.transactions ??
    (isUsb ? txPerMonthDefault * months : 100_000);

  const employeeCount =
    opts.employees ??
    (pack === "home-care-us" ? 24 : pack === "childcare-us" ? 38 : pack === "restaurant-us" ? 85 : pack === "sme-us" ? 12 : 10_000);

  const vendorCount =
    opts.vendors ??
    (pack === "home-care-us"
      ? 12
      : pack === "childcare-us"
        ? 10
        : pack === "restaurant-us"
          ? 18
          : pack === "sme-us"
            ? 18
            : 200);
  const currency = opts.currency ?? "USD";

  const rng = createRng(seed);

  const org: Organization = {
    id: "ORG-DEMO",
    name: opts.organizationName ?? "Republic Public Finance Authority",
    sector: opts.sector ?? "Government",
    currency,
  };

  const ministries: Ministry[] = (
    isUsb
      ? ["HQ"]
      : [
          "Ministry of Health",
          "Ministry of Education",
          "Ministry of Transport",
          "Ministry of Agriculture",
          "Ministry of Infrastructure",
          "Ministry of Interior",
          "Ministry of Public Works",
          "Ministry of Finance",
        ]
  ).map((name, idx) => ({ id: `MIN-${idx + 1}`, name }));

  const counties: County[] = (
    pack === "restaurant-us"
      ? ["Downtown", "Westside", "Airport"]
      : pack === "childcare-us"
        ? ["Center 1 - Main St", "Center 2 - Oak Ave", "Center 3 - Park Blvd"]
        : pack === "home-care-us"
          ? ["HQ"]
          : pack === "sme-us"
            ? ["HQ"]
            : [
                "North County",
                "River County",
                "Coastal County",
                "Highland County",
                "Central County",
                "Eastern County",
                "Western County",
                "Southern County",
                "Capital District",
                "Lakeside County",
                "Frontier County",
                "Green Valley County",
              ]
  ).map((name, idx) => ({ id: `CO-${idx + 1}`, name }));

  const deptNames =
    pack === "home-care-us"
      ? ["Skilled Nursing", "Personal Care", "Companion Care", "Physical Therapy"]
      : pack === "childcare-us"
        ? ["Center 1 - Main St", "Center 2 - Oak Ave", "Center 3 - Park Blvd"]
        : pack === "restaurant-us"
          ? ["Downtown", "Westside", "Airport"]
          : pack === "sme-us"
            ? ["Operations", "Sales", "Service Delivery", "Admin"]
            : [
                "Operations",
                "Procurement",
                "Finance",
                "HR",
                "Payroll",
                "Clinical Services",
                "Maintenance",
                "Capital Projects",
                "IT Services",
                "Logistics",
                "Audit & Compliance",
                "Administration",
                "Program Delivery",
              ];

  const departments: Department[] = [];
  let deptIdx = 1;
  if (isUsb) {
    const min = ministries[0]!;
    for (const co of counties) {
      // For US packs, treat "departments" as the primary entity lines/locations.
      departments.push({
        id: `DEP-${deptIdx++}`,
        name: co.name,
        ministryId: min.id,
        countyId: co.id,
      });
    }
  } else {
    for (const min of ministries) {
      for (const co of counties) {
        const deptCount = rng.int(2, 4);
        const picks = new Set<string>();
        while (picks.size < deptCount) picks.add(rng.pick(deptNames));
        for (const dn of picks) {
          departments.push({
            id: `DEP-${deptIdx++}`,
            name: dn,
            ministryId: min.id,
            countyId: co.id,
          });
        }
      }
    }
  }

  const vendorPrefixes = [
    "Northbridge",
    "Cedarline",
    "Atlas",
    "Emerald",
    "Summit",
    "Bluewater",
    "Stonegate",
    "Redwood",
    "Harbor",
    "Civic",
    "Pioneer",
    "Sterling",
    "Beacon",
  ];
  const vendorSuffixes = [
    "Supplies",
    "Holdings",
    "Services",
    "Group",
    "Partners",
    "Logistics",
    "Facilities",
    "Systems",
    "Consulting",
    "Solutions",
    "Industries",
    "Trading",
  ];

  const restaurantVendors = ["US Foods", "Sysco", "Local Produce Co", "Beverage Direct"];
  const vendors: Vendor[] = Array.from({ length: vendorCount }).map((_, i) => {
    const baseName =
      pack === "restaurant-us" && i < restaurantVendors.length
        ? restaurantVendors[i]!
        : `${rng.pick(vendorPrefixes)} ${rng.pick(vendorSuffixes)} ${rng.bool(0.25) ? "Co." : "Ltd."}`;
    const category = pack === "restaurant-us" && i < restaurantVendors.length ? "Logistics" : rng.pick(vendorCategories);
    return {
      id: `VND-${i + 1}`,
      name: baseName,
      category,
      preferred: rng.bool(0.18),
      createdAt: isoDate(new Date(Date.now() - rng.int(200, 2000) * 86400000)),
    };
  });

  const firstNames = [
    "Amina",
    "Noah",
    "Liam",
    "Zara",
    "Ethan",
    "Maya",
    "Omar",
    "Fatima",
    "Grace",
    "David",
    "Sofia",
    "James",
    "Nia",
    "Samuel",
    "Leila",
    "Hassan",
    "Ivy",
    "Daniel",
  ];
  const lastNames = [
    "Okoro",
    "Mensah",
    "Khan",
    "Patel",
    "Kim",
    "Garcia",
    "Martinez",
    "Ali",
    "Haddad",
    "Nguyen",
    "Abdi",
    "Brown",
    "Johnson",
    "Osei",
    "Mwangi",
    "Diallo",
  ];
  const titles = [
    "Analyst",
    "Officer",
    "Manager",
    "Coordinator",
    "Specialist",
    "Director",
    "Administrator",
    "Accountant",
    "Auditor",
    "Procurement Lead",
    "Payroll Analyst",
  ];

  const employees: Employee[] = Array.from({ length: employeeCount }).map(
    (_, i) => {
      const dept = rng.pick(departments);
      const min = ministries.find((m) => m.id === dept.ministryId)!;
      const co = counties.find((c) => c.id === dept.countyId)!;

      const fullName = `${rng.pick(firstNames)} ${rng.pick(lastNames)}`;
      const nationalId = `${rng.int(10000000, 99999999)}-${rng.int(1, 9)}`;
      const bankAccount = `AC${rng.int(100000000, 999999999)}`;

      const hiredYearsAgo = rng.int(0, 18);
      const hireDate = new Date(
        Date.UTC(
          new Date().getUTCFullYear() - hiredYearsAgo,
          rng.int(0, 11),
          rng.int(1, 28),
        ),
      );

      const base = Math.max(900, Math.round(rng.normal(2600, 900)));
      const status: Employee["status"] = rng.bool(0.92)
        ? "Active"
        : rng.bool(0.55)
          ? "Inactive"
          : "Terminated";

      void min;
      void co;
      return {
        id: `EMP-${i + 1}`,
        fullName,
        nationalId,
        bankAccount,
        ministryId: dept.ministryId,
        countyId: dept.countyId,
        departmentId: dept.id,
        title: rng.pick(titles),
        status,
        hireDate: isoDate(hireDate),
        baseSalaryMonthly: base,
      };
    },
  );

  // Construct 24 months ending at current month.
  const now = new Date();
  const endMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const startMonth = addMonthsUTC(endMonth, -(months - 1));
  const monthStarts: Date[] = Array.from({ length: months }).map((_, i) =>
    addMonthsUTC(startMonth, i),
  );

  // Distribute transactions across months with mild seasonality and a gentle trend.
  const monthWeights = monthStarts.map((d, i) => {
    const seasonal = 1 + 0.12 * Math.sin((i / 12) * Math.PI * 2);
    const trend = 0.85 + (i / Math.max(1, months - 1)) * 0.35;
    return Math.max(0.1, seasonal * trend);
  });
  const totalW = monthWeights.reduce((a, b) => a + b, 0);
  const monthTargets = monthWeights.map((w) =>
    Math.round((w / totalW) * transactionCount),
  );

  // Vendor spend profile: few large vendors, many medium/small (Pareto-ish).
  const vendorBase = vendors.map((v, idx) => {
    const rank = idx + 1;
    const weight = 1 / Math.pow(rank, 0.85);
    const categoryFactor =
      v.category === "Construction"
        ? 1.7
        : v.category === "Medical"
          ? 1.35
          : v.category === "IT"
            ? 1.15
            : 1.0;
    const preferredBoost = v.preferred ? 1.15 : 1.0;
    return weight * categoryFactor * preferredBoost;
  });
  const vendorTotal = vendorBase.reduce((a, b) => a + b, 0);
  const vendorProb = vendorBase.map((x) => x / vendorTotal);
  const vendorCdf: number[] = [];
  vendorProb.reduce((acc, p, i) => {
    vendorCdf[i] = acc + p;
    return vendorCdf[i];
  }, 0);

  const pickVendorIndex = () => {
    const r = rng.next();
    let lo = 0;
    let hi = vendorCdf.length - 1;
    while (lo < hi) {
      const mid = Math.floor((lo + hi) / 2);
      if (r <= vendorCdf[mid]) hi = mid;
      else lo = mid + 1;
    }
    return lo;
  };

  const paymentMethods: Transaction["paymentMethod"][] = [
    "ACH",
    "Wire",
    "Card",
    "Check",
  ];

  const transactions: Transaction[] = [];
  let txId = 1;

  // Invoice pools for anomalies.
  const duplicateInvoicePool: { vendorId: string; invoiceId: string; amount: number }[] =
    [];
  const repeatedPaymentPool: { vendorId: string; amount: number; deptId: string }[] =
    [];

  const monthlySpendRange =
    pack === "home-care-us"
      ? [28_000, 52_000]
      : pack === "childcare-us"
        ? [18_000, 34_000]
        : pack === "restaurant-us"
          ? [45_000, 95_000]
          : pack === "sme-us"
            ? [15_000, 45_000]
            : null;

  const desiredMonthly = monthlySpendRange ? rng.int(monthlySpendRange[0], monthlySpendRange[1]) : null;
  const avgTxPerMonth = Math.max(1, Math.round(transactionCount / Math.max(1, months)));
  const packBaseMean = desiredMonthly ? Math.max(45, Math.round(desiredMonthly / avgTxPerMonth)) : null;

  for (let mi = 0; mi < monthStarts.length; mi++) {
    const monthStart = monthStarts[mi];
    const monthCount = monthTargets[mi] + (mi === 0 ? transactionCount - monthTargets.reduce((a,b)=>a+b,0) : 0);
    const daysInMonth = new Date(
      Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0),
    ).getUTCDate();

    for (let j = 0; j < monthCount; j++) {
      const dept = rng.pick(departments);
      const vendor = vendors[pickVendorIndex()];
      const day = rng.int(1, daysInMonth);
      const date = new Date(
        Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth(), day),
      );

      // Amount model by category, with occasional outliers.
      const baseMean =
        packBaseMean
          ? packBaseMean
          : 
        vendor.category === "Construction"
          ? 38_000
          : vendor.category === "Medical"
            ? 12_000
            : vendor.category === "Facilities"
              ? 8_500
              : vendor.category === "IT"
                ? 9_500
                : vendor.category === "Logistics"
                  ? 7_000
                  : vendor.category === "Professional Services"
                    ? 11_000
                    : vendor.category === "Security"
                      ? 6_500
                      : vendor.category === "Travel"
                        ? 3_200
                        : vendor.category === "Education"
                          ? 5_200
                          : 2_700;

      let amount = Math.max(45, rng.normal(baseMean, baseMean * 0.35));
      if (rng.bool(0.012)) amount *= rng.int(3, 9); // big outlier
      amount = Math.round(amount);

      let invoiceId = `INV-${monthKey(date)}-${rng.int(10000, 99999)}`;

      // Seed some likely duplicates across the dataset.
      if (rng.bool(0.006)) {
        duplicateInvoicePool.push({ vendorId: vendor.id, invoiceId, amount });
      }
      // Apply duplicates from the pool occasionally.
      if (duplicateInvoicePool.length > 0 && rng.bool(0.008)) {
        const dup = rng.pick(duplicateInvoicePool);
        invoiceId = dup.invoiceId;
        amount = dup.amount;
      }

      // Repeated payments: same vendor+amount+dept repeated 3+ times.
      if (rng.bool(0.007)) {
        repeatedPaymentPool.push({
          vendorId: vendor.id,
          amount,
          deptId: dept.id,
        });
      }
      if (repeatedPaymentPool.length > 0 && rng.bool(0.01)) {
        const rep = rng.pick(repeatedPaymentPool);
        if (rep.vendorId === vendor.id && rep.deptId === dept.id) {
          amount = rep.amount;
        }
      }

      const tx: Transaction = {
        id: `TX-${txId++}`,
        orgId: org.id,
        ministryId: dept.ministryId,
        countyId: dept.countyId,
        departmentId: dept.id,
        vendorId: vendor.id,
        vendorName: vendor.name,
        category: vendor.category,
        amount,
        currency,
        date: isoDate(date),
        invoiceId,
        paymentMethod: rng.pick(paymentMethods),
        createdAt: isoDate(new Date(date.getTime() + rng.int(0, 5) * 86400000)),
      };
      transactions.push(tx);
    }
  }

  const datasetBase = {
    org,
    ministries,
    counties,
    departments,
    vendors,
    employees,
    transactions,
    generatedAt: new Date().toISOString(),
  };

  const flags = buildFlags(datasetBase, seed);

  return { ...datasetBase, flags };
}

