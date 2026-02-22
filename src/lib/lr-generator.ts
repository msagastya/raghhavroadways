import { prisma } from "@/lib/prisma"

export async function generateLRNumber(): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    const [prefixSetting, counterSetting] = await Promise.all([
      tx.systemSetting.findUnique({ where: { key: "lr_prefix" } }),
      tx.systemSetting.findUnique({ where: { key: "lr_counter" } }),
    ])

    const prefix  = prefixSetting?.value ?? "GR"
    const counter = parseInt(counterSetting?.value ?? "1", 10)

    const lrNumber = `${prefix}${String(counter).padStart(4, "0")}`

    await tx.systemSetting.update({
      where: { key: "lr_counter" },
      data:  { value: String(counter + 1) },
    })

    return lrNumber
  })
}

export async function generateBillNumber(): Promise<string> {
  return await prisma.$transaction(async (tx) => {
    const [prefixSetting, seriesSetting, counterSetting] = await Promise.all([
      tx.systemSetting.findUnique({ where: { key: "invoice_prefix" } }),
      tx.systemSetting.findUnique({ where: { key: "invoice_series" } }),
      tx.systemSetting.findUnique({ where: { key: "invoice_counter" } }),
    ])

    const prefix  = prefixSetting?.value  ?? "RR"
    const series  = seriesSetting?.value  ?? "2025-26"
    const counter = parseInt(counterSetting?.value ?? "1", 10)

    const billNumber = `${prefix}/${series}/${String(counter).padStart(4, "0")}`

    await tx.systemSetting.update({
      where: { key: "invoice_counter" },
      data:  { value: String(counter + 1) },
    })

    return billNumber
  })
}
