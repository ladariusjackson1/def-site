/* Double Eagle Financial — service catalog and bill math (shared by every page). */
const DEF = {
  STORE_KEY: 'def-transactions-v1',
  CART_KEY: 'def-cart-v1',
  TAX_RATE: 0,          // MS: accounting/bookkeeping is a non-taxable professional service (35 Miss. Code R. 4-05-06-202)
  CARD_FEE_RATE: 0.03,  // 3% card processing fee passed through; ACH/check = $0
  PREPAY_DISCOUNT: [{min:12, rate:0.10},{min:6, rate:0.05}], // applies to monthly plan lines only
  catalog: [
    {code:'PLAN-STR', name:'Starter Bookkeeping (monthly)', cat:'Monthly Plan', price:250, unit:'month', desc:'Up to 2 accounts, ~100 transactions/mo, monthly reconciliation, P&L and balance sheet.'},
    {code:'PLAN-GRW', name:'Growth Bookkeeping (monthly)', cat:'Monthly Plan', price:450, unit:'month', desc:'Up to 5 accounts, ~300 transactions/mo, AP/AR tracking, monthly review call.'},
    {code:'PLAN-PRM', name:'Premium Bookkeeping (monthly)', cat:'Monthly Plan', price:650, unit:'month', desc:'Up to 10 accounts, ~600 transactions/mo, class/job tracking, KPI dashboard, quarterly planning.'},
    {code:'ADD-CATCH', name:'Catch-up Bookkeeping', cat:'Cleanup & Setup', price:175, unit:'month of backlog', desc:'Bring past months current and reconciled.'},
    {code:'ADD-QBO', name:'QuickBooks Online Setup', cat:'Cleanup & Setup', price:299, unit:'setup', desc:'Chart of accounts, bank feeds, rules, and opening balances.'},
    {code:'ADD-PAYSET', name:'Payroll Setup', cat:'Payroll', price:199, unit:'setup', desc:'Payroll provider setup, employee onboarding, state and federal accounts.'},
    {code:'ADD-PAYRUN', name:'Payroll Processing', cat:'Payroll', price:60, unit:'month', desc:'Up to 10 employees per month.'},
    {code:'TAX-BIZ', name:'Business Tax Return Prep', cat:'Tax', price:595, unit:'return', desc:'Schedule C, 1065, or 1120-S preparation.'},
    {code:'TAX-IND', name:'Individual Tax Return (1040)', cat:'Tax', price:225, unit:'return', desc:'Owner personal return.'},
    {code:'TAX-1099', name:'1099 Filing', cat:'Tax', price:15, unit:'form', desc:'1099-NEC / 1099-MISC prepared and e-filed.'}
  ],
  byCode(c){ return this.catalog.find(x=>x.code===c); },
  r2(n){ return Math.round((n+Number.EPSILON)*100)/100; },
  money(n){ return '$'+Number(n).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}); },
  discountRate(item, qty){ if(item.cat!=='Monthly Plan') return 0; for(const t of this.PREPAY_DISCOUNT) if(qty>=t.min) return t.rate; return 0; },
  /* cart: [{code, qty}], payment: 'ACH'|'Card' */
  bill(cart, payment){
    const lines = cart.filter(l=>l.qty>0).map(l=>{
      const it=this.byCode(l.code), qty=Math.floor(l.qty);
      const gross=this.r2(it.price*qty), rate=this.discountRate(it,qty), disc=this.r2(gross*rate);
      return {code:it.code, name:it.name, cat:it.cat, qty, unitPrice:it.price, lineSubtotal:gross, discountRate:rate, discount:disc, net:this.r2(gross-disc)};
    });
    const subtotal=this.r2(lines.reduce((s,l)=>s+l.lineSubtotal,0));
    const discount=this.r2(lines.reduce((s,l)=>s+l.discount,0));
    const netRevenue=this.r2(subtotal-discount);
    const tax=this.r2(netRevenue*this.TAX_RATE);
    const fee=payment==='Card'?this.r2((netRevenue+tax)*this.CARD_FEE_RATE):0;
    const total=this.r2(netRevenue+tax+fee);
    return {lines, subtotal, discount, netRevenue, tax, fee, total};
  },
  load(){ try{return JSON.parse(localStorage.getItem(this.STORE_KEY))||[]}catch(e){return []} },
  save(list){ localStorage.setItem(this.STORE_KEY, JSON.stringify(list)); },
  csvCell(v){ v=String(v??''); return /[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v; },
  txnCSV(list){
    const h=['TransactionID','Date','CustomerID','CustomerName','Industry','Payment','Items','ItemCount','TotalQty','Subtotal','Discount','NetRevenue','SalesTax','CardFee','Total','PrimaryPlan'];
    const rows=list.map(t=>[t.id,t.date,t.customerId,t.customerName,t.industry,t.payment,t.lines.map(l=>l.code+' x'+l.qty).join('; '),t.lines.length,t.lines.reduce((s,l)=>s+l.qty,0),t.subtotal.toFixed(2),t.discount.toFixed(2),t.netRevenue.toFixed(2),t.tax.toFixed(2),t.fee.toFixed(2),t.total.toFixed(2),(t.lines.find(l=>l.cat==='Monthly Plan')||{name:'None'}).name]);
    return [h,...rows].map(r=>r.map(c=>this.csvCell(c)).join(',')).join('\r\n');
  },
  linesCSV(list){
    const h=['TransactionID','Date','CustomerID','Industry','Payment','ItemCode','Item','Category','Qty','UnitPrice','LineSubtotal','DiscountRate','LineDiscount','LineNetRevenue'];
    const rows=[]; list.forEach(t=>t.lines.forEach(l=>rows.push([t.id,t.date,t.customerId,t.industry,t.payment,l.code,l.name,l.cat,l.qty,l.unitPrice.toFixed(2),l.lineSubtotal.toFixed(2),l.discountRate,l.discount.toFixed(2),l.net.toFixed(2)])));
    return [h,...rows].map(r=>r.map(c=>this.csvCell(c)).join(',')).join('\r\n');
  },
  download(name, text){ const b=new Blob([text],{type:'text/csv'}); const a=document.createElement('a'); a.href=URL.createObjectURL(b); a.download=name; document.body.appendChild(a); a.click(); a.remove(); }
};
