const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const React = require('react');
const {renderToStaticMarkup} = require('react-dom/server');
const compile = file => ts.transpileModule(fs.readFileSync(path.join(__dirname,file),'utf8'), {compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const cartExports = {};
vm.runInNewContext(compile('../src/lib/cart.ts'), {exports:cartExports});
const source = compile('../src/components/FloatingCart.tsx');
const item = {id:1,lineId:'draft',restaurantId:52,name:'Private draft',price:250,quantity:2,is_available:true};
const ownItem = {id:8,name:'Your meal',quantity:1,status:'preparing',is_yours:true,line_total:380};
const otherItem = {id:9,name:'Companion meal',quantity:1,status:'pending',is_yours:false,line_total:900};
const context = {cart:[item],totalPrice:500,totalItems:2,session:{restaurantId:52,tableName:'9',qrToken:'test',activeOrderTotal:1280,orderedItems:[ownItem,otherItem],tableAccess:{access:'approved',billing:{can_pay:true,accepted_total:380,request_total:0}}},refreshSession:async()=>{}};
function render(mode,panel='sent',overrides={}) {
 let index=0;const exports={};
 vm.runInNewContext(source,{exports,require:name=>{
  if(name==='react')return {...React,useState:initial=>React.useState(index++===5?panel:initial)};
  if(name==='@/context/CartContext')return {useCart:()=>({...context,...overrides})};
  if(name==='@/lib/cart')return cartExports;
  if(name==='@/lib/money')return {money:value=>'NPR '+value};
  if(name==='@/services/api')return {};
  if(name==='swr')return {default:()=>({data:{categories:[],modifierGroups:[]}})};
  if(name==='./OrderedBillItems')return {default:({items})=>React.createElement('div',{'data-rendered-items':items.map(item=>item.id).join(',')})};
  if(name==='./CustomerBillManager')return {default:()=>React.createElement('button',null,'Manage bill')};
  if(name.startsWith('./'))return {default:()=>null};
  return require(name);
 }});
 return renderToStaticMarkup(React.createElement(exports.default,{mode}));
}

test('private cart offers submission without a competing payment action or table total',()=>{
 const html=render('cart');
 assert.match(html,/Review your cart/);
 assert.match(html,/Send order request/);
 assert.match(html,/NPR 500/);
 assert.doesNotMatch(html,/Review Fonepay payment|NPR 1280|Your accepted bill/);
});

test('sent orders show personal items and preserve an unsent second round separately',()=>{
 const html=render('orders');
 assert.match(html,/2 items not sent/);
 assert.match(html,/data-rendered-items="8"/);
 assert.doesNotMatch(html,/data-rendered-items="8,9"|Send order request/);
});

test('personal bill uses owned accepted amount and never presents table plus draft as amount due',()=>{
 const html=render('orders','bill');
 assert.match(html,/Your accepted bill/);
 assert.match(html,/NPR 380/);
 assert.match(html,/Review Fonepay payment/);
 assert.doesNotMatch(html,/NPR 1280|NPR 1780|Send order request/);
});

test('bill tools stay with their related content without a separate estimate button',()=>{
 const html=render('orders','bill');
 assert.match(html,/data-rendered-items="8"[\s\S]*Manage bill/);
 assert.match(html,/Your accepted bill[\s\S]*Table estimate/);
 assert.doesNotMatch(html,/View table estimate/);
});

test('pending table access prevents food submission but keeps the draft visible',()=>{
 const html=render('cart','sent',{session:{...context.session,tableAccess:{access:'pending'}}});
 assert.match(html,/Private draft/);
 assert.match(html,/Check table access/);
 assert.match(html,/<button[^>]*disabled=""[^>]*>[\s\S]*?Send order request/);
});

test('missing table offers scanning without treating the draft as submitted',()=>{
 const html=render('cart','sent',{session:null});
 assert.match(html,/Scan table QR to order/);
 assert.match(html,/Not sent yet/);
 assert.doesNotMatch(html,/Review Fonepay payment/);
});

test('editing configurations preserves quantity, merges identical variants and isolates restaurants',()=>{
 const {addCartLine,changeLineConfiguration,cartTotal}=cartExports;
 const dish={id:1,name:'Momo',price:320,is_available:true};
 let lines=addCartLine([],dish,'',[],52);
 lines=addCartLine(lines,dish,'',[],52);
 lines=addCartLine(lines,dish,'Spicy',[],52);
 lines=addCartLine(lines,dish,'',[],53);
 lines=changeLineConfiguration(lines,lines[0].lineId,dish,'Spicy',[]);
 assert.equal(lines.length,2);
 assert.equal(lines.find(line=>line.restaurantId===52).quantity,3);
 assert.equal(lines.find(line=>line.restaurantId===53).quantity,1);
 const original=lines.find(line=>line.restaurantId===52);
 lines=changeLineConfiguration(lines,original.lineId,dish,'Spicy',[{modifier_id:2,modifier_name_snapshot:'Fried',price_adjustment_snapshot:40}]);
 assert.equal(cartTotal(lines.filter(line=>line.restaurantId===52)),1080);
});
