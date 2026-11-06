create type public.app_role as enum ('admin','user');
create table public.user_roles (id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade not null, role app_role not null, unique(user_id, role));
grant select on public.user_roles to authenticated; grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create or replace function public.has_role(_user_id uuid, _role app_role) returns boolean language sql stable security definer set search_path=public as $$ select exists(select 1 from public.user_roles where user_id=_user_id and role=_role) $$;
create policy "own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

-- first user becomes admin
create or replace function public.handle_new_user_role() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if not exists (select 1 from public.user_roles where role='admin') then
    insert into public.user_roles(user_id, role) values (new.id,'admin');
  end if;
  insert into public.user_roles(user_id, role) values (new.id,'user') on conflict do nothing;
  return new;
end $$;
create trigger on_auth_user_created_role after insert on auth.users for each row execute function public.handle_new_user_role();

create table public.categories (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, image_url text, created_at timestamptz not null default now());
grant select on public.categories to anon, authenticated; grant insert, update, delete on public.categories to authenticated; grant all on public.categories to service_role;
alter table public.categories enable row level security;
create policy "public read cats" on public.categories for select to anon, authenticated using (true);
create policy "admin write cats" on public.categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.products (id uuid primary key default gen_random_uuid(), name text not null, slug text not null unique, description text not null default '', price numeric(10,2) not null default 0, compare_at_price numeric(10,2), image_url text, category_id uuid references public.categories(id) on delete set null, stock int not null default 0, featured boolean not null default false, rating numeric(2,1) not null default 4.5, active boolean not null default true, created_at timestamptz not null default now());
grant select on public.products to anon, authenticated; grant insert, update, delete on public.products to authenticated; grant all on public.products to service_role;
alter table public.products enable row level security;
create policy "public read products" on public.products for select to anon, authenticated using (active or public.has_role(auth.uid(),'admin'));
create policy "admin write products" on public.products for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

create table public.wishlist (id uuid primary key default gen_random_uuid(), user_id uuid not null, product_id uuid not null references public.products(id) on delete cascade, created_at timestamptz not null default now(), unique(user_id, product_id));
grant select, insert, delete on public.wishlist to authenticated; grant all on public.wishlist to service_role;
alter table public.wishlist enable row level security;
create policy "own wishlist" on public.wishlist for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create table public.orders (id uuid primary key default gen_random_uuid(), user_id uuid not null, status text not null default 'pending', total numeric(10,2) not null default 0, full_name text not null, email text not null, address text not null, city text not null, postal_code text not null, country text not null, phone text, payment_method text not null default 'cod', created_at timestamptz not null default now(), updated_at timestamptz not null default now());
grant select, insert, update on public.orders to authenticated; grant all on public.orders to service_role;
alter table public.orders enable row level security;
create policy "own orders read" on public.orders for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin update orders" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));

create table public.order_items (id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade, product_id uuid references public.products(id) on delete set null, name text not null, price numeric(10,2) not null, quantity int not null, image_url text);
grant select on public.order_items to authenticated; grant all on public.order_items to service_role;
alter table public.order_items enable row level security;
create policy "own items read" on public.order_items for select to authenticated using (exists(select 1 from public.orders o where o.id=order_id and (o.user_id=auth.uid() or public.has_role(auth.uid(),'admin'))));

-- secure order placement: prices from DB, stock decremented
create or replace function public.place_order(_items jsonb, _full_name text, _email text, _address text, _city text, _postal text, _country text, _phone text)
returns uuid language plpgsql security definer set search_path=public as $$
declare _oid uuid; _it jsonb; _p record; _total numeric := 0; _q int;
begin
  if auth.uid() is null then raise exception 'Not signed in'; end if;
  if jsonb_array_length(_items) = 0 then raise exception 'Cart is empty'; end if;
  insert into orders(user_id, full_name, email, address, city, postal_code, country, phone) values (auth.uid(), _full_name, _email, _address, _city, _postal, _country, _phone) returning id into _oid;
  for _it in select * from jsonb_array_elements(_items) loop
    _q := greatest(1, (_it->>'quantity')::int);
    select * into _p from products where id = (_it->>'product_id')::uuid and active for update;
    if not found then raise exception 'Product unavailable'; end if;
    if _p.stock < _q then raise exception 'Not enough stock for %', _p.name; end if;
    update products set stock = stock - _q where id = _p.id;
    insert into order_items(order_id, product_id, name, price, quantity, image_url) values (_oid, _p.id, _p.name, _p.price, _q, _p.image_url);
    _total := _total + _p.price * _q;
  end loop;
  update orders set total = _total where id = _oid;
  return _oid;
end $$;
grant execute on function public.place_order to authenticated;

insert into public.categories(name, slug, image_url) values
('Audio','audio','/images/cat-audio.jpg'),('Watches','watches','/images/cat-watches.jpg'),('Bags','bags','/images/cat-bags.jpg'),('Home','home','/images/cat-home.jpg');

insert into public.products(name, slug, description, price, compare_at_price, image_url, category_id, stock, featured, rating) values
('Aura Wireless Headphones','aura-headphones','Studio-grade sound with adaptive noise cancelling and 40-hour battery life, wrapped in brushed aluminium and soft vegan leather.',349,399,'/images/p-headphones.jpg',(select id from categories where slug='audio'),24,true,4.8),
('Orbit Portable Speaker','orbit-speaker','A sculptural 360° speaker with room-filling bass and a woven fabric shell.',189,null,'/images/p-speaker.jpg',(select id from categories where slug='audio'),40,false,4.6),
('Meridian Chronograph','meridian-watch','Sapphire crystal, Swiss movement and a hand-finished copper dial.',620,720,'/images/p-watch.jpg',(select id from categories where slug='watches'),12,true,4.9),
('Nocturne Minimal Watch','nocturne-watch','Ultra-thin 36mm case with a matte black dial and Milanese strap.',280,null,'/images/p-watch2.jpg',(select id from categories where slug='watches'),30,false,4.5),
('Atelier Leather Tote','atelier-tote','Full-grain Italian leather tote, hand-stitched, with a padded laptop sleeve.',410,null,'/images/p-tote.jpg',(select id from categories where slug='bags'),18,true,4.7),
('Voyage Weekender','voyage-weekender','Waxed canvas and leather weekender built for 48-hour escapes.',295,340,'/images/p-weekender.jpg',(select id from categories where slug='bags'),15,false,4.6),
('Ember Ceramic Lamp','ember-lamp','Hand-thrown ceramic base with a linen shade and warm dimmable glow.',160,null,'/images/p-lamp.jpg',(select id from categories where slug='home'),35,true,4.7),
('Stone Aroma Diffuser','stone-diffuser','Ultrasonic diffuser carved from natural travertine.',120,140,'/images/p-diffuser.jpg',(select id from categories where slug='home'),50,false,4.4);