import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const MODULES = [
  "dashboard",
  "consignments",
  "parties",
  "vehicles",
  "billing",
  "payments",
  "reports",
  "settings",
  "users",
]
const ACTIONS = ["view", "create", "edit", "delete"]

// Permission sets per role
const ROLE_PERMISSIONS: Record<string, string[]> = {
  Owner: MODULES.flatMap((m) => ACTIONS.map((a) => `${m}:${a}`)),
  Manager: MODULES.flatMap((m) => ACTIONS.map((a) => `${m}:${a}`)),
  Staff: [
    "dashboard:view",
    "consignments:view", "consignments:create", "consignments:edit",
    "parties:view", "parties:create", "parties:edit",
    "vehicles:view", "vehicles:create", "vehicles:edit",
    "billing:view", "billing:create", "billing:edit",
    "payments:view", "payments:create",
    "reports:view",
  ],
  Agent: [
    "dashboard:view",
    "consignments:view",
    "reports:view",
  ],
  ReadOnly: MODULES.map((m) => `${m}:view`),
}

async function main() {
  console.log("🌱 Seeding database...")

  // 1. Create all permissions
  const permissions = []
  for (const module of MODULES) {
    for (const action of ACTIONS) {
      const p = await prisma.permission.upsert({
        where: { module_action: { module, action } },
        update: {},
        create: {
          module,
          action,
          description: `Can ${action} ${module}`,
        },
      })
      permissions.push(p)
    }
  }
  console.log(`✓ Created ${permissions.length} permissions`)

  // 2. Create roles and assign permissions
  for (const [roleName, perms] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        description: `${roleName} role`,
        isSystem: true,
      },
    })

    for (const permKey of perms) {
      const [module, action] = permKey.split(":")
      const permission = permissions.find(
        (p) => p.module === module && p.action === action
      )
      if (!permission) continue
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        update: {},
        create: { roleId: role.id, permissionId: permission.id },
      })
    }

    console.log(`✓ Role "${roleName}" — ${perms.length} permissions`)
  }

  // 3. Create first Owner user
  const ownerRole = await prisma.role.findUnique({ where: { name: "Owner" } })
  if (ownerRole) {
    const hashedPassword = await bcrypt.hash("Admin@1234", 12)
    const user = await prisma.user.upsert({
      where: { email: "admin@raghhav.com" },
      update: {},
      create: {
        name: "Owner",
        email: "admin@raghhav.com",
        password: hashedPassword,
        roleId: ownerRole.id,
        isActive: true,
      },
    })
    console.log(`✓ Owner user created: ${user.email}`)
  }

  // 4. Create system settings
  const settings = [
    { key: "company_name",    value: "Raghhav Roadways" },
    { key: "gst_number",      value: "" },
    { key: "pan",             value: "" },
    { key: "address",         value: "" },
    { key: "city",            value: "" },
    { key: "state",           value: "" },
    { key: "phone",           value: "" },
    { key: "email",           value: "" },
    { key: "invoice_prefix",  value: "RR" },
    { key: "invoice_series",  value: "2025-26" },
    { key: "invoice_counter", value: "1" },
    { key: "lr_prefix",       value: "LR" },
    { key: "lr_counter",      value: "1" },
    { key: "gst_rate",        value: "5" },
  ]

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    })
  }
  console.log(`✓ System settings initialized`)

  console.log("")
  console.log("✅ Database seeded successfully!")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
  console.log("📧  Login email   : admin@raghhav.com")
  console.log("🔑  Password      : Admin@1234")
  console.log("⚠️   Change password after first login!")
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
