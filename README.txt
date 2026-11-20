AMAYA BOOTH SALES  (HTML + CSS + JS + PHP, works with NO internet)
====================================================================

WHAT IT DOES
  Sell      Pick an item, set the quantity (+ / -), tap "Add sale". Pick the day at the top.
  Items     The main log: add an item with name, owner, price and starting quantity.
            Shows sold, left and sales per item. Tap Edit to fix or delete.
  Sales log Every sale of a day (or all days). Tap X to delete a mistake.
  Sheet     Same layout as your Excel: Owner | Products | Price | Whole qty | Sold | Remaining |
            Total sold item | Whole sales  (choose Day 1-4 or All days).
  Payout    Per owner: sales, AMAYA share, what the owner gets. AMAYA-owned booths = 100% AMAYA.
  Export    Day receipt as .txt, Excel (.xlsx), or CSV (sales / payout). Also Print.
  Settings  Booth name, AMAYA share %, which owners are AMAYA-owned, dates of Day 1-4,
            "Load starter items" (your booth products), backup / restore, delete all sales.

HOW TO RUN IT WITHOUT WI-FI
  Option A - ONE device (simplest, no PHP needed)
    Unzip, double-click index.html. Data is saved inside that browser on that device.
    (Use the same browser every time. Download a backup from Settings each night.)

  Option B - SHARED by many cashiers (needs PHP on one laptop)
    1. Install PHP once (XAMPP for Windows is fine) - or any PHP 7.4+.
    2. Turn on the laptop's Mobile Hotspot (or use a phone hotspot/any router).
       Internet is NOT needed - the hotspot is only the local network.
    3. Windows: double-click start.bat.   Mac/Linux: run ./start.sh
    4. On the laptop open http://localhost:8000
       On phones connected to that hotspot open  http://<laptop-IP>:8000
       (start.bat prints the IP, e.g. http://192.168.137.1:8000)
    5. Everyone sees the same items and sales (updates every 5 seconds).
    Data is stored in data/db.json on the laptop.
  The badge at the top shows "Shared (server)" or "This device only" so you know which mode you are in.

  Alternative: copy the whole folder into XAMPP's htdocs and open http://localhost/amaya-booth/

CATEGORIES (admin: Items tab)
  Items > Categories: add a category, pick its color, rename it, or delete it (items stay, they just
  become uncategorized). Set an item's category when you add it, from the Category dropdown in the
  item table, or in Edit. On the Sell tab, tap a category button to show only those items; items
  have a colored edge matching their category. Payout tab shows sales by category, and the Excel
  export has a Categories sheet.
  Settings > Load starter items fills in categories for the booth products (also for items you
  already loaded).

LOGIN / CASHIERS
  First time: the app asks you to create the ADMIN account (name + 4-8 digit PIN).
  Settings > Cashiers & admins: add every cashier with their own PIN (Reset PIN / Remove there too).
  Each device logs in once per day; the name is saved on every sale (Sales log, receipt, Excel,
  Payout > Cashier totals). Cashiers see Sell, Sales log and Sheet only, and can delete only
  their own sales. Admins see everything.
  NOTE: the PIN is a convenience lock to know who sold what - not bank-level security.

LOGO AND BACKGROUND
  Put your own pictures in the img/ folder, then refresh:
    img/logo.png        square image (e.g. 300x300), shown in the header and login screen
    img/background.jpg  wide picture (e.g. 1600x900), shown behind everything
  If these files are missing, the built-in img/logo.svg and img/background.svg are used.
  (Your browser may show a harmless 404 for the missing .png/.jpg until you add them.)

DAILY ROUTINE
  Morning: choose today's Day at the top (Day 1-4).
  Evening: Export > Receipt/Excel, then Settings > Download backup.

PAYOUT RULE
  Owner sales x AMAYA % (Settings) = AMAYA share; the rest is the owner's payout.
  Owners listed in "AMAYA-owned booths" (default: AMAYA) keep 100% for AMAYA.

FILES
  index.html, css/style.css, js/core.js (calculations), js/xlsx.js (Excel writer),
  js/app.js (screens), api.php (saves data), data/db.json (created automatically),
  img/ (logo + background).
