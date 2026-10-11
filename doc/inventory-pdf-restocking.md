# PDF inventory restocking

Managers and admins can upload a supplier PDF from the Inventory page. The
backend extracts product names, categories, quantities, purchase amounts, and
selling amounts when the PDF has separate purchase and selling price columns.
If it has a profit amount instead, selling amount is calculated as purchase
amount plus profit amount. It shows purchase amount, profit amount, selling
amount, and calculated profit margin separately for review. Profit margin is
calculated as `(selling amount - purchase amount) / selling amount * 100`.
Matched rows add stock to the existing catalog product. An extracted or
calculated selling amount updates the catalog selling price; if the PDF has
neither a selling price nor profit amount, the existing catalog selling price
is preserved. Unmatched rows create a catalog product with a generated SKU,
the PDF category, extracted prices, and received stock. If no selling amount
can be determined for a new product, its selling price starts at zero and can
be set in Products. The Inventory table shows both prices and profit margin.

The preview accepts PDFs up to 10 MB and 20 pages. PDFs with selectable text
are read directly. Image-only pages use local Tesseract OCR. The Docker image
installs Tesseract automatically; when running the backend directly on
Windows, install Tesseract OCR and make `tesseract.exe` available on `PATH`.
Unreadable rows can be corrected or removed during review. Duplicate unmatched
product names must be combined or removed before applying.

The import expects each item to have a product name, a positive quantity, and
a non-negative unit price. Invoice layouts differ, so always review the
extracted values before applying the restock.
