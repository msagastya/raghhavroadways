import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import { formatCurrency, formatDate } from "@/lib/utils"

// Print page is intentionally minimal — no dashboard chrome
export default async function BillPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const bill = await prisma.bill.findUnique({
    where: { id },
    include: {
      party:       true,
      consignment: {
        include: {
          consignor: { select: { name: true, gstin: true, address: true, city: true, state: true } },
          consignee: { select: { name: true, address: true, city: true, state: true } },
          vehicle:   { select: { vehicleNumber: true } },
        },
      },
    },
  })

  if (!bill) notFound()

  // Fetch company settings
  const settings = await prisma.systemSetting.findMany({
    where: { key: { in: ["company_name", "company_gstin", "company_address", "company_phone"] } },
  })
  const S: Record<string, string> = {}
  settings.forEach((s) => { S[s.key] = s.value })

  const balance = +(bill.totalAmount - bill.paidAmount).toFixed(2)

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <title>{bill.billNumber} — Freight Invoice</title>
        <style>{`
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: Arial, sans-serif; font-size: 13px; color: #111; background: #fff; }
          .page { max-width: 210mm; margin: 0 auto; padding: 20mm 15mm; }
          .header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0D2B1A; padding-bottom: 14px; margin-bottom: 16px; }
          .company-name { font-size: 20px; font-weight: 800; color: #0D2B1A; letter-spacing: -0.5px; }
          .company-sub  { font-size: 11px; color: #555; margin-top: 3px; }
          .bill-meta    { text-align: right; }
          .bill-number  { font-size: 18px; font-weight: 700; color: #0D2B1A; }
          .bill-type    { font-size: 11px; font-weight: 600; color: #777; text-transform: uppercase; letter-spacing: 1px; }
          .parties-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 18px; }
          .party-box    { padding: 12px; border: 1px solid #e5e5e5; border-radius: 6px; }
          .party-label  { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 5px; }
          .party-name   { font-size: 14px; font-weight: 700; color: #0D2B1A; margin-bottom: 3px; }
          .party-sub    { font-size: 11.5px; color: #555; line-height: 1.5; }
          .consignment-box { border: 1px solid #e5e5e5; border-radius: 6px; padding: 12px; margin-bottom: 18px; }
          .section-title   { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 10px; }
          .consignment-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }
          .c-item-label { font-size: 10px; color: #888; font-weight: 600; text-transform: uppercase; }
          .c-item-value { font-size: 13px; font-weight: 600; color: #0D2B1A; margin-top: 2px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
          th { background: #0D2B1A; color: white; padding: 9px 12px; font-size: 11px; text-align: left; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
          td { padding: 9px 12px; border-bottom: 1px solid #f0f0f0; font-size: 13px; }
          .totals { margin-left: auto; width: 260px; border: 1px solid #e5e5e5; border-radius: 6px; overflow: hidden; }
          .total-row { display: flex; justify-content: space-between; padding: 8px 14px; font-size: 13px; }
          .total-row.header-row { background: #0D2B1A; color: white; font-weight: 700; font-size: 14px; }
          .total-row.alt { background: #f9f9f9; }
          .footer { margin-top: 30px; border-top: 1px solid #e5e5e5; padding-top: 14px; display: flex; justify-content: space-between; align-items: flex-end; }
          .sig-box { text-align: center; }
          .sig-line { border-top: 1px solid #aaa; width: 160px; margin: 40px auto 5px; }
          .sig-label { font-size: 11px; color: #888; font-weight: 600; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
          .status-paid  { background: #d1fae5; color: #065f46; }
          .status-due   { background: #fef3c7; color: #92400e; }
          @media print {
            @page { margin: 10mm; size: A4; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        `}</style>
      </head>
      <body>
        <div className="page">
          {/* Header */}
          <div className="header">
            <div>
              <div className="company-name">{S["company_name"] ?? "Raghhav Roadways"}</div>
              <div className="company-sub">
                {S["company_gstin"] && <>GSTIN: {S["company_gstin"]} &nbsp;·&nbsp;</>}
                {S["company_phone"] && <>Ph: {S["company_phone"]} &nbsp;·&nbsp;</>}
                {S["company_address"]}
              </div>
            </div>
            <div className="bill-meta">
              <div className="bill-type">Tax Invoice</div>
              <div className="bill-number">{bill.billNumber}</div>
              <div style={{ fontSize: "12px", color: "#555", marginTop: "4px" }}>
                Date: {formatDate(bill.billDate)}
                {bill.dueDate && <><br />Due: {formatDate(bill.dueDate)}</>}
              </div>
            </div>
          </div>

          {/* Parties */}
          <div className="parties-grid">
            <div className="party-box">
              <div className="party-label">Billed To</div>
              <div className="party-name">{bill.party.name}</div>
              <div className="party-sub">
                {bill.party.gstin && <>GSTIN: {bill.party.gstin}<br /></>}
                {bill.party.phone && <>Ph: {bill.party.phone}<br /></>}
                {bill.party.address}{bill.party.city ? `, ${bill.party.city}` : ""}
                {bill.party.state ? `, ${bill.party.state}` : ""}
              </div>
            </div>
            {bill.consignment && (
              <div className="party-box">
                <div className="party-label">Consignment Details</div>
                <div style={{ fontSize: "13px", fontWeight: "700", color: "#0D2B1A", fontFamily: "monospace" }}>
                  {bill.consignment.lrNumber}
                </div>
                <div className="party-sub" style={{ marginTop: "4px" }}>
                  {bill.consignment.fromCity} → {bill.consignment.toCity}<br />
                  {bill.consignment.vehicle && <>Vehicle: {bill.consignment.vehicle.vehicleNumber}<br /></>}
                  {bill.consignment.description}
                </div>
              </div>
            )}
          </div>

          {/* Line items table */}
          <table>
            <thead>
              <tr>
                <th style={{ width: "40px" }}>#</th>
                <th>Description</th>
                <th style={{ textAlign: "right" }}>Rate</th>
                <th style={{ textAlign: "right" }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>1</td>
                <td>
                  <strong>Freight Charges</strong>
                  {bill.consignment && (
                    <div style={{ fontSize: "11.5px", color: "#777", marginTop: "2px" }}>
                      {bill.consignment.fromCity}, {bill.consignment.fromState} to {bill.consignment.toCity}, {bill.consignment.toState}
                      {bill.consignment.weight ? ` · ${bill.consignment.weight.toLocaleString()} KG` : ""}
                    </div>
                  )}
                </td>
                <td style={{ textAlign: "right" }}>{formatCurrency(bill.subtotal)}</td>
                <td style={{ textAlign: "right" }}>{formatCurrency(bill.subtotal)}</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="totals">
            <div className="total-row alt">
              <span>Subtotal</span>
              <span>{formatCurrency(bill.subtotal)}</span>
            </div>
            {bill.isInterstate ? (
              <div className="total-row">
                <span>IGST ({bill.gstRate}%)</span>
                <span>{formatCurrency(bill.igst)}</span>
              </div>
            ) : (
              <>
                <div className="total-row">
                  <span>CGST ({bill.gstRate / 2}%)</span>
                  <span>{formatCurrency(bill.cgst)}</span>
                </div>
                <div className="total-row alt">
                  <span>SGST ({bill.gstRate / 2}%)</span>
                  <span>{formatCurrency(bill.sgst)}</span>
                </div>
              </>
            )}
            <div className="total-row header-row">
              <span>Total</span>
              <span>{formatCurrency(bill.totalAmount)}</span>
            </div>
            {bill.paidAmount > 0 && (
              <div className="total-row" style={{ color: "#16a34a" }}>
                <span>Paid</span>
                <span>({formatCurrency(bill.paidAmount)})</span>
              </div>
            )}
            {balance > 0 && (
              <div className="total-row" style={{ fontWeight: "700", color: "#d97706" }}>
                <span>Balance Due</span>
                <span>{formatCurrency(balance)}</span>
              </div>
            )}
          </div>

          <div style={{ marginTop: "16px", marginBottom: "8px" }}>
            <span className={`status-badge ${balance <= 0 ? "status-paid" : "status-due"}`}>
              {balance <= 0 ? "PAID" : "PAYMENT DUE"}
            </span>
          </div>

          {bill.notes && (
            <p style={{ fontSize: "12px", color: "#666", marginTop: "12px", fontStyle: "italic" }}>
              Note: {bill.notes}
            </p>
          )}

          {/* Footer / Signature */}
          <div className="footer">
            <div>
              <p style={{ fontSize: "11px", color: "#888" }}>
                This is a computer-generated invoice. No signature required.
              </p>
              <p style={{ fontSize: "11px", color: "#888", marginTop: "3px" }}>
                Subject to {S["company_city"] ?? "local"} jurisdiction.
              </p>
            </div>
            <div className="sig-box">
              <div className="sig-line" />
              <div className="sig-label">Authorised Signatory</div>
              <div style={{ fontSize: "12px", color: "#444", fontWeight: "600", marginTop: "2px" }}>
                {S["company_name"] ?? "Raghhav Roadways"}
              </div>
            </div>
          </div>
        </div>

        <script dangerouslySetInnerHTML={{ __html: "window.onload = function(){ window.print(); }" }} />
      </body>
    </html>
  )
}
