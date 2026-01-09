lets create a macros agent working for "Flipkart" sellar portal 

the file generated will be named as Flipkart-{Brand Name}-{month}-{year}
the generated file will have - sheets 
1. raw uploaded file names as "main-report"
2. new genertaed file from Main-report named as "working-file"
3. sheet generated from working-file, summary of working-file named as "pivot"
4. sheet with some updates of pivot named as "after-pivot"
5. from sellar portal source-sku
6. from sellar portal source-state 

working-file :-
1. add 1 column after "Sellar GSTIN"(column no. 1) named as "Seller State". if column 1 i.e Sellar GSTIN first 2 character are state code 
for ex. Sellar GSTIN : 07ABGCS4796R1Z8 (here 07 is state code of Delhi so Seller State value will be Delhi)
code State json : [
  { "code": 01, "state": "Jammu & Kashmir" },
  { "code": 02, "state": "Himachal Pradesh" },
  { "code": 03, "state": "Punjab" },
  { "code": 04, "state": "Chandigarh" },
  { "code": 05, "state": "Uttarakhand" },
  { "code": 06, "state": "Haryana" },
  { "code": 07, "state": "Delhi" },
  { "code": 08, "state": "Rajasthan" },
  { "code": 09, "state": "Uttar Pradesh" },
  { "code": 10, "state": "Bihar" },
  { "code": 11, "state": "Sikkim" },
  { "code": 12, "state": "Arunachal Pradesh" },
  { "code": 13, "state": "Nagaland" },
  { "code": 14, "state": "Manipur" },
  { "code": 15, "state": "Mizoram" },
  { "code": 16, "state": "Tripura" },
  { "code": 17, "state": "Meghalaya" },
  { "code": 18, "state": "Assam" },
  { "code": 19, "state": "West Bengal" },
  { "code": 20, "state": "Jharkhand" },
  { "code": 21, "state": "Odisha" },
  { "code": 22, "state": "Chhattisgarh" },
  { "code": 23, "state": "Madhya Pradesh" },
  { "code": 24, "state": "Gujarat" },
  { "code": 25, "state": "Dadra & Nagar Haveli and Daman & Diu" },
  { "code": 26, "state": "Dadra & Nagar Haveli and Daman & Diu (old – merged in 25)" },
  { "code": 27, "state": "Maharashtra" },
  { "code": 28, "state": "Andhra Pradesh" },
  { "code": 29, "state": "Karnataka" },
  { "code": 30, "state": "Goa" },
  { "code": 31, "state": "Lakshadweep" },
  { "code": 32, "state": "Kerala" },
  { "code": 33, "state": "Tamil Nadu" },
  { "code": 34, "state": "Puducherry" },
  { "code": 35, "state": "Andaman & Nicobar Islands" },
  { "code": 36, "state": "Telangana" },
  { "code": 37, "state": "Andhra Pradesh (New)" },
  { "code": 38, "state": "Ladakh" }
]



2. remove """" & SKU: from values of column number 7 i.e SKU 
for example: raw SKU =  """SKU:HW-LAV-500"""
		cleaned SKU = HW-LAV-500
feed this new values in SKU column 

3. add a column named as FG after column number 7 i.e SKU 
get values of FG from Source-sku sheet using Vlookup wrt reference to SKU  

4. add 10 columns after "shipping charges" i.e column number 24
column names : 
col 25 : Final -Price after discount (Price before discount-Total discount) : =IF(J5="Return",-W5,W5) 
explaination : column J header is "Event Type" , column W header is "Price after discount (Price before discount-Total discount)"	
col 26 :Final-Shipping Charges	: =IF(J5="Return",-X5,X5) 
explaination : column J header is "Event Type" , column X header is "Shipping Charges"
col 27 :Final Taxable sales value : ==Y5/AR5
explaination : column Y header is "Final -Price after discount (Price before discount-Total discount)", column AR header is "Conversion rate"
col 28 :Final Shipping Taxable value : =Z3/AR3
explaination : column Z header is "Final-Shipping Charges" , column AR header is  "Conversion rate"
col 29 :Final CGST on Taxable value : =IF(B3=BM3,(AA3)*AS3%,0) 
explaination : column B header is "Seller State", column BM header is "Customer's Delivery State", column AA header is "Final Taxable sales value" 
col 30 :Final SGST on Taxable value : =IF(B3=BM3,(AA3)*AS3%,0) 
explaination : column B header is "Seller State", column BM header is "Customer's Delivery State", column AA header is "Final Taxable sales value" , column AS header is "Final GST rate"
col 31 :Final IGST on Taxable value : =IF(B3<>BM3,(AB3)*AS3%,0)
explaination : column B header is "Seller State", column BM header is "Customer's Delivery State", column AB header is "Final Shipping Taxable value" , column AS hader is "Final GST rate"
col 32 :Final CGST on Shipping value value : =IF(B3=BM3,(AB3)*AS3%,0)
explaination : column B header is "Seller State", column BM header is "Customer's Delivery State", column AB header is "Final Shipping Taxable value" , column AS hader is "Final GST rate"
col 33 :Final SGST on Shipping value value : =IF(B3=BM3,(AB3)*AS3%,0)
explaination : column B header is "Seller State", column BM header is "Customer's Delivery State", column AB header is "Final Shipping Taxable value" , column AS hader is "Final GST rate"
col 34 :Final IGST on Shipping value : =IF(B3<>BM3,(AB3)*AS3%,0)
explaination : column B header is "Seller State", column BM header is "Customer's Delivery State", column AB header is "Final Shipping Taxable value" , column AS hader is "Final GST rate"


5. add 2 columns after AQ i.e "Luxury Cess Amount"
column names :
col 44 : Conversion rate : =IF(AS3<>12,(1.18),1.12)	
explaination : column AS header is "Final GST rate"
Final GST rate : =IF(AT3>0,(AT3),AV3)
explaination : column AT header is "IGST Rate", column AV header is "CGST Rate"

6. add 2 columns after BM i.e Customer's Delivery State
Column names :
Tally ledgers : from state-config sheet using Vlookup 
explaination : sheet state-config has columns "States, Flipkart Pay Ledger, Invoice No."
Final Invoice No.: from state-config sheet using Vlookup 
explaination : sheet state-config has columns "States, Flipkart Pay Ledger, Invoice No."

7. in "Event Sub Type" column only keep "Return" & "Sale"
make values negative of "Final -Price after discount (Price before discount-Total discount)"(col y) & "Final-Shipping Charges"(col z) & "Item Quantity"(col P) if "Event Sub Type" is RETURN 


Pivot :-
create sheet file named as pivot with columns from  working-file
Seller GSTIN	
Tally ledgers	
Final Invoice No.	
FG	
Sum of Item Quantity	
Sum of Final Taxable sales value	
Sum of Final CGST on Taxable value	
Sum of Final SGST on Taxable value	
Sum of Final IGST on Taxable value	
Sum of Final Shipping Taxable value	
Sum of Final CGST on Shipping value value	
Sum of Final SGST on Shipping value value	
Sum of Final IGST on Shipping value

After Pivot:-
copy the pivot sheet and add one column "Rate " after  "Quantity" column number 5
    Rate : G/E 
explaination : column header of G is "Taxable Sales value", column header of E is "Quantity"


Instructions : create backend API for this 
	       store data in database , modify table columns to work with respect to project
		create seperate logic files in macros with name "flipkart" as prefix 

table 1 : name = macros flipkart working file
table structure {{
	
  brandId : { type: DataTypes.STRING },
	
  seller_gstin: { type: DataTypes.STRING(15) },
  seller_state: { type: DataTypes.STRING },

  order_id: { type: DataTypes.STRING },
  order_item_id: { type: DataTypes.STRING },

  product_title: { type: DataTypes.TEXT },
  fsn: { type: DataTypes.STRING },
  sku: { type: DataTypes.STRING },
  fg: { type: DataTypes.STRING },

  hsn_code: { type: DataTypes.STRING(10) },

  event_type: { type: DataTypes.STRING },
  event_sub_type: { type: DataTypes.STRING },

  order_type: { type: DataTypes.STRING },
  fulfilment_type: { type: DataTypes.STRING },

  order_date: { type: DataTypes.DATE },
  order_approval_date: { type: DataTypes.DATE },

  item_quantity: { type: DataTypes.INTEGER },

  order_shipped_from_state: { type: DataTypes.STRING },
  warehouse_id: { type: DataTypes.STRING },

  price_before_discount: { type: DataTypes.DECIMAL(12, 2) },
  total_discount: { type: DataTypes.DECIMAL(12, 2) },
  seller_share: { type: DataTypes.DECIMAL(12, 2) },
  bank_offer_share: { type: DataTypes.DECIMAL(12, 2) },

  price_after_discount: { type: DataTypes.DECIMAL(12, 2) },
  shipping_charges: { type: DataTypes.DECIMAL(12, 2) },

  final_price_after_discount: { type: DataTypes.DECIMAL(12, 2) },
  final_shipping_charges: { type: DataTypes.DECIMAL(12, 2) },

  final_taxable_sales_value: { type: DataTypes.DECIMAL(12, 2) },
  final_shipping_taxable_value: { type: DataTypes.DECIMAL(12, 2) },

  final_cgst_taxable: { type: DataTypes.DECIMAL(12, 2) },
  final_sgst_taxable: { type: DataTypes.DECIMAL(12, 2) },
  final_igst_taxable: { type: DataTypes.DECIMAL(12, 2) },

  final_cgst_shipping: { type: DataTypes.DECIMAL(12, 2) },
  final_sgst_shipping: { type: DataTypes.DECIMAL(12, 2) },
  final_igst_shipping: { type: DataTypes.DECIMAL(12, 2) },

  final_invoice_amount: { type: DataTypes.DECIMAL(12, 2) },

  tax_type: { type: DataTypes.STRING },
  taxable_value: { type: DataTypes.DECIMAL(12, 2) },

  cst_rate: { type: DataTypes.DECIMAL(6, 3) },
  cst_amount: { type: DataTypes.DECIMAL(12, 2) },

  vat_rate: { type: DataTypes.DECIMAL(6, 3) },
  vat_amount: { type: DataTypes.DECIMAL(12, 2) },

  luxury_cess_rate: { type: DataTypes.DECIMAL(6, 3) },
  luxury_cess_amount: { type: DataTypes.DECIMAL(12, 2) },

  conversion_rate: { type: DataTypes.DECIMAL(6, 3) },

  final_gst_rate: { type: DataTypes.DECIMAL(6, 3) },

  igst_rate: { type: DataTypes.DECIMAL(6, 3) },
  igst_amount: { type: DataTypes.DECIMAL(12, 2) },

  cgst_rate: { type: DataTypes.DECIMAL(6, 3) },
  cgst_amount: { type: DataTypes.DECIMAL(12, 2) },

  sgst_rate: { type: DataTypes.DECIMAL(6, 3) },
  sgst_amount: { type: DataTypes.DECIMAL(12, 2) },

  tcs_igst_rate: { type: DataTypes.DECIMAL(6, 3) },
  tcs_igst_amount: { type: DataTypes.DECIMAL(12, 2) },

  tcs_cgst_rate: { type: DataTypes.DECIMAL(6, 3) },
  tcs_cgst_amount: { type: DataTypes.DECIMAL(12, 2) },

  tcs_sgst_rate: { type: DataTypes.DECIMAL(6, 3) },
  tcs_sgst_amount: { type: DataTypes.DECIMAL(12, 2) },

  total_tcs_deducted: { type: DataTypes.DECIMAL(12, 2) },

  buyer_invoice_id: { type: DataTypes.STRING },
  buyer_invoice_date: { type: DataTypes.DATE },
  buyer_invoice_amount: { type: DataTypes.DECIMAL(12, 2) },

  customer_billing_pincode: { type: DataTypes.STRING(6) },
  customer_billing_state: { type: DataTypes.STRING },

  customer_delivery_pincode: { type: DataTypes.STRING(6) },
  customer_delivery_state: { type: DataTypes.STRING },

  tally_ledgers: { type: DataTypes.STRING },
  final_invoice_no: { type: DataTypes.STRING },

  usual_price: { type: DataTypes.DECIMAL(12, 2) },
  is_shopsy_order: { type: DataTypes.BOOLEAN },

  tds_rate: { type: DataTypes.DECIMAL(6, 3) },
  tds_amount: { type: DataTypes.DECIMAL(12, 2) },

  irn: { type: DataTypes.STRING },

  business_name: { type: DataTypes.STRING },
  business_gst_number: { type: DataTypes.STRING(15) },

  beneficiary_name: { type: DataTypes.STRING },

  imei: { type: DataTypes.STRING }
}
}
table 2 : name = macros flipkart after pivot
{
  brandId : { type: DataTypes.STRING },
  seller_gstin: {
    type: DataTypes.STRING(15),
  },

  tally_ledgers: {
    type: DataTypes.STRING
  },

  invoice_no: {
    type: DataTypes.STRING,
  },

  fg: {
    type: DataTypes.STRING
  },

  quantity: {
    type: DataTypes.INTEGER
  },

  rate: {
    type: DataTypes.DECIMAL(12, 2)
  },

  taxable_sales_value: {
    type: DataTypes.DECIMAL(12, 2)
  },

  cgst_sales_amount: {
    type: DataTypes.DECIMAL(12, 2)
  },

  sgst_sales_amount: {
    type: DataTypes.DECIMAL(12, 2)
  },

  igst_sales_amount: {
    type: DataTypes.DECIMAL(12, 2)
  },

  shipping_taxable_value: {
    type: DataTypes.DECIMAL(12, 2)
  },

  cgst_shipping_amount: {
    type: DataTypes.DECIMAL(12, 2)
  },

  sgst_shipping_amount: {
    type: DataTypes.DECIMAL(12, 2)
  },

  igst_shipping_amount: {
    type: DataTypes.DECIMAL(12, 2)
  }
}

extra information : the uploaded raw file will have columns {[
  { "column": "seller_gstin", "type": "STRING(15)" },
  { "column": "order_id", "type": "STRING" },
  { "column": "order_item_id", "type": "STRING" },
  { "column": "product_title", "type": "TEXT" },
  { "column": "fsn", "type": "STRING" },
  { "column": "sku", "type": "STRING" },
  { "column": "hsn_code", "type": "STRING(10)" },

  { "column": "event_type", "type": "STRING" },
  { "column": "event_sub_type", "type": "STRING" },
  { "column": "order_type", "type": "STRING" },
  { "column": "fulfilment_type", "type": "STRING" },

  { "column": "order_date", "type": "DATE" },
  { "column": "order_approval_date", "type": "DATE" },

  { "column": "item_quantity", "type": "INTEGER" },

  { "column": "order_shipped_from_state", "type": "STRING" },
  { "column": "warehouse_id", "type": "STRING" },

  { "column": "price_before_discount", "type": "DECIMAL(12,2)" },
  { "column": "total_discount", "type": "DECIMAL(12,2)" },
  { "column": "seller_share", "type": "DECIMAL(12,2)" },
  { "column": "bank_offer_share", "type": "DECIMAL(12,2)" },

  { "column": "price_after_discount", "type": "DECIMAL(12,2)" },
  { "column": "shipping_charges", "type": "DECIMAL(12,2)" },

  { "column": "final_invoice_amount", "type": "DECIMAL(12,2)" },

  { "column": "tax_type", "type": "STRING" },
  { "column": "taxable_value", "type": "DECIMAL(12,2)" },

  { "column": "cst_rate", "type": "DECIMAL(6,3)" },
  { "column": "cst_amount", "type": "DECIMAL(12,2)" },

  { "column": "vat_rate", "type": "DECIMAL(6,3)" },
  { "column": "vat_amount", "type": "DECIMAL(12,2)" },

  { "column": "luxury_cess_rate", "type": "DECIMAL(6,3)" },
  { "column": "luxury_cess_amount", "type": "DECIMAL(12,2)" },

  { "column": "igst_rate", "type": "DECIMAL(6,3)" },
  { "column": "igst_amount", "type": "DECIMAL(12,2)" },

  { "column": "cgst_rate", "type": "DECIMAL(6,3)" },
  { "column": "cgst_amount", "type": "DECIMAL(12,2)" },

  { "column": "sgst_rate", "type": "DECIMAL(6,3)" },
  { "column": "sgst_amount", "type": "DECIMAL(12,2)" },

  { "column": "tcs_igst_rate", "type": "DECIMAL(6,3)" },
  { "column": "tcs_igst_amount", "type": "DECIMAL(12,2)" },

  { "column": "tcs_cgst_rate", "type": "DECIMAL(6,3)" },
  { "column": "tcs_cgst_amount", "type": "DECIMAL(12,2)" },

  { "column": "tcs_sgst_rate", "type": "DECIMAL(6,3)" },
  { "column": "tcs_sgst_amount", "type": "DECIMAL(12,2)" },

  { "column": "total_tcs_deducted", "type": "DECIMAL(12,2)" },

  { "column": "buyer_invoice_id", "type": "STRING" },
  { "column": "buyer_invoice_date", "type": "DATE" },
  { "column": "buyer_invoice_amount", "type": "DECIMAL(12,2)" },

  { "column": "customer_billing_pincode", "type": "STRING(6)" },
  { "column": "customer_billing_state", "type": "STRING" },

  { "column": "customer_delivery_pincode", "type": "STRING(6)" },
  { "column": "customer_delivery_state", "type": "STRING" },

  { "column": "usual_price", "type": "DECIMAL(12,2)" },
  { "column": "is_shopsy_order", "type": "BOOLEAN" },

  { "column": "tds_rate", "type": "DECIMAL(6,3)" },
  { "column": "tds_amount", "type": "DECIMAL(12,2)" },

  { "column": "irn", "type": "STRING" },

  { "column": "business_name", "type": "STRING" },
  { "column": "business_gst_number", "type": "STRING(15)" },

  { "column": "beneficiary_name", "type": "STRING" },
  { "column": "imei", "type": "STRING" }
]
}
