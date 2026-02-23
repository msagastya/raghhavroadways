import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"

// ── Number → Indian Rupees Words ────────────────────────────────────────────
const ONES = ["","One","Two","Three","Four","Five","Six","Seven","Eight","Nine",
  "Ten","Eleven","Twelve","Thirteen","Fourteen","Fifteen","Sixteen","Seventeen","Eighteen","Nineteen"]
const TENS = ["","","Twenty","Thirty","Forty","Fifty","Sixty","Seventy","Eighty","Ninety"]

function nw(n: number): string {
  if (n <= 0)       return ""
  if (n < 20)       return ONES[n]
  if (n < 100)      return TENS[Math.floor(n/10)] + (n%10 ? " "+ONES[n%10] : "")
  if (n < 1_000)    return ONES[Math.floor(n/100)]+" Hundred"+(n%100   ? " "+nw(n%100)   : "")
  if (n < 100_000)  return nw(Math.floor(n/1_000))+" Thousand"+(n%1_000 ? " "+nw(n%1_000) : "")
  if (n < 10_000_000) return nw(Math.floor(n/100_000))+" Lakh"+(n%100_000 ? " "+nw(n%100_000) : "")
  return nw(Math.floor(n/10_000_000))+" Crore"+(n%10_000_000 ? " "+nw(n%10_000_000) : "")
}

function toWords(amount: number): string {
  const r = Math.floor(amount)
  const p = Math.round((amount - r) * 100)
  if (r === 0 && p === 0) return "Zero Rupees Only"
  return (r > 0 ? nw(r)+" Rupees" : "") +
         (p > 0 ? (r > 0 ? " and " : "") + nw(p)+" Paise" : "") + " Only"
}

// ── Helpers ─────────────────────────────────────────────────────────────────
function fd(d: Date | string): string {
  const dt = new Date(d)
  return String(dt.getDate()).padStart(2,"0")+"-"+
         String(dt.getMonth()+1).padStart(2,"0")+"-"+
         dt.getFullYear()
}

function fa(n: number): string {
  return "₹"+n.toLocaleString("en-IN",{minimumFractionDigits:2,maximumFractionDigits:2})
}

const SC: Record<string,string> = {
  "Andhra Pradesh":"AP","Arunachal Pradesh":"AR","Assam":"AS","Bihar":"BR",
  "Chhattisgarh":"CG","Goa":"GA","Gujarat":"GJ","Haryana":"HR",
  "Himachal Pradesh":"HP","Jharkhand":"JH","Karnataka":"KA","Kerala":"KL",
  "Madhya Pradesh":"MP","Maharashtra":"MH","Manipur":"MN","Meghalaya":"ML",
  "Mizoram":"MZ","Nagaland":"NL","Odisha":"OD","Punjab":"PB","Rajasthan":"RJ",
  "Sikkim":"SK","Tamil Nadu":"TN","Telangana":"TS","Tripura":"TR",
  "Uttar Pradesh":"UP","Uttarakhand":"UK","West Bengal":"WB","Delhi":"DL",
  "Daman and Diu":"DD","Dadra and Nagar Haveli":"DN","Jammu and Kashmir":"JK",
  "Ladakh":"LA","Puducherry":"PY","Chandigarh":"CH",
}

function loc(city: string, state: string): string {
  const code = SC[state]
  return city + (code ? ` [${code}]` : state ? `, ${state}` : "")
}

function parseDesc(raw: string | null): string {
  if (!raw) return ""
  try { const p = JSON.parse(raw); if (Array.isArray(p)) return p.join(", ") } catch {}
  return raw
}

const TABLE_ROWS = 10

// ── Page ────────────────────────────────────────────────────────────────────
export default async function BillPrintPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const bill = await prisma.bill.findUnique({
    where: { id },
    include: {
      party: true,
      consignment: {
        include: {
          vehicle: { select: { vehicleNumber: true } },
        },
      },
    },
  })

  if (!bill) notFound()

  const c        = bill.consignment
  const p        = bill.party
  const contents = bill.description || (c ? parseDesc(c.description) : "")
  const filled   = c ? 1 : 0
  const empties  = Math.max(0, TABLE_ROWS - filled)

  return (
    <html lang="en">
      <head>
        <meta charSet="UTF-8" />
        <title>Invoice {bill.billNumber} — Raghhav Roadways</title>
        <style>{`
          * { margin:0; padding:0; box-sizing:border-box; }
          body { font-family:Arial,Helvetica,sans-serif; font-size:11px; color:#000; background:#fff; }

          .inv { width:275mm; border:1.5px solid #000; margin:0 auto; }

          /* TOP BAR */
          .top { text-align:center; font-size:9.5px; font-weight:700; padding:3px 0;
                 border-bottom:1px solid #000; letter-spacing:0.4px; }

          /* COMPANY ROW */
          .co { display:flex; align-items:stretch; border-bottom:1px solid #000; }
          .co-l { display:flex; align-items:center; gap:10px; padding:9px 12px; flex:1; }
          .logo { width:50px; height:50px; object-fit:contain; }
          .co-name { font-size:21px; font-weight:900; color:#0D2B1A; line-height:1.05; }
          .co-gstin { font-size:9.5px; font-weight:700; margin-top:3px; }
          .divider { width:1px; background:#000; flex-shrink:0; }
          .co-r { width:265px; flex-shrink:0; padding:9px 12px; font-size:9.5px;
                  font-weight:600; line-height:1.6; text-align:right; }

          /* PARTY GRID */
          .pg { border-bottom:1px solid #000; }
          .pr { display:flex; }
          .pr:not(:last-child) { border-bottom:1px solid #000; }
          .pl { width:118px; flex-shrink:0; font-weight:700; font-size:10px;
                padding:5px 8px; border-right:1px solid #000; display:flex; align-items:center; }
          .pv { flex:1; padding:4px 8px; border-right:1px solid #000; }
          .pname { font-weight:700; font-size:11.5px; }
          .paddr { font-size:9px; margin-top:2px; }
          .meta { flex-shrink:0; }
          .mr { display:flex; }
          .mr:not(:last-child) { border-bottom:1px solid #000; }
          .mk { width:70px; font-weight:700; font-size:10px; padding:4px 7px;
                border-right:1px solid #000; flex-shrink:0; }
          .mv { font-size:10px; font-weight:600; padding:4px 8px; min-width:95px; }

          /* TABLE */
          table { width:100%; border-collapse:collapse; }
          th { font-size:10px; font-weight:700; border:1px solid #000;
               padding:5px 3px; text-align:center; background:#fff; }
          td { font-size:10px; border-left:1px solid #000; border-right:1px solid #000;
               padding:3px 3px; height:17px; text-align:center; vertical-align:middle; }
          tr.alt td { background:#f2f2f2; }
          .al { text-align:left; padding-left:5px; }
          .ar { text-align:right; padding-right:6px; }

          /* GR Charge row */
          .gcr td { border-top:1px solid #000; border-bottom:1px solid #000; font-style:italic; }

          /* TOTALS */
          .tots { border-top:1px solid #000; }
          .tr { display:flex; border-bottom:1px solid #000; }
          .tr:last-child { border-bottom:none; }
          .tl { width:90px; flex-shrink:0; font-weight:700; font-size:10.5px;
                padding:4px 8px; border-right:1px solid #000; }
          .tv { flex:1; font-size:10px; padding:4px 10px;
                border-right:1px solid #000; font-weight:600; }
          .ta { width:110px; flex-shrink:0; font-weight:700; font-size:11px;
                text-align:right; padding:4px 8px; }

          /* FOOTER */
          .foot { display:flex; border-top:1px solid #000; }
          .bank { width:178px; flex-shrink:0; border-right:1px solid #000; }
          .bh { font-weight:700; font-size:10px; padding:4px 8px;
                border-bottom:1px solid #000; }
          .br { display:flex; }
          .br:not(:last-child) { border-bottom:1px solid #000; }
          .bk { width:64px; font-weight:700; font-size:9px; padding:3px 5px;
                border-right:1px solid #000; flex-shrink:0; }
          .bv { font-size:9px; font-weight:600; padding:3px 5px; }
          .terms { flex:1; padding:7px 10px; display:flex; flex-direction:column;
                   justify-content:space-between; border-right:1px solid #000; font-size:10px; }
          .sig { width:158px; flex-shrink:0; padding:7px 10px; display:flex;
                 flex-direction:column; justify-content:space-between; font-size:10px; }

          @media print {
            @page { size:A4 landscape; margin:5mm; }
            body { print-color-adjust:exact; -webkit-print-color-adjust:exact; }
          }
        `}</style>
      </head>
      <body>
        <div className="inv">

          {/* Jurisdiction bar */}
          <div className="top">Subject to Surat Jurisdiction</div>

          {/* Company header */}
          <div className="co">
            <div className="co-l">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.png" className="logo" alt="" />
              <div>
                <div className="co-name">RAGHHAV<br/>ROADWAYS</div>
                <div className="co-gstin">GSTIN: 24BQCPP3322B1ZH</div>
              </div>
            </div>
            <div className="divider" />
            <div className="co-r">
              PLOT NO. D-407, BLD. NO. D-1, 4TH FLOOR,<br/>
              UMANG RESIDENCY NR. SACHIN RAILWAY<br/>
              STATION, SACHIN, SURAT - 394230<br/>
              +91 9727-466-477<br/>
              raghhavroadways@gmail.com
            </div>
          </div>

          {/* Party info */}
          <div className="pg">
            <div className="pr">
              <div className="pl">Party Name &amp; Address</div>
              <div className="pv">
                <div className="pname">{p.name}</div>
                {p.address && (
                  <div className="paddr">
                    {[p.address, p.city, p.state].filter(Boolean).join(", ")}
                  </div>
                )}
              </div>
              <div className="meta">
                <div className="mr"><div className="mk">BRANCH</div><div className="mv">SURAT</div></div>
                <div className="mr"><div className="mk">BILL NO.</div><div className="mv">{bill.billNumber}</div></div>
              </div>
            </div>
            <div className="pr">
              <div className="pl">Party GST No.</div>
              <div className="pv" style={{display:"flex",alignItems:"center",fontSize:"10px"}}>
                {p.gstin ?? ""}
              </div>
              <div className="meta">
                <div className="mr"><div className="mk">DATE</div><div className="mv">{fd(bill.billDate)}</div></div>
              </div>
            </div>
          </div>

          {/* Consignment table */}
          <table>
            <thead>
              <tr>
                <th style={{width:"52px"}}>GR No.</th>
                <th style={{width:"72px"}}>DATE</th>
                <th style={{width:"82px"}}>VEHICLE NO.</th>
                <th style={{width:"108px"}}>LOAD FROM</th>
                <th style={{width:"90px"}}>DESTINATION</th>
                <th>CONTENTS</th>
                <th style={{width:"70px"}}>QTY IN MT.</th>
                <th style={{width:"62px"}}>RATE MT.</th>
                <th style={{width:"98px"}}>AMOUNT</th>
              </tr>
            </thead>
            <tbody>
              {c && (
                <tr>
                  <td>{c.lrNumber}</td>
                  <td>{fd(c.bookingDate)}</td>
                  <td>{c.vehicle?.vehicleNumber ?? ""}</td>
                  <td className="al">{loc(c.fromCity, c.fromState)}</td>
                  <td className="al">{loc(c.toCity, c.toState)}</td>
                  <td className="al">{contents}</td>
                  <td>{c.weight ? `${c.weight.toLocaleString("en-IN")}KG` : ""}</td>
                  <td></td>
                  <td className="ar">{fa(c.freightAmount)}</td>
                </tr>
              )}
              {Array.from({length: empties}).map((_,i) => (
                <tr key={i} className={(i + filled) % 2 === 1 ? "alt" : ""}>
                  <td/><td/><td/><td/><td/><td/><td/><td/><td/>
                </tr>
              ))}
              <tr className="gcr">
                <td colSpan={8} className="ar">GR Charge</td>
                <td className="ar">₹&nbsp;&nbsp;&nbsp;-</td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="tots">
            <div className="tr">
              <div className="tl">TOTAL</div>
              <div className="tv" />
              <div className="ta">{fa(bill.subtotal)}</div>
            </div>
            <div className="tr">
              <div className="tl">RUPEES</div>
              <div className="tv">{toWords(bill.subtotal)}</div>
              <div className="ta" />
            </div>
          </div>

          {/* Footer */}
          <div className="foot">
            <div className="bank">
              <div className="bh">BANK DETAILS</div>
              {[
                ["BANK NAME", "AXIS BANK"],
                ["A/C No.",   "924020013795444"],
                ["IFSC Code", "UTIB0005605"],
                ["BRANCH",    "STATION ROAD SACHIN"],
              ].map(([k,v]) => (
                <div key={k} className="br">
                  <div className="bk">{k}</div>
                  <div className="bv">{v}</div>
                </div>
              ))}
            </div>
            <div className="terms">
              <div>Person liable for paying GST Tax Paid by Party</div>
              <div>Please Pay by A/c. Payee Cheque Only</div>
            </div>
            <div className="sig">
              <div style={{fontWeight:700,fontSize:"11px"}}>For RAGHHAV ROADWAYS</div>
              <div style={{fontSize:"9.5px",textAlign:"right"}}>Billing Incharge/Auth. Signatory</div>
            </div>
          </div>

        </div>
        <script dangerouslySetInnerHTML={{__html:`window.onload=function(){window.print()}`}} />
      </body>
    </html>
  )
}
