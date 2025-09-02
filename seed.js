// seed.js (CommonJS)
function buildCustomers() {
  return [
    { id:"1", name:"Acme Analytics", accountNumber:"ACCT-1001", industry:"Technology", website:"https://acme.example", phone:"201-867-5309",
      contacts:[ {firstName:"Lena", lastName:"Torres", email:"lena.torres@acme.example", title:"IT Director", phone:"301-867-5309"},
                 {firstName:"Marcus", lastName:"Ng", email:"marcus.ng@acme.example", title:"Solutions Architect", phone:"302-867-5309"} ] },
    { id:"2", name:"Apex Financial", accountNumber:"ACCT-1002", industry:"Financial Services", website:"https://apex.example", phone:"202-867-5309",
      contacts:[ {firstName:"Derek", lastName:"Shaw", email:"derek.shaw@apex.example", title:"VP, Integrations", phone:"303-867-5309"},
                 {firstName:"Elaine", lastName:"Cho", email:"elaine.cho@apex.example", title:"Data Engineer", phone:"304-867-5309"} ] },
    { id:"3", name:"BlueSky Retail", accountNumber:"ACCT-1003", industry:"Retail", website:"https://bluesky.example", phone:"203-867-5309",
      contacts:[ {firstName:"Nora", lastName:"Kim", email:"nora.kim@bluesky.example", title:"E-commerce Lead", phone:"305-867-5309"},
                 {firstName:"Jeff", lastName:"Barker", email:"jeff.barker@bluesky.example", title:"Ops Manager", phone:"306-867-5309"} ] },
    { id:"4", name:"Copper Canyon Health", accountNumber:"ACCT-1004", industry:"Healthcare", website:"https://coppercanyon.example", phone:"204-867-5309",
      contacts:[ {firstName:"Omar", lastName:"Said", email:"omar.said@coppercanyon.example", title:"Clinical Systems Lead", phone:"307-867-5309"},
                 {firstName:"Grace", lastName:"Whitfield", email:"grace.whitfield@coppercanyon.example", title:"Security Officer", phone:"308-867-5309"} ] },
    { id:"5", name:"Delta Manufacturing", accountNumber:"ACCT-1005", industry:"Manufacturing", website:"https://deltamfg.example", phone:"205-867-5309",
      contacts:[ {firstName:"Hank", lastName:"Porter", email:"hank.porter@deltamfg.example", title:"Plant IT Manager", phone:"309-867-5309"},
                 {firstName:"Mei", lastName:"Zhou", email:"mei.zhou@deltamfg.example", title:"Automation Engineer", phone:"310-867-5309"} ] },
    { id:"6", name:"Evergreen Media", accountNumber:"ACCT-1006", industry:"Media", website:"https://evergreen.example", phone:"206-867-5309",
      contacts:[ {firstName:"Sofia", lastName:"Lopez", email:"sofia.lopez@evergreen.example", title:"Digital Director", phone:"311-867-5309"},
                 {firstName:"Adam", lastName:"Reed", email:"adam.reed@evergreen.example", title:"Campaign Manager", phone:"312-867-5309"} ] },
    { id:"7", name:"Falcon Logistics", accountNumber:"ACCT-1007", industry:"Logistics", website:"https://falconlogx.example", phone:"207-867-5309",
      contacts:[ {firstName:"Tom", lastName:"Ibrahim", email:"tom.ibrahim@falconlogx.example", title:"Head of Ops", phone:"313-867-5309"},
                 {firstName:"Rina", lastName:"Ghosh", email:"rina.ghosh@falconlogx.example", title:"Systems Analyst", phone:"314-867-5309"} ] },
    { id:"8", name:"Granite Insurance", accountNumber:"ACCT-1008", industry:"Insurance", website:"https://graniteins.example", phone:"208-867-5309",
      contacts:[ {firstName:"Bianca", lastName:"Hale", email:"bianca.hale@graniteins.example", title:"Underwriting IT", phone:"315-867-5309"},
                 {firstName:"Sean", lastName:"Oneal", email:"sean.oneal@graniteins.example", title:"Data Scientist", phone:"316-867-5309"} ] },
    { id:"9", name:"Harbor Hospitality", accountNumber:"ACCT-1009", industry:"Hospitality", website:"https://harborhost.example", phone:"209-867-5309",
      contacts:[ {firstName:"Diego", lastName:"Navarro", email:"diego.navarro@harborhost.example", title:"Guest Tech Lead", phone:"317-867-5309"},
                 {firstName:"Amber", lastName:"Young", email:"amber.young@harborhost.example", title:"CX Manager", phone:"318-867-5309"} ] },
    { id:"10", name:"IronPeak Energy", accountNumber:"ACCT-1010", industry:"Energy", website:"https://ironpeak.example", phone:"210-867-5309",
      contacts:[ {firstName:"Paula", lastName:"Garcia", email:"paula.garcia@ironpeak.example", title:"Ops Technology", phone:"319-867-5309"},
                 {firstName:"Noah", lastName:"Williams", email:"noah.williams@ironpeak.example", title:"Field Systems", phone:"320-867-5309"} ] }
  ];
}

function buildCampaignLeads() {
  const out = [];
  const pad = n => String(n).padStart(3, "0");
  for (let c = 1; c <= 15; c++) {
    const id = `CAMP${pad(c)}`;
    for (let i = 1; i <= 5; i++) {
      out.push({ firstName:`Lead${c}${i}`, lastName:"User", email:`lead${c}${i}+${id}@example.com`, campaignId:id });
    }
  }
  return out; // 75
}

function buildContactIndex(customers) {
  const rows = [];
  for (const c of customers) {
    for (const ct of c.contacts) {
      rows.push({ firstName: ct.firstName, lastName: ct.lastName, email: ct.email, phone: ct.phone, customerId: c.id });
    }
  }
  return rows; // 20
}

function buildData() {
  const customers = buildCustomers();
  const Leads = [...buildCampaignLeads(), ...buildContactIndex(customers)];
  return { customers, Leads };
}

module.exports = { buildData };
