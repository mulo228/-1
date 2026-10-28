const STORAGE_KEY = "bez-ocheredi-mvp-v1";

const initialProducts = [
  {id:"chicken",name:"Курица с рисом",category:"Горячее",price:190,stock:12,emoji:"🍗",desc:"Нежная курица, рис и зелень",tone:"#e9dfcc"},
  {id:"soup",name:"Суп куриный",category:"Супы",price:110,stock:8,emoji:"🍲",desc:"Лёгкий суп с овощами",tone:"#e9d9bd"},
  {id:"salad",name:"Салат овощной",category:"Салаты",price:95,stock:9,emoji:"🥗",desc:"Свежие сезонные овощи",tone:"#dce8d0"},
  {id:"mors",name:"Морс ягодный",category:"Напитки",price:65,stock:15,emoji:"🧃",desc:"Ягодный напиток 300 мл",tone:"#ead9db"},
  {id:"pasta",name:"Паста с сыром",category:"Горячее",price:175,stock:7,emoji:"🍝",desc:"Паста в сливочном соусе",tone:"#eddfb8"},
  {id:"cutlet",name:"Котлета с пюре",category:"Горячее",price:185,stock:5,emoji:"🍽️",desc:"Домашняя котлета и картофель",tone:"#e6d9c7"},
  {id:"tea",name:"Чай чёрный",category:"Напитки",price:35,stock:20,emoji:"🍵",desc:"Чёрный чай 250 мл",tone:"#dce6d6"},
  {id:"fruit",name:"Фруктовый микс",category:"Салаты",price:85,stock:6,emoji:"🍎",desc:"Сезонные фрукты",tone:"#f0dfd0"}
];

let state = loadState();
let activeFilter = "Все";
let toastTimer;

function loadState(){
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && Array.isArray(saved.products) && Array.isArray(saved.orders)) return saved;
  } catch(e) {}
  return {products:initialProducts.map(p=>({...p})),cart:{},orders:[],nextOrder:1042};
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
function money(value){return new Intl.NumberFormat("ru-RU").format(value)+" ₽"}
function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function productById(id){return state.products.find(p=>p.id===id)}
function cartCount(){return Object.values(state.cart).reduce((sum,q)=>sum+q,0)}
function cartTotal(){return Object.entries(state.cart).reduce((sum,[id,q])=>sum+(productById(id)?.price||0)*q,0)}
function toast(message){
  const el=document.getElementById("toast");el.textContent=message;el.classList.add("show");
  clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove("show"),2300);
}
function renderProducts(){
  const products=state.products.filter(p=>(activeFilter==="Все"||p.category===activeFilter));
  document.getElementById("product-grid").innerHTML=products.map(p=>`
    <article class="product-card">
      <div class="food-image" style="background:${p.tone}">
        <span class="stock-label ${p.stock<=3?"low":""}">${p.stock>0?`Осталось: ${p.stock}`:"Нет в наличии"}</span>
        <span class="food-emoji">${p.emoji}</span>
      </div>
      <div class="product-info"><h3>${escapeHtml(p.name)}</h3><p class="product-desc">${escapeHtml(p.desc)}</p>
        <div class="product-bottom"><span class="price">${money(p.price)}</span><button class="add-button" data-add="${p.id}" aria-label="Добавить ${escapeHtml(p.name)}" ${p.stock<=0?"disabled":""}>+</button></div>
      </div>
    </article>`).join("");
  document.getElementById("cart-count").textContent=cartCount();
}
function renderCart(){
  const items=Object.entries(state.cart).filter(([id,q])=>q>0&&productById(id));
  document.getElementById("cart-items").innerHTML=items.length?items.map(([id,q])=>{
    const p=productById(id);return `<div class="cart-row"><div class="cart-thumb">${p.emoji}</div><div><h4>${escapeHtml(p.name)}</h4><small>${money(p.price)} / шт.</small><div class="quantity"><button data-qty="${id}" data-delta="-1" aria-label="Уменьшить">−</button><span>${q}</span><button data-qty="${id}" data-delta="1" aria-label="Увеличить" ${q>=p.stock?"disabled":""}>+</button></div></div><div class="cart-row-price">${money(p.price*q)}</div></div>`;
  }).join(""):`<div class="empty-cart">В корзине пока пусто.<br>Выберите блюда из меню, чтобы оформить предзаказ.</div>`;
  document.getElementById("cart-total").textContent=money(cartTotal());
  document.getElementById("cart-count").textContent=cartCount();
  document.getElementById("place-order").disabled=items.length===0;
}
function openCart(){document.getElementById("cart-drawer").classList.add("open");document.getElementById("cart-drawer").setAttribute("aria-hidden","false");document.getElementById("cart-overlay").classList.remove("hidden");renderCart()}
function closeCart(){document.getElementById("cart-drawer").classList.remove("open");document.getElementById("cart-drawer").setAttribute("aria-hidden","true");document.getElementById("cart-overlay").classList.add("hidden")}
function addToCart(id){
  const p=productById(id);if(!p||p.stock<=0)return;
  const current=state.cart[id]||0;
  if(current>=p.stock){toast("Больше нет доступного количества");return}
  state.cart[id]=current+1;saveState();renderProducts();renderCart();toast("Добавлено в корзину");
}
function changeQuantity(id,delta){
  const p=productById(id);if(!p)return;
  const next=(state.cart[id]||0)+delta;
  if(next<=0)delete state.cart[id];else if(next<=p.stock)state.cart[id]=next;else{toast("Недостаточно остатка");return}
  saveState();renderProducts();renderCart();
}
function placeOrder(){
  const entries=Object.entries(state.cart).filter(([id,q])=>q>0);
  if(!entries.length)return;
  // Revalidate stock at confirmation time.
  for(const [id,q] of entries){const p=productById(id);if(!p||p.stock<q){toast("Остатки изменились. Проверьте корзину.");renderCart();return}}
  const payment=document.querySelector('input[name="payment"]:checked')?.value||"online";
  const order={
    number:state.nextOrder++,
    name:document.getElementById("customer-name").value.trim()||"Покупатель",
    createdAt:new Date().toISOString(),
    items:entries.map(([id,q])=>({id,name:productById(id).name,price:productById(id).price,qty:q,emoji:productById(id).emoji})),
    total:cartTotal(),
    payment,
    paid:payment==="online",
    status:"Принят"
  };
  // Demo-only stock reservation in this browser.
  entries.forEach(([id,q])=>productById(id).stock-=q);
  state.orders.unshift(order);state.cart={};saveState();closeCart();renderAll();
  document.getElementById("new-order-number").textContent=order.number;
  document.getElementById("new-order-status").textContent=order.status;
  document.getElementById("order-modal").classList.remove("hidden");
}
function renderOrders(){
  const root=document.getElementById("orders-list");
  if(!state.orders.length){root.innerHTML='<div class="order-card"><p>Пока нет заказов. Создайте демонстрационный заказ в меню.</p></div>';return}
  root.innerHTML=state.orders.map(o=>`<article class="order-card"><div class="order-card-head"><h3>Заказ № ${o.number}</h3><span class="status-badge">${escapeHtml(o.status)}</span></div><p>${new Date(o.createdAt).toLocaleString("ru-RU")} · ${o.items.map(i=>`${escapeHtml(i.name)} × ${i.qty}`).join(", ")}<br>Оплата: ${o.payment==="online"?"онлайн (демо)":"при получении"} · ${o.paid?"оплачен в демо-сценарии":"ожидает оплаты"}<br><b>Итого: ${money(o.total)}</b></p></article>`).join("");
}
function renderAdmin(){
  const total=state.orders.length, pending=state.orders.filter(o=>o.status!=="Выдан").length, revenue=state.orders.filter(o=>o.paid).reduce((s,o)=>s+o.total,0);
  document.getElementById("admin-stats").innerHTML=`<div class="stat-card"><small>Всего заказов</small><strong>${total}</strong></div><div class="stat-card"><small>В работе</small><strong>${pending}</strong></div><div class="stat-card"><small>Онлайн-заказы · демо</small><strong>${money(revenue)}</strong></div>`;
  const orderRoot=document.getElementById("admin-orders");
  orderRoot.innerHTML=state.orders.length?state.orders.map(o=>`<div class="admin-order"><div class="admin-order-head"><span>№ ${o.number} · ${escapeHtml(o.name)}</span><span>${money(o.total)}</span></div><p>${o.items.map(i=>`${escapeHtml(i.name)} × ${i.qty}`).join(", ")}<br>${o.payment==="online"?(o.paid?"Оплата отмечена в демо":"Ожидает оплаты"):"Оплата при получении"}</p><div class="admin-order-controls"><select class="status-select" data-status="${o.number}">${["Принят","Готов к выдаче","Выдан","Отменён"].map(s=>`<option ${o.status===s?"selected":""}>${s}</option>`).join("")}</select>${o.payment==="onsite"&&!o.paid?`<button class="small-button" data-paid="${o.number}">Подтвердить оплату</button>`:""}</div></div>`).join(""):'<p class="empty-cart">Заказов пока нет.</p>';
  document.getElementById("stock-controls").innerHTML=state.products.map(p=>`<label class="stock-row"><span>${p.emoji} ${escapeHtml(p.name)}</span><input class="stock-input" type="number" min="0" max="999" value="${p.stock}" data-stock="${p.id}" aria-label="Остаток ${escapeHtml(p.name)}"></label>`).join("");
}
function renderAll(){renderProducts();renderCart();renderOrders();renderAdmin()}
function showView(view){
  document.getElementById("orders-view").classList.toggle("hidden",view!=="orders");
  document.getElementById("admin-view").classList.toggle("hidden",view!=="admin");
  document.getElementById("menu-section").classList.toggle("hidden",view!=="menu");
  document.querySelector(".how-section").classList.toggle("hidden",view!=="menu");
  document.querySelectorAll(".nav-link").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  if(view!=="menu")document.getElementById(view+"-view").scrollIntoView({behavior:"smooth",block:"start"});
  else document.getElementById("menu-section").scrollIntoView({behavior:"smooth",block:"start"});
}

document.addEventListener("click",e=>{
  const add=e.target.closest("[data-add]");if(add){addToCart(add.dataset.add);return}
  const qty=e.target.closest("[data-qty]");if(qty){changeQuantity(qty.dataset.qty,Number(qty.dataset.delta));return}
  const nav=e.target.closest("[data-view]");if(nav){showView(nav.dataset.view);return}
  const paid=e.target.closest("[data-paid]");if(paid){const o=state.orders.find(x=>x.number===Number(paid.dataset.paid));if(o){o.paid=true;saveState();renderAll();toast("Оплата отмечена в демо-режиме")}return}
});
document.addEventListener("change",e=>{
  if(e.target.matches("[data-status]")){const o=state.orders.find(x=>x.number===Number(e.target.dataset.status));if(o){o.status=e.target.value;saveState();renderAll();toast("Статус заказа обновлён")}}
  if(e.target.matches("[data-stock]")){const p=productById(e.target.dataset.stock);if(p){p.stock=Math.max(0,Math.min(999,Number(e.target.value)||0));saveState();renderAll();toast("Остаток обновлён")}}
});
document.querySelectorAll(".filter").forEach(btn=>btn.addEventListener("click",()=>{
  activeFilter=btn.dataset.filter;document.querySelectorAll(".filter").forEach(b=>b.classList.toggle("active",b===btn));renderProducts();
}));
document.getElementById("cart-toggle").addEventListener("click",openCart);
document.getElementById("close-cart").addEventListener("click",closeCart);
document.getElementById("cart-overlay").addEventListener("click",closeCart);
document.getElementById("place-order").addEventListener("click",placeOrder);
document.getElementById("close-modal").addEventListener("click",()=>document.getElementById("order-modal").classList.add("hidden"));
document.getElementById("modal-done").addEventListener("click",()=>document.getElementById("order-modal").classList.add("hidden"));
document.getElementById("browse-menu").addEventListener("click",()=>document.getElementById("menu-section").scrollIntoView({behavior:"smooth"}));
document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeCart();document.getElementById("order-modal").classList.add("hidden")}});
renderAll();
