# Macros Agent Setup Guide

## Overview
The Macros Agent has been successfully created based on the requirements in `macrosdoc.md`. This agent processes Excel files (Raw File and SKU File) to generate processed data with formulas, pivot tables, and reports.

## What Was Created

### 1. Database Tables
- **process_1**: Stores all processed data from the main sheet with all required columns
- **pivot**: Stores pivot table data grouped by Seller Gstin, Final Invoice No., Ship To State Tally Ledger, and FG

### 2. Models
- `backend/models/Process1.js` - Sequelize model for process_1 table
- `backend/models/Pivot.js` - Sequelize model for pivot table

### 3. Processing Module
- `backend/modules/Macros/macrosProcessor.js` - Core processing logic that:
  - Inserts columns (FG, Ship To State Tally Ledger, Final Invoice No., etc.)
  - Applies formulas (VLOOKUP, tax calculations, conditional formulas)
  - Generates pivot table data
  - Creates Report1 sheet

### 4. API Endpoints
- `backend/controllers/macrosController.js` - Controller with all business logic
- `backend/routes/macrosRoutes.js` - API routes

### 5. Agent Registration
- `backend/seeders/seed-macros-agent.js` - Seeder to create macros agent in agents table

## Setup Instructions

### 1. Install Dependencies
```bash
cd backend
npm install
```
This will install `exceljs` which is required for Excel processing.

### 2. Run Migrations
```bash
npx sequelize-cli db:migrate
```
This will create the `process_1` and `pivot` tables.

### 3. Seed Macros Agent
```bash
npx sequelize-cli db:seed --seed seed-macros-agent.js
```
This will create the macros agent entry in the agents table.

### 4. Start Server
```bash
npm start
```

## API Endpoints

### Generate Macros
**POST** `/api/macros/generate`

Upload Raw File and SKU File to generate macros.

**Request:**
- Method: POST
- Content-Type: multipart/form-data
- Body:
  - `rawFile`: Excel file (Raw File with "Proccess 1" sheet)
  - `skuFile`: Excel file (SKU File with "Source" sheet)
  - `brandName`: Brand name (e.g., "Amazon", "Flipkart", "Blinkit")
  - `date`: Date/Month (e.g., "Jan", "January", "2024-01")

**Example using Postman:**
1. Select POST method
2. URL: `http://localhost:5000/api/macros/generate`
3. Go to Body tab → Select `form-data`
4. Add fields:
   - `rawFile` (type: File) - Select your raw Excel file
   - `skuFile` (type: File) - Select your SKU Excel file
   - `brandName` (type: Text) - Enter "Amazon"
   - `date` (type: Text) - Enter "Jan"
5. Send request

**Response:**
```json
{
  "success": true,
  "message": "Macros generated successfully",
  "data": {
    "brandName": "Amazon",
    "date": "Jan",
    "process1RecordCount": 1500,
    "pivotRecordCount": 120,
    "outputFile": "macros_Amazon_Jan_uuid.xlsx",
    "pivotFile": "pivot_Amazon_Jan_uuid.xlsx"
  }
}
```

### Get All Brands
**GET** `/api/macros/brands`

Returns list of all unique brands that have generated macros.

**Response:**
```json
{
  "success": true,
  "data": ["Amazon", "Flipkart", "Blinkit"]
}
```

### Get Files by Brand
**GET** `/api/macros/brand/:brandName`

Get all files (brand name and date combinations) for a specific brand.

**Example:**
- `GET /api/macros/brand/Amazon`

**Response:**
```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "brandName": "Amazon",
      "date": "Jan",
      "createdAt": "2024-01-01T00:00:00.000Z"
    },
    {
      "brandName": "Amazon",
      "date": "Feb",
      "createdAt": "2024-02-01T00:00:00.000Z"
    }
  ]
}
```

### Get Process1 Data
**GET** `/api/macros/process1/:brandName/:date`

Get all Process1 records for a specific brand and date.

**Example:**
- `GET /api/macros/process1/Amazon/Jan`

### Get Pivot Data
**GET** `/api/macros/pivot/:brandName/:date`

Get all Pivot records for a specific brand and date.

**Example:**
- `GET /api/macros/pivot/Amazon/Jan`

## Processing Details

The Macros processor performs the following operations:

### STEP 1: Insert Columns & Rename Headers
- Inserts "FG" column after "Sku"
- Inserts "Ship To State Tally Ledger" and "Final Invoice No." after "Ship To State"
- Inserts 9 columns after "Compensatory Cess Tax" (Final Tax rate, Final Taxable Sales Value, etc.)
- Inserts "Final Amount Receivable" after "Tcs Igst Amount"

### STEP 2: Apply Formulas
- Column O: `=VLOOKUP(N2,Source!$A:$C,2,FALSE)`
- Column AA: `=VLOOKUP(Z2,Source!$F:$G,2,0)`
- Column AB: `=VLOOKUP(AA2,Source!$G$1:$H$37,2,FALSE)`
- Column AT: `=AH2+AK2`
- Column AU: `=AF2-AV2`
- Column AV: `=BD2+BK2+BU2+BX2`
- Column AW: `=IF(V2=Z2,(AU2)*AT2,0)`
- Column AX: Same as AW
- Column AY: `=IF(V2<>Z2,(AU2)*AT2,0)`
- Column AZ: `=IF(V2=Z2,(AV2)*AT2,0)`
- Column BA: Same as AZ
- Column BB: Same as AY
- Column CH: `=AU2+AV2+AW2+AX2+AY2+AZ2+BA2+BB2-CA2-CC2-CG2`

### STEP 3: Generate Pivot Table
Groups by:
- Seller Gstin
- Final Invoice No.
- Ship To State Tally Ledger
- FG

Sums:
- Quantity
- Final Taxable Sales Value
- Final CGST Tax
- Final SGST Tax
- Final IGST Tax
- Final Taxable Shipping Value
- Final Shipping CGST Tax
- Final Shipping SGST Tax
- Final Shipping IGST Tax
- Tcs Cgst Amount
- Tcs Sgst Amount
- Tcs Igst Amount
- Final Amount Receivable

### STEP 4 & 5: Generate Report1
- Copies pivot data as values only (no formulas)
- Creates Report1 sheet

## File Storage

- Generated output files are stored in: `backend/outputs/macros/`
- Files are named: `macros_{brandName}_{date}_{uuid}.xlsx` and `pivot_{brandName}_{date}_{uuid}.xlsx`

## Database Schema

### process_1 Table
Contains all columns from the processed main sheet including:
- brand_name, date (user provided)
- All invoice, order, shipment details
- All tax calculations
- All final calculated values

### pivot Table
Contains aggregated data grouped by:
- brand_name, date (user provided)
- seller_gstin, final_invoice_no, ship_to_state_tally_ledger, fg
- Sum of all quantity and tax values

## Workflow

1. User selects brand (Amazon, Flipkart, Blinkit)
2. System shows previously created files for that brand (with brand name and date)
3. User clicks "Create New"
4. User uploads Raw File and SKU File, enters brand name and date
5. User clicks "Generate"
6. System processes files, applies formulas, generates pivot
7. Data is saved to process_1 and pivot tables
8. New file instance is shown with brand name and date

## Notes

- The processor handles up to 50,000 rows by default
- Column detection is case-sensitive for header names
- If a required column is not found, that operation is skipped with a warning
- Formulas are applied using ExcelJS formula support
- Pivot tables are generated using JavaScript logic (not native Excel pivots)
- All data is stored in the database for easy retrieval and display




