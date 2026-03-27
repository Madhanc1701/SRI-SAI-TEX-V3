import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import puppeteer from "puppeteer";
import { supabaseAdmin } from "./lib/supabase";

function generateBillHtml(bill: any, items: any[]): string {
  return `
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Arial', sans-serif; padding: 32px; color: #222; font-size: 13px; }
          .header { text-align: center; margin-bottom: 24px; border-bottom: 2px solid #1a56db; padding-bottom: 16px; }
          .header h1 { font-size: 26px; color: #1a56db; letter-spacing: 2px; font-weight: 700; }
          .header p { color: #555; font-size: 11px; margin-top: 2px; }
          .meta { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .meta-block p { margin-bottom: 4px; }
          .meta-block .label { font-weight: 700; color: #1a56db; font-size: 11px; text-transform: uppercase; }
          .meta-block .value { font-size: 14px; font-weight: 600; }
          table { width: 100%; border-collapse: collapse; margin-top: 8px; }
          thead tr { background: #1a56db; color: #fff; }
          thead th { padding: 9px 10px; text-align: left; font-size: 12px; font-weight: 600; }
          tbody tr:nth-child(odd) { background: #f4f7fe; }
          tbody td { padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
          .total-row { margin-top: 16px; text-align: right; }
          .total-row span { font-size: 18px; font-weight: 700; color: #1a56db; }
          .footer { margin-top: 48px; text-align: center; font-size: 11px; color: #888; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>SRI SAI TEX</h1>
          <p>Textile Business Invoice</p>
        </div>
        <div class="meta">
          <div class="meta-block">
            <p class="label">Bill To</p>
            <p class="value">${bill.companyName}</p>
          </div>
          <div class="meta-block" style="text-align:right">
            <p class="label">Bill No</p>
            <p class="value">#${bill.billNo}</p>
            <p class="label" style="margin-top:8px">Date</p>
            <p class="value">${bill.billDate}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Sl.No</th>
              <th>Colour</th>
              <th>Illai</th>
              <th>Length (m)</th>
              <th>Quantity</th>
              <th style="text-align:right">Amount (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${items.map((item: any) => `
              <tr>
                <td>${item.slNo}</td>
                <td>${item.colour || '-'}</td>
                <td>${item.illai ?? '-'}</td>
                <td>${item.lengthM ?? '-'}</td>
                <td>${item.quantity ?? '-'}</td>
                <td style="text-align:right">${item.amount ? Number(item.amount).toLocaleString() : '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        <div class="total-row">
          Total Amount: <span>₹${Number(bill.totalAmount).toLocaleString()}</span>
        </div>
        <div class="footer">Thank you for your business! — Sri Sai Tex</div>
      </body>
    </html>
  `;
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // --- Auth & Profiles ---
  app.get(api.auth.me.path, async (req, res) => {
    // This route is a bit tricky since client auth is handled by Supabase on client.
    // Ideally, the client sends a token and we verify it here.
    // For now, we will assume the client fetches its own user from Supabase, 
    // and then calls this endpoint WITH the user ID to get the profile. 
    // BUT the route definition is just GET /api/auth/me.
    // Let's implement a simpler flow: Client handles Auth. 
    // We provide profile endpoints.
    res.status(501).json({ message: "Not implemented, use client-side auth" });
  });

  // NOTE: /labour routes MUST be registered before /:id to avoid Express
  // treating the literal string "labour" as a UUID param.
  app.get(api.profiles.listLabour.path, async (req, res) => {
    const profiles = await storage.getLabourProfiles();
    res.json(profiles);
  });

  app.post(api.profiles.createLabour.path, async (req, res) => {
    try {
      const input = api.profiles.createLabour.input.parse(req.body);
      const profile = await storage.createLabourUser(input);
      // We don't return the full auth user object here to keep it simple,
      // just the profile. The client can't login as them anyway without the password
      // which we just set.
      res.status(201).json({ user: { id: profile.id }, profile });
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Failed to create labour user" });
    }
  });

  app.get(api.profiles.get.path, async (req, res) => {
    const profile = await storage.getProfile(req.params.id);
    if (!profile) return res.status(404).json({ message: "Profile not found" });
    res.json(profile);
  });

  app.patch(api.profiles.update.path, async (req, res) => {
    try {
      const input = api.profiles.update.input.parse(req.body);
      const profile = await storage.updateProfile(req.params.id, input);
      res.json(profile);
    } catch (err) {
      res.status(400).json({ message: "Invalid input" });
    }
  });


  // --- Bills ---
  // NOTE: Static sub-paths must be registered BEFORE /:id routes
  app.get('/api/bills/next-bill-no', async (req, res) => {
    const nextNo = await storage.getNextBillNo();
    res.json({ billNo: String(nextNo) });
  });

  app.get('/api/bills/frequent-companies', async (req, res) => {
    const companies = await storage.getFrequentCompanies(5);
    res.json(companies);
  });

  app.get(api.bills.list.path, async (req, res) => {
    const filters = req.query as any;
    const bills = await storage.getBills(filters);
    res.json(bills);
  });

  app.get(api.bills.get.path, async (req, res) => {
    const bill = await storage.getBill(req.params.id);
    if (!bill) return res.status(404).json({ message: "Bill not found" });
    const items = await storage.getBillItems(req.params.id);
    res.json({ bill, items });
  });

  // PDF generation endpoint - streams PDF bytes directly
  app.get('/api/bills/:id/pdf', async (req, res) => {
    try {
      const bill = await storage.getBill(req.params.id);
      if (!bill) return res.status(404).json({ message: "Bill not found" });
      const items = await storage.getBillItems(req.params.id);

      const htmlContent = generateBillHtml(bill, items);

      const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
      const page = await browser.newPage();
      await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
      await browser.close();

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="Bill-${bill.billNo}.pdf"`);
      res.send(Buffer.from(pdfBuffer));
    } catch (err: any) {
      console.error('PDF generation error:', err);
      res.status(500).json({ message: 'Failed to generate PDF' });
    }
  });

  app.post(api.bills.create.path, async (req, res) => {
    try {
      const { bill, items } = api.bills.create.input.parse(req.body);

      // 1. Save to DB
      const newBill = await storage.createBill(bill, items);

      // 2. Generate PDF
      // TODO: Move PDF generation to a separate function/file
      let pdfUrl = undefined;
      try {
        const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox'] });
        const page = await browser.newPage();

        const htmlContent = generateBillHtml(newBill, items);

        await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
        const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true });
        await browser.close();

        // 3. Upload to Supabase Storage
        const fileName = `bills/${newBill.billNo}.pdf`;
        const { data, error } = await supabaseAdmin.storage
          .from('bills')
          .upload(fileName, pdfBuffer, {
            contentType: 'application/pdf',
            upsert: true
          });

        if (!error) {
          const { data: publicUrlData } = supabaseAdmin.storage
            .from('bills')
            .getPublicUrl(fileName);
          pdfUrl = publicUrlData.publicUrl;

          // Update bill with PDF URL (quick update)
          // ideally storage should have updateBill method
        } else {
          console.error("Supabase Storage Upload Error:", error);
        }

      } catch (pdfErr) {
        console.error("PDF Generation Error:", pdfErr);
        // Don't fail the request if PDF fails, just log it. 
        // In production, we might want a queue or retry.
      }

      res.status(201).json({ bill: newBill, pdfUrl });

    } catch (err: any) {
      console.error(err);
      res.status(400).json({ message: err.message || "Invalid input" });
    }
  });

  app.patch(api.bills.get.path, async (req, res) => {
    try {
      const { bill, items } = req.body;
      const updatedBill = await storage.updateBill(req.params.id, bill, items || []);
      res.json({ bill: updatedBill });
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ message: err.message || "Failed to update bill" });
    }
  });

  // --- Stocks ---
  // NOTE: Static sub-paths must be registered BEFORE /:id routes
  app.get('/api/stocks/next-stock-no', async (req, res) => {
    const nextNo = await storage.getNextStockNo();
    res.json({ stockNo: String(nextNo) });
  });

  app.get(api.stocks.list.path, async (req, res) => {
    const filters = req.query as any;
    const stocks = await storage.getStocks(filters);
    res.json(stocks);
  });

  app.get('/api/stocks/:id', async (req, res) => {
    const stock = await storage.getStock(req.params.id);
    if (!stock) return res.status(404).json({ message: 'Stock not found' });
    const items = await storage.getStockItems(req.params.id);
    res.json({ stock, items });
  });

  app.patch('/api/stocks/:id', async (req, res) => {
    try {
      const { stock, items } = req.body;
      const updatedStock = await storage.updateStock(req.params.id, stock, items || []);
      res.json({ stock: updatedStock });
    } catch (err: any) {
      console.error(err);
      res.status(400).json({ message: err.message || 'Failed to update stock' });
    }
  });

  app.post(api.stocks.create.path, async (req, res) => {
    try {
      const { stock, items } = api.stocks.create.input.parse(req.body);
      const newStock = await storage.createStock(stock, items);
      res.status(201).json(newStock);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid input" });
    }
  });

  // --- Labour Work ---
  app.get(api.labourWork.list.path, async (req, res) => {
    const filters = req.query as any;
    const records = await storage.getLabourWorkRecords(filters);
    res.json(records);
  });

  app.post(api.labourWork.create.path, async (req, res) => {
    try {
      const input = api.labourWork.create.input.parse(req.body);
      const record = await storage.createLabourWorkRecord(input);
      res.status(201).json(record);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid input" });
    }
  });

  // --- Salaries ---
  app.get(api.salaries.list.path, async (req, res) => {
    const filters = req.query as any;
    const payments = await storage.getSalaryPayments(filters);
    res.json(payments);
  });

  app.post(api.salaries.create.path, async (req, res) => {
    try {
      const input = api.salaries.create.input.parse(req.body);
      const payment = await storage.createSalaryPayment(input);
      res.status(201).json(payment);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid input" });
    }
  });

  app.patch(api.salaries.update.path, async (req, res) => {
    try {
      const { status, paidDate } = api.salaries.update.input.parse(req.body);
      const payment = await storage.updateSalaryPayment(req.params.id, status, paidDate);
      res.json(payment);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid input" });
    }
  });

  // --- Rate Config ---
  app.get('/api/rate-config', async (req, res) => {
    const config = await storage.getRateConfig();
    res.json(config);
  });

  app.put('/api/rate-config', async (req, res) => {
    try {
      const input = api.rateConfig.update.input.parse(req.body);
      const updated = await storage.upsertRateConfig(input);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid input" });
    }
  });

  // --- Labour Rate Config (per-labour) ---
  app.get('/api/labour-rate-config/:labourUserId', async (req, res) => {
    const config = await storage.getLabourRateConfig(req.params.labourUserId);
    res.json(config);
  });

  app.put('/api/labour-rate-config/:labourUserId', async (req, res) => {
    try {
      const input = api.rateConfig.update.input.parse(req.body);
      const updated = await storage.upsertLabourRateConfig(req.params.labourUserId, input);
      res.json(updated);
    } catch (err: any) {
      res.status(400).json({ message: err.message || "Invalid input" });
    }
  });

  return httpServer;
}
