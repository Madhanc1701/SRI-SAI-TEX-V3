# SRI SAI TEX - Textile Management Portal

A mobile-first web application for managing textile business operations, built with React, Express, and Supabase.

## Features

### Owner Portal
- **Billing**: Create and manage bills with auto-generated PDF.
- **Sales Tracking**: View and filter sales data.
- **Stock Management**: Track raw material purchases.
- **Labour Management**: Create labour accounts and manage profiles.
- **Salary**: Calculate and track labour payments.

### Labour Portal
- **Profile**: Manage personal details and UPI QR code.
- **Work Recording**: Log daily work details.
- **History**: View work history.
- **Salary Status**: Check payment status.

## Setup Instructions

### 1. Supabase Setup

1.  **Create a Supabase Project**: Go to [Supabase](https://supabase.com/) and create a new project.
2.  **Database Schema**:
    *   Go to the **SQL Editor** in your Supabase dashboard.
    *   Copy the content of `supabase/schema.sql` (created below) and run it.
3.  **Storage**:
    *   Go to **Storage** and create a new public bucket named `bills`.
    *   Create another public bucket named `qr_codes` (for UPI QRs).
4.  **Auth**:
    *   Go to **Authentication** -> **Providers** and enable **Email/Password**.
    *   Disable "Confirm email" if you want instant login for testing, or keep it enabled for production.

### 2. Environment Variables

You need to provide the following environment variables in the **Secrets** tab (Padlock icon) in Replit:

*   `SUPABASE_URL`: Your Supabase Project URL (e.g., `https://xyz.supabase.co`).
*   `SUPABASE_ANON_KEY`: Your Supabase Project API Anon Key.
*   `SUPABASE_SERVICE_ROLE_KEY`: Your Supabase Project API Service Role Key (Found in Project Settings -> API). **Keep this secret!**
*   `DATABASE_URL`: Your Supabase Connection String (Transaction Pool mode recommended, port 6543).
    *   Format: `postgres://postgres.[project-ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres`

### 3. SQL Migration

Run the following SQL in your Supabase SQL Editor to create the necessary tables and policies:

```sql
-- Create Profiles table
create table public.profiles (
  id uuid references auth.users on delete cascade primary key,
  role text not null check (role in ('owner', 'labour')),
  labour_code text,
  name text,
  phone text,
  address text,
  upi_id text,
  upi_qr_url text,
  created_at timestamptz default now()
);

-- Enable RLS
alter table public.profiles enable row level security;

-- Policies for Profiles
create policy "Public profiles are viewable by everyone" on profiles
  for select using (true);

create policy "Users can insert their own profile" on profiles
  for insert with check (auth.uid() = id);

create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Create Bills table
create table public.bills (
  id uuid default gen_random_uuid() primary key,
  bill_no text unique not null,
  owner_user_id uuid references auth.users(id) not null,
  company_name text not null,
  bill_date date not null,
  total_amount numeric default 0,
  pdf_url text,
  created_at timestamptz default now()
);

-- Create Bill Items table
create table public.bill_items (
  id uuid default gen_random_uuid() primary key,
  bill_id uuid references public.bills(id) on delete cascade,
  sl_no int,
  colour text,
  illai int,
  length_m int,
  quantity int,
  amount numeric,
  created_at timestamptz default now()
);

-- Create Stocks table
create table public.stocks (
  id uuid default gen_random_uuid() primary key,
  stock_no text unique not null,
  owner_user_id uuid references auth.users(id) not null,
  stock_date date not null,
  total_amount numeric default 0,
  created_at timestamptz default now()
);

-- Create Stock Items table
create table public.stock_items (
  id uuid default gen_random_uuid() primary key,
  stock_id uuid references public.stocks(id) on delete cascade,
  sl_no int,
  colour text,
  no int,
  weight int,
  amount numeric,
  created_at timestamptz default now()
);

-- Create Labour Work Records table
create table public.labour_work_records (
  id uuid default gen_random_uuid() primary key,
  labour_user_id uuid references auth.users(id) not null,
  work_date date default current_date not null,
  sl_no int,
  colour text,
  length int,
  illai int,
  set_count int,
  amount numeric,
  created_at timestamptz default now()
);

-- Create Salary Payments table
create table public.salary_payments (
  id uuid default gen_random_uuid() primary key,
  owner_user_id uuid references auth.users(id) not null,
  labour_user_id uuid references auth.users(id) not null,
  work_record_id uuid references public.labour_work_records(id) on delete set null,
  salary_amount numeric not null,
  status text check (status in ('PENDING', 'PAID')) default 'PENDING',
  paid_date date,
  created_at timestamptz default now()
);

-- Enable RLS on all tables (Simplified for now - strictly Owner/Labour roles)
alter table bills enable row level security;
alter table bill_items enable row level security;
alter table stocks enable row level security;
alter table stock_items enable row level security;
alter table labour_work_records enable row level security;
alter table salary_payments enable row level security;

-- Policies (Simplified: authenticated users can read/write for demo purposes, refine for production)
create policy "Enable all access for authenticated users" on bills for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on bill_items for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on stocks for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on stock_items for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on labour_work_records for all using (auth.role() = 'authenticated');
create policy "Enable all access for authenticated users" on salary_payments for all using (auth.role() = 'authenticated');

```
